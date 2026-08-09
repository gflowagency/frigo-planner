function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

type RestrictionRule = {
  label: string;
  // Words in the user's free-text preferences that mean "I care about this".
  preferenceKeywords: string[];
  // OpenFoodFacts' structured allergens_tags this restriction maps to.
  allergenTags?: string[];
  // Fallback: raw words to look for in the ingredients text (for
  // restrictions OFF doesn't track as a formal allergen, e.g. pork).
  ingredientKeywords?: string[];
};

const RESTRICTION_RULES: RestrictionRule[] = [
  { label: "gluten", preferenceKeywords: ["gluten"], allergenTags: ["en:gluten"] },
  {
    label: "lait / lactose",
    preferenceKeywords: ["lactose", "lait", "laitier"],
    allergenTags: ["en:milk"],
  },
  {
    label: "fruits à coque",
    preferenceKeywords: ["fruit a coque", "fruits a coque", "noix", "amande", "noisette", "cajou", "pistache"],
    allergenTags: ["en:nuts"],
  },
  { label: "arachide", preferenceKeywords: ["arachide", "cacahuete"], allergenTags: ["en:peanuts"] },
  { label: "œuf", preferenceKeywords: ["oeuf"], allergenTags: ["en:eggs"] },
  {
    label: "porc",
    preferenceKeywords: ["porc", "cochon", "sans porc"],
    ingredientKeywords: ["porc", "jambon", "lard", "bacon", "saindoux", "chorizo", "salami", "porcine"],
  },
  { label: "poisson", preferenceKeywords: ["poisson"], allergenTags: ["en:fish"] },
  {
    label: "fruits de mer",
    preferenceKeywords: ["crustace", "fruits de mer", "mollusque"],
    allergenTags: ["en:crustaceans", "en:molluscs"],
  },
  { label: "soja", preferenceKeywords: ["soja", "soy"], allergenTags: ["en:soybeans"] },
  { label: "sésame", preferenceKeywords: ["sesame"], allergenTags: ["en:sesame-seeds"] },
  { label: "sulfites", preferenceKeywords: ["sulfite"], allergenTags: ["en:sulphur-dioxide-and-sulphites"] },
  { label: "moutarde", preferenceKeywords: ["moutarde"], allergenTags: ["en:mustard"] },
  { label: "céleri", preferenceKeywords: ["celeri"], allergenTags: ["en:celery"] },
  { label: "lupin", preferenceKeywords: ["lupin"], allergenTags: ["en:lupin"] },
];

/**
 * Cross-checks a scanned product's OpenFoodFacts allergens/ingredients
 * against the household's free-text dietary preferences. Necessarily
 * best-effort on both sides (free text on one end, community-edited data on
 * the other) — false negatives are expected, treat as a helpful nudge, not
 * a safety guarantee.
 */
export function checkAllergenConflicts(
  preferencesText: string | null | undefined,
  product: { allergensTags?: string[]; ingredientsText?: string | null },
): string[] {
  if (!preferencesText) return [];

  const normalizedPrefs = normalize(preferencesText);
  const normalizedIngredients = normalize(product.ingredientsText ?? "");
  const allergenTags = product.allergensTags ?? [];

  const conflicts: string[] = [];
  for (const rule of RESTRICTION_RULES) {
    const userCaresAboutThis = rule.preferenceKeywords.some((k) => normalizedPrefs.includes(normalize(k)));
    if (!userCaresAboutThis) continue;

    const hitsAllergenTag = rule.allergenTags?.some((tag) => allergenTags.includes(tag)) ?? false;
    const hitsIngredientKeyword =
      rule.ingredientKeywords?.some((k) => normalizedIngredients.includes(normalize(k))) ?? false;

    if (hitsAllergenTag || hitsIngredientKeyword) conflicts.push(rule.label);
  }

  return conflicts;
}
