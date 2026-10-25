// Historical stats for the user's own stocks from real monthly closes. Pure, no UI imports.
import { pearson } from "./risk";

export interface StockSeries { symbol: string; dates: string[]; closes: number[] }
export interface StockHistoryStats {
  months: number; start: string; end: string;
  cagr: number; annVol: number; maxDrawdown: number; worst12m: number;
  growth: { month: number; value: number }[];
  perStock: { symbol: string; points: { date: string; close: number }[] }[];
  corr: number[][]; labels: string[];
}

const returnsByDate = (s: StockSeries) => {
  const m = new Map<string, number>();
  for (let i = 1; i < s.closes.length; i++) if (s.closes[i - 1]! > 0) m.set(s.dates[i]!, s.closes[i]! / s.closes[i - 1]! - 1);
  return m;
};

/** Value-weighted, monthly rebalanced over stocks with data that month. Returns null without data. */
export function stockHistoryStats(series: StockSeries[], weights: Record<string, number>): StockHistoryStats | null {
  const valid = series.filter((s) => s.closes.length >= 2 && (weights[s.symbol] ?? 0) > 0);
  if (!valid.length) return null;
  const rets = valid.map(returnsByDate);
  const dates = [...new Set(valid.flatMap((s) => s.dates.slice(1)))].sort();
  const port: number[] = []; const used: string[] = [];
  for (const d of dates) {
    let num = 0, den = 0;
    valid.forEach((s, i) => { const r = rets[i]!.get(d); if (r !== undefined) { num += weights[s.symbol]! * r; den += weights[s.symbol]!; } });
    if (den > 0) { port.push(num / den); used.push(d); }
  }
  const n = port.length;
  let v = 100, peak = 100, dd = 0;
  const growth = [{ month: 0, value: 100 }];
  port.forEach((r, i) => { v *= 1 + r; peak = Math.max(peak, v); dd = Math.min(dd, v / peak - 1); growth.push({ month: i + 1, value: v }); });
  const mean = n ? port.reduce((a, b) => a + b, 0) / n : 0;
  const variance = n > 1 ? port.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  let worst = Infinity;
  for (let i = 0; i + 12 <= n; i++) { let g = 1; for (let j = i; j < i + 12; j++) g *= 1 + port[j]!; worst = Math.min(worst, g - 1); }
  const corr = valid.map((a, i) => valid.map((_, j) => {
    if (i === j) return 1;
    const shared = [...rets[i]!.keys()].filter((d) => rets[j]!.has(d));
    if (shared.length < 12) return 0;
    return pearson(shared.map((d) => rets[i]!.get(d)!), shared.map((d) => rets[j]!.get(d)!));
  }));
  return {
    months: n, start: used[0] ?? "", end: used[n - 1] ?? "",
    cagr: n ? Math.pow(v / 100, 12 / n) - 1 : 0, annVol: Math.sqrt(variance) * Math.sqrt(12),
    maxDrawdown: dd, worst12m: worst === Infinity ? 0 : worst, growth,
    perStock: valid.map((s) => ({ symbol: s.symbol, points: s.dates.map((date, i) => ({ date, close: s.closes[i]! })) })),
    corr, labels: valid.map((s) => s.symbol),
  };
}
