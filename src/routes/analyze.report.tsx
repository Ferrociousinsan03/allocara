import { pageMeta } from "@/lib/metadata";
// One-page printable report (spec section 12): headline results, conflicts,
// key charts, assumptions and the disclaimer. Print stylesheet flips it light.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Printer } from "lucide-react";
import { forcedSelling, liquidity, portfolioImpact } from "@/engine/core";
import { detectConflicts, type Status } from "@/engine/conflicts";
import { goalChanceRange, requiredReturn } from "@/engine/goals";
import { covariance, riskContribution } from "@/engine/risk";
import { formatINR, formatPct } from "@/engine/format";
import { PRESETS } from "@/engine/presets";
import { Badge, StatusPill } from "@/components/analyser/Badge";
import { HBars, PairBars } from "@/components/analyser/charts";
import { useAnalyser } from "@/components/analyser/state";

export const Route = createFileRoute("/analyze/report")({
  head: () => ({
    meta: pageMeta("One-page report — Allocara", "A printable one-page summary: headline results, conflicts, key charts, assumptions and the disclaimer."),
  }),
  component: Report,
});

function Row({ label, value, status }: { label: string; value: string; status?: Status }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2">
      <span className="text-sm text-ivory-dim">{label}</span>
      <span className="flex items-center gap-2">
        {status && <StatusPill status={status} />}
        <span className="num text-sm font-semibold text-ivory">{value}</span>
      </span>
    </div>
  );
}

function Report() {
  const { state, scenario, weights, assets } = useAnalyser();

  const r = useMemo(() => {
    const impact = portfolioImpact(weights, state.value, scenario, assets);
    const liq = liquidity(weights, state.value, scenario, state.cashNeed, assets);
    const fs = forcedSelling(weights, state.value, scenario, state.cashNeed, assets);
    const sim = {
      value: state.value,
      goals: state.goals,
      cashNeed: state.cashNeed,
      monthlySaving: state.monthlySaving,
      inflation: state.inflation,
      scenario,
      seed: 7,
      paths: 400,
      todaysMoney: state.todaysMoney,
      assets,
    };
    const range = state.goals.length ? goalChanceRange({ ...sim, weights }) : [];
    const req = requiredReturn({ ...sim, weights });
    const conflicts = detectConflicts({
      weights,
      value: state.value,
      scenario,
      cashNeed: state.cashNeed,
      goals: state.goals,
      comfortLimit: state.comfortLimit,
      goalChance: range.map((g, i) => ({ ...g, name: state.goals[i]?.name })),
      requiredReturn: req.required,
      assumedReturn: req.assumed,
    });
    const crisis = riskContribution(weights, covariance("crisis", { method: "fixed" }));
    return { impact, liq, fs, range, req, conflicts, crisis };
  }, [weights, scenario, state, assets]);

  const loss = -r.impact.lossPct;
  const presetName = PRESETS.find((p) => p.id === state.presetId)?.name ?? "Custom what-if";
  const cashStatus: Status = r.liq.coverage === null ? "OK" : r.liq.coverage >= 1.3 ? "OK" : r.liq.coverage >= 1 ? "Careful" : "Problem";
  const lossStatus: Status = loss > state.comfortLimit ? "Problem" : loss > 0.75 * state.comfortLimit ? "Careful" : "OK";
  const w = state.active === "A" ? state.weightsA : state.weightsB;

  return (
    <div className="report-page mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-ivory">Allocara report — portfolio {state.active}</h1>
          <p className="mt-1 text-xs text-ivory-faint">
            What-if: {presetName} (stylised, inspired by past events — not an exact replay) · {new Date().toLocaleDateString("en-IN")}
          </p>
        </div>
        <div className="flex gap-2 no-print">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-md bg-emerald px-3 py-1.5 text-xs font-semibold text-bg-0 hover:bg-emerald-deep"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden /> Print
          </button>
          <Link to="/analyze/overview" className="rounded-md border border-line px-3 py-1.5 text-xs text-ivory-dim hover:text-ivory">
            Back to analyser
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-line bg-bg-1 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-ivory">Headline results</h2>
          <Badge kind="hypothetical" />
        </div>
        <div className="mt-2">
          <Row label={`Value after the what-if (from ${formatINR(state.value)})`} value={formatINR(r.impact.valueAfter)} />
          <Row label={`Fall vs your ${formatPct(state.comfortLimit, 0)} comfort limit`} value={formatPct(loss, 1)} status={lossStatus} />
          <Row
            label={state.cashNeed > 0 ? `Cash cover for ${formatINR(state.cashNeed)} needed in 12 months` : "Cash need"}
            value={r.liq.coverage === null ? "none set" : `${r.liq.coverage.toFixed(1)}x`}
            status={cashStatus}
          />
          {r.range.map((g, i) => (
            <Row key={i} label={`Chance of reaching "${state.goals[i]?.name}"`} value={`${formatPct(g.lo, 0)}–${formatPct(g.hi, 0)}`} />
          ))}
          {r.req.required !== null && (
            <Row label="Return needed for goals vs assumed" value={`${formatPct(r.req.required, 1)} vs ${formatPct(r.req.assumed, 1)}`} />
          )}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-bg-1 p-4">
        <h2 className="font-serif text-lg text-ivory">Conflicts and trade-offs</h2>
        <ul className="mt-3 space-y-2">
          {r.conflicts.map((c) => (
            <li key={c.id} className="flex items-start gap-3 rounded-lg border border-line bg-bg-2 p-3">
              <StatusPill status={c.status} />
              <div>
                <p className="text-sm text-ivory">{c.sentence}</p>
                {c.tradeoff && <p className="mt-1 text-xs text-ivory-dim">Trade-off: {c.tradeoff}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-bg-1 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-ivory-faint">What-if impact by asset</h2>
            <Badge kind="hypothetical" />
          </div>
          <div className="mt-3">
            <HBars
              items={assets.map((a) => ({ label: a.name, value: r.impact.perAsset[a.id].pct }))}
              format={(v) => formatPct(v, 1)}
            />
          </div>
        </div>
        <div className="rounded-xl border border-line bg-bg-1 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-ivory-faint">Money vs crisis risk share</h2>
            <Badge kind="hypothetical" />
          </div>
          <div className="mt-3">
            <PairBars items={assets.map((a) => ({ label: a.name, weight: weights[a.id], risk: r.crisis.shares[a.id] ?? 0 }))} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-bg-1 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-ivory">Portfolio and assumptions</h2>
          <Badge kind="assumption" />
        </div>
        <table className="mt-3 w-full text-left text-xs">
          <thead>
            <tr className="border-b border-line text-ivory-faint">
              <th className="py-1.5 pr-2 font-medium">Asset</th>
              <th className="py-1.5 pr-2 font-medium">Weight</th>
              <th className="py-1.5 pr-2 font-medium">Expected return</th>
              <th className="py-1.5 pr-2 font-medium">Ups &amp; downs</th>
            </tr>
          </thead>
          <tbody className="num text-ivory-dim">
            {assets
              .filter((a) => w[a.id] > 0)
              .map((a) => (
                <tr key={a.id} className="border-b border-line/50">
                  <td className="py-1.5 pr-2 text-ivory">{a.name}</td>
                  <td className="py-1.5 pr-2">{w[a.id]}%</td>
                  <td className="py-1.5 pr-2">{formatPct(a.expReturn, 1)}</td>
                  <td className="py-1.5 pr-2">{formatPct(a.vol, 0)}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-ivory-faint">
          Inflation assumption {formatPct(state.inflation, 0)} · monthly savings {formatINR(state.monthlySaving)} · every assumption is editable in the analyser.
        </p>
      </section>

      <p className="rounded-xl border border-line bg-bg-1 p-4 text-xs leading-relaxed text-ivory-faint">
        Disclaimer: Allocara is an educational tool, not financial advice. Results are ranges under stated, editable assumptions; extreme events
        beyond the model, taxes, fees and real fund holdings are not modelled. Nothing here is a promise or a recommendation to buy or sell.
      </p>
    </div>
  );
}
