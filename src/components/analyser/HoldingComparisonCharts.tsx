import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import type { holdingMetrics } from "@/engine/holding-compare";

type Metrics = ReturnType<typeof holdingMetrics>;
type ComparedHolding = { name: string; metrics: Metrics };

const series = [
  { key: "first", color: "var(--chart-1)" },
  { key: "second", color: "var(--chart-3)" },
] as const;

function numberLabel(value: number, percent: boolean) {
  return percent
    ? `${value.toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`
    : `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0, notation: "compact" })}`;
}

function ComparisonGraph({ title, data, first, second, percent = false }: {
  title: string;
  data: { measure: string; first: number | null; second: number | null }[];
  first: string;
  second: string;
  percent?: boolean;
}) {
  const missing = data.some(row => row.first === null || row.second === null);
  return (
    <section className="min-w-0 space-y-3" aria-label={title}>
      <h3 className="font-serif text-lg text-ivory">{title}</h3>
      <div className="h-64 w-full min-w-0 overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 8, bottom: 4, left: 4 }} barGap={6} accessibilityLayer>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="measure" tick={{ fill: "var(--ivory-dim)", fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
            <YAxis width={64} tick={{ fill: "var(--ivory-faint)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={value => numberLabel(Number(value), percent)} />
            <ReferenceLine y={0} stroke="var(--ivory-faint)" />
            <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", borderColor: "var(--line)", color: "var(--ivory)", borderRadius: 6 }} formatter={value => typeof value === "number" ? percent ? `${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}%` : `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "Unavailable"} />
            {series.map((item, index) => <Bar key={item.key} dataKey={item.key} name={index === 0 ? first : second} fill={item.color} maxBarSize={48} isAnimationActive={false} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {missing && <p className="text-xs text-ivory-faint">Unavailable values are omitted.</p>}
    </section>
  );
}

export function HoldingComparisonCharts({ first, second }: { first: ComparedHolding; second: ComparedHolding }) {
  const a = first.metrics;
  const b = second.metrics;
  return (
    <div className="mt-5 space-y-6 border-b border-line pb-6">
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ivory-dim">
        {[first, second].map((holding, index) => <div key={index} className="flex min-w-0 items-center gap-2">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${index === 0 ? "bg-chart-1" : "bg-chart-3"}`} />
          <span className="break-words">{holding.name}</span>
        </div>)}
      </div>
      <ComparisonGraph title="Invested vs current value" first={first.name} second={second.name} data={[
        { measure: "Invested", first: a.investedAmount, second: b.investedAmount },
        { measure: "Current value", first: a.currentValue, second: b.currentValue },
      ]} />
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <ComparisonGraph title="Unrealised gain / loss" first={first.name} second={second.name} data={[{ measure: "Gain / loss", first: a.gain, second: b.gain }]} />
        <ComparisonGraph title="Return on invested amount" first={first.name} second={second.name} percent data={[{ measure: "Return", first: a.gainPct === null ? null : a.gainPct * 100, second: b.gainPct === null ? null : b.gainPct * 100 }]} />
      </div>
    </div>
  );
}