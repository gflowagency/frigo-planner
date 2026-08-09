import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAlexaRequest } from "@/lib/alexa-verify";
import { estimateNutrients } from "@/lib/estimate-nutrients";

// No user session exists for an Alexa-originated request — authorization is
// enforced entirely inside the alexa_link_account / alexa_log_food
// SECURITY DEFINER functions, not by a logged-in Supabase session.
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// Cert-chain fetch + verification + (on LogFoodIntent) a Claude call can add
// up; the platform default timeout is tight enough that it's worth raising.
export const maxDuration = 15;

function guessCurrentMealSlot(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "matin";
  if (hour < 15) return "midi";
  if (hour < 19) return "gouter";
  return "soir";
}

// Keeping the session open (shouldEndSession: false) lets the user chain
// several turns — "ouvre frigo planner" once, then "j'ai mangé une pomme",
// "j'ai mangé du comté", ... — without repeating the invocation each time.
// Alexa keeps the mic open a few seconds after a non-ending response.
function speak(text: string, keepListening = true) {
  return NextResponse.json({
    version: "1.0",
    response: {
      outputSpeech: { type: "PlainText", text },
      shouldEndSession: !keepListening,
    },
  });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const certUrl = request.headers.get("signaturecertchainurl");
  const signature256 = request.headers.get("signature-256");
  const signature = request.headers.get("signature");

  if (!certUrl || (!signature256 && !signature)) {
    console.error("Alexa request missing signature headers");
    return NextResponse.json({ error: "missing signature headers" }, { status: 401 });
  }

  try {
    await verifyAlexaRequest(certUrl, { signature256, signature }, rawBody);
  } catch (err) {
    console.error("Alexa signature verification failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  // Everything past this point is a verified, genuine Alexa request — from
  // here on, any bug should degrade to a spoken error, never an unhandled
  // crash (which Alexa reports to the user as a generic "communication
  // problem" with zero detail).
  try {
    const body = JSON.parse(rawBody);
    const alexaUserId: string | undefined = body.session?.user?.userId ?? body.context?.System?.user?.userId;
    const requestType = body.request?.type;

    if (!alexaUserId) return speak("Une erreur est survenue, réessaie plus tard.", false);

    if (requestType === "LaunchRequest") {
      const { data: linked } = await supabase.rpc("alexa_is_linked", { p_alexa_user_id: alexaUserId });
      return speak(
        linked
          ? "Dis-moi ce que tu as mangé."
          : "Dis-moi ce que tu as mangé. Si c'est la première fois, dis d'abord : lie mon compte, suivi de ton code à six chiffres, disponible dans les paramètres de Frigo Planner.",
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
        return speak("À bientôt.", false);
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
          return speak("Une erreur est survenue, réessaie plus tard.", false);
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

        const { data: result, error } = await supabase.rpc("alexa_log_food", {
          p_alexa_user_id: alexaUserId,
          p_food_name: food,
          p_kcal: kcal,
          p_nutrients: nutrients,
          p_meal_slot: guessCurrentMealSlot(),
        });
        if (error) {
          console.error("alexa_log_food failed:", error.message);
          return speak("Une erreur est survenue, réessaie plus tard.", false);
        }
        const linked = (result as { linked?: boolean; deducted?: string | null } | null)?.linked;
        if (!linked) {
          return speak(
            "Ton compte n'est pas encore lié. Dis : lie mon compte, suivi de ton code, disponible dans les paramètres de Frigo Planner.",
          );
        }

        const deducted = (result as { deducted?: string | null }).deducted;
        return speak(
          deducted
            ? `Noté : ${food}, environ ${Math.round(kcal)} calories. J'ai aussi retiré ${deducted} du stock.`
            : `Noté : ${food}, environ ${Math.round(kcal)} calories.`,
        );
      }
    }

    return speak("Je n'ai pas compris, réessaie.");
  } catch (err) {
    console.error("Alexa handler crashed:", err);
    return speak("Une erreur est survenue, réessaie plus tard.", false);
  }
}
