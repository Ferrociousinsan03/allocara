import { describe, expect, it } from "vitest";
import { emptyAnalysis, emptyInvestor, hasPortfolio, portfolioFromHoldings, type Holding } from "./investor";
import { accountSettings, readAccountSettings } from "@/lib/account-settings";
import { shareHash, readShareHash } from "@/lib/share";

const holdings: Holding[] = [
  { id: "1", name: "My equity fund", asset: "LC", currentValue: 150000, units: 100, investedAmount: 120000 },
  { id: "2", name: "My stock", asset: "LC", currentValue: 50000, units: 10, investedAmount: 45000 },
  { id: "3", name: "My deposit", asset: "CA", currentValue: 100000, units: 0, investedAmount: 100000 },
];
describe("user-entered portfolios", () => {
  it("starts without sample holdings, money, goals or investor finances", () => {
    const state = emptyAnalysis();
    expect(state.value).toBe(0);
    expect(state.weightsA.LC).toBe(0);
    expect(Object.values(state.weightsA).every(v => v === 0)).toBe(true);
    expect(Object.values(state.weightsB).every(v => v === 0)).toBe(true);
    expect(state.goals).toEqual([]);
    expect(state.cashNeed).toBe(0);
    expect(state.monthlySaving).toBe(0);
    expect(state.investor?.holdings).toEqual([]);
    expect(hasPortfolio(state)).toBe(false);
  });
  it("derives allocations from actual holding values without filling missing assets", () => {
    const result = portfolioFromHoldings(holdings);
    expect(result.value).toBe(300000);
    expect(result.weightsA.LC).toBeCloseTo(66.66666667);
    expect(result.weightsA.CA).toBeCloseTo(33.33333333);
    expect(result.weightsA.GS).toBe(0);
    expect(portfolioFromHoldings([]).value).toBe(0);
  });
  it("privately round-trips holding names and investor finances", () => {
    const state = { ...emptyAnalysis(), ...portfolioFromHoldings(holdings), investor: { ...emptyInvestor(), age: 34, monthlyIncome: 85000, holdings } };
    const restored = readAccountSettings(accountSettings(state, "measured"));
    expect(restored?.state.investor?.holdings[0]?.name).toBe("My equity fund");
    expect(restored?.state.investor?.monthlyIncome).toBe(85000);
    expect(restored?.state.value).toBe(300000);
  });
  it("excludes personal investor details and holding names from shared links", () => {
    const state = { ...emptyAnalysis(), ...portfolioFromHoldings(holdings), investor: { ...emptyInvestor(), age: 34, holdings } };
    const shared = readShareHash(shareHash(state));
    expect(shared?.investor).toBeUndefined();
    expect(shared?.weightsA.LC).toBeCloseTo(66.66666667);
  });
});
describe("multiple portfolios", () => {
  it("treats an older single holdings list as one portfolio and ignores empty portfolios", async () => {
    const { listPortfolios, usablePortfolios } = await import("./investor");
    expect(listPortfolios({ investor: { ...emptyInvestor(), holdings } })).toHaveLength(1);
    const state = { portfolios: [{ id: "a", name: "A", holdings }, { id: "b", name: "Empty", holdings: [] }] };
    expect(usablePortfolios(state).map(p => p.id)).toEqual(["a"]);
  });
  it("saves several named portfolios privately and keeps them out of shared links", () => {
    const portfolios = [{ id: "a", name: "Growth", holdings }, { id: "b", name: "Safe", holdings: [holdings[2]!] }];
    const state = { ...emptyAnalysis(), ...portfolioFromHoldings(holdings), portfolios, activeId: "a" };
    expect(readAccountSettings(accountSettings(state, "measured"))?.state.portfolios).toHaveLength(2);
    expect(readShareHash(shareHash(state))?.portfolios).toBeUndefined();
  });
});
