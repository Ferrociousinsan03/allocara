// Quick engine sanity self-tests. Run on load in development only; silent in production.
import { emptyWeights, type Weights } from "./assets";
import { normaliseWeights, portfolioImpact, ZERO_SCENARIO } from "./core";
import { covariance, riskContribution } from "./risk";

/** Returns a list of failed checks; empty means everything is sane. */
export function runEngineSelfTests(): string[] {
  const failures: string[] = [];
  const w = (p: Partial<Weights>) => normaliseWeights({ ...emptyWeights(), ...p });
  try {
    // 1. Zero shock gives zero loss.
    if (Math.abs(portfolioImpact(w({ LC: 50, MC: 20, GS: 30 }), 10_000_000, ZERO_SCENARIO).lossPct) > 1e-9)
      failures.push("zero shock should give zero loss");
    // 2. An all-cash portfolio loses almost nothing.
    if (Math.abs(portfolioImpact(w({ CA: 1 }), 10_000_000, { equityMove: -0.4, rateChangeBps: 200, inrMove: 0.1 }).lossPct) >= 0.01)
      failures.push("all-cash portfolio should lose almost nothing");
    // 3. Risk shares sum to 100% in both correlation modes.
    for (const mode of ["normal", "crisis"] as const) {
      const rc = riskContribution(w({ LC: 30, MC: 20, GS: 20, GD: 10, US: 10, LK: 10 }), covariance(mode));
      const sum = Object.values(rc.shares).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 1) > 1e-6) failures.push(`risk shares should sum to 100% (${mode})`);
    }
  } catch (e) {
    failures.push(`self-test threw: ${e instanceof Error ? e.message : String(e)}`);
  }
  return failures;
}
