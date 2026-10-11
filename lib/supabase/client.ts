import { createBrowserClient } from "@supabase/ssr";
import { z } from "zod";

const config = z.object({ url: z.url(), key: z.string().min(1) }).parse({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

export function createClient() { return createBrowserClient(config.url, config.key); }
