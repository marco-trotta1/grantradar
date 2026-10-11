import { z } from "zod";
import { createHash } from "node:crypto";
import { dateSchema, grantSchema, inferPriorities, safeUrlSchema, type Grant, type SchoolProfile } from "./domain";

const nullableText = z.string().nullish().transform(value => value ?? "");
const hitSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String), title: z.string().min(1), agency: nullableText,
  number: nullableText, oppStatus: nullableText, closeDate: nullableText,
});
const synopsisSchema = z.object({
  agencyName: nullableText, synopsisDesc: nullableText, applicantEligibilityDesc: nullableText,
  responseDateStr: nullableText, awardCeiling: z.union([z.string(), z.number()]).nullish(),
  awardFloor: z.union([z.string(), z.number()]).nullish(), costSharing: z.boolean().nullish(),
  applicantTypes: z.array(z.object({ id: z.string(), description: nullableText })).nullish(),
});
const detailSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String), opportunityTitle: z.string().min(1), ost: nullableText,
  synopsis: synopsisSchema.nullish(), forecast: synopsisSchema.nullish(),
});
const federalSearchSchema = z.object({ errorcode: z.literal(0), data: z.object({ oppHits: z.array(z.unknown()), hitCount: z.number().int().nonnegative() }) });

export function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&(?:ndash|mdash);/g, "-")
    .replace(/&(?:ldquo|rdquo|quot);/g, '"').replace(/&(?:lsquo|rsquo|apos);/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}

function dateFromSource(value: string): Grant["deadline"] {
  let candidate = value.slice(0, 10);
  const us = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(candidate);
  if (us) candidate = `${us[3]}-${us[1]}-${us[2]}`;
  const parsed = dateSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function amount(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1e12 ? numeric : null;
}

function status(value: string): Grant["status"] {
  if (value.toLowerCase() === "posted") return "posted";
  if (value.toLowerCase() === "forecasted") return "forecasted";
  if (["closed", "archived"].includes(value.toLowerCase())) return "closed";
  return "unverified";
}

export function normalizeSearchHit(input: unknown): Grant {
  const hit = hitSchema.parse(input);
  return grantSchema.parse({
    id: `federal-${hit.id}`, title: plainText(hit.title), funder: hit.agency,
    description: "Open the official notice for the full project and application requirements.",
    url: `https://www.grants.gov/search-results-detail/${encodeURIComponent(hit.id)}`, source: "federal", status: status(hit.oppStatus),
    deadline: dateFromSource(hit.closeDate), amountMin: null, amountMax: null,
    priorities: inferPriorities(hit.title), applicantTypes: [], eligibilityText: "Eligibility details are not available in this search record.",
    locations: [], grades: [], costSharing: null, retrievedAt: new Date().toISOString(),
  });
}

export function normalizeFederal(input: unknown): Grant {
  const detail = detailSchema.parse(input);
  const synopsis = detail.synopsis ?? detail.forecast;
  const description = plainText(synopsis?.synopsisDesc ?? "Read the full notice on Grants.gov.").slice(0, 20000);
  return grantSchema.parse({
    id: `federal-${detail.id}`, title: plainText(detail.opportunityTitle), funder: synopsis?.agencyName ?? "Federal agency",
    description, url: `https://www.grants.gov/search-results-detail/${encodeURIComponent(detail.id)}`,
    source: "federal", status: status(detail.ost), deadline: dateFromSource(synopsis?.responseDateStr ?? ""),
    amountMin: amount(synopsis?.awardFloor), amountMax: amount(synopsis?.awardCeiling),
    priorities: inferPriorities(`${detail.opportunityTitle} ${description}`),
    applicantTypes: synopsis?.applicantTypes?.map(applicant => applicant.id) ?? [],
    eligibilityText: plainText(synopsis?.applicantEligibilityDesc || synopsis?.applicantTypes?.map(applicant => applicant.description).join("; ") || "Check the full notice for eligible applicants.").slice(0, 10000),
    locations: [], grades: [], costSharing: synopsis?.costSharing ?? null, retrievedAt: new Date().toISOString(),
  });
}

async function publicPost({ endpoint, body }: { endpoint: "search2" | "fetchOpportunity"; body: Record<string, unknown> }): Promise<unknown> {
  const response = await fetch(`https://api.grants.gov/v1/api/${endpoint}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000), next: { revalidate: 900 },
  });
  if (!response.ok) throw new Error("The federal grant service is unavailable.");
  return response.json() as Promise<unknown>;
}

export async function federalSearch({ query, schoolType, page = 0 }: { query: string; schoolType: SchoolProfile["schoolType"]; page?: number }): Promise<{ grants: Grant[]; total: number; incomplete: number }> {
  const applicantFilters: Record<SchoolProfile["schoolType"], string> = {
    "public-school": "05|99|25", "public-district": "05|99|25", "public-charter": "05|99|25", "private-nonprofit": "12|99|25", tribal: "07|11|05|99|25",
  };
  const response = federalSearchSchema.parse(await publicPost({ endpoint: "search2", body: {
    keyword: query || "school", oppStatuses: "posted|forecasted", eligibilities: applicantFilters[schoolType], rows: 12, startRecordNum: page * 12,
  } }));
  const grants: Grant[] = [];
  let incomplete = 0;
  for (let offset = 0; offset < response.data.oppHits.length; offset += 4) {
    const batch = await Promise.allSettled(response.data.oppHits.slice(offset, offset + 4).map(async raw => {
      const hit = normalizeSearchHit(raw);
      try {
        const result = await publicPost({ endpoint: "fetchOpportunity", body: { opportunityId: hit.id.replace("federal-", "") } });
        const envelope = z.object({ errorcode: z.literal(0), data: z.unknown() }).parse(result);
        return normalizeFederal(envelope.data);
      } catch { incomplete++; return hit; }
    }));
    for (const item of batch) if (item.status === "fulfilled") grants.push(item.value); else incomplete++;
  }
  return { grants, total: response.data.hitCount, incomplete };
}

const webSchema = z.object({ results: z.array(z.object({ title: z.string(), url: z.string(), content: z.string().default("") })) });
export async function webSearch({ query, state, priority }: { query: string; state: string; priority: string }): Promise<Grant[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("Web search is not connected yet.");
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query: `${query || priority} grants funding K-12 schools ${state} application eligibility`,
      search_depth: "basic", max_results: 8, include_answer: false, include_raw_content: false, topic: "general" }),
    signal: AbortSignal.timeout(12000), next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error("Web search is unavailable. Try the federal search or open the web search link.");
  const result = webSchema.parse(await response.json());
  return result.results.flatMap(item => {
    const url = safeUrlSchema.safeParse(item.url);
    if (!url.success) return [];
    const title = plainText(item.title).slice(0, 500);
    if (!title) return [];
    return [grantSchema.parse({ id: `web-${createHash("sha256").update(url.data).digest("hex").slice(0, 20)}`, title, funder: new URL(url.data).hostname.replace(/^www\./, ""),
      description: plainText(item.content).slice(0, 10000), url: url.data, source: "web", status: "unverified",
      deadline: null, amountMin: null, amountMax: null, priorities: inferPriorities(`${title} ${item.content}`),
      applicantTypes: [], eligibilityText: "This web result needs an eligibility review on the source website.",
      locations: [], grades: [], costSharing: null, retrievedAt: new Date().toISOString() })];
  });
}
