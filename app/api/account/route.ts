import { createClient as createAdminClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { json, sameOrigin } from "@/lib/http";

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "Open GrantRadar to delete your account." }, 403);
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: "Sign in again before you delete your account." }, 401);
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return json({ error: "Account deletion is unavailable. Contact support." }, 503);
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: "Your account could not be deleted. Try again or contact support." }, 503);
  await supabase.auth.signOut({ scope: "local" });
  return json({ deleted: true });
}
