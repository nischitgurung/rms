import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  // Configuration for your 4 big buttons
const modules = [
    { title: "Open POS", icon: "🖥️", path: "/pos", color: "black" },
    { title: "Orders", icon: "📝", path: "/orders", color: "black" },
    { title: "Tables", icon: "🪑", path: "/tables", color: "black" },
    { title: "Inventory", icon: "📦", path: "/inventory", color: "black" },
    { title: "Menu Manager", icon: "🍔", path: "/admin-menu", color: "#2196F3" },
    { title: "Extras", icon: "➕", path: "/addons", color: "#FF9800" },
    // NEW BUTTON
    { title: "Day Book", icon: "💰", path: "/finance", color: "#607D8B" },
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>Restaurant Manager</h1>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px' 
      }}>
        {modules.map((mod) => (
          <div 
            key={mod.title}
            onClick={() => navigate(mod.path)}
            style={{ 
              backgroundColor: mod.color, 
              color: 'white',
              padding: '40px', 
              borderRadius: '15px', 
              textAlign: 'center', 
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              border: '2px solid #333'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>{mod.icon}</div>
            <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{mod.title}</h2>
          </div>
        ))}
      </div>
      
      <button 
        onClick={() => window.location.reload()} // Simple logout for now
        style={{ marginTop: '50px', padding: '10px 20px', background: '#d32f2f', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}
      >
        Log Out
      </button>
    </div>
  );
};

export default Dashboard;