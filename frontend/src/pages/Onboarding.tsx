import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { orgApi, setLocalOrgId } from "../lib/api";
import type { OrgType, BudgetSize, StaffSize } from "../types";

const FOCUS_AREAS = [
  "Education", "STEM", "Arts & Culture", "Health & Wellness",
  "Housing & Homelessness", "Environment", "Youth Development",
  "Workforce Development", "Food Security", "Mental Health",
  "Immigration & Refugees", "Civic Engagement", "Animals",
  "Disability Services",
];

interface FormData {
  name: string;
  orgType: OrgType | "";
  mission: string;
  location: string;
  city: string;
  state: string;
  budgetSize: BudgetSize | "";
  focusAreas: string[];
  staffCapacity: StaffSize | "";
  website: string;
  ein: string;
}

const STEPS = ["Organization", "Mission", "Focus & Capacity", "Review"];

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    name: "", orgType: "", mission: "", location: "", city: "", state: "",
    budgetSize: "", focusAreas: [], staffCapacity: "", website: "", ein: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      orgApi.create({
        name: form.name,
        orgType: form.orgType as OrgType,
        mission: form.mission,
        location: `${form.city}, ${form.state}`,
        city: form.city,
        state: form.state,
        budgetSize: form.budgetSize as BudgetSize,
        focusAreas: form.focusAreas,
        staffCapacity: form.staffCapacity as StaffSize,
        website: form.website || undefined,
        ein: form.ein || undefined,
      }),
    onSuccess: (org) => {
      setLocalOrgId(org.id);
      navigate("/");
    },
  });

  function update(key: keyof FormData, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleFocus(area: string) {
    setForm((f) => ({
      ...f,
      focusAreas: f.focusAreas.includes(area)
        ? f.focusAreas.filter((a) => a !== area)
        : [...f.focusAreas, area],
    }));
  }

  const canNext = [
    form.name && form.orgType,
    form.mission.length >= 20 && form.city && form.state,
    form.focusAreas.length >= 1 && form.budgetSize && form.staffCapacity,
    true,
  ][step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="bg-brand-100 text-brand-600 p-2 rounded-xl">
            <i className="ph ph-radar text-2xl" />
          </div>
          <span className="font-serif text-2xl text-slate-900 font-semibold">GrantRadar</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors ${
                i < step ? "bg-brand-500 text-white" :
                i === step ? "bg-brand-100 text-brand-700 border-2 border-brand-500" :
                "bg-slate-100 text-slate-400"
              }`}>
                {i < step ? <i className="ph ph-check text-xs" /> : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${i === step ? "text-brand-700" : "text-slate-400"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-brand-400" : "bg-slate-200"}`} />}
            </div>
          ))}
        </div>

        <div className="card p-8 shadow-soft">
          {/* Step 0: Org basics */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Tell us about your organization</h2>
                <p className="text-sm text-slate-500 mt-1">This helps us find grants that match your type and structure.</p>
              </div>
              <div>
                <label className="label">Organization Name *</label>
                <input className="input" placeholder="e.g. Horizon Youth Center" value={form.name} onChange={(e) => update("name", e.target.value)} />
              </div>
              <div>
                <label className="label">Organization Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["NONPROFIT", "SCHOOL", "COMMUNITY_ORG", "GOVERNMENT"] as OrgType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => update("orgType", t)}
                      className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                        form.orgType === t ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 hover:border-slate-300 text-slate-600"
                      }`}
                    >
                      {t === "NONPROFIT" ? "501(c)(3) Nonprofit" :
                       t === "SCHOOL" ? "School / District" :
                       t === "COMMUNITY_ORG" ? "Community Org" : "Government Agency"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">EIN (optional)</label>
                <input className="input" placeholder="XX-XXXXXXX" value={form.ein} onChange={(e) => update("ein", e.target.value)} />
              </div>
              <div>
                <label className="label">Website (optional)</label>
                <input className="input" placeholder="https://yourdomain.org" value={form.website} onChange={(e) => update("website", e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 1: Mission + Location */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Mission & Location</h2>
                <p className="text-sm text-slate-500 mt-1">Your mission statement powers the AI matching engine.</p>
              </div>
              <div>
                <label className="label">Mission Statement *</label>
                <textarea
                  className="input min-h-[120px] resize-none"
                  placeholder="Describe your organization's mission and the community you serve..."
                  value={form.mission}
                  onChange={(e) => update("mission", e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">{form.mission.length} chars (min 20)</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">City *</label>
                  <input className="input" placeholder="e.g. Chicago" value={form.city} onChange={(e) => update("city", e.target.value)} />
                </div>
                <div>
                  <label className="label">State *</label>
                  <input className="input" placeholder="e.g. IL" maxLength={2} value={form.state} onChange={(e) => update("state", e.target.value.toUpperCase())} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Focus + Capacity */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Focus Areas & Capacity</h2>
                <p className="text-sm text-slate-500 mt-1">Helps prioritize grants you can realistically apply for.</p>
              </div>
              <div>
                <label className="label">Focus Areas * (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {FOCUS_AREAS.map((area) => (
                    <button
                      key={area}
                      onClick={() => toggleFocus(area)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                        form.focusAreas.includes(area)
                          ? "bg-brand-500 text-white border-brand-500"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Annual Budget *</label>
                <select className="input" value={form.budgetSize} onChange={(e) => update("budgetSize", e.target.value as BudgetSize)}>
                  <option value="">Select budget range</option>
                  <option value="UNDER_100K">Under $100,000</option>
                  <option value="FROM_100K_TO_500K">$100K – $500K</option>
                  <option value="FROM_500K_TO_1M">$500K – $1M</option>
                  <option value="FROM_1M_TO_5M">$1M – $5M</option>
                  <option value="OVER_5M">Over $5M</option>
                </select>
              </div>
              <div>
                <label className="label">Staff Capacity *</label>
                <select className="input" value={form.staffCapacity} onChange={(e) => update("staffCapacity", e.target.value as StaffSize)}>
                  <option value="">Select staff size</option>
                  <option value="VOLUNTEER_ONLY">Volunteer-only</option>
                  <option value="ONE_TO_FIVE">1–5 staff</option>
                  <option value="SIX_TO_TWENTY">6–20 staff</option>
                  <option value="OVER_TWENTY">20+ staff</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Review & Launch</h2>
                <p className="text-sm text-slate-500 mt-1">Confirm your profile before we start finding grants.</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Organization", value: `${form.name} (${form.orgType})` },
                  { label: "Location", value: `${form.city}, ${form.state}` },
                  { label: "Budget", value: form.budgetSize.replace(/_/g, " ") },
                  { label: "Staff", value: form.staffCapacity.replace(/_/g, " ") },
                  { label: "Focus Areas", value: form.focusAreas.join(", ") },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-slate-500 font-medium">{label}</span>
                    <span className="text-slate-800 text-right max-w-xs truncate">{value}</span>
                  </div>
                ))}
              </div>
              <div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
                <p className="text-sm text-brand-700 font-medium flex items-start gap-2">
                  <i className="ph-fill ph-magic-wand mt-0.5" />
                  After saving, sync grants and run AI matching from your dashboard.
                </p>
              </div>
              {mutation.isError && (
                <p className="text-red-600 text-sm">Something went wrong. Please try again.</p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              className="btn-secondary"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
            >
              <i className="ph ph-arrow-left" /> Back
            </button>
            {step < 3 ? (
              <button
                className="btn-primary"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
              >
                Continue <i className="ph ph-arrow-right" />
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Saving..." : "Launch GrantRadar"}
                <i className="ph ph-rocket-launch" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
