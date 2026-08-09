import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic, currentSeasonFr, RECIPE_MODEL } from "@/lib/anthropic";
import { PROPOSE_WEEK_PLAN_TOOL, type ProposedRecipe } from "@/lib/recipe-tool";
import { proteinGuidance, type Goal } from "@/lib/nutrition";

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

  const [{ data: pantryItems }, { data: members }] = await Promise.all([
    supabase
      .from("pantry_items")
      .select("name, brand, category, quantity, unit")
      .eq("household_id", profile.household_id),
    supabase
      .from("profiles")
      .select("display_name, goal, daily_calorie_target, dietary_preferences")
      .eq("household_id", profile.household_id),
  ]);

  const stockText = (pantryItems ?? [])
    .map((i) => `- ${i.name}${i.brand ? ` (${i.brand})` : ""} : ${i.quantity} ${i.unit} [${i.category}]`)
    .join("\n") || "(stock vide pour l'instant)";

  const membersText = (members ?? [])
    .map((m) => {
      const goal = (m.goal as Goal | null) ?? null;
      const parts = [
        `objectif ${goal ?? "non renseigné"}`,
        `~${m.daily_calorie_target ?? "?"} kcal/jour visées`,
      ];
      if (goal) parts.push(proteinGuidance(goal));
      if (m.dietary_preferences) parts.push(`préférences : ${m.dietary_preferences}`);
      return `- ${m.display_name} : ${parts.join(", ")}`;
    })
    .join("\n");

  const season = currentSeasonFr();

  const prompt = `Tu es un nutritionniste et cuisinier qui aide un couple à manger sainement toute la semaine sans y passer des heures.

Saison actuelle : ${season}.

Membres du foyer et leurs objectifs :
${membersText || "(profils non renseignés)"}

Stock actuel du frigo et des placards :
${stockText}

Propose un dîner différent pour CHACUN des 7 prochains jours (aucun plat répété sur la semaine), en utilisant le stock actuel réparti intelligemment sur les 7 jours (ne suppose pas qu'un ingrédient en quantité limitée est disponible tous les jours — varie les sources de protéines et de féculents d'un jour à l'autre). Respecte strictement les préférences et contraintes alimentaires listées pour chaque membre (allergie, régime, aliments exclus) — ce sont des restrictions non négociables. Adapte les portions/calories aux objectifs du foyer. Donne des instructions de cuisson précises et des quantités exactes par personne pour chaque jour. Utilise l'outil propose_week_plan pour répondre.`;

  let message;
  try {
    message = await anthropic.messages.create({
      model: RECIPE_MODEL,
      max_tokens: 8192,
      tools: [PROPOSE_WEEK_PLAN_TOOL],
      tool_choice: { type: "tool", name: "propose_week_plan" },
      messages: [{ role: "user", content: prompt }],
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("plan-week anthropic call failed:", detail);
    return NextResponse.json({ error: `Claude API error: ${detail}` }, { status: 502 });
  }

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json({ error: "no plan generated" }, { status: 502 });
  }

  const days = (toolUse.input as { days: ProposedRecipe[] }).days;

  return NextResponse.json({ days, season });
}
