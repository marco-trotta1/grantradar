import { differenceInDays, format } from "date-fns";

interface Props {
  deadline: string | null;
  showLabel?: boolean;
}

function getUrgency(days: number) {
  if (days < 0) return { color: "text-slate-400", icon: "ph ph-x-circle", label: "Closed" };
  if (days <= 30) return { color: "text-red-600", icon: "ph-fill ph-warning-diamond", label: `${days}d left` };
  if (days <= 60) return { color: "text-amber-600", icon: "ph-fill ph-warning-circle", label: `${days}d left` };
  return { color: "text-emerald-600", icon: "ph ph-check-circle", label: `${days}d left` };
}

export function DeadlineBadge({ deadline, showLabel = true }: Props) {
  if (!deadline) {
    return (
      <div className="flex items-center gap-1.5 text-slate-500">
        <i className="ph ph-infinity text-sm" />
        {showLabel && <span className="text-sm font-medium">Rolling</span>}
      </div>
    );
  }

  const date = new Date(deadline);
  const days = differenceInDays(date, new Date());
  const { color, icon, label } = getUrgency(days);

  return (
    <div className={`flex items-center gap-1.5 ${color}`}>
      {days <= 30 && days >= 0 ? (
        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
      ) : (
        <i className={`${icon} text-sm`} />
      )}
      <span className="text-sm font-semibold">
        {format(date, "MMM d")} ({label})
      </span>
    </div>
  );
}
