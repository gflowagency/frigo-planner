"use client";

import { useState } from "react";
import type { ProposedRecipe } from "@/lib/recipe-tool";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function RecipesClient() {
  const [recipes, setRecipes] = useState<ProposedRecipe[] | null>(null);
  const [season, setSeason] = useState<string | null>(null);
  const [mood, setMood] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood: mood || undefined }),
      });
      if (!res.ok) throw new Error("Échec de la génération");
      const data = await res.json();
      setRecipes(data.recipes);
      setSeason(data.season);
      setChatMessages([]);
    } catch {
      setError("Impossible de générer des recettes pour le moment. Réessaie.");
    } finally {
      setLoading(false);
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
      if (!res.ok) throw new Error("Échec de l'ajustement");
      const data = await res.json();
      setRecipes(data.recipes);
      setChatMessages([
        ...nextMessages,
        { role: "assistant", content: "J'ai mis à jour les recettes selon ton retour." },
      ]);
    } catch {
      setError("L'ajustement a échoué. Réessaie.");
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center">
        <input
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          placeholder="Une envie particulière ? (optionnel : léger, réconfortant, rapide…)"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
        />
        <button
          onClick={generate}
          disabled={loading}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? "Génération…" : recipes ? "Regénérer" : "Suggérer des recettes"}
        </button>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {season && (
        <p className="text-xs uppercase tracking-wide text-neutral-400">
          Suggestions adaptées à la saison : {season}
        </p>
      )}

      {recipes && (
        <div className="flex flex-col gap-4">
          {recipes.map((recipe, idx) => (
            <article key={idx} className="rounded-lg border border-neutral-200 bg-white p-5">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-neutral-900">{recipe.title}</h3>
                <span className="whitespace-nowrap rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-600">
                  ~{recipe.estimated_calories_per_serving} kcal / part
                </span>
              </div>
              <p className="mb-3 text-sm text-neutral-500">{recipe.description}</p>
              <p className="mb-2 text-xs font-medium text-neutral-400">
                Pour {recipe.servings} personne{recipe.servings > 1 ? "s" : ""}
              </p>

              <div className="mb-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Ingrédients
                  </h4>
                  <ul className="space-y-1 text-sm text-neutral-700">
                    {recipe.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            ing.have_in_stock ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                        />
                        {ing.quantity} — {ing.name}
                        {!ing.have_in_stock && (
                          <span className="text-xs text-amber-600">(à acheter)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    Préparation
                  </h4>
                  <ol className="list-decimal space-y-1 pl-4 text-sm text-neutral-700">
                    {recipe.instructions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {recipes && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-neutral-700">Ajuster les recettes</h3>
          <div className="mb-3 flex flex-col gap-2">
            {chatMessages.map((m, i) => (
              <p
                key={i}
                className={`text-sm ${m.role === "user" ? "text-neutral-900" : "text-neutral-500"}`}
              >
                <span className="font-medium">{m.role === "user" ? "Vous : " : "Assistant : "}</span>
                {m.content}
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="ex: pas envie de poisson, quelque chose de plus rapide…"
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
            <button
              onClick={sendChat}
              disabled={chatLoading}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {chatLoading ? "…" : "Envoyer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
