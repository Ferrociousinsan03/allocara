import { ASSET_IDS, emptyWeights, type AssetId } from "./assets";

export interface Holding {
  id: string;
  symbol?: string; // NSE symbol for catalogue-selected stocks; older holdings remain valid.
  name: string;
  asset: AssetId | "";
  currentValue: number;
  units: number;
  investedAmount: number;
}
export interface InvestorDetails {
  age: number;
  occupation: string;
  dependents: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  liabilities: number;
  emergencyFund: number;
  horizon: number;
  holdings: Holding[];
}
export const emptyInvestor = (): InvestorDetails => ({ age: 0, occupation: "", dependents: 0, monthlyIncome: 0, monthlyExpenses: 0, liabilities: 0, emergencyFund: 0, horizon: 0, holdings: [] });

/** Actual rupee holdings determine the portfolio; no allocation is invented. */
export function portfolioFromHoldings(holdings: Holding[]) {
  const amounts = emptyWeights();
  for (const holding of holdings) {
    if (holding.asset && ASSET_IDS.includes(holding.asset) && Number.isFinite(holding.currentValue) && holding.currentValue > 0) amounts[holding.asset] += holding.currentValue;
  }
  const value = ASSET_IDS.reduce((sum, id) => sum + amounts[id], 0);
  const weightsA = emptyWeights();
  if (value > 0) for (const id of ASSET_IDS) weightsA[id] = amounts[id] / value * 100;
  return { value, weightsA };
}
export function hasPortfolio(state: { active: "A" | "B"; value: number; weightsA: Record<AssetId, number>; weightsB: Record<AssetId, number> }) {
  const weights = state.active === "A" ? state.weightsA : state.weightsB;
  return state.value > 0 && ASSET_IDS.some(id => weights[id] > 0);
}
export interface SavedPortfolio { id: string; name: string; holdings: Holding[] }
/** Every user-entered portfolio; older accounts with one holdings list become "My portfolio". */
export function listPortfolios(state: { portfolios?: SavedPortfolio[]; investor?: InvestorDetails }): SavedPortfolio[] {
  if (state.portfolios?.length) return state.portfolios;
  const holdings = state.investor?.holdings ?? [];
  return holdings.length ? [{ id: "main", name: "My portfolio", holdings }] : [];
}
/** Portfolios that have at least one valued holding — only these can be analysed or compared. */
export function usablePortfolios(state: { portfolios?: SavedPortfolio[]; investor?: InvestorDetails }) {
  return listPortfolios(state).filter(p => portfolioFromHoldings(p.holdings).value > 0);
}
export function emptyAnalysis() {
  return { value: 0, goals: [] as { name: string; amount: number; year: number }[], cashNeed: 0, monthlySaving: 0, inflation: 0.05, todaysMoney: false, comfortLimit: 0, detail: false, active: "A" as "A" | "B", weightsA: emptyWeights(), weightsB: emptyWeights(), presetId: "custom", equityMove: 0, rateChangeBps: 0, inrMove: 0, shockAsset: "" as AssetId | "", shockSize: 0, returnOverrides: {} as Partial<Record<AssetId, number>>, investor: emptyInvestor(), portfolios: [] as SavedPortfolio[], activeId: "" };
}