import { createClient } from "@/lib/supabase/server";
import { currentHouseholdCalorieTarget } from "@/lib/household";
import { deleteFoodLog } from "./actions";
import LogFoodForm from "./LogFoodForm";

const MEAL_LABELS: Record<string, string> = { matin: "Matin", midi: "Midi", gouter: "Goûter", soir: "Soir" };
const MEAL_ORDER = ["matin", "midi", "gouter", "soir"];

export default async function HealthTodayPage() {
  const supabase = await createClient();
  const targetTotal = await currentHouseholdCalorieTarget();
  const today = new Date().toISOString().slice(0, 10);

  const { data: entries } = await supabase
    .from("nutrition_log")
    .select("id, food_name, calories_per_serving, servings, meal_slot, source")
    .eq("consumed_at", today)
    .order("created_at", { ascending: true });

  const totalKcal = (entries ?? []).reduce((sum, e) => sum + Number(e.calories_per_serving) * Number(e.servings), 0);
  const pct = targetTotal > 0 ? Math.min(100, Math.round((totalKcal / targetTotal) * 100)) : 0;

  const grouped = new Map<string, typeof entries>();
  for (const e of entries ?? []) {
    const key = e.meal_slot && MEAL_ORDER.includes(e.meal_slot) ? e.meal_slot : "soir";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">Total du jour</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">
          {Math.round(totalKcal)} kcal
          {targetTotal > 0 && <span className="text-base font-normal text-muted-2"> / ~{Math.round(targetTotal)}</span>}
        </p>
        {targetTotal > 0 && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
            <div
              className={`h-full rounded-full transition-all ${pct > 100 ? "bg-danger" : "bg-accent"}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
        )}
      </div>

      <LogFoodForm />

      {(entries ?? []).length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-muted">
          Rien de noté aujourd&apos;hui — ajoute ce que tu manges au fil de la journée.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {MEAL_ORDER.filter((slot) => grouped.has(slot)).map((slot, i) => (
            <div
              key={slot}
              className="animate-fade-in-up rounded-2xl border border-border bg-surface p-4"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">{MEAL_LABELS[slot]}</p>
              <ul className="flex flex-col gap-2">
                {grouped.get(slot)!.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-foreground">
                      {e.food_name}
                      {e.source === "recipe" && <span className="ml-1.5 text-xs text-muted-2">(recette)</span>}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-xs tabular-nums text-muted-2">
                        {Math.round(Number(e.calories_per_serving) * Number(e.servings))} kcal
                      </span>
                      <form action={deleteFoodLog}>
                        <input type="hidden" name="id" value={e.id} />
                        <button
                          type="submit"
                          aria-label="Supprimer"
                          className="flex h-6 w-6 items-center justify-center rounded-full text-muted-2 transition-colors hover:bg-danger-soft hover:text-danger active:scale-90"
                        >
                          ✕
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
