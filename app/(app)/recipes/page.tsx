import RecipesClient from "./RecipesClient";

export default function RecipesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Recettes</h1>
        <p className="mt-0.5 text-sm text-muted">
          Générées à partir de votre stock, de la saison et de vos objectifs respectifs.
        </p>
      </div>
      <RecipesClient />
    </div>
  );
}
