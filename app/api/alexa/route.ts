import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import alexaVerifier from "alexa-verifier";
import { estimateNutrients } from "@/lib/estimate-nutrients";

// No user session exists for an Alexa-originated request — authorization is
// enforced entirely inside the alexa_link_account / alexa_log_food
// SECURITY DEFINER functions, not by a logged-in Supabase session.
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

function guessCurrentMealSlot(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "matin";
  if (hour < 15) return "midi";
  if (hour < 19) return "gouter";
  return "soir";
}

function speak(text: string) {
  return NextResponse.json({
    version: "1.0",
    response: {
      outputSpeech: { type: "PlainText", text },
      shouldEndSession: true,
    },
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const certUrl = request.headers.get("signaturecertchainurl");
  const signature = request.headers.get("signature");

  if (!certUrl || !signature) {
    return NextResponse.json({ error: "missing signature headers" }, { status: 401 });
  }

  try {
    await alexaVerifier(certUrl, signature, rawBody);
  } catch (err) {
    console.error("Alexa signature verification failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody);
  const alexaUserId: string | undefined = body.session?.user?.userId ?? body.context?.System?.user?.userId;
  const requestType = body.request?.type;

  if (!alexaUserId) return speak("Une erreur est survenue, réessaie plus tard.");

  if (requestType === "LaunchRequest") {
    return speak(
      "Dis-moi ce que tu as mangé. Si c'est la première fois, dis d'abord : lie mon compte, suivi de ton code à six chiffres, disponible dans les paramètres de Frigo Planner.",
    );
  }

  if (requestType === "SessionEndedRequest") {
    return NextResponse.json({ version: "1.0", response: {} });
  }

  if (requestType === "IntentRequest") {
    const intentName: string | undefined = body.request.intent?.name;

    if (intentName === "AMAZON.HelpIntent") {
      return speak("Dis par exemple : j'ai mangé une pomme. Ou : lie mon compte, suivi de ton code.");
    }
    if (intentName === "AMAZON.StopIntent" || intentName === "AMAZON.CancelIntent") {
      return speak("À bientôt.");
    }

    if (intentName === "LinkAccountIntent") {
      const rawCode: string | undefined = body.request.intent.slots?.code?.value;
      const code = rawCode?.replace(/\D/g, "");
      if (!code) return speak("Je n'ai pas compris le code, réessaie.");

      const { data: linked, error } = await supabase.rpc("alexa_link_account", {
        p_code: code,
        p_alexa_user_id: alexaUserId,
      });
      if (error) {
        console.error("alexa_link_account failed:", error.message);
        return speak("Une erreur est survenue, réessaie plus tard.");
      }
      return speak(
        linked
          ? "Compte lié avec succès. Tu peux maintenant me dire ce que tu manges."
          : "Ce code n'est pas valide. Vérifie-le dans les paramètres de Frigo Planner.",
      );
    }

    if (intentName === "LogFoodIntent") {
      const food: string | undefined = body.request.intent.slots?.food?.value;
      if (!food) return speak("Je n'ai pas compris ce que tu as mangé, réessaie.");

      let kcal: number;
      let nutrients;
      try {
        nutrients = await estimateNutrients(food, { mode: "portion" });
        kcal = nutrients.kcal;
      } catch (err) {
        console.error("Alexa estimateNutrients failed:", err);
        return speak("Je n'ai pas réussi à estimer ça, réessaie dans un instant.");
      }

      const { data: logged, error } = await supabase.rpc("alexa_log_food", {
        p_alexa_user_id: alexaUserId,
        p_food_name: food,
        p_kcal: kcal,
        p_nutrients: nutrients,
        p_meal_slot: guessCurrentMealSlot(),
      });
      if (error) {
        console.error("alexa_log_food failed:", error.message);
        return speak("Une erreur est survenue, réessaie plus tard.");
      }
      if (!logged) {
        return speak(
          "Ton compte n'est pas encore lié. Dis : lie mon compte, suivi de ton code, disponible dans les paramètres de Frigo Planner.",
        );
      }

      return speak(`Noté : ${food}, environ ${Math.round(kcal)} calories.`);
    }
  }

  return speak("Je n'ai pas compris, réessaie.");
}
