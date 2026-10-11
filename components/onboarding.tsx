"use client";

import Image from "next/image";

import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { gradeLabels, priorities, profileSchema, schoolTypes, states, type SchoolProfile } from "@/lib/domain";

interface Props { initial?: SchoolProfile; onSave: (profile: SchoolProfile) => void; onCancel?: () => void }
export function Onboarding({ initial, onSave, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [name, setName] = useState(initial?.name ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "ID");
  const [schoolType, setSchoolType] = useState(initial?.schoolType ?? "public-school");
  const [grades, setGrades] = useState<SchoolProfile["grades"]>(initial?.grades ?? []);
  const [selected, setSelected] = useState<SchoolProfile["priorities"]>(initial?.priorities ?? []);
  const [students, setStudents] = useState(initial?.students.toString() ?? "");
  const [fundingGoal, setFundingGoal] = useState(initial?.fundingGoal.toString() ?? "");
  const [locale, setLocale] = useState(initial?.locale ?? "rural");
  const [titleI, setTitleI] = useState(initial?.titleI ?? false);
  const [capacity, setCapacity] = useState(initial?.capacity ?? "limited");
  const [mission, setMission] = useState(initial?.mission ?? "");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (step === 0) {
      if (!name.trim() || !city.trim() || grades.length === 0) { setError("Enter the school name, city, and at least one grade band."); return; }
      setStep(1); return;
    }
    const parsed = profileSchema.safeParse({ name, city, state, schoolType, grades, priorities: selected,
      students: Number(students), fundingGoal: Number(fundingGoal), locale, titleI, capacity, mission });
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Check the school details."); return; }
    onSave(parsed.data);
  }

  return <div className="onboarding-shell">
    <aside className="onboarding-aside">
      <Brand />
      <div className="onboarding-story"><span className="quiet-label">A little support goes a long way.</span>
        <h1>More possibilities.<br />For your school.</h1>
        <p>Find funding for the projects your students need. Start with your school, then see what fits.</p>
        <div className="school-illustration" aria-hidden="true"><div className="school-roof" /><div className="school-building"><i /><i /><i /><i /><span /></div><div className="school-ground" /></div>
      </div>
      <div className="aside-footer"><ShieldCheck size={17} /><span>Free for schools. No student data needed.</span></div>
    </aside>
    <main className="onboarding-main" id="main">
      <div className="onboarding-top"><span>{initial ? "Edit your school" : "Welcome to GrantRadar"}</span>{onCancel && <button className="text-button" type="button" onClick={onCancel}>Cancel</button>}</div>
      <form className="onboarding-form" onSubmit={submit}>
        <div className="steps" aria-label={`Step ${step + 1} of 2`}><span className={step === 0 ? "current" : "complete"}>{step > 0 ? <Check size={14} /> : "1"}</span><i /><span className={step === 1 ? "current" : ""}>2</span><small>{step === 0 ? "Your school" : "Your priorities"}</small></div>
        <h2>{step === 0 ? "Let’s get to know your school." : "What would make a difference?"}</h2>
        <p className="muted">{step === 0 ? "A few details help us find relevant funding opportunities." : "Choose your priorities. We’ll show how each opportunity fits."}</p>
        {error && <p className="notice error" role="alert">{error}</p>}
        {step === 0 ? <>
          <label className="field">School or district name<input autoComplete="organization" autoFocus value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={120} placeholder="e.g. Riverside Elementary School" /></label>
          <div className="form-row"><label className="field">City<input autoComplete="address-level2" value={city} onChange={event => setCity(event.target.value)} required minLength={2} maxLength={100} placeholder="Boise" /></label><label className="field state-field">State or territory<select value={state} onChange={event => setState(event.target.value as SchoolProfile["state"])}>{states.map(item => <option key={item}>{item}</option>)}</select></label></div>
          <label className="field">School type<select value={schoolType} onChange={event => setSchoolType(event.target.value as SchoolProfile["schoolType"])}>{Object.entries(schoolTypes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <fieldset><legend>Grade bands</legend><div className="choice-row">{Object.entries(gradeLabels).map(([value, label]) => <label className={`choice ${grades.includes(value as SchoolProfile["grades"][number]) ? "selected" : ""}`} key={value}><input type="checkbox" checked={grades.includes(value as SchoolProfile["grades"][number])} onChange={event => setGrades(event.target.checked ? [...grades, value as SchoolProfile["grades"][number]] : grades.filter(item => item !== value))} />{label}</label>)}</div></fieldset>
        </> : <>
          <fieldset><legend>Funding priorities <span className="muted">Choose one or more</span></legend><div className="priority-grid">{priorities.map(priority => <label className={`choice ${selected.includes(priority) ? "selected" : ""}`} key={priority}><input type="checkbox" checked={selected.includes(priority)} onChange={event => setSelected(event.target.checked ? [...selected, priority] : selected.filter(item => item !== priority))} />{priority}</label>)}</div></fieldset>
          <div className="form-row"><label className="field">Students served<input type="number" min="1" max="1000000" step="1" required value={students} onChange={event => setStudents(event.target.value)} placeholder="350" /></label><label className="field">Project funding goal (USD)<input type="number" min="1" max="1000000000" step="1" required value={fundingGoal} onChange={event => setFundingGoal(event.target.value)} placeholder="25000" /></label></div>
          <div className="form-row"><label className="field">School setting<select value={locale} onChange={event => setLocale(event.target.value as SchoolProfile["locale"])}><option value="rural">Rural</option><option value="suburban">Suburban</option><option value="urban">Urban</option></select></label><label className="field">Application support<select value={capacity} onChange={event => setCapacity(event.target.value as SchoolProfile["capacity"])}><option value="limited">One person, limited time</option><option value="small-team">A small team</option><option value="dedicated">Dedicated grant support</option></select></label></div>
          <label className="checkbox-field"><input type="checkbox" checked={titleI} onChange={event => setTitleI(event.target.checked)} />Our school receives Title I funding</label>
          <label className="field">Your project <span className="muted">Optional</span><textarea value={mission} onChange={event => setMission(event.target.value)} maxLength={1200} rows={3} placeholder="What would you like to fund? Keep student names and personal details out of this field." /></label>
        </>}
        <div className="onboarding-actions">{step === 1 && <button type="button" className="button secondary" onClick={() => { setStep(0); setError(""); }}><ArrowLeft size={16} />Back</button>}<button className="button primary" type="submit">{step === 0 ? "Continue" : initial ? "Save school profile" : "Find my school’s grants"}<ArrowRight size={17} /></button></div>
        <p className="privacy-note">Your profile and saved grants save to your private account. <a href="/privacy">How we use your data</a></p>
      </form>
    </main>
  </div>;
}

export function Brand() {
  return <a className="brand" href="/" aria-label="GrantRadar home"><Image className="brand-symbol" src="/logo.png" width={36} height={36} sizes="36px" priority alt="" /><span>Grant<span className="brand-light">Radar</span></span></a>;
}
