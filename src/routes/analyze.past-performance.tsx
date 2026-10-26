import { pageMeta } from "@/lib/metadata";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPct } from "@/engine/format";
import { usablePortfolios } from "@/engine/investor";
import { stockHistoryStats } from "@/engine/stock-history";
import { mergeSeries } from "@/engine/price-upload";
import { getMonthlyHistory } from "@/lib/quotes.functions";
import { Badge } from "@/components/analyser/Badge";
import { Heatmap } from "@/components/analyser/charts";
import { useAnalyser } from "@/components/analyser/state";

export const Route = createFileRoute("/analyze/past-performance")({
  head: () => ({
    meta: pageMeta("Past Performance — Allocara Analyser", "Real price history of the stocks in your portfolio up to today, with yearly return, ups and downs, worst fall and how they moved together."),
  }),
  component: PastPerformance,
});

const LINE_COLORS = ["var(--emerald-bright)", "var(--status-careful)", "var(--ivory)", "var(--emerald)", "var(--status-problem)", "var(--ivory-dim)"];

function PastPerformance() {
  const { state, uploadedPrices } = useAnalyser();
  const portfolios = usablePortfolios(state);
  const active = portfolios.find((p) => p.id === state.activeId) ?? portfolios[0];
  const weights = useMemo(() => {
    const w: Record<string, number> = {};
    for (const h of active?.holdings ?? []) if (h.symbol && h.currentValue > 0) w[h.symbol] = (w[h.symbol] ?? 0) + h.currentValue;
    return w;
  }, [active]);
  const symbols = Object.keys(weights).sort();

  const q = useQuery({
    queryKey: ["monthly-history", symbols],
    queryFn: () => getMonthlyHistory({ data: { symbols } }),
    enabled: symbols.length > 0,
    staleTime: 6 * 60 * 60 * 1000,
  });
  const stats = useMemo(() => (q.data || uploadedPrices.length ? stockHistoryStats(mergeSeries(q.data ?? [], uploadedPrices), weights) : null), [q.data, uploadedPrices, weights]);

  const card = "rounded-xl border border-line bg-bg-1 p-4";
  if (!symbols.length) {
    return (
      <section className={card}>
        <h2 className="font-serif text-lg text-ivory">Past performance</h2>
        <p className="mt-2 text-sm text-ivory-dim">Add stocks from the stock list to your portfolio to see their real price history here.</p>
        <Link to="/account" className="mt-3 inline-block text-sm text-emerald-bright hover:underline">Add stocks in My Account</Link>
      </section>
    );
  }
  if (q.isLoading) return <section className={card}><p className="text-sm text-ivory-dim">Loading price history for {symbols.join(", ")}…</p></section>;
  if (!stats) return <section className={card}><p className="text-sm text-ivory-dim">Price history couldn’t be loaded right now. Please try again later.</p></section>;

  // Merge per-stock closes into rows, rebased to 100 at each stock's first month so lines are comparable.
  const rows = new Map<string, Record<string, number | string>>();
  for (const s of stats.perStock) {
    const base = s.points[0]!.close;
    for (const p of s.points) {
      const row = rows.get(p.date) ?? { date: p.date };
      row[s.symbol] = (p.close / base) * 100;
      rows.set(p.date, row);
    }
  }
  const chartData = [...rows.values()].sort((a, b) => String(a["date"]).localeCompare(String(b["date"])));
  const missing = symbols.filter((s) => !stats.labels.includes(s));

  return (
    <div className="space-y-6">
      <section className={card}>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-ivory">Your stocks, {chartData[0]?.["date"]} to today</h2>
          <Badge kind="historical" />
        </div>
        <p className="mt-1 text-xs text-ivory-faint">Monthly closing prices from NSE, each line starting at 100 so you can compare them. Past performance is not a forecast.</p>
        <div className="mt-3 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" stroke="var(--ivory-faint)" fontSize={10} minTickGap={40} />
              <YAxis stroke="var(--ivory-faint)" fontSize={10} width={40} />
              <Tooltip contentStyle={{ background: "var(--bg-2)", border: "1px solid var(--line)" }} formatter={(v: number) => v.toFixed(1)} />
              {stats.labels.map((s, i) => (
                <Line key={s} dataKey={s} dot={false} strokeWidth={2} stroke={LINE_COLORS[i % LINE_COLORS.length]} isAnimationActive={false} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          {stats.labels.map((s, i) => <span key={s} style={{ color: LINE_COLORS[i % LINE_COLORS.length] }}>● {s}</span>)}
        </div>
        {missing.length > 0 && <p className="mt-2 text-xs text-ivory-faint">No history available for: {missing.join(", ")}.</p>}
      </section>

      <section className={card}>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-ivory">The numbers</h2>
          <Badge kind="historical" />
        </div>
        <div className="num mt-3 grid gap-4 text-sm text-ivory sm:grid-cols-2 xl:grid-cols-4">
          <p>Yearly return (CAGR): <strong>{formatPct(stats.cagr, 1)}</strong></p>
          <p>Ups and downs (yearly): <strong>{formatPct(stats.annVol, 1)}</strong></p>
          <p>Worst past fall: <strong>{formatPct(stats.maxDrawdown, 1)}</strong></p>
          <p>Worst 12 months: <strong>{formatPct(stats.worst12m, 1)}</strong></p>
        </div>
        <p className="mt-2 text-xs text-ivory-faint">
          Your stocks combined by their current value, {stats.start} to {stats.end} ({stats.months} months), rebalanced monthly.
        </p>
      </section>

      <section className={card}>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-ivory">How your stocks actually moved together</h2>
          <Badge kind="historical" />
        </div>
        {stats.labels.length < 2 ? (
          <p className="mt-3 text-sm text-ivory-dim">Add at least two stocks to see how they move together.</p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto"><Heatmap corr={stats.corr} labels={stats.labels} /></div>
            <p className="mt-2 text-xs text-ivory-faint">Pairs with fewer than 12 shared months show 0.0 — treat those as unknown.</p>
          </>
        )}
      </section>
    </div>
  );
}
