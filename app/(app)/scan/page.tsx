import Link from "next/link";
import { currentHouseholdDietaryPreferences } from "@/lib/household";
import BarcodeScanner from "./BarcodeScanner";

export default async function ScanPage() {
  const dietaryPreferences = await currentHouseholdDietaryPreferences();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Scanner un produit</h1>
          <p className="mt-0.5 text-sm text-muted">
            Autorise la caméra, vise le code-barres, on récupère le produit automatiquement.
          </p>
        </div>
        <Link
          href="/scan/import"
          className="shrink-0 whitespace-nowrap rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
        >
          Importer des photos
        </Link>
      </div>
      <BarcodeScanner dietaryPreferences={dietaryPreferences} />
    </div>
  );
}
