import { createClient } from "@/lib/supabase/server";
import { historySchema } from "@/lib/cloud";
import { json } from "@/lib/http";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Sign in to see previous saves." }, 401);
  const { data, error } = await supabase.from("workspace_history").select("revision,data,saved_at").eq("user_id", user.id).order("revision", { ascending: false }).limit(10);
  if (error) return json({ error: "Previous saves could not load. Try again." }, 503);
  const rows = historySchema.safeParse((data ?? []).map(row => ({ revision: row.revision, workspace: row.data, savedAt: row.saved_at })));
  if (!rows.success) return json({ error: "Previous saves need recovery. Contact support." }, 500);
  return json(rows.data);
}
