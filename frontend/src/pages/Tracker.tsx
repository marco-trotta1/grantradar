import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { savedApi, getLocalOrgId } from "../lib/api";
import { differenceInDays, format, isSameMonth, parseISO } from "date-fns";
import type { SavedGrant } from "../types";

function UrgencyBar({ days }: { days: number }) {
  const w = Math.max(0, Math.min(100, (days / 90) * 100));
  const color = days <= 30 ? "bg-red-400" : days <= 60 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${w}%` }} />
    </div>
  );
}

export function Tracker() {
  const orgId = getLocalOrgId()!;
  const navigate = useNavigate();

  const { data: saved = [], isLoading } = useQuery({
    queryKey: ["saved", orgId],
    queryFn: () => savedApi.list(orgId),
    enabled: !!orgId,
  });

  const withDeadline = saved
    .filter((s) => s.grant.deadline)
    .sort(
      (a, b) =>
        new Date(a.grant.deadline!).getTime() - new Date(b.grant.deadline!).getTime()
    );

  const withoutDeadline = saved.filter((s) => !s.grant.deadline);

  function urgencyLabel(days: number) {
    if (days < 0) return { text: "Closed", className: "text-slate-400" };
    if (days <= 7) return { text: "This week!", className: "text-red-600 font-bold" };
    if (days <= 30) return { text: "< 30 days", className: "text-red-500 font-semibold" };
    if (days <= 60) return { text: "< 60 days", className: "text-amber-600 font-semibold" };
    return { text: `${days} days`, className: "text-emerald-600" };
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Deadline Tracker</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          All saved grants sorted by deadline urgency.
        </p>
      </div>

      {/* Urgency legend */}
      <div className="flex flex-wrap gap-4 text-xs font-semibold">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> Under 30 days</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> 30–60 days</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Over 60 days</span>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse h-20" />
          ))}
        </div>
      ) : saved.length === 0 ? (
        <div className="card p-12 text-center">
          <i className="ph ph-calendar-check text-4xl text-slate-300" />
          <p className="text-slate-500 mt-3 font-medium">No grants saved yet.</p>
          <p className="text-slate-400 text-sm mt-1">
            Save grants from the dashboard to track deadlines here.
          </p>
          <button className="btn-primary mt-4" onClick={() => navigate("/")}>
            Go to Dashboard <i className="ph ph-arrow-right" />
          </button>
        </div>
      ) : (
        <div className="space-y-6 pb-12">
          {withDeadline.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                Upcoming Deadlines
              </h2>
              <div className="space-y-3">
                {withDeadline.map((s) => {
                  const deadline = new Date(s.grant.deadline!);
                  const days = differenceInDays(deadline, new Date());
                  const urgency = urgencyLabel(days);

                  return (
                    <article
                      key={s.id}
                      className="card p-5 hover:shadow-soft transition-all cursor-pointer"
                      onClick={() => navigate(`/grants/${s.grantId}`)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 line-clamp-1">
                            {s.grant.title}
                          </h4>
                          <p className="text-slate-500 text-sm mt-0.5">{s.grant.funder}</p>
                          <UrgencyBar days={Math.max(0, days)} />
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-slate-800 font-bold text-sm">
                            {format(deadline, "MMM d, yyyy")}
                          </p>
                          <p className={`text-xs mt-0.5 ${urgency.className}`}>
                            {urgency.text}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {withoutDeadline.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                Rolling / No Deadline
              </h2>
              <div className="space-y-3">
                {withoutDeadline.map((s) => (
                  <article
                    key={s.id}
                    className="card p-5 hover:shadow-soft transition-all cursor-pointer opacity-75"
                    onClick={() => navigate(`/grants/${s.grantId}`)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-slate-900 line-clamp-1">{s.grant.title}</h4>
                        <p className="text-slate-500 text-sm mt-0.5">{s.grant.funder}</p>
                      </div>
                      <span className="text-slate-400 text-sm flex items-center gap-1">
                        <i className="ph ph-infinity" /> Rolling
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
