"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { backfillNutrients } from "../pantry-actions";

export default function BackfillNutrientsButton({ eligible }: { eligible: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (eligible === 0 && !result) return null;

  async function run() {
    setLoading(true);
    setResult(null);
    const { updated, total } = await backfillNutrients();
    setResult(
      updated === total
        ? `${updated} article${updated > 1 ? "s" : ""} mis à jour.`
        : `${updated}/${total} mis à jour (le reste n'est pas référencé sur OpenFoodFacts).`,
    );
    setLoading(false);
    router.refresh();
  }

  return (
    <p className="text-xs text-muted-2">
      {result ?? (
        <button onClick={run} disabled={loading} className="underline hover:text-accent disabled:opacity-50">
          {loading
            ? "Récupération des nutriments en cours…"
            : `Récupérer les nutriments manquants (${eligible} article${eligible > 1 ? "s" : ""})`}
        </button>
      )}
    </p>
  );
}
