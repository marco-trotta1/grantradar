import { type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { emptyCloud, saveWorkspaceSchema, timestampSchema } from "@/lib/cloud";
import { json, readBody, sameOrigin } from "@/lib/http";

const rowSchema = z.object({ data: saveWorkspaceSchema.shape.workspace, revision: saveWorkspaceSchema.shape.revision, updated_at: timestampSchema });

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Sign in to open your school workspace." }, 401);
  const { data, error } = await supabase.from("school_workspaces").select("data,revision,updated_at").eq("user_id", user.id).maybeSingle();
  if (error) return json({ error: "Your workspace could not load. Try again." }, 503);
  if (!data) return json(emptyCloud);
  const row = rowSchema.safeParse(data);
  if (!row.success) return json({ error: "Your saved workspace needs recovery. Contact support." }, 500);
  return json({ workspace: row.data.data, revision: row.data.revision, updatedAt: row.data.updated_at });
}

export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "Open GrantRadar to save your work." }, 403);
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Sign in again to save your work. Your draft stays on this device." }, 401);
  let body: unknown;
  try { body = await readBody(request); }
  catch { return json({ error: "Choose a valid workspace below 10 MB." }, 400); }
  const input = saveWorkspaceSchema.safeParse(body);
  if (!input.success) return json({ error: "Check the school workspace and try again." }, 400);
  const { data, error } = await supabase.rpc("save_school_workspace", { p_workspace: input.data.workspace, p_revision: input.data.revision }).retry(false).abortSignal(AbortSignal.timeout(10000)).single();
  if (error?.code === "PT409") return json({ error: "Another device saves a newer version. Review both versions before you continue." }, 409);
  if (error) return json({ error: "Cloud saving is unavailable. Your draft stays on this device. Try again." }, 503);
  const row = rowSchema.safeParse(data);
  if (!row.success) return json({ error: "The save could not be confirmed. Try again." }, 503);
  return json({ workspace: row.data.data, revision: row.data.revision, updatedAt: row.data.updated_at });
}
