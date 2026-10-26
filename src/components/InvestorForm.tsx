import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Save, Trash2, ArrowRight, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ASSETS } from "@/engine/assets";
import { emptyInvestor, listPortfolios, portfolioFromHoldings, type Holding, type InvestorDetails, type SavedPortfolio } from "@/engine/investor";
import { formatINR } from "@/engine/format";
import { useAnalyser, type AnalyserState } from "./analyser/state";
import { useAccount } from "./AccountProvider";
import { supabase } from "@/integrations/supabase/client";
import { accountSettings } from "@/lib/account-settings";
import type { Json } from "@/integrations/supabase/types";
import { HoldingWizard } from "./HoldingWizard";
import { getQuotes } from "@/lib/quotes.functions";

function NumberEntry({ label, value, change, max, required = false }: { label: string; value: number; change: (n: number) => void; max?: number; required?: boolean }) {
  return <label className="block text-sm text-muted-foreground">{label}<Input className="mt-2 num" type="number" min={0} max={max} step="any" required={required} value={value || ""} onChange={e => change(Number(e.target.value))} /></label>;
}
export function InvestorForm() {
  const { user } = useAccount();
  const { state, replaceState, accountReady, saveStatus, retryLoad, corrMethod } = useAnalyser();
  const [draft, setDraft] = useState<AnalyserState>(state);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [wizard, setWizard] = useState<{ portfolioId: string; initial?: Holding } | null>(null);
  useEffect(() => { if (accountReady) setDraft(state); }, [accountReady, state]);
  // Refresh stock holdings' current value from live NSE prices.
  useEffect(() => {
    if (!accountReady) return;
    const symbols = [...new Set(listPortfolios(state).flatMap(p => p.holdings.map(h => h.symbol).filter((s): s is string => !!s)))];
    if (!symbols.length) return;
    let live = true;
    getQuotes({ data: { symbols } }).then(quotes => {
      if (!live || !quotes.length) return;
      const price = new Map(quotes.map(q => [q.symbol, q.price]));
      setDraft(s => ({ ...s, portfolios: listPortfolios(s).map(p => ({ ...p, holdings: p.holdings.map(h => h.symbol && price.has(h.symbol) && h.units > 0 ? { ...h, currentValue: Math.round(h.units * price.get(h.symbol)! * 100) / 100 } : h) })) }));
      setNote("Stock values updated with live NSE prices. Save to keep them.");
    }).catch(() => {});
    return () => { live = false; };
  }, [accountReady, state]);
  const investor = draft.investor ?? emptyInvestor();
  const patch = (next: Partial<AnalyserState>) => { setNote(""); setDraft(s => ({ ...s, ...next })); };
  const info = (next: Partial<InvestorDetails>) => patch({ investor: { ...investor, ...next } });
  const portfolios = listPortfolios(draft);
  const [sel, setSel] = useState(0);
  const current = portfolios[Math.min(sel, portfolios.length - 1)];
  const setPortfolios = (next: SavedPortfolio[]) => patch({ portfolios: next });
  const editCurrent = (next: Partial<SavedPortfolio>) => current && setPortfolios(portfolios.map(p => p.id === current.id ? { ...p, ...next } : p));
  const addPortfolio = () => { setPortfolios([...portfolios, { id: crypto.randomUUID(), name: `Portfolio ${portfolios.length + 1}`, holdings: [] }]); setSel(portfolios.length); };
  const activeSaved = portfolios.find(p => p.id === draft.activeId) ?? current;
  const portfolio = portfolioFromHoldings(current?.holdings ?? []);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (!portfolios.length || portfolios.some(p => !p.name.trim() || !p.holdings.length || p.holdings.some(h => !h.name.trim() || !h.asset || h.currentValue <= 0))) { setNote("Give every portfolio a name and at least one holding with a name, asset type and current value."); return; }
    const chosen = activeSaved ?? portfolios[0];
    if (!chosen) return;
    const next = { ...draft, portfolios, activeId: chosen.id, ...portfolioFromHoldings(chosen.holdings), investor: { ...investor, holdings: chosen.holdings }, active: "A" as const };
    setBusy(true); setNote("");
    try {
      const settings = accountSettings(next, corrMethod);
      const { error } = await supabase.from("user_portfolios").upsert({ user_id: user.id, settings: JSON.parse(JSON.stringify(settings)) as Json, updated_at: new Date().toISOString() });
      if (error) throw error;
      replaceState(next); setNote("Your portfolio and investor details are saved.");
    } catch { setNote("Could not save your portfolio. Check your entries and try again."); }
    finally { setBusy(false); }
  }
  if (!accountReady) return <section className="mt-12 border-t border-border pt-8"><p role="status">{saveStatus}</p><Button className="mt-4" onClick={retryLoad} variant="outline">Retry</Button></section>;
  return <form onSubmit={save} className="mt-12 space-y-10">
    <section className="border-t border-border pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><h2 className="font-serif text-3xl">My portfolios</h2><Button type="button" variant="outline" disabled={portfolios.length >= 20} onClick={addPortfolio}><Plus /> Add portfolio</Button></div>
      {portfolios.length === 0 ? <p className="mt-4 text-muted-foreground">No portfolios yet. Add one to enter your holdings.</p> : <>
      <div className="mt-6 flex flex-wrap gap-2" role="tablist">{portfolios.map((p, i) => <Button key={p.id} type="button" role="tab" aria-selected={p.id === current?.id} variant={p.id === current?.id ? "default" : "outline"} size="sm" onClick={() => setSel(i)}>{p.name || "Untitled portfolio"}</Button>)}</div>
      {current && <div className="mt-6">
        <div className="flex flex-wrap items-end gap-4"><label className="min-w-64 flex-1 text-sm text-muted-foreground">Portfolio name<Input className="mt-2" required maxLength={200} value={current.name} onChange={e => editCurrent({ name: e.target.value })} /></label>
          <div className="text-sm text-muted-foreground">Value <strong className="ml-2 num text-foreground">{formatINR(portfolio.value)}</strong></div>
          <Button type="button" variant="ghost" onClick={() => { setPortfolios(portfolios.filter(p => p.id !== current.id)); setSel(0); }}><Trash2 /> Delete portfolio</Button></div>
        <div className="mt-6 divide-y divide-border">{current.holdings.map((h, i) => <div key={h.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold">{h.name}</h3><p className="mt-1 text-xs text-muted-foreground">{h.symbol ? `NSE · ${h.symbol}` : ASSETS.find(a => a.id === h.asset)?.name}{h.units > 0 ? ` · ${h.units} units` : ""}</p></div>
          <div className="text-right"><p className="num text-sm">{formatINR(h.currentValue)}</p><p className="num text-xs text-muted-foreground">{portfolio.value > 0 ? (h.currentValue / portfolio.value * 100).toFixed(1) : "0"}% of portfolio</p></div>
          <div className="flex"><Button size="icon" variant="ghost" type="button" aria-label={`Edit ${h.name}`} onClick={() => setWizard({ portfolioId: current.id, initial: h })}><Pencil /></Button><Button size="icon" variant="ghost" type="button" aria-label={`Remove holding ${i + 1}`} onClick={() => editCurrent({ holdings: current.holdings.filter(x => x.id !== h.id) })}><Trash2 /></Button></div>
        </div>)}</div>
        <Button className="mt-4" type="button" variant="outline" disabled={current.holdings.length >= 200} onClick={() => setWizard({ portfolioId: current.id })}><Plus /> Add holding</Button>
      </div>}</>}
    </section>
    <details className="border-t border-border pt-8"><summary className="cursor-pointer font-serif text-2xl">Investor details</summary><div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <NumberEntry label="Age (optional)" value={investor.age} max={120} change={age => info({ age })} />
      <label className="text-sm text-muted-foreground">Occupation (optional)<Input className="mt-2" maxLength={200} value={investor.occupation} onChange={e => info({ occupation: e.target.value })} /></label>
      <NumberEntry label="Financial dependents (optional)" value={investor.dependents} change={dependents => info({ dependents })} />
      <NumberEntry label="Monthly income (₹, optional)" value={investor.monthlyIncome} change={monthlyIncome => info({ monthlyIncome })} />
      <NumberEntry label="Monthly expenses (₹, optional)" value={investor.monthlyExpenses} change={monthlyExpenses => info({ monthlyExpenses })} />
      <NumberEntry label="Outstanding loans / liabilities (₹, optional)" value={investor.liabilities} change={liabilities => info({ liabilities })} />
      <NumberEntry label="Emergency fund outside this portfolio (₹, optional)" value={investor.emergencyFund} change={emergencyFund => info({ emergencyFund })} />
      <NumberEntry label="Investment horizon (years, optional)" value={investor.horizon} max={40} change={horizon => info({ horizon })} />
    </div></details>
    <details className="border-t border-border pt-8"><summary className="cursor-pointer font-serif text-2xl">Cash needs and risk comfort</summary><div className="mt-6 grid gap-5 sm:grid-cols-2">
      <NumberEntry label="Cash needed in the next 12 months (₹)" value={draft.cashNeed} change={cashNeed => patch({ cashNeed })} />
      <NumberEntry label="Monthly savings to invest (₹)" value={draft.monthlySaving} change={monthlySaving => patch({ monthlySaving })} />
      <NumberEntry label="Biggest portfolio loss you can accept (%)" value={draft.comfortLimit * 100} max={100} change={v => patch({ comfortLimit: v / 100 })} />
      <NumberEntry label="Inflation assumption (%)" value={draft.inflation * 100} max={100} change={v => patch({ inflation: v / 100 })} />
    </div></details>
    <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6"><Button type="submit" disabled={busy}><Save />{busy ? "Saving…" : "Save my portfolio"}</Button><Button asChild variant="outline"><Link to="/analyze/overview">Open analysis <ArrowRight /></Link></Button>{note && <p role="status" className="w-full text-sm">{note}</p>}</div>
    {wizard && <HoldingWizard key={`${wizard.portfolioId}-${wizard.initial?.id ?? "new"}`} initial={wizard.initial} onClose={() => setWizard(null)} onSave={h => { setPortfolios(portfolios.map(p => p.id === wizard.portfolioId ? { ...p, holdings: wizard.initial ? p.holdings.map(old => old.id === h.id ? h : old) : [...p.holdings, h] } : p)); setWizard(null); }} />}
  </form>;
}