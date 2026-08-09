import { createClient } from "@/lib/supabase/server";
import { currentHouseholdCalorieTarget } from "@/lib/household";

const DAY_FMT = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function HealthHistoryPage() {
  const supabase = await createClient();
  const targetTotal = await currentHouseholdCalorieTarget();

  const since = new Date();
  since.setDate(since.getDate() - 13);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data: entries } = await supabase
    .from("nutrition_log")
    .select("food_name, calories_per_serving, servings, consumed_at")
    .gte("consumed_at", sinceStr)
    .order("consumed_at", { ascending: false });

  type Entry = { food_name: string; calories_per_serving: number; servings: number };
  const byDate = new Map<string, { total: number; items: Entry[] }>();
  for (const e of entries ?? []) {
    const bucket = byDate.get(e.consumed_at) ?? { total: 0, items: [] };
    bucket.total += Number(e.calories_per_serving) * Number(e.servings);
    bucket.items.push(e);
    byDate.set(e.consumed_at, bucket);
  }

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const maxTotal = Math.max(targetTotal, ...days.map((d) => byDate.get(d)?.total ?? 0), 1);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="mb-1 text-sm font-semibold text-foreground">14 derniers jours</p>
        <p className="mb-4 text-xs text-muted-2">
          Calories loggées (recettes + journal)
          {targetTotal > 0 ? ` — objectif du foyer ~${Math.round(targetTotal)} kcal/j` : ""}.
        </p>
        <div className="flex items-end gap-1">
          {days.map((date) => {
            const total = byDate.get(date)?.total ?? 0;
            const pct = Math.max(total > 0 ? 4 : 0, Math.round((total / maxTotal) * 100));
            const over = targetTotal > 0 && total > targetTotal;
            return (
              <div key={date} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-20 w-full items-end overflow-hidden rounded-sm bg-background">
                  <div
                    className={`w-full rounded-sm transition-all ${over ? "bg-danger" : "bg-accent"}`}
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="text-[9px] text-muted-2">{new Date(date + "T12:00:00").getDate()}</span>
              </div>
            );
          })}
        </div>
      </div>

      {days
        .filter((d) => byDate.has(d))
        .reverse()
        .map((date) => {
          const bucket = byDate.get(date)!;
          return (
            <div key={date} className="rounded-2xl border border-border bg-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  {capitalize(DAY_FMT.format(new Date(date + "T12:00:00")))}
                </p>
                <p className="text-sm tabular-nums text-muted-2">{Math.round(bucket.total)} kcal</p>
              </div>
              <ul className="flex flex-col gap-1">
                {bucket.items.map((it, i) => (
                  <li key={i} className="flex items-center justify-between text-xs text-muted">
                    <span>{it.food_name}</span>
                    <span className="tabular-nums text-muted-2">
                      {Math.round(Number(it.calories_per_serving) * Number(it.servings))} kcal
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

      {(entries ?? []).length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-muted">
          Rien d&apos;enregistré sur les 14 derniers jours.
        </p>
      )}
    </div>
  );
}
