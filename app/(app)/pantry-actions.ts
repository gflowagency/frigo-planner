"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function currentHouseholdAndUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  if (!profile?.household_id) redirect("/onboarding");

  return { supabase, userId: user.id, householdId: profile.household_id as string };
}

export async function addPantryItem(formData: FormData) {
  const { supabase, userId, householdId } = await currentHouseholdAndUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const barcode = (formData.get("barcode") as string) || null;
  const quantity = Number(formData.get("quantity") ?? 1);
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
    brand: (formData.get("brand") as string) || null,
    category: (formData.get("category") as string) || "autre",
    quantity,
    unit: (formData.get("unit") as string) || "piece",
    image_url: (formData.get("imageUrl") as string) || null,
    nutriscore,
    nutrients,
  });
  if (error) console.error("addPantryItem (insert) failed:", error.message);

  revalidatePath("/dashboard");
  revalidatePath("/scan");
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
