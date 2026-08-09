import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function currentHouseholdAndUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (!profile?.household_id) redirect("/onboarding");

  return { supabase, userId: user.id, householdId: profile.household_id as string };
}
