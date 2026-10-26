import { pageMeta } from "@/lib/metadata";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { formatCompareDiff, formatCompareValue, type CompareRow } from "@/engine/compare";
import { holdingMetrics, selectHoldingComparison } from "@/engine/holding-compare";
import { useAnalyser } from "@/components/analyser/state";
import { listPortfolios } from "@/engine/investor";
import { Button } from "@/components/ui/button";
import { HoldingComparisonCharts } from "@/components/analyser/HoldingComparisonCharts";

export const Route = createFileRoute("/analyze/compare")({
  head: () => ({
    meta: pageMeta("Compare holdings — Allocara Analyser", "Compare two holdings within your portfolio using their recorded values, purchase costs and gains."),
  }),
  component: Compare,
});

function Compare() {
  const { state } = useAnalyser();
  const list = listPortfolios(state);
  const [portfolioId, setPortfolioId] = useState("");
  const [pickA, setPickA] = useState("");
  const [pickB, setPickB] = useState("");
  const { portfolio, first: a, second: b } = selectHoldingComparison(list, portfolioId || state.activeId || "", pickA, pickB);
  const holdings = portfolio?.holdings ?? [];
  const ma = a && portfolio ? holdingMetrics(a, portfolio) : null;
  const mb = b && portfolio ? holdingMetrics(b, portfolio) : null;
  const rows: CompareRow[] = ma && mb ? [
    { label: "Current holding value", a: ma.currentValue, b: mb.currentValue, unit: "rupees" },
    { label: "Amount invested", a: ma.investedAmount, b: mb.investedAmount, unit: "rupees" },
    { label: "Unrealised gain / loss", a: ma.gain, b: mb.gain, unit: "rupees" },
    { label: "Return on invested amount", a: ma.gainPct, b: mb.gainPct, unit: "pp" },
    { label: "Share of portfolio", a: ma.allocation, b: mb.allocation, unit: "pp" },
    { label: "Current price per unit", a: ma.currentPrice, b: mb.currentPrice, unit: "rupees" },
    { label: "Average purchase price per unit", a: ma.purchasePrice, b: mb.purchasePrice, unit: "rupees" },
  ] : [];
  const displayValue = (value: number | null, unit: CompareRow["unit"]) => value === null ? "Unavailable" : formatCompareValue(value, unit);

  const select = (value: string, set: (v: string) => void, exclude: string, label: string) => (
    <label className="block text-xs text-ivory-dim">{label}
      <select value={value} onChange={e => set(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-bg-2 px-2 py-1.5 text-sm text-ivory">
        {holdings.filter(h => h.id !== exclude).map(h => <option key={h.id} value={h.id}>{h.name || h.symbol || "Unnamed holding"}</option>)}
      </select>
    </label>
  );

  return (
    <div className="space-y-6">
      <section className="space-y-4 border-b border-line pb-6">
        <h1 className="font-serif text-2xl text-ivory">Compare holdings</h1>
        {list.length > 1 ? <label className="block text-xs text-ivory-dim">Portfolio
          <select value={portfolio?.id ?? ""} onChange={e => { setPortfolioId(e.target.value); setPickA(""); setPickB(""); }} className="mt-1 w-full rounded-md border border-line bg-bg-2 px-2 py-1.5 text-sm text-ivory">
            {list.map(p => <option key={p.id} value={p.id}>{p.name || "Untitled portfolio"}</option>)}
          </select>
        </label> : <p className="text-sm text-ivory-dim">{portfolio?.name || "No portfolio yet"}</p>}
        {a && b && <div className="grid gap-4 sm:grid-cols-2">
          {select(a.id, id => { setPickA(id); setPickB(b.id); }, b.id, "Compare holding")}
          {select(b.id, id => { setPickB(id); setPickA(a.id); }, a.id, "Against holding")}
        </div>}
      </section>
      {!a || !b ? <section className="py-4">
        <h2 className="font-serif text-xl text-ivory">Add another holding to compare</h2>
        <p className="mt-3 text-muted-foreground">This portfolio has {holdings.length} holding{holdings.length === 1 ? "" : "s"}. Comparison needs at least two holdings in the same portfolio.</p>
        <Button asChild className="mt-5"><Link to="/account">Add holdings</Link></Button>
      </section> : <section>
          <h2 className="break-words font-serif text-lg text-ivory">{a.name} vs {b.name}</h2>
        {ma && mb && <HoldingComparisonCharts first={{ name: a.name, metrics: ma }} second={{ name: b.name, metrics: mb }} />}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ivory-faint">
                <th className="py-2 pr-4 font-medium">Measure</th>
                <th className="py-2 pr-4 text-right font-medium">{a.name}</th>
                <th className="py-2 pr-4 text-right font-medium">{b.name}</th>
                <th className="py-2 text-right font-medium">Difference (against − compare)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-line/50 text-ivory">
                  <td className="py-2 pr-4 text-ivory-dim">{row.label}</td>
                  <td className="num py-2 pr-4 text-right">{displayValue(row.a, row.unit)}</td>
                  <td className="num py-2 pr-4 text-right">{displayValue(row.b, row.unit)}</td>
                  <td className="num py-2 text-right">{formatCompareDiff(row.a, row.b, row.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-ivory-faint">Based on saved holding values and purchase costs. Excludes realised gains, dividends, taxes and fees; not an annualised return.</p>
      </section>}
    </div>
  );
}
