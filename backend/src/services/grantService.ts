import axios, { AxiosError } from "axios";
import { prisma } from "../lib/prisma";

const GRANTS_GOV_BASE = "https://api.grants.gov/v1/api";
const BATCH_SIZE = 25; // stay well under 30 req/min limit
const DELAY_MS = 2500; // ~24 req/min

interface GrantsGovOpportunity {
  id: number;
  number: string;
  title: string;
  agencyName: string;
  openDate: string;
  closeDate: string | null;
  awardCeiling: number | null;
  awardFloor: number | null;
  description: string;
  eligibilities: string[];
  categories: string[];
  oppStatus: string;
}

interface GrantsGovSearchResponse {
  data: {
    hits: GrantsGovOpportunity[];
    total: number;
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchOpportunities(
  offset: number,
  rows: number,
  filters: Record<string, unknown> = {}
): Promise<GrantsGovSearchResponse["data"]> {
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post<GrantsGovSearchResponse>(
        `${GRANTS_GOV_BASE}/opportunities/search`,
        {
          oppStatuses: ["forecasted", "posted"],
          rows,
          offset,
          ...filters,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 15_000,
        }
      );
      return response.data.data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (attempt === maxRetries) throw err;
      const backoff = attempt * 3000;
      console.warn(
        `Grants.gov attempt ${attempt} failed (${axiosErr.message}), retrying in ${backoff}ms...`
      );
      await sleep(backoff);
    }
  }
  throw new Error("Unreachable");
}

function normalizeEligibility(raw: string[]): string[] {
  const map: Record<string, string> = {
    "99": "All",
    "00": "State governments",
    "01": "County governments",
    "02": "City governments",
    "04": "Special districts",
    "05": "Independent school districts",
    "06": "Public colleges/universities",
    "07": "Native American tribal governments",
    "08": "Public housing authorities",
    "11": "Small businesses",
    "12": "Nonprofits (no 501c3 restriction)",
    "13": "Nonprofits (501c3)",
    "20": "Private universities",
    "21": "Individuals",
    "22": "For-profit organizations",
    "23": "Small businesses (SBA criteria)",
    "25": "Other",
  };
  return raw.map((code) => map[code] ?? code);
}

async function upsertGrant(opp: GrantsGovOpportunity) {
  const externalId = `grants.gov-${opp.id}`;
  const deadline = opp.closeDate ? new Date(opp.closeDate) : null;

  await prisma.grant.upsert({
    where: { externalId },
    create: {
      externalId,
      title: opp.title,
      funder: opp.agencyName,
      deadline,
      amountMin: opp.awardFloor,
      amountMax: opp.awardCeiling,
      eligibility: normalizeEligibility(opp.eligibilities ?? []),
      description: opp.description || "No description provided.",
      category: opp.categories ?? [],
      sourceUrl: `https://www.grants.gov/search-results-detail/${opp.id}`,
      source: "grants.gov",
      isActive: opp.oppStatus !== "closed",
    },
    update: {
      title: opp.title,
      funder: opp.agencyName,
      deadline,
      amountMin: opp.awardFloor,
      amountMax: opp.awardCeiling,
      eligibility: normalizeEligibility(opp.eligibilities ?? []),
      description: opp.description || "No description provided.",
      category: opp.categories ?? [],
      isActive: opp.oppStatus !== "closed",
    },
  });
}

export async function syncGrants(
  targetCount = 100,
  filters: Record<string, unknown> = {}
): Promise<{ synced: number; errors: number }> {
  let synced = 0;
  let errors = 0;
  let offset = 0;

  console.log(`Starting grant sync (target: ${targetCount})...`);

  while (synced + errors < targetCount) {
    const remaining = targetCount - synced - errors;
    const rows = Math.min(BATCH_SIZE, remaining);

    const data = await searchOpportunities(offset, rows, filters);
    if (!data.hits || data.hits.length === 0) {
      console.log("No more results from Grants.gov.");
      break;
    }

    for (const opp of data.hits) {
      try {
        await upsertGrant(opp);
        synced++;
      } catch (err) {
        console.error(`Failed to upsert grant ${opp.id}:`, err);
        errors++;
      }
    }

    console.log(`Progress: ${synced} synced, ${errors} errors`);
    offset += data.hits.length;

    if (data.hits.length < rows) break; // last page
    if (synced + errors < targetCount) await sleep(DELAY_MS);
  }

  console.log(`Sync complete: ${synced} synced, ${errors} errors`);
  return { synced, errors };
}

export async function getGrantsForOrg(orgId: string, limit = 50) {
  return prisma.match.findMany({
    where: { orgId },
    orderBy: { score: "desc" },
    take: limit,
    include: {
      grant: true,
    },
  });
}

export async function getGrant(grantId: string) {
  return prisma.grant.findUnique({
    where: { id: grantId },
    include: {
      matches: true,
    },
  });
}
