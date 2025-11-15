import { useState } from 'react';
import { db } from '../lib/db';
import type { Recipe, Ingredient } from '../types';

export default function RecipesView() {
  const [showModal, setShowModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSafe, setFilterSafe] = useState<'all' | 'safe' | 'unsafe'>('all');

  // Fetch recipes and ingredients from Instantdb
  const { isLoading: recipesLoading, error: recipesError, data: recipesData } = db.useQuery({
    recipes: {},
  });

  const { isLoading: ingredientsLoading, error: ingredientsError, data: ingredientsData } = db.useQuery({
    ingredients: {},
  });

  if (recipesLoading || ingredientsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading recipes...</div>
      </div>
    );
  }

  if (recipesError || ingredientsError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">Error loading data: {recipesError?.message || ingredientsError?.message}</div>
      </div>
    );
  }

  const recipes = recipesData?.recipes || [];
  const ingredients = ingredientsData?.ingredients || [];

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

  const handleAddRecipe = () => {
    setEditingRecipe(null);
    setShowModal(true);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setShowModal(true);
  };

  const handleDeleteRecipe = (recipeId: string) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      db.transact([db.tx.recipes[recipeId].delete()]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Recipe Builder</h1>
        <p className="text-gray-600">Create and manage your recipes with automatic nutrition calculations</p>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search recipes by name or tags..."
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
          <option value="unsafe">Not Safe for Gout</option>
        </select>
        <button
          onClick={handleAddRecipe}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          + Add Recipe
        </button>
      </div>

      {/* Recipe Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {searchTerm || filterSafe !== 'all'
              ? 'No recipes match your search criteria'
              : 'No recipes yet. Click "Add Recipe" to create your first recipe!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe as Recipe}
              onEdit={handleEditRecipe}
              onDelete={handleDeleteRecipe}
            />
          ))}
        </div>
      )}

      {/* Recipe Modal */}
      {showModal && (
        <RecipeModal
          recipe={editingRecipe}
          ingredients={ingredients}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// Recipe Card Component
interface RecipeCardProps {
  recipe: Recipe;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
}

function RecipeCard({ recipe, onEdit, onDelete }: RecipeCardProps) {
  const getInflammatoryColor = (level: number) => {
    if (level <= 3) return 'text-green-600 bg-green-50';
    if (level <= 6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold">{recipe.name}</h3>
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

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Purines:</span>
          <span className="font-medium">{recipe.total_purines_mg.toFixed(1)} mg</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Calories:</span>
          <span className="font-medium">{recipe.total_kcals.toFixed(0)} kcal</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Inflammatory Level:</span>
          <span className={`font-medium px-2 py-0.5 rounded ${getInflammatoryColor(recipe.inflammatory_level)}`}>
            {recipe.inflammatory_level}/10
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Servings:</span>
          <span className="font-medium">{recipe.servings}</span>
        </div>
      </div>

      {recipe.ingredients && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">
            {recipe.ingredients.length} ingredients
          </p>
        </div>
      )}

      {recipe.tags && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1">
            {recipe.tags.split(',').map((tag: string, idx: number) => (
              <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                {tag.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {recipe.notes && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{recipe.notes}</p>
      )}

      <div className="flex gap-2 pt-4 border-t border-gray-200">
        <button
          onClick={() => onEdit(recipe)}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(recipe.id)}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// Recipe Modal Component
interface RecipeModalProps {
  recipe: Recipe | null;
  ingredients: Ingredient[];
  onClose: () => void;
}

interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
}

function RecipeModal({ recipe, ingredients, onClose }: RecipeModalProps) {
  const isEditing = recipe !== null;

  const [formData, setFormData] = useState({
    name: recipe?.name || '',
    servings: recipe?.servings || 1,
    tags: recipe?.tags || '',
    notes: recipe?.notes || '',
  });

  const [selectedIngredients, setSelectedIngredients] = useState<RecipeIngredient[]>(
    recipe?.ingredients || []
  );

  const [searchIngredient, setSearchIngredient] = useState('');

  // Calculate nutrition totals
  const calculateNutrition = () => {
    let totalPurines = 0;
    let totalKcals = 0;
    let totalInflammatory = 0;

    selectedIngredients.forEach(({ ingredientId, quantity }) => {
      const ingredient = ingredients.find((i) => i.id === ingredientId);
      if (ingredient) {
        // Scale nutrition by quantity (assuming quantity is in grams)
        const scale = quantity / 100; // nutrition per 100g
        totalPurines += ingredient.purinesPer100g * scale;
        totalKcals += ingredient.kcalsPer100g * scale;
        totalInflammatory += ingredient.inflammatoryLevel * scale;
      }
    });

    // Average inflammatory level
    const avgInflammatory = selectedIngredients.length > 0 
      ? totalInflammatory / selectedIngredients.length 
      : 0;

    // Safe for gout if total purines < 200mg (conservative threshold)
    const safeForGout = totalPurines < 200;

    return {
      totalPurines,
      totalKcals,
      inflammatoryLevel: Math.round(avgInflammatory * 10) / 10,
      safeForGout,
    };
  };

  const nutrition = calculateNutrition();

  const handleAddIngredient = (ingredientId: string) => {
    if (!selectedIngredients.find((i) => i.ingredientId === ingredientId)) {
      setSelectedIngredients([...selectedIngredients, { ingredientId, quantity: 100 }]);
    }
    setSearchIngredient('');
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    setSelectedIngredients(selectedIngredients.filter((i) => i.ingredientId !== ingredientId));
  };

  const handleQuantityChange = (ingredientId: string, quantity: number) => {
    setSelectedIngredients(
      selectedIngredients.map((i) =>
        i.ingredientId === ingredientId ? { ...i, quantity: Math.max(0, quantity) } : i
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Please enter a recipe name');
      return;
    }

    if (selectedIngredients.length === 0) {
      alert('Please add at least one ingredient');
      return;
    }

    const recipeData = {
      name: formData.name.trim(),
      servings: formData.servings,
      tags: formData.tags.trim(),
      notes: formData.notes.trim(),
      ingredients: selectedIngredients,
      total_purines_mg: nutrition.totalPurines,
      total_kcals: nutrition.totalKcals,
      inflammatory_level: nutrition.inflammatoryLevel,
      safe_for_gout: nutrition.safeForGout,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (isEditing) {
      db.transact([db.tx.recipes[recipe.id].update({ ...recipeData, updatedAt: Date.now() })]);
    } else {
      db.transact([db.tx.recipes[crypto.randomUUID()].update(recipeData)]);
    }

    onClose();
  };

  const filteredIngredients = ingredients.filter(
    (ingredient) =>
      !selectedIngredients.find((i) => i.ingredientId === ingredient.id) &&
      (ingredient.name.toLowerCase().includes(searchIngredient.toLowerCase()) ||
        ingredient.tags?.toLowerCase().includes(searchIngredient.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-4">
            {isEditing ? 'Edit Recipe' : 'Add New Recipe'}
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Recipe Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Chicken Salad"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Servings *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., lunch, healthy, quick"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Cooking instructions, tips, etc."
                />
              </div>
            </div>

            {/* Ingredients Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Ingredients *</label>
              
              {/* Selected Ingredients */}
              {selectedIngredients.length > 0 && (
                <div className="mb-4 space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded p-3">
                  {selectedIngredients.map(({ ingredientId, quantity }) => {
                    const ingredient = ingredients.find((i) => i.id === ingredientId);
                    if (!ingredient) return null;

                    return (
                      <div key={ingredientId} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                        <span className="flex-1 text-sm font-medium">{ingredient.name}</span>
                        <input
                          type="number"
                          min="0"
                          value={quantity}
                          onChange={(e) => handleQuantityChange(ingredientId, parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="g"
                        />
                        <span className="text-xs text-gray-500">g</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(ingredientId)}
                          className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Ingredient Search */}
              <div className="relative">
                <input
                  type="text"
                  value={searchIngredient}
                  onChange={(e) => setSearchIngredient(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search ingredients to add..."
                />
                {searchIngredient && filteredIngredients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                    {filteredIngredients.slice(0, 10).map((ingredient) => (
                      <button
                        key={ingredient.id}
                        type="button"
                        onClick={() => handleAddIngredient(ingredient.id)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 flex justify-between items-center"
                      >
                        <span className="text-sm">{ingredient.name}</span>
                        <span className="text-xs text-gray-500">
                          {ingredient.purinesPer100g}mg purines
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Nutrition Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">Nutrition Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Total Purines</p>
                  <p className="text-lg font-semibold">{nutrition.totalPurines.toFixed(1)} mg</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Calories</p>
                  <p className="text-lg font-semibold">{nutrition.totalKcals.toFixed(0)} kcal</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Inflammatory Level</p>
                  <p className="text-lg font-semibold">{nutrition.inflammatoryLevel}/10</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Gout Safety</p>
                  <p className={`text-lg font-semibold ${nutrition.safeForGout ? 'text-green-600' : 'text-red-600'}`}>
                    {nutrition.safeForGout ? '✓ Safe' : '⚠ Caution'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Per serving: {(nutrition.totalPurines / formData.servings).toFixed(1)}mg purines, 
                {' '}{(nutrition.totalKcals / formData.servings).toFixed(0)} kcal
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                {isEditing ? 'Update Recipe' : 'Add Recipe'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
