import { Brand } from "@/components/onboarding";
export default function Privacy() {
  return <main id="main" className="privacy-page"><Brand /><h1>Your school’s data</h1>
    <p>GrantRadar is a free service for U.S. schools. It does not need student names, records, or personal information.</p>
    <h2>Your account and cloud workspace</h2><p>Supabase stores your account email, school profile, saved grants, application stages, and notes. The database runs in the U.S. West region.</p>
    <p>Your signed-in account can access its own workspace. Another account cannot access it. Use the same email on each device.</p>
    <p>Your work saves automatically. The account keeps its last 10 previous saves. You can restore a previous save in the school settings.</p>
    <h2>What stays on your device</h2><p>Session cookies keep you signed in. A recovery draft stays in browser storage until the cloud confirms the save.</p>
    <p>Sign out on shared computers. Do not let another person use your signed-in browser profile. Browser drafts are not encrypted separately.</p>
    <p>Clearing browser data removes sessions and pending drafts. It does not remove work that the cloud confirms as saved.</p>
    <p>Keep the page open until it shows “Saved to cloud”. Export a backup when you need an independent copy.</p>
    <h2>Sign-in emails</h2><p>Supabase uses Resend to deliver sign-in codes to your email address. Codes expire after 10 minutes. GrantRadar sends no marketing emails.</p>
    <h2>What search providers receive</h2><p>Federal searches send your search terms and applicant type to Grants.gov. Connected web searches send your search terms, state, and one funding priority to Tavily.</p>
    <p>The school name, student count, project description, saved grants, and notes are not included automatically in search requests.</p>
    <p>Do not put private information in search fields. An external search link sends the displayed search terms to Google.</p>
    <h2>Service records</h2><p>Vercel hosts the service and can record standard request information, including IP addresses and request URLs. GrantRadar adds no advertising trackers.</p>
    <p>Review the <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">Supabase privacy policy</a>, <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noreferrer">Resend privacy policy</a>, and <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">Vercel privacy policy</a>.</p>
    <p>Search providers publish the <a href="https://www.grants.gov/privacy" target="_blank" rel="noreferrer">Grants.gov privacy policy</a> and <a href="https://www.tavily.com/privacy" target="_blank" rel="noreferrer">Tavily privacy policy</a>.</p>
    <h2>Delete your data</h2><p>Select “Delete my account and data” in the school settings. Confirm with DELETE. This permanently removes the account, workspace, and save history.</p>
    <p>Previously downloaded backups and exports stay on your devices. Delete these copies separately if you no longer need them.</p>
    <p>Service providers can retain operational logs and backups under their own retention rules.</p>
    <h2>Grant information</h2><p>Scores indicate a possible fit. They do not confirm eligibility or predict an award. Confirm each application rule with the official source.</p>
    <a className="button primary" href="/">Return to GrantRadar</a>
  </main>;
}
