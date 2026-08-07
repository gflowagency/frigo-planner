import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addPantryItem, adjustPantryQuantity, deletePantryItem } from "../pantry-actions";
import { PANTRY_CATEGORIES, categoryLabel, categoryEmoji } from "@/lib/categories";

type PantryItem = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  quantity: number;
  unit: string;
  image_url: string | null;
};

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("pantry_items")
    .select("id, name, brand, category, quantity, unit, image_url")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  const grouped = new Map<string, PantryItem[]>();
  for (const item of (items ?? []) as PantryItem[]) {
    const key = item.category ?? "autre";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Stock du foyer</h1>
          <p className="mt-0.5 text-sm text-muted">
            {items?.length ?? 0} article{(items?.length ?? 0) > 1 ? "s" : ""} dans le frigo et les
            placards.
          </p>
        </div>
        <Link
          href="/scan"
          className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.98] sm:flex"
        >
          Scanner un produit
        </Link>
      </div>

      <details className="group rounded-2xl border border-border bg-surface open:pb-4">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground">
          Ajouter un article manuellement
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-2 transition-transform group-open:rotate-180"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </summary>
        <form action={addPantryItem} className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-4">
          <input name="name" required placeholder="Nom" className={`col-span-2 ${fieldClass} sm:col-span-1`} />
          <select name="category" className={fieldClass} defaultValue="autre">
            {PANTRY_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
          <input
            name="quantity"
            type="number"
            min={1}
            step="0.1"
            defaultValue={1}
            className={fieldClass}
          />
          <input name="unit" placeholder="unité (pièce, kg...)" defaultValue="piece" className={fieldClass} />
          <button
            type="submit"
            className="col-span-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.98] sm:col-span-4"
          >
            Ajouter au stock
          </button>
        </form>
      </details>

      {grouped.size === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <span className="text-3xl">🧊</span>
          <p className="text-[15px] font-medium text-foreground">Stock vide pour l&apos;instant</p>
          <p className="max-w-xs text-sm text-muted">
            Scanne ton premier produit pour commencer à suivre le frigo et les placards.
          </p>
          <Link
            href="/scan"
            className="mt-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.98]"
          >
            Scanner un produit
          </Link>
        </div>
      )}

      {[...grouped.entries()].map(([category, categoryItems]) => (
        <section key={category}>
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-2">
            <span>{categoryEmoji(category)}</span>
            {categoryLabel(category)}
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {categoryItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-foreground">{item.name}</p>
                  {item.brand && <p className="text-xs text-muted-2">{item.brand}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <form action={adjustPantryQuantity}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="delta" value={-1} />
                    <button
                      type="submit"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent active:scale-95"
                    >
                      −
                    </button>
                  </form>
                  <span className="w-16 text-center text-sm tabular-nums text-foreground">
                    {item.quantity} {item.unit}
                  </span>
                  <form action={adjustPantryQuantity}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="delta" value={1} />
                    <button
                      type="submit"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:text-accent active:scale-95"
                    >
                      +
                    </button>
                  </form>
                  <form action={deletePantryItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      aria-label="Supprimer"
                      className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-muted-2 transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Link
        href="/scan"
        aria-label="Scanner un produit"
        className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_10px_24px_-6px_rgba(193,96,46,0.5)] transition-transform active:scale-95 sm:hidden"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" />
          <path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" />
          <path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16" />
          <path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
          <line x1="7" y1="12" x2="17" y2="12" />
        </svg>
      </Link>
    </div>
  );
}
