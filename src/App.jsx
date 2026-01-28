import { Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './contexts/UserContext';

// --- AUTH COMPONENTS ---
import Login from './components/Login';
import Signup from './components/Signup';
import ForgotPassword from './components/ForgotPassword';

// --- MAIN COMPONENTS ---
import Dashboard from './components/Dashboard';
import StaffManagement from './components/StaffManagement'; 
import PublicMenu from './components/PublicMenu'; 

// --- OPERATIONS (FOH/BOH) ---
import MenuBoard from './components/MenuBoard'; // POS
import TableManagement from './components/TableManagement';
import KitchenDisplay from './components/KitchenDisplay';

// --- ADMIN & MENU ---
import AdminMenu from './components/AdminMenu';
import AdminCategory from './components/AdminCategory';
import AddonManager from './components/AddonManager'; 
import AdminCombos from './components/AdminCombos';

// --- INVENTORY ---
import Inventory from './components/Inventory';
import Consumption from './components/Consumption';
import Suppliers from './components/Suppliers';

// --- FINANCE ---
import DayBook from './components/DayBook';
import Transactions from './components/Transactions';
import SalesPurchases from './components/SalesPurchases';
import IncomeExpenses from './components/IncomeExpenses';

function App() {
  const { user, role, loading } = useUser();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#555' }}>Loading System...</div>
      </div>
    );
  }

  // --- SECURITY WRAPPER ---
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!user) return <Navigate to="/login" />;
    
    // Strict Role Check
    if (allowedRoles && !allowedRoles.includes(role)) {
       return (
         <div style={{ padding: 50, textAlign: 'center', color: '#D32F2F', fontFamily: 'sans-serif' }}>
           <h1 style={{ fontSize: '3rem' }}>⛔</h1>
           <h2>Access Denied</h2>
           <p>You are logged in as a <strong>{role ? role.toUpperCase() : 'UNKNOWN'}</strong>.</p>
           <p>You do not have permission to view this page.</p>
           <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#FFF0F0', border: '1px solid #FFCDD2', borderRadius: '8px', display: 'inline-block', textAlign:'left' }}>
             <strong>Security Policy Violation:</strong>
             <ul style={{ margin: '10px 0 0 20px', fontSize: '0.9rem' }}>
               <li>Servers cannot access Manager reports.</li>
               <li>Kitchen staff cannot modify Inventory.</li>
               <li>Only Managers/Owners can view Financials.</li>
             </ul>
           </div>
           <br />
           <button 
             onClick={() => window.history.back()}
             style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer', fontWeight: 'bold' }}
           >
             Go Back
           </button>
         </div>
       );
    }
    return children;
  };

  // --- PUBLIC WRAPPER ---
  const PublicRoute = ({ children }) => {
    return !user ? children : <Navigate to="/" />;
  };

  return (
    <Routes>
      {/* ==========================
          1. PUBLIC ROUTES (No Login)
      ========================== */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      
      {/* CUSTOMER QR MENU (Visible to anyone with the link) */}
      <Route path="/menu/:restaurantId" element={<PublicMenu />} />


      {/* ==========================
          2. DASHBOARD (Everyone)
      ========================== */}
      <Route path="/" element={
        <ProtectedRoute allowedRoles={['owner', 'manager', 'waiter', 'kitchen']}>
          <Dashboard />
        </ProtectedRoute>
      } />


      {/* ==========================
          3. STAFF MGMT (Owner/Manager)
      ========================== */}
      <Route path="/staff" element={
        <ProtectedRoute allowedRoles={['owner', 'manager']}>
          <StaffManagement />
        </ProtectedRoute>
      } />
      

      {/* ==========================
          4. FRONT OF HOUSE (Waiter+)
      ========================== */}
      <Route path="/pos" element={
        <ProtectedRoute allowedRoles={['owner', 'manager', 'waiter']}>
          <MenuBoard />
        </ProtectedRoute>
      } />
      <Route path="/tables" element={
        <ProtectedRoute allowedRoles={['owner', 'manager', 'waiter']}>
          <TableManagement />
        </ProtectedRoute>
      } />


      {/* ==========================
          5. KITCHEN (Kitchen+)
      ========================== */}
      <Route path="/orders" element={
        <ProtectedRoute allowedRoles={['owner', 'manager', 'kitchen']}>
          <KitchenDisplay />
        </ProtectedRoute>
      } />


      {/* ==========================
          6. MENU ADMIN (Manager+)
      ========================== */}
      <Route path="/admin-menu" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><AdminMenu /></ProtectedRoute>} />
      <Route path="/admin-category" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><AdminCategory /></ProtectedRoute>} />
      <Route path="/admin-addons" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><AddonManager /></ProtectedRoute>} />
      <Route path="/admin-combos" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><AdminCombos /></ProtectedRoute>} />


      {/* ==========================
          7. INVENTORY (Manager+)
      ========================== */}
      {/* UPDATED: Managers need access to set Par Levels and Vendors per User Story 2.1 */}
      <Route path="/inventory-stock" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><Inventory /></ProtectedRoute>} />
      <Route path="/inventory-consumption" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><Consumption /></ProtectedRoute>} />
      <Route path="/inventory-suppliers" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><Suppliers /></ProtectedRoute>} />


      {/* ==========================
          8. FINANCE (Owner & Manager)
      ========================== */}
      {/* UPDATED: Managers added because they need to generate COGS Reports per User Story 4.1 */}
      <Route path="/finance-daybook" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><DayBook /></ProtectedRoute>} />
      <Route path="/finance-transactions" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><Transactions /></ProtectedRoute>} />
      <Route path="/finance-sales" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><SalesPurchases /></ProtectedRoute>} />
      <Route path="/finance-income" element={<ProtectedRoute allowedRoles={['owner', 'manager']}><IncomeExpenses /></ProtectedRoute>} />


      {/* ==========================
          9. CATCH ALL
      ========================== */}
      <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
    </Routes>
  );
}

export default App;