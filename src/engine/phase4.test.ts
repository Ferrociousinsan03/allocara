import { describe, expect, it } from "vitest";
import { emptyWeights, type Weights } from "./assets";
import { normaliseWeights, ZERO_SCENARIO } from "./core";
import { historicalStats, parseMonthlyCsv, portfolioMonthlyReturns } from "./history";
import { goalSimulationBootstrap } from "./bootstrap";
import { QUIZ, scoreToComfort } from "./quiz";
import { covariance } from "./risk";
import type { SimInputs } from "./goals";

const w = (p: Partial<Weights>) => normaliseWeights({ ...emptyWeights(), ...p });

describe("parseMonthlyCsv", () => {
  it("parses decimals and turns empty cells into null", () => {
    const h = parseMonthlyCsv("date,LC,MC,GS,CB,GD,CA,US,LK\n2020-01-31,0.01,-0.02,,,0.03,0.004,0.05,\n");
    expect(h.dates).toEqual(["2020-01-31"]);
    expect(h.rows[0]!.LC).toBeCloseTo(0.01);
    expect(h.rows[0]!.GS).toBeNull();
    expect(h.rows[0]!.LK).toBeNull();
  });
});

describe("historicalStats", () => {
  const steadyRows = Array.from({ length: 120 }, () => ({ LC: 0.01 }));
  it("CAGR of a steady 1% a month matches hand calculation", () => {
    const s = historicalStats(steadyRows, w({ LC: 1 }));
    expect(s.cagr).toBeCloseTo(Math.pow(1.01, 12) - 1, 6);
    expect(s.growthOf100[120]!.value).toBeCloseTo(100 * Math.pow(1.01, 120), 4);
    expect(s.maxDrawdown).toBe(0);
    expect(s.worst12m).toBeCloseTo(Math.pow(1.01, 12) - 1, 6);
  });
  it("renormalises over assets with data each month", () => {
    const rows = [{ LC: 0.1, GS: null }, { LC: null, GS: 0.02 }];
    const r = portfolioMonthlyReturns(rows, w({ LC: 50, GS: 50 }));
    expect(r[0]).toBeCloseTo(0.1);
    expect(r[1]).toBeCloseTo(0.02);
  });
  it("finds the max drawdown and worst 12 months", () => {
    const rows = [
      ...Array.from({ length: 24 }, () => ({ LC: 0.02 })),
      ...Array.from({ length: 12 }, () => ({ LC: -0.05 })),
      ...Array.from({ length: 24 }, () => ({ LC: 0.02 })),
    ];
    const s = historicalStats(rows, w({ LC: 1 }));
    expect(s.maxDrawdown).toBeCloseTo(Math.pow(0.95, 12) - 1, 6);
    expect(s.worst12m).toBeCloseTo(Math.pow(0.95, 12) - 1, 6);
  });
});

describe("goalSimulationBootstrap", () => {
  const history = Array.from({ length: 120 }, (_, i) => ({ LC: 0.02 * Math.sin(i / 3), GS: 0.005, CA: 0.005 }));
  const base: SimInputs & { history: typeof history } = {
    weights: w({ LC: 50, GS: 30, CA: 20 }),
    value: 5_000_000,
    goals: [{ name: "House", amount: 1_000_000, year: 5 }],
    cashNeed: 200_000,
    monthlySaving: 10_000,
    inflation: 0.05,
    scenario: ZERO_SCENARIO,
    seed: 7,
    paths: 200,
    history,
  };
  it("same seed gives the same results", () => {
    const a = goalSimulationBootstrap(base)!;
    const b = goalSimulationBootstrap(base)!;
    expect(a.p50).toEqual(b.p50);
    expect(a.goalChance).toEqual(b.goalChance);
  });
  it("returns null when there is not enough history", () => {
    expect(goalSimulationBootstrap({ ...base, history: history.slice(0, 10) })).toBeNull();
  });
  it("empty goals and zero cash need do not crash", () => {
    const r = goalSimulationBootstrap({ ...base, goals: [], cashNeed: 0 })!;
    expect(r.goalChance).toEqual([]);
    expect(r.p50.length).toBe(1);
  });
});

describe("measured crisis correlation with real bundled data", () => {
  it("uses the measured method on the bundled CSV", async () => {
    const fs = await import("node:fs/promises");
    const text = await fs.readFile("data/monthly_returns.csv", "utf8");
    const h = parseMonthlyCsv(text);
    expect(h.rows.length).toBeGreaterThanOrEqual(120);
    const c = covariance("crisis", { method: "measured", history: h.rows });
    expect(c.method).toBe("measured");
  });
});

describe("quiz", () => {
  it("has 5 questions with 4 answers each", () => {
    expect(QUIZ).toHaveLength(5);
    QUIZ.forEach((q) => expect(q.answers).toHaveLength(4));
  });
  it("maps scores to the spec's limits and labels", () => {
    expect(scoreToComfort(5)).toEqual({ limit: 0.08, label: "Cautious" });
    expect(scoreToComfort(11)).toEqual({ limit: 0.15, label: "Steady" });
    expect(scoreToComfort(14)).toEqual({ limit: 0.22, label: "Balanced" });
    expect(scoreToComfort(17)).toEqual({ limit: 0.3, label: "Growth" });
    expect(scoreToComfort(20)).toEqual({ limit: 0.4, label: "Bold" });
  });
});
