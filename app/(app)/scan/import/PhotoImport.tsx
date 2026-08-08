"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { addPantryItem } from "../../pantry-actions";
import { PANTRY_CATEGORIES } from "@/lib/categories";
import NutriscoreBadge from "../NutriscoreBadge";

type ImportItem = {
  barcode: string;
  found: boolean;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  category: string;
  quantity: number;
  unit: string;
  nutriscore: string | null;
  nutrients: Record<string, number> | null;
  selected: boolean;
};

type Phase = "idle" | "decoding" | "review" | "saving" | "done";

export default function PhotoImport() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [items, setItems] = useState<ImportItem[]>([]);
  const [undecodedCount, setUndecodedCount] = useState(0);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setPhase("decoding");
    setProgress({ done: 0, total: files.length });
    setUndecodedCount(0);

    const reader = new BrowserMultiFormatReader();
    const barcodeCounts = new Map<string, number>();
    let failures = 0;

    for (const file of files) {
      const url = URL.createObjectURL(file);
      try {
        const result = await reader.decodeFromImageUrl(url);
        const code = result.getText();
        barcodeCounts.set(code, (barcodeCounts.get(code) ?? 0) + 1);
      } catch {
        failures++;
      } finally {
        URL.revokeObjectURL(url);
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
    }

    setUndecodedCount(failures);

    const results = await Promise.all(
      Array.from(barcodeCounts.entries()).map(async ([barcode, count]) => {
        try {
          const res = await fetch(`/api/lookup-barcode?code=${encodeURIComponent(barcode)}`);
          const data = await res.json();
          return {
            barcode,
            found: !!data.found,
            name: data.name ?? "Produit inconnu",
            brand: data.brand ?? null,
            imageUrl: data.imageUrl ?? null,
            category: data.category ?? "autre",
            quantity: (data.quantity ?? 1) * count,
            unit: data.unit ?? "piece",
            nutriscore: data.nutriscore ?? null,
            nutrients: data.nutrients ?? null,
            selected: true,
          } satisfies ImportItem;
        } catch {
          return {
            barcode,
            found: false,
            name: "Produit inconnu",
            brand: null,
            imageUrl: null,
            category: "autre",
            quantity: count,
            unit: "piece",
            nutriscore: null,
            nutrients: null,
            selected: true,
          } satisfies ImportItem;
        }
      }),
    );

    setItems(results);
    setPhase("review");
  }

  function updateItem(barcode: string, patch: Partial<ImportItem>) {
    setItems((prev) => prev.map((it) => (it.barcode === barcode ? { ...it, ...patch } : it)));
  }

  async function confirmImport() {
    setPhase("saving");
    const selected = items.filter((it) => it.selected);
    for (const item of selected) {
      const fd = new FormData();
      fd.set("barcode", item.barcode);
      fd.set("name", item.name);
      fd.set("brand", item.brand ?? "");
      fd.set("category", item.category);
      fd.set("quantity", String(item.quantity));
      fd.set("unit", item.unit);
      fd.set("imageUrl", item.imageUrl ?? "");
      fd.set("nutriscore", item.nutriscore ?? "");
      fd.set("nutrients", item.nutrients ? JSON.stringify(item.nutrients) : "");
      await addPantryItem(fd);
    }
    setPhase("done");
  }

  const selectedCount = items.filter((it) => it.selected).length;

  if (phase === "idle") {
    return (
      <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center transition-colors hover:border-accent hover:bg-accent-soft/40">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <circle cx="9" cy="11" r="2.2" />
            <path d="M21 16l-4.5-4.5a2 2 0 0 0-2.8 0L7 18" />
          </svg>
        </span>
        <span className="text-[15px] font-semibold text-foreground">Choisir des photos</span>
        <span className="text-sm text-muted">
          Sélectionne toutes les photos de codes-barres prises pendant tes courses.
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
    );
  }

  if (phase === "decoding") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-14 text-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent-soft border-t-accent" />
        <p className="text-[15px] font-medium text-foreground">
          Analyse des photos… {progress.done}/{progress.total}
        </p>
        <p className="text-sm text-muted">Détection des codes-barres en cours.</p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
        <span className="text-3xl">✅</span>
        <p className="text-[15px] font-medium text-foreground">
          {selectedCount} article{selectedCount > 1 ? "s" : ""} ajouté{selectedCount > 1 ? "s" : ""} au stock
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.98]"
        >
          Voir le stock
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {undecodedCount > 0 && (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {undecodedCount} photo{undecodedCount > 1 ? "s n'ont" : " n'a"} pas pu être lue{undecodedCount > 1 ? "s" : ""}.
          Réessaie avec une prise plus nette si besoin.
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center text-sm text-muted">
          Aucun code-barres détecté dans ces photos.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">
            {items.length} produit{items.length > 1 ? "s" : ""} détecté{items.length > 1 ? "s" : ""} — vérifie avant
            d&apos;ajouter au stock.
          </p>
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.barcode} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={(e) => updateItem(item.barcode, { selected: e.target.checked })}
                    className="h-5 w-5 shrink-0 accent-accent"
                  />
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="h-11 w-11 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-soft text-lg">
                      🍽️
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <input
                        value={item.name}
                        onChange={(e) => updateItem(item.barcode, { name: e.target.value })}
                        className="w-full rounded-lg border border-transparent bg-transparent px-1 text-[15px] font-medium text-foreground focus:border-accent focus:bg-background focus:outline-none"
                      />
                      {item.nutriscore && <NutriscoreBadge grade={item.nutriscore} />}
                    </div>
                    {!item.found && <p className="px-1 text-xs text-muted-2">Non trouvé sur OpenFoodFacts</p>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pl-8">
                  <select
                    value={item.category}
                    onChange={(e) => updateItem(item.barcode, { category: e.target.value })}
                    className="col-span-2 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                  >
                    {PANTRY_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0.1}
                      step="0.1"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.barcode, { quantity: Number(e.target.value) })}
                      className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground"
                    />
                    <span className="text-xs text-muted-2">{item.unit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={confirmImport}
            disabled={selectedCount === 0 || phase === "saving"}
            className="rounded-xl bg-accent px-4 py-3 text-[15px] font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
          >
            {phase === "saving"
              ? "Ajout en cours…"
              : `Ajouter ${selectedCount} article${selectedCount > 1 ? "s" : ""} au stock`}
          </button>
        </>
      )}
    </div>
  );
}
