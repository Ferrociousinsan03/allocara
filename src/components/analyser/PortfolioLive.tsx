import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatINR } from "@/engine/format";
import { usablePortfolios } from "@/engine/investor";
import { STOCKS } from "@/engine/stocks";
import { historicalOdds, portfolioValueSeries } from "@/engine/stock-outlook";
import { getMonthlyHistory, getPriceHistory, getQuotes, RANGES, type RangeKey } from "@/lib/quotes.functions";
import { useAnalyser } from "@/components/analyser/state";

const pct = (x: number) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(2)}%`;
const signed = (x: number) => `${x >= 0 ? "+" : "-"}${formatINR(Math.abs(x))}`;
const tone = (x: number) => (x >= 0 ? "text-emerald-bright" : "text-problem");

function useStockHoldings() {
  const { state } = useAnalyser();
  const portfolios = usablePortfolios(state);
  const active = portfolios.find((p) => p.id === state.activeId) ?? portfolios[0];
  return useMemo(() => {
    const m = new Map<string, { units: number; invested: number }>();
    for (const h of active?.holdings ?? []) if (h.symbol && h.units > 0) {
      const c = m.get(h.symbol) ?? { units: 0, invested: 0 };
      m.set(h.symbol, { units: c.units + h.units, invested: c.invested + (h.investedAmount || 0) });
    }
    return { name: active?.name ?? "Portfolio", m };
  }, [active]);
}

export function PortfolioLive() {
  const { name, m } = useStockHoldings();
  const symbols = [...m.keys()].sort();
  const units = Object.fromEntries([...m].map(([k, v]) => [k, v.units]));
  const [range, setRange] = useState<RangeKey>("1M");
  const quotes = useQuery({ queryKey: ["quotes", symbols], queryFn: () => getQuotes({ data: { symbols } }), enabled: symbols.length > 0, refetchInterval: 60_000 });
  const hist = useQuery({ queryKey: ["price-history", symbols, range], queryFn: () => getPriceHistory({ data: { symbols, range } }), enabled: symbols.length > 0, staleTime: 60_000 });
  const series = useMemo(() => portfolioValueSeries(hist.data ?? [], units), [hist.data, symbols.join()]);
  if (!symbols.length) return null;

  const rows = symbols.map((sym) => {
    const q = quotes.data?.find((x) => x.symbol === sym);
    const h = m.get(sym)!;
    const value = q ? q.price * h.units : null;
    const day = q?.previousClose ? (q.price - q.previousClose) * h.units : null;
    const dayPct = q?.previousClose ? q.price / q.previousClose - 1 : null;
    const gain = value !== null && h.invested > 0 ? value - h.invested : null;
    return { sym, name: STOCKS.find((s) => s.symbol === sym)?.name ?? sym, price: q?.price ?? null, units: h.units, value, day, dayPct, gain, gainPct: gain !== null ? gain / h.invested : null };
  });
  const total = rows.every((r) => r.value !== null) ? rows.reduce((a, r) => a + r.value!, 0) : null;
  const dayTot = rows.every((r) => r.day !== null) ? rows.reduce((a, r) => a + r.day!, 0) : null;
  const prevTot = total !== null && dayTot !== null ? total - dayTot : null;
  const first = series[0]?.value, last = series.at(-1)?.value;
  const rangeChange = first && last ? last / first - 1 : null;
  const intraday = range === "1D" || range === "5D";
  const fmtT = (t: number) => new Date(t).toLocaleString("en-IN", intraday ? { hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short", year: range === "5Y" || range === "MAX" ? "2-digit" : undefined });
  const latestTime = quotes.data?.reduce((a, q) => Math.max(a, q.time), 0);

  return (
    <div>
      <p className="text-sm text-ivory-dim">{name}</p>
      <div className="mt-1 flex flex-wrap items-baseline gap-3">
        <p className="num font-serif text-3xl text-ivory">{total !== null ? formatINR(total) : quotes.isLoading ? "Loading…" : "—"}</p>
        {dayTot !== null && prevTot ? <p className={`num text-base ${tone(dayTot)}`}>{pct(dayTot / prevTot)} ({signed(dayTot)}) Today</p> : null}
      </div>
      {latestTime ? <p className="text-xs text-ivory-faint">{new Date(latestTime).toLocaleString("en-IN")} · INR · NSE</p> : null}

      <div className="mt-4 rounded-lg border border-line bg-bg-2 p-3">
        {rangeChange !== null && <p className={`num mb-1 text-xs ${tone(rangeChange)}`}>{pct(rangeChange)} over {range}</p>}
        <div className="h-64">
          {hist.isLoading ? <p className="pt-24 text-center text-sm text-ivory-dim">Loading chart…</p> : series.length < 2 ? <p className="pt-24 text-center text-sm text-ivory-dim">No price data for this range.</p> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={fmtT} stroke="var(--ivory-faint)" fontSize={10} minTickGap={50} />
                <YAxis domain={["auto", "auto"]} tickFormatter={(v) => formatINR(v, { compact: true })} stroke="var(--ivory-faint)" fontSize={10} width={60} />
                <Tooltip labelFormatter={(t) => new Date(Number(t)).toLocaleString("en-IN")} formatter={(v) => [formatINR(Number(v)), "Value"]} contentStyle={{ background: "var(--bg-1)", border: "1px solid var(--line)", fontSize: 12 }} />
                {range === "1D" && prevTot ? <ReferenceLine y={prevTot} stroke="var(--ivory-faint)" strokeDasharray="2 4" label={{ value: `Prev. close ${formatINR(prevTot)}`, fill: "var(--ivory-dim)", fontSize: 10, position: "insideTopRight" }} /> : null}
                <Line dataKey="value" stroke={rangeChange !== null && rangeChange < 0 ? "var(--status-problem)" : "var(--emerald-bright)"} dot={false} strokeWidth={1.75} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(Object.keys(RANGES) as RangeKey[]).map((r) => (
            <button key={r} type="button" onClick={() => setRange(r)} className={`rounded-md px-3 py-1 text-xs ${r === range ? "bg-bg-1 text-ivory" : "text-ivory-faint hover:text-ivory"}`}>{r}</button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-line text-left text-xs text-ivory-faint">
            <th className="py-2 pr-4 font-medium">Stock</th><th className="py-2 pr-4 text-right font-medium">Price</th><th className="py-2 pr-4 text-right font-medium">Quantity</th>
            <th className="py-2 pr-4 text-right font-medium">Day change</th><th className="py-2 pr-4 text-right font-medium">Total gain/loss</th><th className="py-2 text-right font-medium">Market value</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sym} className="border-b border-line/50">
                <td className="py-2 pr-4"><p className="font-medium text-ivory">{r.sym}</p><p className="text-xs text-ivory-faint">{r.name}</p></td>
                <td className="num py-2 pr-4 text-right text-ivory">{r.price !== null ? formatINR(r.price) : "—"}</td>
                <td className="num py-2 pr-4 text-right text-ivory">{r.units}</td>
                <td className={`num py-2 pr-4 text-right ${r.day !== null ? tone(r.day) : "text-ivory-faint"}`}>{r.day !== null ? <>{signed(r.day)}<br /><span className="text-xs">({pct(r.dayPct!)})</span></> : "—"}</td>
                <td className={`num py-2 pr-4 text-right ${r.gain !== null ? tone(r.gain) : "text-ivory-faint"}`}>{r.gain !== null ? <>{signed(r.gain)}<br /><span className="text-xs">({pct(r.gainPct!)})</span></> : "—"}</td>
                <td className="num py-2 text-right text-ivory">{r.value !== null ? formatINR(r.value) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StockOutlook() {
  const { m } = useStockHoldings();
  const symbols = [...m.keys()].sort();
  const q = useQuery({ queryKey: ["monthly-history", symbols], queryFn: () => getMonthlyHistory({ data: { symbols } }), enabled: symbols.length > 0, staleTime: 6 * 60 * 60 * 1000 });
  const cards = useMemo(() => (q.data ?? []).flatMap((s) => (historicalOdds(s.symbol, s.closes) ?? []).map((o) => ({ ...o, key: `${s.symbol}-${o.id}` }))), [q.data]);
  if (!symbols.length) return null;
  return (
    <section className="rounded-xl border border-line bg-bg-1 p-4">
      <h2 className="font-serif text-lg text-ivory">Rise or fall — what history says</h2>
      <p className="mt-1 text-xs text-ivory-faint">Each chance is how often this happened across every past window of the stock’s own monthly prices (up to 10 years). It is a historical frequency, not a prediction or advice.</p>
      {q.isLoading ? <p className="mt-3 text-sm text-ivory-dim">Loading history…</p> : !cards.length ? <p className="mt-3 text-sm text-ivory-dim">Needs at least two years of price history.</p> : (
        <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2">
          {cards.map((c) => (
            <div key={c.key} className="flex w-56 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-line bg-bg-2">
              <div className="flex-1 p-4">
                <p className="line-clamp-3 text-sm font-medium text-ivory">{c.question}</p>
                <p className="mt-4 text-xs text-ivory-faint">From past NSE prices</p>
                <p className={`num text-lg ${c.chance >= 0.5 ? "text-emerald-bright" : "text-problem"}`}>{(c.chance * 100).toFixed(1)}% chance</p>
                <p className="text-xs text-ivory-faint">{c.samples} past periods</p>
              </div>
              <div className="h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={c.spark.map((v, i) => ({ i, v }))} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
                    <YAxis hide domain={[0, 1]} />
                    <Area dataKey="v" type="stepAfter" stroke="var(--emerald-bright)" fill="var(--emerald)" fillOpacity={0.25} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
