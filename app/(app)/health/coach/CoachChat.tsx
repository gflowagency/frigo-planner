"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function CoachChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

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
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-3xl">🏋️</span>
          <p className="text-[15px] font-medium text-foreground">Ton coach nutrition &amp; sport</p>
          <p className="max-w-xs text-sm text-muted">
            Pose une question sur votre alimentation, vos objectifs, ou comment progresser. Il connaît vos profils et
            ce que vous avez mangé cette semaine.
          </p>
        </div>
      )}

      {messages.length > 0 && (
        <div className="flex max-h-[60vh] flex-col gap-2.5 overflow-y-auto rounded-2xl border border-border bg-surface p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`animate-fade-in-up flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <p
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-br-md bg-accent text-accent-foreground"
                    : "rounded-bl-md bg-background text-foreground"
                }`}
              >
                {m.content}
              </p>
            </div>
          ))}
          {loading && (
            <div className="animate-fade-in-up flex justify-start">
              <span className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-background px-4 py-3">
                <span className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-muted-2" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-muted-2" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-muted-2" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {error && <p className="animate-fade-in-up rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

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
          disabled={loading || !input.trim()}
          className="rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_10px_20px_-8px_rgba(193,96,46,0.45)] transition-all hover:bg-accent-hover hover:shadow-[0_12px_22px_-6px_rgba(193,96,46,0.55)] active:scale-[0.98] disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
