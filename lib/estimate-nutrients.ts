import { anthropic, RECIPE_MODEL } from "@/lib/anthropic";
import { ESTIMATE_NUTRIENTS_TOOL, ESTIMATE_PORTION_TOOL, type EstimatedNutrients } from "@/lib/nutrient-estimate-tool";

/**
 * Shared by the manual "estimate nutrients" HTTP route and the Alexa
 * webhook — the latter calls this directly rather than looping back
 * through its own API over HTTP.
 */
export async function estimateNutrients(
  name: string,
  opts: { brand?: string; mode?: "per100g" | "portion" } = {},
): Promise<EstimatedNutrients> {
  const isPortion = opts.mode === "portion";
  const tool = isPortion ? ESTIMATE_PORTION_TOOL : ESTIMATE_NUTRIENTS_TOOL;

  const prompt = isPortion
    ? `Aliment mangé : "${name}".

Estime les valeurs nutritionnelles TOTALES pour cette portion telle que décrite (déduis une quantité raisonnable si elle n'est pas précisée, ex: "une banane" ≈ 1 fruit moyen ≈ 120 g). Utilise l'outil ${tool.name} pour répondre, sans commentaire.`
    : `Produit : "${name}"${opts.brand ? ` (marque : ${opts.brand})` : ""}.

Estime ses valeurs nutritionnelles moyennes pour 100 g ou 100 ml, en te basant sur des produits comparables typiques du commerce. Utilise l'outil ${tool.name} pour répondre, sans commentaire.`;

  const message = await anthropic.messages.create({
    model: RECIPE_MODEL,
    max_tokens: 512,
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
    messages: [{ role: "user", content: prompt }],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("no estimate generated");

  return toolUse.input as EstimatedNutrients;
}
