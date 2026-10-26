import { useMemo, useState } from "react";
import { assetScenarioReturn } from "@/engine/core";
import { usablePortfolios } from "@/engine/investor";
import { sellPlan } from "@/engine/sell-plan";
import { formatINR, formatPct } from "@/engine/format";
import { Badge } from "./Badge";
import { useAnalyser } from "./state";

const signed = (x: number) => `${x >= 0 ? "+" : "-"}${formatINR(Math.abs(x))}`;
const tone = (x: number) => (x >= 0 ? "text-emerald-bright" : "text-problem");

export function SellPlanner() {
  const { state, scenario, assets } = useAnalyser();
  const portfolios = usablePortfolios(state);
  const active = portfolios.find((p) => p.id === state.activeId) ?? portfolios[0];
  const holdings = (active?.holdings ?? []).filter((h) => h.units > 0 && h.currentValue > 0);
  const [sell, setSell] = useState<Record<string, number>>({});
  const [cashNeed, setCashNeed] = useState<number>(state.cashNeed);
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(1);
  const [useWhatIf, setUseWhatIf] = useState(false);

  const plan = useMemo(() => {
    const moves: Record<string, number> = {};
    if (useWhatIf) for (const h of holdings) {
      const a = assets.find((x) => x.id === h.asset);
      if (a) moves[h.id] = assetScenarioReturn(a, scenario);
    }
    return sellPlan(holdings, sell, { cashNeed, reinvestRate: rate / 100, years, moves });
  }, [holdings, sell, cashNeed, rate, years, useWhatIf, scenario, assets]);

  const coverage = cashNeed > 0 ? Math.min(1, plan.proceeds / cashNeed) : null;

  return (
    <section className="rounded-xl border border-line bg-bg-1 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg text-ivory">Plan a sale</h2>
          <p className="text-xs text-ivory-faint">Choose what to sell from {active?.name ?? "your portfolio"} and see the cash, profit and risk.</p>
        </div>
        <Badge kind="hypothetical" />
      </div>

      {holdings.length === 0 ? (
        <p className="mt-4 text-sm text-ivory-dim">Add holdings with units in My Account to plan a sale.</p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <Field label="Cash you need (₹)" value={cashNeed} onChange={setCashNeed} />
            <Field label="Leftover grows at (%/yr)" value={rate} onChange={setRate} step={0.5} />
            <Field label="For (years)" value={years} onChange={setYears} />
            <label className="flex items-end gap-2 pb-2 text-xs text-ivory-dim">
              <input type="checkbox" checked={useWhatIf} onChange={(e) => setUseWhatIf(e.target.checked)} className="accent-[var(--emerald)]" />
              Sell at what-if prices
            </label>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead className="bg-bg-2 text-left text-xs text-ivory-faint">
                <tr>
                  <th className="p-2">Holding</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Owned</th>
                  <th className="p-2">Units to sell</th><th className="p-2 text-right">You get</th><th className="p-2 text-right">Profit / loss</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => {
                  const line = plan.lines.find((l) => l.id === h.id);
                  const price = (useWhatIf && line ? line.price : h.currentValue / h.units);
                  const units = sell[h.id] ?? 0;
                  return (
                    <tr key={h.id} className="border-t border-line">
                      <td className="p-2 text-ivory">{h.symbol ?? h.name}</td>
                      <td className="num p-2 text-right text-ivory-dim">{formatINR(price, { compact: false })}</td>
                      <td className="num p-2 text-right text-ivory-dim">{h.units}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <input type="range" min={0} max={h.units} step={h.units >= 1 ? 1 : h.units / 100} value={units}
                            onChange={(e) => setSell((s) => ({ ...s, [h.id]: Number(e.target.value) }))} className="w-28 accent-[var(--emerald)]" />
                          <input type="number" min={0} max={h.units} value={units}
                            onChange={(e) => setSell((s) => ({ ...s, [h.id]: Math.min(h.units, Math.max(0, Number(e.target.value) || 0)) }))}
                            className="num w-16 rounded border border-line bg-bg-2 px-1 py-0.5 text-ivory" />
                          <button type="button" onClick={() => setSell((s) => ({ ...s, [h.id]: h.units }))} className="text-xs text-emerald-bright hover:underline">All</button>
                        </div>
                      </td>
                      <td className="num p-2 text-right text-ivory">{line ? formatINR(line.proceeds) : "—"}</td>
                      <td className={`num p-2 text-right ${line ? tone(line.profit) : "text-ivory-faint"}`}>{line ? signed(line.profit) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Cash you receive" value={formatINR(plan.proceeds)} />
            <Stat label="Profit on sale" value={signed(plan.profit)} className={tone(plan.profit)} />
            <Stat label={plan.shortfall > 0 ? "Still short" : "Leftover after need"} value={formatINR(plan.shortfall > 0 ? plan.shortfall : plan.leftover)} className={plan.shortfall > 0 ? "text-problem" : "text-ivory"} />
            <Stat label={`Leftover earns in ${years} yr`} value={signed(plan.leftoverGrowth)} className="text-emerald-bright" />
          </div>

          {coverage !== null && (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-ivory-faint"><span>Cash need covered</span><span className="num">{formatPct(coverage, 0)}</span></div>
              <div className="h-2 rounded-full bg-bg-2"><div className="h-2 rounded-full bg-emerald" style={{ width: `${coverage * 100}%` }} /></div>
            </div>
          )}

          <div className="mt-4 rounded-lg border border-line bg-bg-2/50 p-3">
            <h3 className="text-xs font-medium text-ivory-faint">Risks of this sale</h3>
            <p className="num mt-1 text-xs text-ivory-dim">
              Left invested {formatINR(plan.remainingValue)} · largest holding {formatPct(plan.largestShareBefore, 0)} → {formatPct(plan.largestShareAfter, 0)}
            </p>
            {plan.risks.length === 0 ? (
              <p className="mt-2 text-sm text-ivory-dim">{plan.lines.length ? "No major risks flagged." : "Pick units to sell to see risks."}</p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm">
                {plan.risks.map((r, i) => (
                  <li key={i} className="flex gap-2 text-ivory">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${r.level === "high" ? "bg-problem" : r.level === "medium" ? "bg-careful" : "bg-emerald"}`} />
                    {r.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Field({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="text-xs text-ivory-faint">
      {label}
      <input type="number" min={0} step={step} value={value} onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="num mt-1 w-full rounded border border-line bg-bg-2 px-2 py-1.5 text-sm text-ivory" />
    </label>
  );
}

function Stat({ label, value, className = "text-ivory" }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-lg border border-line bg-bg-2/50 p-3">
      <div className="text-xs text-ivory-faint">{label}</div>
      <div className={`num mt-1 font-serif text-xl ${className}`}>{value}</div>
    </div>
  );
}
