"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bookmark, X } from "lucide-react";
import { grantSchema, inferPriorities, type Grant } from "@/lib/domain";

export function AddGrant({ onSave, onClose }: { onSave: (grant: Grant) => boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  useEffect(() => { const current = dialog.current; current?.showModal(); return () => current?.close(); }, []);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const deadline = String(form.get("deadline") ?? "");
    const award = String(form.get("award") ?? "");
    const parsed = grantSchema.safeParse({
      id: `custom-${crypto.randomUUID()}`, title, description: description || "Read the source website for the full grant details.",
      funder: String(form.get("funder") ?? "").trim() || "Source added by your school", url: String(form.get("url") ?? "").trim(),
      source: "web", status: "unverified", deadline: deadline || null, amountMin: null, amountMax: award ? Number(award) : null,
      priorities: inferPriorities(`${title} ${description}`), applicantTypes: [],
      eligibilityText: "Your school added this lead. Confirm the eligible applicant and all program rules on the source website.",
      locations: [], grades: [], costSharing: null, retrievedAt: new Date().toISOString(),
    });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the grant details."); return; }
    if (onSave(parsed.data)) onClose();
  }
  return <dialog className="add-grant-dialog" ref={dialog} onClose={onClose} aria-labelledby="add-grant-title"><form onSubmit={submit}>
    <div className="detail-top"><span className="muted">Found an opportunity elsewhere?</span><button className="icon-button" type="button" onClick={onClose} aria-label="Close add grant"><X size={19} /></button></div>
    <h2 id="add-grant-title">Keep it with your other grants.</h2><p className="muted add-grant-intro">Add the source details. We’ll score the lead against your school profile and save it for review.</p>
    {error && <p className="notice error" role="alert">{error}</p>}
    <label className="field">Grant title<input name="title" autoFocus required maxLength={500} placeholder="e.g. Community classroom grant" /></label>
    <label className="field">Source website<input name="url" type="url" required maxLength={2048} placeholder="https://foundation.org/grants" /></label>
    <label className="field">Funder <span className="muted">Optional</span><input name="funder" maxLength={300} placeholder="Foundation or agency name" /></label>
    <label className="field">What the grant funds <span className="muted">Optional. Helps match your priorities.</span><textarea name="description" maxLength={10000} rows={3} placeholder="Add the project types and eligibility rules from the source. Do not include student data." /></label>
    <div className="form-row"><label className="field">Deadline <span className="muted">Optional</span><input name="deadline" type="date" /></label><label className="field">Maximum award (USD) <span className="muted">Optional</span><input name="award" type="number" min={0} max={1e12} step="0.01" placeholder="Not listed" /></label></div>
    <p className="privacy-note">These details come from your entry. Confirm them with the funder before you apply.</p>
    <div className="onboarding-actions"><button className="button primary" type="submit"><Bookmark size={16} />Save grant link</button></div>
  </form></dialog>;
}
