import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './views/Home';
import IngredientsView from './views/IngredientsView';
import RecipesView from './views/RecipesView';
import PantryView from './views/PantryView';
import CalendarView from './views/CalendarView';
import ShoppingListView from './views/ShoppingListView';
import AnalyticsView from './views/AnalyticsView';
import AIImportView from './views/AIImportView';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="ingredients" element={<IngredientsView />} />
          <Route path="recipes" element={<RecipesView />} />
          <Route path="pantry" element={<PantryView />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="shopping" element={<ShoppingListView />} />
          <Route path="analytics" element={<AnalyticsView />} />
          <Route path="ai-import" element={<AIImportView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
