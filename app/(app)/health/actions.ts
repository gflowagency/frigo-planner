"use server";

import { revalidatePath } from "next/cache";
import { currentHouseholdAndUser } from "@/lib/household";

export async function logFood(formData: FormData) {
  const { supabase, userId, householdId } = await currentHouseholdAndUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const mealSlot = (formData.get("mealSlot") as string) || null;
  const nutrientsRaw = (formData.get("nutrients") as string) || null;
  const nutrients = nutrientsRaw ? JSON.parse(nutrientsRaw) : null;
  const kcal = Number(nutrients?.kcal ?? 0);

  const { error } = await supabase.from("nutrition_log").insert({
    household_id: householdId,
    logged_by: userId,
    food_name: name,
    calories_per_serving: kcal,
    servings: 1,
    nutrients,
    source: "manual",
    meal_slot: mealSlot,
  });
  if (error) console.error("logFood failed:", error.message);

  revalidatePath("/health");
  revalidatePath("/health/history");
  revalidatePath("/settings");
}

export async function deleteFoodLog(formData: FormData) {
  const { supabase } = await currentHouseholdAndUser();
  const id = String(formData.get("id"));
  await supabase.from("nutrition_log").delete().eq("id", id);
  revalidatePath("/health");
  revalidatePath("/health/history");
  revalidatePath("/settings");
}
