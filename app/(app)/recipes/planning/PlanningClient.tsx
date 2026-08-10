"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProposedRecipe } from "@/lib/recipe-tool";
import RecipeCard from "../RecipeCard";
import { setMealPlanEntry, clearMealPlanEntry, saveWeekPlan, addWeekMissingToShoppingList } from "../planning-actions";

type MealEntry = { id: string; title: string; estimated_calories_per_serving: number | null } | null;
type DayCol = { date: string; label: string; dejeuner: MealEntry; diner: MealEntry };
type Favorite = { id: string; title: string; estimated_calories_per_serving: number };

const SLOTS = [
  { key: "dejeuner" as const, label: "Déjeuner" },
  { key: "diner" as const, label: "Dîner" },
];

export default function PlanningClient({ days, favorites }: { days: DayCol[]; favorites: Favorite[] }) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [weekPlan, setWeekPlan] = useState<ProposedRecipe[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingToShopping, setAddingToShopping] = useState(false);
  const [shoppingMessage, setShoppingMessage] = useState<string | null>(null);

  async function assign(date: string, slot: "dejeuner" | "diner", favoriteId: string) {
    if (!favoriteId) return;
    const key = `${date}-${slot}`;
    setPendingKey(key);
    await setMealPlanEntry(date, slot, favoriteId);
    setPendingKey(null);
  }

  async function generateWeek() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/recipes/plan-week", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de la génération");
      setWeekPlan(data.days);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Impossible de générer le planning. Réessaie.");
    } finally {
      setGenerating(false);
    }
  }

  async function confirmWeek() {
    if (!weekPlan) return;
    setSaving(true);
    try {
      await saveWeekPlan(weekPlan);
      setWeekPlan(null);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function addWeekToShoppingList() {
    setAddingToShopping(true);
    setShoppingMessage(null);
    try {
      const { added } = await addWeekMissingToShoppingList();
      setShoppingMessage(
        added > 0
          ? `${added} ingrédient${added > 1 ? "s" : ""} ajouté${added > 1 ? "s" : ""} à la liste de courses.`
          : "Rien à ajouter — tout est déjà en stock ou aucun repas n'est planifié.",
      );
    } finally {
      setAddingToShopping(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={generateWeek}
            disabled={generating}
            className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_10px_20px_-8px_rgba(193,96,46,0.45)] transition-all hover:bg-accent-hover hover:shadow-[0_12px_22px_-6px_rgba(193,96,46,0.55)] active:scale-[0.98] disabled:opacity-50"
          >
            {generating ? "Génération des 7 dîners…" : "🪄 Générer mes dîners de la semaine"}
          </button>
          <button
            onClick={addWeekToShoppingList}
            disabled={addingToShopping}
            className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
          >
            {addingToShopping ? "Ajout en cours…" : "🛒 Ajouter le manquant de la semaine aux courses"}
          </button>
        </div>
        <p className="text-xs text-muted-2">
          Génère un dîner différent pour chacun des 7 prochains jours à partir de ton stock actuel — le déjeuner reste
          à planifier à la main depuis tes favoris.
        </p>
        {shoppingMessage && <p className="text-xs font-medium text-accent">{shoppingMessage}</p>}
      </div>

      {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

      {weekPlan && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              Planning proposé — enregistre pour remplacer les dîners déjà planifiés cette semaine.
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmWeek}
                disabled={saving}
                className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_10px_20px_-8px_rgba(193,96,46,0.45)] transition-all hover:bg-accent-hover hover:shadow-[0_12px_22px_-6px_rgba(193,96,46,0.55)] active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer le planning"}
              </button>
              <button
                onClick={() => setWeekPlan(null)}
                disabled={saving}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-background"
              >
                Annuler
              </button>
            </div>
          </div>
          {weekPlan.map((recipe, i) => (
            <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-2">
                {days[i]?.label ?? `Jour ${i + 1}`}
              </p>
              <RecipeCard recipe={recipe} />
            </div>
          ))}
        </div>
      )}

      {!weekPlan && favorites.length === 0 && !days.some((d) => d.dejeuner || d.diner) && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-3xl">🗓️</span>
          <p className="text-[15px] font-medium text-foreground">Pas encore de planning</p>
          <p className="max-w-xs text-sm text-muted">
            Génère tes dîners de la semaine ci-dessus, ou sauvegarde des recettes en favoris pour les planifier à la
            main.
          </p>
        </div>
      )}

      {!weekPlan && (favorites.length > 0 || days.some((d) => d.dejeuner || d.diner)) && (
        <div className="flex flex-col gap-3">
          {days.map((day, i) => (
            <div
              key={day.date}
              className="animate-fade-in-up rounded-2xl border border-border bg-surface p-4"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <p className="mb-3 text-sm font-semibold text-foreground">{day.label}</p>
              <div className="grid grid-cols-2 gap-3">
                {SLOTS.map((slot) => {
                  const entry = day[slot.key];
                  const key = `${day.date}-${slot.key}`;
                  return (
                    <div key={slot.key} className="rounded-xl bg-background p-3">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-2">
                        {slot.label}
                      </p>
                      {entry ? (
                        <div>
                          <p className="text-sm font-medium text-foreground">{entry.title}</p>
                          {entry.estimated_calories_per_serving && (
                            <p className="text-xs text-muted-2">~{entry.estimated_calories_per_serving} kcal</p>
                          )}
                          <form action={clearMealPlanEntry} className="mt-1.5">
                            <input type="hidden" name="id" value={entry.id} />
                            <button type="submit" className="text-xs text-muted-2 underline hover:text-danger">
                              Retirer
                            </button>
                          </form>
                        </div>
                      ) : favorites.length === 0 ? (
                        <p className="text-xs text-muted-2">Aucun favori à assigner.</p>
                      ) : (
                        <select
                          defaultValue=""
                          disabled={pendingKey === key}
                          onChange={(e) => assign(day.date, slot.key, e.target.value)}
                          className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-foreground disabled:opacity-50"
                        >
                          <option value="" disabled>
                            + Ajouter…
                          </option>
                          {favorites.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.title}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
