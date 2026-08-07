export const PANTRY_CATEGORIES = [
  { value: "fruits_legumes", label: "Fruits & légumes" },
  { value: "viande_poisson", label: "Viande & poisson" },
  { value: "produits_laitiers", label: "Produits laitiers" },
  { value: "epicerie", label: "Épicerie" },
  { value: "surgeles", label: "Surgelés" },
  { value: "boissons", label: "Boissons" },
  { value: "autre", label: "Autre" },
] as const;

export function categoryLabel(value: string): string {
  return PANTRY_CATEGORIES.find((c) => c.value === value)?.label ?? "Autre";
}
