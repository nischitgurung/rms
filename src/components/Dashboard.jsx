import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  // Custom Line Icons to match Page 20 of your PDF
  const icons = {
    pos: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>
    ),
    orders: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    ),
    tables: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10m-10 0V9m10 12V9m0 0h-4"></path>
      </svg>
    ),
    inventory: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8"></polyline>
        <rect x="1" y="3" width="22" height="5"></rect>
        <line x1="10" y1="12" x2="14" y2="12"></line>
      </svg>
    ),
    menu: (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    ),
    finance: (
       <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
         <rect x="2" y="5" width="20" height="14" rx="2" />
         <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    )
  };

  const modules = [
    { title: "Open POS", icon: icons.pos, path: "/pos" },
    { title: "Orders", icon: icons.orders, path: "/orders" },
    { title: "Tables", icon: icons.tables, path: "/tables" },
    { title: "Inventory", icon: icons.inventory, path: "/inventory-stock" },
    // Extra modules kept consistent with the black theme
    { title: "Menu Dishes", icon: icons.menu, path: "/admin-menu" },
    { title: "Day Book", icon: icons.finance, path: "/finance-daybook" },
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* Header with Back button placeholder like Page 20 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <button 
           onClick={() => window.location.reload()} // Placeholder for Logout/Back
           style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>DASHBOARD</h1>
        <div style={{ width: '60px' }}></div> {/* Spacer to center title */}
      </div>

      {/* Grid Layout */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
        gap: '30px' 
      }}>
        {modules.map((mod) => (
          <div 
            key={mod.title}
            onClick={() => navigate(mod.path)}
            style={{ 
              backgroundColor: 'black',  // Matches PDF Page 20 
              color: 'white',
              padding: '50px 20px', 
              borderRadius: '12px', 
              textAlign: 'center', 
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ marginBottom: '10px' }}>{mod.icon}</div>
            <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: '500' }}>{mod.title}</h2>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
