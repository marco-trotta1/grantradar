import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Match } from "../types";
import { ScoreBadge } from "./ScoreBadge";
import { DeadlineBadge } from "./DeadlineBadge";
import { EffortTag } from "./EffortTag";
import { savedApi, getLocalOrgId } from "../lib/api";

function formatAmount(min: number | null, max: number | null): string {
  if (!max && !min) return "Amount TBD";
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `$${(n / 1_000).toFixed(0)}k`
      : `$${n}`;
  if (max && min && min !== max) return `${fmt(min)} – ${fmt(max)}`;
  return `Up to ${fmt(max ?? min!)}`;
}

interface Props {
  match: Match;
  isSaved?: boolean;
  isTopMatch?: boolean;
}

export function GrantCard({ match, isSaved, isTopMatch }: Props) {
  const { grant, score, effortLevel, summary } = match;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const orgId = getLocalOrgId()!;

  const saveMutation = useMutation({
    mutationFn: () => savedApi.save(orgId, grant.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved", orgId] }),
  });

  const removeMutation = useMutation({
    mutationFn: () => savedApi.remove(orgId, grant.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved", orgId] }),
  });

  return (
    <article
      className={`card p-5 hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300 group relative overflow-hidden flex flex-col md:flex-row gap-6 items-start md:items-center cursor-pointer ${
        isTopMatch ? "border-brand-200" : ""
      }`}
      onClick={() => navigate(`/grants/${grant.id}`)}
    >
      {/* Top match left stripe */}
      {isTopMatch && (
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-500 rounded-l-2xl" />
      )}

      {/* Score */}
      <div className={isTopMatch ? "pl-2" : ""}>
        <ScoreBadge score={score} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-2 mb-2">
          {grant.category.slice(0, 2).map((cat) => (
            <span
              key={cat}
              className="bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
            >
              {cat}
            </span>
          ))}
          <EffortTag level={effortLevel} />
        </div>
        <h4 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-1">
          {grant.title}
        </h4>
        <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-1.5">
          <i className="ph-fill ph-bank text-xs" />
          {grant.funder}
        </p>
        {summary && (
          <p className="text-slate-500 text-xs mt-2 line-clamp-2 leading-relaxed">
            {summary}
          </p>
        )}
      </div>

      {/* Meta + CTA */}
      <div
        className="grid grid-cols-2 md:flex items-center gap-4 w-full md:w-auto bg-slate-50 md:bg-transparent p-4 md:p-0 rounded-xl border border-slate-100 md:border-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Amount */}
        <div className="flex flex-col md:items-end w-full md:w-28">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            Award
          </span>
          <span className="font-semibold text-slate-800 text-sm">
            {formatAmount(grant.amountMin, grant.amountMax)}
          </span>
        </div>

        {/* Deadline */}
        <div className="flex flex-col md:items-end w-full md:w-32 md:border-r border-slate-200 md:pr-6">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
            Deadline
          </span>
          <DeadlineBadge deadline={grant.deadline} />
        </div>

        {/* Buttons */}
        <div className="col-span-2 md:col-span-1 flex gap-2 mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 w-full md:w-auto">
          <button
            className="btn-primary flex-1 md:flex-none justify-center"
            onClick={() => navigate(`/grants/${grant.id}`)}
          >
            Review
            <i className="ph ph-arrow-right" />
          </button>
          <button
            className="btn-secondary px-3"
            title={isSaved ? "Remove from saved" : "Save grant"}
            onClick={() => isSaved ? removeMutation.mutate() : saveMutation.mutate()}
            disabled={saveMutation.isPending || removeMutation.isPending}
          >
            <i className={isSaved ? "ph-fill ph-bookmark-simple" : "ph ph-bookmark-simple"} />
          </button>
        </div>
      </div>
    </article>
  );
}
