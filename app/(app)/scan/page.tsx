import BarcodeScanner from "./BarcodeScanner";

export default function ScanPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Scanner un produit</h1>
        <p className="text-sm text-neutral-500">
          Autorise la caméra, vise le code-barres, on récupère le produit automatiquement.
        </p>
      </div>
      <BarcodeScanner />
    </div>
  );
}
