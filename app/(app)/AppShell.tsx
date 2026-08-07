"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Stock",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
        <line x1="5" y1="9.5" x2="19" y2="9.5" />
        <line x1="8" y1="5" x2="8" y2="7.2" />
        <line x1="8" y1="12.3" x2="8" y2="17.5" />
      </svg>
    ),
  },
  {
    href: "/scan",
    label: "Scanner",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" />
        <path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" />
        <path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16" />
        <path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
        <line x1="7" y1="12" x2="17" y2="12" />
      </svg>
    ),
  },
  {
    href: "/recipes",
    label: "Recettes",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3v6a3 3 0 0 0 6 0V3" />
        <line x1="9" y1="9" x2="9" y2="21" />
        <path d="M18 3c-2 1-2.5 3.5-2.5 6 0 2 1 3 2.5 3v9" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Profil",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
      </svg>
    ),
  },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="pt-safe sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground">
              F
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-foreground">Frigo Planner</span>
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-accent-soft text-accent-hover" : "text-muted hover:bg-accent-soft/60 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-8">{children}</main>

      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-4xl items-stretch justify-around">
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                  active ? "text-accent" : "text-muted-2"
                }`}
              >
                {item.icon(!!active)}
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
