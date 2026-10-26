import { createServerFn } from "@tanstack/react-start";
import type { OpenAIAstraResponsesFields, ResponsesInputItem } from "@lovable.dev/ai-gateway";
import {
  pageQuestionSchema,
  PAGE_ASSISTANT_INSTRUCTIONS,
  verifiedPageAnswer,
} from "@/engine/page-assistant";

export interface AssistantSource {
  title: string;
  url: string;
}
export interface AssistantLookup {
  name: string;
  status: "completed" | "failed";
  details: string;
}
export const askPageAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => pageQuestionSchema.parse(input))
  .handler(async ({ data }) => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    const { lookupStockQuotes, stockLookupSchema } = await import("@/lib/stock-lookup.server");
    const sources: AssistantSource[] = [];
    const lookups: AssistantLookup[] = [];
    const quoteFacts: Awaited<ReturnType<typeof lookupStockQuotes>>["quotes"] = [];
    const evidence: string[] = [data.page.content];
    const asOf = new Date().toISOString();
    const input: ResponsesInputItem[] = [
      { role: "user", content: JSON.stringify({ ...data, asOf }) },
    ];
    const tools: OpenAIAstraResponsesFields["tools"] = [
      {
        type: "function",
        name: "get_stock_quotes",
        description:
          "Fetch latest available stock prices with currency, source URL and quote timestamp. Bare symbols mean Indian NSE. Supply .BO for BSE, .NS for NSE, or US:<symbol> for US-listed stocks. Up to six symbols. Never invent unavailable prices.",
        strict: true,
        parameters: {
          type: "object",
          properties: {
            symbols: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 6 },
          },
          required: ["symbols"],
          additionalProperties: false,
        },
      },
      { type: "web_search", search_context_size: "low" },
    ];
    const rememberSources = (
      response: Awaited<ReturnType<typeof generateResponse<"openai/gpt-6-astra">>>,
    ) => {
      for (const item of response.output) {
        if (item.type === "message")
          for (const part of item.content)
            if (part.type === "output_text") {
              for (const annotation of part.annotations)
                if (annotation.type === "url_citation" && /^https:\/\//.test(annotation.url))
                  sources.push({ title: annotation.title, url: annotation.url });
            }
        if (item.type === "web_search_call")
          lookups.push({
            name: "Public finance research",
            status: item.status === "completed" ? "completed" : "failed",
            details: "Public sources only; private account values are not searched.",
          });
      }
    };
    try {
      for (let round = 0; round < 3; round++) {
        const response = await generateResponse({
          model: "openai/gpt-6-astra",
          instructions: PAGE_ASSISTANT_INSTRUCTIONS,
          input,
          tools,
          max_output_tokens: 700,
          include: ["reasoning.encrypted_content"],
        });
        rememberSources(response);
        const calls = response.output.filter((item) => item.type === "function_call");
        if (calls.length === 0) {
          let text = response.output
            .flatMap((item) =>
              item.type === "message"
                ? item.content.flatMap((part) => (part.type === "output_text" ? [part.text] : []))
                : [],
            )
            .join("\n");
          // Fetch cited public sources before admitting their numbers; never whitelist the model's own draft.
          if (response.output.some((item) => item.type === "web_search_call") && sources.length) {
            const publicHosts = [
              "rbi.org.in",
              "sebi.gov.in",
              "nseindia.com",
              "bseindia.com",
              "incometax.gov.in",
              "indiabudget.gov.in",
              "finance.yahoo.com",
              "reuters.com",
              "sec.gov",
              "investor.gov",
              "investopedia.com",
              "sbi.co.in",
              "hdfcbank.com",
              "icicibank.com",
            ];
            const fetched = await Promise.all(
              sources.slice(0, 4).map(async (source) => {
                const url = new URL(source.url);
                if (
                  !publicHosts.some(
                    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
                  )
                )
                  return "";
                try {
                  const result = await fetch(url, {
                    redirect: "error",
                    signal: AbortSignal.timeout(10000),
                    headers: { "User-Agent": "Mozilla/5.0" },
                  });
                  if (!result.ok) return "";
                  const html = (await result.text()).slice(0, 300000);
                  return `${source.url}\n${html
                    .replace(/<script[\s\S]*?<\/script>/gi, " ")
                    .replace(/<style[\s\S]*?<\/style>/gi, " ")
                    .replace(/<[^>]*>/g, " ")
                    .replace(/\s+/g, " ")
                    .slice(0, 60000)}`;
                } catch {
                  return "";
                }
              }),
            );
            evidence.push(...fetched.filter(Boolean));
            const final = await generateResponse({
              model: "openai/gpt-6-astra",
              instructions: `${PAGE_ASSISTANT_INSTRUCTIONS}\nYou are writing the final answer. Tools have already run. Use only this evidence for current facts and numeric figures. Cite only supplied source URLs, using descriptive links without numbered citations.`,
              input: JSON.stringify({
                ...data,
                asOf,
                evidence,
                researchDraft: text,
                quotes: quoteFacts,
                sources,
              }),
              max_output_tokens: 700,
            });
            text = final.output
              .flatMap((item) =>
                item.type === "message"
                  ? item.content.flatMap((part) => (part.type === "output_text" ? [part.text] : []))
                  : [],
              )
              .join("\n");
          }
          const uniqueSources = sources
            .filter((source, i) => sources.findIndex((s) => s.url === source.url) === i)
            .slice(0, 8);
          return {
            text: verifiedPageAnswer(text, evidence.join("\n")) ? text : null,
            reason: verifiedPageAnswer(text, evidence.join("\n")) ? null : "unverified",
            sources: uniqueSources,
            quotes: quoteFacts,
            lookups,
          };
        }
        for (const item of response.output) {
          if (item.type === "reasoning")
            input.push({
              type: "reasoning",
              id: item.id,
              summary: item.summary,
              encrypted_content: item.encrypted_content ?? null,
            });
          if (item.type === "function_call")
            input.push({
              type: "function_call",
              name: item.name,
              call_id: item.call_id,
              arguments: item.arguments,
            });
        }
        for (const call of calls.slice(0, 6)) {
          let output: unknown = { error: "Unsupported tool" };
          if (call.name === "get_stock_quotes") {
            const parsed = stockLookupSchema.safeParse(JSON.parse(call.arguments));
            if (parsed.success) {
              const result = await lookupStockQuotes(parsed.data.symbols);
              output = result;
              quoteFacts.push(...result.quotes);
              sources.push(
                ...result.quotes.map((q) => ({
                  title: `${q.name} — Yahoo Finance`,
                  url: q.sourceUrl,
                })),
              );
              lookups.push({
                name: "Latest stock prices",
                status: result.quotes.length ? "completed" : "failed",
                details: `${parsed.data.symbols.join(", ")}${result.unavailable.length ? ` · Unavailable: ${result.unavailable.join(", ")}` : ""}`,
              });
            } else {
              output = { error: "Use valid exchange ticker symbols, up to six per lookup." };
            }
          }
          evidence.push(JSON.stringify(output));
          input.push({
            type: "function_call_output",
            call_id: call.call_id,
            output: JSON.stringify(output),
          });
        }
      }
      return { text: null, reason: "unavailable", sources, quotes: quoteFacts, lookups };
    } catch (error) {
      if (error instanceof GatewayError)
        console.warn("Finance helper unavailable", error.code, error.ids);
      return { text: null, reason: "unavailable", sources, quotes: quoteFacts, lookups };
    }
  });
