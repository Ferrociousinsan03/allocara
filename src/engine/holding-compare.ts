import type { Holding, SavedPortfolio } from "./investor";

/** Resolve selections against the current portfolio, never another portfolio's holdings. */
export function selectHoldingComparison(portfolios: SavedPortfolio[], portfolioId: string, firstId: string, secondId: string) {
  const portfolio = portfolios.find(p => p.id === portfolioId) ?? portfolios[0];
  const holdings = portfolio?.holdings ?? [];
  const first = holdings.find(h => h.id === firstId) ?? holdings[0];
  const second = holdings.find(h => h.id === secondId && h.id !== first?.id) ?? holdings.find(h => h.id !== first?.id);
  return { portfolio, first, second };
}

export function holdingMetrics(holding: Holding, portfolio: SavedPortfolio) {
  const total = portfolio.holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const gain = holding.currentValue - holding.investedAmount;
  return {
    currentValue: holding.currentValue,
    investedAmount: holding.investedAmount,
    gain,
    gainPct: holding.investedAmount > 0 ? gain / holding.investedAmount : null,
    allocation: total > 0 ? holding.currentValue / total : null,
    units: holding.units > 0 ? holding.units : null,
    currentPrice: holding.units > 0 ? holding.currentValue / holding.units : null,
    purchasePrice: holding.units > 0 && holding.investedAmount > 0 ? holding.investedAmount / holding.units : null,
  };
}