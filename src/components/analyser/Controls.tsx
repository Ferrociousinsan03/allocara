// Left control panel: what-if scenario.
import type { ReactNode } from "react";
import { ASSETS, type AssetId } from "@/engine/assets";
import { PRESETS } from "@/engine/presets";
import { useAnalyser } from "./state";

function Section({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="border-b border-line py-3">
      <summary className="cursor-pointer select-none text-sm font-semibold text-ivory">{title}</summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}

function Slider({ label, value, min, max, step = 1, unit, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs text-ivory-dim">
      <span className="flex items-center justify-between">
        {label}
        <span className="num text-ivory">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-emerald"
      />
    </label>
  );
}

export function Controls() {
  const { state, update, applyPreset } = useAnalyser();

  return (
    <div className="text-sm">
      <Section title="What-if scenario">
        <div data-demo="scenario" className="space-y-3">
        <label className="block text-xs text-ivory-dim">
          Preset (stylised, inspired by past events — not exact replays)
          <select
            value={state.presetId}
            onChange={(e) => applyPreset(e.target.value)}
            className="mt-1 w-full rounded-md border border-line bg-bg-2 px-2 py-1.5 text-sm text-ivory"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            {state.presetId === "custom" && <option value="custom">Custom</option>}
          </select>
        </label>
        <Slider label="Share-market move" value={state.equityMove} min={-60} max={20} unit="%" onChange={(v) => update({ equityMove: v, presetId: "custom" })} />
        <Slider label="Interest-rate change" value={state.rateChangeBps} min={-300} max={300} step={25} unit=" bps" onChange={(v) => update({ rateChangeBps: v, presetId: "custom" })} />
        <Slider label="Rupee move vs dollar (+ = weaker)" value={state.inrMove} min={-15} max={20} unit="%" onChange={(v) => update({ inrMove: v, presetId: "custom" })} />
        <label className="block text-xs text-ivory-dim">
          Extra shock to one asset
          <select
            value={state.shockAsset}
            onChange={(e) => update({ shockAsset: e.target.value as AssetId | "", presetId: "custom" })}
            className="mt-1 w-full rounded-md border border-line bg-bg-2 px-2 py-1.5 text-sm text-ivory"
          >
            <option value="">None</option>
            {ASSETS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        {state.shockAsset && (
          <Slider label="Extra shock size" value={state.shockSize} min={-40} max={0} unit="%" onChange={(v) => update({ shockSize: v, presetId: "custom" })} />
        )}
        </div>
      </Section>
    </div>
  );
}
