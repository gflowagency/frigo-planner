import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addPantryItem, adjustPantryQuantity, deletePantryItem } from "../pantry-actions";
import { PANTRY_CATEGORIES, categoryLabel } from "@/lib/categories";

type PantryItem = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  quantity: number;
  unit: string;
  image_url: string | null;
};

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
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Stock du foyer</h1>
          <p className="text-sm text-neutral-500">
            {items?.length ?? 0} article{(items?.length ?? 0) > 1 ? "s" : ""} dans le frigo et les placards.
          </p>
        </div>
        <Link
          href="/scan"
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Scanner un produit
        </Link>
      </div>

      <details className="rounded-lg border border-neutral-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-medium text-neutral-700">
          Ajouter un article manuellement
        </summary>
        <form action={addPantryItem} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input
            name="name"
            required
            placeholder="Nom"
            className="col-span-2 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none sm:col-span-1"
          />
          <select
            name="category"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            defaultValue="autre"
          >
            {PANTRY_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            name="quantity"
            type="number"
            min={1}
            step="0.1"
            defaultValue={1}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <input
            name="unit"
            placeholder="unité (pièce, kg...)"
            defaultValue="piece"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <button
            type="submit"
            className="col-span-2 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 sm:col-span-4"
          >
            Ajouter au stock
          </button>
        </form>
      </details>

      {grouped.size === 0 && (
        <p className="rounded-lg border border-dashed border-neutral-300 bg-white px-4 py-8 text-center text-sm text-neutral-500">
          Stock vide pour l&apos;instant. Scanne ton premier produit pour commencer.
        </p>
      )}

      {[...grouped.entries()].map(([category, categoryItems]) => (
        <section key={category}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {categoryLabel(category)}
          </h2>
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {categoryItems.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">{item.name}</p>
                  {item.brand && <p className="text-xs text-neutral-400">{item.brand}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <form action={adjustPantryQuantity}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="delta" value={-1} />
                    <button
                      type="submit"
                      className="h-7 w-7 rounded-full border border-neutral-300 text-sm text-neutral-600 hover:bg-neutral-100"
                    >
                      −
                    </button>
                  </form>
                  <span className="w-16 text-center text-sm text-neutral-700">
                    {item.quantity} {item.unit}
                  </span>
                  <form action={adjustPantryQuantity}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="delta" value={1} />
                    <button
                      type="submit"
                      className="h-7 w-7 rounded-full border border-neutral-300 text-sm text-neutral-600 hover:bg-neutral-100"
                    >
                      +
                    </button>
                  </form>
                  <form action={deletePantryItem}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      className="text-xs text-neutral-400 hover:text-red-600"
                    >
                      Supprimer
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
