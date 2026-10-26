import { z } from "zod";
import { STOCKS } from "@/engine/stocks";

export const stockLookupSchema = z
  .object({
    symbols: z
      .array(z.string().regex(/^(?:US:)?[A-Z0-9&^=.-]{1,30}$/))
      .min(1)
      .max(6),
  })
  .strict();
export interface StockQuoteFact {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  exchange: string;
  quotedAt: string | null;
  fetchedAt: string;
  sourceUrl: string;
}
export async function lookupStockQuotes(symbols: string[]) {
  const fetchedAt = new Date().toISOString();
  const results = await Promise.all(
    [...new Set(symbols)].map(async (symbol) => {
      const ticker = symbol.startsWith("US:")
        ? symbol.slice(3)
        : /[.=^]/.test(symbol)
          ? symbol
          : `${symbol}.NS`;
      try {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`,
          { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(12000) },
        );
        if (!response.ok) return null;
        const parsed = z
          .object({
            chart: z.object({
              result: z
                .array(
                  z.object({
                    meta: z.object({
                      symbol: z.string(),
                      regularMarketPrice: z.number().finite().positive(),
                      regularMarketTime: z.number().finite().positive().optional(),
                      currency: z.string(),
                      exchangeName: z.string().optional(),
                      shortName: z.string().optional(),
                      longName: z.string().optional(),
                    }),
                  }),
                )
                .nullable(),
            }),
          })
          .safeParse(await response.json());
        const meta = parsed.success ? parsed.data.chart.result?.[0]?.meta : null;
        if (!meta) return null;
        return {
          symbol: meta.symbol,
          name:
            meta.longName ||
            meta.shortName ||
            STOCKS.find((s) => s.symbol === symbol)?.name ||
            meta.symbol,
          price: meta.regularMarketPrice,
          currency: meta.currency,
          exchange: meta.exchangeName ?? "Not supplied",
          quotedAt: meta.regularMarketTime
            ? new Date(meta.regularMarketTime * 1000).toISOString()
            : null,
          fetchedAt,
          sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}/`,
        } satisfies StockQuoteFact;
      } catch {
        return null;
      }
    }),
  );
  return {
    quotes: results.filter((q): q is StockQuoteFact => q !== null),
    unavailable: [...new Set(symbols)].filter((_, index) => results[index] === null),
    limitation:
      "Latest available Yahoo Finance quote, not a guaranteed real-time feed. The quote can be delayed or from the last market session. No price is guessed when a lookup fails.",
  };
}
