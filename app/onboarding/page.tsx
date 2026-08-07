import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { completeOnboarding } from "./actions";

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="mb-1 text-2xl font-semibold text-neutral-900">Ton profil</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Ça nous sert à équilibrer les recettes entre vous deux, sans rien calculer à la main.
      </p>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {inviteCode && (
        <p className="mb-4 rounded-md bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
          Code d&apos;invitation de ton foyer : <span className="font-mono font-semibold">{inviteCode}</span>{" "}
          — partage-le à ton/ta partenaire pour qu&apos;iel rejoigne le même stock.
        </p>
      )}

      <form action={completeOnboarding} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Rejoindre un foyer existant (optionnel)
          </label>
          <input
            name="inviteCode"
            type="text"
            placeholder="Code d'invitation de ton/ta partenaire"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <p className="mt-1 text-xs text-neutral-400">
            Laisse vide pour créer ton propre foyer.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Sexe</label>
            <select
              name="sex"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            >
              <option value="femme">Femme</option>
              <option value="homme">Homme</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Naissance</label>
            <input
              name="birthDate"
              type="date"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Taille (cm)</label>
            <input
              name="heightCm"
              type="number"
              required
              min={100}
              max={250}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Poids (kg)</label>
            <input
              name="weightKg"
              type="number"
              required
              min={30}
              max={300}
              step="0.1"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">
            Niveau d&apos;activité
          </label>
          <select
            name="activityLevel"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          >
            <option value="sedentaire">Sédentaire (peu ou pas de sport)</option>
            <option value="leger">Légèrement actif (1-3x/semaine)</option>
            <option value="modere">Modérément actif (3-5x/semaine)</option>
            <option value="actif">Actif (6-7x/semaine)</option>
            <option value="tres_actif">Très actif (sport intense quotidien)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Objectif</label>
          <select
            name="goal"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          >
            <option value="perte_de_poids">Perte de poids</option>
            <option value="maintien">Maintien</option>
            <option value="prise_de_masse">Prise de masse</option>
          </select>
        </div>

        <button
          type="submit"
          className="mt-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Continuer
        </button>
      </form>
    </main>
  );
}
