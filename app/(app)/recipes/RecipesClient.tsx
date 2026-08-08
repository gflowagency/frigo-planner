"use client";

import { useState } from "react";
import type { ProposedRecipe } from "@/lib/recipe-tool";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SEASON_EMOJI: Record<string, string> = {
  hiver: "❄️",
  printemps: "🌱",
  été: "☀️",
  automne: "🍂",
};

export default function RecipesClient() {
  const [recipes, setRecipes] = useState<ProposedRecipe[] | null>(null);
  const [season, setSeason] = useState<string | null>(null);
  const [mood, setMood] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [consumingIdx, setConsumingIdx] = useState<number | null>(null);
  const [consumedSummary, setConsumedSummary] = useState<Record<number, string>>({});

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: mood || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de la génération");
      setRecipes(data.recipes);
      setSeason(data.season);
      setChatMessages([]);
      setConsumedSummary({});
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Impossible de générer des recettes pour le moment. Réessaie.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function markPrepared(idx: number) {
    const recipe = recipes?.[idx];
    if (!recipe) return;
    setConsumingIdx(idx);
    try {
      const res = await fetch("/api/recipes/consume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredients: recipe.ingredients }),
      });
      if (!res.ok) throw new Error("Échec");
      const data: { deducted: { ingredient: string; matched: string }[]; notFound: string[] } =
        await res.json();
      const parts: string[] = [];
      if (data.deducted.length > 0) {
        parts.push(`Retiré du stock : ${data.deducted.map((d) => d.matched).join(", ")}.`);
      }
      if (data.notFound.length > 0) {
        parts.push(`Non trouvés en stock (à ajuster manuellement) : ${data.notFound.join(", ")}.`);
      }
      setConsumedSummary((prev) => ({
        ...prev,
        [idx]: parts.join(" ") || "Rien à retirer du stock pour cette recette.",
      }));
    } catch {
      setError("Impossible de mettre à jour le stock. Réessaie.");
    } finally {
      setConsumingIdx(null);
    }
  }

  async function sendChat() {
    if (!chatInput.trim() || !recipes) return;
    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", content: chatInput }];
    setChatMessages(nextMessages);
    setChatInput("");
    setChatLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, previousRecipes: recipes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de l'ajustement");
      setRecipes(data.recipes);
      setConsumedSummary({});
      setChatMessages([
        ...nextMessages,
        { role: "assistant", content: "J'ai mis à jour les recettes selon ton retour." },
      ]);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "L'ajustement a échoué. Réessaie.");
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
        <input
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          placeholder="Une envie particulière ? (léger, réconfortant, rapide…)"
          className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
        />
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "Génération…" : recipes ? "Regénérer" : "Suggérer des recettes"}
        </button>
      </div>

      {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

      {season && !loading && (
        <p className="text-xs font-medium uppercase tracking-wide text-muted-2">
          {SEASON_EMOJI[season] ?? ""} Suggestions adaptées à la saison : {season}
        </p>
      )}

      {loading && (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-border bg-surface p-5">
              <div className="mb-3 h-4 w-2/5 rounded-full bg-accent-soft" />
              <div className="mb-2 h-3 w-full rounded-full bg-border" />
              <div className="mb-5 h-3 w-3/4 rounded-full bg-border" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="h-3 w-1/2 rounded-full bg-border" />
                  <div className="h-3 w-full rounded-full bg-border" />
                  <div className="h-3 w-5/6 rounded-full bg-border" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-1/2 rounded-full bg-border" />
                  <div className="h-3 w-full rounded-full bg-border" />
                  <div className="h-3 w-4/6 rounded-full bg-border" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !recipes && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <span className="text-3xl">🍲</span>
          <p className="text-[15px] font-medium text-foreground">Pas encore de recettes</p>
          <p className="max-w-xs text-sm text-muted">
            Génère 3 idées adaptées à votre stock actuel, à la saison et à vos objectifs.
          </p>
        </div>
      )}

      {!loading && recipes && (
        <div className="flex flex-col gap-4">
          {recipes.map((recipe, idx) => (
            <article key={idx} className="rounded-2xl border border-border bg-surface p-5">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="text-[17px] font-semibold tracking-tight text-foreground">{recipe.title}</h3>
                <span className="whitespace-nowrap rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium tabular-nums text-accent-hover">
                  ~{recipe.estimated_calories_per_serving} kcal / part
                </span>
              </div>
              <p className="mb-3 text-sm text-muted">{recipe.description}</p>
              <p className="mb-3 text-xs font-medium text-muted-2">
                Pour {recipe.servings} personne{recipe.servings > 1 ? "s" : ""}
              </p>

              <div className="grid gap-5 border-t border-border pt-4 sm:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">
                    Ingrédients
                  </h4>
                  <ul className="space-y-1.5 text-sm text-foreground">
                    {recipe.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span
                          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                            ing.have_in_stock ? "bg-success" : "bg-accent"
                          }`}
                        />
                        <span>
                          {ing.quantity} — {ing.name}
                          {!ing.have_in_stock && (
                            <span className="ml-1 text-xs font-medium text-accent">(à acheter)</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">
                    Préparation
                  </h4>
                  <ol className="space-y-1.5 text-sm text-foreground">
                    {recipe.instructions.map((step, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-hover">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                {consumedSummary[idx] ? (
                  <p className="rounded-xl bg-success-soft px-3 py-2.5 text-xs text-success">
                    ✓ Recette préparée. {consumedSummary[idx]}
                  </p>
                ) : (
                  <button
                    onClick={() => markPrepared(idx)}
                    disabled={consumingIdx === idx}
                    className="rounded-xl border border-border px-3.5 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                  >
                    {consumingIdx === idx ? "Mise à jour du stock…" : "Marquer comme préparée"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && recipes && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Ajuster les recettes</h3>
          {chatMessages.length > 0 && (
            <div className="mb-3 flex flex-col gap-2">
              {chatMessages.map((m, i) => (
                <p
                  key={i}
                  className={`text-sm ${m.role === "user" ? "text-foreground" : "text-muted"}`}
                >
                  <span className="font-medium">{m.role === "user" ? "Vous : " : "Assistant : "}</span>
                  {m.content}
                </p>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="ex: pas envie de poisson, quelque chose de plus rapide…"
              className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
            />
            <button
              onClick={sendChat}
              disabled={chatLoading}
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
            >
              {chatLoading ? "…" : "Envoyer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
