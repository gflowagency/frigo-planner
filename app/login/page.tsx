import Link from "next/link";
import { login } from "./actions";
import SubmitButton from "@/app/components/SubmitButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-background px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-accent-foreground shadow-[0_8px_20px_-8px_rgba(193,96,46,0.55)]">
            F
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Connexion</h1>
          <p className="mt-1.5 text-[15px] text-muted">
            Accède au stock et aux menus de ton foyer.
          </p>
        </div>

        {message && (
          <p className="mb-4 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
            {message}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
        )}

        <form action={login} className="flex flex-col gap-3">
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
            placeholder="Mot de passe"
            autoComplete="current-password"
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-[15px] text-foreground placeholder:text-muted-2 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
          <SubmitButton pendingText="Connexion…" className="mt-2 w-full">
            Se connecter
          </SubmitButton>
        </form>

        <p className="mt-8 text-center text-[15px] text-muted">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="font-medium text-accent hover:text-accent-hover">
            Créer un compte
          </Link>
        </p>
      </div>
    </main>
  );
}
