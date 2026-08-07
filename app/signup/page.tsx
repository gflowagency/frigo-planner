import Link from "next/link";
import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-accent-foreground shadow-[0_8px_20px_-8px_rgba(193,96,46,0.55)]">
            F
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Créer un compte</h1>
          <p className="mt-1.5 text-[15px] text-muted">
            Ensuite tu pourras créer ton foyer ou rejoindre celui de ton/ta partenaire.
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
        )}

        <form action={signup} className="flex flex-col gap-3">
          <input
            name="displayName"
            type="text"
            required
            placeholder="Prénom"
            autoComplete="given-name"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-foreground placeholder:text-muted-2 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="E-mail"
            autoComplete="email"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-foreground placeholder:text-muted-2 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Mot de passe (6 caractères min.)"
            autoComplete="new-password"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-foreground placeholder:text-muted-2 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.98]"
          >
            Créer mon compte
          </button>
        </form>

        <p className="mt-8 text-center text-[15px] text-muted">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-accent hover:text-accent-hover">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
