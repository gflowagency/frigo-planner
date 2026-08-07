import RecipesClient from "./RecipesClient";

export default function RecipesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Recettes</h1>
        <p className="text-sm text-neutral-500">
          Générées à partir de votre stock, de la saison et de vos objectifs respectifs.
        </p>
      </div>
      <RecipesClient />
    </div>
  );
}
