"use client";

import { toggleShoppingItem, deleteShoppingItem, clearCheckedShoppingItems } from "./actions";

type Item = { id: string; name: string; quantity: string | null; checked: boolean };

export default function ShoppingListClient({ items }: { items: Item[] }) {
  const pending = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  return (
    <div className="flex flex-col gap-5">
      {pending.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {pending.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </ul>
      )}

      {checked.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-2">
              Déjà pris ({checked.length})
            </h2>
            <form action={clearCheckedShoppingItems}>
              <button type="submit" className="text-xs font-medium text-muted-2 underline hover:text-accent">
                Vider
              </button>
            </form>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface opacity-60">
            {checked.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Row({ item }: { item: Item }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <form action={toggleShoppingItem}>
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="checked" value={String(item.checked)} />
        <button
          type="submit"
          aria-label={item.checked ? "Décocher" : "Cocher"}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs transition-colors ${
            item.checked ? "border-accent bg-accent text-accent-foreground" : "border-border text-transparent"
          }`}
        >
          ✓
        </button>
      </form>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${item.checked ? "text-muted-2 line-through" : "text-foreground"}`}>
          {item.name}
        </p>
      </div>
      {item.quantity && <span className="shrink-0 text-xs text-muted-2">{item.quantity}</span>}
      <form action={deleteShoppingItem}>
        <input type="hidden" name="id" value={item.id} />
        <button
          type="submit"
          aria-label="Supprimer"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-2 transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </form>
    </li>
  );
}
