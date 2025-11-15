export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Meal Planner</h1>
        <p className="mt-2 text-gray-600">
          Family nutrition tracking with gout-friendly meal planning
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick Stats Cards */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900">This Week</h2>
          <p className="mt-2 text-sm text-gray-600">
            Plan meals and track nutrition for your family
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="mt-4 space-y-2">
            <a href="/ingredients" className="block text-blue-600 hover:text-blue-800">
              → Manage Ingredients
            </a>
            <a href="/recipes" className="block text-blue-600 hover:text-blue-800">
              → Create Recipes
            </a>
            <a href="/calendar" className="block text-blue-600 hover:text-blue-800">
              → Plan This Week
            </a>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-900">Family Members</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div>
              <span className="font-medium">Exan:</span>
              <span className="ml-2 text-gray-600">Gout monitoring</span>
            </div>
            <div>
              <span className="font-medium">Nadia:</span>
              <span className="ml-2 text-gray-600">Calorie tracking</span>
            </div>
            <div>
              <span className="font-medium">Aidam:</span>
              <span className="ml-2 text-gray-600">School meals</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
