// Save/load (spec section 12): localStorage wrapped in try/catch, plus JSON export/import.
import type { AnalyserState } from "@/components/analyser/state";
import { z } from "zod";
import { ASSET_IDS } from "@/engine/assets";

const KEY = "allocara-state-v1";
const VERSION = 1;

interface Envelope {
  version: number;
  savedAt: string;
  state: AnalyserState;
}

const finite = z.number().finite();
const nonnegative = finite.nonnegative();
const assetId = z.enum(["LC", "MC", "GS", "CB", "GD", "CA", "US", "LK"]);
const weights = z.object(Object.fromEntries(ASSET_IDS.map((id) => [id, nonnegative.max(100)])));
const holding = z.object({ id: z.string().max(100), name: z.string().max(200), symbol: z.string().max(40).optional(), asset: z.union([z.literal(""), assetId]), currentValue: nonnegative, units: nonnegative, investedAmount: nonnegative });
const stateSchema = z.object({
  value: nonnegative, cashNeed: nonnegative, monthlySaving: nonnegative,
  comfortLimit: nonnegative.max(1), inflation: nonnegative.max(1),
  goals: z.array(z.object({ name: z.string().max(200), amount: nonnegative, year: finite.int().min(1).max(40) })).max(10),
  weightsA: weights, weightsB: weights, active: z.enum(["A", "B"]),
  todaysMoney: z.boolean(), detail: z.boolean(), presetId: z.string().max(100),
  equityMove: finite, rateChangeBps: finite, inrMove: finite,
  shockAsset: z.union([z.literal(""), assetId]), shockSize: finite,
  returnOverrides: z.record(assetId, finite),
  investor: z.object({
    age: finite.int().min(0).max(120), occupation: z.string().max(200), dependents: nonnegative.int(),
    monthlyIncome: nonnegative, monthlyExpenses: nonnegative, liabilities: nonnegative, emergencyFund: nonnegative,
    horizon: finite.int().min(0).max(40),
    holdings: z.array(holding).max(200),
  }).optional(),
  portfolios: z.array(z.object({ id: z.string().max(100), name: z.string().max(200), holdings: z.array(holding).max(200) })).max(20).optional(),
  activeId: z.string().max(100).optional(),
});

/** Validate all fields before settings enter the calculation engine. */
export function isValidState(x: unknown): x is AnalyserState {
  return stateSchema.safeParse(x).success;
}

export function saveToLocal(state: AnalyserState): boolean {
  try {
    const env: Envelope = { version: VERSION, savedAt: new Date().toISOString(), state };
    window.localStorage.setItem(KEY, JSON.stringify(env));
    return true;
  } catch {
    return false; // storage blocked or full — the app keeps working
  }
}

export function loadFromLocal(): AnalyserState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope;
    if (env.version !== VERSION || !isValidState(env.state)) return null;
    return env.state;
  } catch {
    return null;
  }
}

export function exportJson(state: AnalyserState): string {
  const env: Envelope = { version: VERSION, savedAt: new Date().toISOString(), state };
  return JSON.stringify(env, null, 2);
}

/** Parse an exported file; returns null on anything invalid. */
export function importJson(text: string): AnalyserState | null {
  try {
    const env = JSON.parse(text) as Envelope;
    if (env.version !== VERSION || !isValidState(env.state)) return null;
    return env.state;
  } catch {
    return null;
  }
}
