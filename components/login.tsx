"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Cloud, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { Brand } from "./onboarding";
import { createClient } from "@/lib/supabase/client";

export function Login() {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentAt, setSentAt] = useState(0);
  const router = useRouter();

  async function sendCode(event?: FormEvent) {
    event?.preventDefault(); setError("");
    if (Date.now() - sentAt < 60000) { setError("Wait one minute before you request another code."); return; }
    setBusy(true);
    try {
      const address = (sentTo ?? email).trim().toLowerCase();
      const { error } = await createClient().auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } });
      if (error) throw error;
      setSentTo(address); setSentAt(Date.now());
    } catch { setError("The code could not be sent. Check your email address and try again in one minute."); }
    finally { setBusy(false); }
  }

  async function verify(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    if (!sentTo) { setBusy(false); return; }
    try {
      const { error } = await createClient().auth.verifyOtp({ email: sentTo, token: code.trim(), type: "email" });
      if (error) throw error;
      router.replace("/"); router.refresh();
    } catch { setError("This code is invalid or expired. Check the latest email or request a new code."); }
    finally { setBusy(false); }
  }

  return <main id="main" className="login-shell"><div className="login-header"><Brand /><a href="/help">Help</a></div>
    <div className="login-layout"><section className="login-story"><span className="quiet-label">Free for schools</span><h1>Find the funding.<br />Keep the possibility.</h1><p>A place for your school’s grants, notes, and next steps. Ready whenever you are.</p><div className="login-benefit"><Cloud size={19} /><div><strong>Your work, saved automatically.</strong><p>Sign in on another device and pick up where you stop.</p></div></div><div className="login-benefit"><ShieldCheck size={19} /><div><strong>A private school workspace.</strong><p>No student records. No API keys. No password to remember.</p></div></div><div className="polygon-study" aria-hidden="true"><i /><i /><i /></div></section>
      <section className="login-card"><span className="eyebrow">Your school workspace</span><h2>{sentTo ? "Check your email." : "Welcome to GrantRadar."}</h2>
        <p className="muted">{sentTo ? <>Enter the sign-in code sent to <strong>{sentTo}</strong>. The code expires in 10 minutes.</> : "Enter your school email. We’ll send a code to sign in or create your free account."}</p>
        {error && <p className="notice error" role="alert">{error}</p>}
        <form onSubmit={sentTo ? verify : sendCode}>{sentTo ? <label className="field">Sign-in code<input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} placeholder="000000" /></label> : <label className="field">School email<input type="email" autoComplete="email" autoFocus maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} placeholder="you@school.org" /></label>}
          <button className="button primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={17} className="spin" /> : <ArrowRight size={17} />}{sentTo ? "Open my workspace" : "Send sign-in code"}</button>
        </form>{sentTo && <div className="login-options"><button type="button" className="text-button" disabled={busy} onClick={() => void sendCode()}>Send a new code</button><button type="button" className="text-button" disabled={busy} onClick={() => { setSentTo(null); setCode(""); setError(""); }}>Use another email</button></div>}
        <p className="privacy-note">Use the same email on each device. Each account has its own school workspace. <a href="/privacy">Privacy & your data</a></p>
      </section></div><footer className="login-footer"><span>GrantRadar · More possibilities for your school.</span><a href="/help">Getting started & help</a></footer>
  </main>;
}
