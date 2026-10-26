import { pageMeta } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { StockOutlook } from "@/components/analyser/PortfolioLive";
import { StockReturns, DataSources } from "@/components/analyser/StockAssumptions";

export const Route = createFileRoute("/analyze/assumptions")({
  head: () => ({
    meta: pageMeta("Assumptions and Limits — Allocara Analyser", "Every assumption, editable; every formula, visible; and an honest list of what the model cannot see."),
  }),
  component: Assumptions,
});

const LIMITS = [
  "Results depend on the assumptions below; change one and the answers change.",
  "Extreme events beyond anything in the model can and do happen.",
  "Shocks are applied instantly; real markets unfold over months.",
  "Beta, duration and crisis discounts are rough values, not measurements.",
  "Taxes, fees and the real sector mix inside funds are not modelled.",
  "Measured crisis correlations are blended with a fixed rule and depend on the available history.",
  "Past returns are not forecasts; nothing here is a promise or advice.",
];

const FORMULAS = [
  { name: "Scenario return per asset", f: "r = beta × share move − duration × rate change + ½ × convexity × rate change² + currency link × rupee move" },
  { name: "Cash raisable quickly", f: "value × share sellable × (1 − crisis discount × severity), severity = fall ÷ 20% capped at 1" },
  { name: "Share of risk", f: "weight × (covariance × weight) ÷ total portfolio variance" },
  { name: "Goal simulation step", f: "value × e^((return − vol²/2) × dt + vol × √dt × random), monthly" },
  { name: "Crash path recovery", f: "trough + (start − trough) × (1 − 0.5^(months ÷ half-life))" },
];

function Assumptions() {
  return (
    <div className="space-y-6">
      <StockReturns />

      <StockOutlook />

      <section className="rounded-xl border border-line bg-bg-1 p-4">
        <h2 className="font-serif text-lg text-ivory">Formulas, in plain sight</h2>
        <ul className="mt-3 space-y-2">
          {FORMULAS.map((x) => (
            <li key={x.name} className="rounded-lg border border-line bg-bg-2 p-3">
              <p className="text-sm font-medium text-ivory">{x.name}</p>
              <p className="mt-0.5 text-xs text-ivory-dim">{x.f}</p>
            </li>
          ))}
        </ul>
      </section>

      <DataSources />

      <section className="rounded-xl border border-line bg-bg-1 p-4">
        <h2 className="font-serif text-lg text-ivory">What this model cannot see</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ivory-dim">
          {LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-ivory-faint">Educational tool, not financial advice.</p>
      </section>
    </div>
  );
}
