"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ageFromBirthDate, estimateDailyCalories, type ActivityLevel, type Goal } from "@/lib/nutrition";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = String(formData.get("displayName") ?? "").trim();
  const sex = String(formData.get("sex")) as "femme" | "homme" | "autre";
  const heightCm = Number(formData.get("heightCm"));
  const weightKg = Number(formData.get("weightKg"));
  const birthDate = String(formData.get("birthDate"));
  const activityLevel = String(formData.get("activityLevel")) as ActivityLevel;
  const goal = String(formData.get("goal")) as Goal;
  const dietaryPreferences = String(formData.get("dietaryPreferences") ?? "").trim();

  const dailyCalorieTarget = estimateDailyCalories({
    sex,
    heightCm,
    weightKg,
    ageYears: ageFromBirthDate(birthDate),
    activityLevel,
    goal,
  });

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      sex,
      height_cm: heightCm,
      weight_kg: weightKg,
      birth_date: birthDate,
      activity_level: activityLevel,
      goal,
      daily_calorie_target: dailyCalorieTarget,
      dietary_preferences: dietaryPreferences || null,
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings?message=Profil mis à jour.");
}
