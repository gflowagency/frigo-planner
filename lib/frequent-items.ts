import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type FrequentItemInfo = {
  barcode: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  unit: string;
  quantity: number;
};

/** Upserts (by app-level lookup, not a DB constraint) the running count used for "quick add". */
export async function trackFrequentItem(
  supabase: SupabaseServerClient,
  householdId: string,
  info: FrequentItemInfo,
) {
  const base = supabase.from("frequent_items").select("id, times_added").eq("household_id", householdId);
  const { data: existing } = info.barcode
    ? await base.eq("barcode", info.barcode).maybeSingle()
    : await base.is("barcode", null).ilike("name", info.name).maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("frequent_items")
      .update({
        times_added: existing.times_added + 1,
        last_added_at: new Date().toISOString(),
        brand: info.brand,
        category: info.category,
        unit: info.unit,
      })
      .eq("id", existing.id);
    if (error) console.error("trackFrequentItem (update) failed:", error.message);
    return;
  }

  const { error } = await supabase.from("frequent_items").insert({
    household_id: householdId,
    barcode: info.barcode,
    name: info.name,
    brand: info.brand,
    category: info.category,
    unit: info.unit,
    default_quantity: info.quantity,
  });
  if (error) console.error("trackFrequentItem (insert) failed:", error.message);
}
