// src/components/Layout.jsx
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 1. Hide Global Sidebar for Login and POS 
  // (POS has its own internal 3-column layout as per Page 22 [cite: 194-212])
  if (location.pathname === '/login' || location.pathname === '/pos') {
    return <Outlet />; // Renders the child route directly without wrapper
  }

  // Icons matching the line-art style of Page 20 [cite: 168-171]
  const icons = {
    dashboard: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
    orders: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
    tables: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10m-10 0V9m10 12V9m0 0h-4"></path></svg>,
    inventory: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>,
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
    finance: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>,
    logout: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
    profile: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
  };

  const menuItems = [
    { name: "Dashboard", path: "/", icon: icons.dashboard },
    { name: "Open POS", path: "/pos", icon: icons.dashboard }, // Redirects to full screen POS
    { name: "Orders", path: "/orders", icon: icons.orders },
    { name: "Tables", path: "/tables", icon: icons.tables },
    { name: "Inventory", path: "/inventory", icon: icons.inventory },
    { name: "Menu Manager", path: "/admin-menu", icon: icons.menu },
    { name: "Day Book", path: "/finance", icon: icons.finance }
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif', backgroundColor: '#f4f6f8' }}>
      
      {/* --- SIDEBAR (Black as per PDF Page 20) --- */}
      <div style={{ width: '260px', backgroundColor: 'black', color: 'white', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', overflowY: 'auto' }}>
        
        {/* Logo Area */}
        <div style={{ padding: '30px 20px', borderBottom: '1px solid #333' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', letterSpacing: '1px' }}>RMS ADMIN</h2>
        </div>
        
        {/* Navigation */}
        <nav style={{ flex: 1, padding: '20px 10px' }}>
          {menuItems.map((item) => {
             const isActive = location.pathname === item.path;
             return (
              <div 
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  padding: '12px 15px',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  marginBottom: '5px',
                  backgroundColor: isActive ? '#333' : 'transparent',
                  color: isActive ? 'white' : '#aaa', // Gray out inactive items like standard UI
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  fontWeight: isActive ? 'bold' : 'normal',
                  transition: 'background 0.2s'
                }}
              >
                {item.icon}
                <span style={{ fontSize: '0.95rem' }}>{item.name}</span>
              </div>
             );
          })}
        </nav>

        {/* Logout Button */}
        <div style={{ padding: '20px' }}>
          <button 
            onClick={() => { /* Add logic */ window.location.href = '/login'; }}
            style={{ 
              width: '100%', 
              padding: '12px', 
              background: '#d32f2f', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
            }}
          >
            {icons.logout} Logout
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT WRAPPER --- */}
      <div style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* Top Header with Profile (Matches Page 26, 27, 28 [cite: 314, 326, 333]) */}
        <div style={{ 
          height: '70px', 
          backgroundColor: 'white', 
          borderBottom: '1px solid #e0e0e0', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center', 
          padding: '0 30px'
        }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
             <div style={{ textAlign: 'right' }}>
               <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'black' }}>Admin User</div>
               <div style={{ fontSize: '0.8rem', color: '#666' }}>Manager</div>
             </div>
             <div style={{ padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '50%', color: 'black' }}>
               {icons.profile}
             </div>
           </div>
        </div>

        {/* Page Content */}
        <div style={{ padding: '30px', flex: 1, color: 'black' }}>
          <Outlet /> {/* Renders the current page */}
        </div>

      </div>
    </div>
  );
};

export default Layout;