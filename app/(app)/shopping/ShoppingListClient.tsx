"use client";

import { useOptimistic, useTransition } from "react";
import { toggleShoppingItem, deleteShoppingItem, clearCheckedShoppingItems } from "./actions";

type Item = { id: string; name: string; quantity: string | null; checked: boolean };
type OptimisticAction = { type: "toggle"; id: string } | { type: "delete"; id: string } | { type: "clearChecked" };

export default function ShoppingListClient({ items }: { items: Item[] }) {
  const [, startTransition] = useTransition();
  const [optimisticItems, applyOptimistic] = useOptimistic(items, (state, action: OptimisticAction) => {
    if (action.type === "toggle") return state.map((i) => (i.id === action.id ? { ...i, checked: !i.checked } : i));
    if (action.type === "delete") return state.filter((i) => i.id !== action.id);
    return state.filter((i) => !i.checked);
  });

  function toggle(item: Item) {
    startTransition(async () => {
      applyOptimistic({ type: "toggle", id: item.id });
      const fd = new FormData();
      fd.set("id", item.id);
      fd.set("checked", String(item.checked));
      await toggleShoppingItem(fd);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      applyOptimistic({ type: "delete", id });
      const fd = new FormData();
      fd.set("id", id);
      await deleteShoppingItem(fd);
    });
  }

  function clearChecked() {
    startTransition(async () => {
      applyOptimistic({ type: "clearChecked" });
      await clearCheckedShoppingItems();
    });
  }

  const pending = optimisticItems.filter((i) => !i.checked);
  const checked = optimisticItems.filter((i) => i.checked);

  return (
    <div className="flex flex-col gap-5">
      {pending.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {pending.map((item, i) => (
            <Row key={item.id} item={item} delay={Math.min(i, 8) * 30} onToggle={toggle} onDelete={remove} />
          ))}
        </ul>
      ) : (
        checked.length > 0 && (
          <p className="animate-fade-in-up rounded-2xl border border-dashed border-border bg-surface px-6 py-8 text-center text-sm text-muted">
            🎉 Tout est pris.
          </p>
        )
      )}

      {checked.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-2">
              Déjà pris ({checked.length})
            </h2>
            <button
              type="button"
              onClick={clearChecked}
              className="text-xs font-medium text-muted-2 underline transition-colors hover:text-accent"
            >
              Vider
            </button>
          </div>
          <ul className="animate-fade-in divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface opacity-60">
            {checked.map((item) => (
              <Row key={item.id} item={item} onToggle={toggle} onDelete={remove} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({
  item,
  delay,
  onToggle,
  onDelete,
}: {
  item: Item;
  delay?: number;
  onToggle: (item: Item) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li
      className="animate-fade-in-up flex items-center gap-3 px-4 py-3"
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      <button
        type="button"
        onClick={() => onToggle(item)}
        aria-label={item.checked ? "Décocher" : "Cocher"}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition-all active:scale-90 ${
          item.checked ? "border-accent bg-accent text-accent-foreground" : "border-border text-transparent hover:border-accent"
        }`}
      >
        ✓
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm transition-colors ${item.checked ? "text-muted-2 line-through" : "text-foreground"}`}>
          {item.name}
        </p>
      </div>
      {item.quantity && <span className="shrink-0 text-xs text-muted-2">{item.quantity}</span>}
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        aria-label="Supprimer"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-2 transition-colors hover:bg-danger-soft hover:text-danger active:scale-90"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </li>
  );
}
