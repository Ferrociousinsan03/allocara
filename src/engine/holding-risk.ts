import type { Holding } from "./investor";
import type { StockSeries } from "./stock-history";

export interface HoldingRiskPeriod {
  months: number; start: string; end: string; volatility: number;
  rows: { symbol: string; value: number; weight: number; risk: number | null }[];
}
const monthIndex = (date: string) => { const [y, m] = date.slice(0, 7).split("-").map(Number); return (y ?? 0) * 12 + (m ?? 0); };

/** Covariance measured solely from consecutive, aligned stock monthly closes. No class proxies. */
export function holdingRisk(holdings: Holding[], series: StockSeries[]) {
  const amounts = new Map<string, number>();
  const valued = holdings.filter(h => Number.isFinite(h.currentValue) && h.currentValue > 0);
  const total = valued.reduce((s, h) => s + h.currentValue, 0);
  for (const h of valued) if (h.symbol) amounts.set(h.symbol, (amounts.get(h.symbol) ?? 0) + h.currentValue);
  const symbols = [...amounts.keys()].sort();
  const returns = symbols.map(symbol => {
    const s = series.find(s => s.symbol === symbol);
    const out = new Map<string, number>();
    if (!s) return out;
    for (let i = 1; i < s.dates.length; i++) {
      const previousDate = s.dates[i - 1], date = s.dates[i], previous = s.closes[i - 1], close = s.closes[i];
      if (date && previousDate && previous && close && Number.isFinite(previous) && Number.isFinite(close)
        && previous > 0 && close > 0 && monthIndex(date) - monthIndex(previousDate) === 1) out.set(date.slice(0, 7), close / previous - 1);
    }
    return out;
  });
  const missing = symbols.filter((_, i) => (returns[i]?.size ?? 0) < 12);
  const dates = [...(returns[0]?.keys() ?? [])].filter(d => returns.every(r => r.has(d))).sort();
  const includedValue = [...amounts.values()].reduce((s, v) => s + v, 0);
  const weights = symbols.map(s => includedValue > 0 ? (amounts.get(s) ?? 0) / includedValue : 0);
  const observations = dates.map(date => ({ date, vector: returns.map(r => r.get(date) ?? 0) }));
  const compute = (sample: typeof observations): HoldingRiskPeriod | null => {
    if (sample.length < 6 || !symbols.length) return null;
    const means = symbols.map((_, i) => sample.reduce((s, o) => s + (o.vector[i] ?? 0), 0) / sample.length);
    const cov = symbols.map((_, i) => symbols.map((_, j) => sample.reduce((s, o) => s + ((o.vector[i] ?? 0) - (means[i] ?? 0)) * ((o.vector[j] ?? 0) - (means[j] ?? 0)), 0) / (sample.length - 1)));
    const marginal = cov.map(row => row.reduce((s, c, i) => s + c * (weights[i] ?? 0), 0));
    const variance = marginal.reduce((s, m, i) => s + m * (weights[i] ?? 0), 0);
    const ordered = sample.map(o => o.date).sort();
    return { months: sample.length, start: ordered[0] ?? "", end: ordered.at(-1) ?? "", volatility: Math.sqrt(Math.max(0, variance) * 12),
      rows: symbols.map((symbol, i) => ({ symbol, value: amounts.get(symbol) ?? 0, weight: weights[i] ?? 0,
        risk: variance > 1e-14 ? (weights[i] ?? 0) * (marginal[i] ?? 0) / variance : null })) };
  };
  const ready = !missing.length && dates.length >= 12;
  const normal = ready ? compute(observations) : null;
  const portfolioReturn = (o: typeof observations[number]) => o.vector.reduce((s, r, i) => s + r * (weights[i] ?? 0), 0);
  const worst = [...observations].filter(o => portfolioReturn(o) < 0).sort((a, b) => portfolioReturn(a) - portfolioReturn(b)).slice(0, Math.ceil(observations.length * 0.1));
  const crisis = ready && worst.length >= 6 ? compute(worst) : null;
  return { normal, crisis, total, includedValue, coverage: total > 0 ? includedValue / total : 0,
    missing, symbols, commonMonths: dates.length, crisisMonths: worst.length,
    excluded: valued.filter(h => !h.symbol).map(h => h.name) };
}