import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, RefreshCw, Shield, Activity, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/components/AccountProvider";
import { riskInsights } from "@/lib/risk-insights.functions";
import type { HoldingRiskPeriod } from "@/engine/holding-risk";
import { formatPct, formatINR } from "@/engine/format";
import { Badge } from "./Badge";

export function RiskPeriod({ mode, data, coverage, loading, reason }: { mode: "normal" | "crisis"; data: HoldingRiskPeriod | null; coverage: number; loading: boolean; reason: string }) {
  const { user } = useAccount();
  const request = useServerFn(riskInsights);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState<{ key: string; text: string | null; note: string | null } | null>(null);
  const rounded = (v: number) => Math.round(v * 1000) / 10;
  const facts = data ? { period: mode, months: data.months, start: data.start, end: data.end, volatilityPercent: rounded(data.volatility),
    coveragePercent: rounded(coverage), rows: data.rows.map(r => ({ symbol: r.symbol, moneyPercent: rounded(r.weight), riskPercent: r.risk === null ? null : rounded(r.risk) })) } : null;
  const key = JSON.stringify(facts);
  const current = reply?.key === key ? reply : null;
  const refresh = async () => {
    if (!facts) return;
    setBusy(true);
    try { const result = await request({ data: facts }); setReply({ key, text: result.text, note: result.reason === "unverified" ? "AI wording could not be verified. The measured figures below are unchanged." : result.reason ? "AI insights are unavailable right now. The measured figures below are unchanged." : null }); }
    catch { setReply({ key, text: null, note: "AI insights are unavailable right now. The measured figures below are unchanged." }); }
    finally { setBusy(false); }
  };
  const Icon = mode === "normal" ? Activity : Shield;
  const leader = data?.rows.filter(r => r.risk !== null).reduce<(typeof data.rows)[number] | null>((best, row) => !best || (row.risk ?? 0) > (best.risk ?? 0) ? row : best, null);
  return <section className="border-t border-line py-7">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3"><Icon className={`mt-1 h-5 w-5 shrink-0 ${mode === "normal" ? "text-emerald-bright" : "text-careful"}`} aria-hidden />
        <div><h2 className="font-serif text-xl text-ivory">Money vs risk, {mode === "normal" ? "in normal times" : "in a crisis"}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ivory-dim">{mode === "normal" ? "Money share is how much of your recorded stock value sits in each stock. Risk share is how much that stock contributed to the combined ups and downs measured across the available history." : "The same holdings, measured only in their worst negative portfolio months. This shows whether your largest sources of volatility changed under historical stress—not what the next crash will do."}</p></div></div>
      <div className="flex flex-wrap items-center gap-3"><Badge kind="historical" /><Button size="sm" variant="outline" onClick={() => void refresh()} disabled={busy || !data || !user}>
        {busy ? <LoaderCircle className="animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} {busy ? "Reviewing…" : "Refresh AI insights"}</Button></div>
    </div>
    {!data ? <div className="mt-6 border-l-2 border-careful bg-bg-1/70 px-5 py-4"><p role="status" className="text-sm text-ivory">{loading ? "Loading your stocks’ price history…" : reason}</p><p className="mt-2 text-xs text-ivory-faint">No sample risk figures or asset-class substitutes are used.</p></div> : <>
      <div className="my-6 grid gap-5 border-y border-line py-4 sm:grid-cols-3">
        <div><p className="text-xs text-ivory-faint">Observed annualised volatility</p><p className="num mt-1 text-2xl text-ivory">{formatPct(data.volatility, 1)}</p></div>
        <div><p className="text-xs text-ivory-faint">Largest measured risk share</p><p className="mt-1 text-lg text-ivory">{leader ? `${leader.symbol} · ${formatPct(leader.risk ?? 0, 1)}` : "Not measurable"}</p></div>
        <div><p className="text-xs text-ivory-faint">Historical sample</p><p className="num mt-1 text-lg text-ivory">{data.months} monthly observations</p><p className="num mt-1 text-xs text-ivory-faint">{data.start} – {data.end}</p></div>
      </div>
      <div className="mb-4 flex flex-wrap gap-5 text-xs text-ivory-dim"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 bg-ivory-dim" /> Money share</span><span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 ${mode === "normal" ? "bg-emerald" : "bg-careful"}`} /> Historical risk share</span></div>
      <div className="space-y-5">{data.rows.map(row => <div key={row.symbol} className="grid gap-3 border-b border-line/50 pb-5 md:grid-cols-[180px_minmax(0,1fr)_170px]">
        <div><h3 className="font-sans text-sm font-medium text-ivory">{row.symbol}</h3><p className="num mt-1 text-xs text-ivory-faint">{formatINR(row.value)} recorded</p></div>
        <div className="space-y-2"><ShareBar label="Money share" value={row.weight} tone="money" /><ShareBar label="Historical risk share" value={row.risk} tone={mode} /></div>
        <p className={`text-xs leading-relaxed ${row.risk !== null && row.risk > row.weight ? "text-careful" : "text-ivory-dim"}`}>{row.risk === null ? "No variation measured; risk share is unknown." : row.risk < 0 ? "Offset some volatility in this sample." : row.risk > row.weight ? "More measured risk than its share of money." : "Measured risk at or below its share of money."}</p>
      </div>)}</div>
      <div className="mt-6 border-l-2 border-emerald bg-bg-1/70 p-5"><h3 className="flex items-center gap-2 font-sans text-sm font-medium text-ivory"><Sparkles className="h-4 w-4 text-emerald-bright" /> AI perspective</h3>
        <p role="status" className="mt-3 text-sm leading-relaxed text-ivory-dim">{busy ? "Reviewing the measured risk figures…" : current?.text ?? current?.note ?? (!user ? "Sign in to review these measured figures with AI." : "Your measured results are ready for an AI review.")}</p></div>
      <p className="mt-4 text-xs leading-relaxed text-ivory-faint">{mode === "normal" ? "All shared monthly returns are included, including stressed months; ‘normal’ means the full-history baseline." : "Stress sample: worst 10% of all shared months, restricted to negative stock-portfolio returns; at least six observations are required."} Risk shares can be negative or exceed 100% when another holding offsets volatility. Bar length is capped at 100%; the number shows the full signed result. This is historical attribution, not a probability of loss.</p>
    </>}
  </section>;
}

function ShareBar({ label, value, tone }: { label: string; value: number | null; tone: "money" | "normal" | "crisis" }) {
  const width = value === null ? 0 : Math.min(100, Math.abs(value) * 100);
  return <div className="grid grid-cols-[minmax(0,1fr)_64px] items-center gap-3"><div className="h-2.5 overflow-hidden rounded-sm bg-bg-2" role="img" aria-label={`${label}: ${value === null ? "unknown" : formatPct(value, 1)}`}>
    <div className={`h-full ${tone === "money" ? "bg-ivory-dim" : value !== null && value < 0 ? "bg-emerald-deep" : tone === "normal" ? "bg-emerald" : "bg-careful"}`} style={{ width: `${width}%` }} /></div><span className="num text-right text-xs text-ivory">{value === null ? "—" : formatPct(value, 1)}</span></div>;
}