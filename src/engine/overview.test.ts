import { describe, expect, it } from "vitest";
import { ASSETS } from "./assets";
import { ZERO_SCENARIO } from "./core";
import { overviewMetrics, groundedStockInsight } from "./overview";
const holding = { id: "h", name: "Reliance", symbol: "RELIANCE", asset: "LC" as const, currentValue: 100000, investedAmount: 80000, units: 40 };
const input = { scenario: ZERO_SCENARIO, assets: ASSETS, cashNeed: 20000, comfortLimit: 0.1, goals: [], monthlySaving: 0, inflation: 0.05, stockReturns: {}, returns: {} };
describe("recorded Overview metrics", () => {
  it("uses holding values rather than a stale portfolio total", () => {
    expect(overviewMetrics([holding], input).value).toBe(100000);
    expect(overviewMetrics([holding], input).rows[0]?.gain).toBe(20000);
  });
  it("applies only the chosen market move to a listed stock", () => {
    const r = overviewMetrics([holding], { ...input, scenario: { ...ZERO_SCENARIO, equityMove: -0.2 } });
    expect(r.after).toBe(80000); expect(r.loss).toBe(0.2);
  });
  it("shows proceeds and remaining holdings from the user's cash need", () => {
    const r = overviewMetrics([holding], input);
    expect(r.mustSell).toBe(20000); expect(r.remaining).toBe(80000); expect(r.shortfall).toBe(0);
  });
  it("does not treat unverified illiquid holdings as available cash", () => {
    const { symbol, ...withoutSymbol } = holding;
    const r = overviewMetrics([{ ...withoutSymbol, asset: "LK" }], input);
    expect(r.accessible).toBe(0); expect(r.shortfall).toBe(20000); expect(r.remaining).toBe(100000);
  });
  it("does not invent goals or expected returns", () => {
    const r = overviewMetrics([holding], { ...input, goals: [{ name: "Entered goal", amount: 200000, year: 5 }] });
    expect(r.range).toEqual([]); expect(r.required).toBeNull();
    expect(overviewMetrics([], input).coverage).toBe(0);
  });
  it("orders chance ranges only when user return inputs exist", () => {
    const r = overviewMetrics([holding], { ...input, stockReturns: { RELIANCE: 0.07 }, goals: [{ name: "Entered goal", amount: 200000, year: 5 }] });
    expect(r.range).toHaveLength(1); expect(r.range[0]?.lo).toBeLessThanOrEqual(r.range[0]?.hi ?? -1);
  });
  it("rejects invented AI figures and guaranteed forecasts", () => {
    expect(groundedStockInsight("Holding value is 100000.", { value: 100000 })).toBe(true);
    expect(groundedStockInsight("Expected profit is 99999.", { value: 100000 })).toBe(false);
    expect(groundedStockInsight("The stock will rise.", {})).toBe(false);
  });
});