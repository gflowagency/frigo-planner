"use client";

import { useState } from "react";
import { setMealPlanEntry, clearMealPlanEntry } from "../planning-actions";

type MealEntry = { id: string; title: string; estimated_calories_per_serving: number | null } | null;
type DayCol = { date: string; label: string; dejeuner: MealEntry; diner: MealEntry };
type Favorite = { id: string; title: string; estimated_calories_per_serving: number };

const SLOTS = [
  { key: "dejeuner" as const, label: "Déjeuner" },
  { key: "diner" as const, label: "Dîner" },
];

export default function PlanningClient({ days, favorites }: { days: DayCol[]; favorites: Favorite[] }) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function assign(date: string, slot: "dejeuner" | "diner", favoriteId: string) {
    if (!favoriteId) return;
    const key = `${date}-${slot}`;
    setPendingKey(key);
    await setMealPlanEntry(date, slot, favoriteId);
    setPendingKey(null);
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
        <span className="text-3xl">🗓️</span>
        <p className="text-[15px] font-medium text-foreground">Pas encore de favoris à planifier</p>
        <p className="max-w-xs text-sm text-muted">
          Sauvegarde d&apos;abord des recettes depuis l&apos;onglet Suggestions pour pouvoir les glisser dans la semaine.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {days.map((day) => (
        <div key={day.date} className="rounded-2xl border border-border bg-surface p-4">
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
  );
}
