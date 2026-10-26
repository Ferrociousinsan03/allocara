import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, LoaderCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/components/AccountProvider";
import { overviewInsights } from "@/lib/overview-insights.functions";
import { formatINR, formatPct } from "@/engine/format";
import type { overviewMetrics } from "@/engine/overview";

type Metrics = ReturnType<typeof overviewMetrics>;
export function OverviewInsights({ metrics, comfort }: { metrics: Metrics; comfort: number }) {
  const { user } = useAccount();
  const request = useServerFn(overviewInsights);
  const facts = { holdings: metrics.rows.filter(r => r.symbol).map(r => ({ id: r.id, symbol: r.symbol,
    value: r.value, cost: r.invested, gain: r.gain, sharePercent: Math.round(r.share * 1000) / 10, scenarioChange: Math.round(r.change) })),
    cashNeed: metrics.need, shortfall: metrics.shortfall, comfortPercent: comfort * 100 };
  const key = JSON.stringify(facts);
  const [result, setResult] = useState<{ key: string; insights: { id: string; risk: string; tradeoff: string; adding: string }[]; note: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const current = result?.key === key ? result : null;
  const generate = async () => {
    setBusy(true);
    try {
      const reply = await request({ data: facts });
      setResult({ key, insights: reply.insights, note: reply.reason === "unverified"
        ? "AI wording could not be verified. Your recorded figures remain below."
        : reply.reason ? "AI insights are unavailable right now. Your recorded figures remain below." : null });
    } catch { setResult({ key, insights: [], note: "AI insights are unavailable right now. Your recorded figures remain below." }); }
    finally { setBusy(false); }
  };
  return <section className="border-t border-line pt-6" data-demo="conflicts">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="font-serif text-xl text-ivory">Conflicts and trade-offs</h2>
        <p className="mt-1 text-xs text-ivory-faint">Recorded exposure, purchase cost and your chosen what-if. No live news or company fundamentals assessed.</p></div>
      <Button variant="outline" size="sm" onClick={() => void generate()} disabled={busy || !user || !facts.holdings.length}>
        {busy ? <LoaderCircle className="animate-spin" /> : <Sparkles />} {busy ? "Reviewing holdings…" : current?.insights.length ? "Refresh AI insights" : "Review with AI"}
      </Button>
    </div>
    {!user && <p className="mt-3 text-sm text-ivory-dim">Sign in to get private AI insights for your stocks.</p>}
    {current?.note && <p role="status" className="mt-3 text-sm text-careful">{current.note}</p>}
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      {metrics.rows.map(row => {
        const insight = current?.insights.find(i => i.id === row.id);
        return <article key={row.id} className="rounded-lg border border-line bg-bg-1/80 p-5">
          <div className="flex items-start justify-between gap-3"><div><h3 className="text-base text-ivory">{row.name}</h3><p className="mt-1 text-xs text-ivory-faint">{row.symbol || "Recorded holding"}</p></div>
            <span className="num shrink-0 text-sm text-emerald-bright">{formatPct(row.share, 1)} of portfolio</span></div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-line py-3 text-xs">
            <div><dt className="text-ivory-faint">Recorded value</dt><dd className="num mt-1 text-sm text-ivory">{formatINR(row.value)}</dd></div>
            <div><dt className="text-ivory-faint">Unrealised gain / loss</dt><dd className={`num mt-1 text-sm ${row.gain !== null && row.gain < 0 ? "text-problem" : "text-ivory"}`}>{row.gain === null ? "Purchase cost not set" : formatINR(row.gain)}</dd></div>
          </dl>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-ivory-dim">
            <p><span className="font-medium text-ivory">Exposure: </span>{insight?.risk ?? `${row.name} represents ${formatPct(row.share, 1)} of your recorded portfolio. ${row.change === 0 ? "Your chosen what-if leaves its value unchanged." : `Its hypothetical value change is ${formatINR(row.change)}.`}`}</p>
            <p><span className="font-medium text-ivory">Trade-off: </span>{insight?.tradeoff ?? (metrics.mustSell > 0 ? "Covering your cash need depends on selling listed stocks; sale fees, taxes and execution prices can reduce the proceeds." : "An unrealised gain is not cash received, and the recorded price is not a future return.")}</p>
            <p><span className="font-medium text-ivory">Before adding more: </span>{insight?.adding ?? "A larger position increases exposure to this holding. Check your cash buffer, position size and current company filings first."}</p>
          </div>
          {insight && <p className="mt-4 flex items-center gap-1.5 text-xs text-emerald-bright"><ShieldCheck className="h-3.5 w-3.5" /> AI insight · checked against supplied figures</p>}
        </article>;
      })}
    </div>
    <p className="mt-4 text-xs text-ivory-faint">Educational tool, not financial advice. AI can make mistakes; these insights are not buy or sell recommendations.</p>
  </section>;
}