// Scenario presets (stylised, inspired by past events — not exact replays) and sample portfolios.
import type { Scenario } from "./core";
import { normaliseWeights } from "./core";
import type { Weights } from "./assets";

export interface Preset {
  id: string;
  name: string;
  scenario: Scenario;
  fallMonths: number;
  halfLife: number;
  note: string;
}

export const PRESETS: Preset[] = [
  {
    id: "calm",
    name: "No shock (baseline)",
    scenario: { equityMove: 0, rateChangeBps: 0, inrMove: 0, extraShock: null },
    fallMonths: 3,
    halfLife: 18,
    note: "Nothing happens; useful as a baseline.",
  },
  {
    id: "crash-2008",
    name: "2008-style crash",
    scenario: { equityMove: -0.35, rateChangeBps: -75, inrMove: 0.12, extraShock: null },
    fallMonths: 6,
    halfLife: 24,
    note: "Stylised, inspired by past events, not an exact replay.",
  },
  {
    id: "rate-shock",
    name: "Interest-rate shock",
    scenario: { equityMove: -0.05, rateChangeBps: 200, inrMove: 0.03, extraShock: null },
    fallMonths: 3,
    halfLife: 12,
    note: "Stylised, inspired by past events, not an exact replay.",
  },
  {
    id: "rupee-slide",
    name: "Rupee slides",
    scenario: { equityMove: -0.1, rateChangeBps: 50, inrMove: 0.15, extraShock: null },
    fallMonths: 4,
    halfLife: 15,
    note: "Stylised, inspired by past events, not an exact replay.",
  },
  {
    id: "midcap-shock",
    name: "Mid/small-cap shock",
    scenario: { equityMove: -0.08, rateChangeBps: 0, inrMove: 0, extraShock: { asset: "MC", size: -0.25 } },
    fallMonths: 3,
    halfLife: 18,
    note: "Stylised, inspired by past events, not an exact replay.",
  },
];

export interface SamplePortfolio {
  id: string;
  name: string;
  blurb: string;
  weights: Weights;
}

export const SAMPLES: SamplePortfolio[] = [
  {
    id: "balanced-core",
    name: "Balanced Core",
    blurb: "A middle-of-the-road mix of shares, bonds, gold and cash.",
    weights: normaliseWeights({ LC: 30, MC: 10, GS: 20, CB: 15, GD: 10, CA: 10, US: 5, LK: 0 }),
  },
  {
    id: "growth-tilt",
    name: "Growth Tilt",
    blurb: "Mostly shares, for long horizons and strong nerves.",
    weights: normaliseWeights({ LC: 40, MC: 25, GS: 5, CB: 5, GD: 5, CA: 5, US: 15, LK: 0 }),
  },
  {
    id: "safety-first",
    name: "Safety First",
    blurb: "Bonds and cash heavy, for money needed soon.",
    weights: normaliseWeights({ LC: 10, MC: 0, GS: 35, CB: 20, GD: 10, CA: 20, US: 0, LK: 5 }),
  },
  {
    id: "looks-diversified",
    name: "Looks Diversified",
    blurb: "Eight holdings — but is the risk really spread out?",
    weights: normaliseWeights({ LC: 25, MC: 30, GS: 5, CB: 5, GD: 5, CA: 5, US: 15, LK: 10 }),
  },
];
