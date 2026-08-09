import { NextRequest, NextResponse } from "next/server";
import { lookupProduct } from "@/lib/openfoodfacts";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "code manquant" }, { status: 400 });
  }

  const product = await lookupProduct(code);
  return NextResponse.json(product);
}
