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
import SalesPurchases from './components/SalesPurchases';
import IncomeExpenses from './components/IncomeExpenses';
import Consumption from './components/Consumption'; 
import Suppliers from './components/Suppliers';
import Signup from './components/Signup';
import ForgotPassword from './components/ForgotPassword';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This is the core Firebase listener that keeps the user logged in
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#f8f9fa',
        fontFamily: 'Arial, sans-serif' 
      }}>
        <div style={spinnerStyle}></div>
        <p style={{ marginTop: '20px', color: '#666', fontWeight: '500' }}>Initializing System...</p>
      </div>
    );
  }

  // --- ROUTE GUARDS ---

  // ProtectedRoute: Only allows access if the user is authenticated via Firebase
  const ProtectedRoute = ({ children }) => {
    return user ? children : <Navigate to="/login" />;
  };

  // PublicRoute: Prevents logged-in users from accessing Login/Signup/ForgotPass
  const PublicRoute = ({ children }) => {
    return !user ? children : <Navigate to="/" />;
  };

  return (
    <Routes>
      {/* --- PUBLIC AUTH ROUTES --- */}
      <Route path="/login" element={
        <PublicRoute>
          <Login onLogin={() => {}} />
        </PublicRoute>
      } />
      
      <Route path="/signup" element={
        <PublicRoute>
          <Signup />
        </PublicRoute>
      } />
      
      <Route path="/forgot-password" element={
        <PublicRoute>
          <ForgotPassword />
        </PublicRoute>
      } />

      {/* --- PRIVATE BUSINESS ROUTES (PROTECTED) --- */}
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      {/* POS & Table Management */}
      <Route path="/pos" element={
        <ProtectedRoute>
          <MenuBoard />
        </ProtectedRoute>
      } />

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

      {/* Admin & Menu Control */}
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

      <Route path="/admin-addons" element={
        <ProtectedRoute>
          <AddonManager />
        </ProtectedRoute>
      } />

      <Route path="/admin-combos" element={
        <ProtectedRoute>
          <AdminCombos />
        </ProtectedRoute>
      } />

      {/* Inventory Management */}
      <Route path="/inventory-stock" element={
        <ProtectedRoute>
          <Inventory />
        </ProtectedRoute>
      } />
      
      <Route path="/inventory-consumption" element={
        <ProtectedRoute>
          <Consumption />
        </ProtectedRoute>
      } />
      
      <Route path="/inventory-suppliers" element={
        <ProtectedRoute>
          <Suppliers />
        </ProtectedRoute>
      } />

      {/* Finance & Reports */}
      <Route path="/finance-daybook" element={
        <ProtectedRoute>
          <DayBook />
        </ProtectedRoute>
      } />

      <Route path="/finance-transactions" element={
        <ProtectedRoute>
          <Transactions />
        </ProtectedRoute>
      } />
      
      <Route path="/finance-sales" element={
        <ProtectedRoute>
          <SalesPurchases />
        </ProtectedRoute>
      } />
      
      <Route path="/finance-income" element={
        <ProtectedRoute>
          <IncomeExpenses />
        </ProtectedRoute>
      } />

      {/* --- GLOBAL REDIRECT --- */}
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
    </Routes>
  );
}

// Simple CSS spinner for the loading screen
const spinnerStyle = {
  width: '40px',
  height: '40px',
  border: '4px solid #f3f3f3',
  borderTop: '4px solid #000',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
};

// Add this to your index.css or a global style tag
/*
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
*/

export default App;