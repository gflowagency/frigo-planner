"use server";

import { revalidatePath } from "next/cache";
import { currentHouseholdAndUser } from "@/lib/household";
import type { ProposedRecipe } from "@/lib/recipe-tool";

function next7Dates(): string[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

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

/** Saves a freshly AI-generated week plan (one dinner per day), overwriting any dinner already planned for those 7 days. */
export async function saveWeekPlan(days: ProposedRecipe[]) {
  const { supabase, userId, householdId } = await currentHouseholdAndUser();
  const dates = next7Dates();

  for (let i = 0; i < Math.min(days.length, 7); i++) {
    const recipe = days[i];
    const { error } = await supabase.from("meal_plan").upsert(
      {
        household_id: householdId,
        plan_date: dates[i],
        meal_slot: "diner",
        title: recipe.title,
        servings: recipe.servings,
        estimated_calories_per_serving: recipe.estimated_calories_per_serving,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        favorite_recipe_id: null,
        created_by: userId,
      },
      { onConflict: "household_id,plan_date,meal_slot" },
    );
    if (error) console.error("saveWeekPlan failed:", error.message);
  }

  revalidatePath("/recipes/planning");
}

/** Aggregates every missing ingredient across the next 7 days of planned meals into the shopping list. */
export async function addWeekMissingToShoppingList() {
  const { supabase, userId, householdId } = await currentHouseholdAndUser();
  const dates = next7Dates();

  const { data: entries } = await supabase
    .from("meal_plan")
    .select("ingredients")
    .eq("household_id", householdId)
    .in("plan_date", dates);

  type Ingredient = { name: string; quantity: string; have_in_stock: boolean };
  const missing = new Map<string, Ingredient>();
  for (const entry of entries ?? []) {
    for (const ing of (entry.ingredients as Ingredient[]) ?? []) {
      if (ing.have_in_stock) continue;
      const key = `${ing.name.toLowerCase()}|${ing.quantity}`;
      if (!missing.has(key)) missing.set(key, ing);
    }
  }

  const items = Array.from(missing.values());
  if (items.length === 0) return { added: 0 };

  const { error } = await supabase.from("shopping_items").insert(
    items.map((ing) => ({
      household_id: householdId,
      added_by: userId,
      name: ing.name,
      quantity: ing.quantity,
    })),
  );
  if (error) {
    console.error("addWeekMissingToShoppingList failed:", error.message);
    return { added: 0 };
  }

  revalidatePath("/shopping");
  return { added: items.length };
}
