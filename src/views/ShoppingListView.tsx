import { useState, useMemo } from 'react';
import { db } from '../lib/db';
import type { Ingredient, Recipe, RecipeIngredient, MealPlanEntry, Pantry } from '../types';

interface ShoppingListItem {
  ingredientId: string;
  ingredientName: string;
  totalGrams: number;
  pantryGrams: number;
  neededGrams: number;
  purinesPer100g: number;
  kcalsPer100g: number;
  tags: string;
  purchased: boolean;
}

export default function ShoppingListView() {
  const { data: ingredientsData } = db.useQuery({ ingredients: {} });
  const { data: recipesData } = db.useQuery({ recipes: {} });
  const { data: mealPlansData } = db.useQuery({ mealPlanEntries: {} });
  const { data: pantriesData } = db.useQuery({ pantries: {} });

  const ingredients = (ingredientsData?.ingredients || []) as Ingredient[];
  const recipes = (recipesData?.recipes || []) as Recipe[];
  const mealPlanEntries = (mealPlansData?.mealPlanEntries || []) as MealPlanEntry[];
  const pantries = (pantriesData?.pantries || []) as Pantry[];
  const activePantry = pantries.find((p) => p.isActive) || pantries[0];

  // Date range state (default: current week)
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

  const [startDate, setStartDate] = useState(startOfWeek.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(endOfWeek.toISOString().split('T')[0]);
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);
  const [customIngredients, setCustomIngredients] = useState<ShoppingListItem[]>([]);
  const [groupByTags, setGroupByTags] = useState(true);

  // Calculate shopping list from meal plans
  const shoppingList = useMemo(() => {
    const ingredientMap = new Map<string, ShoppingListItem>();

    // Filter meal plan entries by date range
    const filteredEntries = mealPlanEntries.filter((entry) => {
      return entry.date >= startDate && entry.date <= endDate;
    });

    // Aggregate ingredients from recipes
    filteredEntries.forEach((entry) => {
      const recipe = recipes.find((r) => r.id === entry.recipeId);
      if (!recipe) return;

      recipe.ingredients.forEach((recipeIng: RecipeIngredient) => {
        const ingredient = ingredients.find((i) => i.id === recipeIng.ingredientId);
        if (!ingredient) return;

        const existing = ingredientMap.get(recipeIng.ingredientId);
        if (existing) {
          existing.totalGrams += recipeIng.quantity;
        } else {
          ingredientMap.set(recipeIng.ingredientId, {
            ingredientId: recipeIng.ingredientId,
            ingredientName: ingredient.name,
            totalGrams: recipeIng.quantity,
            pantryGrams: 0,
            neededGrams: recipeIng.quantity,
            purinesPer100g: ingredient.purinesPer100g,
            kcalsPer100g: ingredient.kcalsPer100g,
            tags: ingredient.tags || '',
            purchased: false,
          });
        }
      });
    });

    // Deduct pantry quantities
    if (activePantry?.ingredients) {
      activePantry.ingredients.forEach((pantryIng) => {
        const item = ingredientMap.get(pantryIng.ingredientId);
        if (item) {
          item.pantryGrams = pantryIng.quantityGrams;
          item.neededGrams = Math.max(0, item.totalGrams - pantryIng.quantityGrams);
        }
      });
    }

    // Add custom ingredients
    customIngredients.forEach((custom) => {
      ingredientMap.set(custom.ingredientId, custom);
    });

    return Array.from(ingredientMap.values()).filter((item) => item.neededGrams > 0);
  }, [mealPlanEntries, recipes, ingredients, activePantry, customIngredients, startDate, endDate]);

  // Group by tags if enabled
  const groupedList = useMemo(() => {
    if (!groupByTags) {
      return { 'All Items': shoppingList };
    }

    const groups: Record<string, ShoppingListItem[]> = {};
    shoppingList.forEach((item) => {
      const tag = item.tags.split(',')[0]?.trim() || 'Uncategorized';
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(item);
    });

    return groups;
  }, [shoppingList, groupByTags]);

  const handleTogglePurchased = (ingredientId: string) => {
    setPurchasedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId);
      } else {
        newSet.add(ingredientId);
      }
      return newSet;
    });
  };

  const handleUpdateTags = (ingredientId: string, newTags: string) => {
    db.transact([
      db.tx.ingredients[ingredientId].update({
        tags: newTags,
        updatedAt: Date.now(),
      }),
    ]);
  };

  const handleAddCustomIngredient = (ingredient: Ingredient, quantity: number) => {
    setCustomIngredients((prev) => [
      ...prev,
      {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        totalGrams: quantity,
        pantryGrams: 0,
        neededGrams: quantity,
        purinesPer100g: ingredient.purinesPer100g,
        kcalsPer100g: ingredient.kcalsPer100g,
        tags: ingredient.tags || '',
        purchased: false,
      },
    ]);
  };

  const handlePrint = () => {
    window.print();
  };

  const totalItems = shoppingList.length;
  const purchasedCount = shoppingList.filter((item) => purchasedItems.has(item.ingredientId)).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shopping List</h1>
          <p className="mt-1 text-sm text-gray-600">
            Generated from meal plans ({totalItems} items, {purchasedCount} purchased)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddIngredientModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            + Add Item
          </button>
          <button
            onClick={handlePrint}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Date Range Picker */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Date Range</h2>
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input
              type="checkbox"
              id="groupByTags"
              checked={groupByTags}
              onChange={(e) => setGroupByTags(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="groupByTags" className="text-sm text-gray-700">
              Group by category
            </label>
          </div>
        </div>
      </div>

      {/* Shopping List */}
      {shoppingList.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">
            No ingredients needed for the selected date range. Plan some meals first!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {Object.entries(groupedList).map(([category, items]) => (
            <div key={category} className="border-b border-gray-200 last:border-b-0">
              {groupByTags && (
                <div className="bg-gray-50 px-6 py-3 font-semibold text-gray-900">
                  {category} ({items.length})
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  {!groupByTags && (
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                          ✓
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Ingredient
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Needed
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          In Pantry
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Tags
                        </th>
                      </tr>
                    </thead>
                  )}
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map((item) => (
                      <tr
                        key={item.ingredientId}
                        className={purchasedItems.has(item.ingredientId) ? 'bg-green-50' : ''}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={purchasedItems.has(item.ingredientId)}
                            onChange={() => handleTogglePurchased(item.ingredientId)}
                            className="w-5 h-5 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{item.ingredientName}</div>
                          <div className="text-xs text-gray-500">
                            {item.purinesPer100g}mg purines, {item.kcalsPer100g} kcal per 100g
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                          {item.neededGrams}g
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.pantryGrams > 0 ? `${item.pantryGrams}g` : '-'}
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            defaultValue={item.tags}
                            onBlur={(e) => handleUpdateTags(item.ingredientId, e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            placeholder="Add tags..."
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Custom Ingredient Modal */}
      {showAddIngredientModal && (
        <AddIngredientModal
          ingredients={ingredients}
          onAdd={handleAddCustomIngredient}
          onClose={() => setShowAddIngredientModal(false)}
        />
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .bg-white, .bg-white * {
            visibility: visible;
          }
          .bg-white {
            position: absolute;
            left: 0;
            top: 0;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

interface AddIngredientModalProps {
  ingredients: Ingredient[];
  onAdd: (ingredient: Ingredient, quantity: number) => void;
  onClose: () => void;
}

function AddIngredientModal({ ingredients, onAdd, onClose }: AddIngredientModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newIngredientForm, setNewIngredientForm] = useState({
    name: '',
    purinesPer100g: 0,
    kcalsPer100g: 0,
    inflammatoryLevel: 5,
    tags: '',
    notes: '',
  });

  const filteredIngredients = ingredients.filter(
    (ing) =>
      ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ing.tags && ing.tags.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCreateAndAdd = () => {
    const now = Date.now();
    const newId = crypto.randomUUID();

    db.transact([
      db.tx.ingredients[newId].update({
        name: newIngredientForm.name,
        purinesPer100g: newIngredientForm.purinesPer100g,
        kcalsPer100g: newIngredientForm.kcalsPer100g,
        inflammatoryLevel: newIngredientForm.inflammatoryLevel,
        tags: newIngredientForm.tags,
        notes: newIngredientForm.notes,
        createdAt: now,
        updatedAt: now,
      }),
    ]);

    onAdd(
      {
        id: newId,
        ...newIngredientForm,
        createdAt: now,
        updatedAt: now,
      },
      quantity
    );
    onClose();
  };

  const handleAddExisting = () => {
    if (!selectedIngredient) return;
    onAdd(selectedIngredient, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Add Item to Shopping List</h2>

        {!showCreateNew ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Ingredients
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Search by name or tags..."
              />
            </div>

            <div className="mb-4 max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredIngredients.map((ing) => (
                <button
                  key={ing.id}
                  onClick={() => setSelectedIngredient(ing)}
                  className={`w-full text-left px-4 py-2 border-b border-gray-100 hover:bg-blue-50 ${
                    selectedIngredient?.id === ing.id ? 'bg-blue-100' : ''
                  }`}
                >
                  <div className="font-medium">{ing.name}</div>
                  <div className="text-sm text-gray-600">
                    {ing.purinesPer100g}mg purines, {ing.kcalsPer100g} kcal per 100g
                  </div>
                </button>
              ))}
            </div>

            {selectedIngredient && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity (grams)
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min="0"
                  step="10"
                />
              </div>
            )}

            <div className="flex gap-2 justify-between">
              <button
                onClick={() => setShowCreateNew(true)}
                className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
              >
                + Create New Ingredient
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddExisting}
                  disabled={!selectedIngredient}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Add to List
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={newIngredientForm.name}
                  onChange={(e) =>
                    setNewIngredientForm({ ...newIngredientForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purines (mg/100g) *
                  </label>
                  <input
                    type="number"
                    value={newIngredientForm.purinesPer100g}
                    onChange={(e) =>
                      setNewIngredientForm({
                        ...newIngredientForm,
                        purinesPer100g: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kcals (per 100g) *
                  </label>
                  <input
                    type="number"
                    value={newIngredientForm.kcalsPer100g}
                    onChange={(e) =>
                      setNewIngredientForm({
                        ...newIngredientForm,
                        kcalsPer100g: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inflammatory Level (1-10)
                </label>
                <input
                  type="number"
                  value={newIngredientForm.inflammatoryLevel}
                  onChange={(e) =>
                    setNewIngredientForm({
                      ...newIngredientForm,
                      inflammatoryLevel: parseInt(e.target.value) || 5,
                    })
                  }
                  min="1"
                  max="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newIngredientForm.tags}
                  onChange={(e) =>
                    setNewIngredientForm({ ...newIngredientForm, tags: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="protein, meat, poultry"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity (grams)
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min="0"
                  step="10"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-between">
              <button
                onClick={() => setShowCreateNew(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ← Back
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAndAdd}
                  disabled={!newIngredientForm.name}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300"
                >
                  Create & Add
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

