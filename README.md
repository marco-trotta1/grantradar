# GrantRadar

GrantRadar helps U.S. schools find and review grants. The service is free to school staff.

[Open GrantRadar](https://grantradar-schools.vercel.app).

The production app uses Next.js, React, and strict TypeScript. Vercel hosts the app and its search routes.

## Use the app

1. Enter the school location, applicant type, grade bands, and funding priorities.
2. Set the student count, project funding goal, and application support level.
3. Search federal grants, browse the program directory, or search the web.
4. Open a grant to inspect its source, eligibility, and score factors.
5. Save grants, record notes, and update application stages.
6. Export a backup before you change browsers or clear browser data.

The profile, saved grants, and notes stay in one browser profile. There is no cloud account or cross-device synchronization.

## Run locally

```sh
npm ci --legacy-peer-deps
npm run dev
```

Open `http://localhost:3000`.

For a production build, run `npm run build`, then `npm start`.

The lockfile records the exact package versions. The install flag avoids an npm conflict between optional test peers.

## Search sources

Federal search uses the public Grants.gov `search2` and `fetchOpportunity` endpoints. These endpoints do not need an API key.

Search retrieves 12 federal results per page. The interface provides page controls. Detailed records load in batches of four requests.

The program directory contains six official program links. These records do not assert that an application cycle is open.

Web search uses Tavily when `TAVILY_API_KEY` is set on the server. Without the key, the interface provides a tailored external search link.

Web results remain unverified leads. The app does not invent deadlines, award amounts, or applicant requirements from snippets.

Federal responses cache for 15 minutes. Web responses cache for one hour. Provider failures appear in the interface.

Sources: [Grants.gov API guide](https://www.grants.gov/api/api-guide), [Tavily search reference](https://docs.tavily.com/documentation/api-reference/endpoint/search).

## Add the optional web search key

1. Create a Tavily API key in the provider dashboard.
2. Add `TAVILY_API_KEY` to the GrantRadar project’s production environment in Vercel.
3. Redeploy the production app.
4. Open Web search and confirm that results appear.

For local use, copy `.env.example` to `.env.local` and set the value there.

Do not commit credentials. Do not use a `NEXT_PUBLIC_` prefix. School staff do not need their own keys.

## Match scores

The score uses a fixed rubric. It does not use a language model or predict award probability.

| Factor | Maximum points |
| --- | ---: |
| Selected funding priorities | 35 |
| Listed applicant type | 25 |
| Listed service area | 15 |
| Award fit to the funding goal | 15 |
| Application timing | 10 |

A known applicant or grade mismatch caps the score at 30. A known service-area mismatch caps it at 20.

Unverified leads and unknown applicants cap the score at 59. Forecasted grants cap it at 69. Closed grants score zero.

The detail panel explains each factor and each adjustment. It also flags district applications, matching funds, and application support needs.

The project description stays local. Priority matching uses the selected categories. Title I status and rural setting trigger review notes.

The student count provides school context. It does not imply eligibility when a grant lacks a student-count rule.

## Data and controls

The app validates provider responses, profiles, imports, and source links at their boundaries. Source links must use HTTPS.

JSON backups contain the school profile and saved workspace. CSV exports include grant details, stages, and notes.

Calendar files use the published deadline date and a seven-day reminder. Confirm the exact cutoff time with the funder.

Saved grant details are snapshots. The interface displays the retrieval date. Confirm current rules before you apply.

Search sends only search terms and applicant type to Grants.gov. Tavily receives search terms, the state, and one selected priority.

The school name, student count, project description, notes, and saved grants are not included automatically in provider requests.

The server rejects browser requests from other sites. It permits 15 searches per client per minute in each server instance.

This request limit is a local safeguard. It does not provide a global spending limit across server instances.

Set a provider spending limit before enabling a paid search key. Use Vercel firewall rules if traffic requires a shared limit.

The font is self-hosted Geist, a sans serif in the requested Söhne style. A licensed local Söhne font takes priority if available.

## Verification

```sh
npm test
npm run build
npx playwright install chromium
npm start
# In another terminal:
npm run test:e2e
```

Unit tests cover scoring, official response shapes, provider requests, missing evidence, unsafe links, request limits, and exports.

Browser tests cover onboarding, saved notes, application stages, downloads, mobile width, modal controls, invalid backups, and browser isolation.

Browser tests use fixed program records. Live federal searches require a separate smoke check. Live Tavily checks require the owner’s key.

## Deployment

Vercel deploys the root Next.js app. The GitHub workflow checks tests, the production build, and browser workflows.

The original `frontend/`, `backend/`, and static assets remain as legacy source. The production deployment excludes these directories.

The former backend requires database and provider credentials. It is not part of the current app and receives no production traffic.

The previous GitHub Pages address redirects to the production app.
