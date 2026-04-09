import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { grantApi, getLocalOrgId } from "../lib/api";
import { GrantCard } from "../components/GrantCard";
import { useOrg } from "../hooks/useOrg";

export function Dashboard() {
  const { org } = useOrg();
  const orgId = getLocalOrgId()!;
  const queryClient = useQueryClient();
  const [minScore, setMinScore] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["matches", orgId, minScore],
    queryFn: () => grantApi.getMatches(orgId, minScore),
    enabled: !!orgId,
  });

  const { data: saved } = useQuery({
    queryKey: ["saved", orgId],
    queryFn: () => import("../lib/api").then((m) => m.savedApi.list(orgId)),
    enabled: !!orgId,
  });

  const savedIds = new Set(saved?.map((s) => s.grantId) ?? []);

  const syncMutation = useMutation({
    mutationFn: () => grantApi.sync(50),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["matches", orgId] }),
  });

  const matchMutation = useMutation({
    mutationFn: () => grantApi.runMatching(orgId, 30),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["matches", orgId] }),
  });

  const matches = data?.matches ?? [];
  const greeting =
    new Date().getHours() < 12
      ? "Good morning"
      : new Date().getHours() < 18
      ? "Good afternoon"
      : "Good evening";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {greeting}{org ? `, ${org.name}` : ""}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Your top funding opportunities, ranked by AI relevance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary text-xs"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <i className="ph ph-arrows-clockwise" />
            {syncMutation.isPending ? "Syncing..." : "Sync Grants"}
          </button>
          <button
            className="btn-primary text-xs"
            onClick={() => matchMutation.mutate()}
            disabled={matchMutation.isPending}
          >
            <i className="ph-fill ph-magic-wand" />
            {matchMutation.isPending ? "Matching..." : "Run AI Match"}
          </button>
        </div>
      </div>

      {/* AI Banner */}
      {matches.length > 0 && (
        <section className="rounded-2xl p-[1px] shadow-lg shadow-brand-500/10"
          style={{ background: "linear-gradient(to right, #7c3aed, #8b5cf6, #6366f1)" }}>
          <div className="bg-white rounded-[15px] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-brand-50 rounded-full blur-3xl opacity-50 pointer-events-none" />
            <div className="flex items-start gap-4 z-10">
              <div className="bg-brand-50 text-brand-600 p-3 rounded-xl shrink-0">
                <i className="ph-fill ph-magic-wand text-2xl" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">
                  Radar Alignment Complete
                </h2>
                <p className="text-sm text-slate-600 mt-1 max-w-xl leading-relaxed">
                  Found{" "}
                  <strong className="text-brand-600">
                    {matches.filter((m) => m.score >= 70).length} strong matches
                  </strong>{" "}
                  out of {matches.length} grants scored for{" "}
                  <strong className="text-slate-800">{org?.name}</strong>.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            Top Recommendations
            <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full font-medium">
              {matches.length}
            </span>
          </h3>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">Min score:</span>
          <div className="flex gap-1">
            {[0, 40, 60, 80].map((s) => (
              <button
                key={s}
                onClick={() => setMinScore(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  minScore === s
                    ? "bg-brand-100 text-brand-700"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {s === 0 ? "All" : `${s}+`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grant list */}
      <div className="space-y-4 pb-12">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex gap-6">
                <div className="w-16 h-16 bg-slate-100 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))
        ) : matches.length === 0 ? (
          <div className="card p-12 text-center">
            <i className="ph ph-magnifying-glass text-4xl text-slate-300" />
            <p className="text-slate-500 mt-3 font-medium">No matches yet.</p>
            <p className="text-slate-400 text-sm mt-1">
              Sync grants then run AI matching to see results.
            </p>
            <div className="flex justify-center gap-3 mt-4">
              <button
                className="btn-secondary"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
              >
                <i className="ph ph-arrows-clockwise" />
                Sync Grants
              </button>
              <button
                className="btn-primary"
                onClick={() => matchMutation.mutate()}
                disabled={matchMutation.isPending || syncMutation.isPending}
              >
                <i className="ph-fill ph-magic-wand" />
                Run AI Match
              </button>
            </div>
          </div>
        ) : (
          matches.map((match, i) => (
            <GrantCard
              key={match.id}
              match={match}
              isSaved={savedIds.has(match.grantId)}
              isTopMatch={i === 0}
            />
          ))
        )}
      </div>
    </div>
  );
}
