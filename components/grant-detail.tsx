"use client";

import { useEffect, useRef } from "react";
import { Bookmark, CalendarDays, ExternalLink, X, Check, Info } from "lucide-react";
import { deadlineLabel, money, type Grant, type SavedGrant, type SchoolProfile } from "@/lib/domain";
import { scoreGrant } from "@/lib/scoring";
import { calendarFile, download } from "@/lib/export";

export function GrantDetail({ grant, school, saved, onSave, onClose }: {
  grant: Grant; school: SchoolProfile; saved?: SavedGrant; onSave: (grant: Grant) => void; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const match = scoreGrant({ grant, school });
  useEffect(() => { const current = dialog.current; current?.showModal(); return () => current?.close(); }, []);
  function addCalendar() {
    const content = calendarFile(grant);
    if (content) download({ content, name: "grant-deadline.ics", type: "text/calendar" });
  }
  return <dialog ref={dialog} className="detail-dialog" onClose={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }} aria-labelledby="grant-detail-title">
    <article className="detail-content"><div className="detail-top"><span className="muted">Opportunity details</span><button className="icon-button" onClick={onClose} aria-label="Close grant details"><X size={20} /></button></div>
      <p className="funder">{grant.funder}</p><h2 id="grant-detail-title">{grant.title}</h2>
      <div className="detail-tags"><span className={`badge ${grant.status === "posted" ? "green" : "neutral"}`}>{grant.status === "posted" ? "Posted on Grants.gov" : grant.status === "forecasted" ? "Forecasted" : grant.status === "closed" ? "Closed" : "Verify current cycle"}</span><span className="badge neutral">{grant.source === "federal" ? "Federal grant" : grant.source === "web" ? "Web result" : "Program directory"}</span></div>
      <div className="detail-facts"><div><span>Award ceiling</span><strong>{money(grant.amountMax)}</strong></div><div><span>Application deadline</span><strong>{deadlineLabel(grant.deadline)}</strong></div></div>
      <section><h3>What it funds</h3><p className="description-full">{grant.description}</p></section>
      <section><h3>Who can apply</h3><p>{grant.eligibilityText}</p></section>
      <section className="score-explanation"><div className="score-explanation-heading"><h3>Your school’s match</h3><strong>{match.score}<small>/100</small></strong></div><p className="muted">A fit score, not a prediction of winning. The rules use your priorities, applicant type, location, funding goal, and deadline.</p>
        {match.factors.map(factor => <div className="factor" key={factor.label}><div><strong>{factor.label}</strong><span>{factor.points}{factor.max > 0 ? ` / ${factor.max}` : " points"}</span></div>{factor.max > 0 && <div className="factor-track"><i style={{ width: `${factor.points / factor.max * 100}%` }} /></div>}<p>{factor.detail}</p></div>)}
      </section>
      {match.warnings.length > 0 && <section className="review-box"><h3><Info size={17} />Check before you apply</h3><ul>{match.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></section>}
      <section><h3>A useful next step</h3><p>Read the full notice. Confirm the applicant, deadline, project budget, and required documents with the funder.</p>{grant.source === "federal" && <p>Check SAM.gov and Grants.gov registration needs with your school district before you start.</p>}</section>
      <p className="privacy-note">{grant.id.startsWith("custom-") ? "Added by your school" : grant.source === "directory" ? "Program link reviewed" : "Source retrieved"}: {new Date(grant.retrievedAt).toLocaleDateString("en-US")}. Source details can change.</p>
      <div className="detail-footer"><a className="button primary" href={grant.url} target="_blank" rel="noopener noreferrer">Open official source<ExternalLink size={16} /></a><button className="button secondary" onClick={() => onSave(grant)}>{saved ? <Check size={16} /> : <Bookmark size={16} />}{saved ? "Saved" : "Save grant"}</button>{grant.deadline && <button className="button secondary" onClick={addCalendar}><CalendarDays size={16} />Add deadline</button>}</div>
    </article>
  </dialog>;
}
