// Engine items 6-7: covariance (normal / crisis) and risk contribution.
import { ASSETS, FIXED_CORR, type Asset, type AssetId, type Weights } from "./assets";
import { clamp } from "./core";

export type Matrix = number[][];

export function cholesky(m: Matrix): Matrix | null {
  const n = m.length;
  const L: Matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = m[i]![j]!;
      for (let k = 0; k < j; k++) s -= L[i]![k]! * L[j]![k]!;
      if (i === j) {
        if (s <= 1e-12) return null;
        L[i]![i] = Math.sqrt(s);
      } else L[i]![j] = s / L[j]![j]!;
    }
  }
  return L;
}

/** Add a small ridge to the diagonal until Cholesky succeeds, then rescale to unit diagonal. */
export function repairCorrelation(c: Matrix): Matrix {
  let m = c.map((r) => [...r]);
  let ridge = 0;
  while (!cholesky(m) && ridge < 1) {
    ridge += 0.01;
    m = c.map((r, i) => r.map((v, j) => (i === j ? v + ridge : v)));
  }
  const d = m.map((r, i) => Math.sqrt(r[i]!));
  return m.map((r, i) => r.map((v, j) => v / (d[i]! * d[j]!)));
}

export function fixedRuleCrisisCorr(assets: Asset[] = ASSETS, base: Matrix = FIXED_CORR): Matrix {
  return base.map((row, i) =>
    row.map((c, j) => (i !== j && assets[i]!.risky && assets[j]!.risky ? c + (1 - c) * 0.45 : c)),
  );
}

export function pearson(x: number[], y: number[]): number {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let k = 0; k < n; k++) {
    sxy += (x[k]! - mx) * (y[k]! - my);
    sxx += (x[k]! - mx) ** 2;
    syy += (y[k]! - my) ** 2;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
}

/** Monthly history: one row per month, values keyed by asset (null/undefined = missing). */
export type MonthlyRow = Partial<Record<AssetId, number | null>>;

export type CrisisMethod = "measured" | "fixed";

export interface CovResult {
  cov: Matrix;
  corr: Matrix;
  vols: number[];
  method: CrisisMethod | "normal";
  note?: string | undefined;
}

const crisisVol = (a: Asset) => (a.id === "CA" ? a.vol : a.risky ? a.vol * 1.6 : a.vol * 1.2);

function toCov(corr: Matrix, vols: number[]): Matrix {
  return corr.map((r, i) => r.map((c, j) => c * vols[i]! * vols[j]!));
}

/** 6. Covariance in normal or crisis mode. */
export function covariance(
  mode: "normal" | "crisis",
  opts: { assets?: Asset[]; corr?: Matrix; method?: CrisisMethod; history?: MonthlyRow[] } = {},
): CovResult {
  const assets = opts.assets ?? ASSETS;
  const base = opts.corr ?? FIXED_CORR;
  if (mode === "normal") {
    const vols = assets.map((a) => a.vol);
    return { cov: toCov(base, vols), corr: base, vols, method: "normal" };
  }
  const vols = assets.map(crisisVol);
  const rule = fixedRuleCrisisCorr(assets, base);
  let corr = rule;
  let method: CrisisMethod = "fixed";
  let note: string | undefined;
  if (opts.method === "measured") {
    const hist = (opts.history ?? []).filter((r) => typeof r.LC === "number");
    const sorted = [...hist].sort((a, b) => (a.LC as number) - (b.LC as number));
    const worst = sorted.slice(0, Math.floor(hist.length * 0.1));
    if (worst.length >= 12) {
      method = "measured";
      corr = rule.map((row, i) =>
        row.map((rc, j) => {
          if (i === j) return 1;
          const pairs = worst.filter((r) => typeof r[assets[i]!.id] === "number" && typeof r[assets[j]!.id] === "number");
          if (pairs.length < 12) return rc;
          const m = pearson(pairs.map((r) => r[assets[i]!.id] as number), pairs.map((r) => r[assets[j]!.id] as number));
          return clamp(0.5 * m + 0.5 * rc, -0.95, 0.99);
        }),
      );
    } else note = "Fewer than 12 crisis months in the data; using the fixed rule.";
  }
  corr = repairCorrelation(corr.map((r, i) => r.map((v, j) => (i === j ? 1 : clamp(v, -0.95, 0.99)))));
  return { cov: toCov(corr, vols), corr, vols, method, note };
}

export interface RiskContribution {
  shares: Record<AssetId, number>;
  portfolioVol: number;
  effectiveByWeight: number;
  effectiveByRisk: number;
  diversificationRatio: number;
}

/** 7. share_i = w_i (Σw)_i / w'Σw, plus effective holdings and diversification ratio. */
export function riskContribution(w: Weights, cr: CovResult, assets: Asset[] = ASSETS): RiskContribution {
  const wv = assets.map((a) => w[a.id]);
  const sw = cr.cov.map((row) => row.reduce((s, c, j) => s + c * wv[j]!, 0));
  const variance = wv.reduce((s, x, i) => s + x * sw[i]!, 0);
  const pVol = Math.sqrt(Math.max(variance, 0));
  const shares = {} as Record<AssetId, number>;
  assets.forEach((a, i) => (shares[a.id] = variance > 0 ? (wv[i]! * sw[i]!) / variance : 0));
  const sumW2 = wv.reduce((s, x) => s + x * x, 0);
  const sumR2 = Object.values(shares).reduce((s, x) => s + x * x, 0);
  const wVol = wv.reduce((s, x, i) => s + x * cr.vols[i]!, 0);
  return {
    shares,
    portfolioVol: pVol,
    effectiveByWeight: sumW2 > 0 ? 1 / sumW2 : 0,
    effectiveByRisk: sumR2 > 0 ? 1 / sumR2 : 0,
    diversificationRatio: pVol > 0 ? wVol / pVol : 1,
  };
}
