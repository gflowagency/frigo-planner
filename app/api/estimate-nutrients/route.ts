import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { estimateNutrients } from "@/lib/estimate-nutrients";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { name, brand, mode } = (await request.json().catch(() => ({}))) as {
    name?: string;
    brand?: string;
    mode?: "per100g" | "portion";
  };
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  try {
    const nutrients = await estimateNutrients(name, { brand, mode });
    return NextResponse.json({ nutrients });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("estimate-nutrients failed:", detail);
    return NextResponse.json({ error: `Claude API error: ${detail}` }, { status: 502 });
  }
}
