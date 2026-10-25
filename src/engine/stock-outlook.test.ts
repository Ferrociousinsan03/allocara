import { describe, expect, it } from "vitest";
import { historicalOdds, portfolioValueSeries } from "./stock-outlook";

describe("stock outlook", () => {
  it("values portfolio as units × last known price", () => {
    const v = portfolioValueSeries([{ symbol: "A", times: [1, 2], closes: [10, 12] }, { symbol: "B", times: [2], closes: [5] }], { A: 2, B: 3 });
    expect(v).toEqual([{ t: 2, value: 39 }]);
  });
  it("odds are null with under two years of history", () => {
    expect(historicalOdds("X", Array(10).fill(1))).toBeNull();
  });
  it("a stock that always rises closes higher next month 100% of the time", () => {
    const o = historicalOdds("X", Array.from({ length: 30 }, (_, i) => 100 + i))!;
    expect(o[0]!.chance).toBe(1);
  });
});
