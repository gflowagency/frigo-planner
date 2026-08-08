"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { addPantryItem } from "../pantry-actions";
import { PANTRY_CATEGORIES } from "@/lib/categories";
import NutriscoreBadge from "./NutriscoreBadge";

type LookupResult = {
  found: boolean;
  barcode?: string;
  name?: string;
  brand?: string | null;
  imageUrl?: string | null;
  category?: string;
  quantity?: number | null;
  unit?: string | null;
  nutriscore?: string | null;
  nutrients?: Record<string, number> | null;
};

const fieldClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15";

const NUTRIENT_LABELS: Record<string, string> = {
  kcal: "Énergie",
  proteines: "Protéines",
  glucides: "Glucides",
  sucres: "dont sucres",
  lipides: "Lipides",
  acides_gras_satures: "dont saturés",
  fibres: "Fibres",
  sel: "Sel",
};

export default function BarcodeScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loadingLookup, setLoadingLookup] = useState(false);

  useEffect(() => {
    if (!scanning) return;

    const reader = new BrowserMultiFormatReader();
    let cancelled = false;
    let controls: { stop: () => void } | undefined;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (scanResult, err) => {
        if (cancelled || result) return;
        if (scanResult) {
          const code = scanResult.getText();
          setScanning(false);
          controls?.stop();
          void lookup(code);
        }
        // NotFoundException fires continuously while scanning — expected, ignore it.
        void err;
      })
      .then((c) => {
        controls = c;
      })
      .catch((e: Error) => {
        setError(
          e.name === "NotAllowedError"
            ? "Accès à la caméra refusé. Autorise la caméra pour scanner un code-barres."
            : "Impossible d'accéder à la caméra sur cet appareil.",
        );
        setScanning(false);
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  async function lookup(code: string) {
    setLoadingLookup(true);
    setError(null);
    try {
      const res = await fetch(`/api/lookup-barcode?code=${encodeURIComponent(code)}`);
      const data: LookupResult = await res.json();
      setResult(data);
    } catch {
      setError("La recherche du produit a échoué. Réessaie ou ajoute-le manuellement.");
    } finally {
      setLoadingLookup(false);
    }
  }

  function reset() {
    setResult(null);
    setError(null);
    setScanning(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {!scanning && !result && (
        <button
          onClick={() => setScanning(true)}
          className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center transition-colors hover:border-accent hover:bg-accent-soft/40"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" />
              <path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8" />
              <path d="M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16" />
              <path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
              <line x1="7" y1="12" x2="17" y2="12" />
            </svg>
          </span>
          <span className="text-[15px] font-semibold text-foreground">Démarrer le scan</span>
          <span className="text-sm text-muted">Vise le code-barres, on s&apos;occupe du reste.</span>
        </button>
      )}

      {scanning && (
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} className="aspect-[3/4] w-full object-cover sm:aspect-video" muted playsInline />
          <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-accent/70 sm:inset-16">
            <span className="absolute -left-0.5 -top-0.5 h-6 w-6 rounded-tl-2xl border-l-4 border-t-4 border-accent" />
            <span className="absolute -right-0.5 -top-0.5 h-6 w-6 rounded-tr-2xl border-r-4 border-t-4 border-accent" />
            <span className="absolute -bottom-0.5 -left-0.5 h-6 w-6 rounded-bl-2xl border-b-4 border-l-4 border-accent" />
            <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-br-2xl border-b-4 border-r-4 border-accent" />
          </div>
          <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-8 text-center text-xs font-medium text-white">
            Vise le code-barres du produit avec la caméra
          </p>
        </div>
      )}

      {loadingLookup && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-soft border-t-accent" />
          Recherche du produit…
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
      )}

      {result && (
        <form
          action={async (formData) => {
            await addPantryItem(formData);
            reset();
          }}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
        >
          <div className="flex items-center gap-3">
            {result.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.imageUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-soft text-xl">
                🍽️
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[15px] font-medium text-foreground">
                  {result.found ? result.name : "Produit inconnu"}
                </p>
                {result.nutriscore && <NutriscoreBadge grade={result.nutriscore} />}
              </div>
              {result.brand && <p className="text-xs text-muted-2">{result.brand}</p>}
              {!result.found && (
                <p className="text-xs text-muted-2">
                  Ce code-barres n&apos;est pas dans OpenFoodFacts, complète les infos.
                </p>
              )}
            </div>
          </div>

          {result.nutrients && (
            <div className="grid grid-cols-4 gap-2 rounded-xl bg-background p-3 text-center">
              {Object.entries(result.nutrients).map(([key, value]) => (
                <div key={key}>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {Math.round(value * 10) / 10}
                    {key === "kcal" ? "" : "g"}
                  </p>
                  <p className="text-[10px] leading-tight text-muted-2">{NUTRIENT_LABELS[key] ?? key}</p>
                </div>
              ))}
              <p className="col-span-4 -mt-1 text-[10px] text-muted-2">pour 100 g</p>
            </div>
          )}

          <input type="hidden" name="barcode" value={result.barcode ?? ""} />
          <input type="hidden" name="imageUrl" value={result.imageUrl ?? ""} />
          <input type="hidden" name="nutriscore" value={result.nutriscore ?? ""} />
          <input type="hidden" name="nutrients" value={result.nutrients ? JSON.stringify(result.nutrients) : ""} />

          <input
            name="name"
            defaultValue={result.name ?? ""}
            required
            placeholder="Nom du produit"
            className={fieldClass}
          />
          <input name="brand" defaultValue={result.brand ?? ""} placeholder="Marque" className={fieldClass} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <select
              name="category"
              defaultValue={result.category ?? "autre"}
              className={`col-span-2 ${fieldClass}`}
            >
              {PANTRY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
            <input
              name="quantity"
              type="number"
              min={0.1}
              step="0.1"
              defaultValue={result.quantity ?? 1}
              className={fieldClass}
            />
            <input
              name="unit"
              defaultValue={result.unit ?? "piece"}
              placeholder="unité"
              className={fieldClass}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-all hover:bg-accent-hover active:scale-[0.98]"
            >
              Ajouter au stock
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-background"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
