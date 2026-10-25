// Engine item 9: goal simulation by replaying real past monthly returns in 6-month blocks.
import { portfolioImpact, ZERO_SCENARIO } from "./core";
import { portfolioMonthlyReturns } from "./history";
import { mulberry32, type GoalSimResult, type SimInputs } from "./goals";
import type { MonthlyRow } from "./risk";

/** 9. Block-bootstrap goal simulation. Returns null when there is not enough history. */
export function goalSimulationBootstrap(inp: SimInputs & { history: MonthlyRow[] }): GoalSimResult | null {
  const rets = portfolioMonthlyReturns(inp.history, inp.weights);
  if (rets.length < 24) return null;
  const scenario = inp.scenario ?? ZERO_SCENARIO;
  const paths = inp.paths ?? 1000;
  const seed = inp.seed ?? 42;
  const goals = inp.goals.filter((g) => g.year >= 1 && g.amount > 0);
  const years = Math.max(1, ...goals.map((g) => g.year));
  const months = years * 12;
  const start = portfolioImpact(inp.weights, inp.value, scenario, inp.assets).valueAfter;
  const rng = mulberry32(seed);
  const yearEnds: number[][] = Array.from({ length: years }, () => []);
  const finals: number[] = [];
  const metCount = goals.map(() => 0);
  const n = rets.length;

  for (let p = 0; p < paths; p++) {
    let v = start;
    const met = goals.map(() => false);
    let blockStart = -1;
    let blockPos = 6;
    for (let m = 1; m <= months; m++) {
      if (blockPos >= 6) {
        blockStart = Math.floor(rng() * n);
        blockPos = 0;
      }
      v *= 1 + rets[(blockStart + blockPos) % n]!;
      blockPos++;
      v += inp.monthlySaving;
      if (m === 12) v = Math.max(0, v - inp.cashNeed);
      goals.forEach((g, gi) => {
        if (g.year * 12 === m && !met[gi]) {
          const need = g.amount * Math.pow(1 + inp.inflation, g.year);
          if (v >= need) {
            v -= need;
            met[gi] = true;
          }
        }
      });
      if (v < 0) v = 0;
      if (m % 12 === 0) yearEnds[m / 12 - 1]!.push(v);
    }
    finals.push(v);
    met.forEach((x, gi) => {
      if (x) metCount[gi]!++;
    });
  }

  const deflate = (x: number, yr: number) => (inp.todaysMoney ? x / Math.pow(1 + inp.inflation, yr) : x);
  const pct = (arr: number[], q: number, yr: number) => {
    const s = [...arr].sort((a, b) => a - b);
    return deflate(s[Math.min(s.length - 1, Math.floor(q * s.length))]!, yr);
  };
  const p5: number[] = [];
  const p50: number[] = [];
  const p95: number[] = [];
  for (let y = 1; y <= years; y++) {
    p5.push(pct(yearEnds[y - 1]!, 0.05, y));
    p50.push(pct(yearEnds[y - 1]!, 0.5, y));
    p95.push(pct(yearEnds[y - 1]!, 0.95, y));
  }
  const sortedFinals = [...finals].sort((a, b) => a - b);
  const k = Math.max(1, Math.floor(paths * 0.05));
  const worst5 = sortedFinals.slice(0, k).reduce((a, b) => a + b, 0) / k;
  return {
    years,
    p5,
    p50,
    p95,
    goalChance: goals.map((_, i) => metCount[i]! / paths),
    worst5Average: deflate(worst5, years),
    elevatedVolMonths: 0,
    startValue: start,
  };
}
