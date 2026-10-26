import LZString from "lz-string";
import { exportJson, importJson } from "./persistence";
import type { AnalyserState } from "@/components/analyser/state";

export function shareHash(state: AnalyserState): string {
  const { investor: _privateDetails, portfolios: _privatePortfolios, activeId: _activeId, ...analysis } = state;
  return `state=${LZString.compressToEncodedURIComponent(exportJson(analysis))}`;
}

export function readShareHash(hash: string): AnalyserState | null {
  const payload = hash.replace(/^#/, "");
  if (!payload.startsWith("state=") || payload.length > 16000) return null;
  try {
    const text = LZString.decompressFromEncodedURIComponent(payload.slice(6));
    return text ? importJson(text) : null;
  } catch { return null; }
}