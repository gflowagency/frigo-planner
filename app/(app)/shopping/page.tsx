import { createClient } from "@/lib/supabase/server";
import { addShoppingItem } from "./actions";
import ShoppingListClient from "./ShoppingListClient";

const fieldClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

export default async function ShoppingPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("shopping_items")
    .select("id, name, quantity, checked")
    .order("checked", { ascending: true })
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Liste de courses</h1>
        <p className="mt-0.5 text-sm text-muted">
          Ajoute à la main ou depuis les ingrédients manquants d&apos;une recette.
        </p>
      </div>

      <form action={addShoppingItem} className="flex gap-2">
        <input name="name" required placeholder="Article" className={fieldClass} />
        <input name="quantity" placeholder="qté" className={`${fieldClass} w-24`} />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.98]"
        >
          Ajouter
        </button>
      </form>

      {!items?.length ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <span className="text-3xl">🛒</span>
          <p className="text-[15px] font-medium text-foreground">Liste vide</p>
          <p className="max-w-xs text-sm text-muted">
            Ajoute un article, ou marque des ingrédients &laquo;&nbsp;à acheter&nbsp;&raquo; depuis une recette.
          </p>
        </div>
      ) : (
        <ShoppingListClient items={items} />
      )}
    </div>
  );
}
