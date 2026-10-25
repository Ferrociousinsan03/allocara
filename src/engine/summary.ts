// Plain-words summary (spec section 11): template-based, offline, 6-8 sentences
// built only from computed results. No invented numbers.
import { formatINR, formatPct } from "./format";
import type { Conflict } from "./conflicts";

export interface SummaryInput {
  value: number;
  valueAfter: number;
  lossPct: number; // positive = fall
  comfortLimit: number;
  coverage: number | null;
  raisable: number;
  cashNeed: number;
  goalChance: { name: string; lo: number; hi: number }[];
  requiredReturn: number | null;
  assumedReturn: number;
  scenarioName: string;
  conflicts: Conflict[];
}

const pct0 = (x: number) => formatPct(x, 0);

/** 6-8 plain sentences describing the results. Every figure comes from the input. */
export function plainWordsSummary(inp: SummaryInput): string[] {
  const s: string[] = [];

  // 1. The what-if and the headline
  s.push(
    inp.lossPct > 0.0005
      ? `Under the "${inp.scenarioName}" what-if, your ${formatINR(inp.value)} falls by about ${pct0(inp.lossPct)} to roughly ${formatINR(inp.valueAfter)}.`
      : `Under the "${inp.scenarioName}" what-if, your ${formatINR(inp.value)} is roughly unchanged at about ${formatINR(inp.valueAfter)}.`,
  );

  // 2. Comfort limit
  s.push(
    inp.lossPct > inp.comfortLimit
      ? `That fall is beyond the ${pct0(inp.comfortLimit)} loss you said you can accept.`
      : `That fall stays within the ${pct0(inp.comfortLimit)} loss you said you can accept.`,
  );

  // 3. Cash need
  if (inp.coverage === null) {
    s.push("You have set no cash need for the next 12 months, so there is nothing to cover.");
  } else if (inp.coverage < 1) {
    s.push(
      `You could raise about ${formatINR(inp.raisable)} quickly, but you need ${formatINR(inp.cashNeed)} — a shortfall of ${formatINR(inp.cashNeed - inp.raisable)}.`,
    );
  } else {
    s.push(`Your 12-month cash need of ${formatINR(inp.cashNeed)} is covered about ${inp.coverage.toFixed(1)} times over.`);
  }

  // 4. Goal chances
  if (inp.goalChance.length === 0) {
    s.push("You have not set any goals, so there is no goal chance to estimate.");
  } else {
    for (const g of inp.goalChance.slice(0, 2)) {
      s.push(`The chance of reaching "${g.name}" after this what-if is roughly ${pct0(g.lo)} to ${pct0(g.hi)}, under the stated assumptions.`);
    }
  }

  // 5. Required return
  if (inp.requiredReturn !== null) {
    s.push(
      inp.requiredReturn > inp.assumedReturn + 0.02
        ? `Reaching your goals needs about ${pct0(inp.requiredReturn)} a year, well above the assumed ${pct0(inp.assumedReturn)} — the plan asks a lot of the market.`
        : `Reaching your goals needs about ${pct0(inp.requiredReturn)} a year, close to the assumed ${pct0(inp.assumedReturn)}.`,
    );
  }

  // 6. Worst conflict
  const worst = inp.conflicts.find((c) => c.status === "Problem") ?? inp.conflicts.find((c) => c.status === "Careful");
  if (worst) s.push(`The biggest concern: ${worst.sentence}`);

  // 7. Honesty closer (always last)
  s.push("These are ranges under editable assumptions, not promises or advice.");

  return s.slice(0, 8);
}
