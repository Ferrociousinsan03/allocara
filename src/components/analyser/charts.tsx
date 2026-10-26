// Hand-written SVG/CSS charts in the ivory/emerald palette. Direct labels, no legends where possible.
import { formatINR } from "@/engine/format";

/** Horizontal diverging bars (positive emerald, negative problem red), centred on zero. */
export function HBars({ items, format }: { items: { label: string; value: number }[]; format: (v: number) => string }) {
  const max = Math.max(1e-9, ...items.map((i) => Math.abs(i.value)));
  return (
    <div className="space-y-1.5">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-2 text-xs">
          <span className="w-40 shrink-0 truncate text-ivory-dim">{i.label}</span>
          <span className="relative h-4 flex-1 rounded bg-bg-2">
            <span className="absolute inset-y-0 left-1/2 w-px bg-line" aria-hidden />
            <span
              className={`absolute top-0 h-full rounded ${i.value >= 0 ? "bg-emerald" : "bg-problem"}`}
              style={
                i.value >= 0
                  ? { left: "50%", width: `${(i.value / max) * 50}%` }
                  : { right: "50%", width: `${(-i.value / max) * 50}%` }
              }
            />
          </span>
          <span className="num w-24 shrink-0 text-right text-ivory">{format(i.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Paired bars: money share (ivory) vs risk share (emerald) per asset. */
export function PairBars({ items }: { items: { label: string; weight: number; risk: number }[] }) {
  const max = Math.max(1e-9, ...items.flatMap((i) => [i.weight, i.risk]));
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.label} className="text-xs">
          <div className="mb-0.5 flex justify-between text-ivory-dim">
            <span>{i.label}</span>
            <span className="num">
              {(i.weight * 100).toFixed(0)}% of money · {(i.risk * 100).toFixed(0)}% of risk
            </span>
          </div>
          <div className="space-y-0.5">
            <div className="h-2.5 rounded bg-bg-2">
              <div className="h-full rounded bg-ivory/70" style={{ width: `${(i.weight / max) * 100}%` }} />
            </div>
            <div className="h-2.5 rounded bg-bg-2">
              <div className="h-full rounded bg-emerald" style={{ width: `${(i.risk / max) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
      <p className="pt-1 text-[11px] text-ivory-faint">Ivory bar: share of money. Emerald bar: share of risk.</p>
    </div>
  );
}

const W = 640;
const H = 260;
const PAD = { l: 64, r: 12, t: 12, b: 24 };

/** Round tick steps (1/2/5 × 10^n) so axis labels stay readable in lakh/crore. */
function niceTicks(max: number): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];
  const rough = max / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const mult = [1, 2, 5, 10].find((m) => m * pow >= rough) ?? 10;
  const step = mult * pow;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.49; v += step) ticks.push(v);
  return ticks;
}

/** Fan chart: 5th–95th percentile band, median line, optional dashed baseline median and goal lines. */
export function FanChart({
  years,
  p5,
  p50,
  p95,
  baseline,
  goals = [],
}: {
  years: number;
  p5: number[];
  p50: number[];
  p95: number[];
  baseline?: number[]; // dashed amber median for comparison
  goals?: { name: string; value: number }[]; // dashed ivory goal lines, included in the y range
}) {
  const maxV = Math.max(1, ...p95, ...(baseline ?? []), ...goals.map((g) => g.value));
  const x = (i: number) => PAD.l + ((i + 1) / years) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / maxV) * (H - PAD.t - PAD.b);
  const line = (arr: number[]) => arr.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const band = `${line(p95)} ${[...p5].reverse().map((v, i) => `L${x(p5.length - 1 - i).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} Z`;
  const ticks = niceTicks(maxV);
  // End labels: keep at least 16px apart so they never overlap.
  const yMid = y(p50[p50.length - 1]!) - 6;
  let yBase = baseline ? y(baseline[baseline.length - 1]!) + 12 : 0;
  if (baseline && Math.abs(yBase - yMid) < 16) yBase = yMid + 16;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Fan chart of possible outcomes">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
          <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--ivory-faint)">
            {formatINR(t)}
          </text>
        </g>
      ))}
      <path d={band} fill="var(--emerald)" opacity="0.15" />
      <path d={line(p5)} fill="none" stroke="var(--emerald)" strokeWidth="1" opacity="0.5" />
      <path d={line(p95)} fill="none" stroke="var(--emerald)" strokeWidth="1" opacity="0.5" />
      <path d={line(p50)} fill="none" stroke="var(--emerald-bright)" strokeWidth="2" />
      {baseline && (
        <path d={line(baseline)} fill="none" stroke="var(--status-careful)" strokeWidth="1.5" strokeDasharray="5 4" />
      )}
      {goals.map((g) => (
        <g key={g.name}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(g.value)} y2={y(g.value)} stroke="var(--ivory)" strokeWidth="1" strokeDasharray="3 4" opacity="0.6" />
          <text x={PAD.l + 4} y={y(g.value) - 4} fontSize="10" fill="var(--ivory-dim)">
            {g.name}
          </text>
        </g>
      ))}
      {Array.from({ length: years }, (_, i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--ivory-faint)">
          {i + 1}y
        </text>
      ))}
      <text x={W - PAD.r} y={yMid} textAnchor="end" fontSize="10" fill="var(--emerald-bright)">
        middle outcome
      </text>
      {baseline && (
        <text x={W - PAD.r} y={yBase} textAnchor="end" fontSize="10" fill="var(--status-careful)">
          without the what-if
        </text>
      )}
    </svg>
  );
}

/** Single-line chart for the stylised crash path. */
export function LinePath({ points, startValue }: { points: { month: number; value: number }[]; startValue: number }) {
  const maxV = Math.max(...points.map((p) => p.value), startValue);
  const minV = Math.min(...points.map((p) => p.value));
  const months = points[points.length - 1]?.month ?? 1;
  const x = (m: number) => PAD.l + (m / months) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - minV * 0.95) / (maxV - minV * 0.95 || 1)) * (H - PAD.t - PAD.b);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.month).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Stylised month-by-month crash path">
      <line x1={PAD.l} x2={W - PAD.r} y1={y(startValue)} y2={y(startValue)} stroke="var(--ivory-faint)" strokeWidth="1" strokeDasharray="4 4" />
      <text x={PAD.l - 6} y={y(startValue) + 4} textAnchor="end" fontSize="10" fill="var(--ivory-faint)">
        {formatINR(startValue)}
      </text>
      <text x={PAD.l - 6} y={y(minV) + 4} textAnchor="end" fontSize="10" fill="var(--ivory-faint)">
        {formatINR(minV)}
      </text>
      <path d={d} fill="none" stroke="var(--emerald-bright)" strokeWidth="2" />
      {[0, Math.round(months / 2), months].map((m) => (
        <text key={m} x={x(m)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--ivory-faint)">
          {m}m
        </text>
      ))}
    </svg>
  );
}

const heatColor = (c: number) =>
  c >= 0
    ? `color-mix(in oklab, var(--emerald) ${Math.round(c * 85)}%, var(--bg-2))`
    : `color-mix(in oklab, var(--status-problem) ${Math.round(-c * 85)}%, var(--bg-2))`;

/** Correlation heatmap, emerald for positive, red for negative. */
export function Heatmap({ corr, labels }: { corr: number[][]; labels: string[] }) {
  return (
    <div className="inline-block">
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `2.5rem repeat(${labels.length}, 2rem)` }}>
        <span />
        {labels.map((l) => (
          <span key={l} className="text-center text-[10px] text-ivory-faint">
            {l}
          </span>
        ))}
        {corr.map((row, i) => (
          <HeatmapRow key={labels[i]} label={labels[i]!} row={row} />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ivory-faint">Emerald: move together. Red: move apart. −1 to +1.</p>
    </div>
  );
}

function HeatmapRow({ label, row }: { label: string; row: number[] }) {
  return (
    <>
      <span className="pr-1 text-right text-[10px] leading-8 text-ivory-faint">{label}</span>
      {row.map((c, j) => (
        <span
          key={j}
          title={`${label} vs cell ${j + 1}: ${c.toFixed(2)}`}
          className="num flex h-8 items-center justify-center rounded-sm text-[9px] text-ivory"
          style={{ background: heatColor(c) }}
        >
          {c.toFixed(1)}
        </span>
      ))}
    </>
  );
}

/** Small sparkline for landing-page cards. */
export function Sparkline({ points }: { points: number[] }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const d = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * 100).toFixed(1)},${(28 - ((v - min) / (max - min || 1)) * 26).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" className="h-8 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={d} fill="none" stroke="var(--emerald)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
