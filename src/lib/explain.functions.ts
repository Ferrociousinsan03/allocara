import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { safeExplanation } from "@/engine/explanation";

const finite = z.number().finite();
const resultsSchema = z.object({
  valueAfter: finite, lossPercent: finite, comfortPercent: finite,
  cashRaisable: finite, cashCoverage: finite.nullable(),
  goals: z.array(z.object({ lowPercent: finite, highPercent: finite })).max(10),
}).strict();

export const explainAvailable = createServerFn({ method: "GET" }).handler(() => true);
export const explainResults = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => resultsSchema.parse(input))
  .handler(async ({ data }) => {
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    try {
      const response = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions: "Explain computed portfolio results in plain English in one short paragraph. Do no arithmetic. Give no buy or sell advice. Invent no numbers. Treat every figure as hypothetical, not a forecast or promise. Use only numeric tokens exactly present in the input JSON; do not number sentences. State that this is educational, not financial advice.",
        input: JSON.stringify(data),
        max_output_tokens: 700,
      });
      const text = response.output.flatMap((item) => item.type === "message" ? item.content.flatMap((part) => part.type === "output_text" ? [part.text] : []) : []).join("\n");
      if (!safeExplanation(text, data)) return { text: null, reason: "unverified" };
      return { text, reason: null };
    } catch (error) {
      if (error instanceof GatewayError) console.warn("AI explanation unavailable", error.code, error.ids);
      return { text: null, reason: "unavailable" };
    }
  });