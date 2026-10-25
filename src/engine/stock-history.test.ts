import { describe, expect, it } from "vitest";
import { stockHistoryStats } from "./stock-history";

describe("stockHistoryStats", () => {
  it("returns null when the user has no stock data", () => {
    expect(stockHistoryStats([], {})).toBeNull();
  });
  it("computes growth and drawdown from the chosen stock's real closes", () => {
    const s = stockHistoryStats([{ symbol: "X", dates: ["2024-01", "2024-02", "2024-03"], closes: [100, 120, 90] }], { X: 1 })!;
    expect(s.growth.at(-1)!.value).toBeCloseTo(90);
    expect(s.maxDrawdown).toBeCloseTo(-0.25);
    expect(s.months).toBe(2);
  });
});
