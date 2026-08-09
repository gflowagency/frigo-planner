"use server";

import { revalidatePath } from "next/cache";
import { currentHouseholdAndUser } from "@/lib/household";
import type { ProposedRecipe } from "@/lib/recipe-tool";

export async function saveFavoriteRecipe(recipe: ProposedRecipe) {
  const { supabase, userId, householdId } = await currentHouseholdAndUser();

  const { error } = await supabase.from("favorite_recipes").insert({
    household_id: householdId,
    added_by: userId,
    title: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    estimated_calories_per_serving: recipe.estimated_calories_per_serving,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
  });
  if (error) console.error("saveFavoriteRecipe failed:", error.message);
  revalidatePath("/recipes/favorites");
}

export async function deleteFavoriteRecipe(formData: FormData) {
  const { supabase } = await currentHouseholdAndUser();
  const id = String(formData.get("id"));
  await supabase.from("favorite_recipes").delete().eq("id", id);
  revalidatePath("/recipes/favorites");
}
