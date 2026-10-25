import { describe, expect, it } from "vitest";
import { ASSETS, emptyWeights, type Weights } from "./assets";
import { forcedSelling, liquidity, normaliseWeights, portfolioImpact, scenarioReturns, severityOf, ZERO_SCENARIO } from "./core";
import { cholesky, covariance, riskContribution, type MonthlyRow } from "./risk";
import { formatINR, formatPct, formatPP } from "./format";

const w = (p: Partial<Weights>) => normaliseWeights({ ...emptyWeights(), ...p });
const V = 10_000_000;

describe("normaliseWeights", () => {
  it("scales weights not summing to 100%", () => {
    const n = w({ LC: 60, GS: 40 });
    expect(n.LC).toBeCloseTo(0.6);
    expect(n.GS).toBeCloseTo(0.4);
  });
  it("all-zero becomes all cash", () => {
    expect(normaliseWeights(emptyWeights()).CA).toBe(1);
  });
});

describe("scenario and impact", () => {
  it("zero shock gives zero loss", () => {
    expect(portfolioImpact(w({ LC: 50, MC: 20, GS: 30 }), V, ZERO_SCENARIO).lossPct).toBeCloseTo(0, 10);
  });
  it("all-cash portfolio loses almost nothing", () => {
    const imp = portfolioImpact(w({ CA: 1 }), V, { equityMove: -0.4, rateChangeBps: 200, inrMove: 0.1 });
    expect(Math.abs(imp.lossPct)).toBeLessThan(0.01);
  });
  it("bond formula matches hand calculation (+100 bps on gov bonds)", () => {
    // -7.5*0.01 + 0.5*70*0.0001 = -0.075 + 0.0035 = -0.0715
    expect(scenarioReturns({ equityMove: 0, rateChangeBps: 100, inrMove: 0 }).GS).toBeCloseTo(-0.0715, 10);
  });
  it("extra shock applies only to the chosen asset", () => {
    const r = scenarioReturns({ ...ZERO_SCENARIO, extraShock: { asset: "MC", size: -0.1 } });
    expect(r.MC).toBeCloseTo(-0.1);
    expect(r.LC).toBe(0);
  });
});

describe("liquidity and forced selling", () => {
  it("severity is smooth and clamped", () => {
    expect(severityOf(0)).toBe(0);
    expect(severityOf(-0.1)).toBeCloseTo(0.5);
    expect(severityOf(-0.5)).toBe(1);
    expect(severityOf(0.1)).toBe(0);
    expect(Math.abs(severityOf(-0.1001) - severityOf(-0.1))).toBeLessThan(0.001);
  });
  it("zero cash need is 'not needed'", () => {
    expect(liquidity(w({ LC: 1 }), V, ZERO_SCENARIO, 0).coverage).toBeNull();
  });
  it("locked-in assets give little cash", () => {
    const l = liquidity(w({ LK: 1 }), V, ZERO_SCENARIO, 4_00_000);
    expect(l.raisable).toBeCloseTo(V * 0.1);
  });
  it("selling safest first raises the equity share", () => {
    const f = forcedSelling(w({ LC: 50, CA: 50 }), V, ZERO_SCENARIO, 2_000_000);
    expect(f.met).toBe(true);
    expect(f.sold.CA).toBeCloseTo(2_000_000);
    expect(f.equityAfter).toBeGreaterThan(f.equityBefore);
  });
});

describe("covariance and risk", () => {
  it("risk shares sum to 100% (normal and crisis)", () => {
    const p = w({ LC: 30, MC: 20, GS: 20, GD: 10, US: 10, LK: 10 });
    for (const mode of ["normal", "crisis"] as const) {
      const rc = riskContribution(p, covariance(mode));
      expect(Object.values(rc.shares).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 8);
    }
  });
  it("crisis correlation is repaired to a valid matrix", () => {
    const c = covariance("crisis", { method: "fixed" });
    expect(cholesky(c.cov)).not.toBeNull();
    c.corr.forEach((r, i) => expect(r[i]).toBeCloseTo(1));
  });
  it("measured method falls back with too little data", () => {
    const c = covariance("crisis", { method: "measured", history: [{ LC: -0.1 }] });
    expect(c.method).toBe("fixed");
  });
  it("measured method uses data when enough crisis months exist", () => {
    let s = 1;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647) - 0.5;
    const hist: MonthlyRow[] = Array.from({ length: 150 }, () => {
      const m = rnd() * 0.1;
      return { LC: m, MC: m * 1.2 + rnd() * 0.02, GS: rnd() * 0.01, CB: rnd() * 0.01, GD: rnd() * 0.04, CA: 0.005 + rnd() * 0.001, US: m * 0.5 + rnd() * 0.03, LK: rnd() * 0.01 };
    });
    const c = covariance("crisis", { method: "measured", history: hist });
    expect(c.method).toBe("measured");
    expect(cholesky(c.cov)).not.toBeNull();
  });
  it("one asset reports effective holdings of 1", () => {
    const rc = riskContribution(w({ LC: 1 }), covariance("normal"));
    expect(rc.effectiveByWeight).toBeCloseTo(1);
    expect(rc.effectiveByRisk).toBeCloseTo(1);
    expect(rc.portfolioVol).toBeCloseTo(ASSETS[0]!.vol);
  });
});

describe("formatting", () => {
  it("lakh/crore and percent vs points", () => {
    expect(formatINR(2_600_000)).toBe("₹26 lakh");
    expect(formatINR(12_500_000)).toBe("₹1.25 crore");
    expect(formatPct(0.123)).toBe("12.3%");
    expect(formatPP(0.05)).toBe("+5.0 pts");
  });
});
