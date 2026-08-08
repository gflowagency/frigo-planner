const DIACRITICS = /[̀-ͯ]/g;

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(DIACRITICS, "").trim();
}

/** Best-effort match: does an ingredient name refer to a pantry item we have? */
export function findMatchingItem<T extends { name: string }>(
  ingredientName: string,
  items: T[],
): T | undefined {
  const norm = normalize(ingredientName);
  return items.find((item) => {
    const itemNorm = normalize(item.name);
    return itemNorm.includes(norm) || norm.includes(itemNorm);
  });
}
