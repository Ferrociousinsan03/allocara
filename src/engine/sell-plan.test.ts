import { describe, expect, it } from "vitest";
import { sellPlan } from "./sell-plan";

const h = [
  { id: "a", name: "A", asset: "LC" as const, units: 10, currentValue: 1000, investedAmount: 800 },
  { id: "b", name: "B", asset: "LC" as const, units: 5, currentValue: 500, investedAmount: 600 },
];

describe("sellPlan", () => {
  it("computes proceeds and profit from selected units", () => {
    const p = sellPlan(h, { a: 5 }, { cashNeed: 0, reinvestRate: 0, years: 0 });
    expect(p.proceeds).toBe(500);
    expect(p.profit).toBe(100);
  });
  it("grows leftover above the cash need at the reinvest rate", () => {
    const p = sellPlan(h, { a: 10 }, { cashNeed: 400, reinvestRate: 0.1, years: 1 });
    expect(p.leftover).toBe(600);
    expect(p.leftoverGrowth).toBeCloseTo(60);
  });
  it("flags a locked-in loss and caps units at holding size", () => {
    const p = sellPlan(h, { b: 99 }, { cashNeed: 0, reinvestRate: 0, years: 0 });
    expect(p.lines[0]?.units).toBe(5);
    expect(p.risks.some((r) => r.level === "high" && r.text.includes("loss"))).toBe(true);
  });
  it("reports shortfall when proceeds miss the need", () => {
    expect(sellPlan(h, { a: 1 }, { cashNeed: 300, reinvestRate: 0, years: 0 }).shortfall).toBe(200);
  });
});
