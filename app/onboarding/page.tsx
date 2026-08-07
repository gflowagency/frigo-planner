import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "./actions";

const fieldClass =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";
const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: household } = await supabase
    .from("profiles")
    .select("household_id")
    .eq("id", user.id)
    .single();

  let inviteCode: string | null = null;
  if (household?.household_id) {
    const { data: h } = await supabase
      .from("households")
      .select("invite_code")
      .eq("id", household.household_id)
      .single();
    inviteCode = h?.invite_code ?? null;
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-10 sm:flex sm:flex-col sm:justify-center">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-7 text-center sm:text-left">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Ton profil</h1>
          <p className="mt-1.5 text-[15px] text-muted">
            Ça nous sert à équilibrer les recettes entre vous deux, sans rien calculer à la main.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
        )}

        {inviteCode && (
          <p className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent-hover">
            Code d&apos;invitation de ton foyer :{" "}
            <span className="font-mono font-semibold">{inviteCode}</span> — partage-le à ton/ta
            partenaire pour qu&apos;iel rejoigne le même stock.
          </p>
        )}

        <form action={completeOnboarding} className="flex flex-col gap-5">
          <div>
            <label className={labelClass}>Rejoindre un foyer existant (optionnel)</label>
            <input
              name="inviteCode"
              type="text"
              placeholder="Code d'invitation de ton/ta partenaire"
              className={fieldClass}
            />
            <p className="mt-1.5 text-xs text-muted-2">Laisse vide pour créer ton propre foyer.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Sexe</label>
              <select name="sex" required className={fieldClass}>
                <option value="femme">Femme</option>
                <option value="homme">Homme</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Naissance</label>
              <input name="birthDate" type="date" required className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Taille (cm)</label>
              <input
                name="heightCm"
                type="number"
                required
                min={100}
                max={250}
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
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Niveau d&apos;activité</label>
            <select name="activityLevel" required className={fieldClass}>
              <option value="sedentaire">Sédentaire (peu ou pas de sport)</option>
              <option value="leger">Légèrement actif (1-3x/semaine)</option>
              <option value="modere">Modérément actif (3-5x/semaine)</option>
              <option value="actif">Actif (6-7x/semaine)</option>
              <option value="tres_actif">Très actif (sport intense quotidien)</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Objectif</label>
            <select name="goal" required className={fieldClass}>
              <option value="perte_de_poids">Perte de poids</option>
              <option value="maintien">Maintien</option>
              <option value="prise_de_masse">Prise de masse</option>
              <option value="recomposition">Recomposition (perdre du gras et prendre du muscle)</option>
            </select>
          </div>

          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.98]"
          >
            Continuer
          </button>
        </form>
      </div>
    </main>
  );
}
