import { NextRequest, NextResponse } from "next/server";

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

/** Best-effort parse of OpenFoodFacts' free-text "quantity" field (e.g. "500 g", "1 L", "6x25cl"). */
function parseQuantity(raw: string | undefined): { quantity: number; unit: string } | null {
  if (!raw) return null;
  const match = raw.replace(",", ".").match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml|cl)\b/i);
  if (!match) return null;
  return { quantity: Number(match[1]), unit: match[2].toLowerCase() };
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

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "code manquant" }, { status: 400 });
  }

  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`, {
    headers: { "User-Agent": "FrigoPlanner/1.0 (Vercel app)" },
  });

  if (!res.ok) {
    return NextResponse.json({ found: false });
  }

  const data = await res.json();

  if (data.status !== 1 || !data.product) {
    return NextResponse.json({ found: false, barcode: code });
  }

  const product = data.product;
  const parsedQuantity = parseQuantity(product.quantity);

  return NextResponse.json({
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
  });
}
