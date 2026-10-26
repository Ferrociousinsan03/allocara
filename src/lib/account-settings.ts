import { isValidState } from "./persistence";
import type { AnalyserState } from "@/components/analyser/state";

export function accountSettings(state: AnalyserState, corrMethod: "measured" | "fixed") {
  if (!isValidState(state)) throw new Error("Please check your analysis settings before saving.");
  return { version: 1, state, corrMethod };
}

export function readAccountSettings(value: unknown) {
  if (!value || typeof value !== "object" || !("state" in value) || !isValidState(value.state)) return null;
  const corrMethod = "corrMethod" in value && value.corrMethod === "fixed" ? "fixed" : "measured";
  return { state: value.state, corrMethod } as const;
}

export const PENDING_PORTFOLIO = "allocara-pending-portfolio";