"use client";

import { quickAddFrequentItem } from "../pantry-actions";
import { categoryEmoji } from "@/lib/categories";

type FrequentItem = { id: string; name: string; category: string | null };

export default function QuickAdd({ items }: { items: FrequentItem[] }) {
  if (items.length === 0) return null;

  return (
    <div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">Ajout rapide</h2>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <form key={item.id} action={quickAddFrequentItem}>
            <input type="hidden" name="id" value={item.id} />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent active:scale-95"
            >
              <span>{categoryEmoji(item.category ?? "autre")}</span>
              {item.name}
              <span className="text-accent">+</span>
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
