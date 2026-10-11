# GrantRadar

GrantRadar helps U.S. schools find, score, and track grants. The service is free to school staff.

[Open GrantRadar](https://grantradar-schools.vercel.app) · [School help](https://grantradar-schools.vercel.app/help)

The app uses Next.js, React, strict TypeScript, Supabase, and Vercel. Resend sends the sign-in codes.

## Use the app

1. Enter your school email and the sign-in code.
2. Enter the school location, applicant type, grade bands, and funding priorities.
3. Set the student count, project funding goal, and application support level.
4. Search federal grants, browse the program directory, or open a tailored web search.
5. Inspect each grant's source, eligibility, and score factors.
6. Save grants, record notes, and update application stages.

Each email has one private school workspace. Use the same email on each device. Separate accounts do not share a workspace.

Cloud saves include the school profile, saved grants, application stages, and notes. Schools need no API keys or passwords.

## Cloud storage and recovery

The app keeps a recovery draft on the device before each save. It removes the draft after the cloud confirms the save.

Failed saves retain the draft through a reload. Retry the save after the connection returns. Wait for “Saved to cloud” before closing.

Each save checks the cloud revision. Conflicting devices require an explicit choice. Staff can download both versions before choosing.

The cloud retains the previous 10 saves. Restore them from Your school. JSON backups and CSV exports remain available.

An existing browser workspace moves into an account only after staff select the import control. The app preserves it until cloud confirmation.

Each workspace supports 500 saved grants and 10 MB of data. Deleting an account removes its cloud workspace and history.

Do not enter student records, passwords, or confidential student information. Sign out on shared computers.

## Search and scores

Federal search uses the public Grants.gov `search2` and `fetchOpportunity` endpoints. These endpoints need no API key.

Federal search retrieves 12 results per page. Detailed records load in batches of four requests. Responses cache for 15 minutes.

The program directory contains six official program links. These records do not assert that an application cycle is open.

Web search provides an external Google link tailored to the school location and funding priority. Staff can add and score external grant links.

Tavily remains optional. Set `TAVILY_API_KEY` on the server and redeploy to enable results inside the app.

Web leads remain unverified. The app does not invent deadlines, award amounts, or eligibility rules from search snippets.

The match score uses a fixed rubric. It does not use a language model or predict award probability.

| Factor | Maximum points |
| --- | ---: |
| Selected funding priorities | 35 |
| Listed applicant type | 25 |
| Listed service area | 15 |
| Award fit to the funding goal | 15 |
| Application timing | 10 |

A known applicant or grade mismatch caps the score at 30. A known service-area mismatch caps it at 20.

Unverified leads and unknown applicants cap the score at 59. Forecasted grants cap it at 69. Closed grants score zero.

The detail panel explains each adjustment. It flags district applications, matching funds, and application support needs.

Title I status and rural setting trigger review notes. The student count provides context without implying eligibility.

Saved grant details are snapshots. Confirm the current cycle, rules, and exact deadline with the funder before applying.

Sources: [Grants.gov API guide](https://www.grants.gov/api/api-guide), [Tavily search reference](https://docs.tavily.com/documentation/api-reference/endpoint/search).

## Run locally

```sh
npm ci --legacy-peer-deps
cp .env.example .env.local
# Set the Supabase variables in .env.local.
npm run dev
```

Open `http://localhost:3000`. For a production build, run `npm run build`, then `npm start`.

The public Supabase URL and publishable key identify the project. Row policies restrict database access to the authenticated owner.

The server secret supports account deletion. Keep it on the server. Never give it a `NEXT_PUBLIC_` prefix.

The lockfile records the exact package versions. The install flag resolves the optional test peer conflict.

The self-hosted Geist font follows the requested Söhne style. The custom logo uses an original polygon aperture.

## Provision an environment

1. Create a Supabase project.
2. Link it with `supabase link --project-ref PROJECT_REF`.
3. Apply the migration with `supabase db push`.
4. Add the three Supabase variables from `.env.example` to Vercel.
5. Configure the Supabase email provider with a verified SMTP sender.
6. Set the sign-in and confirmation templates to display `{{ .Token }}`.
7. Set the code length to six digits and the expiry to 600 seconds.
8. Enable email signup and email confirmation. Disable anonymous signup.
9. Set the production site URL and the allowed local URLs.
10. Deploy the app and run the email acceptance script.

The production sender is `signin@mail.grantradar.irrigant.xyz`. Its Resend domain is verified. Production secrets remain in Vercel and Supabase.

The local `supabase/config.toml` supports local development. It does not contain the production SMTP password.

## Verify a release

```sh
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm start
# In another terminal:
npm run test:e2e
supabase db advisors --linked --level warn --fail-on error
```

Browser tests use two isolated, confirmed QA accounts. Put their credentials in `.env.e2e.local`.

Set `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_SECOND_EMAIL`, and `E2E_SECOND_PASSWORD`. Each account must belong to the configured Supabase project.

The tests clear these accounts' workspaces. Never use a school account. CI uses separate QA accounts and does not receive the server secret.

GitHub secrets contain the four QA credentials, the public Supabase URL, and the publishable key. Fork workflows do not receive these secrets.

Unit tests cover scoring, providers, exports, input validation, revision recovery, and origin checks.

Browser tests cover school workflows, cross-device storage, account isolation, save conflicts, failed saves, migration, history, and sign-out.

Search responses use fixed records during browser tests. Auth and cloud storage use the real GrantRadar project with isolated QA accounts.

For email acceptance, add `RESEND_API_KEY` to the ignored `.env.mail.local` file. Run `node scripts/verify-email.mjs`.

The script sends to Resend's simulated recipient. It verifies the code, history retention, and account deletion. It removes its temporary account.

Set `TEST_BASE_URL` to verify a deployed app. A separate smoke check verifies the live federal provider.

## Owner operations

Vercel deploys the root app. GitHub checks unit tests, the production build, and browser workflows before release.

The current services use free plans. Check provider usage and delivery errors before inviting a large school group.

Resend permits 100 emails per day and 3,000 per month on its free plan. Supabase limits GrantRadar to 60 sign-in emails per hour.

Source: [Resend free tier](https://resend.com/blog/new-free-tier).

Supabase can pause a free project after one week of inactivity. An owner must restore it if that occurs.

Source: [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

Free plans do not provide an uptime guarantee. Monitor the service, retain database exports, and review provider account notices.

School staff need no infrastructure setup. The owner retains responsibility for provider accounts, quotas, recovery, and support.

The search route permits 15 requests per client per minute in each server instance. This limit does not provide a global spending cap.

Set a provider spending cap before enabling a paid search key. Use Vercel firewall rules if traffic requires a shared request limit.

The school name, student count, project description, notes, and saved grants are not included automatically in search provider requests.

The help page links to GitHub support. A GitHub account is required to open an issue. Do not put private school data in issues.

The original `frontend/`, `backend/`, and static assets remain as legacy source. Vercel excludes them from production.

The previous GitHub Pages address redirects to the production app.
