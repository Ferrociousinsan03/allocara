// Demo mode (spec section 13): persona "Asha" and the guided 6-step tour.
// Pure data + helpers; the overlay component lives in components/analyser.
import type { Weights } from "./assets";
import { normaliseWeights, type Scenario } from "./core";
import { detectConflicts, type Conflict } from "./conflicts";
import type { Goal } from "./goals";

export interface DemoPersona {
  value: number;
  goals: Goal[];
  cashNeed: number;
  monthlySaving: number;
  inflation: number;
  comfortLimit: number;
  weightsA: Weights; // "looks diversified" — fires the demo warnings
  weightsB: Weights; // steadier mix that clears most of them
  presetId: string;
  scenario: Scenario;
}

/**
 * Asha has about 10 lakh, needs ~26 lakh in 3 years and 4 lakh within 12 months.
 * Portfolio A looks spread across eight holdings but is tuned so the 2008-style
 * what-if fires: diversification illusion, short-horizon warning, comfort-limit
 * breach and a cash shortfall (the locked-in asset can't be sold quickly).
 * Verified by phase5.test.ts — change only together with that test.
 */
export const ASHA: DemoPersona = {
  value: 1_000_000,
  goals: [{ name: "Home", amount: 2_600_000, year: 3 }],
  cashNeed: 400_000,
  monthlySaving: 25_000,
  inflation: 0.05,
  comfortLimit: 0.15,
  weightsA: normaliseWeights({ LC: 10, MC: 28, GS: 2, CB: 2, GD: 3, CA: 2, US: 5, LK: 48 }),
  weightsB: normaliseWeights({ LC: 10, MC: 0, GS: 25, CB: 20, GD: 10, CA: 30, US: 5, LK: 0 }),
  presetId: "crash-2008",
  scenario: { equityMove: -0.35, rateChangeBps: -75, inrMove: 0.12, extraShock: null },
};

/** Conflicts for one of Asha's portfolios under her what-if (used by the overlay and tests). */
export function demoConflicts(portfolio: "A" | "B"): Conflict[] {
  return detectConflicts({
    weights: portfolio === "A" ? ASHA.weightsA : ASHA.weightsB,
    value: ASHA.value,
    scenario: ASHA.scenario,
    cashNeed: ASHA.cashNeed,
    goals: ASHA.goals,
    comfortLimit: ASHA.comfortLimit,
  });
}

export interface DemoStep {
  title: string;
  body: string;
  target?: string; // data-demo attribute to highlight
  action?: "loadAsha" | "showB"; // applied when the step is shown
}

export const DEMO_STEPS: DemoStep[] = [
  {
    title: "Meet Asha",
    body: "Asha has about ₹10 lakh. She needs roughly ₹26 lakh in 3 years for a home, and ₹4 lakh within the next 12 months. Her situation is loaded on the left.",
    target: "controls",
    action: "loadAsha",
  },
  {
    title: "A portfolio that looks diversified",
    body: "Her money sits in eight different holdings — shares, bonds, gold, cash and a locked-in fund. Eight holdings feels safe. Let's test that feeling.",
    target: "portfolio",
  },
  {
    title: "Apply a 2008-style what-if",
    body: "Shares fall 35%, interest rates drop, the rupee weakens — all at once. This is stylised, inspired by past events, not a forecast.",
    target: "scenario",
  },
  {
    title: "What breaks",
    body: "Four warnings fire: her risk is concentrated despite eight holdings, her goal is too soon for this much in shares, the fall passes her 15% comfort limit, and she cannot raise the ₹4 lakh — nearly half her money is locked in.",
    target: "conflicts",
  },
  {
    title: "Switch to portfolio B",
    body: "Portfolio B holds more bonds and cash and nothing locked in. Most warnings clear — but the trade-off is real: less expected growth, so the home goal gets harder.",
    target: "ab-toggle",
    action: "showB",
  },
  {
    title: "Your turn",
    body: "Every number here is an editable assumption. Try your own portfolio, your own what-if, your own comfort limit. Ranges, never promises.",
    target: "controls",
  },
];
