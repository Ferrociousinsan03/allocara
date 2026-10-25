import { describe, expect, it } from "vitest";
import { holdingMetrics, selectHoldingComparison } from "./holding-compare";
import type { SavedPortfolio } from "./investor";

const portfolios: SavedPortfolio[] = [
  { id: "one", name: "One", holdings: [
    { id: "reliance", name: "Reliance", asset: "LC", currentValue: 1500, investedAmount: 1000, units: 2 },
    { id: "tcs", name: "TCS", asset: "LC", currentValue: 4500, investedAmount: 5000, units: 3 },
  ] },
  { id: "two", name: "Two", holdings: [
    { id: "deposit", name: "Deposit", asset: "CA", currentValue: 10000, investedAmount: 10000, units: 0 },
  ] },
];

describe("holdings within a selected portfolio", () => {
  it("compares two holdings even when the user has only one portfolio", () => {
    const selection = selectHoldingComparison(portfolios.slice(0, 1), "one", "reliance", "tcs");
    expect(selection.first?.id).toBe("reliance");
    expect(selection.second?.id).toBe("tcs");
  });
  it("never compares a holding against itself", () => {
    const selection = selectHoldingComparison(portfolios, "one", "tcs", "tcs");
    expect(selection.first?.id).toBe("tcs");
    expect(selection.second?.id).toBe("reliance");
  });
  it("clears incompatible holding selections when switching portfolios and requires two holdings", () => {
    const selection = selectHoldingComparison(portfolios, "two", "reliance", "tcs");
    expect(selection.portfolio?.id).toBe("two");
    expect(selection.first?.id).toBe("deposit");
    expect(selection.second).toBeUndefined();
  });
  it("has no invented selection without holdings", () => {
    expect(selectHoldingComparison([], "", "", "")).toEqual({ portfolio: undefined, first: undefined, second: undefined });
  });
  it("uses each holding's own recorded values even for stocks in the same asset class", () => {
    const portfolio = portfolios[0];
    const first = portfolio?.holdings[0];
    const second = portfolio?.holdings[1];
    if (!portfolio || !first || !second) throw new Error("Missing test holdings");
    expect(holdingMetrics(first, portfolio)).toEqual({ currentValue: 1500, investedAmount: 1000, gain: 500, gainPct: 0.5, allocation: 0.25, units: 2, currentPrice: 750, purchasePrice: 500 });
    expect(holdingMetrics(second, portfolio).gainPct).toBe(-0.1);
    expect(holdingMetrics(second, portfolio).allocation).toBe(0.75);
  });
  it("does not invent prices or percentage returns when units or purchase cost are missing", () => {
    const portfolio: SavedPortfolio = { id: "empty-cost", name: "", holdings: [{ id: "h", name: "", asset: "CA", currentValue: 100, investedAmount: 0, units: 0 }] };
    const holding = portfolio.holdings[0];
    if (!holding) throw new Error("Missing test holding");
    expect(holdingMetrics(holding, portfolio).gainPct).toBeNull();
    expect(holdingMetrics(holding, portfolio).currentPrice).toBeNull();
    expect(holdingMetrics(holding, portfolio).purchasePrice).toBeNull();
  });
});