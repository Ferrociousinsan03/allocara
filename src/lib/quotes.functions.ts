import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface Quote { symbol: string; price: number; time: number; previousClose?: number | undefined }

/** Live NSE last-traded prices; symbols without a valid quote are omitted, never guessed. */
export const getQuotes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ symbols: z.array(z.string().regex(/^[A-Z0-9&-]{1,20}$/)).min(1).max(100) }).parse(input))
  .handler(async ({ data }) => {
    const results = await Promise.all([...new Set(data.symbols)].map(async (symbol): Promise<Quote | null> => {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol + ".NS")}?range=1d&interval=1d`, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok) return null;
        const json = await res.json() as { chart?: { result?: { meta?: { regularMarketPrice?: number; regularMarketTime?: number; chartPreviousClose?: number; previousClose?: number | undefined } }[] } };
        const meta = json.chart?.result?.[0]?.meta;
        const price = meta?.regularMarketPrice;
        return typeof price === "number" && price > 0 ? { symbol, price, time: (meta?.regularMarketTime ?? 0) * 1000, previousClose: meta?.previousClose ?? meta?.chartPreviousClose } : null;
      } catch { return null; }
    }));
    return results.filter((q): q is Quote => q !== null);
  });

export interface MonthlySeries { symbol: string; dates: string[]; closes: number[] }

/** Up to 10 years of real monthly closes per NSE symbol (until today); failed symbols are omitted. */
export const getMonthlyHistory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ symbols: z.array(z.string().regex(/^[A-Z0-9&-]{1,20}$/)).min(1).max(30) }).parse(input))
  .handler(async ({ data }) => {
    const out = await Promise.all([...new Set(data.symbols)].map(async (symbol): Promise<MonthlySeries | null> => {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol + ".NS")}?range=10y&interval=1mo`, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok) return null;
        const json = await res.json() as { chart?: { result?: { timestamp?: number[]; indicators?: { adjclose?: { adjclose?: (number | null)[] }[]; quote?: { close?: (number | null)[] }[] } }[] } };
        const r = json.chart?.result?.[0];
        const ts = r?.timestamp ?? [];
        const closes = r?.indicators?.adjclose?.[0]?.adjclose ?? r?.indicators?.quote?.[0]?.close ?? [];
        const dates: string[] = []; const vals: number[] = [];
        ts.forEach((t, i) => { const c = closes[i]; if (typeof c === "number" && c > 0) { const d = new Date(t * 1000).toISOString().slice(0, 7); if (dates.at(-1) === d) vals[vals.length - 1] = c; else { dates.push(d); vals.push(c); } } });
        return vals.length >= 2 ? { symbol, dates, closes: vals } : null;
      } catch { return null; }
    }));
    return out.filter((s): s is MonthlySeries => s !== null);
  });

export const RANGES = { "1D": ["1d", "5m"], "5D": ["5d", "30m"], "1M": ["1mo", "1d"], "6M": ["6mo", "1d"], "YTD": ["ytd", "1d"], "1Y": ["1y", "1d"], "5Y": ["5y", "1wk"], "MAX": ["max", "1mo"] } as const;
export type RangeKey = keyof typeof RANGES;
export interface TimedSeries { symbol: string; times: number[]; closes: number[] }

/** Real NSE price points for a chart range; failed symbols are omitted. */
export const getPriceHistory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ symbols: z.array(z.string().regex(/^[A-Z0-9&-]{1,20}$/)).min(1).max(30), range: z.enum(["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"]) }).parse(input))
  .handler(async ({ data }) => {
    const [range, interval] = RANGES[data.range];
    const out = await Promise.all([...new Set(data.symbols)].map(async (symbol): Promise<TimedSeries | null> => {
      try {
        const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol + ".NS")}?range=${range}&interval=${interval}`, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (!res.ok) return null;
        const json = await res.json() as { chart?: { result?: { timestamp?: number[]; indicators?: { quote?: { close?: (number | null)[] }[] } }[] } };
        const r = json.chart?.result?.[0];
        const ts = r?.timestamp ?? []; const cl = r?.indicators?.quote?.[0]?.close ?? [];
        const times: number[] = []; const closes: number[] = [];
        ts.forEach((t, i) => { const c = cl[i]; if (typeof c === "number" && c > 0) { times.push(t * 1000); closes.push(c); } });
        return closes.length >= 2 ? { symbol, times, closes } : null;
      } catch { return null; }
    }));
    return out.filter((s): s is TimedSeries => s !== null);
  });
