// Engine item 15: A-vs-B comparison under the same scenario.
import { ASSETS, type Weights } from "./assets";
import { liquidity, portfolioImpact, type Scenario } from "./core";
import { covariance, riskContribution } from "./risk";
import { formatINR, formatPct, formatPP } from "./format";

export type CompareUnit = "rupees" | "pp" | "x";

export interface CompareRow {
  label: string;
  a: number | null;
  b: number | null;
  unit: CompareUnit;
}

export interface CompareResult {
  rows: CompareRow[];
  sentence: string;
}

const expReturn = (w: Weights) => ASSETS.reduce((s, a) => s + w[a.id] * a.expReturn, 0);

/** 15. Every metric for both portfolios under the same scenario, plus one plain sentence. */
export function comparePortfolios(
  wA: Weights,
  wB: Weights,
  V: number,
  scenario: Scenario,
  cashNeed: number,
  VB: number = V, // B's own value when portfolios differ in size
): CompareResult {
  const impA = portfolioImpact(wA, V, scenario);
  const impB = portfolioImpact(wB, VB, scenario);
  const liqA = liquidity(wA, V, scenario, cashNeed);
  const liqB = liquidity(wB, VB, scenario, cashNeed);
  const rcA = riskContribution(wA, covariance("normal"));
  const rcB = riskContribution(wB, covariance("normal"));
  const rcAC = riskContribution(wA, covariance("crisis", { method: "fixed" }));
  const rcBC = riskContribution(wB, covariance("crisis", { method: "fixed" }));

  const rows: CompareRow[] = [
    { label: "Expected yearly return (assumption)", a: expReturn(wA), b: expReturn(wB), unit: "pp" },
    { label: "Value after this what-if", a: impA.valueAfter, b: impB.valueAfter, unit: "rupees" },
    { label: "Fall in this what-if", a: -impA.lossPct, b: -impB.lossPct, unit: "pp" },
    { label: "Cash cover for 12 months", a: liqA.coverage, b: liqB.coverage, unit: "x" },
    { label: "Ups and downs (normal times)", a: rcA.portfolioVol, b: rcB.portfolioVol, unit: "pp" },
    { label: "Ups and downs (in a crisis)", a: rcAC.portfolioVol, b: rcBC.portfolioVol, unit: "pp" },
    { label: "Independent bets in a crisis", a: rcAC.effectiveByRisk, b: rcBC.effectiveByRisk, unit: "x" },
  ];

  const lossDiff = -impB.lossPct - -impA.lossPct; // negative = B falls less
  const retDiff = expReturn(wB) - expReturn(wA);
  const parts: string[] = [];
  if (Math.abs(lossDiff) > 0.001) {
    parts.push(
      lossDiff < 0
        ? `B falls about ${formatPP(-lossDiff, 1).slice(1)} less in this what-if`
        : `B falls about ${formatPP(lossDiff, 1).slice(1)} more in this what-if`,
    );
  }
  if (liqA.coverage !== null && liqB.coverage !== null) {
    parts.push(`covers the cash need ${liqB.coverage.toFixed(1)} times against ${liqA.coverage.toFixed(1)}`);
  }
  if (Math.abs(retDiff) > 0.0005) {
    parts.push(
      retDiff < 0
        ? `but expects ${formatPP(-retDiff, 1).slice(1)} less growth a year`
        : `and expects ${formatPP(retDiff, 1).slice(1)} more growth a year`,
    );
  }
  const sentence =
    parts.length > 0
      ? `Under these assumptions, ${parts.join(", ")}.`
      : "Under these assumptions, A and B behave almost identically in this what-if.";
  return { rows, sentence };
}

export function formatCompareValue(v: number | null, unit: CompareUnit): string {
  if (v === null) return "not needed";
  if (unit === "rupees") return formatINR(v);
  if (unit === "pp") return formatPct(v, 1);
  return `${v.toFixed(2)}x`;
}

export function formatCompareDiff(a: number | null, b: number | null, unit: CompareUnit): string {
  if (a === null || b === null) return "—";
  const d = b - a;
  if (unit === "rupees") return `${d >= 0 ? "+" : ""}${formatINR(d)}`;
  if (unit === "pp") return formatPP(d, 1);
  return `${d >= 0 ? "+" : ""}${d.toFixed(2)}x`;
}
