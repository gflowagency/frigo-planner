"use server";

import { revalidatePath } from "next/cache";
import { currentHouseholdAndUser } from "@/lib/household";

export async function setMealPlanEntry(date: string, slot: "dejeuner" | "diner", favoriteRecipeId: string) {
  const { supabase, userId, householdId } = await currentHouseholdAndUser();

  const { data: favorite } = await supabase
    .from("favorite_recipes")
    .select("title, servings, estimated_calories_per_serving, ingredients, instructions")
    .eq("id", favoriteRecipeId)
    .single();
  if (!favorite) return;

  const { error } = await supabase.from("meal_plan").upsert(
    {
      household_id: householdId,
      plan_date: date,
      meal_slot: slot,
      title: favorite.title,
      servings: favorite.servings,
      estimated_calories_per_serving: favorite.estimated_calories_per_serving,
      ingredients: favorite.ingredients,
      instructions: favorite.instructions,
      favorite_recipe_id: favoriteRecipeId,
      created_by: userId,
    },
    { onConflict: "household_id,plan_date,meal_slot" },
  );
  if (error) console.error("setMealPlanEntry failed:", error.message);
  revalidatePath("/recipes/planning");
}

export async function clearMealPlanEntry(formData: FormData) {
  const { supabase } = await currentHouseholdAndUser();
  const id = String(formData.get("id"));
  await supabase.from("meal_plan").delete().eq("id", id);
  revalidatePath("/recipes/planning");
}
