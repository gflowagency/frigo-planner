"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/recipes", label: "Suggestions" },
  { href: "/recipes/favorites", label: "Favoris" },
  { href: "/recipes/planning", label: "Planning" },
];

export default function RecipesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-foreground">Recettes</h1>
        <p className="mt-0.5 text-sm text-muted">Suggestions IA, favoris et planning de la semaine.</p>
      </div>

      <div className="flex gap-1 rounded-full border border-border bg-surface p-1">
        {TABS.map((tab) => {
          const active = tab.href === "/recipes" ? pathname === "/recipes" : pathname?.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 rounded-full px-3 py-2 text-center text-sm font-medium transition-colors ${
                active ? "bg-accent text-accent-foreground" : "text-muted hover:bg-accent-soft/60"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
