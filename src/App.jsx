import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// --- COMPONENTS ---
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MenuBoard from './components/MenuBoard'; // POS
import TableManagement from './components/TableManagement';
import KitchenDisplay from './components/KitchenDisplay';
import AdminMenu from './components/AdminMenu';
import Inventory from './components/Inventory';
import AddonManager from './components/AddonManager';
import DayBook from './components/DayBook';
import AdminCategory from './components/AdminCategory';
import AdminCombos from './components/AdminCombos';
import Transactions from './components/Transactions';
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <div>Loading...</div>;

  // Protect routes: If no user, force them to Login
  const ProtectedRoute = ({ children }) => {
    return user ? children : <Navigate to="/login" />;
  };

  return (
    <Routes>
      {/* Public Route: Login */}
      <Route path="/login" element={!user ? <Login onLogin={() => {}} /> : <Navigate to="/" />} />

      {/* --- DASHBOARD --- */}
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      {/* --- POS / MENUS --- */}
      <Route path="/pos" element={
        <ProtectedRoute>
          <MenuBoard />
        </ProtectedRoute>
      } />

      <Route path="/admin-menu" element={
        <ProtectedRoute>
          <AdminMenu />
        </ProtectedRoute>
      } />
      
      <Route path="/admin-category" element={
        <ProtectedRoute>
          <AdminCategory />
        </ProtectedRoute>
      } />

      {/* UPDATED: Matches sidebar link "/admin-addons" */}
      <Route path="/admin-addons" element={
        <ProtectedRoute>
          <AddonManager />
        </ProtectedRoute>
      } />

      {/* Placeholder for Combos (matches sidebar to prevent 404) */}
     <Route path="/admin-combos" element={
  <ProtectedRoute>
    <AdminCombos />
  </ProtectedRoute>
} />
      {/* --- TABLES & ORDERS --- */}
      <Route path="/tables" element={
        <ProtectedRoute>
          <TableManagement />
        </ProtectedRoute>
      } />

      <Route path="/orders" element={
        <ProtectedRoute>
          <KitchenDisplay />
        </ProtectedRoute>
      } />

      {/* --- INVENTORY --- */}
      {/* UPDATED: Matches sidebar "/inventory-stock" */}
      <Route path="/inventory-stock" element={
        <ProtectedRoute>
          <Inventory />
        </ProtectedRoute>
      } />
      
      {/* Route other inventory links to main Inventory for now */}
      <Route path="/inventory-consumption" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/inventory-suppliers" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />

      {/* --- FINANCE --- */}
      {/* UPDATED: Matches sidebar "/finance-daybook" */}
      <Route path="/finance-daybook" element={
        <ProtectedRoute>
          <DayBook />
        </ProtectedRoute>
      } />

      {/* Route other finance links to DayBook for now */}
      <Route path="/finance-transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
      <Route path="/finance-sales" element={<ProtectedRoute><DayBook /></ProtectedRoute>} />
      <Route path="/finance-income" element={<ProtectedRoute><DayBook /></ProtectedRoute>} />

    </Routes>
  );
}

export default App;