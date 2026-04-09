import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { grantApi, savedApi, getLocalOrgId } from "../lib/api";
import { ScoreBadge } from "../components/ScoreBadge";
import { DeadlineBadge } from "../components/DeadlineBadge";
import { EffortTag } from "../components/EffortTag";

// Fetch the match for this grant + org
async function getGrantDetail(grantId: string, orgId: string) {
  const [grant, matches, savedList] = await Promise.all([
    grantApi.get(grantId),
    grantApi.getMatches(orgId, 0),
    savedApi.list(orgId),
  ]);
  const match = matches.matches.find((m) => m.grantId === grantId);
  const saved = savedList.find((s) => s.grantId === grantId);
  return { grant, match, saved };
}

export function GrantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orgId = getLocalOrgId()!;
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["grant-detail", id, orgId],
    queryFn: () => getGrantDetail(id!, orgId),
    enabled: !!id && !!orgId,
  });

  const saveMutation = useMutation({
    mutationFn: () => savedApi.save(orgId, id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grant-detail", id, orgId] });
      queryClient.invalidateQueries({ queryKey: ["saved", orgId] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => savedApi.remove(orgId, id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grant-detail", id, orgId] });
      queryClient.invalidateQueries({ queryKey: ["saved", orgId] });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4 animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-3/4" />
        <div className="h-4 bg-slate-100 rounded w-1/2" />
        <div className="card p-8 space-y-3">
          <div className="h-4 bg-slate-100 rounded" />
          <div className="h-4 bg-slate-100 rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (!data?.grant) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <i className="ph ph-x-circle text-4xl text-slate-300" />
        <p className="text-slate-500 mt-3">Grant not found.</p>
        <button className="btn-secondary mt-4" onClick={() => navigate(-1)}>Go back</button>
      </div>
    );
  }

  const { grant, match, saved } = data;
  const isSaved = !!saved;

  function formatAmount(min: number | null, max: number | null): string {
    if (!max && !min) return "Not specified";
    const fmt = (n: number) => `$${n.toLocaleString()}`;
    if (max && min && min !== max) return `${fmt(min)} – ${fmt(max)}`;
    return `Up to ${fmt(max ?? min!)}`;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Back */}
      <button
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        onClick={() => navigate(-1)}
      >
        <i className="ph ph-arrow-left" /> Back to Dashboard
      </button>

      {/* Header card */}
      <div className="card p-6">
        <div className="flex items-start gap-5">
          {match && <ScoreBadge score={match.score} />}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 mb-2">
              {grant.category.slice(0, 3).map((cat) => (
                <span key={cat} className="bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                  {cat}
                </span>
              ))}
              {match && <EffortTag level={match.effortLevel} />}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{grant.title}</h1>
            <p className="text-slate-500 mt-1 flex items-center gap-1.5">
              <i className="ph-fill ph-bank text-sm" /> {grant.funder}
            </p>
          </div>
          <button
            className={`btn-secondary shrink-0 ${isSaved ? "text-brand-600 border-brand-300" : ""}`}
            onClick={() => isSaved ? removeMutation.mutate() : saveMutation.mutate()}
            disabled={saveMutation.isPending || removeMutation.isPending}
          >
            <i className={isSaved ? "ph-fill ph-bookmark-simple" : "ph ph-bookmark-simple"} />
            {isSaved ? "Saved" : "Save"}
          </button>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Award Range</span>
            <span className="font-semibold text-slate-800">{formatAmount(grant.amountMin, grant.amountMax)}</span>
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Deadline</span>
            <DeadlineBadge deadline={grant.deadline} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Source</span>
            <a
              href={grant.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-brand-600 hover:underline text-sm font-medium flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {grant.source} <i className="ph ph-arrow-square-out text-xs" />
            </a>
          </div>
          {grant.eligibility.length > 0 && (
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Eligible</span>
              <span className="text-slate-600 text-sm">{grant.eligibility.slice(0, 2).join(", ")}</span>
            </div>
          )}
        </div>
      </div>

      {/* AI Summary */}
      {match?.summary && (
        <div className="card p-6 border-brand-200 bg-brand-50/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-brand-100 text-brand-600 p-1.5 rounded-lg">
              <i className="ph-fill ph-magic-wand text-sm" />
            </div>
            <h2 className="font-semibold text-slate-800">AI Summary</h2>
          </div>
          <p className="text-slate-700 leading-relaxed">{match.summary}</p>
          {match.reasoning && (
            <div className="mt-4 pt-4 border-t border-brand-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Why this score ({match.score}/100)</p>
              <p className="text-slate-600 text-sm leading-relaxed">{match.reasoning}</p>
            </div>
          )}
        </div>
      )}

      {/* Full description */}
      <div className="card p-6">
        <h2 className="font-semibold text-slate-800 mb-3">Grant Description</h2>
        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{grant.description}</p>
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        <a
          href={grant.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-primary"
        >
          Apply on {grant.source} <i className="ph ph-arrow-square-out" />
        </a>
        <button
          className="btn-secondary"
          onClick={() => isSaved ? removeMutation.mutate() : saveMutation.mutate()}
        >
          <i className={isSaved ? "ph-fill ph-bookmark-simple" : "ph ph-bookmark-simple"} />
          {isSaved ? "Remove from saved" : "Save for later"}
        </button>
      </div>
    </div>
  );
}
