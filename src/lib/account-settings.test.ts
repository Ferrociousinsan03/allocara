import { describe, expect, it } from "vitest";
import { accountSettings, readAccountSettings } from "./account-settings";
import type { AnalyserState } from "@/components/analyser/state";

const state: AnalyserState = {
  value: 1000000, goals: [{ name: "House", amount: 2600000, year: 3 }], cashNeed: 400000,
  monthlySaving: 25000, inflation: 0.05, todaysMoney: false, comfortLimit: 0.15, detail: false, active: "A",
  weightsA: { LC: 30, MC: 10, GS: 20, CB: 15, GD: 10, CA: 10, US: 5, LK: 0 },
  weightsB: { LC: 10, MC: 0, GS: 35, CB: 20, GD: 10, CA: 20, US: 0, LK: 5 },
  presetId: "crash-2008", equityMove: -35, rateChangeBps: -75, inrMove: 12, shockAsset: "", shockSize: 0, returnOverrides: { LC: 0.11 },
};

describe("private account settings", () => {
  it("preserves selected assets, allocations, goals, assumptions and preferences", () => {
    const saved = readAccountSettings(JSON.parse(JSON.stringify(accountSettings(state, "fixed"))));
    expect(saved?.state.weightsA.LC).toBe(30);
    expect(saved?.state.weightsB.GS).toBe(35);
    expect(saved?.state.goals[0]?.amount).toBe(2600000);
    expect(saved?.state.cashNeed).toBe(400000);
    expect(saved?.state.returnOverrides.LC).toBe(0.11);
    expect(saved?.corrMethod).toBe("fixed");
  });
  it("does not store uploaded history with account settings", () => {
    const saved = accountSettings(state, "measured");
    expect(Object.keys(saved).sort()).toEqual(["corrMethod", "state", "version"]);
    expect("history" in saved).toBe(false);
  });
  it("rejects unvalidated settings before saving", () => {
    expect(() => accountSettings({} as never, "fixed")).toThrow();
    expect(readAccountSettings({ state: {} })).toBeNull();
  });
});