import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { formatPct } from "@/engine/format";
import { usablePortfolios } from "@/engine/investor";
import { STOCKS } from "@/engine/stocks";
import { mergeSeries, parsePriceCsv, seriesFreshness, seriesReturn } from "@/engine/price-upload";
import { getMonthlyHistory } from "@/lib/quotes.functions";
import { Badge } from "@/components/analyser/Badge";
import { PortfolioLive } from "@/components/analyser/PortfolioLive";
import { useAnalyser } from "@/components/analyser/state";

const card = "rounded-xl border border-line bg-bg-1 p-4";

function useUserStocks() {
  const { state } = useAnalyser();
  const portfolios = usablePortfolios(state);
  const active = portfolios.find((p) => p.id === state.activeId) ?? portfolios[0];
  return useMemo(() => {
    const m = new Map<string, number>();
    for (const h of active?.holdings ?? []) if (h.symbol) m.set(h.symbol, (m.get(h.symbol) ?? 0) + (h.currentValue || 0));
    return m;
  }, [active]);
}

export function StockReturns() {
  const { uploadedPrices, stockReturnOverrides: ov, setStockReturnOverride } = useAnalyser();
  const stocks = useUserStocks();
  const symbols = [...stocks.keys()].sort();
  const total = [...stocks.values()].reduce((a, b) => a + b, 0);
  const q = useQuery({
    queryKey: ["monthly-history", symbols],
    queryFn: () => getMonthlyHistory({ data: { symbols } }),
    enabled: symbols.length > 0,
    staleTime: 6 * 60 * 60 * 1000,
  });
  const rows = useMemo(() => {
    const merged = mergeSeries(q.data ?? [], uploadedPrices.filter((u) => stocks.has(u.symbol)));
    return symbols.map((sym) => {
      const s = merged.find((x) => x.symbol === sym);
      const uploaded = uploadedPrices.some((u) => u.symbol === sym);
      return { sym, name: STOCKS.find((x) => x.symbol === sym)?.name ?? sym, weight: total > 0 ? (stocks.get(sym) ?? 0) / total : null, r: s ? seriesReturn(s) : null, fresh: s ? seriesFreshness(s) : null, uploaded };
    });
  }, [q.data, uploadedPrices, symbols.join(), total]);
  const used = (x: (typeof rows)[number]) => ov[x.sym] ?? x.r?.cagr ?? null;
  const withR = rows.filter((x) => used(x) !== null && x.weight);
  const wsum = withR.reduce((a, x) => a + x.weight!, 0);
  const blended = wsum > 0 ? withR.reduce((a, x) => a + x.weight! * used(x)!, 0) / wsum : null;
  const hist = rows.filter((x) => x.r && x.weight);
  const hsum = hist.reduce((a, x) => a + x.weight!, 0);
  const histBlended = hsum > 0 ? hist.reduce((a, x) => a + x.weight! * x.r!.cagr, 0) / hsum : null;
  const anyOverride = rows.some((x) => ov[x.sym] !== undefined);

  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-ivory">Expected yearly return — your stocks</h2>
        <Badge kind="historical" />
      </div>
      <p className="mt-1 text-xs text-ivory-faint">Based on each stock’s own past yearly growth. Past returns are not forecasts.</p>
      {!symbols.length ? (
        <div className="mt-4 rounded-lg border border-dashed border-line p-6 text-center">
          <p className="text-sm text-ivory-dim">Add stocks to your portfolio to see their yearly returns here.</p>
          <Link to="/account" className="mt-2 inline-block text-sm text-emerald-bright hover:underline">Add stocks in My Account</Link>
        </div>
      ) : (
        <>
          <div className="mt-4"><PortfolioLive /></div>
          {blended !== null && (
            <div className="mt-4 flex flex-wrap items-end gap-6 rounded-lg border border-line bg-bg-2 p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-ivory-faint">Your stocks, weighted by value</p>
                <p className={`num mt-1 font-serif text-3xl ${blended >= 0 ? "text-emerald-bright" : "text-problem"}`}>{formatPct(blended, 1)}<span className="text-sm text-ivory-faint"> / yr</span></p>
              </div>
              {anyOverride && histBlended !== null && <p className="text-xs text-ivory-dim">History alone: <span className="num text-ivory">{formatPct(histBlended, 1)}</span></p>}
              <p className="text-xs text-ivory-faint">{withR.length} of {symbols.length} stocks included{anyOverride ? " · includes your what-if values" : ""}</p>
            </div>
          )}
          {q.isLoading && <p className="mt-3 text-sm text-ivory-dim">Loading price history…</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {rows.map((x) => (
              <div key={x.sym} className="rounded-lg border border-line bg-bg-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ivory">{x.name}</p>
                    <p className="text-xs text-ivory-faint">{x.sym}{x.weight !== null && ` · ${formatPct(x.weight, 0)} of portfolio`}{x.uploaded && " · your CSV"}</p>
                  </div>
                  <p className={`num font-serif text-xl ${x.r ? (x.r.cagr >= 0 ? "text-emerald-bright" : "text-problem") : "text-ivory-faint"}`}>{x.r ? formatPct(x.r.cagr, 1) : "—"}</p>
                </div>
                {x.r ? (
                  <div className="mt-2 flex justify-between text-xs text-ivory-dim">
                    <span>Ups and downs <span className="num text-ivory">{formatPct(x.r.vol, 1)}</span></span>
                    <span>{(x.r.months / 12).toFixed(1)} yrs of data</span>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-ivory-faint">{q.isLoading ? "Loading…" : "Not enough history (need 12+ months)."}</p>
                )}
                <div className="mt-2 flex items-center gap-2 text-xs text-ivory-dim">
                  <label htmlFor={`wi-${x.sym}`}>What-if return</label>
                  <input id={`wi-${x.sym}`} type="number" step={0.5}
                    value={ov[x.sym] !== undefined ? Math.round(ov[x.sym]! * 1000) / 10 : ""}
                    placeholder={x.r ? String(Math.round(x.r.cagr * 1000) / 10) : "%"}
                    onChange={(e) => { const v = e.target.value; setStockReturnOverride(x.sym, v === "" || !Number.isFinite(Number(v)) ? null : Number(v) / 100); }}
                    className="num w-20 rounded border border-line bg-bg-1 px-2 py-0.5 text-right text-ivory" />
                  <span>%/yr</span>
                  {ov[x.sym] !== undefined && <button type="button" onClick={() => setStockReturnOverride(x.sym, null)} className="text-emerald-bright hover:underline">reset</button>}
                </div>
                {x.r && x.weight !== null && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded bg-bg-1"><div className="h-full bg-emerald" style={{ width: `${Math.max(2, x.weight * 100)}%` }} /></div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6">
            <h3 className="font-serif text-base text-ivory">Data freshness</h3>
            <p className="mt-1 text-xs text-ivory-faint">When each stock’s prices start and end, and any months missing in between.</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-line text-left text-xs text-ivory-faint">
                  <th className="py-2 pr-4 font-medium">Stock</th><th className="py-2 pr-4 font-medium">From</th><th className="py-2 pr-4 font-medium">Latest</th><th className="py-2 pr-4 font-medium">Missing months</th><th className="py-2 font-medium">Source</th>
                </tr></thead>
                <tbody>
                  {rows.map((x) => {
                    const stale = x.fresh ? x.fresh.last < staleCutoff() : true;
                    return (
                      <tr key={x.sym} className="border-b border-line/50">
                        <td className="py-2 pr-4 text-ivory">{x.sym}</td>
                        <td className="num py-2 pr-4 text-ivory-dim">{x.fresh?.first ?? "—"}</td>
                        <td className={`num py-2 pr-4 ${stale ? "text-problem" : "text-ivory-dim"}`}>{x.fresh?.last ?? (q.isLoading ? "Loading…" : "No data")}{x.fresh && stale ? " (out of date)" : ""}</td>
                        <td className="py-2 pr-4 text-ivory-dim">{x.fresh ? (x.fresh.missing.length ? `${x.fresh.missing.length} (${x.fresh.missing.slice(0, 3).join(", ")}${x.fresh.missing.length > 3 ? "…" : ""})` : "None") : "—"}</td>
                        <td className="py-2 text-xs text-ivory-faint">{x.uploaded ? "NSE + your CSV" : "NSE"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function staleCutoff() {
  const d = new Date(); d.setMonth(d.getMonth() - 2);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function DataSources() {
  const { uploadedPrices, uploadedPricesName, setUploadedPrices } = useAnalyser();
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try { setUploadedPrices(parsePriceCsv(await f.text()), f.name); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not read this file."); }
    if (input.current) input.current.value = "";
  };
  const sample = "date,RELIANCE,TCS\n2024-01,2600,3800\n2024-02,2900,4100\n";
  return (
    <section className={card}>
      <h2 className="font-serif text-lg text-ivory">Data sources</h2>
      <p className="mt-2 text-sm text-ivory-dim">Stock prices come from NSE monthly closes. Add your own price file to fill gaps or extend history — your prices take priority for matching months and are used across Past performance and the returns above.</p>
      <div className="mt-4 rounded-lg border border-dashed border-line bg-bg-2 p-4">
        <p className="text-sm text-ivory">Upload your price CSV</p>
        <p className="mt-1 text-xs text-ivory-faint">A <code>date</code> column (YYYY-MM or YYYY-MM-DD) and one column per stock symbol with closing prices.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-md bg-emerald px-3 py-1.5 text-sm text-ivory hover:bg-emerald-bright">
            Choose CSV
            <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(sample)}`} download="allocara-prices-sample.csv" className="text-xs text-emerald-bright hover:underline">Download example</a>
          {uploadedPricesName && (
            <>
              <span className="text-xs text-ivory-dim">Using {uploadedPricesName} ({uploadedPrices.map((s) => s.symbol).join(", ")})</span>
              <button type="button" onClick={() => setUploadedPrices([])} className="text-xs text-problem hover:underline">Remove</button>
            </>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-problem">{error}</p>}
        <p className="mt-2 text-xs text-ivory-faint">Your file stays in this browser session and is never saved or shared.</p>
      </div>
    </section>
  );
}
