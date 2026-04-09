import Anthropic from "@anthropic-ai/sdk";
import { Grant, Organization, EffortLevel } from "@prisma/client";
import { prisma } from "../lib/prisma";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-20250514";

interface MatchResult {
  score: number;
  summary: string;
  effortLevel: EffortLevel;
  reasoning: string;
}

function formatOrgProfile(org: Organization): string {
  return `
Organization: ${org.name}
Type: ${org.orgType}
Mission: ${org.mission}
Location: ${org.city ? `${org.city}, ${org.state}` : org.location}
Annual Budget: ${org.budgetSize.replace(/_/g, " ")}
Staff Capacity: ${org.staffCapacity.replace(/_/g, " ")}
Focus Areas: ${org.focusAreas.join(", ")}
`.trim();
}

function formatGrantDetails(grant: Grant): string {
  const deadline = grant.deadline
    ? grant.deadline.toISOString().split("T")[0]
    : "Open / rolling";
  const amount =
    grant.amountMax
      ? `$${(grant.amountMin ?? 0).toLocaleString()} – $${grant.amountMax.toLocaleString()}`
      : "Not specified";

  return `
Grant Title: ${grant.title}
Funder: ${grant.funder}
Deadline: ${deadline}
Award Range: ${amount}
Categories: ${grant.category.join(", ") || "General"}
Eligible Applicants: ${grant.eligibility.join(", ") || "Not specified"}
Description: ${grant.description.slice(0, 1500)}
`.trim();
}

async function scoreAndSummarize(
  org: Organization,
  grant: Grant
): Promise<MatchResult> {
  const prompt = `You are a grant-matching expert helping under-resourced nonprofits and schools find relevant funding.

ORGANIZATION PROFILE:
${formatOrgProfile(org)}

GRANT OPPORTUNITY:
${formatGrantDetails(grant)}

Your task:
1. Score this grant's fit for this organization from 0 to 100, where:
   - 90-100: Exceptional fit — mission, eligibility, capacity all align perfectly
   - 70-89: Strong fit — most criteria match, minor gaps
   - 50-69: Moderate fit — some alignment but notable gaps
   - 30-49: Weak fit — limited alignment, significant barriers
   - 0-29: Poor fit — organization likely ineligible or very misaligned

2. Write a 3-sentence plain-English summary covering:
   - Sentence 1: What this grant funds (specific focus area, dollar amount if known)
   - Sentence 2: Who qualifies and any key eligibility requirements
   - Sentence 3: What applying typically requires (LOI, full proposal, reports, etc.)

3. Estimate application effort:
   - LOW: Simple online form, minimal attachments, < 5 pages
   - MEDIUM: Full proposal, budget narrative, 5-20 pages
   - HIGH: Complex federal application, multiple forms, audited financials required

4. Provide a brief (2-3 sentence) reasoning for your score.

Respond in this exact JSON format:
{
  "score": <number 0-100>,
  "summary": "<3-sentence summary>",
  "effortLevel": "LOW" | "MEDIUM" | "HIGH",
  "reasoning": "<2-3 sentence reasoning>"
}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Failed to parse Claude response: ${text.slice(0, 200)}`);
  }

  const parsed = JSON.parse(jsonMatch[0]) as MatchResult;

  // Validate
  if (
    typeof parsed.score !== "number" ||
    parsed.score < 0 ||
    parsed.score > 100
  ) {
    throw new Error(`Invalid score: ${parsed.score}`);
  }

  return {
    score: Math.round(parsed.score),
    summary: parsed.summary,
    effortLevel: parsed.effortLevel as EffortLevel,
    reasoning: parsed.reasoning,
  };
}

export async function runMatchingForOrg(
  orgId: string,
  options: { limit?: number; onlyNew?: boolean } = {}
): Promise<{ matched: number; errors: number }> {
  const { limit = 50, onlyNew = true } = options;

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new Error(`Organization ${orgId} not found`);

  // Find grants not yet matched (or all if onlyNew = false)
  const existingMatchedGrantIds = onlyNew
    ? (
        await prisma.match.findMany({
          where: { orgId },
          select: { grantId: true },
        })
      ).map((m) => m.grantId)
    : [];

  const grants = await prisma.grant.findMany({
    where: {
      isActive: true,
      id: { notIn: existingMatchedGrantIds },
      // Only consider grants with a deadline in the future or no deadline
      OR: [{ deadline: { gte: new Date() } }, { deadline: null }],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  console.log(
    `Running matching for org ${org.name}: ${grants.length} grants to process`
  );

  let matched = 0;
  let errors = 0;

  for (const grant of grants) {
    try {
      const result = await scoreAndSummarize(org, grant);

      await prisma.match.upsert({
        where: { orgId_grantId: { orgId, grantId: grant.id } },
        create: {
          orgId,
          grantId: grant.id,
          score: result.score,
          summary: result.summary,
          effortLevel: result.effortLevel,
          reasoning: result.reasoning,
        },
        update: {
          score: result.score,
          summary: result.summary,
          effortLevel: result.effortLevel,
          reasoning: result.reasoning,
        },
      });

      matched++;
      console.log(`  Matched "${grant.title.slice(0, 50)}..." → score ${result.score}`);

      // Small delay to respect rate limits
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`  Failed to match grant ${grant.id}:`, err);
      errors++;
    }
  }

  console.log(`Matching complete: ${matched} matched, ${errors} errors`);
  return { matched, errors };
}

export async function generateSummaryForGrant(
  grantId: string,
  orgId: string
): Promise<string> {
  const [grant, org] = await Promise.all([
    prisma.grant.findUnique({ where: { id: grantId } }),
    prisma.organization.findUnique({ where: { id: orgId } }),
  ]);

  if (!grant || !org) throw new Error("Grant or org not found");

  const result = await scoreAndSummarize(org, grant);

  await prisma.match.upsert({
    where: { orgId_grantId: { orgId, grantId } },
    create: {
      orgId,
      grantId,
      score: result.score,
      summary: result.summary,
      effortLevel: result.effortLevel,
      reasoning: result.reasoning,
    },
    update: {
      summary: result.summary,
      effortLevel: result.effortLevel,
      reasoning: result.reasoning,
    },
  });

  return result.summary;
}
