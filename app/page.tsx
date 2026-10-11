import { WorkspaceApp } from "@/components/workspace";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <WorkspaceApp account={{ id: user.id, email: user.email ?? "" }} />;
}
