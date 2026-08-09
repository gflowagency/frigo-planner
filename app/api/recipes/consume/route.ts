import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findMatchingItem } from "@/lib/pantry-match";

type IngredientInput = { name: string; have_in_stock: boolean };

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();
  if (!profile?.household_id) {
    return NextResponse.json({ error: "no household" }, { status: 400 });
  }

  const { ingredients, title, caloriesPerServing, servings, recipeId } = (await request.json()) as {
    ingredients: IngredientInput[];
    title?: string;
    caloriesPerServing?: number;
    servings?: number;
    recipeId?: string;
  };

  const { data: pantryItems } = await supabase
    .from("pantry_items")
    .select("id, name, quantity, unit, category, brand")
    .eq("household_id", profile.household_id);

  const deducted: { ingredient: string; matched: string }[] = [];
  // Recorded so a mistaken "marquer comme préparée" can be reversed by
  // restoring exactly what was taken out, instead of the user having to
  // re-add ingredients by hand.
  const deductionLog: {
    matched: string;
    unit: string | null;
    category: string | null;
    brand: string | null;
    pantryItemId: string | null;
    wasDeleted: boolean;
  }[] = [];
  const notFound: string[] = [];

  for (const ingredient of ingredients.filter((i) => i.have_in_stock)) {
    const match = findMatchingItem(ingredient.name, pantryItems ?? []);
    if (!match) {
      notFound.push(ingredient.name);
      continue;
    }

    const nextQuantity = Math.max(0, Number(match.quantity) - 1);
    const wasDeleted = nextQuantity === 0;
    if (wasDeleted) {
      await supabase.from("pantry_items").delete().eq("id", match.id);
    } else {
      await supabase
        .from("pantry_items")
        .update({ quantity: nextQuantity, updated_at: new Date().toISOString() })
        .eq("id", match.id);
    }
    deducted.push({ ingredient: ingredient.name, matched: match.name });
    deductionLog.push({
      matched: match.name,
      unit: match.unit ?? null,
      category: match.category ?? null,
      brand: match.brand ?? null,
      pantryItemId: wasDeleted ? null : match.id,
      wasDeleted,
    });
    // Prevent matching the same stock row twice within one recipe.
    pantryItems!.splice(pantryItems!.indexOf(match), 1);
  }

  if (recipeId) {
    const { error } = await supabase
      .from("favorite_recipes")
      .update({ last_deduction: deductionLog })
      .eq("id", recipeId)
      .eq("household_id", profile.household_id);
    if (error) console.error("failed to record last_deduction:", error.message);
  }

  if (title && caloriesPerServing) {
    const { error } = await supabase.from("nutrition_log").insert({
      household_id: profile.household_id,
      logged_by: user.id,
      food_name: title,
      calories_per_serving: caloriesPerServing,
      servings: servings ?? 1,
      source: "recipe",
      meal_slot: "soir",
    });
    if (error) console.error("nutrition_log insert failed:", error.message);
  }

  return NextResponse.json({ deducted, notFound });
}
