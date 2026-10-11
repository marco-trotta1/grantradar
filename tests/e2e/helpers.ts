import { createServerClient } from "@supabase/ssr";
import type { BrowserContext } from "@playwright/test";

export async function signInTestAccount(context: BrowserContext, { second = false, reset = false }: { second?: boolean; reset?: boolean } = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const email = second ? process.env.E2E_SECOND_EMAIL : process.env.E2E_EMAIL;
  const password = second ? process.env.E2E_SECOND_PASSWORD : process.env.E2E_PASSWORD;
  if (!url || !key || !email || !password) throw new Error("Set the dedicated test account credentials before you run browser tests.");
  const origin = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
  const writes: { name: string; value: string }[] = [];
  const supabase = createServerClient(url, key, { cookies: { getAll: () => [], setAll: values => { writes.push(...values.map(({ name, value }) => ({ name, value }))); } } });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error("The dedicated test account cannot sign in.");
  if (reset) {
    const history = await supabase.from("workspace_history").delete().eq("user_id", data.user.id);
    const workspace = await supabase.from("school_workspaces").delete().eq("user_id", data.user.id);
    if (history.error || workspace.error) throw new Error("The dedicated test workspace cannot be reset.");
  }
  await context.addCookies(writes.map(cookie => ({ ...cookie, url: origin, sameSite: "Lax" as const, secure: origin.startsWith("https:") })));
  return { userId: data.user.id, supabase };
}
