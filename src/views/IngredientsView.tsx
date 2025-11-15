import { useState } from "react";
import { db } from "../lib/db";
import { id } from "@instantdb/react";

export default function IngredientsView() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterInflammation, setFilterInflammation] = useState<string>("all");
  const [formData, setFormData] = useState({
    name: "",
    purinesPer100g: 0,
    kcalsPer100g: 0,
    inflammatoryLevel: 5,
    tags: "",
    notes: "",
  });

  // Query ingredients from Instantdb
  const { isLoading, error, data } = db.useQuery({ ingredients: {} });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const now = Date.now();
    
    if (editingId) {
      // Update existing ingredient
      db.transact(
        db.tx.ingredients[editingId].update({
          name: formData.name,
          purinesPer100g: formData.purinesPer100g,
          kcalsPer100g: formData.kcalsPer100g,
          inflammatoryLevel: formData.inflammatoryLevel,
          tags: formData.tags,
          notes: formData.notes,
          updatedAt: now,
        })
      );
    } else {
      // Create new ingredient
      db.transact(
        db.tx.ingredients[id()].update({
          name: formData.name,
          purinesPer100g: formData.purinesPer100g,
          kcalsPer100g: formData.kcalsPer100g,
          inflammatoryLevel: formData.inflammatoryLevel,
          tags: formData.tags,
          notes: formData.notes,
          createdAt: now,
          updatedAt: now,
        })
      );
    }

    // Reset form and close modal
    setFormData({
      name: "",
      purinesPer100g: 0,
      kcalsPer100g: 0,
      inflammatoryLevel: 5,
      tags: "",
      notes: "",
    });
    setShowAddModal(false);
    setEditingId(null);
  };

  const handleEdit = (ingredient: any) => {
    setFormData({
      name: ingredient.name,
      purinesPer100g: ingredient.purinesPer100g,
      kcalsPer100g: ingredient.kcalsPer100g,
      inflammatoryLevel: ingredient.inflammatoryLevel,
      tags: ingredient.tags || "",
      notes: ingredient.notes || "",
    });
    setEditingId(ingredient.id);
    setShowAddModal(true);
  };

  const handleDelete = (ingredientId: string) => {
    if (confirm("Are you sure you want to delete this ingredient?")) {
      db.transact(db.tx.ingredients[ingredientId].delete());
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading ingredients...</div>;
  }

  if (error) {
    return <div className="text-red-600 py-8">Error loading ingredients: {error.message}</div>;
  }

  const ingredients = data?.ingredients || [];

  // Filter ingredients based on search and filter criteria
  const filteredIngredients = ingredients.filter((ingredient: any) => {
    const matchesSearch = ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ingredient.tags?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesInflammation = true;
    if (filterInflammation === "low") {
      matchesInflammation = ingredient.inflammatoryLevel <= 3;
    } else if (filterInflammation === "medium") {
      matchesInflammation = ingredient.inflammatoryLevel > 3 && ingredient.inflammatoryLevel <= 6;
    } else if (filterInflammation === "high") {
      matchesInflammation = ingredient.inflammatoryLevel > 6;
    }
    
    return matchesSearch && matchesInflammation;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingredient Management</h1>
          <p className="mt-2 text-gray-600">Manage your ingredient database with nutritional information</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Ingredient
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white shadow-md rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by name or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Inflammation</label>
            <select
              value={filterInflammation}
              onChange={(e) => setFilterInflammation(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="all">All Levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Showing {filteredIngredients.length} of {ingredients.length} ingredients
        </div>
      </div>

      {/* Ingredients Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="md:hidden px-4 py-2 bg-gray-50 text-xs text-gray-600">
          👉 Scroll right to see all columns and actions
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purines/100g</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kcal/100g</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inflammation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredIngredients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  {ingredients.length === 0 
                    ? "No ingredients yet. Add your first ingredient to get started!"
                    : "No ingredients match your search criteria."}
                </td>
              </tr>
            ) : (
              filteredIngredients.map((ingredient: any) => {
                const inflLevel = ingredient.inflammatoryLevel;
                const inflColor = inflLevel <= 3 ? "bg-green-100 text-green-800" :
                                  inflLevel <= 6 ? "bg-yellow-100 text-yellow-800" :
                                  "bg-red-100 text-red-800";
                
                return (
                <tr key={ingredient.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ingredient.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ingredient.purinesPer100g.toFixed(1)} mg</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ingredient.kcalsPer100g.toFixed(0)} kcal</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${inflColor}`}>
                      {inflLevel}/10
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {ingredient.tags || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button 
                      onClick={() => handleEdit(ingredient)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(ingredient.id)}
                      className="text-red-600 hover:text-red-900 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Add/Edit Ingredient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? "Edit Ingredient" : "Add New Ingredient"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purines (mg per 100g) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.1"
                    value={formData.purinesPer100g}
                    onChange={(e) => setFormData({ ...formData, purinesPer100g: parseFloat(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Calories (kcal per 100g) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.1"
                    value={formData.kcalsPer100g}
                    onChange={(e) => setFormData({ ...formData, kcalsPer100g: parseFloat(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inflammatory Level (1-10) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="10"
                    value={formData.inflammatoryLevel}
                    onChange={(e) => setFormData({ ...formData, inflammatoryLevel: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g., vegetable, protein"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingId(null);
                    setFormData({
                      name: "",
                      purinesPer100g: 0,
                      kcalsPer100g: 0,
                      inflammatoryLevel: 5,
                      tags: "",
                      notes: "",
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingId ? "Update Ingredient" : "Add Ingredient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
