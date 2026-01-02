// src/components/Layout.jsx
import { useNavigate, useLocation } from 'react-router-dom';

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation Items matching PDF Page 20 & 22 [cite: 168-171, 208-212]
  const menuItems = [
    { name: "Open POS", path: "/pos", icon: "🖥️" },
    { name: "Orders (Kitchen)", path: "/orders", icon: "📝" },
    { name: "Tables", path: "/tables", icon: "🪑" },
    { name: "Inventory", path: "/inventory", icon: "📦" },
    { name: "Menu Manager", path: "/admin-menu", icon: "🍔" },
    { name: "Day Book", path: "/finance", icon: "💰" }
  ];

  // Don't show sidebar on Login or POS (POS needs full screen)
  if (location.pathname === '/login' || location.pathname === '/pos') {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* SIDEBAR - Matches PDF Black Sidebar */}
      <div style={{ width: '250px', backgroundColor: 'black', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ marginBottom: '40px', textAlign: 'center' }}>RMS ADMIN</h2>
        
        <nav style={{ flex: 1 }}>
          {menuItems.map((item) => (
            <div 
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                padding: '15px',
                cursor: 'pointer',
                borderRadius: '8px',
                marginBottom: '10px',
                backgroundColor: location.pathname === item.path ? '#333' : 'transparent',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </div>
          ))}
        </nav>

        <button 
          onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}
          style={{ marginTop: 'auto', padding: '12px', background: '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          Logout
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
};

export default Layout;