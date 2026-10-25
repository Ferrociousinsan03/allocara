// Portfolio value over time and historical-frequency odds from real prices. Pure, no UI imports.
export interface TimedSeries { symbol: string; times: number[]; closes: number[] }

/** Sum of units × price at each timestamp, carrying each stock's last known price forward. */
export function portfolioValueSeries(series: TimedSeries[], units: Record<string, number>): { t: number; value: number }[] {
  const valid = series.filter((s) => (units[s.symbol] ?? 0) > 0 && s.closes.length);
  if (!valid.length) return [];
  const times = [...new Set(valid.flatMap((s) => s.times))].sort((a, b) => a - b);
  const idx = valid.map(() => -1);
  const out: { t: number; value: number }[] = [];
  for (const t of times) {
    let v = 0, ok = true;
    valid.forEach((s, i) => { while (idx[i]! + 1 < s.times.length && s.times[idx[i]! + 1]! <= t) idx[i]!++; if (idx[i]! < 0) ok = false; else v += units[s.symbol]! * s.closes[idx[i]!]!; });
    if (ok) out.push({ t, value: v });
  }
  return out;
}

export interface Odds { id: string; question: string; chance: number; samples: number; spark: number[] }

/** How often past windows of this stock's monthly closes met each condition. Null when history is too short. */
export function historicalOdds(symbol: string, closes: number[]): Odds[] | null {
  if (closes.length < 25) return null;
  const windows = (h: number) => { const r: number[] = []; for (let i = 0; i + h < closes.length; i++) r.push(closes[i + h]! / closes[i]! - 1); return r; };
  const m1 = windows(1), y1 = windows(12), m3 = windows(3);
  const freq = (a: number[], f: (x: number) => boolean) => a.filter(f).length / a.length;
  const roll = (a: number[], f: (x: number) => boolean) => a.map((_, i) => { const s = a.slice(Math.max(0, i - 11), i + 1); return freq(s, f); });
  return [
    { id: "m1", question: `Will ${symbol} close higher one month from now?`, chance: freq(m1, (x) => x > 0), samples: m1.length, spark: roll(m1, (x) => x > 0) },
    { id: "y10", question: `Will ${symbol} rise more than 10% over the next 12 months?`, chance: freq(y1, (x) => x > 0.1), samples: y1.length, spark: roll(y1, (x) => x > 0.1) },
    { id: "d10", question: `Will ${symbol} fall more than 10% in the next 3 months?`, chance: freq(m3, (x) => x < -0.1), samples: m3.length, spark: roll(m3, (x) => x < -0.1) },
    { id: "fd", question: `Will ${symbol} beat a 7% fixed deposit over 12 months?`, chance: freq(y1, (x) => x > 0.07), samples: y1.length, spark: roll(y1, (x) => x > 0.07) },
  ];
}
