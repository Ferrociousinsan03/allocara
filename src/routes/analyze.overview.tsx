import { pageMeta } from "@/lib/metadata";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Wallet, Shield, Target, TrendingUp, ArrowRight, Banknote } from "lucide-react";
import { overviewMetrics } from "@/engine/overview";
import { usablePortfolios } from "@/engine/investor";
import { formatINR, formatPct } from "@/engine/format";
import { Badge, StatusPill } from "@/components/analyser/Badge";
import { useAnalyser } from "@/components/analyser/state";
import { OverviewInsights } from "@/components/analyser/OverviewInsights";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/analyze/overview")({
  head: () => ({
    meta: pageMeta("Portfolio Overview — Allocara", "Your recorded holdings, hypothetical portfolio changes, cash needs and private AI stock exposure insights. No invented portfolio figures."),
  }),
  component: Overview,
});

function Metric({ title, icon: Icon, children }: { title: string; icon: typeof Wallet; children: React.ReactNode }) {
  return <section className="min-w-0 rounded-lg border border-line bg-bg-1/90 p-5">
    <Icon className="mb-4 h-5 w-5 text-emerald-bright" aria-hidden />
    <h2 className="font-sans text-xs font-medium text-ivory-dim">{title}</h2>
    <div className="mt-3 space-y-3">{children}</div>
  </section>;
}

function Overview() {
  const { state, scenario, assets, stockReturnOverrides } = useAnalyser();
  const r = useMemo(() => {
    const portfolios = usablePortfolios(state);
    const selected = portfolios.find(p => p.id === state.activeId) ?? portfolios[0];
    return overviewMetrics(selected?.holdings ?? [], { scenario, assets, cashNeed: state.cashNeed,
      comfortLimit: state.comfortLimit, goals: state.goals, monthlySaving: state.monthlySaving,
      inflation: state.inflation, stockReturns: stockReturnOverrides, returns: state.returnOverrides });
  }, [state, scenario, assets, stockReturnOverrides]);
  if (r.value <= 0) return <section className="py-8"><h2 className="text-xl text-ivory">No valued holdings to review</h2>
    <p className="mt-3 text-sm text-ivory-dim">Add your portfolio in My Account. Overview uses only your recorded holdings.</p>
    <Button asChild className="mt-4"><Link to="/account">My Account <ArrowRight /></Link></Button></section>;
  const comfortSet = state.comfortLimit > 0;
  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="font-serif text-2xl text-ivory">Your portfolio, at a glance</h2><p className="mt-1 text-xs text-ivory-faint">{r.rows.length} recorded holding{r.rows.length === 1 ? "" : "s"} · current values from your portfolio</p></div>
      <Badge kind="hypothetical" />
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric title="Value after this what-if" icon={TrendingUp}>
        <p className="num break-words text-2xl font-semibold text-ivory">{formatINR(r.after)}</p>
        <p className="text-xs text-ivory-dim">Recorded value <span className="num text-ivory">{formatINR(r.value)}</span></p>
        <p className={`num text-sm ${r.after < r.value ? "text-problem" : "text-emerald-bright"}`}>{formatINR(r.after - r.value)} ({formatPct((r.after - r.value) / r.value, 1)})</p>
        <p className="text-xs leading-relaxed text-ivory-faint">Listed stocks use your selected market move, not a stock-specific forecast.</p>
      </Metric>
      <Metric title="Cash for the next 12 months" icon={Wallet}>
        <p className="num text-2xl font-semibold text-ivory">{r.need > 0 ? formatINR(r.need) : "Not set"}</p>
        <div className="space-y-2 text-xs text-ivory-dim"><p>Cash held <span className="num float-right text-ivory">{formatINR(r.cash)}</span></p><p>Possible stock proceeds <span className="num float-right text-ivory">{formatINR(r.saleValue)}</span></p></div>
        {r.coverage !== null ? <><StatusPill status={r.shortfall > 0 ? "Problem" : r.mustSell > 0 ? "Careful" : "OK"} /><p className="num text-xs text-ivory-dim">{r.coverage.toFixed(1)}x gross coverage{r.shortfall > 0 ? ` · ${formatINR(r.shortfall)} short` : ""}</p></> : <p className="text-xs text-ivory-faint">No cash need entered; coverage not assessed.</p>}
        <p className="text-xs leading-relaxed text-ivory-faint">Sale proceeds exclude taxes, fees and execution changes. Other investments and outside emergency funds are not counted.</p>
      </Metric>
      <Metric title="Goal chance (range)" icon={Target}>
        {r.goals.length === 0 ? <><p className="text-lg text-ivory">No goal recorded</p><p className="text-xs leading-relaxed text-ivory-faint">Financial goal entry has been removed. No goal amount or probability is assumed.</p></> : !r.hasReturns ? <><p className="text-lg text-ivory">Not estimated</p><p className="text-xs text-ivory-dim">{r.goals.length} saved goal{r.goals.length === 1 ? "" : "s"}. Enter a return assumption for every holding to assess them.</p><Link to="/analyze/assumptions" className="inline-flex items-center gap-1 text-xs text-emerald-bright">Return assumptions <ArrowRight className="h-3 w-3" /></Link></> : <>{r.range.map((g, i) => <div key={i}><p className="text-xs text-ivory-dim">{r.goals[i]?.name || "My goal"}</p><p className="num text-lg text-ivory">{Math.round(g.lo * 100) === Math.round(g.hi * 100) ? formatPct(g.lo, 0) : `${formatPct(g.lo, 0)}–${formatPct(g.hi, 0)}`}</p></div>)}<Badge kind="assumption" /><p className="text-xs text-ivory-faint">Model estimate using your return inputs and illustrative asset-class volatility; not a stock forecast.</p></>}
      </Metric>
      <Metric title="Loss vs your comfort limit" icon={Shield}>
        <p className="num text-2xl font-semibold text-ivory">{formatPct(r.loss, 1)} fall</p>
        <p className="num text-xs text-ivory-dim">Potential loss {formatINR(Math.max(0, r.value - r.after))}</p>
        {comfortSet ? <><StatusPill status={r.beyondComfort ? "Problem" : "OK"} /><p className="num text-xs text-ivory-dim">Your limit {formatPct(state.comfortLimit, 0)} · {formatINR(r.comfortRupees)}</p><p className="text-xs text-ivory-faint">{r.beyondComfort ? `Exceeds your limit by ${formatINR(r.value * r.loss - r.comfortRupees)}.` : `Remaining room: ${formatINR(r.comfortRupees - r.value * r.loss)}.`}</p></> : <><p className="text-sm text-careful">Comfort limit not set</p><Link to="/account" className="text-xs text-emerald-bright">Set your loss comfort in My Account</Link></>}
      </Metric>
    </div>
    <div className="grid gap-6 border-y border-line py-6 lg:grid-cols-2">
      <section className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h2 className="font-serif text-lg text-ivory">If you pay the cash need</h2><Badge kind="hypothetical" /></div>
        {r.need <= 0 ? <p className="mt-4 text-sm text-ivory-dim">No cash need entered. Your holdings are unchanged; no sale is assumed.</p> : <><dl className="mt-4 grid grid-cols-2 gap-4 text-xs text-ivory-dim">
          <div><dt>Covered by held cash</dt><dd className="num mt-1 text-lg text-ivory">{formatINR(Math.min(r.cash, r.need))}</dd></div>
          <div><dt>Stock proceeds needed</dt><dd className="num mt-1 text-lg text-careful">{formatINR(r.mustSell)}</dd></div>
          <div><dt>Portfolio remaining</dt><dd className="num mt-1 text-lg text-ivory">{formatINR(r.remaining)}</dd></div>
          <div><dt>Unfunded cash need</dt><dd className={`num mt-1 text-lg ${r.shortfall > 0 ? "text-problem" : "text-ivory"}`}>{formatINR(r.shortfall)}</dd></div>
        </dl><p className="mt-4 text-xs leading-relaxed text-ivory-faint">Uses cash first, then gross listed-stock proceeds at what-if values. No specific stock sale is selected here.</p><Button asChild variant="outline" size="sm" className="mt-3"><Link to="/analyze/scenario-lab"><Banknote /> Choose stocks in Plan a sale</Link></Button></>}
      </section>
      <section className="min-w-0"><div className="flex flex-wrap items-center gap-3"><h2 className="font-serif text-lg text-ivory">Required return for your goals</h2><Badge kind="assumption" /></div>
        <p className="mt-4 text-sm leading-relaxed text-ivory-dim">{r.goals.length === 0 ? "No financial goal is recorded, so no required return is calculated. We do not substitute a sample goal." : !r.hasReturns ? "A saved goal exists, but return assumptions are missing for one or more holdings. No default stock return is substituted." : r.required?.required !== null && r.required?.required !== undefined ? `${formatPct(r.required.required, 1)} a year needed; ${formatPct(r.required.assumed, 1)} assumed from your entries.` : "The saved goals are not reachable within the model's tested return range."}</p>
        <div className="mt-4 border-t border-line pt-4"><p className="text-xs text-ivory-faint">Inflation assumption · {formatPct(state.inflation, 1)} a year</p><p className="num mt-2 text-sm text-ivory">{formatINR(r.after / (1 + state.inflation))} purchasing power after one year</p><p className="mt-1 text-xs text-ivory-faint">Assumes the what-if value stays flat; no future stock growth is invented.</p></div>
      </section>
    </div>
    <OverviewInsights key={state.activeId} metrics={r} comfort={state.comfortLimit} />
  </div>;
}
