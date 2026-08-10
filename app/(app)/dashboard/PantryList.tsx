"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { adjustPantryQuantity, deletePantryItem } from "../pantry-actions";
import { categoryLabel, categoryEmoji } from "@/lib/categories";
import NutriscoreBadge from "../scan/NutriscoreBadge";
import EcoscoreBadge from "../scan/EcoscoreBadge";
import NutrientGrid from "../scan/NutrientGrid";

type PantryItem = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  quantity: number;
  unit: string;
  image_url: string | null;
  nutriscore: string | null;
  ecoscore: string | null;
  nutrients: Record<string, number> | null;
  nutrients_estimated: boolean;
};

type OptimisticAction = { type: "adjust"; id: string; delta: number } | { type: "delete"; id: string };

export default function PantryList({ items }: { items: PantryItem[] }) {
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [optimisticItems, applyOptimistic] = useOptimistic(items, (state, action: OptimisticAction) => {
    if (action.type === "delete") return state.filter((i) => i.id !== action.id);
    return state
      .map((i) => (i.id === action.id ? { ...i, quantity: Math.max(0, i.quantity + action.delta) } : i))
      .filter((i) => i.quantity > 0);
  });

  function adjust(id: string, delta: number) {
    startTransition(async () => {
      applyOptimistic({ type: "adjust", id, delta });
      const fd = new FormData();
      fd.set("id", id);
      fd.set("delta", String(delta));
      await adjustPantryQuantity(fd);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      applyOptimistic({ type: "delete", id });
      const fd = new FormData();
      fd.set("id", id);
      await deletePantryItem(fd);
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return optimisticItems;
    return optimisticItems.filter(
      (item) => item.name.toLowerCase().includes(q) || item.brand?.toLowerCase().includes(q),
    );
  }, [optimisticItems, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, PantryItem[]>();
    for (const item of filtered) {
      const key = item.category ?? "autre";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [filtered]);

  let rowIndex = 0;

  return (
    <div className="flex flex-col gap-7" aria-busy={isPending}>
      {items.length > 0 && (
        <div className="relative">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un article ou une marque…"
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-10 pr-3.5 text-sm text-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
        </div>
      )}

      {items.length > 0 && filtered.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-muted">
          Aucun article ne correspond à &laquo;&nbsp;{query}&nbsp;&raquo;.
        </p>
      )}

      {[...grouped.entries()].map(([category, categoryItems]) => (
        <section key={category}>
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-2">
            <span>{categoryEmoji(category)}</span>
            {categoryLabel(category)}
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {categoryItems.map((item) => {
              const delay = Math.min(rowIndex++, 8) * 30;
              return (
              <li
                key={item.id}
                className="animate-fade-in-up px-4 py-3.5"
                style={{ animationDelay: `${delay}ms` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {item.nutriscore && <NutriscoreBadge grade={item.nutriscore} />}
                    {item.ecoscore && <EcoscoreBadge grade={item.ecoscore} />}
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium text-foreground">{item.name}</p>
                      {item.brand && <p className="text-xs text-muted-2">{item.brand}</p>}
                    </div>
                    {item.nutrients && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        aria-label="Voir les nutriments"
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          expandedId === item.id
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-border text-muted-2 hover:border-accent hover:text-accent"
                        }`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => adjust(item.id, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent active:scale-90"
                    >
                      −
                    </button>
                    <span className="w-16 text-center text-sm tabular-nums text-foreground transition-all">
                      {item.quantity} {item.unit}
                    </span>
                    <button
                      type="button"
                      onClick={() => adjust(item.id, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent active:scale-90"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      aria-label="Supprimer"
                      className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-muted-2 transition-colors hover:bg-danger-soft hover:text-danger active:scale-90"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>
                  </div>
                </div>
                {expandedId === item.id && item.nutrients && (
                  <div className="mt-3 animate-fade-in">
                    <NutrientGrid nutrients={item.nutrients} estimated={item.nutrients_estimated} />
                  </div>
                )}
              </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
