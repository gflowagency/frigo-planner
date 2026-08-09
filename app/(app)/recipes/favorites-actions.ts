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

type ManualRecipe = {
  title: string;
  description: string;
  servings: number;
  ingredients: { name: string; quantity: string }[];
  instructions: string[];
};

/**
 * A recipe the user typed in themselves (not AI-suggested). All ingredients
 * are marked have_in_stock — the point of entering your own recipe here is
 * specifically so cooking it deducts everything listed, unlike AI
 * suggestions where that flag distinguishes "already have" from "to buy".
 */
export async function createManualRecipe(recipe: ManualRecipe) {
  const { supabase, userId, householdId } = await currentHouseholdAndUser();

  const { error } = await supabase.from("favorite_recipes").insert({
    household_id: householdId,
    added_by: userId,
    title: recipe.title,
    description: recipe.description || null,
    servings: recipe.servings,
    estimated_calories_per_serving: null,
    ingredients: recipe.ingredients.map((ing) => ({ ...ing, have_in_stock: true })),
    instructions: recipe.instructions,
  });
  if (error) console.error("createManualRecipe failed:", error.message);
  revalidatePath("/recipes/favorites");
}

export async function deleteFavoriteRecipe(formData: FormData) {
  const { supabase } = await currentHouseholdAndUser();
  const id = String(formData.get("id"));
  await supabase.from("favorite_recipes").delete().eq("id", id);
  revalidatePath("/recipes/favorites");
}
