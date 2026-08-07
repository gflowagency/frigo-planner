"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { addPantryItem } from "../pantry-actions";
import { PANTRY_CATEGORIES } from "@/lib/categories";

type LookupResult = {
  found: boolean;
  barcode?: string;
  name?: string;
  brand?: string | null;
  imageUrl?: string | null;
  category?: string;
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
          className="rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Démarrer le scan
        </button>
      )}

      {scanning && (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-black">
          <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
          <p className="bg-neutral-900 px-3 py-2 text-center text-xs text-neutral-300">
            Vise le code-barres du produit avec la caméra.
          </p>
        </div>
      )}

      {loadingLookup && <p className="text-sm text-neutral-500">Recherche du produit…</p>}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {result && (
        <form
          action={async (formData) => {
            await addPantryItem(formData);
            reset();
          }}
          className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <div className="flex items-center gap-3">
            {result.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.imageUrl} alt="" className="h-14 w-14 rounded-md object-cover" />
            )}
            <div>
              <p className="text-sm font-medium text-neutral-900">
                {result.found ? result.name : "Produit inconnu"}
              </p>
              {result.brand && <p className="text-xs text-neutral-400">{result.brand}</p>}
              {!result.found && (
                <p className="text-xs text-neutral-400">
                  Ce code-barres n&apos;est pas dans OpenFoodFacts, complète les infos.
                </p>
              )}
            </div>
          </div>

          <input type="hidden" name="barcode" value={result.barcode ?? ""} />
          <input type="hidden" name="imageUrl" value={result.imageUrl ?? ""} />

          <input
            name="name"
            defaultValue={result.name ?? ""}
            required
            placeholder="Nom du produit"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <input
            name="brand"
            defaultValue={result.brand ?? ""}
            placeholder="Marque"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <div className="grid grid-cols-3 gap-3">
            <select
              name="category"
              defaultValue={result.category ?? "autre"}
              className="col-span-2 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            >
              {PANTRY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              name="quantity"
              type="number"
              min={1}
              step="0.1"
              defaultValue={1}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Ajouter au stock
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
