// Sell planner: user picks units of their own holdings to sell; all values come from recorded holdings.
import type { Holding } from "./investor";

export interface SellLine {
  id: string;
  name: string;
  units: number; // units sold (clamped)
  price: number; // current price per unit (scenario-adjusted)
  proceeds: number;
  cost: number; // average purchase cost of units sold
  profit: number; // proceeds - cost
  shareOfPortfolio: number; // proceeds / portfolio value
}

export interface SellRisk { level: "high" | "medium" | "low"; text: string }

export interface SellPlan {
  lines: SellLine[];
  proceeds: number;
  profit: number;
  cashNeed: number;
  shortfall: number; // >0 when proceeds don't cover the need
  leftover: number; // proceeds above the need
  leftoverGrowth: number; // profit from reinvesting leftover
  remainingValue: number;
  largestShareBefore: number;
  largestShareAfter: number;
  risks: SellRisk[];
}

/** Build a sell plan. `moves` maps holding id → scenario return (decimal) applied to price. */
export function sellPlan(
  holdings: Holding[],
  sell: Record<string, number>,
  opts: { cashNeed: number; reinvestRate: number; years: number; moves?: Record<string, number> },
): SellPlan {
  const valid = holdings.filter((h) => h.units > 0 && h.currentValue > 0);
  const valueOf = (h: Holding) => h.currentValue * (1 + (opts.moves?.[h.id] ?? 0));
  const total = valid.reduce((s, h) => s + valueOf(h), 0);
  const lines: SellLine[] = [];
  const remaining: Record<string, number> = {};
  for (const h of valid) {
    const v = valueOf(h);
    const units = Math.min(h.units, Math.max(0, Number(sell[h.id]) || 0));
    remaining[h.id] = v * (1 - units / h.units);
    if (units <= 0) continue;
    const price = v / h.units;
    const proceeds = price * units;
    const cost = h.investedAmount > 0 ? (h.investedAmount / h.units) * units : 0;
    lines.push({ id: h.id, name: h.name, units, price, proceeds, cost, profit: proceeds - cost, shareOfPortfolio: total > 0 ? proceeds / total : 0 });
  }
  const proceeds = lines.reduce((s, l) => s + l.proceeds, 0);
  const profit = lines.reduce((s, l) => s + l.profit, 0);
  const need = Math.max(0, opts.cashNeed);
  const leftover = Math.max(0, proceeds - need);
  const leftoverGrowth = leftover * (Math.pow(1 + opts.reinvestRate, Math.max(0, opts.years)) - 1);
  const remainingValue = Object.values(remaining).reduce((s, v) => s + v, 0);
  const largest = (vals: number[], t: number) => (t > 0 ? Math.max(0, ...vals) / t : 0);
  const largestShareBefore = largest(valid.map(valueOf), total);
  const largestShareAfter = largest(Object.values(remaining), remainingValue);

  const risks: SellRisk[] = [];
  for (const l of lines) {
    if (l.profit < 0) risks.push({ level: "high", text: `Selling ${l.name} locks in a loss of ₹${Math.round(-l.profit).toLocaleString("en-IN")}.` });
    const h = valid.find((x) => x.id === l.id)!;
    if (l.units >= h.units) risks.push({ level: "medium", text: `You exit ${l.name} completely and lose any future gains from it.` });
  }
  if (remainingValue > 0 && largestShareAfter > 0.4 && largestShareAfter > largestShareBefore + 0.01)
    risks.push({ level: "medium", text: `One holding becomes ${(largestShareAfter * 100).toFixed(0)}% of what is left — less spread out.` });
  if (total > 0 && proceeds / total > 0.5) risks.push({ level: "high", text: `You sell over half the portfolio (${((proceeds / total) * 100).toFixed(0)}%).` });
  if (profit > 0) risks.push({ level: "low", text: `Profit of ₹${Math.round(profit).toLocaleString("en-IN")} may be taxed as capital gains.` });
  if (need > 0 && proceeds < need) risks.push({ level: "high", text: `Still short of your cash need by ₹${Math.round(need - proceeds).toLocaleString("en-IN")}.` });

  return { lines, proceeds, profit, cashNeed: need, shortfall: Math.max(0, need - proceeds), leftover, leftoverGrowth, remainingValue, largestShareBefore, largestShareAfter, risks };
}
