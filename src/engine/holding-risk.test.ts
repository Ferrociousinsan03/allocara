import { expect, it } from "vitest";
import { holdingRisk } from "./holding-risk";
const holdings = [{ id: "a", symbol: "AAA", name: "Entered A", asset: "LC" as const, units: 1, investedAmount: 50, currentValue: 60 }, { id: "b", symbol: "BBB", name: "Entered B", asset: "LC" as const, units: 1, investedAmount: 50, currentValue: 40 }];
const series = (symbol: string, count = 121) => {
  let close = 100;
  return { symbol, dates: Array.from({ length: count }, (_, i) => `${2015 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, "0")}`), closes: Array.from({ length: count }, (_, i) => { close *= i % 2 ? 1.04 : 0.95; return close; }) };
};
it("uses entered values and measured risk shares summing to 100%", () => {
  const r = holdingRisk(holdings, [series("AAA"), series("BBB")]);
  expect(r.normal?.rows[0]?.weight).toBe(0.6);
  expect(r.normal?.rows.reduce((s, row) => s + (row.risk ?? 0), 0)).toBeCloseTo(1);
  expect(r.crisis?.months).toBe(12);
});
it("never substitutes missing stock history with sample covariance", () => {
  const r = holdingRisk(holdings, [series("AAA")]);
  expect(r.normal).toBeNull(); expect(r.crisis).toBeNull(); expect(r.missing).toEqual(["BBB"]);
});
it("requires at least six observed negative stress months", () => {
  const r = holdingRisk(holdings, [series("AAA", 25), series("BBB", 25)]);
  expect(r.normal).not.toBeNull(); expect(r.crisis).toBeNull();
});
it("does not interpret skipped months as monthly returns", () => {
  const s = series("AAA", 13); s.dates = s.dates.map((_, i) => `${2010 + i}-01`);
  expect(holdingRisk([holdings[0] as typeof holdings[number]], [s]).normal).toBeNull();
});
it("zero measured variance gives unknown shares, not random risk", () => {
  const s = series("AAA", 13); s.closes.fill(100);
  expect(holdingRisk(holdings.slice(0, 1), [s]).normal?.rows[0]?.risk).toBeNull();
});
it("calculates covariance contributions rather than copying money weights", () => {
  const a = series("AAA", 25);
  let close = 100;
  const b = { ...a, symbol: "BBB", closes: a.closes.map((price, i) => { if (i > 0) close *= 1 + (price / (a.closes[i - 1] ?? price) - 1) * 0.5; return close; }) };
  const r = holdingRisk(holdings, [a, b]);
  expect(r.normal?.rows[0]?.risk).toBeCloseTo(0.75);
  expect(r.normal?.rows[1]?.risk).toBeCloseTo(0.25);
});
it("preserves negative diversification contributions", () => {
  const a = series("AAA", 25);
  let close = 100;
  const b = { ...a, symbol: "BBB", closes: a.closes.map((price, i) => { if (i > 0) close *= 1 - (price / (a.closes[i - 1] ?? price) - 1) * 0.5; return close; }) };
  const r = holdingRisk(holdings, [a, b]);
  expect(r.normal?.rows[0]?.risk).toBeCloseTo(1.5);
  expect(r.normal?.rows[1]?.risk).toBeCloseTo(-0.5);
});