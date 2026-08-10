import Link from "next/link";
import { currentHouseholdDietaryPreferences } from "@/lib/household";
import PhotoImport from "./PhotoImport";

export default async function ImportPage() {
  const dietaryPreferences = await currentHouseholdDietaryPreferences();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <Link href="/scan" className="text-sm text-muted hover:text-foreground">
            Scanner
          </Link>
          <span className="text-muted-2">/</span>
          <span className="text-sm text-foreground">Import photos</span>
        </div>
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-foreground">Importer des photos</h1>
        <p className="mt-0.5 text-sm text-muted">
          Prends en photo tes codes-barres pendant tes courses, même sans réseau — importe-les ici
          d&apos;un coup une fois connecté.
        </p>
      </div>
      <PhotoImport dietaryPreferences={dietaryPreferences} />
    </div>
  );
}
