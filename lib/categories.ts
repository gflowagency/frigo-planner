export const PANTRY_CATEGORIES = [
  { value: "fruits_legumes", label: "Fruits & légumes", emoji: "🥦" },
  { value: "viande_poisson", label: "Viande & poisson", emoji: "🍗" },
  { value: "produits_laitiers", label: "Produits laitiers", emoji: "🧀" },
  { value: "epicerie", label: "Épicerie", emoji: "🌾" },
  { value: "surgeles", label: "Surgelés", emoji: "❄️" },
  { value: "boissons", label: "Boissons", emoji: "🧃" },
  { value: "autre", label: "Autre", emoji: "🍽️" },
] as const;

export function categoryLabel(value: string): string {
  return PANTRY_CATEGORIES.find((c) => c.value === value)?.label ?? "Autre";
}

export function categoryEmoji(value: string): string {
  return PANTRY_CATEGORIES.find((c) => c.value === value)?.emoji ?? "🍽️";
}
