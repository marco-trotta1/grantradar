import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { savedApi, grantApi, getLocalOrgId } from "../lib/api";
import { DeadlineBadge } from "../components/DeadlineBadge";
import { EffortTag } from "../components/EffortTag";
import type { SavedGrant } from "../types";

function formatAmount(min: number | null, max: number | null): string {
  if (!max && !min) return "TBD";
  const fmt = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1_000).toFixed(0)}k`;
  if (max && min && min !== max) return `${fmt(min)}–${fmt(max)}`;
  return `Up to ${fmt(max ?? min!)}`;
}

export function SavedGrants() {
  const orgId = getLocalOrgId()!;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: saved = [], isLoading } = useQuery({
    queryKey: ["saved", orgId],
    queryFn: () => savedApi.list(orgId),
    enabled: !!orgId,
  });

  const removeMutation = useMutation({
    mutationFn: (grantId: string) => savedApi.remove(orgId, grantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved", orgId] }),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Saved Grants</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {saved.length} grant{saved.length !== 1 ? "s" : ""} saved for tracking
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : saved.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="ph ph-bookmark-simple text-4xl text-slate-300" />
          <p className="text-slate-500 mt-3 font-medium">No saved grants yet.</p>
          <p className="text-slate-400 text-sm mt-1">
            Browse the dashboard and bookmark grants you want to track.
          </p>
          <button className="btn-primary mt-4" onClick={() => navigate("/")}>
            Go to Dashboard <i className="ph ph-arrow-right" />
          </button>
        </div>
      ) : (
        <div className="space-y-3 pb-12">
          {saved.map((s) => (
            <article
              key={s.id}
              className="card p-5 hover:shadow-soft transition-all cursor-pointer flex flex-col sm:flex-row gap-4 items-start sm:items-center"
              onClick={() => navigate(`/grants/${s.grantId}`)}
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900 line-clamp-1">{s.grant.title}</h4>
                <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-1.5">
                  <i className="ph-fill ph-bank text-xs" /> {s.grant.funder}
                </p>
              </div>
              <div className="flex items-center gap-6 text-sm shrink-0">
                <div className="text-right hidden sm:block">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Award</span>
                  <span className="font-medium text-slate-700">{formatAmount(s.grant.amountMin, s.grant.amountMax)}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Deadline</span>
                  <DeadlineBadge deadline={s.grant.deadline} />
                </div>
                <button
                  className="btn-secondary px-3 text-red-500 border-red-200 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeMutation.mutate(s.grantId);
                  }}
                  disabled={removeMutation.isPending}
                >
                  <i className="ph ph-trash" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
