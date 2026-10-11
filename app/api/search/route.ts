import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { catalog } from "@/lib/catalog";
import { federalSearch, webSearch } from "@/lib/providers";
import { priorities, profileSchema, states, type Grant } from "@/lib/domain";
import { allowSearch } from "@/lib/rate-limit";

export const maxDuration = 60;
const inputSchema = z.object({
  q: z.string().trim().max(120).default(""), mode: z.enum(["all", "federal", "directory", "web"]).default("all"),
  schoolType: profileSchema.shape.schoolType.default("public-school"),
  state: z.enum(states).default("ID"), priority: z.enum(priorities).default("STEM & technology"),
  page: z.coerce.number().int().min(0).max(100).default(0),
});

export async function GET(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "Open GrantRadar to run this search." }, { status: 403 });
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!allowSearch({ key: client })) return NextResponse.json({ error: "Too many searches. Wait one minute, then try again." }, { status: 429, headers: { "Retry-After": "60" } });
  const input = inputSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!input.success) return NextResponse.json({ error: "Check the search fields and try again." }, { status: 400 });
  const { q, mode, schoolType, state, priority, page } = input.data;
  let grants: Grant[] = [];
  let total = 0;
  let federalAvailable = false;
  let hasMore = false;
  const warnings: string[] = [];
  if (mode === "all" || mode === "directory") {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const programs = catalog.filter(grant => terms.every(term => `${grant.title} ${grant.description} ${grant.priorities.join(" ")}`.toLowerCase().includes(term)));
    grants.push(...programs); total += programs.length;
  }
  if (mode === "all" || mode === "federal") {
    try {
      const federal = await federalSearch({ query: q, schoolType, page });
      grants.push(...federal.grants); total += federal.total; federalAvailable = true;
      hasMore = federal.total > (page + 1) * 12 && page < 100;
      if (federal.incomplete) warnings.push("Some federal details are unavailable. Open the official notice before you apply.");
    } catch { warnings.push("Grants.gov is unavailable. Try again or browse the program directory."); }
  }
  if (mode === "web") {
    if (process.env.TAVILY_API_KEY) try { grants = await webSearch({ query: q, state, priority }); total = grants.length; }
    catch { warnings.push("Web search is unavailable. Try again or use the web search link."); }
  }
  grants = grants.filter((grant, index, array) => array.findIndex(item => item.url === grant.url) === index);
  return NextResponse.json({ grants, total, federalAvailable, webAvailable: Boolean(process.env.TAVILY_API_KEY), hasMore, warnings, searchedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "private, no-store" } });
}
