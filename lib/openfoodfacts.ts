const CATEGORY_KEYWORDS: Record<string, string> = {
  fruits_legumes: "fruits,vegetables,fruit,legume,légume",
  viande_poisson: "meat,fish,poultry,viande,poisson",
  produits_laitiers: "dairy,cheese,milk,lait,fromage",
  epicerie: "groceries,pasta,rice,cereal,épicerie",
  surgeles: "frozen,surgelé",
  boissons: "beverages,drink,boisson",
};

function guessCategory(offCategoriesTags: string[] | undefined): string {
  if (!offCategoriesTags) return "autre";
  const joined = offCategoriesTags.join(",").toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.split(",").some((k) => joined.includes(k))) return category;
  }
  return "autre";
}

const UNIT_ALIASES: Record<string, string> = { gr: "g", grs: "g", grammes: "g", gramme: "g", litre: "l", litres: "l" };

/**
 * Best-effort parse of OpenFoodFacts' free-text "quantity" field
 * (e.g. "500 g", "1 L", "6x25cl", "500GR", "0,5kg"). Handles the multipack
 * "NxQUANTITYunit" form by multiplying out to a single total.
 */
function parseQuantity(raw: string | undefined): { quantity: number; unit: string } | null {
  if (!raw) return null;
  const normalized = raw.toLowerCase().replace(",", ".");

  const multipack = normalized.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(kg|g|gr|grs?|l|ml|cl)\b/);
  if (multipack) {
    const unit = UNIT_ALIASES[multipack[3]] ?? multipack[3];
    return { quantity: Number(multipack[1]) * Number(multipack[2]), unit };
  }

  const single = normalized.match(/(\d+(?:\.\d+)?)\s*(kg|g|gr|grs?|l|ml|cl)\b/);
  if (!single) return null;
  const unit = UNIT_ALIASES[single[2]] ?? single[2];
  return { quantity: Number(single[1]), unit };
}

function pickNutrients(nutriments: Record<string, number> | undefined) {
  if (!nutriments) return null;
  const keys: Record<string, string> = {
    "energy-kcal_100g": "kcal",
    proteins_100g: "proteines",
    carbohydrates_100g: "glucides",
    sugars_100g: "sucres",
    fat_100g: "lipides",
    "saturated-fat_100g": "acides_gras_satures",
    fiber_100g: "fibres",
    salt_100g: "sel",
  };
  const result: Record<string, number> = {};
  for (const [offKey, label] of Object.entries(keys)) {
    if (typeof nutriments[offKey] === "number") result[label] = nutriments[offKey];
  }
  return Object.keys(result).length > 0 ? result : null;
}

export type OffProduct = {
  found: boolean;
  barcode: string;
  name?: string;
  brand?: string | null;
  imageUrl?: string | null;
  category?: string;
  quantity?: number | null;
  unit?: string | null;
  nutriscore?: string | null;
  nutrients?: Record<string, number> | null;
};

export async function lookupProduct(code: string): Promise<OffProduct> {
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`, {
    headers: { "User-Agent": "FrigoPlanner/1.0 (Vercel app)" },
  });

  if (!res.ok) return { found: false, barcode: code };

  const data = await res.json();
  if (data.status !== 1 || !data.product) return { found: false, barcode: code };

  const product = data.product;
  const parsedQuantity =
    parseQuantity(product.quantity) ??
    (product.product_quantity && product.product_quantity_unit
      ? { quantity: Number(product.product_quantity), unit: String(product.product_quantity_unit).toLowerCase() }
      : null);

  return {
    found: true,
    barcode: code,
    name: product.product_name_fr || product.product_name || "Produit sans nom",
    brand: product.brands || null,
    imageUrl: product.image_front_small_url || product.image_url || null,
    category: guessCategory(product.categories_tags),
    quantity: parsedQuantity?.quantity ?? null,
    unit: parsedQuantity?.unit ?? null,
    nutriscore: product.nutriscore_grade && product.nutriscore_grade !== "unknown" ? product.nutriscore_grade : null,
    nutrients: pickNutrients(product.nutriments),
  };
}
