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

export default function NutrientGrid({ nutrients }: { nutrients: Record<string, number> }) {
  return (
    <div className="grid grid-cols-4 gap-2 rounded-xl bg-background p-3 text-center">
      {Object.entries(nutrients).map(([key, value]) => (
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
  );
}
