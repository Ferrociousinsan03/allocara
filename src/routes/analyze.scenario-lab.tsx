import { pageMeta } from "@/lib/metadata";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { reverseStress, type BreachResult } from "@/engine/stress";
import { formatPct } from "@/engine/format";
import { Badge } from "@/components/analyser/Badge";
import { useAnalyser } from "@/components/analyser/state";
import { SellPlanner } from "@/components/analyser/SellPlanner";
import { HoldingWhatIf } from "@/components/analyser/HoldingWhatIf";

export const Route = createFileRoute("/analyze/scenario-lab")({
  head: () => ({
    meta: pageMeta("Scenario Lab — Allocara Analyser", "Reverse stress test, sale planning, and per-holding what-if on your own portfolio."),
  }),
  component: ScenarioLab,
});

function breachText(label: string, b: BreachResult | null): string {
  if (!b) return `${label}: not set.`;
  if (b.kind === "already") return `${label}: already breached in this what-if.`;
  if (b.kind === "never") return `${label}: holds even if shares fall 95%.`;
  return `${label}: breaks if shares fall about ${formatPct(-b.equityMove, 0)}.`;
}

function ScenarioLab() {
  const { state, scenario, weights } = useAnalyser();
  const r = useMemo(
    () =>
      reverseStress(weights, state.value, scenario, {
        comfortLimit: state.comfortLimit,
        cashNeed: state.cashNeed,
      }),
    [weights, state],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-bg-1 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-ivory">Reverse stress test</h2>
          <Badge kind="hypothetical" />
        </div>
        <p className="mt-1 text-xs text-ivory-faint">Instead of picking a fall and seeing the damage, this asks: how big a fall breaks things?</p>
        <ul className="mt-3 space-y-2 text-sm text-ivory">
          <li>{breachText("Your comfort limit", r.comfort)}</li>
          <li>{breachText("Your 12-month cash cover", r.coverage)}</li>
        </ul>
      </section>

      <SellPlanner />

      <HoldingWhatIf />
    </div>
  );
}
