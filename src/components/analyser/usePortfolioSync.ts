import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/components/AccountProvider";
import { accountSettings, readAccountSettings, PENDING_PORTFOLIO } from "@/lib/account-settings";
import { readShareHash } from "@/lib/share";
import type { AnalyserState } from "./state";
import type { Json } from "@/integrations/supabase/types";

export function usePortfolioSync(state: AnalyserState, setState: Dispatch<SetStateAction<AnalyserState>>, corrMethod: "measured" | "fixed", setCorrMethod: Dispatch<SetStateAction<"measured" | "fixed">>) {
  const { user, loading } = useAccount();
  const [status, setStatus] = useState("Loading account…");
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const baseline = useRef("");
  const alive = useRef(true);
  const queue = useRef(Promise.resolve());
  const latest = useRef({ state, corrMethod });
  latest.current = { state, corrMethod };
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (loading) return;
    let active = true;
    setReady(false);
    async function load() {
      try {
        const shared = readShareHash(window.location.hash);
        if (!user) { if (shared) setState(shared); setReady(true); setStatus("Not signed in"); return; }
        const { data, error } = await supabase.from("user_portfolios").select("settings").eq("user_id", user.id).maybeSingle();
        if (error) throw error;
        if (!active) return;
        const saved = data ? readAccountSettings(data.settings) : null;
        if (data && !saved) throw new Error("Saved settings could not be read.");
        let pending = null;
        try { pending = readAccountSettings(JSON.parse(sessionStorage.getItem(PENDING_PORTFOLIO) ?? "null")); } catch { /* no pending draft */ }
        const chosen = shared ? { state: shared, corrMethod: latest.current.corrMethod } : saved ?? pending ?? latest.current;
        setState(chosen.state); setCorrMethod(chosen.corrMethod);
        baseline.current = JSON.stringify(accountSettings(chosen.state, chosen.corrMethod));
        sessionStorage.removeItem(PENDING_PORTFOLIO);
        setStatus(shared ? "Shared snapshot — edit to save" : saved ? "Saved to your account" : "Enter your portfolio in My account");
        setReady(true);
      } catch { if (active) { setStatus("Could not load account data. Retry before editing."); setReady(false); } }
    }
    void load();
    return () => { active = false; };
  }, [user?.id, loading, retry, setState, setCorrMethod]);

  const saveNow = useCallback(async () => {
    if (!user || !ready) return;
    const owner = user.id;
    let settings;
    try { settings = accountSettings(latest.current.state, latest.current.corrMethod); }
    catch { setStatus("Check your settings before saving."); return; }
    const encoded = JSON.stringify(settings);
    setStatus("Saving…");
    queue.current = queue.current.then(async () => {
      if (!alive.current) return;
      const { error } = await supabase.from("user_portfolios").upsert({ user_id: owner, settings: JSON.parse(encoded) as Json, updated_at: new Date().toISOString() });
      if (!alive.current) return;
      if (error) setStatus("Save failed — retry saving");
      else { baseline.current = encoded; setStatus("Saved to your account"); }
    }).catch(() => { if (alive.current) setStatus("Save failed — retry saving"); });
    await queue.current;
  }, [user?.id, ready]);

  useEffect(() => {
    if (!user || !ready) return;
    let encoded;
    try { encoded = JSON.stringify(accountSettings(state, corrMethod)); } catch { setStatus("Check your settings before saving."); return; }
    if (encoded === baseline.current) return;
    if (readShareHash(window.location.hash)) window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setStatus("Unsaved changes");
    const timer = window.setTimeout(() => void saveNow(), 700);
    return () => window.clearTimeout(timer);
  }, [state, corrMethod, ready, user?.id, saveNow]);

  useEffect(() => {
    const changed = () => { const shared = readShareHash(window.location.hash); if (shared) { baseline.current = JSON.stringify(accountSettings(shared, latest.current.corrMethod)); setState(shared); setStatus("Shared snapshot — edit to save"); } };
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, [setState]);
  return { accountReady: ready, saveStatus: status, saveNow, retryLoad: () => setRetry(n => n + 1) };
}