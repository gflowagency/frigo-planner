type RecipeLike = {
  title: string;
  description: string | null;
  servings: number;
  estimated_calories_per_serving: number | null;
  ingredients: { name: string; quantity: string; have_in_stock: boolean }[];
  instructions: string[];
};

export default function RecipeCard({
  recipe,
  children,
}: {
  recipe: RecipeLike;
  children?: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="text-[17px] font-semibold tracking-tight text-foreground">{recipe.title}</h3>
        {recipe.estimated_calories_per_serving != null && (
          <span className="whitespace-nowrap rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium tabular-nums text-accent-hover">
            ~{recipe.estimated_calories_per_serving} kcal / part
          </span>
        )}
      </div>
      {recipe.description && <p className="mb-3 text-sm text-muted">{recipe.description}</p>}
      <p className="mb-3 text-xs font-medium text-muted-2">
        Pour {recipe.servings} personne{recipe.servings > 1 ? "s" : ""}
      </p>

      <div className="grid gap-5 border-t border-border pt-4 sm:grid-cols-2">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">Ingrédients</h4>
          <ul className="space-y-1.5 text-sm text-foreground">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-start gap-2">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    ing.have_in_stock ? "bg-success" : "bg-accent"
                  }`}
                />
                <span>
                  {ing.quantity} — {ing.name}
                  {!ing.have_in_stock && (
                    <span className="ml-1 text-xs font-medium text-accent">(à acheter)</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-2">Préparation</h4>
          <ol className="space-y-1.5 text-sm text-foreground">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent-hover">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {children && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">{children}</div>}
    </article>
  );
}
