import { i } from "@instantdb/react";

// Define the schema according to GDD v1.0
export const schema = i.schema({
  entities: {
    // Ingredient entity
    ingredients: i.entity({
      name: i.string(),
      unit: i.string(),
      purines_mg_per_unit: i.number(),
      kcals_per_unit: i.number(),
      inflammatory_level: i.string(), // "low" | "medium" | "high"
      tags: i.json(), // string[]
      notes: i.string().optional(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),

    // Recipe entity
    recipes: i.entity({
      name: i.string(),
      type: i.string(), // "breakfast" | "lunch_dinner" | "snack"
      ingredients: i.json(), // { ingredientId: string; amount_in_unit: number }[]
      total_purines_mg: i.number(),
      total_kcals: i.number(),
      inflammatory_level: i.string(), // "low" | "medium" | "high"
      safe_for_gout: i.boolean(),
    }),

    // Pantry entity
    pantries: i.entity({
      name: i.string(),
      ingredientIds: i.json(), // string[]
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
