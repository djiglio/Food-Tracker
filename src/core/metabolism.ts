export type Gender = 'M' | 'F';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type WeightGoal = 'cut' | 'maintain' | 'bulk';

export interface UserMetabolicProfile {
  age: number;
  weightKg: number;
  heightCm: number;
  gender: Gender;
  activityLevel: ActivityLevel;
}

export interface DailyMacroTarget {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MealTargetConfig {
  id: string;
  name: string;
  percentage: number;
}

export interface TargetVersion {
  id: string;
  effectiveFromDate: string; // YYYY-MM-DD
  goal: WeightGoal;
  dailyTarget: DailyMacroTarget;
  meals: MealTargetConfig[];
  
  // Macro-Cycling
  isMacroCyclingEnabled?: boolean;
  cyclingTargets?: Record<number, DailyMacroTarget>;
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function calculateBMR(profile: UserMetabolicProfile): number {
  const { weightKg, heightCm, age, gender } = profile;
  let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  if (gender === 'M') {
    bmr += 5;
  } else {
    bmr -= 161;
  }
  return Math.round(bmr);
}

export function calculateTDEE(profile: UserMetabolicProfile): number {
  const bmr = calculateBMR(profile);
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[profile.activityLevel]);
}

/**
 * Calcola i macro base partendo dal TDEE e dall'obiettivo di peso.
 */
export function generateBaseTarget(
  tdee: number,
  weightKg: number,
  goal: WeightGoal
): DailyMacroTarget {
  let targetKcal = tdee;

  if (goal === 'cut') {
    targetKcal -= 500; // Deficit standard
  } else if (goal === 'bulk') {
    targetKcal += 300; // Surplus standard
  }

  // Non scendere sotto un livello base di sicurezza (es. BMR) ma qui teniamo un hard limit a 1200
  targetKcal = Math.max(targetKcal, 1200);

  // Proteine: 2.2g per kg (Alto per preservare/costruire massa)
  const proteinG = Math.round(weightKg * 2.2);
  // Grassi: 0.9g per kg
  const fatG = Math.round(weightKg * 0.9);

  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;

  // Carboidrati: Calorie rimanenti
  const remainingKcal = targetKcal - (proteinKcal + fatKcal);
  const carbsG = Math.max(0, Math.round(remainingKcal / 4));

  // Ricalcolo per precisione sulle approssimazioni
  const finalKcal = (proteinG * 4) + (fatG * 9) + (carbsG * 4);

  return {
    kcal: finalKcal,
    proteinG,
    fatG,
    carbsG
  };
}

/**
 * Ritorna una configurazione di pasti predefinita.
 */
export function getDefaultMeals(): MealTargetConfig[] {
  return [
    { id: 'breakfast', name: 'Colazione', percentage: 0.20 },
    { id: 'lunch', name: 'Pranzo', percentage: 0.35 },
    { id: 'snack', name: 'Spuntino', percentage: 0.10 },
    { id: 'dinner', name: 'Cena', percentage: 0.35 }
  ];
}

/**
 * Ritorna i target macro calcolati per una specifica data tenendo conto del Macro-Cycling.
 */
export function getMacroTargetForDate(target: TargetVersion, dateStr: string): DailyMacroTarget {
  if (target.isMacroCyclingEnabled && target.cyclingTargets) {
    const dayOfWeek = new Date(dateStr).getDay();
    // Se non è stato impostato per quel giorno, falliamo al default
    return target.cyclingTargets[dayOfWeek] || target.dailyTarget;
  }
  return target.dailyTarget;
}
