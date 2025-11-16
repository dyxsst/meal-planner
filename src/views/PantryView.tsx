import { useState } from 'react';
import { db } from '../lib/db';
import type { Ingredient, Pantry } from '../types';

export default function PantryView() {
  const { isLoading: ingredientsLoading, data: ingredientsData } = db.useQuery({ ingredients: {} });
  const { isLoading: pantriesLoading, data: pantriesData } = db.useQuery({ pantries: {} });

  const ingredients = (ingredientsData?.ingredients || []) as Ingredient[];
  const pantries = (pantriesData?.pantries || []) as Pantry[];
  const activePantry = pantries.find((p) => p.isActive) || pantries[0];

  const [showPantryModal, setShowPantryModal] = useState(false);
  const [editingPantry, setEditingPantry] = useState<Pantry | null>(null);
  const [showAddIngredientModal, setShowAddIngredientModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Pantry form state
  const [pantryName, setPantryName] = useState('');

  const handleCreatePantry = () => {
    setPantryName('My Pantry');
    setEditingPantry(null);
    setShowPantryModal(true);
  };

  const handleEditPantry = (pantry: Pantry) => {
    setPantryName(pantry.name);
    setEditingPantry(pantry);
    setShowPantryModal(true);
  };

  const handleSavePantry = () => {
    if (editingPantry) {
      // Update existing pantry
      db.transact([
        db.tx.pantries[editingPantry.id].update({
          name: pantryName,
        }),
      ]);
    } else {
      // Create new pantry
      const newId = crypto.randomUUID();
      db.transact([
        db.tx.pantries[newId].update({
          name: pantryName,
          ingredients: [],
          isActive: pantries.length === 0, // First pantry is active by default
        }),
      ]);
    }
    setShowPantryModal(false);
  };

  const handleSetActivePantry = (pantryId: string) => {
    // Set all pantries to inactive, then set selected one to active
    const transactions = pantries.map((p) =>
      db.tx.pantries[p.id].update({ isActive: p.id === pantryId })
    );
    db.transact(transactions);
  };

  const handleDeletePantry = (pantryId: string) => {
    if (!confirm('Delete this pantry?')) return;
    db.transact([db.tx.pantries[pantryId].delete()]);
  };

  const handleAddIngredientToPantry = (ingredientId: string, quantityGrams: number) => {
    if (!activePantry) return;
    
    const existingIngredients = activePantry.ingredients || [];
    const existingIndex = existingIngredients.findIndex((i) => i.ingredientId === ingredientId);

    let updatedIngredients;
    if (existingIndex >= 0) {
      // Update quantity if already exists
      updatedIngredients = [...existingIngredients];
      updatedIngredients[existingIndex].quantityGrams += quantityGrams;
    } else {
      // Add new ingredient
      updatedIngredients = [...existingIngredients, { ingredientId, quantityGrams }];
    }

    db.transact([
      db.tx.pantries[activePantry.id].update({
        ingredients: updatedIngredients,
      }),
    ]);
  };

  const handleUpdateIngredientQuantity = (ingredientId: string, newQuantity: number) => {
    if (!activePantry) return;

    const existingIngredients = activePantry.ingredients || [];
    const updatedIngredients = existingIngredients.map((i) =>
      i.ingredientId === ingredientId ? { ...i, quantityGrams: newQuantity } : i
    );

    db.transact([
      db.tx.pantries[activePantry.id].update({
        ingredients: updatedIngredients,
      }),
    ]);
  };

  const handleRemoveIngredientFromPantry = (ingredientId: string) => {
    if (!activePantry) return;

    const updatedIngredients = (activePantry.ingredients || []).filter(
      (i) => i.ingredientId !== ingredientId
    );

    db.transact([
      db.tx.pantries[activePantry.id].update({
        ingredients: updatedIngredients,
      }),
    ]);
  };

  const pantryIngredients = (activePantry?.ingredients || [])
    .map((pi) => {
      const ingredient = ingredients.find((i) => i.id === pi.ingredientId);
      return ingredient ? { ...ingredient, quantityGrams: pi.quantityGrams } : null;
    })
    .filter(Boolean) as (Ingredient & { quantityGrams: number })[];

  const filteredIngredients = ingredients.filter(
    (ing) =>
      ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ing.tags && ing.tags.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (ingredientsLoading || pantriesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading pantry...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pantry Management</h1>
          <p className="mt-1 text-sm text-gray-600">Track your current kitchen inventory</p>
        </div>
        <button
          onClick={handleCreatePantry}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Pantry
        </button>
      </div>

      {/* Pantry Selector */}
      {pantries.length > 0 && (
        <div className="mb-6 flex gap-2 flex-wrap">
          {pantries.map((pantry) => (
            <div key={pantry.id} className="flex items-center gap-2">
              <button
                onClick={() => handleSetActivePantry(pantry.id)}
                className={`px-4 py-2 rounded-lg ${
                  pantry.isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {pantry.name}
              </button>
              {pantry.isActive && (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEditPantry(pantry)}
                    className="text-gray-600 hover:text-blue-600"
                  >
                    ✏️
                  </button>
                  {pantries.length > 1 && (
                    <button
                      onClick={() => handleDeletePantry(pantry.id)}
                      className="text-gray-600 hover:text-red-600"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!activePantry ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">No pantries yet. Create one to start tracking inventory.</p>
          <button
            onClick={handleCreatePantry}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Create First Pantry
          </button>
        </div>
      ) : (
        <>
          {/* Current Inventory */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Current Inventory ({pantryIngredients.length} items)
              </h2>
              <button
                onClick={() => setShowAddIngredientModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                + Add Ingredient
              </button>
            </div>

            {pantryIngredients.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No ingredients in pantry. Add some to start tracking inventory.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Ingredient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Quantity (g)
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Purines/100g
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Kcals/100g
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tags
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pantryIngredients.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="number"
                            value={item.quantityGrams}
                            onChange={(e) =>
                              handleUpdateIngredientQuantity(item.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-24 px-2 py-1 border border-gray-300 rounded"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.purinesPer100g} mg
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {item.kcalsPer100g} kcal
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {item.tags || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleRemoveIngredientFromPantry(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Pantry Modal */}
      {showPantryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {editingPantry ? 'Edit Pantry' : 'Create New Pantry'}
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pantry Name
              </label>
              <input
                type="text"
                value={pantryName}
                onChange={(e) => setPantryName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g., Kitchen, Summer Pantry"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowPantryModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePantry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Ingredient Modal */}
      {showAddIngredientModal && (
        <AddIngredientToPantryModal
          ingredients={filteredIngredients}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onAdd={handleAddIngredientToPantry}
          onClose={() => setShowAddIngredientModal(false)}
        />
      )}
    </div>
  );
}

interface AddIngredientToPantryModalProps {
  ingredients: Ingredient[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onAdd: (ingredientId: string, quantityGrams: number) => void;
  onClose: () => void;
}

function AddIngredientToPantryModal({
  ingredients,
  searchTerm,
  setSearchTerm,
  onAdd,
  onClose,
}: AddIngredientToPantryModalProps) {
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [quantity, setQuantity] = useState(100);

  const handleAdd = () => {
    if (!selectedIngredient) return;
    onAdd(selectedIngredient.id, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Add Ingredient to Pantry</h2>

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
          {ingredients.map((ing) => (
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

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedIngredient}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            Add to Pantry
          </button>
        </div>
      </div>
    </div>
  );
}

