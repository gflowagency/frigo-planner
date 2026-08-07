import Link from "next/link";
import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-semibold text-neutral-900">Créer un compte</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Ensuite tu pourras créer ton foyer ou rejoindre celui de ton/ta partenaire.
      </p>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <form action={signup} className="flex flex-col gap-3">
        <input
          name="displayName"
          type="text"
          required
          placeholder="Prénom"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <input
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Mot de passe (6 caractères min.)"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <button
          type="submit"
          className="mt-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Créer mon compte
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-neutral-900 underline">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
