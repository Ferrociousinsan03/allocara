import { describe, expect, it } from "vitest";
import { STOCKS } from "./stocks";
import { emptyAnalysis } from "./investor";
import { accountSettings, readAccountSettings } from "@/lib/account-settings";

describe("official stock choices", () => {
  it("provides exactly 100 distinct selectable NSE stocks", () => {
    expect(STOCKS).toHaveLength(100);
    expect(new Set(STOCKS.map(s => s.symbol)).size).toBe(100);
    expect(STOCKS.find(s => s.symbol === "RELIANCE")?.name).toBe("Reliance Industries Ltd.");
  });
  it("preserves a selected symbol and user-entered valuation in private account settings", () => {
    const state = { ...emptyAnalysis(), portfolios: [{ id: "p", name: "My portfolio", holdings: [{ id: "h", name: "Reliance Industries Ltd.", symbol: "RELIANCE", asset: "LC" as const, units: 10, currentValue: 25000, investedAmount: 20000 }] }] };
    const result = readAccountSettings(accountSettings(state, "measured"));
    expect(result?.state.portfolios?.[0]?.holdings[0]?.symbol).toBe("RELIANCE");
    expect(result?.state.portfolios?.[0]?.holdings[0]?.currentValue).toBe(25000);
  });
});