import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

// 1. Defined icons 
const Icons = {
  Pos: () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>,
  Orders: () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
  Tables: () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10m-10 0V9m10 12V9m0 0h-4"></path></svg>,
  Inventory: () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>,
  Menu: () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
  Finance: () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>,
  // NEW STAFF ICON
  Staff: () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout, role } = useUser(); 
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (sectionName) => setOpenSection(openSection === sectionName ? null : sectionName);

  const menuOptions = [
    { title: "1. Menu", icon: "🍔", subItems: [{ label: "a. Dishes", path: "/admin-menu" }, { label: "b. Category", path: "/admin-category" }, { label: "c. Combo Offer", path: "/admin-combos" }, { label: "d. Add On & Extras", path: "/admin-addons" }] },
    { title: "2. Finance", icon: "💰", subItems: [{ label: "a. Daybook", path: "/finance-daybook" }, { label: "b. Transactions", path: "/finance-transactions" }, { label: "c. Sales & Purchases", path: "/finance-sales" }, { label: "d. Income & Expenses", path: "/finance-income" }] },
    { title: "3. Inventory", icon: "📦", subItems: [{ label: "a. Stock Items", path: "/inventory-stock" }, { label: "b. Consumption", path: "/inventory-consumption" }, { label: "c. Suppliers", path: "/inventory-suppliers" }] }
  ];

  // 2. Main Modules Grid
  const modules = [
    { title: "Open POS", icon: <Icons.Pos />, path: "/pos" },
    { title: "Orders", icon: <Icons.Orders />, path: "/orders" },
    { title: "Tables", icon: <Icons.Tables />, path: "/tables" },
    { title: "Inventory", icon: <Icons.Inventory />, path: "/inventory-stock" },
    { title: "Menu Dishes", icon: <Icons.Menu />, path: "/admin-menu" },
    { title: "Day Book", icon: <Icons.Finance />, path: "/finance-daybook" },
    // ADDED: Staff Module
    { title: "Staff", icon: <Icons.Staff />, path: "/staff" },
  ];

  return (
    <div style={{ position: 'relative', minHeight: '100vh', backgroundColor: '#fff' }}>
      <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          
          <button onClick={logout} style={{ ...styles.backButton, color: 'red', fontWeight: 'bold' }}>
            ← Logout
          </button>

          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>DASHBOARD</h1>
          
          <button onClick={() => setIsSidebarOpen(true)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>
            ⚙️
          </button>
        </div>

        {/* Welcome Message */}
        <div style={{marginBottom: '20px', textAlign: 'center', color: '#666'}}>
            Logged in as: <strong style={{textTransform: 'uppercase', color: '#000'}}>{role}</strong>
        </div>

        {/* Grid Layout */}
        <div style={styles.gridContainer}>
          {modules.map((mod) => (
            <div 
              key={mod.title}
              onClick={() => navigate(mod.path)}
              style={styles.moduleCard}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ marginBottom: '10px' }}>{mod.icon}</div>
              <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: '500' }}>{mod.title}</h2>
            </div>
          ))}
        </div>
      </div>

      {/* OVERLAY SIDEBAR */}
      {isSidebarOpen && (
        <div style={styles.overlay}>
          <div style={styles.sidebarContainer}>
            <div style={styles.sidebarHeader}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#333' }}>OPTIONS</h3>
              <button onClick={() => setIsSidebarOpen(false)} style={styles.closeButton}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => navigate('/tables')} style={styles.sidebarBtn}>🪑 Table Management</button>
              <button onClick={() => navigate('/staff')} style={styles.sidebarBtn}>👥 Staff Management</button>

              {menuOptions.map((section) => (
                <div key={section.title}>
                  <button 
                    onClick={() => toggleSection(section.title)} 
                    style={{ 
                      ...styles.sidebarBtn, 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      backgroundColor: openSection === section.title ? '#000' : '#fff', 
                      color: openSection === section.title ? '#fff' : '#000' 
                    }}
                  >
                    <span>{section.icon} {section.title}</span>
                    <span>{openSection === section.title ? '▲' : '▼'}</span>
                  </button>
                  
                  {openSection === section.title && (
                    <div style={styles.subItemContainer}>
                      {section.subItems.map((item) => (
                        <button key={item.label} onClick={() => navigate(item.path)} style={styles.subItemBtn}>
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => setIsSidebarOpen(false)} style={styles.closeMenuBtn}>
              Close Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  backButton: { background: 'none', border: 'none', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' },
  gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' },
  moduleCard: { backgroundColor: 'black', color: 'white', padding: '40px 20px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', transition: 'transform 0.2s ease' },
  overlay: { position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'flex-end', zIndex: 2000 },
  sidebarContainer: { width: '280px', backgroundColor: '#f8f9fa', height: '100%', padding: '20px', boxShadow: '-2px 0 5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  sidebarHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' },
  closeButton: { border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer' },
  sidebarBtn: { width: '100%', padding: '15px', border: '1px solid #ddd', backgroundColor: 'white', color: '#000', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' },
  subItemContainer: { display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px 0 10px 15px', backgroundColor: '#f1f1f1', borderRadius: '0 0 8px 8px' },
  subItemBtn: { border: 'none', backgroundColor: 'transparent', textAlign: 'left', fontSize: '0.85rem', padding: '8px', color: '#555', cursor: 'pointer' },
  closeMenuBtn: { width: '100%', padding: '15px', border: '1px solid #ddd', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold', marginTop: '20px', backgroundColor: '#d32f2f', color: 'white' }
};

export default Dashboard;