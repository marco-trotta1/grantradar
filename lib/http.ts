import { NextResponse, type NextRequest } from "next/server";

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return false;
  try {
    const source = new URL(origin);
    return source.origin === origin && source.host === request.headers.get("host") && source.protocol === request.nextUrl.protocol;
  } catch { return false; }
}

export async function readBody(request: NextRequest): Promise<unknown> {
  const text = await request.text();
  if (Buffer.byteLength(text) > 10_000_000) throw new Error("The workspace is too large.");
  return JSON.parse(text) as unknown;
}
