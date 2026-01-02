import DayBook from './components/DayBook';
import AddonManager from './components/AddonManager';
import AdminMenu from './components/AdminMenu';
import Inventory from './components/Inventory';
import KitchenDisplay from './components/KitchenDisplay';
import TableManagement from './components/TableManagement';
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; // New imports
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Import your pages
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MenuBoard from './components/MenuBoard';

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

      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      
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

              <Route path="/admin-menu" element={
        <ProtectedRoute>
          <AdminMenu />
        </ProtectedRoute>
      } />

        <Route path="/inventory" element={
  <ProtectedRoute>
    <Inventory />
  </ProtectedRoute>
} />

<Route path="/addons" element={
  <ProtectedRoute>
    <AddonManager />
  </ProtectedRoute>
} />
<Route path="/finance" element={
  <ProtectedRoute>
    <DayBook />
  </ProtectedRoute>
} />

      {/* Placeholders for future pages */}
      <Route path="/orders" element={<div>Orders Page Coming Soon</div>} />
      <Route path="/tables" element={<div>Tables Page Coming Soon</div>} />
      <Route path="/inventory" element={<div>Inventory Page Coming Soon</div>} />
    </Routes>
  );
}

export default App;