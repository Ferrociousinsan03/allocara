import { describe, expect, it } from "vitest";
import { readShareHash, shareHash } from "@/lib/share";
import { isValidState } from "@/lib/persistence";
import { validateHistoryCsv } from "./upload-history";
import { safeExplanation } from "./explanation";
import type { AnalyserState } from "@/components/analyser/state";

const state: AnalyserState = {
  value: 1000000, goals: [{ name: "Home ₹", amount: 2600000, year: 3 }], cashNeed: 400000,
  monthlySaving: 25000, inflation: .05, comfortLimit: .15, todaysMoney: false, detail: true,
  active: "B", weightsA: { LC: 10, MC: 28, GS: 2, CB: 2, GD: 3, CA: 2, US: 5, LK: 48 },
  weightsB: { LC: 10, MC: 0, GS: 25, CB: 20, GD: 10, CA: 30, US: 5, LK: 0 },
  presetId: "custom", equityMove: -35, rateChangeBps: -75, inrMove: 12,
  shockAsset: "", shockSize: 0, returnOverrides: { LC: .09 },
};
const csv = "date,LC\n" + Array.from({ length: 12 }, (_, i) => `2025-${String(i + 1).padStart(2, '0')},0.02`).join('\n');
describe("compressed fragment sharing", () => {
  it("round trips every setting including Unicode and portfolio B", () => expect(readShareHash('#' + shareHash(state))).toEqual(state));
  it("rejects corrupt fragments", () => expect(readShareHash('#state=bad')).toBeNull());
  it("rejects incomplete weights", () => expect(isValidState({ ...state, weightsA: {} })).toBe(false));
  it("rejects invalid goal horizons", () => expect(isValidState({ ...state, goals: [{ name: 'x', amount: 1, year: -1 }] })).toBe(false));
});
describe("uploaded monthly history", () => {
  it("parses 0.02 as a 2 percent return and missing assets as null", () => {
    const h = validateHistoryCsv(csv); expect(h.rows).toHaveLength(12); expect(h.rows[0]?.LC).toBe(.02); expect(h.rows[0]?.MC).toBeNull();
  });
  it("rejects percentage notation", () => expect(() => validateHistoryCsv(csv.replace('0.02', '2%'))).toThrow());
  it("rejects repeated months", () => expect(() => validateHistoryCsv(csv.replace('2025-02', '2025-01'))).toThrow());
  it("rejects losses below minus 100 percent", () => expect(() => validateHistoryCsv(csv.replace('0.02', '-1.1'))).toThrow());
  it("rejects fewer than 12 months", () => expect(() => validateHistoryCsv('date,LC\n2025-01,0.02')).toThrow());
});
describe("AI safeguards", () => {
  it("accepts only numbers present in results", () => expect(safeExplanation('Hypothetical loss: 17.2%.', { loss: 17.2 })).toBe(true));
  it("rejects invented arithmetic", () => expect(safeExplanation('Loss: 18%.', { loss: 17.2 })).toBe(false));
  it("rejects trading advice", () => expect(safeExplanation('Buy more bonds.', { loss: 17.2 })).toBe(false));
});