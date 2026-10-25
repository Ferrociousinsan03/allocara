// Engine items 8 and 10: parametric goal simulation and required return.
import { ASSETS, type Asset, type Weights } from "./assets";
import { portfolioImpact, ZERO_SCENARIO, type Scenario } from "./core";
import { covariance } from "./risk";

export interface Goal {
  name: string;
  amount: number; // in today's money
  year: number; // years from now
}

/** Deterministic seeded RNG (mulberry32) so runs are reproducible. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randn(rng: () => number): number {
  let u = 0;
  while (u <= 1e-12) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export interface SimInputs {
  weights: Weights;
  value: number;
  goals: Goal[];
  cashNeed: number; // needed within 12 months
  monthlySaving: number;
  inflation: number; // yearly, decimal
  scenario?: Scenario;
  returnShift?: number; // added to every asset's expected return (for the -2/0/+2 range)
  seed?: number;
  paths?: number;
  todaysMoney?: boolean; // deflate displayed outputs
  assets?: Asset[]; // defaults to ASSETS; pass overridden assumptions here
}

export interface GoalSimResult {
  years: number;
  p5: number[]; // index 0 = end of year 1
  p50: number[];
  p95: number[];
  goalChance: number[]; // per goal, in input order
  worst5Average: number; // average of the worst 5% of final outcomes
  elevatedVolMonths: number; // 24 after a 10%+ equity fall, else 0
  startValue: number; // value right after the scenario
}

/** 8. Monthly geometric-Brownian goal simulation with savings and withdrawals. */
export function goalSimulationParametric(inp: SimInputs): GoalSimResult {
  const scenario = inp.scenario ?? ZERO_SCENARIO;
  const shift = inp.returnShift ?? 0;
  const paths = inp.paths ?? 1000;
  const seed = inp.seed ?? 42;
  const goals = inp.goals.filter((g) => g.year >= 1 && g.amount > 0);
  const years = Math.max(1, ...goals.map((g) => g.year));
  const months = years * 12;
  const assets = inp.assets ?? ASSETS;
  const start = portfolioImpact(inp.weights, inp.value, scenario, assets).valueAfter;
  const mu = assets.reduce((s, a) => s + inp.weights[a.id] * (a.expReturn + shift), 0);
  const cov = covariance("normal", { assets });
  const wv = assets.map((a) => inp.weights[a.id]);
  const sw = cov.cov.map((row) => row.reduce((s, c, j) => s + c * wv[j]!, 0));
  const sigma = Math.sqrt(Math.max(0, wv.reduce((s, x, i) => s + x * sw[i]!, 0)));
  const elevated = scenario.equityMove <= -0.1 ? 24 : 0;
  const dt = 1 / 12;
  const rng = mulberry32(seed);
  const yearEnds: number[][] = Array.from({ length: years }, () => []);
  const finals: number[] = [];
  const metCount = goals.map(() => 0);

  for (let p = 0; p < paths; p++) {
    let v = start;
    const met = goals.map(() => false);
    for (let m = 1; m <= months; m++) {
      const sig = m <= elevated ? sigma * 1.3 : sigma;
      v *= Math.exp((mu - (sig * sig) / 2) * dt + sig * Math.sqrt(dt) * randn(rng));
      v += inp.monthlySaving;
      if (m === 12) v = Math.max(0, v - inp.cashNeed);
      goals.forEach((g, gi) => {
        if (g.year * 12 === m && !met[gi]) {
          const need = g.amount * Math.pow(1 + inp.inflation, g.year);
          if (v >= need) {
            v -= need;
            met[gi] = true;
          }
        }
      });
      if (v < 0) v = 0;
      if (m % 12 === 0) yearEnds[m / 12 - 1]!.push(v);
    }
    finals.push(v);
    met.forEach((x, gi) => {
      if (x) metCount[gi]!++;
    });
  }

  const deflate = (x: number, yr: number) => (inp.todaysMoney ? x / Math.pow(1 + inp.inflation, yr) : x);
  const pct = (arr: number[], q: number, yr: number) => {
    const s = [...arr].sort((a, b) => a - b);
    return deflate(s[Math.min(s.length - 1, Math.floor(q * s.length))]!, yr);
  };
  const p5: number[] = [];
  const p50: number[] = [];
  const p95: number[] = [];
  for (let y = 1; y <= years; y++) {
    p5.push(pct(yearEnds[y - 1]!, 0.05, y));
    p50.push(pct(yearEnds[y - 1]!, 0.5, y));
    p95.push(pct(yearEnds[y - 1]!, 0.95, y));
  }
  const sortedFinals = [...finals].sort((a, b) => a - b);
  const k = Math.max(1, Math.floor(paths * 0.05));
  const worst5 = sortedFinals.slice(0, k).reduce((a, b) => a + b, 0) / k;
  return {
    years,
    p5,
    p50,
    p95,
    goalChance: goals.map((_, i) => metCount[i]! / paths),
    worst5Average: deflate(worst5, years),
    elevatedVolMonths: elevated,
    startValue: start,
  };
}

export interface GoalChancePoint {
  lo: number;
  mid: number;
  hi: number;
}

/** Goal chance as a range: expected return -2, 0, +2 points. Covers the return assumption only. */
export function goalChanceRange(inp: SimInputs): GoalChancePoint[] {
  const runs = [-0.02, 0, 0.02].map((s) => goalSimulationParametric({ ...inp, returnShift: s }));
  return inp.goals.map((_, i) => ({
    lo: runs[0]!.goalChance[i] ?? 0,
    mid: runs[1]!.goalChance[i] ?? 0,
    hi: runs[2]!.goalChance[i] ?? 0,
  }));
}

export interface RequiredReturn {
  required: number | null; // yearly, decimal
  feasible: boolean;
  assumed: number; // portfolio's assumed yearly return
}

/** 10. Binary search for the yearly return that exactly reaches the goals (deterministic projection). */
export function requiredReturn(inp: SimInputs): RequiredReturn {
  const assets = inp.assets ?? ASSETS;
  const assumed = assets.reduce((s, a) => s + inp.weights[a.id] * a.expReturn, 0);
  const goals = inp.goals.filter((g) => g.year >= 1 && g.amount > 0).sort((a, b) => a.year - b.year);
  if (goals.length === 0) return { required: null, feasible: true, assumed };
  const years = Math.max(...goals.map((g) => g.year));
  const months = years * 12;
  const start = portfolioImpact(inp.weights, inp.value, inp.scenario ?? ZERO_SCENARIO).valueAfter;

  // No flooring: a negative final value means the goals could not all be paid.
  const project = (r: number): number => {
    const g = Math.pow(1 + r, 1 / 12) - 1;
    let v = start;
    for (let m = 1; m <= months; m++) {
      v *= 1 + g;
      v += inp.monthlySaving;
      if (m === 12) v -= inp.cashNeed;
      for (const gl of goals) {
        if (gl.year * 12 === m) v -= gl.amount * Math.pow(1 + inp.inflation, gl.year);
      }
    }
    return v;
  };

  if (project(1.0) < 0) return { required: null, feasible: false, assumed };
  if (project(-0.5) >= 0) return { required: -0.5, feasible: true, assumed };
  let lo = -0.5;
  let hi = 1.0;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (project(mid) >= 0) hi = mid;
    else lo = mid;
  }
  return { required: hi, feasible: true, assumed };
}
