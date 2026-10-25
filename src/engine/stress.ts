// Engine items 11 and 13: reverse stress test and stylised crash path.
import { ASSETS, type Weights } from "./assets";
import { liquidity, portfolioImpact, type Scenario } from "./core";

export type BreachResult =
  | { kind: "already" } // breached before any extra fall
  | { kind: "at"; equityMove: number } // breaches at this fall (negative decimal)
  | { kind: "never" }; // not breached even at -95%

function searchBreach(breached: (equityMove: number) => boolean, baseMove: number): BreachResult {
  if (breached(baseMove)) return { kind: "already" };
  if (!breached(-0.95)) return { kind: "never" };
  let lo = -0.95; // breached
  let hi = baseMove; // not breached
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (breached(mid)) lo = mid;
    else hi = mid;
  }
  return { kind: "at", equityMove: hi };
}

export interface ReverseStressResult {
  comfort: BreachResult | null; // null when no comfort limit set
  coverage: BreachResult | null; // null when no cash need
}

/** 11. How far can shares fall before the comfort limit or the cash cover breaks? */
export function reverseStress(
  w: Weights,
  V: number,
  base: Scenario,
  opts: { comfortLimit?: number; cashNeed?: number },
): ReverseStressResult {
  const withMove = (equityMove: number): Scenario => ({ ...base, equityMove });
  const comfort =
    opts.comfortLimit && opts.comfortLimit > 0
      ? searchBreach((m) => portfolioImpact(w, V, withMove(m)).lossPct <= -opts.comfortLimit!, base.equityMove)
      : null;
  const coverage =
    opts.cashNeed && opts.cashNeed > 0
      ? searchBreach((m) => {
          const l = liquidity(w, V, withMove(m), opts.cashNeed!);
          return l.coverage !== null && l.coverage < 1;
        }, base.equityMove)
      : null;
  return { comfort, coverage };
}

export interface CrashPath {
  points: { month: number; value: number }[];
  start: number;
  trough: number;
  lowestMonth: number;
  recover90Month: number; // months until 90% of the loss is recovered
}

/** 13. Stylised path: linear fall over D months, then recovery with half-life H. Not a forecast. */
export function crashPath(
  w: Weights,
  V: number,
  s: Scenario,
  opts: { fallMonths?: number; halfLife?: number; months?: number } = {},
): CrashPath {
  const D = opts.fallMonths ?? 3;
  const H = opts.halfLife ?? 18;
  const months = opts.months ?? 60;
  const trough = portfolioImpact(w, V, s).valueAfter;
  const points: { month: number; value: number }[] = [];
  let lowestMonth = 0;
  let lowest = Infinity;
  for (let t = 0; t <= months; t++) {
    const value = t <= D ? V + (trough - V) * (t / D) : trough + (V - trough) * (1 - Math.pow(0.5, (t - D) / H));
    points.push({ month: t, value });
    if (value < lowest) {
      lowest = value;
      lowestMonth = t;
    }
  }
  // 1 - 0.5^((t-D)/H) = 0.9  =>  t = D + H*log2(10)
  const recover90Month = D + H * Math.log2(10);
  return { points, start: V, trough, lowestMonth, recover90Month };
}

/** Assets ordered safest-first for options to explore: cash, then government bonds. */
export const SAFE_LADDER = ["CA", "GS"] as const;
export const RISKY_ORDER = ASSETS.map((a) => a.id);
