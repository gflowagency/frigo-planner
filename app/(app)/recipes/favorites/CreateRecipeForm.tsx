"use client";

import { useState } from "react";
import { createManualRecipe } from "../favorites-actions";

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

type IngredientRow = { name: string; quantity: string };

export default function CreateRecipeForm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState(2);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([{ name: "", quantity: "" }]);
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateIngredient(i: number, field: keyof IngredientRow, value: string) {
    setIngredients((prev) => prev.map((ing, idx) => (idx === i ? { ...ing, [field]: value } : ing)));
  }

  function addIngredientRow() {
    setIngredients((prev) => [...prev, { name: "", quantity: "" }]);
  }

  function removeIngredientRow(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

  function reset() {
    setTitle("");
    setDescription("");
    setServings(2);
    setIngredients([{ name: "", quantity: "" }]);
    setInstructions("");
    setOpen(false);
  }

  async function save() {
    const cleanIngredients = ingredients
      .map((ing) => ({ name: ing.name.trim(), quantity: ing.quantity.trim() }))
      .filter((ing) => ing.name);
    const cleanInstructions = instructions
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!title.trim()) {
      setError("Donne un titre à ta recette.");
      return;
    }
    if (cleanIngredients.length === 0) {
      setError("Ajoute au moins un ingrédient.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createManualRecipe({
        title: title.trim(),
        description: description.trim(),
        servings,
        ingredients: cleanIngredients,
        instructions: cleanInstructions,
      });
      reset();
    } catch {
      setError("Impossible d'enregistrer la recette. Réessaie.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-border bg-surface px-4 py-3.5 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-accent"
      >
        + Ajouter ma recette
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Titre de la recette"
        className={fieldClass}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optionnel)"
        rows={2}
        className={fieldClass}
      />
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-2">Portions</label>
        <input
          type="number"
          min={1}
          value={servings}
          onChange={(e) => setServings(Math.max(1, Number(e.target.value)))}
          className={`w-20 ${fieldClass}`}
        />
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-2">Ingrédients</h4>
        {ingredients.map((ing, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={ing.name}
              onChange={(e) => updateIngredient(i, "name", e.target.value)}
              placeholder="Ingrédient"
              className={fieldClass}
            />
            <input
              value={ing.quantity}
              onChange={(e) => updateIngredient(i, "quantity", e.target.value)}
              placeholder="Quantité"
              className={`w-28 shrink-0 ${fieldClass}`}
            />
            {ingredients.length > 1 && (
              <button
                type="button"
                onClick={() => removeIngredientRow(i)}
                className="shrink-0 rounded-xl border border-border px-3 text-sm text-muted-2 transition-colors hover:border-danger hover:text-danger"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addIngredientRow}
          className="self-start rounded-xl border border-dashed border-border px-3.5 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
        >
          + Ajouter un ingrédient
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-2">Préparation</h4>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder={"Une étape par ligne"}
          rows={4}
          className={fieldClass}
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer la recette"}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={saving}
          className="rounded-xl border border-border px-3.5 py-2 text-xs font-medium text-muted-2 transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
