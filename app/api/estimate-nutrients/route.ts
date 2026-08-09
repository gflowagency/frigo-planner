import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic, RECIPE_MODEL } from "@/lib/anthropic";
import { ESTIMATE_NUTRIENTS_TOOL, ESTIMATE_PORTION_TOOL, type EstimatedNutrients } from "@/lib/nutrient-estimate-tool";

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

  const isPortion = mode === "portion";
  const tool = isPortion ? ESTIMATE_PORTION_TOOL : ESTIMATE_NUTRIENTS_TOOL;

  const prompt = isPortion
    ? `Aliment mangé : "${name}".

Estime les valeurs nutritionnelles TOTALES pour cette portion telle que décrite (déduis une quantité raisonnable si elle n'est pas précisée, ex: "une banane" ≈ 1 fruit moyen ≈ 120 g). Utilise l'outil ${tool.name} pour répondre, sans commentaire.`
    : `Produit : "${name}"${brand ? ` (marque : ${brand})` : ""}.

Estime ses valeurs nutritionnelles moyennes pour 100 g ou 100 ml, en te basant sur des produits comparables typiques du commerce. Utilise l'outil ${tool.name} pour répondre, sans commentaire.`;

  let message;
  try {
    message = await anthropic.messages.create({
      model: RECIPE_MODEL,
      max_tokens: 512,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("estimate-nutrients anthropic call failed:", detail);
    return NextResponse.json({ error: `Claude API error: ${detail}` }, { status: 502 });
  }

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json({ error: "no estimate generated" }, { status: 502 });
  }

  const nutrients = toolUse.input as EstimatedNutrients;
  return NextResponse.json({ nutrients });
}
