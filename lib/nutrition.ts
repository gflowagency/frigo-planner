export type ActivityLevel = "sedentaire" | "leger" | "modere" | "actif" | "tres_actif";
export type Goal = "perte_de_poids" | "maintien" | "prise_de_masse";

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentaire: 1.2,
  leger: 1.375,
  modere: 1.55,
  actif: 1.725,
  tres_actif: 1.9,
};

const GOAL_ADJUSTMENT: Record<Goal, number> = {
  perte_de_poids: -400,
  maintien: 0,
  prise_de_masse: 300,
};

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
