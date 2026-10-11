import { redirect } from "next/navigation";
import { Login } from "@/components/login";
import { createClient } from "@/lib/supabase/server";

export default async function SignIn() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");
  return <Login />;
}
