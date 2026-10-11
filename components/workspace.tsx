"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Bookmark, CalendarDays, Check, ChevronRight, CircleHelp, Download, ExternalLink, FileText, GraduationCap, LoaderCircle, Search, Settings2, SlidersHorizontal, Trash2, Upload, X } from "lucide-react";
import { Onboarding, Brand } from "./onboarding";
import { GrantDetail } from "./grant-detail";
import { deadlineLabel, daysUntil, money, priorities, schoolTypes, searchResponseSchema, stages, workspaceSchema, type Grant, type SavedGrant, type SchoolProfile, type SearchResponse, type Workspace } from "@/lib/domain";
import { scoreGrant } from "@/lib/scoring";
import { calendarFile, csvFile, download, exportWorkspace } from "@/lib/export";

const storageKey = "grantradar.school.v1";
type Page = "discover" | "saved" | "applications" | "school";
type Mode = "all" | "federal" | "directory" | "web";
const pages: { id: Page; label: string; icon: typeof Search }[] = [
  { id: "discover", label: "Find grants", icon: Search }, { id: "saved", label: "Saved grants", icon: Bookmark },
  { id: "applications", label: "Applications", icon: FileText }, { id: "school", label: "Your school", icon: GraduationCap },
];
const modes: { id: Mode; label: string }[] = [{ id: "all", label: "All sources" }, { id: "federal", label: "Federal grants" }, { id: "directory", label: "Program directory" }, { id: "web", label: "Web search" }];

export function WorkspaceApp() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState<Page>("discover");
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState("");
  const [storageError, setStorageError] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [mode, setMode] = useState<Mode>("all");
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [minScore, setMinScore] = useState(0);
  const [focus, setFocus] = useState("");
  const [availability, setAvailability] = useState("all");
  const [sort, setSort] = useState("match");
  const [detail, setDetail] = useState<Grant | null>(null);
  const [help, setHelp] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const request = useRef<AbortController | null>(null);
  const school = workspace?.profile;
  const profileKey = JSON.stringify(school ?? null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = workspaceSchema.safeParse(JSON.parse(raw));
        if (parsed.success) setWorkspace(parsed.data);
        else setStorageError("This browser’s saved data could not be read. Restore a valid backup or create a new school profile.");
      }
    } catch { setStorageError("Browser storage is unavailable or contains unreadable data. Check the browser settings before you continue."); }
    setReady(true);
    return () => request.current?.abort();
  }, []);

  useEffect(() => {
    if (school) { setQuery(""); void runSearch({ nextMode: "all", text: "", profile: school }); }
    // Search again only when the school profile changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileKey]);

  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(""), 4500); return () => clearTimeout(timer); } }, [toast]);

  function persist(next: Workspace): boolean {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setWorkspace(next); setStorageError(""); return true;
    } catch { setStorageError("The browser could not save your changes. Export a backup and check the browser’s storage settings."); return false; }
  }

  async function runSearch({ nextMode = mode, text = query, profile = school, nextPage = 0 }: { nextMode?: Mode; text?: string; profile?: SchoolProfile; nextPage?: number } = {}) {
    if (!profile) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setMode(nextMode); setLoading(true); setSearchError(""); setData(null);
    const params = new URLSearchParams({ q: text.trim(), mode: nextMode, schoolType: profile.schoolType, state: profile.state, priority: profile.priorities[0], page: String(nextPage) });
    try {
      const response = await fetch(`/api/search?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 429 ? "Too many searches. Wait one minute, then try again." : "The search could not finish. Try again.");
      const parsed = searchResponseSchema.parse(await response.json());
      if (!controller.signal.aborted) { setData(parsed); setPageIndex(nextPage); setSearchedQuery(text); }
    } catch (error) {
      if (!controller.signal.aborted) setSearchError(error instanceof Error ? error.message : "The search could not finish. Try again.");
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }

  function saveGrant(grant: Grant) {
    if (!workspace || workspace.saved.some(item => item.grant.id === grant.id)) return;
    if (workspace.saved.length >= 500) { setToast("Export your saved grants before you add more. This browser supports 500 saved grants."); return; }
    if (persist({ ...workspace, saved: [...workspace.saved, { grant, stage: "saved", notes: "", savedAt: new Date().toISOString() }] })) setToast("Grant saved. You can find it in Saved grants.");
  }

  function updateSaved(id: string, update: Partial<Pick<SavedGrant, "stage" | "notes">>) {
    if (workspace) persist({ ...workspace, saved: workspace.saved.map(item => item.grant.id === id ? { ...item, ...update } : item) });
  }

  function removeSaved(id: string) {
    if (!workspace || !window.confirm("Remove this saved grant and its notes from this browser?")) return;
    if (persist({ ...workspace, saved: workspace.saved.filter(item => item.grant.id !== id) })) setToast("Grant removed.");
  }

  async function restore(file: File | undefined) {
    if (!file) return;
    if (file.size > 20_000_000) { setToast("Choose a GrantRadar backup below 20 MB."); return; }
    try {
      const parsed = workspaceSchema.safeParse(JSON.parse(await file.text()));
      if (!parsed.success) { setToast("This file is not a valid GrantRadar backup."); return; }
      if (workspace && !window.confirm("Restore this backup? It replaces this browser’s school profile and saved grants.")) return;
      if (persist(parsed.data)) { setEditing(false); setPage("discover"); setToast("School workspace restored."); }
    } catch { setToast("The backup could not be read. Choose a GrantRadar JSON backup."); }
    finally { if (fileInput.current) fileInput.current.value = ""; }
  }

  const backupInput = <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" aria-label="Restore a GrantRadar backup" onChange={event => void restore(event.target.files?.[0])} />;
  if (!ready) return <main id="main" className="app-loading"><Brand /><LoaderCircle className="spin" size={24} /><p>Opening your school workspace…</p></main>;
  if (!school || !workspace || editing) return <>{storageError && <div className="notice error top-notice" role="alert">{storageError}</div>}<Onboarding initial={editing ? school : undefined} onCancel={editing ? () => setEditing(false) : undefined} onSave={profile => {
    if (storageError && !window.confirm("Replace the unreadable data with a new school profile?")) return;
    if (persist({ version: 1, profile, saved: workspace?.saved ?? [] })) { setEditing(false); setToast("School profile saved."); }
  }} /><div className="restore-onboarding">Already have a backup? <button className="text-button" onClick={() => fileInput.current?.click()}>Restore your school workspace</button></div>{backupInput}{toast && <div className="toast" role="status">{toast}</div>}</>;

  const grants = data?.grants ?? [];
  const ranked = grants.map(grant => ({ grant, match: scoreGrant({ grant, school }) }));
  const results = ranked.filter(({ grant, match }) => match.score >= minScore && (!focus || grant.priorities.includes(focus as SchoolProfile["priorities"][number])) && (availability === "all" || (grant.status === "posted" && (daysUntil({ deadline: grant.deadline }) ?? 0) >= 0)))
    .sort((a, b) => sort === "deadline" ? (a.grant.deadline ?? "9999").localeCompare(b.grant.deadline ?? "9999") : sort === "amount" ? (b.grant.amountMax ?? -1) - (a.grant.amountMax ?? -1) : b.match.score - a.match.score);
  const saved = workspace.saved;
  const deadlines = saved.filter(item => { const days = daysUntil({ deadline: item.grant.deadline }); return days !== null && days >= 0 && days <= 30 && !["submitted", "awarded", "declined"].includes(item.stage); }).sort((a, b) => (a.grant.deadline ?? "").localeCompare(b.grant.deadline ?? ""));
  const webUrl = `https://www.google.com/search?q=${encodeURIComponent(`${query || school.priorities[0]} grants K-12 schools ${school.city} ${school.state}`)}`;

  function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void runSearch(); }
  const navigate = (next: Page) => { setPage(next); setHelp(false); };
  return <div className="app-shell">
    <aside className="sidebar"><Brand /><div className="school-identity"><span className="school-avatar">{school.name.split(/\s+/).slice(0, 2).map(word => word[0]).join("")}</span><div><strong>{school.name}</strong><span>{school.city}, {school.state}</span></div></div>
      <nav aria-label="Main navigation">{pages.map(item => <button key={item.id} onClick={() => navigate(item.id)} className={`nav-item ${page === item.id ? "active" : ""}`} aria-current={page === item.id ? "page" : undefined}><item.icon size={19} />{item.label}{item.id === "saved" && saved.length > 0 && <span className="nav-count">{saved.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="community-note"><span className="small-school"><GraduationCap size={19} /></span><strong>Made for schools.</strong><p>More time for students.<br />A little help with funding.</p><span className="free-label">Always free to use</span></div><button className="nav-item" onClick={() => setHelp(!help)}><CircleHelp size={18} />How GrantRadar works</button><a className="sidebar-privacy" href="/privacy">Privacy & your data</a></div>
    </aside>
    <div className="main-shell"><header className="topbar"><span className="breadcrumb">Your workspace<ChevronRight size={14} /><strong>{pages.find(item => item.id === page)?.label}</strong></span><button className="school-switch" onClick={() => navigate("school")}><span className="tiny-avatar">{school.name[0]}</span><span>{school.name}</span><Settings2 size={15} /></button></header>
      <main id="main" className="workspace-main">
        {storageError && <div className="notice error" role="alert">{storageError}</div>}
        {help && <section className="help-panel"><button className="icon-button help-close" onClick={() => setHelp(false)} aria-label="Close help"><X size={18} /></button><h2>A clearer path to school funding.</h2><div className="help-grid"><div><strong>1. Tell us about your school</strong><p>Set your location, applicant type, funding goal, and priorities.</p></div><div><strong>2. Find and review grants</strong><p>Search federal opportunities and program links. Open each match to see its score and source.</p></div><div><strong>3. Keep the next step clear</strong><p>Save grants, track application stages, and export a backup or calendar deadline.</p></div></div><p className="muted">Scores use a fixed rubric: priorities 35, applicant type 25, location 15, funding goal 15, timing 10. Evidence limits can reduce the score.</p></section>}

        {page === "discover" && <>
          <div className="page-heading"><div><p className="greeting">For {school.name}</p><h1>Funding for what comes next.</h1><p className="muted">Find opportunities that fit your school, and a clear place to start.</p></div><span className="workspace-badge"><span />School workspace</span></div>
          <div className="overview-strip"><div><span>Opportunities in this search</span><strong>{loading ? "…" : grants.length}<small>shown</small></strong></div><div><span>Strong matches</span><strong>{loading ? "…" : ranked.filter(item => item.match.score >= 80).length}<small>score of 80+</small></strong></div><button onClick={() => navigate("saved")}><span>Saved grants</span><strong>{saved.length}<Bookmark size={17} /></strong></button><button onClick={() => navigate("applications")}><span>Saved deadlines in 30 days</span><strong>{deadlines.length}<CalendarDays size={17} /></strong></button></div>
          <section className="search-section" aria-label="Find funding opportunities"><div className="section-heading"><h2>Explore opportunities</h2><span className="muted">Matched to your school profile</span></div>
            <form className="search-form" onSubmit={search}><div className="search-input"><Search size={19} /><input aria-label="Search grants" placeholder="Try school safety, science equipment, or reading…" value={query} onChange={event => setQuery(event.target.value)} maxLength={120} /><kbd aria-hidden="true">Enter</kbd></div><button className="button primary" disabled={loading} type="submit">{loading ? <LoaderCircle className="spin" size={17} /> : <Search size={17} />}Search grants</button></form>
            <div className="source-tabs" role="group" aria-label="Grant sources">{modes.map(item => <button key={item.id} className={mode === item.id ? "selected" : ""} aria-pressed={mode === item.id} onClick={() => void runSearch({ nextMode: item.id })}>{item.label}{item.id === "web" && <ExternalLink size={12} />}</button>)}</div>
            <div className="filters"><SlidersHorizontal size={16} /><label><span className="sr-only">Funding priority</span><select value={focus} onChange={event => setFocus(event.target.value)}><option value="">All priorities</option>{priorities.map(priority => <option key={priority}>{priority}</option>)}</select></label><label><span className="sr-only">Minimum match score</span><select value={minScore} onChange={event => setMinScore(Number(event.target.value))}><option value={0}>Any match score</option><option value={40}>40+ · Review details</option><option value={60}>60+ · Worth a look</option><option value={80}>80+ · Strong match</option></select></label><label><span className="sr-only">Application status</span><select value={availability} onChange={event => setAvailability(event.target.value)}><option value="all">All application windows</option><option value="posted">Posted federal grants</option></select></label>{(focus || minScore || availability !== "all") && <button className="text-button" onClick={() => { setFocus(""); setMinScore(0); setAvailability("all"); }}>Clear filters</button>}<label className="sort-field"><span>Sort:</span><select aria-label="Sort grants" value={sort} onChange={event => setSort(event.target.value)}><option value="match">Best match</option><option value="deadline">Next deadline</option><option value="amount">Highest award</option></select></label></div>
          </section>
          {mode === "web" && <div className="web-search-note"><p>Search beyond federal funding. Web results are leads that need a source review.</p><a className="button secondary" href={webUrl} target="_blank" rel="noopener noreferrer">Open web search<ExternalLink size={15} /></a></div>}
          {data?.warnings.map(warning => <p className="notice" key={warning} role="status">{warning}</p>)}
          {searchError && <div className="notice error" role="alert">{searchError}<button className="text-button" onClick={() => void runSearch()}>Retry search</button></div>}
          <div className="results-heading" aria-live="polite"><span>{loading ? "Looking for school funding…" : `${results.length} ${results.length === 1 ? "opportunity" : "opportunities"}${data && data.total > grants.length ? ` shown from ${data.total} source results` : ""}`}</span><span className="muted">{data && `Searched ${new Date(data.searchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}</span></div>
          {loading ? <div className="grant-grid" aria-label="Loading grants" aria-busy="true">{[0, 1, 2, 3].map(item => <div className="skeleton-card" key={item}><i /><i /><i /><i /></div>)}</div> : results.length ? <div className="grant-grid">{results.map(({ grant, match }) => <GrantCard key={grant.id} grant={grant} score={match.score} label={match.label} isSaved={saved.some(item => item.grant.id === grant.id)} onOpen={() => setDetail(grant)} onSave={() => saveGrant(grant)} />)}</div> : !searchError && <div className="empty-state"><Search size={28} /><h3>{mode === "web" && !data?.webAvailable ? "Continue your search on the web." : "No opportunities match this view."}</h3><p>{mode === "web" && !data?.webAvailable ? "Use the web search link above, or browse federal grants and the program directory." : "Try a broader search, clear a filter, or explore another source."}</p><button className="button secondary" onClick={() => { setQuery(""); setFocus(""); setMinScore(0); setAvailability("all"); void runSearch({ text: "", nextMode: "directory" }); }}>Browse program directory<ArrowRight size={16} /></button></div>}
          {!loading && data && (pageIndex > 0 || data.hasMore) && <div className="pagination"><button className="button secondary" disabled={pageIndex === 0} onClick={() => void runSearch({ nextPage: pageIndex - 1, text: searchedQuery })}>Previous results</button><span>Federal results · Page {pageIndex + 1}</span><button className="button secondary" disabled={!data.hasMore} onClick={() => void runSearch({ nextPage: pageIndex + 1, text: searchedQuery })}>More federal results<ArrowRight size={15} /></button></div>}
          <div className="source-footnote"><CircleHelp size={15} /><p>Match scores show a possible fit, not award odds. Confirm each grant’s rules and deadline on the source website.</p></div>
        </>}

        {(page === "saved" || page === "applications") && <>
          <div className="page-heading"><div><p className="greeting">Your funding workspace</p><h1>{page === "saved" ? "Good opportunities, kept close." : "One next step at a time."}</h1><p className="muted">{page === "saved" ? "Your shortlist, with room for notes and a plan." : "Track each application from the first look to the final decision."}</p></div><button className="button secondary" disabled={!saved.length} onClick={() => download({ content: csvFile(saved), name: "grantradar-saved-grants.csv", type: "text/csv;charset=utf-8" })}><Download size={16} />Export CSV</button></div>
          {page === "applications" && <><div className="pipeline">{Object.entries(stages).map(([stage, label]) => <div key={stage}><span>{label}</span><strong>{saved.filter(item => item.stage === stage).length}</strong></div>)}</div>{deadlines.length > 0 && <div className="deadline-callout"><CalendarDays size={20} /><div><strong>{deadlines.length} saved {deadlines.length === 1 ? "deadline" : "deadlines"} in the next 30 days</strong><p>Next: {deadlines[0].grant.title} · {deadlineLabel(deadlines[0].grant.deadline)}</p></div></div>}</>}
          {saved.length ? <div className="saved-list">{saved.map(item => { const match = scoreGrant({ grant: item.grant, school }); return <article className="saved-row" key={item.grant.id}><div className="saved-row-heading"><div><p className="funder">{item.grant.funder}</p><button className="grant-title" onClick={() => setDetail(item.grant)}>{item.grant.title}</button><p className="saved-meta">{deadlineLabel(item.grant.deadline)} · {money(item.grant.amountMax)} · Match {match.score}/100</p></div><button className="icon-button" onClick={() => removeSaved(item.grant.id)} aria-label={`Remove ${item.grant.title}`}><Trash2 size={17} /></button></div><div className="saved-row-controls"><label className="field">Application stage<select value={item.stage} onChange={event => updateSaved(item.grant.id, { stage: event.target.value as SavedGrant["stage"] })}>{Object.entries(stages).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label className="field notes-field">Your notes<textarea value={item.notes} maxLength={5000} rows={2} onChange={event => updateSaved(item.grant.id, { notes: event.target.value })} placeholder="Next steps, documents, or questions for the funder. No student data." /></label></div><div className="saved-row-footer"><a href={item.grant.url} target="_blank" rel="noopener noreferrer">Open source<ExternalLink size={13} /></a>{item.grant.deadline && <button className="text-button" onClick={() => { const content = calendarFile(item.grant); if (content) download({ content, name: "grant-deadline.ics", type: "text/calendar" }); }}><CalendarDays size={14} />Export calendar deadline</button>}<span className="muted">Snapshot: {new Date(item.grant.retrievedAt).toLocaleDateString("en-US")}</span></div></article>; })}</div> : <div className="empty-state"><Bookmark size={30} /><h3>Your shortlist starts here.</h3><p>Save an opportunity to keep its details, add notes, and track the application.</p><button className="button primary" onClick={() => navigate("discover")}>Find grants<ArrowRight size={16} /></button></div>}
          <p className="privacy-note">Saved details are snapshots. Confirm the current deadline with the funder. Export a backup to keep your notes safe.</p>
        </>}

        {page === "school" && <><div className="page-heading"><div><p className="greeting">The starting point for every match</p><h1>Your school, your priorities.</h1><p className="muted">Keep the school profile current so each match stays useful.</p></div><button className="button primary" onClick={() => setEditing(true)}>Edit school profile<Settings2 size={16} /></button></div>
          <section className="profile-panel"><div className="profile-title"><span className="school-avatar large"><GraduationCap size={28} /></span><div><h2>{school.name}</h2><p className="muted">{schoolTypes[school.schoolType]} · {school.city}, {school.state}</p></div></div><dl className="profile-details"><div><dt>Students served</dt><dd>{school.students.toLocaleString()}</dd></div><div><dt>Funding goal</dt><dd>{money(school.fundingGoal)}</dd></div><div><dt>School setting</dt><dd>{school.locale}</dd></div><div><dt>Title I funding</dt><dd>{school.titleI ? "Yes" : "No"}</dd></div><div><dt>Grade bands</dt><dd>{school.grades.join(", ")}</dd></div><div><dt>Application support</dt><dd>{school.capacity === "limited" ? "One person, limited time" : school.capacity === "small-team" ? "A small team" : "Dedicated grant support"}</dd></div></dl><h3>Funding priorities</h3><div className="detail-tags">{school.priorities.map(priority => <span className="badge green" key={priority}>{priority}</span>)}</div>{school.mission && <><h3>Your project</h3><p>{school.mission}</p><p className="privacy-note">This description stays in your browser. Scores use your selected priorities and profile fields.</p></>}</section>
          <section className="data-panel"><h2>Your data stays with you.</h2><p>The profile, saved grants, and notes stay in this browser. Use a backup to move to another device.</p><div className="data-actions"><button className="button secondary" onClick={() => exportWorkspace(workspace)}><Download size={16} />Export backup</button><button className="button secondary" onClick={() => fileInput.current?.click()}><Upload size={16} />Restore backup</button><button className="text-button danger" onClick={() => { if (window.confirm("Clear this browser’s school profile, saved grants, and notes? Export a backup first if you need them.")) { try { localStorage.removeItem(storageKey); setWorkspace(null); setData(null); setPage("discover"); } catch { setStorageError("The browser could not clear the saved data. Check the browser settings."); } } }}><Trash2 size={15} />Clear this browser’s data</button></div><a href="/privacy">Privacy & your data<ExternalLink size={13} /></a></section>
          <section className="data-panel"><h2>Connected grant sources</h2><div className="connection-row"><span><span className="status-dot" />Grants.gov</span><span>Public federal search</span><a href="https://www.grants.gov/search-grants" target="_blank" rel="noreferrer">Open source<ExternalLink size={13} /></a></div><div className="connection-row"><span><span className={`status-dot ${data?.webAvailable ? "" : "pending"}`} />Web search</span><span>{data?.webAvailable ? "Connected" : "External search available"}</span><a href={webUrl} target="_blank" rel="noreferrer">Search the web<ExternalLink size={13} /></a></div><p className="privacy-note">GrantRadar is free to schools. School staff do not need an API key.</p></section>
        </>}
        <footer className="workspace-footer"><span>GrantRadar · A little help for a lot of possibility.</span><a href="/privacy">Privacy & your data</a></footer>
      </main>
    </div>
    {detail && <GrantDetail grant={detail} school={school} saved={saved.find(item => item.grant.id === detail.id)} onSave={saveGrant} onClose={() => setDetail(null)} />}
    {backupInput}{toast && <div className="toast" role="status"><Check size={16} />{toast}</div>}
  </div>;
}

function GrantCard({ grant, score, label, isSaved, onOpen, onSave }: { grant: Grant; score: number; label: string; isSaved: boolean; onOpen: () => void; onSave: () => void }) {
  const remaining = daysUntil({ deadline: grant.deadline });
  return <article className="grant-card"><div className="card-top"><span className="source-label"><span className={grant.source === "federal" ? "federal-dot" : "program-dot"} />{grant.source === "federal" ? "Grants.gov" : grant.source === "directory" ? "Program directory" : "Web result"}</span><button className={`icon-button save-button ${isSaved ? "is-saved" : ""}`} aria-label={isSaved ? `${grant.title} saved` : `Save ${grant.title}`} aria-pressed={isSaved} onClick={onSave}>{isSaved ? <Bookmark size={19} fill="currentColor" /> : <Bookmark size={19} />}</button></div><p className="funder">{grant.funder}</p><h3><button className="grant-title" onClick={onOpen}>{grant.title}</button></h3><p className="grant-description">{grant.description}</p><div className="card-tags">{grant.priorities.slice(0, 2).map(priority => <span key={priority}>{priority}</span>)}</div><div className="card-facts"><div><span>Award ceiling</span><strong>{money(grant.amountMax)}</strong></div><div><span>{grant.status === "forecasted" ? "Forecasted deadline" : "Application deadline"}</span><strong className={remaining !== null && remaining >= 0 && remaining <= 14 ? "soon" : ""}>{deadlineLabel(grant.deadline)}</strong></div></div><div className="card-footer"><button className={`match-badge ${score >= 80 ? "strong" : score >= 60 ? "moderate" : "review"}`} onClick={onOpen} aria-label={`Match score ${score} out of 100. ${label}. See score details.`}><span>{score}<small>/100</small></span><span>{label}</span></button><button className="card-details" onClick={onOpen}>View grant<ArrowRight size={16} /></button></div>{grant.status === "unverified" && <p className="verification-label">Confirm the current application cycle on the source website.</p>}</article>;
}
