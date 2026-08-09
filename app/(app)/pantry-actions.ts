"use server";

import { revalidatePath } from "next/cache";
import { currentHouseholdAndUser } from "@/lib/household";
import { trackFrequentItem } from "@/lib/frequent-items";
import { lookupProduct } from "@/lib/openfoodfacts";

export async function addPantryItem(formData: FormData) {
  const { supabase, userId, householdId } = await currentHouseholdAndUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const barcode = (formData.get("barcode") as string) || null;
  const quantity = Number(formData.get("quantity") ?? 1);
  const brand = (formData.get("brand") as string) || null;
  const category = (formData.get("category") as string) || "autre";
  const unit = (formData.get("unit") as string) || "piece";
  const nutriscore = (formData.get("nutriscore") as string) || null;
  const nutrientsRaw = (formData.get("nutrients") as string) || null;
  const nutrients = nutrientsRaw ? JSON.parse(nutrientsRaw) : null;

  // Re-scanning a barcode already in stock tops up the existing row instead
  // of creating a duplicate line for the same product.
  if (barcode) {
    const { data: existing } = await supabase
      .from("pantry_items")
      .select("id, quantity")
      .eq("household_id", householdId)
      .eq("barcode", barcode)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("pantry_items")
        .update({
          quantity: Number(existing.quantity) + quantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) console.error("addPantryItem (top-up) failed:", error.message);

      await trackFrequentItem(supabase, householdId, { barcode, name, brand, category, unit, quantity });
      revalidatePath("/dashboard");
      revalidatePath("/scan");
      return;
    }
  }

  const { error } = await supabase.from("pantry_items").insert({
    household_id: householdId,
    added_by: userId,
    barcode,
    name,
    brand,
    category,
    quantity,
    unit,
    image_url: (formData.get("imageUrl") as string) || null,
    nutriscore,
    nutrients,
  });
  if (error) console.error("addPantryItem (insert) failed:", error.message);

  await trackFrequentItem(supabase, householdId, { barcode, name, brand, category, unit, quantity });
  revalidatePath("/dashboard");
  revalidatePath("/scan");
}

export async function quickAddFrequentItem(formData: FormData) {
  const { supabase, userId, householdId } = await currentHouseholdAndUser();
  const id = String(formData.get("id"));

  const { data: freq } = await supabase.from("frequent_items").select("*").eq("id", id).single();
  if (!freq) return;

  if (freq.barcode) {
    const { data: existing } = await supabase
      .from("pantry_items")
      .select("id, quantity")
      .eq("household_id", householdId)
      .eq("barcode", freq.barcode)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("pantry_items")
        .update({
          quantity: Number(existing.quantity) + Number(freq.default_quantity),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) console.error("quickAddFrequentItem (top-up) failed:", error.message);
      await bumpFrequentItem(supabase, id);
      revalidatePath("/dashboard");
      return;
    }
  }

  const { error } = await supabase.from("pantry_items").insert({
    household_id: householdId,
    added_by: userId,
    barcode: freq.barcode,
    name: freq.name,
    brand: freq.brand,
    category: freq.category ?? "autre",
    quantity: freq.default_quantity,
    unit: freq.unit,
  });
  if (error) console.error("quickAddFrequentItem (insert) failed:", error.message);
  await bumpFrequentItem(supabase, id);
  revalidatePath("/dashboard");
}

async function bumpFrequentItem(supabase: Awaited<ReturnType<typeof currentHouseholdAndUser>>["supabase"], id: string) {
  const { data: current } = await supabase.from("frequent_items").select("times_added").eq("id", id).single();
  await supabase
    .from("frequent_items")
    .update({ times_added: (current?.times_added ?? 0) + 1, last_added_at: new Date().toISOString() })
    .eq("id", id);
}

/**
 * One-shot catch-up for items that were scanned before nutrient tracking
 * existed (or added while offline): re-queries OpenFoodFacts by barcode and
 * fills in nutriscore/nutrients without touching anything else (quantity,
 * name, etc. may have been edited by hand since).
 */
export async function backfillNutrients() {
  const { supabase, householdId } = await currentHouseholdAndUser();

  const { data: items } = await supabase
    .from("pantry_items")
    .select("id, barcode")
    .eq("household_id", householdId)
    .not("barcode", "is", null)
    .is("nutrients", null);

  if (!items || items.length === 0) return { updated: 0, total: 0 };

  let updated = 0;
  for (const item of items) {
    const product = await lookupProduct(item.barcode as string);
    if (!product.found || !product.nutrients) continue;

    const { error } = await supabase
      .from("pantry_items")
      .update({ nutriscore: product.nutriscore ?? null, nutrients: product.nutrients })
      .eq("id", item.id);
    if (error) console.error("backfillNutrients (update) failed:", error.message);
    else updated += 1;
  }

  revalidatePath("/dashboard");
  return { updated, total: items.length };
}

export async function deletePantryItem(formData: FormData) {
  const { supabase } = await currentHouseholdAndUser();
  const id = String(formData.get("id"));
  await supabase.from("pantry_items").delete().eq("id", id);
  revalidatePath("/dashboard");
}

export async function adjustPantryQuantity(formData: FormData) {
  const { supabase } = await currentHouseholdAndUser();
  const id = String(formData.get("id"));
  const delta = Number(formData.get("delta"));

  const { data: item } = await supabase
    .from("pantry_items")
    .select("quantity")
    .eq("id", id)
    .single();

  if (!item) return;

  const nextQuantity = Math.max(0, Number(item.quantity) + delta);

  if (nextQuantity === 0) {
    await supabase.from("pantry_items").delete().eq("id", id);
  } else {
    await supabase
      .from("pantry_items")
      .update({ quantity: nextQuantity, updated_at: new Date().toISOString() })
      .eq("id", id);
  }

  revalidatePath("/dashboard");
}
