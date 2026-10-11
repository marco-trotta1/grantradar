export function GET() {
  return Response.json({ status: "ok", version: "3.0.0", federalSearch: "configured", webSearch: process.env.TAVILY_API_KEY ? "configured" : "not_configured", accounts: process.env.NEXT_PUBLIC_SUPABASE_URL ? "configured" : "not_configured" });
}
