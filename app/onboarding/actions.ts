"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ageFromBirthDate, estimateDailyCalories, type ActivityLevel, type Goal } from "@/lib/nutrition";

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const inviteCode = String(formData.get("inviteCode") ?? "").trim();

  let householdId: string;

  if (inviteCode) {
    const { data, error } = await supabase.rpc("join_household", { code: inviteCode });
    if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
    householdId = data as string;
  } else {
    const { data, error } = await supabase.rpc("create_household");
    if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
    householdId = data as string;
  }

  const sex = String(formData.get("sex")) as "femme" | "homme" | "autre";
  const heightCm = Number(formData.get("heightCm"));
  const weightKg = Number(formData.get("weightKg"));
  const birthDate = String(formData.get("birthDate"));
  const activityLevel = String(formData.get("activityLevel")) as ActivityLevel;
  const goal = String(formData.get("goal")) as Goal;

  const dailyCalorieTarget = estimateDailyCalories({
    sex,
    heightCm,
    weightKg,
    ageYears: ageFromBirthDate(birthDate),
    activityLevel,
    goal,
  });

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      household_id: householdId,
      sex,
      height_cm: heightCm,
      weight_kg: weightKg,
      birth_date: birthDate,
      activity_level: activityLevel,
      goal,
      daily_calorie_target: dailyCalorieTarget,
      onboarded: true,
    })
    .eq("id", user.id);

  if (profileError) {
    redirect(`/onboarding?error=${encodeURIComponent(profileError.message)}`);
  }

  redirect("/dashboard");
}
