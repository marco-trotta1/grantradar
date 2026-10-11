import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(values) {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values) response.cookies.set(name, value, options);
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = { matcher: ["/", "/login", "/auth/:path*", "/api/workspace/:path*", "/api/account/:path*"] };
