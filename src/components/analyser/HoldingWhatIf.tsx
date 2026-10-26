import { assetScenarioReturn } from "@/engine/core";
import { usablePortfolios } from "@/engine/investor";
import { formatINR, formatPct } from "@/engine/format";
import { Badge } from "./Badge";
import { HBars } from "./charts";
import { useAnalyser } from "./state";

/** Per-holding what-if using the user's own holdings and a user-set market move. */
export function HoldingWhatIf() {
  const { state, update, scenario, assets } = useAnalyser();
  const portfolios = usablePortfolios(state);
  const active = portfolios.find((p) => p.id === state.activeId) ?? portfolios[0];
  const holdings = (active?.holdings ?? []).filter((h) => h.currentValue > 0);
  const total = holdings.reduce((s, h) => s + h.currentValue, 0);
  const rows = holdings.map((h) => {
    const a = assets.find((x) => x.id === h.asset);
    const r = a ? assetScenarioReturn(a, scenario) : 0;
    return { label: h.symbol ?? h.name, rupees: h.currentValue * r, pct: total > 0 ? (h.currentValue / total) * r : 0 };
  });
  const totalRupees = rows.reduce((s, r) => s + r.rupees, 0);

  return (
    <section className="rounded-xl border border-line bg-bg-1 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg text-ivory">What each holding does in this what-if</h2>
        <Badge kind="hypothetical" />
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <Move label="Share-market move" value={state.equityMove} min={-60} max={20} unit="%" onChange={(v) => update({ equityMove: v, presetId: "custom" })} />
        <Move label="Interest-rate change" value={state.rateChangeBps} min={-300} max={300} step={25} unit=" bps" onChange={(v) => update({ rateChangeBps: v, presetId: "custom" })} />
      </div>
      {holdings.length === 0 ? (
        <p className="mt-4 text-sm text-ivory-dim">Add holdings in My Account to see their effect.</p>
      ) : (
        <>
          <p className="num mt-4 text-sm text-ivory">
            Your {formatINR(total)} portfolio would change by <span className={totalRupees >= 0 ? "text-emerald-bright" : "text-problem"}>{formatINR(totalRupees)}</span>.
          </p>
          <div className="mt-4 grid gap-6 xl:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-medium text-ivory-faint">Effect on the portfolio (percentage points)</h3>
              <HBars items={rows.map((r) => ({ label: r.label, value: r.pct }))} format={(v) => formatPct(v, 1)} />
            </div>
            <div>
              <h3 className="mb-2 text-xs font-medium text-ivory-faint">Effect in rupees</h3>
              <HBars items={rows.map((r) => ({ label: r.label, value: r.rupees }))} format={(v) => formatINR(v)} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Move({ label, value, min, max, step = 1, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs text-ivory-dim">
      <span className="flex justify-between">{label}<span className="num text-ivory">{value}{unit}</span></span>
      <input type="range" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-emerald" />
    </label>
  );
}
