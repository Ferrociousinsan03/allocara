// Engine item 14: options to explore. "One way to explore: ..." — never advice.
import { ASSETS, type AssetId, type Weights } from "./assets";
import { liquidity, portfolioImpact } from "./core";
import { covariance, riskContribution } from "./risk";
import type { Conflict, ConflictInputs } from "./conflicts";
import { goalChanceRange, type SimInputs } from "./goals";

export interface OptionToExplore {
  conflictId: string;
  fromAsset: AssetId;
  toAsset: AssetId;
  points: number; // percentage points moved
  newLossPct: number; // positive = loss
  newCoverage: number | null;
  newGoalChanceLo: number | null;
  costPerYear: number; // expected return given up, decimal per year
  description: string;
}

function move(w: Weights, from: AssetId, to: AssetId, points: number): Weights {
  const out = { ...w };
  const p = Math.min(points / 100, out[from]!);
  out[from] = out[from]! - p;
  out[to] = out[to]! + p;
  return out;
}

/** 14. For each Problem, shift 5 points at a time from the biggest risk driver to the safest liquid asset. */
export function optionsToExplore(
  inp: ConflictInputs & { sim: Omit<SimInputs, "weights"> },
  conflicts: Conflict[],
): OptionToExplore[] {
  const problems = conflicts.filter((c) => c.status === "Problem" && c.id !== "none");
  if (problems.length === 0) return [];
  const w = inp.weights;
  const crisis = riskContribution(w, covariance("crisis", { method: "fixed" }));
  const from = ASSETS.filter((a) => a.id !== "CA" && w[a.id] > 0.05).sort(
    (a, b) => crisis.shares[b.id]! - crisis.shares[a.id]!,
  )[0]?.id;
  if (!from) return [];
  const to: AssetId = from === "CA" ? "GS" : "CA";
  const expFrom = ASSETS.find((a) => a.id === from)!.expReturn;
  const expTo = ASSETS.find((a) => a.id === to)!.expReturn;
  const name = (id: AssetId) => ASSETS.find((a) => a.id === id)!.name;

  const options: OptionToExplore[] = [];
  for (const c of problems) {
    for (let points = 5; points <= 30; points += 5) {
      const w2 = move(w, from, to, points);
      const imp = portfolioImpact(w2, inp.value, inp.scenario);
      const liq = liquidity(w2, inp.value, inp.scenario, inp.cashNeed);
      let cleared = false;
      let goalLo: number | null = null;
      if (c.id === "cash-short") {
        cleared = liq.coverage !== null && liq.coverage >= 1;
      } else if (c.id === "comfort-limit") {
        cleared = -imp.lossPct <= inp.comfortLimit;
      } else if (c.id.startsWith("goal-chance")) {
        const range = goalChanceRange({ ...inp.sim, weights: w2, paths: 200 });
        const idx = inp.goals.findIndex((g) => `goal-chance-${g.name}` === c.id);
        goalLo = range[Math.max(0, idx)]?.lo ?? null;
        cleared = goalLo !== null && goalLo >= 0.5;
      } else {
        continue; // no mechanical option for other problems
      }
      if (cleared) {
        const cost = (points / 100) * (expFrom - expTo);
        options.push({
          conflictId: c.id,
          fromAsset: from,
          toAsset: to,
          points,
          newLossPct: -imp.lossPct,
          newCoverage: liq.coverage,
          newGoalChanceLo: goalLo,
          costPerYear: cost,
          description: `One way to explore: move ${points} points from ${name(from)} to ${name(to)}.`,
        });
        break;
      }
    }
  }
  return options;
}
