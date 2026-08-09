export const ESTIMATE_NUTRIENTS_TOOL = {
  name: "estimate_nutrients",
  description: "Estime les valeurs nutritionnelles moyennes pour 100 g/100 ml d'un produit alimentaire à partir de son nom.",
  input_schema: {
    type: "object" as const,
    properties: {
      kcal: { type: "number" },
      proteines: { type: "number", description: "grammes pour 100 g" },
      glucides: { type: "number", description: "grammes pour 100 g" },
      sucres: { type: "number", description: "grammes pour 100 g" },
      lipides: { type: "number", description: "grammes pour 100 g" },
      acides_gras_satures: { type: "number", description: "grammes pour 100 g" },
      fibres: { type: "number", description: "grammes pour 100 g" },
      sel: { type: "number", description: "grammes pour 100 g" },
    },
    required: ["kcal", "proteines", "glucides", "sucres", "lipides", "acides_gras_satures", "fibres", "sel"],
  },
};

export type EstimatedNutrients = {
  kcal: number;
  proteines: number;
  glucides: number;
  sucres: number;
  lipides: number;
  acides_gras_satures: number;
  fibres: number;
  sel: number;
};
