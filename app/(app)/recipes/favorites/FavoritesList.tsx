"use client";

import { useState } from "react";
import RecipeCard from "../RecipeCard";
import { deleteFavoriteRecipe } from "../favorites-actions";
import SubmitButton from "@/app/components/SubmitButton";

type Favorite = {
  id: string;
  title: string;
  description: string | null;
  servings: number;
  estimated_calories_per_serving: number | null;
  ingredients: { name: string; quantity: string; have_in_stock: boolean }[];
  instructions: string[];
};

export default function FavoritesList({ favorites }: { favorites: Favorite[] }) {
  const [consumingId, setConsumingId] = useState<string | null>(null);
  const [consumedSummary, setConsumedSummary] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function markPrepared(fav: Favorite) {
    setConsumingId(fav.id);
    setError(null);
    try {
      const res = await fetch("/api/recipes/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: fav.ingredients,
          title: fav.title,
          caloriesPerServing: fav.estimated_calories_per_serving,
          servings: fav.servings,
          recipeId: fav.id,
        }),
      });
      if (!res.ok) throw new Error();
      const data: { deducted: { ingredient: string; matched: string }[]; notFound: string[] } = await res.json();
      const parts: string[] = [];
      if (data.deducted.length > 0) parts.push(`Retiré du stock : ${data.deducted.map((d) => d.matched).join(", ")}.`);
      if (data.notFound.length > 0) parts.push(`Non trouvés en stock : ${data.notFound.join(", ")}.`);
      setConsumedSummary((prev) => ({ ...prev, [fav.id]: parts.join(" ") || "Rien à retirer du stock." }));
    } catch {
      setError("Impossible de mettre à jour le stock. Réessaie.");
    } finally {
      setConsumingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}
      {favorites.map((fav, i) => (
        <RecipeCard key={fav.id} recipe={fav} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
          {consumedSummary[fav.id] ? (
            <p className="rounded-xl bg-success-soft px-3 py-2.5 text-xs text-success">
              ✓ Préparée. {consumedSummary[fav.id]}
            </p>
          ) : (
            <button
              onClick={() => markPrepared(fav)}
              disabled={consumingId === fav.id}
              className="rounded-xl border border-border px-3.5 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
            >
              {consumingId === fav.id ? "Mise à jour du stock…" : "Marquer comme préparée"}
            </button>
          )}
          <form action={deleteFavoriteRecipe}>
            <input type="hidden" name="id" value={fav.id} />
            <SubmitButton variant="danger" size="sm" pendingText="Suppression…">
              Supprimer
            </SubmitButton>
          </form>
        </RecipeCard>
      ))}
    </div>
  );
}
