"use client";

import { useRef, useState } from "react";
import { logFood } from "./actions";
import NutrientGrid from "../scan/NutrientGrid";

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

const MEAL_OPTIONS = [
  { value: "matin", label: "Matin" },
  { value: "midi", label: "Midi" },
  { value: "gouter", label: "Goûter" },
  { value: "soir", label: "Soir" },
];

function guessCurrentMeal(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "matin";
  if (hour < 15) return "midi";
  if (hour < 19) return "gouter";
  return "soir";
}

export default function LogFoodForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [estimated, setEstimated] = useState<Record<string, number> | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function estimate() {
    const name = String(new FormData(formRef.current!).get("name") ?? "").trim();
    if (!name) {
      setError("Décris d'abord ce que tu as mangé.");
      return;
    }
    setEstimating(true);
    setError(null);
    try {
      const res = await fetch("/api/estimate-nutrients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, mode: "portion" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de l'estimation");
      setEstimated(data.nutrients);
    } catch {
      setError("Impossible d'estimer les nutriments pour le moment.");
    } finally {
      setEstimating(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={logFood}
      onSubmit={() => setEstimated(null)}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <div className="flex gap-2">
        <input
          name="name"
          required
          placeholder="ex : 1 banane, une part de pizza, salade au resto…"
          className={fieldClass}
        />
        <select name="mealSlot" defaultValue={guessCurrentMeal()} className={`w-28 shrink-0 ${fieldClass}`}>
          {MEAL_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {estimated ? (
        <NutrientGrid nutrients={estimated} estimated basisLabel="pour cette portion" />
      ) : (
        <button
          type="button"
          onClick={estimate}
          disabled={estimating}
          className="self-start rounded-xl border border-dashed border-border px-3.5 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {estimating ? "Estimation en cours…" : "✨ Estimer avec l'IA"}
        </button>
      )}

      <input type="hidden" name="nutrients" value={estimated ? JSON.stringify(estimated) : ""} />

      <button
        type="submit"
        disabled={!estimated}
        className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_10px_20px_-8px_rgba(193,96,46,0.45)] transition-all hover:bg-accent-hover hover:shadow-[0_12px_22px_-6px_rgba(193,96,46,0.55)] active:scale-[0.98] disabled:opacity-50"
      >
        Ajouter au journal
      </button>
    </form>
  );
}
