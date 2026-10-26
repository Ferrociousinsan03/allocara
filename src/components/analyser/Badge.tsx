// Honesty badges (Historical / Hypothetical / Assumption) and status pills (OK / Careful / Problem).
import { CheckCircle2, Clock, FlaskConical, OctagonX, SlidersHorizontal, TriangleAlert } from "lucide-react";
import type { Status } from "@/engine/conflicts";

export type BadgeKind = "historical" | "hypothetical" | "assumption";

const KIND_STYLE: Record<BadgeKind, { label: string; className: string; Icon: typeof Clock }> = {
  historical: { label: "Historical", className: "border-ivory/50 text-ivory", Icon: Clock },
  hypothetical: { label: "Hypothetical", className: "border-careful/60 text-careful", Icon: FlaskConical },
  assumption: { label: "Assumption", className: "border-emerald/60 text-emerald-bright", Icon: SlidersHorizontal },
};

export function Badge({ kind }: { kind: BadgeKind }) {
  const { label, className, Icon } = KIND_STYLE[kind];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${className}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}

const STATUS_STYLE: Record<Status, { className: string; Icon: typeof CheckCircle2 }> = {
  OK: { className: "border-ok/60 text-ok", Icon: CheckCircle2 },
  Careful: { className: "border-careful/60 text-careful", Icon: TriangleAlert },
  Problem: { className: "border-problem/60 text-problem", Icon: OctagonX },
};

export function StatusPill({ status }: { status: Status }) {
  const { className, Icon } = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${className}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {status}
    </span>
  );
}
