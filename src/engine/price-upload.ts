// User price CSV: date column + one column per stock symbol holding closing prices. Pure, no UI imports.
import Papa from "papaparse";
import type { StockSeries } from "./stock-history";

export function parsePriceCsv(text: string): StockSeries[] {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), { header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim() });
  if (parsed.errors.length) throw new Error("The CSV has malformed rows.");
  const fields = parsed.meta.fields ?? [];
  const dateKey = fields.find((f) => f.toLowerCase() === "date");
  const symbols = fields.filter((f) => f !== dateKey && f);
  if (!dateKey || !symbols.length) throw new Error("Include a date column and at least one stock symbol column (e.g. RELIANCE).");
  const out = new Map<string, StockSeries>(symbols.map((s) => [s.toUpperCase(), { symbol: s.toUpperCase(), dates: [], closes: [] }]));
  const rows = parsed.data
    .map((r) => ({ r, d: (r[dateKey] ?? "").trim() }))
    .filter(({ d }) => d)
    .map(({ r, d }) => {
      if (!/^\d{4}-(0[1-9]|1[0-2])(-\d{2})?$/.test(d)) throw new Error("Dates must be YYYY-MM or YYYY-MM-DD.");
      return { r, month: d.slice(0, 7) };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
  if (rows.length < 2) throw new Error("Include at least 2 dated rows.");
  for (const { r, month } of rows) {
    for (const s of symbols) {
      const raw = (r[s] ?? "").trim().replace(/,/g, "");
      if (!raw) continue;
      const v = Number(raw);
      if (!Number.isFinite(v) || v <= 0) throw new Error(`Prices must be positive numbers (check ${s} in ${month}).`);
      const series = out.get(s.toUpperCase())!;
      if (series.dates.at(-1) === month) series.closes[series.closes.length - 1] = v;
      else { series.dates.push(month); series.closes.push(v); }
    }
  }
  return [...out.values()].filter((s) => s.closes.length >= 2);
}

const monthOf = (d: string) => d.slice(0, 7);

/** Combine fetched and uploaded series by month; uploaded prices win on overlapping months. */
export function mergeSeries(fetched: StockSeries[], uploaded: StockSeries[]): StockSeries[] {
  const map = new Map<string, Map<string, number>>();
  const add = (list: StockSeries[]) => list.forEach((s) => {
    const m = map.get(s.symbol) ?? new Map<string, number>();
    s.dates.forEach((d, i) => m.set(monthOf(d), s.closes[i]!));
    map.set(s.symbol, m);
  });
  add(fetched); add(uploaded);
  return [...map.entries()].map(([symbol, m]) => {
    const dates = [...m.keys()].sort();
    return { symbol, dates, closes: dates.map((d) => m.get(d)!) };
  });
}

/** Annualised growth (CAGR) and volatility from a single price series; null if too short. */
export function seriesReturn(s: StockSeries): { cagr: number; vol: number; months: number } | null {
  if (s.closes.length < 13) return null;
  const rets: number[] = [];
  for (let i = 1; i < s.closes.length; i++) rets.push(s.closes[i]! / s.closes[i - 1]! - 1);
  const months = rets.length;
  const cagr = Math.pow(s.closes.at(-1)! / s.closes[0]!, 12 / months) - 1;
  const mean = rets.reduce((a, b) => a + b, 0) / months;
  const vol = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (months - 1)) * Math.sqrt(12);
  return { cagr, vol, months };
}

/** Coverage of a price series: first/last month and calendar months missing in between. */
export function seriesFreshness(s: StockSeries): { first: string; last: string; missing: string[] } | null {
  if (!s.dates.length) return null;
  const months = s.dates.map((d) => d.slice(0, 7));
  const have = new Set(months);
  const missing: string[] = [];
  let [y, m] = months[0]!.split("-").map(Number) as [number, number];
  const last = months.at(-1)!;
  while (true) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    if (key >= last) break;
    if (!have.has(key)) missing.push(key);
    m++; if (m > 12) { m = 1; y++; }
  }
  return { first: months[0]!, last, missing };
}
