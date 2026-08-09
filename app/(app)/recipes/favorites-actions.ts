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

type DeductionEntry = {
  matched: string;
  unit: string | null;
  category: string | null;
  brand: string | null;
  pantryItemId: string | null;
  wasDeleted: boolean;
};

/**
 * Deleting a recipe that was marked "préparée" by mistake restores whatever
 * that consumption took out of stock, using the deduction log the consume
 * route saved on the row — same +1 amount that was subtracted, since the
 * deduction is always a flat 1 unit regardless of the recipe's quantity text.
 */
export async function deleteFavoriteRecipe(formData: FormData) {
  const { supabase, householdId, userId } = await currentHouseholdAndUser();
  const id = String(formData.get("id"));

  const { data: recipe } = await supabase
    .from("favorite_recipes")
    .select("last_deduction")
    .eq("id", id)
    .single();

  const deductionLog = (recipe?.last_deduction as DeductionEntry[] | null) ?? [];
  for (const entry of deductionLog) {
    if (entry.wasDeleted || !entry.pantryItemId) {
      await supabase.from("pantry_items").insert({
        household_id: householdId,
        name: entry.matched,
        unit: entry.unit ?? "piece",
        category: entry.category,
        brand: entry.brand,
        quantity: 1,
        added_by: userId,
      });
      continue;
    }
    const { data: current } = await supabase
      .from("pantry_items")
      .select("quantity")
      .eq("id", entry.pantryItemId)
      .maybeSingle();
    if (current) {
      await supabase
        .from("pantry_items")
        .update({ quantity: Number(current.quantity) + 1, updated_at: new Date().toISOString() })
        .eq("id", entry.pantryItemId);
    } else {
      await supabase.from("pantry_items").insert({
        household_id: householdId,
        name: entry.matched,
        unit: entry.unit ?? "piece",
        category: entry.category,
        brand: entry.brand,
        quantity: 1,
        added_by: userId,
      });
    }
  }

  await supabase.from("favorite_recipes").delete().eq("id", id);
  revalidatePath("/recipes/favorites");
  revalidatePath("/dashboard");
}
