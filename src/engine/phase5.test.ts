// Phase 5 tests: demo persona fires the required warnings, portfolio B clears
// most of them, the plain-words summary is 6-8 sentences of computed numbers,
// and JSON export/import round-trips safely.
import { describe, expect, it } from "vitest";
import { ASHA, demoConflicts } from "./demo";
import { plainWordsSummary, type SummaryInput } from "./summary";
import { exportJson, importJson, isValidState } from "@/lib/persistence";
import type { AnalyserState } from "@/components/analyser/state";

const ids = (cs: { id: string }[]) => cs.map((c) => c.id);

describe("demo persona Asha (spec section 13)", () => {
  const a = ids(demoConflicts("A"));

  it("fires the diversification illusion", () => {
    expect(a.some((id) => id.startsWith("illusion-") || id === "crisis-bets")).toBe(true);
  });

  it("fires the short-horizon warning", () => {
    expect(a).toContain("short-horizon");
  });

  it("fires the comfort-limit breach", () => {
    expect(a).toContain("comfort-limit");
  });

  it("fires the cash shortfall (locked-in asset)", () => {
    expect(a).toContain("cash-short");
  });

  it("portfolio B clears the comfort breach, short horizon and cash shortfall", () => {
    const b = ids(demoConflicts("B"));
    expect(b).not.toContain("comfort-limit");
    expect(b).not.toContain("short-horizon");
    expect(b).not.toContain("cash-short");
  });

  it("portfolio B expects less growth — the trade-off is real", () => {
    // B holds far more bonds/cash, so its weighted expected return must be lower.
    const exp = (w: import("./assets").Weights) =>
      w.LC * 0.12 + w.MC * 0.14 + w.GS * 0.071 + w.CB * 0.078 + w.GD * 0.085 + w.CA * 0.065 + w.US * 0.11 + w.LK * 0.075;
    expect(exp(ASHA.weightsB)).toBeLessThan(exp(ASHA.weightsA));
  });
});

describe("plain-words summary", () => {
  const base: SummaryInput = {
    value: 1_000_000,
    valueAfter: 828_000,
    lossPct: 0.172,
    comfortLimit: 0.15,
    coverage: 0.97,
    raisable: 388_000,
    cashNeed: 400_000,
    goalChance: [{ name: "Home", lo: 0.31, hi: 0.52 }],
    requiredReturn: 0.41,
    assumedReturn: 0.097,
    scenarioName: "2008-style crash",
    conflicts: [{ id: "cash-short", status: "Problem", sentence: "Shortfall: ₹12,000." }],
  };

  it("returns 6 to 8 sentences", () => {
    const s = plainWordsSummary(base);
    expect(s.length).toBeGreaterThanOrEqual(6);
    expect(s.length).toBeLessThanOrEqual(8);
  });

  it("always ends with the honesty sentence and invents no numbers", () => {
    const s = plainWordsSummary(base);
    expect(s[s.length - 1]).toContain("not promises");
    // Every percentage in the text must come from the input figures.
    const allowed = ["17%", "15%", "31%", "52%", "41%", "10%"].map((x) => x.replace("%", ""));
    for (const m of s.join(" ").matchAll(/(\d+(?:\.\d+)?)%/g)) {
      expect(allowed).toContain(m[1]);
    }
  });

  it("handles no goals and no cash need without crashing", () => {
    const s = plainWordsSummary({ ...base, goalChance: [], requiredReturn: null, coverage: null, cashNeed: 0, conflicts: [] });
    expect(s.length).toBeGreaterThanOrEqual(3);
    expect(s[s.length - 1]).toContain("not promises");
  });
});

describe("save/load persistence", () => {
  const state = {
    value: 5_000_000,
    goals: [{ name: "House", amount: 2_600_000, year: 5 }],
    cashNeed: 400_000,
    monthlySaving: 25_000,
    inflation: 0.05,
    todaysMoney: false,
    comfortLimit: 0.2,
    detail: false,
    active: "A",
    weightsA: { LC: 30, MC: 10, GS: 20, CB: 15, GD: 10, CA: 10, US: 5, LK: 0 },
    weightsB: { LC: 10, MC: 0, GS: 35, CB: 20, GD: 10, CA: 20, US: 0, LK: 5 },
    presetId: "crash-2008",
    equityMove: -35,
    rateChangeBps: -75,
    inrMove: 12,
    shockAsset: "",
    shockSize: 0,
    returnOverrides: {},
  } as AnalyserState;

  it("export/import round-trips the state", () => {
    const text = exportJson(state);
    const back = importJson(text);
    expect(back).not.toBeNull();
    expect(back!.value).toBe(5_000_000);
    expect(back!.weightsA.LC).toBe(30);
    expect(back!.goals[0]!.name).toBe("House");
  });

  it("rejects garbage and wrong shapes", () => {
    expect(importJson("not json")).toBeNull();
    expect(importJson("{}")).toBeNull();
    expect(importJson(JSON.stringify({ version: 1, state: { value: "lots" } }))).toBeNull();
    expect(isValidState(null)).toBe(false);
    expect(isValidState({ value: 1 })).toBe(false);
  });
});
