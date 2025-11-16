import { useState } from 'react';
import { db } from '../lib/db';
import type { Recipe, MealSlot } from '../types';

export default function WeeklyCalendar() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(today.setDate(diff));
  });

  const [selectedSlot, setSelectedSlot] = useState<{
    personId: string;
    personName: string;
    date: string;
    slot: MealSlot;
  } | null>(null);

  // Fetch recipes, meal plan entries, and person settings
  const { isLoading: recipesLoading, data: recipesData } = db.useQuery({
    recipes: {},
  });

  const { isLoading: mealPlansLoading, data: mealPlansData } = db.useQuery({
    mealPlanEntries: {},
  });

  const { isLoading: personsLoading, data: personsData } = db.useQuery({
    persons: {},
  });

  if (recipesLoading || mealPlansLoading || personsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading calendar...</div>
      </div>
    );
  }

  const recipes = (recipesData?.recipes || []) as Recipe[];
  const mealPlanEntries = mealPlansData?.mealPlanEntries || [];
  const personsFromDB = personsData?.persons || [];

  // Get or create person settings with defaults
  const getPersonSettings = (personId: string) => {
    const existing = personsFromDB.find((p) => p.id === personId);
    if (existing) return existing;

    // Default settings based on person
    const defaults = {
      exan: {
        purineMinPerDay: 0,
        purineMaxPerDay: 400, // Conservative gout-safe threshold
        kcalMinPerDay: 1800,
        kcalMaxPerDay: 2200,
        waterTargetMl: 2500,
      },
      nadia: {
        purineMinPerDay: 0,
        purineMaxPerDay: 1000, // Not restricted
        kcalMinPerDay: 1500,
        kcalMaxPerDay: 2000,
        waterTargetMl: 2000,
      },
      aidam: {
        purineMinPerDay: 0,
        purineMaxPerDay: 1000, // Not restricted
        kcalMinPerDay: 2000,
        kcalMaxPerDay: 2800,
        waterTargetMl: 2000,
      },
    };

    return defaults[personId as keyof typeof defaults] || defaults.aidam;
  };

  // Generate week dates
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + i);
    return date;
  });

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(currentWeekStart.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Get meal for specific slot
  const getMealForSlot = (personId: string, date: string, slot: MealSlot) => {
    const entry = mealPlanEntries.find(
      (e) => e.personId === personId && e.date === date && e.slot === slot
    );
    if (!entry) return null;
    return recipes.find((r) => r.id === entry.recipeId);
  };

  const handleSlotClick = (personId: string, personName: string, date: string, slot: MealSlot) => {
    setSelectedSlot({ personId, personName, date, slot });
  };

  const handleRemoveMeal = (personId: string, date: string, slot: MealSlot) => {
    const entry = mealPlanEntries.find(
      (e) => e.personId === personId && e.date === date && e.slot === slot
    );
    if (entry && window.confirm('Remove this meal?')) {
      db.transact([db.tx.mealPlanEntries[entry.id].delete()]);
    }
  };

  // Calculate daily nutrition totals
  const getDailyTotals = (personId: string, date: string) => {
    const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
    const dateObj = new Date(date);
    const dayIndex = dateObj.getDay();
    const isWeekday = dayIndex >= 1 && dayIndex <= 5;
    
    if (personId === 'aidam' && isWeekday) {
      slots.push('school_extra1', 'school_extra2');
    }

    let totalPurines = 0;
    let totalKcals = 0;
    let totalInflammatory = 0;
    let mealCount = 0;

    slots.forEach((slot) => {
      const meal = getMealForSlot(personId, date, slot);
      if (meal) {
        totalPurines += meal.total_purines_mg;
        totalKcals += meal.total_kcals;
        totalInflammatory += meal.inflammatory_level;
        mealCount++;
      }
    });

    return {
      purines: totalPurines,
      kcals: totalKcals,
      inflammatory: mealCount > 0 ? totalInflammatory / mealCount : 0,
      mealCount,
    };
  };

  // Define persons (hardcoded for now - can be fetched from DB later)
  const persons = [
    { id: 'exan', name: 'Exan (Dad)', color: 'bg-blue-50' },
    { id: 'nadia', name: 'Nadia (Mom)', color: 'bg-pink-50' },
    { id: 'aidam', name: 'Aidam (Son)', color: 'bg-green-50' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Weekly Meal Calendar</h1>
        <p className="text-gray-600">Plan meals for the entire family week by week</p>
      </div>

      {/* Week Navigation */}
      <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
        <button
          onClick={goToPreviousWeek}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          ← Previous Week
        </button>
        <div className="text-center">
          <div className="text-lg font-semibold">
            {formatDisplayDate(weekDates[0])} - {formatDisplayDate(weekDates[6])}
          </div>
          <button
            onClick={goToCurrentWeek}
            className="text-sm text-blue-600 hover:text-blue-800 underline mt-1"
          >
            Today
          </button>
        </div>
        <button
          onClick={goToNextWeek}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Next Week →
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[1200px]">
          {/* Days Header */}
          <div className="grid grid-cols-8 gap-2 mb-2">
            <div className="font-semibold text-gray-700">Person</div>
            {weekDates.map((date) => (
              <div key={date.toISOString()} className="text-center">
                <div className="font-semibold">{getDayName(date)}</div>
                <div className="text-sm text-gray-600">{formatDisplayDate(date)}</div>
              </div>
            ))}
          </div>

          {/* Person Rows */}
          {persons.map((person) => (
            <div key={person.id} className="mb-6">
              <div className="grid grid-cols-8 gap-2">
                {/* Person Name */}
                <div className={`${person.color} p-4 rounded-lg font-semibold flex items-center`}>
                  {person.name}
                </div>

                {/* Days for this person */}
                {weekDates.map((date, dayIndex) => {
                  const dailyTotals = getDailyTotals(person.id, formatDate(date));
                  const personSettings = getPersonSettings(person.id);
                  
                  return (
                    <div key={date.toISOString()} className="space-y-1">
                      <DayCell
                        personId={person.id}
                        personName={person.name}
                        date={formatDate(date)}
                        dayIndex={dayIndex}
                        getMealForSlot={getMealForSlot}
                        onSlotClick={handleSlotClick}
                        onRemoveMeal={handleRemoveMeal}
                      />
                      {/* Daily Totals - Show for Exan (Dad) and Nadia (Mom) */}
                      {dailyTotals.mealCount > 0 && (person.id === 'exan' || person.id === 'nadia') && (
                        <div className="bg-gray-50 border border-gray-200 rounded p-2 text-xs">
                          <div className="font-semibold mb-1">Daily Totals:</div>
                          <div className="space-y-0.5">
                            {person.id === 'exan' && personSettings.purineMaxPerDay && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Purines:</span>
                                <span className={`font-medium ${
                                  dailyTotals.purines > personSettings.purineMaxPerDay 
                                    ? 'text-red-600 font-bold' 
                                    : dailyTotals.purines > personSettings.purineMaxPerDay * 0.75 
                                    ? 'text-orange-600' 
                                    : 'text-green-600'
                                }`}>
                                  {dailyTotals.purines.toFixed(0)}mg
                                  <span className="text-gray-400 text-[10px] ml-1">/ {personSettings.purineMaxPerDay}mg</span>
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">Calories:</span>
                              <span className={`font-medium ${
                                person.id === 'nadia' && personSettings.kcalMaxPerDay 
                                  ? dailyTotals.kcals > personSettings.kcalMaxPerDay 
                                    ? 'text-red-600 font-bold' 
                                    : dailyTotals.kcals > personSettings.kcalMaxPerDay * 0.9 
                                    ? 'text-orange-600' 
                                    : ''
                                  : ''
                              }`}>
                                {dailyTotals.kcals.toFixed(0)}
                                {personSettings.kcalMaxPerDay && (
                                  <span className="text-gray-400 text-[10px] ml-1">/ {personSettings.kcalMaxPerDay}</span>
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Avg Inflam:</span>
                              <span className="font-medium">{dailyTotals.inflammatory.toFixed(1)}/10</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Meal Picker Modal */}
      {selectedSlot && (
        <MealPickerModal
          personId={selectedSlot.personId}
          personName={selectedSlot.personName}
          date={selectedSlot.date}
          slot={selectedSlot.slot}
          recipes={recipes}
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </div>
  );
}

// Day Cell Component
interface DayCellProps {
  personId: string;
  personName: string;
  date: string;
  dayIndex: number;
  getMealForSlot: (personId: string, date: string, slot: MealSlot) => Recipe | null | undefined;
  onSlotClick: (personId: string, personName: string, date: string, slot: MealSlot) => void;
  onRemoveMeal: (personId: string, date: string, slot: MealSlot) => void;
}

function DayCell({ personId, personName, date, dayIndex, getMealForSlot, onSlotClick, onRemoveMeal }: DayCellProps) {
  const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];
  
  // Add extra slots for Aidam on weekdays (Mon-Fri)
  const isWeekday = dayIndex >= 0 && dayIndex <= 4;
  if (personId === 'aidam' && isWeekday) {
    slots.push('school_extra1', 'school_extra2');
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 min-h-[200px]">
      {slots.map((slot) => (
        <MealSlot
          key={slot}
          personId={personId}
          personName={personName}
          date={date}
          slot={slot}
          meal={getMealForSlot(personId, date, slot)}
          onClick={() => onSlotClick(personId, personName, date, slot)}
          onRemove={() => onRemoveMeal(personId, date, slot)}
        />
      ))}
    </div>
  );
}

// Meal Slot Component
interface MealSlotProps {
  personId: string;
  personName: string;
  date: string;
  slot: MealSlot;
  meal: Recipe | null | undefined;
  onClick: () => void;
  onRemove: () => void;
}

function MealSlot({ personId, slot, meal, onClick, onRemove }: MealSlotProps) {
  const slotLabels: Record<MealSlot, string> = {
    breakfast: '🌅 Breakfast',
    lunch: '☀️ Lunch',
    dinner: '🌙 Dinner',
    snack: '🍎 Snack',
    school_extra1: '📚 Extra 1',
    school_extra2: '📚 Extra 2',
  };

  return (
    <div className="mb-2">
      <div className="text-xs text-gray-500 mb-1">{slotLabels[slot]}</div>
      {meal ? (
        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm relative group">
          <div className="font-medium mb-1">{meal.name}</div>
          <div className="text-xs text-gray-600">
            {meal.total_purines_mg.toFixed(0)}mg · {meal.total_kcals.toFixed(0)} kcal
          </div>
          {!meal.safe_for_gout && personId === 'exan' && (
            <div className="text-xs text-red-600 font-semibold mt-1">⚠️ High Purines</div>
          )}
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
              className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
            >
              Change
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onClick}
          className="w-full border-2 border-dashed border-gray-300 rounded p-2 text-sm text-gray-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          + Add
        </button>
      )}
    </div>
  );
}

// Meal Picker Modal Component
interface MealPickerModalProps {
  personId: string;
  personName: string;
  date: string;
  slot: MealSlot;
  recipes: Recipe[];
  onClose: () => void;
}

function MealPickerModal({ personId, personName, date, slot, recipes, onClose }: MealPickerModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSafe, setFilterSafe] = useState<'all' | 'safe' | 'unsafe'>('all');

  // Filter recipes
  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch =
      recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.tags?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterSafe === 'all' ||
      (filterSafe === 'safe' && recipe.safe_for_gout) ||
      (filterSafe === 'unsafe' && !recipe.safe_for_gout);

    return matchesSearch && matchesFilter;
  });

  const handleSelectRecipe = (recipeId: string) => {
    const recipe = recipes.find((r) => r.id === recipeId);
    
    // Warn if assigning unsafe meal to Exan
    if (personId === 'exan' && recipe && !recipe.safe_for_gout) {
      if (!window.confirm(`⚠️ WARNING: "${recipe.name}" has high purines (${recipe.total_purines_mg.toFixed(0)}mg) and may not be safe for gout. Assign anyway?`)) {
        return;
      }
    }

    db.transact([
      db.tx.mealPlanEntries[crypto.randomUUID()].update({
        personId,
        date,
        slot,
        recipeId,
      }),
    ]);

    onClose();
  };

  const slotLabels: Record<MealSlot, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
    school_extra1: 'School Extra 1',
    school_extra2: 'School Extra 2',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold">Select Meal</h2>
              <p className="text-gray-600 mt-1">
                {personName} · {slotLabels[slot]} · {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterSafe}
              onChange={(e) => setFilterSafe(e.target.value as 'all' | 'safe' | 'unsafe')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Recipes</option>
              <option value="safe">Safe for Gout</option>
              <option value="unsafe">Not Safe</option>
            </select>
          </div>
        </div>

        {/* Recipe List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredRecipes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No recipes found. Create some recipes first!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRecipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => handleSelectRecipe(recipe.id)}
                  className="bg-white border border-gray-200 rounded-lg p-4 text-left hover:border-blue-400 hover:bg-blue-50 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{recipe.name}</h3>
                    {recipe.safe_for_gout ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        ✓ Safe
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        ⚠ Caution
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>Purines: {recipe.total_purines_mg.toFixed(0)} mg</div>
                    <div>Calories: {recipe.total_kcals.toFixed(0)} kcal</div>
                    <div>Inflammatory Level: {recipe.inflammatory_level}/10</div>
                    <div>Servings: {recipe.servings}</div>
                  </div>
                  {recipe.tags && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {recipe.tags.split(',').slice(0, 3).map((tag: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
