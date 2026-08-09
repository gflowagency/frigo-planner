"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/health", label: "Aujourd'hui" },
  { href: "/health/history", label: "Historique" },
  { href: "/health/coach", label: "Coach" },
];

export default function HealthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/settings" className="text-sm text-muted hover:text-foreground">
          ← Profil
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Suivi santé</h1>
        <p className="mt-0.5 text-sm text-muted">Journal alimentaire, historique et coach du foyer.</p>
      </div>

      <div className="flex gap-1 rounded-full border border-border bg-surface p-1">
        {TABS.map((tab) => {
          const active = tab.href === "/health" ? pathname === "/health" : pathname?.startsWith(tab.href);
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
