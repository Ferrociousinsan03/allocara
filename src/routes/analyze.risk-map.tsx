import { pageMeta } from "@/lib/metadata";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { usablePortfolios } from "@/engine/investor";
import { holdingRisk } from "@/engine/holding-risk";
import { mergeSeries } from "@/engine/price-upload";
import { formatINR, formatPct } from "@/engine/format";
import { getMonthlyHistory } from "@/lib/quotes.functions";
import { Button } from "@/components/ui/button";
import { RiskPeriod } from "@/components/analyser/RiskPeriod";
import { useAnalyser } from "@/components/analyser/state";

export const Route = createFileRoute("/analyze/risk-map")({
  head: () => ({ meta: pageMeta("Stock Risk Map — Allocara", "Compare recorded stock values with risk measured from real monthly price history, in the full-history baseline and historical stress months, with private AI insights.") }),
  component: RiskMap,
});

function RiskMap() {
  const { state, uploadedPrices, uploadedPricesName } = useAnalyser();
  const portfolios = usablePortfolios(state);
  const selected = portfolios.find(p => p.id === state.activeId) ?? portfolios[0];
  const holdings = selected?.holdings ?? [];
  const symbols = [...new Set(holdings.filter(h => h.currentValue > 0 && h.symbol).map(h => h.symbol ?? ""))].sort();
  const q = useQuery({ queryKey: ["monthly-history", symbols], enabled: symbols.length > 0,
    queryFn: async () => {
      const results = await Promise.all(Array.from({ length: Math.ceil(symbols.length / 30) }, (_, i) => getMonthlyHistory({ data: { symbols: symbols.slice(i * 30, (i + 1) * 30) } })));
      return results.flat();
    }, staleTime: 6 * 60 * 60 * 1000 });
  const risk = useMemo(() => holdingRisk(holdings, mergeSeries(q.data ?? [], uploadedPrices)), [holdings, q.data, uploadedPrices]);
  const reason = !symbols.length ? "Add stocks with recorded values in My Account to measure risk." : risk.missing.length
    ? `At least 12 consecutive monthly returns are needed for every selected stock. Missing or insufficient history: ${risk.missing.join(", ")}.`
    : "At least 12 shared monthly returns are needed across your stocks. Upload more price history or refresh the data.";
  return <div>
    <div className="flex flex-wrap items-start justify-between gap-4 pb-6">
      <div><h2 className="font-serif text-2xl text-ivory">Where your stock risk sits</h2><p className="mt-2 text-sm text-ivory-dim">{selected?.name ?? "Your portfolio"} · {formatINR(risk.includedValue)} recorded stock value</p></div>
      <Button variant="outline" size="sm" disabled={q.isFetching || !symbols.length} onClick={() => void q.refetch()}><RefreshCw className={q.isFetching ? "animate-spin" : ""} />Refresh price history</Button>
    </div>
    <p className="pb-3 text-xs leading-relaxed text-ivory-faint">Source: NSE-listed stock history via Yahoo Finance{uploadedPricesName ? ` + your CSV (${uploadedPricesName}), with uploaded prices taking priority` : ""}. Monthly prices may include the current unfinished month. Risk is recalculated using today's recorded stock weights, not your historical allocation.</p>
    {risk.coverage < 1 && risk.total > 0 && <p className="mb-4 border-l-2 border-careful pl-3 text-sm text-careful">Stock portion only: {formatPct(risk.coverage, 1)} of recorded portfolio value. {risk.excluded.length ? `Not measured: ${risk.excluded.join(", ")}.` : ""} No risk figures are assumed for other investments.</p>}
    <RiskPeriod mode="normal" data={risk.normal} coverage={risk.coverage} loading={q.isLoading && !risk.normal} reason={reason} />
    <RiskPeriod mode="crisis" data={risk.crisis} coverage={risk.coverage} loading={q.isLoading && !risk.normal} reason={!risk.normal ? reason : `Only ${risk.crisisMonths} negative stress months are available. At least six are needed to estimate crisis risk; no fixed-rule substitute is shown.`} />
    <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-4 text-xs text-ivory-faint"><p>Educational tool, not financial advice. Historical risk and AI insights are not forecasts.</p><Link to="/analyze/assumptions" className="text-emerald-bright">Upload your price history</Link></div>
  </div>;
}
