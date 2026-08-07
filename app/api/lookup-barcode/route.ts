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

  return NextResponse.json({
    found: true,
    barcode: code,
    name: product.product_name_fr || product.product_name || "Produit sans nom",
    brand: product.brands || null,
    imageUrl: product.image_front_small_url || product.image_url || null,
    category: guessCategory(product.categories_tags),
  });
}
