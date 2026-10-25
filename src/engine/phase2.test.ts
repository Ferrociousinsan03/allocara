import { describe, expect, it } from "vitest";
import { emptyWeights, type Weights } from "./assets";
import { normaliseWeights, ZERO_SCENARIO } from "./core";
import { goalChanceRange, goalSimulationParametric, requiredReturn, type SimInputs } from "./goals";
import { crashPath, reverseStress } from "./stress";
import { detectConflicts, type ConflictInputs } from "./conflicts";
import { optionsToExplore } from "./options";
import { comparePortfolios, formatCompareDiff } from "./compare";

const w = (p: Partial<Weights>) => normaliseWeights({ ...emptyWeights(), ...p });
const V = 10_000_000;

const baseSim: SimInputs = {
  weights: w({ LC: 40, GS: 30, CA: 30 }),
  value: V,
  goals: [{ name: "House", amount: 2_600_000, year: 5 }],
  cashNeed: 400_000,
  monthlySaving: 25_000,
  inflation: 0.05,
  scenario: ZERO_SCENARIO,
  seed: 7,
  paths: 400,
};

describe("goalSimulationParametric", () => {
  it("same seed gives the same results", () => {
    const a = goalSimulationParametric(baseSim);
    const b = goalSimulationParametric(baseSim);
    expect(a.p50).toEqual(b.p50);
    expect(a.goalChance).toEqual(b.goalChance);
  });
  it("zero cash need and empty goals do not crash", () => {
    const r = goalSimulationParametric({ ...baseSim, cashNeed: 0, goals: [] });
    expect(r.years).toBe(1);
    expect(r.p50).toHaveLength(1);
    expect(r.goalChance).toEqual([]);
  });
  it("elevates volatility for 24 months after a 10%+ equity fall", () => {
    expect(goalSimulationParametric({ ...baseSim, scenario: { equityMove: -0.3, rateChangeBps: 0, inrMove: 0 } }).elevatedVolMonths).toBe(24);
    expect(goalSimulationParametric(baseSim).elevatedVolMonths).toBe(0);
  });
  it("a goal counts as met only if the portfolio can pay it", () => {
    const r = goalSimulationParametric({
      ...baseSim,
      value: 100_000,
      monthlySaving: 0,
      goals: [{ name: "Huge", amount: 50_000_000, year: 2 }],
    });
    expect(r.goalChance[0]).toBe(0);
  });
  it("goal chance range brackets the midpoint", () => {
    const range = goalChanceRange(baseSim);
    expect(range).toHaveLength(1);
    expect(range[0]!.lo).toBeLessThanOrEqual(range[0]!.mid + 1e-9);
    expect(range[0]!.hi).toBeGreaterThanOrEqual(range[0]!.mid - 1e-9);
  });
});

describe("requiredReturn", () => {
  it("binary search converges to a return that exactly reaches the goal", () => {
    const r = requiredReturn(baseSim);
    expect(r.feasible).toBe(true);
    expect(r.required).not.toBeNull();
    // Higher assumed return portfolios need less: sanity bound
    expect(r.required!).toBeLessThan(0.5);
    expect(r.required!).toBeGreaterThan(-0.5);
  });
  it("reports infeasible when even 100% a year is not enough", () => {
    const r = requiredReturn({
      ...baseSim,
      value: 10_000,
      monthlySaving: 0,
      goals: [{ name: "Impossible", amount: 1_000_000_000, year: 1 }],
    });
    expect(r.feasible).toBe(false);
    expect(r.required).toBeNull();
  });
  it("no goals means nothing is required", () => {
    expect(requiredReturn({ ...baseSim, goals: [] }).required).toBeNull();
  });
});

describe("reverseStress", () => {
  it("finds the fall that breaches the comfort limit", () => {
    const r = reverseStress(w({ LC: 1 }), V, ZERO_SCENARIO, { comfortLimit: 0.2 });
    expect(r.comfort).not.toBeNull();
    if (r.comfort?.kind === "at") {
      expect(r.comfort.equityMove).toBeCloseTo(-0.2, 2);
    } else throw new Error("expected a breach point");
  });
  it("all-cash never breaches even at -95%", () => {
    const r = reverseStress(w({ CA: 1 }), V, ZERO_SCENARIO, { comfortLimit: 0.2 });
    expect(r.comfort?.kind).toBe("never");
  });
  it("reports 'already' when the base scenario already breaches", () => {
    const r = reverseStress(w({ LC: 1 }), V, { equityMove: -0.3, rateChangeBps: 0, inrMove: 0 }, { comfortLimit: 0.2 });
    expect(r.comfort?.kind).toBe("already");
  });
  it("finds the fall where cash cover breaks", () => {
    const r = reverseStress(w({ LC: 1 }), V, ZERO_SCENARIO, { cashNeed: 8_000_000 });
    expect(r.coverage?.kind).toBe("at");
  });
});

describe("crashPath", () => {
  it("zero shock means no fall", () => {
    const p = crashPath(w({ LC: 1 }), V, ZERO_SCENARIO);
    expect(p.trough).toBeCloseTo(V);
    expect(p.points[0]!.value).toBeCloseTo(V);
  });
  it("trough sits at the end of the fall phase and 90% recovery follows the half-life", () => {
    const p = crashPath(w({ LC: 1 }), V, { equityMove: -0.3, rateChangeBps: 0, inrMove: 0 }, { fallMonths: 3, halfLife: 18 });
    expect(p.lowestMonth).toBe(3);
    expect(p.trough).toBeCloseTo(V * 0.7);
    expect(p.recover90Month).toBeCloseTo(3 + 18 * Math.log2(10), 6);
    // Path recovers monotonically after the trough
    const after = p.points.filter((pt) => pt.month > 3);
    for (let i = 1; i < after.length; i++) expect(after[i]!.value).toBeGreaterThanOrEqual(after[i - 1]!.value - 1e-6);
  });
});

const conflictBase: ConflictInputs = {
  weights: w({ LC: 20, MC: 10, GS: 25, CB: 20, GD: 10, CA: 5, US: 10 }),
  value: V,
  scenario: ZERO_SCENARIO,
  cashNeed: 0,
  goals: [],
  comfortLimit: 0.2,
};

describe("detectConflicts", () => {
  it("reports OK when nothing fires", () => {
    const c = detectConflicts(conflictBase);
    expect(c).toHaveLength(1);
    expect(c[0]!.status).toBe("OK");
  });
  it("cash shortfall is a Problem with the gap in rupees", () => {
    const c = detectConflicts({ ...conflictBase, weights: w({ LK: 1 }), cashNeed: 4_000_000 });
    const cash = c.find((x) => x.id === "cash-short");
    expect(cash?.status).toBe("Problem");
    expect(cash?.sentence).toContain("Shortfall");
  });
  it("concentration above 40% is a Problem, above 30% Careful", () => {
    expect(detectConflicts({ ...conflictBase, weights: w({ LC: 45, GS: 55 }) }).find((x) => x.id === "concentration-LC")?.status).toBe("Problem");
    expect(detectConflicts({ ...conflictBase, weights: w({ LC: 35, GS: 65 }) }).find((x) => x.id === "concentration-LC")?.status).toBe("Careful");
  });
  it("loss beyond the comfort limit is a Problem", () => {
    const c = detectConflicts({ ...conflictBase, weights: w({ LC: 1 }), scenario: { equityMove: -0.3, rateChangeBps: 0, inrMove: 0 } });
    expect(c.find((x) => x.id === "comfort-limit")?.status).toBe("Problem");
  });
  it("short horizon with high equity is a Problem", () => {
    const c = detectConflicts({ ...conflictBase, weights: w({ LC: 50, MC: 20, GS: 30 }), goals: [{ name: "Soon", amount: 1_000_000, year: 2 }] });
    expect(c.find((x) => x.id === "short-horizon")?.status).toBe("Problem");
  });
  it("low goal chance is a Problem", () => {
    const c = detectConflicts({ ...conflictBase, goalChance: [{ lo: 0.4, hi: 0.8, name: "House" }] });
    expect(c.find((x) => x.id === "goal-chance-House")?.status).toBe("Problem");
  });
});

describe("optionsToExplore", () => {
  it("finds a shift that clears a comfort-limit Problem, at a cost", () => {
    // 60% large-caps in a -30% share fall loses 18%; the 15% comfort limit clears at 50% or less.
    const inp: ConflictInputs & { sim: Omit<SimInputs, "weights"> } = {
      ...conflictBase,
      weights: w({ LC: 60, GS: 40 }),
      comfortLimit: 0.15,
      scenario: { equityMove: -0.3, rateChangeBps: 0, inrMove: 0 },
      sim: { ...baseSim, scenario: { equityMove: -0.3, rateChangeBps: 0, inrMove: 0 } },
    };
    const conflicts = detectConflicts(inp);
    expect(conflicts.some((c) => c.id === "comfort-limit" && c.status === "Problem")).toBe(true);
    const opts = optionsToExplore(inp, conflicts);
    const opt = opts.find((o) => o.conflictId === "comfort-limit");
    expect(opt).toBeDefined();
    expect(opt!.points).toBeGreaterThan(0);
    expect(opt!.points % 5).toBe(0);
    expect(opt!.newLossPct).toBeLessThanOrEqual(inp.comfortLimit + 1e-9);
    expect(opt!.toAsset).toBe("CA");
    expect(opt!.costPerYear).toBeGreaterThan(0);
    expect(opt!.description).toContain("One way to explore");
  });
  it("returns nothing when there are no Problems", () => {
    const conflicts = detectConflicts(conflictBase);
    expect(optionsToExplore({ ...conflictBase, sim: baseSim }, conflicts)).toEqual([]);
  });
});

describe("comparePortfolios", () => {
  it("reports differences in the right units", () => {
    const a = w({ LC: 60, GS: 40 });
    const b = w({ GS: 60, CA: 40 });
    const r = comparePortfolios(a, b, V, { equityMove: -0.2, rateChangeBps: 0, inrMove: 0 }, 1_000_000);
    const valueRow = r.rows.find((x) => x.label === "Value after this what-if")!;
    expect(valueRow.b! - valueRow.a!).toBeGreaterThan(0); // safer B worth more after a crash
    const lossRow = r.rows.find((x) => x.label === "Fall in this what-if")!;
    expect(lossRow.b!).toBeLessThan(lossRow.a!);
    expect(r.sentence).toContain("B falls about");
    expect(r.sentence).toContain("pts");
  });
  it("formats diffs as points for percentages and rupees for money", () => {
    expect(formatCompareDiff(0.1, 0.15, "pp")).toBe("+5.0 pts");
    expect(formatCompareDiff(1_000_000, 2_600_000, "rupees")).toBe("+₹16 lakh");
    expect(formatCompareDiff(null, 2, "x")).toBe("—");
  });
});
