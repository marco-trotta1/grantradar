export function GET() {
  return Response.json({ status: "ok", version: "2.0.0", federalSearch: "configured", webSearch: process.env.TAVILY_API_KEY ? "configured" : "not_configured" });
}
