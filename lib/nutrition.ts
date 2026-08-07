export type ActivityLevel = "sedentaire" | "leger" | "modere" | "actif" | "tres_actif";
export type Goal = "perte_de_poids" | "maintien" | "prise_de_masse" | "recomposition";

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentaire: 1.2,
  leger: 1.375,
  modere: 1.55,
  actif: 1.725,
  tres_actif: 1.9,
};

// Recomposition (perdre du gras + prendre du muscle) vise un apport proche du
// maintien — la différence se joue sur l'entraînement et les protéines, pas
// sur un déficit/surplus calorique marqué.
const GOAL_ADJUSTMENT: Record<Goal, number> = {
  perte_de_poids: -400,
  maintien: 0,
  prise_de_masse: 300,
  recomposition: -100,
};

export function proteinGuidance(goal: Goal): string {
  return goal === "recomposition"
    ? "apport protéiné élevé (viser ~1,8-2,2 g de protéines par kg de poids de corps) pour soutenir la prise de muscle pendant la perte de gras"
    : "apport protéiné suffisant pour la satiété et le maintien musculaire";
}

/** Mifflin-St Jeor formula → besoin calorique quotidien estimé. */
export function estimateDailyCalories(params: {
  sex: "femme" | "homme" | "autre";
  heightCm: number;
  weightKg: number;
  ageYears: number;
  activityLevel: ActivityLevel;
  goal: Goal;
}): number {
  const { sex, heightCm, weightKg, ageYears, activityLevel, goal } = params;

  const sexOffset = sex === "homme" ? 5 : sex === "femme" ? -161 : -78;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + sexOffset;
  const tdee = bmr * ACTIVITY_MULTIPLIER[activityLevel];

  return Math.round(tdee + GOAL_ADJUSTMENT[goal]);
}

export function ageFromBirthDate(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}
