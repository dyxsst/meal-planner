import { i } from "@instantdb/react";

// Define the schema according to GDD v1.0
export const schema = i.schema({
  entities: {
    // Ingredient entity
    ingredients: i.entity({
      name: i.string(),
      purinesPer100g: i.number(),
      kcalsPer100g: i.number(),
      inflammatoryLevel: i.number(), // 1-10 scale
      tags: i.string().optional(), // comma-separated
      notes: i.string().optional(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),

    // Recipe entity
    recipes: i.entity({
      name: i.string(),
      type: i.string().optional(), // "breakfast" | "lunch_dinner" | "snack"
      servings: i.number(),
      ingredients: i.json(), // { ingredientId: string; quantity: number }[]
      total_purines_mg: i.number(),
      total_kcals: i.number(),
      inflammatory_level: i.number(), // 1-10 scale
      safe_for_gout: i.boolean(),
      tags: i.string().optional(), // comma-separated
      notes: i.string().optional(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),

    // Pantry entity
    pantries: i.entity({
      name: i.string(),
      ingredients: i.json(), // { ingredientId: string; quantityGrams: number }[]
      isActive: i.boolean().optional(), // Mark the currently active pantry
    }),

    // MealPlanEntry entity
    mealPlanEntries: i.entity({
      personId: i.string(),
      date: i.string(), // YYYY-MM-DD
      slot: i.string(), // "breakfast" | "lunch" | "dinner" | "snack" | "school_extra1" | "school_extra2"
      recipeId: i.string(),
    }),

    // WaterEntry entity
    waterEntries: i.entity({
      personId: i.string(),
      date: i.string(), // YYYY-MM-DD
      ml: i.number(),
    }),

    // Person entity
    persons: i.entity({
      name: i.string(),
      purineMinPerDay: i.number().optional(),
      purineMaxPerDay: i.number().optional(),
      kcalMinPerDay: i.number().optional(),
      kcalMaxPerDay: i.number().optional(),
      waterTargetMl: i.number().optional(),
    }),
  },
});

export type Schema = typeof schema;
