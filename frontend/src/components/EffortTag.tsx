import type { EffortLevel } from "../types";

const config: Record<EffortLevel, { label: string; className: string; icon: string }> = {
  LOW: {
    label: "Low Effort",
    className: "bg-green-50 text-green-700 border-green-100",
    icon: "ph ph-gauge-low",
  },
  MEDIUM: {
    label: "Medium Effort",
    className: "bg-amber-50 text-amber-700 border-amber-100",
    icon: "ph ph-gauge",
  },
  HIGH: {
    label: "High Effort",
    className: "bg-slate-100 text-slate-600 border-slate-200",
    icon: "ph ph-activity",
  },
};

export function EffortTag({ level }: { level: EffortLevel | null }) {
  if (!level) return null;
  const { label, className, icon } = config[level];
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${className}`}
    >
      <i className={`${icon} text-xs`} />
      {label}
    </span>
  );
}
