import type { Asset, AssetId } from "./assets";
import { assetScenarioReturn, type Scenario } from "./core";
import { portfolioFromHoldings, type Holding } from "./investor";
import { goalChanceRange, requiredReturn, type Goal } from "./goals";

/** Recorded holdings are authoritative; market shocks remain explicit assumptions. */
export function overviewMetrics(holdings: Holding[], input: {
  scenario: Scenario; assets: Asset[]; cashNeed: number; comfortLimit: number;
  goals: Goal[]; monthlySaving: number; inflation: number;
  stockReturns: Record<string, number>; returns: Partial<Record<AssetId, number>>;
}) {
  const valid = holdings.filter(h => h.asset && Number.isFinite(h.currentValue) && h.currentValue > 0);
  const value = valid.reduce((s, h) => s + h.currentValue, 0);
  const rows = valid.map(h => {
    const asset = input.assets.find(a => a.id === h.asset);
    // A market-wide move is not a stock-specific beta estimate.
    const move = asset?.equity && h.symbol
      ? Math.max(-1, input.scenario.equityMove + (input.scenario.extraShock?.asset === h.asset ? input.scenario.extraShock.size : 0))
      : asset ? assetScenarioReturn(asset, input.scenario) : 0;
    const after = h.currentValue * (1 + move);
    const cashAvailable = h.asset === "CA";
    const listedStock = Boolean(h.symbol && asset?.equity);
    return { id: h.id, symbol: h.symbol ?? "", name: h.name, value: h.currentValue, invested: h.investedAmount,
      gain: h.investedAmount > 0 ? h.currentValue - h.investedAmount : null,
      share: value > 0 ? h.currentValue / value : 0, after, change: after - h.currentValue,
      cashAvailable, listedStock, expected: h.symbol ? input.stockReturns[h.symbol] : h.asset ? input.returns[h.asset] : undefined };
  });
  const after = rows.reduce((s, r) => s + r.after, 0);
  const cash = rows.filter(r => r.cashAvailable).reduce((s, r) => s + r.after, 0);
  const saleValue = rows.filter(r => r.listedStock).reduce((s, r) => s + r.after, 0);
  const accessible = cash + saleValue;
  const need = Math.max(0, input.cashNeed);
  const paid = Math.min(need, accessible);
  const loss = value > 0 ? Math.max(0, (value - after) / value) : 0;
  const goals = input.goals.filter(g => g.amount > 0 && g.year >= 1 && Number.isFinite(g.amount) && Number.isFinite(g.year));
  const hasReturns = rows.length > 0 && rows.every(r => typeof r.expected === "number" && Number.isFinite(r.expected));
  const { weightsA } = portfolioFromHoldings(valid);
  const weights = Object.fromEntries(Object.entries(weightsA).map(([id, weight]) => [id, weight / 100])) as typeof weightsA;
  const assets = input.assets.map(a => {
    const group = rows.filter((_, i) => valid[i]?.asset === a.id);
    const sum = group.reduce((s, r) => s + r.value, 0);
    const expected = sum > 0 ? group.reduce((s, r) => s + r.value * (r.expected ?? 0), 0) / sum : 0;
    const groupAfter = group.reduce((s, r) => s + r.after, 0);
    // Encode the already-computed holding shock, not a second asset-class shock.
    return { ...a, expReturn: expected, beta: 0, duration: 0, convexity: 0, fx: 0,
      overviewMove: sum > 0 ? groupAfter / sum - 1 : 0 };
  });
  const sim = { weights, value: after, goals, cashNeed: need, monthlySaving: input.monthlySaving, inflation: input.inflation,
    assets, scenario: { equityMove: 0, rateChangeBps: 0, inrMove: 0 }, paths: 400, seed: 7 };
  const range = value > 0 && goals.length > 0 && hasReturns ? goalChanceRange(sim).map(g => ({ ...g, lo: Math.min(g.lo, g.mid, g.hi), hi: Math.max(g.lo, g.mid, g.hi) })) : [];
  const required = value > 0 && goals.length > 0 && hasReturns ? requiredReturn(sim) : null;
  return { rows, value, after, loss, cash, saleValue, accessible, need, paid,
    shortfall: Math.max(0, need - accessible), remaining: Math.max(0, after - paid),
    mustSell: Math.max(0, paid - cash), coverage: need > 0 ? accessible / need : null,
    comfortRupees: value * input.comfortLimit, beyondComfort: loss > input.comfortLimit,
    goals, hasReturns, range, required };
}

export function groundedStockInsight(text: string, facts: unknown) {
  const numbers = (s: string) => s.match(/[+-]?\d+(?:,\d{3})*(?:\.\d+)?/g)?.map(n => n.replaceAll(",", "").replace(/^\+/, "")) ?? [];
  const allowed = new Set(numbers(JSON.stringify(facts)));
  return text.trim().length > 0 && numbers(text).every(n => allowed.has(n))
    && !/\b(guaranteed|will rise|will fall|price target|strong buy|buy now|sell now|you should buy|you should sell|recommend buying|recommend selling)\b/i.test(text);
}