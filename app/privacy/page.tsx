import { Brand } from "@/components/onboarding";
export default function Privacy() {
  return <main id="main" className="privacy-page"><Brand /><h1>Your school’s data</h1>
    <p>GrantRadar is a free service for U.S. schools. It does not need student names, records, or personal information.</p>
    <h2>What stays in your browser</h2><p>Your school profile, saved grants, application stages, and notes stay in this browser’s local storage. There is no cloud account or synchronization.</p>
    <p>People who use the same browser profile can see this data. Use a separate browser profile on a shared computer.</p>
    <p>Export a backup from the school settings. Clearing browser data removes your workspace. You can restore it from a backup.</p>
    <h2>What search providers receive</h2><p>Federal searches send your search terms and applicant type to Grants.gov. Connected web searches send your search terms, state, and one funding priority to Tavily.</p>
    <p>The school name, student count, project description, saved grants, and notes are not included automatically in search requests.</p>
    <p>Do not put private information in search fields. An external search link sends the displayed search terms to Google.</p>
    <h2>Service records</h2><p>Vercel hosts the service and can record standard request information, including IP addresses and request URLs. GrantRadar adds no advertising trackers.</p>
    <p>Review the <a href="https://www.grants.gov/privacy" target="_blank" rel="noreferrer">Grants.gov privacy policy</a>, <a href="https://www.tavily.com/privacy" target="_blank" rel="noreferrer">Tavily privacy policy</a>, and <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">Vercel privacy policy</a>.</p>
    <h2>Delete your data</h2><p>Use “Clear this browser’s data” in the school settings. This removes the profile and saved grants from this browser.</p>
    <h2>Grant information</h2><p>Scores indicate a possible fit. They do not confirm eligibility or predict an award. Confirm each application rule with the official source.</p>
    <a className="button primary" href="/">Return to GrantRadar</a>
  </main>;
}
