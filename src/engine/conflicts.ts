// Engine item 12: conflict detector (spec section 10).
import { ASSETS, type Weights } from "./assets";
import { forcedSelling, liquidity, portfolioImpact, type Scenario } from "./core";
import { covariance, riskContribution } from "./risk";
import { formatINR, formatPct } from "./format";
import type { Goal } from "./goals";

export type Status = "OK" | "Careful" | "Problem";

export interface Conflict {
  id: string;
  status: Status;
  sentence: string;
  tradeoff?: string;
}

export interface ConflictInputs {
  weights: Weights;
  value: number;
  scenario: Scenario;
  cashNeed: number;
  goals: Goal[];
  comfortLimit: number; // decimal, e.g. 0.2
  goalChance?: { lo: number; hi: number; name?: string | undefined }[] | null;
  requiredReturn?: number | null;
  assumedReturn?: number;
}

const pct0 = (x: number) => formatPct(x, 0);

/** 12. Check goals, risk comfort and liquidity against each other; always returns at least one entry. */
export function detectConflicts(inp: ConflictInputs): Conflict[] {
  const out: Conflict[] = [];
  const { weights: w, value: V, scenario: s } = inp;
  const imp = portfolioImpact(w, V, s);
  const loss = -imp.lossPct;
  const liq = liquidity(w, V, s, inp.cashNeed);
  const fs = forcedSelling(w, V, s, inp.cashNeed);
  const crisis = riskContribution(w, covariance("crisis", { method: "fixed" }));
  const eqShare = ASSETS.filter((a) => a.equity).reduce((x, a) => x + w[a.id], 0);
  const fxShare = ASSETS.filter((a) => a.fx === 1).reduce((x, a) => x + w[a.id], 0);

  // Cash short / thin buffer
  if (liq.coverage !== null) {
    if (liq.coverage < 1) {
      out.push({
        id: "cash-short",
        status: "Problem",
        sentence: `After this what-if you could raise about ${formatINR(liq.raisable)} quickly, but you need ${formatINR(liq.need)} within 12 months. Shortfall: ${formatINR(liq.need - liq.raisable)}.`,
        tradeoff: "More cash or short bonds protects this need but lowers expected growth.",
      });
    } else if (liq.coverage < 1.3) {
      out.push({
        id: "cash-thin",
        status: "Careful",
        sentence: `Your 12-month need is covered only ${liq.coverage.toFixed(1)} times, so the buffer is thin.`,
        tradeoff: "More cash or short bonds protects this need but lowers expected growth.",
      });
    }
  }

  // Forced selling raises the risky share
  if (inp.cashNeed > 0 && fs.met && fs.equityAfter - fs.equityBefore > 0.05) {
    out.push({
      id: "forced-selling",
      status: "Careful",
      sentence: `Paying ${formatINR(inp.cashNeed)} from the safest assets raises your share of risky assets from ${pct0(fs.equityBefore)} to ${pct0(fs.equityAfter)}, just when markets are weak.`,
    });
  }

  // Short horizon vs equity share
  const minYear = inp.goals.length ? Math.min(...inp.goals.map((g) => g.year)) : null;
  if (minYear !== null && minYear <= 3 && eqShare > 0.4) {
    out.push({
      id: "short-horizon",
      status: eqShare > 0.6 ? "Problem" : "Careful",
      sentence: `Your goal is ${minYear} year${minYear === 1 ? "" : "s"} away but ${pct0(eqShare)} is in shares, leaving little time to recover from a fall.`,
      tradeoff: "Less in shares steadies the near term but lowers expected growth.",
    });
  }

  // Comfort limit
  if (inp.comfortLimit > 0) {
    if (loss > inp.comfortLimit) {
      out.push({
        id: "comfort-limit",
        status: "Problem",
        sentence: `This what-if loses ${pct0(loss)}, beyond the ${pct0(inp.comfortLimit)} you said you can accept.`,
        tradeoff: "A safer mix respects your limit but expects less growth.",
      });
    } else if (loss > 0.75 * inp.comfortLimit) {
      out.push({
        id: "comfort-near",
        status: "Careful",
        sentence: `This what-if loses ${pct0(loss)}, close to the ${pct0(inp.comfortLimit)} you said you can accept.`,
      });
    }
  }

  // Concentration
  for (const a of ASSETS) {
    if (w[a.id] > 0.4) {
      out.push({
        id: `concentration-${a.id}`,
        status: "Problem",
        sentence: `${a.name} is ${pct0(w[a.id])} of your money, a large single bet.`,
        tradeoff: "Spreading it out lowers single-bet risk but may lower expected growth.",
      });
    } else if (w[a.id] > 0.3) {
      out.push({
        id: `concentration-${a.id}`,
        status: "Careful",
        sentence: `${a.name} is ${pct0(w[a.id])} of your money, a sizeable single bet.`,
      });
    }
  }

  // Diversification illusion (crisis risk share vs money share)
  for (const a of ASSETS) {
    if (crisis.shares[a.id]! > 0.55 && w[a.id] < 0.5) {
      out.push({
        id: `illusion-${a.id}`,
        status: "Careful",
        sentence: `${a.name} is only ${pct0(w[a.id])} of your money but causes ${pct0(crisis.shares[a.id]!)} of the risk in a crisis.`,
      });
    }
  }

  // Crisis behaviour: effective independent bets
  const held = ASSETS.filter((a) => w[a.id] > 0.005).length;
  if (crisis.effectiveByRisk > 0 && crisis.effectiveByRisk < 2.2 && held >= 2) {
    out.push({
      id: "crisis-bets",
      status: "Careful",
      sentence: `In a crisis your portfolio behaves like about ${crisis.effectiveByRisk.toFixed(1)} independent bets, not ${held}.`,
    });
  }

  // Currency link
  if (fxShare > 0.3) {
    out.push({
      id: "currency",
      status: "Careful",
      sentence: `${pct0(fxShare)} of your money moves with the dollar-rupee rate.`,
    });
  }

  // Goal chance range
  inp.goalChance?.forEach((g) => {
    if (g.lo < 0.5) {
      out.push({
        id: `goal-chance-${g.name ?? "goal"}`,
        status: "Problem",
        sentence: `After this what-if the chance of reaching ${g.name ?? "your goal"} is about ${pct0(g.lo)} to ${pct0(g.hi)}, under the stated assumptions.`,
        tradeoff: "Saving more, pushing the date out, or a higher-return mix raises the chance, with more ups and downs.",
      });
    } else if (g.lo < 0.7) {
      out.push({
        id: `goal-chance-${g.name ?? "goal"}`,
        status: "Careful",
        sentence: `After this what-if the chance of reaching ${g.name ?? "your goal"} is about ${pct0(g.lo)} to ${pct0(g.hi)}, under the stated assumptions.`,
      });
    }
  });

  // Unrealistic goal
  if (inp.requiredReturn != null && inp.assumedReturn != null && inp.requiredReturn > inp.assumedReturn + 0.02) {
    out.push({
      id: "unrealistic-goal",
      status: "Careful",
      sentence: `Reaching your goal needs about ${pct0(inp.requiredReturn)} a year, more than 2 points above the assumed ${pct0(inp.assumedReturn)}.`,
      tradeoff: "A bigger goal needs more saving, more time, or more risk.",
    });
  }

  if (out.length === 0) {
    out.push({ id: "none", status: "OK", sentence: "No major conflicts under these assumptions. This is not a guarantee." });
  }
  return out;
}
