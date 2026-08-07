import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/logout/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarded) redirect("/onboarding");

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <span className="text-sm font-semibold text-neutral-900">Frigo Planner</span>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-neutral-600 hover:text-neutral-900">
              Stock
            </Link>
            <Link href="/scan" className="text-neutral-600 hover:text-neutral-900">
              Scanner
            </Link>
            <Link href="/recipes" className="text-neutral-600 hover:text-neutral-900">
              Recettes
            </Link>
            <form action={logout}>
              <button type="submit" className="text-neutral-400 hover:text-neutral-700">
                Déconnexion
              </button>
            </form>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-6 py-8">{children}</div>
    </div>
  );
}
