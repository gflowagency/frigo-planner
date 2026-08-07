import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const RECIPE_MODEL = "claude-sonnet-5";

export function currentSeasonFr(): "hiver" | "printemps" | "été" | "automne" {
  const month = new Date().getMonth() + 1;
  if ([12, 1, 2].includes(month)) return "hiver";
  if ([3, 4, 5].includes(month)) return "printemps";
  if ([6, 7, 8].includes(month)) return "été";
  return "automne";
}
