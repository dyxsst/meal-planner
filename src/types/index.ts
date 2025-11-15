// Type definitions based on GDD v1.0

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  purines_mg_per_unit: number;
  kcals_per_unit: number;
  inflammatory_level: "low" | "medium" | "high";
  tags: string[];
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface RecipeIngredient {
  ingredientId: string;
  amount_in_unit: number;
}

export interface Recipe {
  id: string;
  name: string;
  type: "breakfast" | "lunch_dinner" | "snack";
  ingredients: RecipeIngredient[];
  total_purines_mg: number;
  total_kcals: number;
  inflammatory_level: "low" | "medium" | "high";
  safe_for_gout: boolean;
}

export interface Pantry {
  id: string;
  name: string;
  ingredientIds: string[];
}

export type MealSlot = 
  | "breakfast" 
  | "lunch" 
  | "dinner" 
  | "snack" 
  | "school_extra1" 
  | "school_extra2";

export interface MealPlanEntry {
  id: string;
  personId: string;
  date: string; // YYYY-MM-DD
  slot: MealSlot;
  recipeId: string;
}

export interface WaterEntry {
  id: string;
  personId: string;
  date: string; // YYYY-MM-DD
  ml: number;
}

export interface Person {
  id: string;
  name: string;
  purineMinPerDay?: number;
  purineMaxPerDay?: number;
  kcalMinPerDay?: number;
  kcalMaxPerDay?: number;
  waterTargetMl?: number;
}

export type PersonName = "Exan" | "Nadia" | "Aidam";
