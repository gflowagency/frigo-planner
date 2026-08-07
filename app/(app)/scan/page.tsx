import BarcodeScanner from "./BarcodeScanner";

export default function ScanPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Scanner un produit</h1>
        <p className="mt-0.5 text-sm text-muted">
          Autorise la caméra, vise le code-barres, on récupère le produit automatiquement.
        </p>
      </div>
      <BarcodeScanner />
    </div>
  );
}
