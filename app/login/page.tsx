import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-semibold text-neutral-900">Connexion</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Accède au stock et aux menus de ton foyer.
      </p>

      {message && (
        <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <form action={login} className="flex flex-col gap-3">
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
          placeholder="Mot de passe"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <button
          type="submit"
          className="mt-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Se connecter
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="font-medium text-neutral-900 underline">
          Créer un compte
        </Link>
      </p>
    </main>
  );
}
