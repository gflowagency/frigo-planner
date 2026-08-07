import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic, currentSeasonFr, RECIPE_MODEL } from "@/lib/anthropic";
import { PROPOSE_RECIPES_TOOL, type ProposedRecipe } from "@/lib/recipe-tool";

type ChatMessage = { role: "user" | "assistant"; content: string };

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

  const { messages, previousRecipes } = (await request.json()) as {
    messages: ChatMessage[];
    previousRecipes: ProposedRecipe[];
  };

  const [{ data: pantryItems }, { data: members }] = await Promise.all([
    supabase
      .from("pantry_items")
      .select("name, brand, category, quantity, unit")
      .eq("household_id", profile.household_id),
    supabase
      .from("profiles")
      .select("display_name, dietary_preferences")
      .eq("household_id", profile.household_id),
  ]);

  const stockText = (pantryItems ?? [])
    .map((i) => `- ${i.name} : ${i.quantity} ${i.unit}`)
    .join("\n") || "(stock vide)";

  const preferencesText = (members ?? [])
    .filter((m) => m.dietary_preferences)
    .map((m) => `- ${m.display_name} : ${m.dietary_preferences}`)
    .join("\n");

  const systemContext = `Tu es un nutritionniste et cuisinier qui aide un couple à ajuster des propositions de recettes selon leurs retours.

Saison actuelle : ${currentSeasonFr()}.

Stock actuel :
${stockText}

Préférences et contraintes alimentaires (restrictions non négociables) :
${preferencesText || "(aucune renseignée)"}

Dernières recettes proposées :
${JSON.stringify(previousRecipes, null, 2)}

Le couple va te donner un retour (ex: "pas envie de poisson", "trop calorique", "plus rapide à préparer"). Ajuste et renvoie une liste complète de 3 recettes mises à jour via l'outil propose_recipes — ne renvoie jamais de texte libre, uniquement l'outil.`;

  const message = await anthropic.messages.create({
    model: RECIPE_MODEL,
    max_tokens: 4096,
    system: systemContext,
    tools: [PROPOSE_RECIPES_TOOL],
    tool_choice: { type: "tool", name: "propose_recipes" },
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json({ error: "no recipes generated" }, { status: 502 });
  }

  const recipes = (toolUse.input as { recipes: ProposedRecipe[] }).recipes;

  return NextResponse.json({ recipes });
}
