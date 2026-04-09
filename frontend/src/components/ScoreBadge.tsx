interface Props {
  score: number;
  size?: "sm" | "md";
}

function getRingColor(score: number): string {
  if (score >= 80) return "#10b981"; // emerald
  if (score >= 60) return "#8b5cf6"; // brand
  if (score >= 40) return "#3b82f6"; // blue
  return "#94a3b8"; // slate
}

function getTextColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-brand-500";
  if (score >= 40) return "text-blue-500";
  return "text-slate-500";
}

export function ScoreBadge({ score, size = "md" }: Props) {
  const deg = Math.round((score / 100) * 360);
  const ringColor = getRingColor(score);
  const outerSize = size === "md" ? "w-16 h-16" : "w-12 h-12";
  const innerSize = size === "md" ? "w-14 h-14" : "w-10 h-10";
  const textSize = size === "md" ? "text-xl" : "text-base";

  return (
    <div
      className={`score-ring ${outerSize} shrink-0`}
      style={
        { "--score-deg": `${deg}deg`, "--ring-color": ringColor } as React.CSSProperties
      }
    >
      <div
        className={`bg-white rounded-full ${innerSize} flex flex-col items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-slate-50`}
      >
        <span className={`${textSize} font-black leading-none tracking-tighter ${getTextColor(score)}`}>
          {score}
        </span>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
          Match
        </span>
      </div>
    </div>
  );
}
