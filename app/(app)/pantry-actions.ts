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

  await supabase.from("pantry_items").insert({
    household_id: householdId,
    added_by: userId,
    barcode: (formData.get("barcode") as string) || null,
    name,
    brand: (formData.get("brand") as string) || null,
    category: (formData.get("category") as string) || "autre",
    quantity: Number(formData.get("quantity") ?? 1),
    unit: (formData.get("unit") as string) || "piece",
    image_url: (formData.get("imageUrl") as string) || null,
  });

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
