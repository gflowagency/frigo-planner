"use client";

import { useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function CoachChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!input.trim() || loading) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Échec de la réponse");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Le coach n'a pas pu répondre. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {messages.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <span className="text-3xl">🏋️</span>
          <p className="text-[15px] font-medium text-foreground">Ton coach nutrition &amp; sport</p>
          <p className="max-w-xs text-sm text-muted">
            Pose une question sur votre alimentation, vos objectifs, ou comment progresser. Il connaît vos profils et
            ce que vous avez mangé cette semaine.
          </p>
        </div>
      )}

      {messages.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          {messages.map((m, i) => (
            <p key={i} className={`text-sm ${m.role === "user" ? "text-foreground" : "text-muted"}`}>
              <span className="font-medium">{m.role === "user" ? "Toi : " : "Coach : "}</span>
              {m.content}
            </p>
          ))}
          {loading && <p className="text-xs text-muted-2">Le coach réfléchit…</p>}
        </div>
      )}

      {error && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="ex : comment mieux répartir mes protéines dans la journée ?"
          className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15"
        />
        <button
          onClick={send}
          disabled={loading}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? "…" : "Envoyer"}
        </button>
      </div>
    </div>
  );
}
