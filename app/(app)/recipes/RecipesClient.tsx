"use client";

import { useEffect, useRef, useState } from "react";
import type { ProposedRecipe } from "@/lib/recipe-tool";
import RecipeCard from "./RecipeCard";
import { saveFavoriteRecipe } from "./favorites-actions";
import { addIngredientsToShoppingList } from "../shopping/actions";

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
  const [savedIdx, setSavedIdx] = useState<Record<number, boolean>>({});
  const [shoppingAddedIdx, setShoppingAddedIdx] = useState<Record<number, boolean>>({});
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages, chatLoading]);

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
      setSavedIdx({});
      setShoppingAddedIdx({});
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
        body: JSON.stringify({
          ingredients: recipe.ingredients,
          title: recipe.title,
          caloriesPerServing: recipe.estimated_calories_per_serving,
          servings: recipe.servings,
        }),
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

  async function saveFavorite(idx: number) {
    const recipe = recipes?.[idx];
    if (!recipe) return;
    await saveFavoriteRecipe(recipe);
    setSavedIdx((prev) => ({ ...prev, [idx]: true }));
  }

  async function addMissingToShoppingList(idx: number) {
    const recipe = recipes?.[idx];
    if (!recipe) return;
    const missing = recipe.ingredients.filter((ing) => !ing.have_in_stock);
    if (missing.length === 0) {
      setShoppingAddedIdx((prev) => ({ ...prev, [idx]: true }));
      return;
    }
    await addIngredientsToShoppingList(missing.map((ing) => ({ name: ing.name, quantity: ing.quantity })));
    setShoppingAddedIdx((prev) => ({ ...prev, [idx]: true }));
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
          className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_10px_20px_-8px_rgba(193,96,46,0.45)] transition-all hover:bg-accent-hover hover:shadow-[0_12px_22px_-6px_rgba(193,96,46,0.55)] active:scale-[0.98] disabled:opacity-50"
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
            <div
              key={i}
              className="animate-skeleton-in rounded-2xl border border-border bg-surface p-5"
              style={{ animationDelay: `${i * 100}ms` }}
            >
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
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-3xl">🍲</span>
          <p className="text-[15px] font-medium text-foreground">Pas encore de recettes</p>
          <p className="max-w-xs text-sm text-muted">
            Génère 3 idées adaptées à votre stock actuel, à la saison et à vos objectifs.
          </p>
        </div>
      )}

      {!loading && recipes && (
        <div className="flex flex-col gap-4">
          {recipes.map((recipe, idx) => (
            <RecipeCard key={idx} recipe={recipe} className="animate-fade-in-up" style={{ animationDelay: `${idx * 60}ms` }}>
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
              <button
                onClick={() => saveFavorite(idx)}
                disabled={savedIdx[idx]}
                className="rounded-xl border border-border px-3.5 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
              >
                {savedIdx[idx] ? "★ Sauvegardée" : "☆ Sauvegarder"}
              </button>
              <button
                onClick={() => addMissingToShoppingList(idx)}
                disabled={shoppingAddedIdx[idx]}
                className="rounded-xl border border-border px-3.5 py-2 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
              >
                {shoppingAddedIdx[idx] ? "✓ Ajouté aux courses" : "Ajouter le manquant aux courses"}
              </button>
            </RecipeCard>
          ))}
        </div>
      )}

      {!loading && recipes && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Ajuster les recettes</h3>
          {chatMessages.length > 0 && (
            <div className="mb-3 flex max-h-72 flex-col gap-2 overflow-y-auto rounded-xl bg-background p-3">
              {chatMessages.map((m, i) => (
                <div key={i} className={`animate-fade-in-up flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <p
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "rounded-br-md bg-accent text-accent-foreground"
                        : "rounded-bl-md bg-surface text-foreground"
                    }`}
                  >
                    {m.content}
                  </p>
                </div>
              ))}
              {chatLoading && (
                <div className="animate-fade-in-up flex justify-start">
                  <span className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-surface px-4 py-3">
                    <span className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-muted-2" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-muted-2" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-muted-2" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              )}
              <div ref={chatBottomRef} />
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
              disabled={chatLoading || !chatInput.trim()}
              className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_10px_20px_-8px_rgba(193,96,46,0.45)] transition-all hover:bg-accent-hover hover:shadow-[0_12px_22px_-6px_rgba(193,96,46,0.55)] active:scale-[0.98] disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
