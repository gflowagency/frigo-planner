const RECIPE_ITEM_SCHEMA = {
  type: "object" as const,
  properties: {
    title: { type: "string" },
    description: { type: "string", description: "1-2 phrases : pourquoi cette recette colle au moment / à la saison / aux objectifs." },
    servings: { type: "number" },
    estimated_calories_per_serving: { type: "number" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "string", description: "ex: 200 g, 2 pièces, 1 c. à soupe" },
          have_in_stock: { type: "boolean" },
        },
        required: ["name", "quantity", "have_in_stock"],
      },
    },
    instructions: {
      type: "array",
      items: { type: "string" },
      description: "Étapes de préparation numérotées, précises (temps, température, gestes).",
    },
  },
  required: ["title", "description", "servings", "estimated_calories_per_serving", "ingredients", "instructions"],
};

export const PROPOSE_RECIPES_TOOL = {
  name: "propose_recipes",
  description:
    "Propose des recettes saines et équilibrées à partir du stock disponible, adaptées à la saison et aux objectifs des membres du foyer.",
  input_schema: {
    type: "object" as const,
    properties: {
      recipes: { type: "array", items: RECIPE_ITEM_SCHEMA },
    },
    required: ["recipes"],
  },
};

export const PROPOSE_WEEK_PLAN_TOOL = {
  name: "propose_week_plan",
  description:
    "Propose un dîner différent pour chacun des 7 prochains jours à partir du stock disponible du foyer, sans répétition, en répartissant intelligemment les ingrédients sur la semaine.",
  input_schema: {
    type: "object" as const,
    properties: {
      days: { type: "array", minItems: 7, maxItems: 7, items: RECIPE_ITEM_SCHEMA },
    },
    required: ["days"],
  },
};

export type ProposedRecipe = {
  title: string;
  description: string;
  servings: number;
  estimated_calories_per_serving: number;
  ingredients: { name: string; quantity: string; have_in_stock: boolean }[];
  instructions: string[];
};
