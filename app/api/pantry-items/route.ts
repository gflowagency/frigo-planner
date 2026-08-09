import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { trackFrequentItem } from "@/lib/frequent-items";

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
  if (!profile?.household_id) return NextResponse.json({ error: "no household" }, { status: 400 });
  const householdId = profile.household_id;

  const body = await request.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const barcode = body.barcode || null;
  const quantity = Number(body.quantity ?? 1);
  const brand = body.brand || null;
  const category = body.category || "autre";
  const unit = body.unit || "piece";
  const imageUrl = body.imageUrl || null;
  const nutriscore = body.nutriscore || null;
  const nutrients = body.nutrients || null;

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
        .update({ quantity: Number(existing.quantity) + quantity, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) console.error("pantry-items POST (top-up) failed:", error.message);
      await trackFrequentItem(supabase, householdId, { barcode, name, brand, category, unit, quantity });
      return NextResponse.json({ ok: true });
    }
  }

  const { error } = await supabase.from("pantry_items").insert({
    household_id: householdId,
    added_by: user.id,
    barcode,
    name,
    brand,
    category,
    quantity,
    unit,
    image_url: imageUrl,
    nutriscore,
    nutrients,
  });
  if (error) {
    console.error("pantry-items POST (insert) failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await trackFrequentItem(supabase, householdId, { barcode, name, brand, category, unit, quantity });
  return NextResponse.json({ ok: true });
}
