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

/**
 * Combined dietary preferences of every member of the current user's
 * household (not just their own), used to cross-check scanned products
 * against allergies/restrictions regardless of who's doing the scanning.
 * Returns null outside a household (not onboarded yet, or logged out).
 */
export async function currentHouseholdDietaryPreferences(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("household_id").eq("id", user.id).single();
  if (!profile?.household_id) return null;

  const { data: householdProfiles } = await supabase
    .from("profiles")
    .select("dietary_preferences")
    .eq("household_id", profile.household_id);

  return (
    (householdProfiles ?? [])
      .map((p) => p.dietary_preferences)
      .filter(Boolean)
      .join("; ") || null
  );
}

/** Sum of every household member's daily calorie target — the household-level baseline used across the health dashboard. */
export async function currentHouseholdCalorieTarget(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: profile } = await supabase.from("profiles").select("household_id").eq("id", user.id).single();
  if (!profile?.household_id) return 0;

  const { data: householdProfiles } = await supabase
    .from("profiles")
    .select("daily_calorie_target")
    .eq("household_id", profile.household_id);

  return (householdProfiles ?? []).reduce((sum, p) => sum + (p.daily_calorie_target ?? 0), 0);
}
