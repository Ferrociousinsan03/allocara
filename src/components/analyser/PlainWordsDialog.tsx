import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUp, LoaderCircle, RefreshCw } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { MessageResponse } from "@/components/ai-elements/message";
import { Tool, ToolHeader, ToolContent } from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { askPageAssistant } from "@/lib/page-assistant.functions";
import { captureCurrentPage } from "@/lib/page-context";
import type { PageQuestion } from "@/engine/page-assistant";
import type { AssistantSource, AssistantLookup } from "@/lib/page-assistant.functions";
import type { StockQuoteFact } from "@/lib/stock-lookup.server";

type ChatMessage = PageQuestion["history"][number] & {
  sources?: AssistantSource[];
  lookups?: AssistantLookup[];
  quotes?: StockQuoteFact[];
};

export function PlainWordsDialog({ onClose, path }: { onClose: () => void; path: string }) {
  const request = useServerFn(askPageAssistant);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const mounted = useRef(false);
  const started = useRef(false);
  const inFlight = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const send = useCallback(
    async (text: string, reset = false) => {
      if (inFlight.current || !text.trim()) return;
      inFlight.current = true;
      setBusy(true);
      setNote(null);
      const page = captureCurrentPage(document, path);
      setTitle(page.title);
      if (!reset && messages.length >= 100) {
        inFlight.current = false;
        setBusy(false);
        setNote("Please refresh the summary to start a new conversation.");
        return;
      }
      const history = reset ? [] : messages.map(({ role, text }) => ({ role, text }));
      setMessages([...history, { role: "user", text }]);
      try {
        const reply = await request({ data: { page, question: text, history } });
        if (!mounted.current) return;
        if (reply.text) {
          setMessages([
            ...(reset ? [] : messages),
            { role: "user", text },
            {
              role: "assistant",
              text: reply.text,
              sources: reply.sources,
              lookups: reply.lookups,
              quotes: reply.quotes,
            },
          ]);
          setQuestion("");
        } else {
          setMessages((previous) => [
            ...previous,
            {
              role: "assistant",
              text: "I couldn’t finish this answer safely. Please try again.",
              sources: reply.sources,
              lookups: reply.lookups,
              quotes: reply.quotes,
            },
          ]);
          setNote(
            reply.reason === "unverified"
              ? "I couldn’t check those figures against the page or sources. Please try asking in a different way."
              : "I couldn’t answer right now. Your question is still here; you can try again.",
          );
        }
      } catch {
        if (mounted.current) setNote("I couldn’t answer right now. Please try again.");
      } finally {
        inFlight.current = false;
        if (mounted.current) {
          setBusy(false);
          composer.current?.focus();
        }
      }
    },
    [messages, path, request],
  );
  useEffect(() => {
    mounted.current = true;
    if (!started.current) {
      started.current = true;
      void send("Explain this page in very simple words.");
    }
    return () => {
      mounted.current = false;
    };
  }, [send]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy, note]);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        data-page-assistant
        className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl flex-col rounded-lg border-line bg-bg-1 p-0 text-foreground"
      >
        <div className="border-b border-line px-5 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2 font-serif text-xl">
            <BrandLogo size={24} /> In plain words
          </DialogTitle>
          <DialogDescription className="mt-2 truncate text-xs">
            {title || "This page"}
          </DialogDescription>
        </div>
        <div
          role="log"
          aria-label="Page conversation"
          aria-live="polite"
          className="min-h-40 flex-1 space-y-5 overflow-y-auto px-5 py-4"
        >
          {messages.map((message, i) => (
            <div
              key={i}
              className={
                message.role === "user" ? "ml-8 border-l-2 border-primary/40 pl-3" : "pr-2"
              }
            >
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {message.role === "user" ? "You" : "Allocara"}
              </p>
              {message.role === "assistant" ? (
                <MessageResponse className="text-sm leading-7 [&_a]:text-primary [&_a]:underline">
                  {message.text}
                </MessageResponse>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-7">{message.text}</p>
              )}
              {message.quotes?.map((quote) => (
                <div
                  key={`${quote.symbol}:${quote.fetchedAt}`}
                  className="mt-3 border-l-2 border-primary pl-3 text-sm"
                >
                  <p className="font-medium">
                    {quote.name} · {quote.symbol}
                  </p>
                  <p className="text-lg">
                    {quote.currency}{" "}
                    {quote.price.toLocaleString("en-IN", { maximumFractionDigits: 4 })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Quote time:{" "}
                    {quote.quotedAt ? new Date(quote.quotedAt).toLocaleString() : "Not supplied"} ·{" "}
                    {quote.exchange}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Latest available; may be delayed or from the last market session.
                  </p>
                </div>
              ))}
              {message.lookups?.map((lookup, index) => (
                <Tool key={index} defaultOpen={false} className="mt-3">
                  <ToolHeader
                    type="tool-lookup"
                    state={lookup.status === "completed" ? "output-available" : "output-error"}
                    title={lookup.name}
                  />
                  <ToolContent>
                    <p className="text-xs text-muted-foreground">{lookup.details}</p>
                  </ToolContent>
                </Tool>
              ))}
              {!!message.sources?.length && (
                <div className="mt-3 space-y-1 text-xs">
                  <p className="font-medium text-muted-foreground">Sources</p>
                  {message.sources.map((source) => (
                    <a
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block break-words text-primary underline"
                    >
                      {source.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Checking your question…
            </p>
          )}
          {note && (
            <p role="alert" className="text-sm text-muted-foreground">
              {note}
            </p>
          )}
          <div ref={bottom} />
        </div>
        <div className="space-y-3 border-t border-line px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void send("What should I pay attention to on this page?")}
            >
              What matters here?
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void send("Explain this page in very simple words.", true)}
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh summary
            </Button>
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send(question);
            }}
          >
            <textarea
              ref={composer}
              autoFocus
              aria-label="Ask about this page"
              placeholder="Ask about this page, a stock, or money…"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              maxLength={1200}
              rows={2}
              className="min-w-0 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="submit"
              size="icon"
              disabled={busy || !question.trim()}
              aria-label="Send question"
              title="Send question"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
