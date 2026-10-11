import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";

const config = z.object({ url: z.url(), key: z.string().min(1) }).parse({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

export async function createClient() {
  const store = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll() { return store.getAll(); },
      setAll(values) {
        try { for (const { name, value, options } of values) store.set(name, value, options); }
        catch { /* The proxy refreshes cookies for server components. */ }
      },
    },
  });
}
