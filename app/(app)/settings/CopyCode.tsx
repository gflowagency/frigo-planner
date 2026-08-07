"use client";

import { useState } from "react";

export default function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — the code is still visible to copy manually
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-95"
    >
      {copied ? "Copié ✓" : "Copier"}
    </button>
  );
}
