"use client";

import { useRef, useState } from "react";
import { addPantryItem } from "../pantry-actions";
import { PANTRY_CATEGORIES } from "@/lib/categories";
import NutrientGrid from "../scan/NutrientGrid";

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

export default function ManualAddForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [estimatedNutrients, setEstimatedNutrients] = useState<Record<string, number> | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function estimateNutrients() {
    const name = String(new FormData(formRef.current!).get("name") ?? "").trim();
    if (!name) {
      setError("Indique d'abord un nom de produit.");
      return;
    }
    setEstimating(true);
    setError(null);
    try {
      const res = await fetch("/api/estimate-nutrients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de l'estimation");
      setEstimatedNutrients(data.nutrients);
    } catch {
      setError("Impossible d'estimer les nutriments pour le moment.");
    } finally {
      setEstimating(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={addPantryItem}
      onSubmit={() => setEstimatedNutrients(null)}
      className="flex flex-col gap-3 px-4"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input name="name" required placeholder="Nom" className={`col-span-2 ${fieldClass} sm:col-span-1`} />
        <select name="category" className={fieldClass} defaultValue="autre">
          {PANTRY_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.emoji} {c.label}
            </option>
          ))}
        </select>
        <input name="quantity" type="number" min={1} step="0.1" defaultValue={1} className={fieldClass} />
        <input name="unit" placeholder="unité (pièce, kg, g, l...)" className={fieldClass} />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {estimatedNutrients ? (
        <NutrientGrid nutrients={estimatedNutrients} estimated />
      ) : (
        <button
          type="button"
          onClick={estimateNutrients}
          disabled={estimating}
          className="self-start rounded-xl border border-dashed border-border px-3.5 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {estimating ? "Estimation en cours…" : "✨ Estimer les nutriments avec l'IA"}
        </button>
      )}

      <input type="hidden" name="nutrients" value={estimatedNutrients ? JSON.stringify(estimatedNutrients) : ""} />
      <input type="hidden" name="nutrientsEstimated" value={estimatedNutrients ? "true" : "false"} />

      <button
        type="submit"
        className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.98]"
      >
        Ajouter au stock
      </button>
    </form>
  );
}
