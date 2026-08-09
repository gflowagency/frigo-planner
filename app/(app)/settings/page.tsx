import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/logout/actions";
import { updateProfile } from "./actions";
import CopyCode from "./CopyCode";

const fieldClass =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";
const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, household_id, sex, height_cm, weight_kg, birth_date, activity_level, goal, daily_calorie_target, dietary_preferences",
    )
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding");

  let inviteCode: string | null = null;
  if (profile.household_id) {
    const { data: h } = await supabase
      .from("households")
      .select("invite_code")
      .eq("id", profile.household_id)
      .single();
    inviteCode = h?.invite_code ?? null;
  }

  const { data: householdProfiles } = await supabase
    .from("profiles")
    .select("daily_calorie_target")
    .eq("household_id", profile.household_id);
  const targetTotal = (householdProfiles ?? []).reduce((sum, p) => sum + (p.daily_calorie_target ?? 0), 0);

  const since = new Date();
  since.setDate(since.getDate() - 6);
  const { data: logs } = await supabase
    .from("nutrition_log")
    .select("consumed_at, calories_per_serving, servings")
    .gte("consumed_at", since.toISOString().slice(0, 10));

  const byDate = new Map<string, number>();
  for (const log of logs ?? []) {
    const kcal = Number(log.calories_per_serving) * Number(log.servings);
    byDate.set(log.consumed_at, (byDate.get(log.consumed_at) ?? 0) + kcal);
  }
  const dayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
  const history = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const total = Math.round(byDate.get(key) ?? 0);
    return { date: key, label: dayFmt.format(d).replace(".", ""), total };
  });
  const maxTotal = Math.max(targetTotal, ...history.map((d) => d.total), 1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Ton profil</h1>
        <p className="mt-0.5 text-sm text-muted">
          Modifie tes informations, tes préférences et retrouve le code de ton foyer.
        </p>
      </div>

      {message && (
        <p className="rounded-xl bg-success-soft px-4 py-3 text-sm text-success">{message}</p>
      )}
      {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

      {inviteCode && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
          <div>
            <p className="text-sm font-medium text-foreground">Code de ton foyer</p>
            <p className="mt-0.5 font-mono text-lg font-semibold tracking-wide text-accent">{inviteCode}</p>
            <p className="mt-0.5 text-xs text-muted-2">
              Partage-le à ton/ta partenaire pour rejoindre le même stock.
            </p>
          </div>
          <CopyCode code={inviteCode} />
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Historique nutritionnel</h2>
        <p className="mb-4 text-xs text-muted-2">
          Calories des recettes marquées &laquo;&nbsp;préparée&nbsp;&raquo; sur 7 jours
          {targetTotal > 0 ? ` — objectif du foyer ~${Math.round(targetTotal)} kcal/j` : ""}.
        </p>
        <div className="flex items-end gap-2">
          {history.map((day) => {
            const pct = Math.max(day.total > 0 ? 6 : 0, Math.round((day.total / maxTotal) * 100));
            const over = targetTotal > 0 && day.total > targetTotal;
            return (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-20 w-full items-end overflow-hidden rounded-md bg-background">
                  <div
                    className={`w-full rounded-md transition-all ${over ? "bg-danger" : "bg-accent"}`}
                    style={{ height: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] capitalize text-muted-2">{day.label}</span>
                <span className="text-[10px] font-medium tabular-nums text-foreground">{day.total || "–"}</span>
              </div>
            );
          })}
        </div>
      </div>

      <form action={updateProfile} className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-4 sm:p-6">
        <div>
          <label className={labelClass}>Prénom</label>
          <input name="displayName" type="text" required defaultValue={profile.display_name} className={fieldClass} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Sexe</label>
            <select name="sex" required defaultValue={profile.sex ?? "femme"} className={fieldClass}>
              <option value="femme">Femme</option>
              <option value="homme">Homme</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Naissance</label>
            <input
              name="birthDate"
              type="date"
              required
              defaultValue={profile.birth_date ?? ""}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Taille (cm)</label>
            <input
              name="heightCm"
              type="number"
              required
              min={100}
              max={250}
              defaultValue={profile.height_cm ?? ""}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Poids (kg)</label>
            <input
              name="weightKg"
              type="number"
              required
              min={30}
              max={300}
              step="0.1"
              defaultValue={profile.weight_kg ?? ""}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Niveau d&apos;activité</label>
          <select
            name="activityLevel"
            required
            defaultValue={profile.activity_level ?? "sedentaire"}
            className={fieldClass}
          >
            <option value="sedentaire">Sédentaire (peu ou pas de sport)</option>
            <option value="leger">Légèrement actif (1-3x/semaine)</option>
            <option value="modere">Modérément actif (3-5x/semaine)</option>
            <option value="actif">Actif (6-7x/semaine)</option>
            <option value="tres_actif">Très actif (sport intense quotidien)</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Objectif</label>
          <select name="goal" required defaultValue={profile.goal ?? "maintien"} className={fieldClass}>
            <option value="perte_de_poids">Perte de poids</option>
            <option value="maintien">Maintien</option>
            <option value="prise_de_masse">Prise de masse</option>
            <option value="recomposition">Recomposition (perdre du gras et prendre du muscle)</option>
          </select>
          {profile.daily_calorie_target && (
            <p className="mt-1.5 text-xs text-muted-2">
              Objectif actuel : ~{Math.round(profile.daily_calorie_target)} kcal/jour
            </p>
          )}
        </div>

        <div>
          <label className={labelClass}>Préférences et contraintes alimentaires</label>
          <textarea
            name="dietaryPreferences"
            rows={3}
            placeholder="ex : anti-inflammatoire, pas de porc, allergie aux fruits à coque, peu de sucre…"
            defaultValue={profile.dietary_preferences ?? ""}
            className={`${fieldClass} resize-none`}
          />
          <p className="mt-1.5 text-xs text-muted-2">
            Pris en compte automatiquement à chaque génération de recettes.
          </p>
        </div>

        <button
          type="submit"
          className="mt-1 w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.98]"
        >
          Enregistrer
        </button>
      </form>

      <form action={logout}>
        <button
          type="submit"
          className="w-full rounded-xl border border-border px-4 py-3 text-[15px] font-medium text-danger transition-colors hover:bg-danger-soft"
        >
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
