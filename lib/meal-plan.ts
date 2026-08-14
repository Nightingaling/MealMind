export type MealIngredient = {
  name: string;
  amount: string;
};

export type MealOption = {
  title: string;
  description: string;
  estimatedCalories: number;
  totalTimeMinutes: number;
  nutrition: {
    proteinGrams: number;
    carbohydrateGrams: number;
    fatGrams: number;
  };
  ingredients: MealIngredient[];
  instructions: string[];
  goalAlignment: string;
  allergenNotes: string;
};

export type MealPlanResponse = {
  detectedIngredients: string[];
  meals: [MealOption, MealOption];
};