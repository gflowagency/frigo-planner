import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { anthropic, RECIPE_MODEL } from "@/lib/anthropic";
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
  if (!profile?.household_id) return NextResponse.json({ error: "no household" }, { status: 400 });

  const since = new Date();
  since.setDate(since.getDate() - 6);

  const [{ data: members }, { data: logs }] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, goal, daily_calorie_target, dietary_preferences")
      .eq("household_id", profile.household_id),
    supabase
      .from("nutrition_log")
      .select("food_name, calories_per_serving, servings, consumed_at")
      .eq("household_id", profile.household_id)
      .gte("consumed_at", since.toISOString().slice(0, 10))
      .order("consumed_at", { ascending: false }),
  ]);

  const membersText = (members ?? [])
    .map((m) => {
      const goal = (m.goal as Goal | null) ?? null;
      const parts = [`objectif ${goal ?? "non renseigné"}`, `~${m.daily_calorie_target ?? "?"} kcal/jour visées`];
      if (goal) parts.push(proteinGuidance(goal));
      if (m.dietary_preferences) parts.push(`préférences : ${m.dietary_preferences}`);
      return `- ${m.display_name} : ${parts.join(", ")}`;
    })
    .join("\n");

  const byDate = new Map<string, number>();
  for (const log of logs ?? []) {
    const kcal = Number(log.calories_per_serving) * Number(log.servings);
    byDate.set(log.consumed_at, (byDate.get(log.consumed_at) ?? 0) + kcal);
  }
  const logsText =
    Array.from(byDate.entries())
      .map(([date, kcal]) => `- ${date} : ${Math.round(kcal)} kcal loggées`)
      .join("\n") || "(rien de loggé cette semaine)";

  const { messages } = (await request.json().catch(() => ({}))) as {
    messages?: { role: "user" | "assistant"; content: string }[];
  };
  if (!messages?.length) return NextResponse.json({ error: "messages required" }, { status: 400 });

  const systemPrompt = `Tu es un coach sportif et nutritionnel bienveillant pour ce foyer, dans l'application Frigo Planner. Tu donnes des conseils généraux d'alimentation et d'activité physique, concrets et actionnables, adaptés au contexte ci-dessous. Tu n'es pas médecin : pour toute question médicale, de blessure, ou de symptôme, tu recommandes clairement de consulter un professionnel de santé plutôt que de diagnostiquer. Réponses courtes et directes, pas de discours creux.

Membres du foyer et leurs objectifs :
${membersText || "(profils non renseignés)"}

Ce qu'ils ont mangé cette semaine (7 derniers jours, total loggé par jour) :
${logsText}`;

  let message;
  try {
    message = await anthropic.messages.create({
      model: RECIPE_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("coach anthropic call failed:", detail);
    return NextResponse.json({ error: `Claude API error: ${detail}` }, { status: 502 });
  }

  const textBlock = message.content.find((block) => block.type === "text");
  const reply = textBlock && textBlock.type === "text" ? textBlock.text : "";

  return NextResponse.json({ reply });
}
