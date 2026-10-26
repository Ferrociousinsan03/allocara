// Shared analyser state: situation, comfort, portfolios A/B, and the what-if scenario.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ASSETS, ASSET_IDS, type Asset, type AssetId, type Weights } from "@/engine/assets";
import { normaliseWeights, type Scenario } from "@/engine/core";
import type { Goal } from "@/engine/goals";
import type { StockSeries } from "@/engine/stock-history";
import { parseMonthlyCsv, type MonthlyHistory } from "@/engine/history";
import { PRESETS } from "@/engine/presets";
import { emptyAnalysis, type InvestorDetails, type SavedPortfolio } from "@/engine/investor";
import { usePortfolioSync } from "./usePortfolioSync";

export type PortfolioId = "A" | "B";

export interface AnalyserState {
  value: number;
  goals: Goal[];
  cashNeed: number;
  monthlySaving: number;
  inflation: number; // decimal
  todaysMoney: boolean;
  comfortLimit: number; // decimal
  detail: boolean; // Simple vs More detail
  active: PortfolioId;
  // weights stored as percentages (0-100), normalised at compute time
  weightsA: Record<AssetId, number>;
  weightsB: Record<AssetId, number>;
  presetId: string; // "custom" once a slider moves
  equityMove: number; // percent, e.g. -35
  rateChangeBps: number;
  inrMove: number; // percent
  shockAsset: AssetId | "";
  shockSize: number; // percent, negative
  returnOverrides: Partial<Record<AssetId, number>>; // editable expected returns (decimals)
  investor?: InvestorDetails;
  portfolios?: SavedPortfolio[]; // all user-entered portfolios
  activeId?: string; // portfolio currently analysed
}

interface AnalyserContextValue {
  accountReady: boolean;
  saveStatus: string;
  saveNow: () => Promise<void>;
  retryLoad: () => void;
  state: AnalyserState;
  update: (patch: Partial<AnalyserState>) => void;
  replaceState: (s: AnalyserState) => void;
  setWeight: (portfolio: PortfolioId, asset: AssetId, pct: number) => void;
  applyPreset: (presetId: string) => void;
  setReturnOverride: (asset: AssetId, v: number | null) => void;
  assets: Asset[]; // ASSETS with expected-return overrides applied
  scenario: Scenario;
  weights: Weights; // active portfolio, normalised
  weightsNormA: Weights;
  weightsNormB: Weights;
  history: MonthlyHistory | null; // bundled 10-year monthly returns, null until loaded
  historyName: string | null;
  setUploadedHistory: (history: MonthlyHistory | null, name?: string) => void;
  uploadedPrices: StockSeries[];
  stockReturnOverrides: Record<string, number>;
  setStockReturnOverride: (symbol: string, v: number | null) => void;
  uploadedPricesName: string | null;
  setUploadedPrices: (s: StockSeries[], name?: string | null) => void;
  corrMethod: "measured" | "fixed";
  setCorrMethod: (m: "measured" | "fixed") => void;
}

const Ctx = createContext<AnalyserContextValue | null>(null);

export function AnalyserProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AnalyserState>(emptyAnalysis);
  const [history, setHistory] = useState<MonthlyHistory | null>(null);
  const [uploadedHistory, setUpload] = useState<MonthlyHistory | null>(null);
  const [historyName, setHistoryName] = useState<string | null>(null);
  const [uploadedPrices, setPrices] = useState<StockSeries[]>([]);
  const [stockReturnOverrides, setSRO] = useState<Record<string, number>>({});
  const [uploadedPricesName, setPricesName] = useState<string | null>(null);
  const [corrMethod, setCorrMethod] = useState<"measured" | "fixed">("measured");
  const sync = usePortfolioSync(state, setState, corrMethod, setCorrMethod);

  useEffect(() => {
    let alive = true;
    fetch("/data/monthly_returns.csv")
      .then((r) => (r.ok ? r.text() : null))
      .then((text) => {
        if (alive && text) setHistory(parseMonthlyCsv(text));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<AnalyserContextValue>(() => {
    const update = (patch: Partial<AnalyserState>) => setState((s) => ({ ...s, ...patch }));
    const replaceState = (s: AnalyserState) => setState(s);
    const setWeight = (portfolio: PortfolioId, asset: AssetId, pct: number) =>
      setState((s) => {
        const key = portfolio === "A" ? "weightsA" : "weightsB";
        return { ...s, [key]: { ...s[key], [asset]: pct } };
      });
    const applyPreset = (presetId: string) => {
      const p = PRESETS.find((x) => x.id === presetId);
      if (!p) return;
      setState((s) => ({
        ...s,
        presetId,
        equityMove: p.scenario.equityMove * 100,
        rateChangeBps: p.scenario.rateChangeBps,
        inrMove: p.scenario.inrMove * 100,
        shockAsset: p.scenario.extraShock?.asset ?? "",
        shockSize: (p.scenario.extraShock?.size ?? 0) * 100,
      }));
    };
    const setReturnOverride = (asset: AssetId, v: number | null) =>
      setState((s) => {
        const next = { ...s.returnOverrides };
        if (v === null) delete next[asset];
        else next[asset] = v;
        return { ...s, returnOverrides: next };
      });
    const assets: Asset[] = ASSETS.map((a) => ({ ...a, expReturn: state.returnOverrides[a.id] ?? a.expReturn }));
    const scenario: Scenario = {
      equityMove: state.equityMove / 100,
      rateChangeBps: state.rateChangeBps,
      inrMove: state.inrMove / 100,
      extraShock: state.shockAsset ? { asset: state.shockAsset, size: state.shockSize / 100 } : null,
    };
    return {
      ...sync,
      state,
      update,
      replaceState,
      setWeight,
      applyPreset,
      setReturnOverride,
      assets,
      scenario,
      weights: normaliseWeights(state.active === "A" ? state.weightsA : state.weightsB),
      weightsNormA: normaliseWeights(state.weightsA),
      weightsNormB: normaliseWeights(state.weightsB),
      history: uploadedHistory ?? history,
      historyName,
      setUploadedHistory: (next, name) => { setUpload(next); setHistoryName(next ? name ?? "Uploaded CSV" : null); },
      uploadedPrices,
      uploadedPricesName,
      stockReturnOverrides,
      setStockReturnOverride: (sym, v) => setSRO((o) => { const n = { ...o }; if (v === null) delete n[sym]; else n[sym] = v; return n; }),
      setUploadedPrices: (next, name) => { setPrices(next); setPricesName(next.length ? name ?? "Uploaded CSV" : null); },
      corrMethod,
      setCorrMethod,
    };
  }, [state, history, uploadedHistory, historyName, uploadedPrices, uploadedPricesName, stockReturnOverrides, corrMethod, sync.accountReady, sync.saveStatus, sync.saveNow]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAnalyser(): AnalyserContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAnalyser must be used inside AnalyserProvider");
  return v;
}
