// Engine items 16-17: parse the bundled monthly CSV and compute historical stats.
import { ASSETS, type Weights } from "./assets";
import { pearson, type Matrix, type MonthlyRow } from "./risk";

export interface MonthlyHistory {
  dates: string[];
  rows: MonthlyRow[];
}

/** Parse "date,LC,MC,..." CSV with decimal monthly returns; empty cells become null. */
export function parseMonthlyCsv(text: string): MonthlyHistory {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0]!.split(",");
  const dates: string[] = [];
  const rows: MonthlyRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(",");
    dates.push(cells[0]!);
    const row: MonthlyRow = {};
    ASSETS.forEach((a, i) => {
      const raw = cells[header.indexOf(a.id)] ?? cells[i + 1];
      const v = raw === undefined || raw === "" ? NaN : Number(raw);
      row[a.id] = Number.isFinite(v) ? v : null;
    });
    rows.push(row);
  }
  return { dates, rows };
}

/** Monthly rebalanced portfolio returns; each month renormalised over the assets with data. */
export function portfolioMonthlyReturns(rows: MonthlyRow[], w: Weights): number[] {
  const out: number[] = [];
  for (const row of rows) {
    let num = 0;
    let den = 0;
    for (const a of ASSETS) {
      const r = row[a.id];
      if (typeof r === "number" && w[a.id] > 0) {
        num += w[a.id] * r;
        den += w[a.id];
      }
    }
    if (den > 0) out.push(num / den);
  }
  return out;
}

export interface HistoricalStats {
  months: number;
  portfolioReturns: number[];
  cagr: number;
  annVol: number;
  maxDrawdown: number; // negative
  worst12m: number; // worst rolling 12-month return, negative
  growthOf100: { month: number; value: number }[];
  corr: Matrix; // pairwise-complete on asset monthly returns
}

/** 16. Historical stats for a monthly rebalanced portfolio. */
export function historicalStats(rows: MonthlyRow[], w: Weights): HistoricalStats {
  const rets = portfolioMonthlyReturns(rows, w);
  const n = rets.length;
  const growth: { month: number; value: number }[] = [{ month: 0, value: 100 }];
  let v = 100;
  let peak = 100;
  let maxDD = 0;
  rets.forEach((r, i) => {
    v *= 1 + r;
    peak = Math.max(peak, v);
    maxDD = Math.min(maxDD, v / peak - 1);
    growth.push({ month: i + 1, value: v });
  });
  const cagr = n > 0 ? Math.pow(v / 100, 12 / n) - 1 : 0;
  const mean = n > 0 ? rets.reduce((a, b) => a + b, 0) / n : 0;
  const variance = n > 1 ? rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
  const annVol = Math.sqrt(variance) * Math.sqrt(12);
  let worst12 = Infinity;
  for (let i = 0; i + 12 <= n; i++) {
    let g = 1;
    for (let j = i; j < i + 12; j++) g *= 1 + rets[j]!;
    worst12 = Math.min(worst12, g - 1);
  }
  if (worst12 === Infinity) worst12 = 0;
  const corr: Matrix = ASSETS.map((a, i) =>
    ASSETS.map((b, j) => {
      if (i === j) return 1;
      const pairs = rows.filter((r) => typeof r[a.id] === "number" && typeof r[b.id] === "number");
      if (pairs.length < 12) return 0;
      return pearson(pairs.map((r) => r[a.id] as number), pairs.map((r) => r[b.id] as number));
    }),
  );
  return { months: n, portfolioReturns: rets, cagr, annVol, maxDrawdown: maxDD, worst12m: worst12, growthOf100: growth, corr };
}
