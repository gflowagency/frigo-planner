import { createClient } from "@/lib/supabase/server";
import FavoritesList from "./FavoritesList";
import CreateRecipeForm from "./CreateRecipeForm";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const { data: favorites } = await supabase
    .from("favorite_recipes")
    .select("id, title, description, servings, estimated_calories_per_serving, ingredients, instructions")
    .order("created_at", { ascending: false });

  if (!favorites?.length) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-3xl">⭐</span>
          <p className="text-[15px] font-medium text-foreground">Pas encore de favoris</p>
          <p className="max-w-xs text-sm text-muted">
            Depuis l&apos;onglet Suggestions, sauvegarde les recettes que vous aimez, ou ajoute directement une
            recette qui t&apos;appartient.
          </p>
        </div>
        <CreateRecipeForm />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CreateRecipeForm />
      <FavoritesList favorites={favorites} />
    </div>
  );
}
