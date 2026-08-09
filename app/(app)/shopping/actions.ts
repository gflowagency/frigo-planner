"use server";

import { revalidatePath } from "next/cache";
import { currentHouseholdAndUser } from "@/lib/household";

export async function addShoppingItem(formData: FormData) {
  const { supabase, userId, householdId } = await currentHouseholdAndUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const quantity = (formData.get("quantity") as string)?.trim() || null;

  const { error } = await supabase.from("shopping_items").insert({
    household_id: householdId,
    added_by: userId,
    name,
    quantity,
  });
  if (error) console.error("addShoppingItem failed:", error.message);
  revalidatePath("/shopping");
}

export async function toggleShoppingItem(formData: FormData) {
  const { supabase } = await currentHouseholdAndUser();
  const id = String(formData.get("id"));
  const checked = formData.get("checked") === "true";
  const { error } = await supabase.from("shopping_items").update({ checked: !checked }).eq("id", id);
  if (error) console.error("toggleShoppingItem failed:", error.message);
  revalidatePath("/shopping");
}

export async function deleteShoppingItem(formData: FormData) {
  const { supabase } = await currentHouseholdAndUser();
  const id = String(formData.get("id"));
  await supabase.from("shopping_items").delete().eq("id", id);
  revalidatePath("/shopping");
}

export async function clearCheckedShoppingItems() {
  const { supabase, householdId } = await currentHouseholdAndUser();
  await supabase.from("shopping_items").delete().eq("household_id", householdId).eq("checked", true);
  revalidatePath("/shopping");
}

export async function addIngredientsToShoppingList(ingredients: { name: string; quantity: string }[]) {
  const { supabase, userId, householdId } = await currentHouseholdAndUser();
  if (ingredients.length === 0) return;

  const { error } = await supabase.from("shopping_items").insert(
    ingredients.map((ing) => ({
      household_id: householdId,
      added_by: userId,
      name: ing.name,
      quantity: ing.quantity,
    })),
  );
  if (error) console.error("addIngredientsToShoppingList failed:", error.message);
  revalidatePath("/shopping");
}
