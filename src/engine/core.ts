// Engine items 1-5: weights, scenario returns, impact, liquidity, forced selling.
import { ASSETS, ASSET_IDS, type Asset, type AssetId, type Weights } from "./assets";

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** 1. Scale to sum 1; all-zero (or invalid) returns all cash. */
export function normaliseWeights(w: Partial<Weights>): Weights {
  const out = Object.fromEntries(ASSET_IDS.map((id) => [id, Math.max(0, Number(w[id]) || 0)])) as Weights;
  const total = ASSET_IDS.reduce((s, id) => s + out[id], 0);
  if (!(total > 0)) {
    ASSET_IDS.forEach((id) => (out[id] = id === "CA" ? 1 : 0));
    return out;
  }
  ASSET_IDS.forEach((id) => (out[id] = out[id] / total));
  return out;
}

export interface Scenario {
  equityMove: number; // decimal, -0.3 = shares fall 30%
  rateChangeBps: number; // +100 = rates up 1 point
  inrMove: number; // decimal, positive = rupee weakens
  extraShock?: { asset: AssetId; size: number } | null;
}

export const ZERO_SCENARIO: Scenario = { equityMove: 0, rateChangeBps: 0, inrMove: 0, extraShock: null };

/** 2. r_i = beta*eq - dur*dy + 0.5*conv*dy^2 + fx*inr + extra. */
export function assetScenarioReturn(a: Asset, s: Scenario): number {
  const dy = s.rateChangeBps / 10000;
  let r = a.beta * s.equityMove - a.duration * dy + 0.5 * a.convexity * dy * dy + a.fx * s.inrMove;
  if (s.extraShock && s.extraShock.asset === a.id) r += s.extraShock.size;
  return Math.max(-1, r);
}

export function scenarioReturns(s: Scenario, assets: Asset[] = ASSETS): Record<AssetId, number> {
  return Object.fromEntries(assets.map((a) => [a.id, assetScenarioReturn(a, s)])) as Record<AssetId, number>;
}

export interface Impact {
  valueBefore: number;
  valueAfter: number;
  lossPct: number; // valueAfter/V - 1 (negative = loss)
  perAsset: Record<AssetId, { pct: number; rupees: number; assetReturn: number }>;
}

/** 3. Portfolio impact of a scenario. */
export function portfolioImpact(w: Weights, V: number, s: Scenario, assets: Asset[] = ASSETS): Impact {
  const r = scenarioReturns(s, assets);
  const perAsset = {} as Impact["perAsset"];
  let after = 0;
  for (const a of assets) {
    after += w[a.id] * V * (1 + r[a.id]);
    perAsset[a.id] = { pct: w[a.id] * r[a.id], rupees: w[a.id] * V * r[a.id], assetReturn: r[a.id] };
  }
  return { valueBefore: V, valueAfter: after, lossPct: V > 0 ? after / V - 1 : 0, perAsset };
}

export const severityOf = (equityMove: number) => clamp(-equityMove / 0.2, 0, 1);

export interface Liquidity {
  raisable: number;
  need: number;
  coverage: number | null; // null = not needed
  severity: number;
  perAsset: Record<AssetId, number>;
}

/** 4. Cash raisable quickly after the scenario. */
export function liquidity(w: Weights, V: number, s: Scenario, cashNeed: number, assets: Asset[] = ASSETS): Liquidity {
  const imp = portfolioImpact(w, V, s, assets);
  const sev = severityOf(s.equityMove);
  const perAsset = {} as Record<AssetId, number>;
  let raisable = 0;
  for (const a of assets) {
    const value = w[a.id] * V * (1 + imp.perAsset[a.id].assetReturn);
    const x = value * a.liquid * (1 - a.disc * sev);
    perAsset[a.id] = x;
    raisable += x;
  }
  return { raisable, need: cashNeed, coverage: cashNeed > 0 ? raisable / cashNeed : null, severity: sev, perAsset };
}

export interface ForcedSelling {
  sold: Record<AssetId, number>; // rupees of value removed
  equityBefore: number;
  equityAfter: number;
  met: boolean;
  remainingValue: number;
}

/** 5. Pay the cash need from lowest-volatility assets first. */
export function forcedSelling(w: Weights, V: number, s: Scenario, cashNeed: number, assets: Asset[] = ASSETS): ForcedSelling {
  const imp = portfolioImpact(w, V, s, assets);
  const sev = severityOf(s.equityMove);
  const values = Object.fromEntries(assets.map((a) => [a.id, w[a.id] * V * (1 + imp.perAsset[a.id].assetReturn)])) as Record<AssetId, number>;
  const total = assets.reduce((t, a) => t + values[a.id], 0);
  const eqShare = (vals: Record<AssetId, number>) => {
    const t = assets.reduce((x, a) => x + vals[a.id], 0);
    return t > 0 ? assets.filter((a) => a.equity).reduce((x, a) => x + vals[a.id], 0) / t : 0;
  };
  const before = eqShare(values);
  const sold = Object.fromEntries(assets.map((a) => [a.id, 0])) as Record<AssetId, number>;
  let remaining = Math.max(0, cashNeed);
  const remainingVals = { ...values };
  for (const a of [...assets].sort((x, y) => x.vol - y.vol)) {
    if (remaining <= 0) break;
    const netPerRupee = 1 - a.disc * sev; // cash received per rupee of value sold
    const maxValue = values[a.id] * a.liquid;
    if (maxValue <= 0 || netPerRupee <= 0) continue;
    const valueToSell = Math.min(maxValue, remaining / netPerRupee);
    sold[a.id] = valueToSell;
    remainingVals[a.id] -= valueToSell;
    remaining -= valueToSell * netPerRupee;
  }
  const remainingValue = assets.reduce((t, a) => t + remainingVals[a.id], 0);
  return { sold, equityBefore: before, equityAfter: eqShare(remainingVals), met: remaining <= 1e-6, remainingValue: Math.min(remainingValue, total) };
}
