// Guided demo overlay (spec section 13): 6 steps, highlights, persona "Asha".
import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ASHA, DEMO_STEPS } from "@/engine/demo";
import { ASSET_IDS, type AssetId } from "@/engine/assets";
import { useAnalyser } from "./state";

const toPct = (w: Record<string, number>) =>
  Object.fromEntries(ASSET_IDS.map((id) => [id, Math.round((w[id] ?? 0) * 100)])) as Record<AssetId, number>;

export function DemoOverlay({ onClose }: { onClose: () => void }) {
  const { state, update, replaceState } = useAnalyser();
  const [step, setStep] = useState(0);
  const current = DEMO_STEPS[step] ?? DEMO_STEPS[0];

  const applyAction = useCallback(
    (action?: "loadAsha" | "showB") => {
      if (action === "loadAsha") {
        replaceState({
          ...state,
          value: ASHA.value,
          goals: ASHA.goals.map((g) => ({ ...g })),
          cashNeed: ASHA.cashNeed,
          monthlySaving: ASHA.monthlySaving,
          inflation: ASHA.inflation,
          comfortLimit: ASHA.comfortLimit,
          active: "A",
          weightsA: toPct(ASHA.weightsA),
          weightsB: toPct(ASHA.weightsB),
          presetId: ASHA.presetId,
          equityMove: ASHA.scenario.equityMove * 100,
          rateChangeBps: ASHA.scenario.rateChangeBps,
          inrMove: ASHA.scenario.inrMove * 100,
          shockAsset: "",
          shockSize: 0,
        });
      } else if (action === "showB") {
        update({ active: "B" });
      }
    },
    [state, update, replaceState],
  );
  const actionRef = useRef(applyAction);
  actionRef.current = applyAction;

  // Apply the step's action and move the highlight ring to its target.
  useEffect(() => {
    if (!current) return;
    actionRef.current(current.action);
    document.querySelectorAll("[data-demo-active]").forEach((el) => el.removeAttribute("data-demo-active"));
    if (current.target) {
      const el = document.querySelector(`[data-demo="${current.target}"]`);
      if (el) {
        el.setAttribute("data-demo-active", "true");
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
    return () => {
      document.querySelectorAll("[data-demo-active]").forEach((el) => el.removeAttribute("data-demo-active"));
    };
  }, [step, current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setStep((s) => Math.min(DEMO_STEPS.length - 1, s + 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(0, s - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!current) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 no-print" role="dialog" aria-modal="true" aria-label="Guided demo">
      <div className="w-full max-w-xl rounded-xl border border-emerald/50 bg-bg-1 p-5 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-emerald-bright">
              Demo · step {step + 1} of {DEMO_STEPS.length}
            </p>
            <h2 className="mt-1 font-serif text-lg text-ivory">{current.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close demo" className="rounded-md p-1 text-ivory-faint hover:text-ivory">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-sm text-ivory-dim">{current.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-md border border-line px-3 py-1.5 text-xs text-ivory-dim hover:text-ivory disabled:opacity-40"
          >
            Back
          </button>
          <div className="flex gap-1" aria-hidden>
            {DEMO_STEPS.map((_, i) => (
              <span key={i} className={`h-1.5 w-4 rounded-full ${i === step ? "bg-emerald" : "bg-line"}`} />
            ))}
          </div>
          {step < DEMO_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="rounded-md bg-emerald px-3 py-1.5 text-xs font-semibold text-bg-0 hover:bg-emerald-deep"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-emerald px-3 py-1.5 text-xs font-semibold text-bg-0 hover:bg-emerald-deep"
            >
              Finish — it's your turn
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
