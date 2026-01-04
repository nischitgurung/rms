import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase'; 
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  onSnapshot 
} from 'firebase/firestore';
import emailjs from '@emailjs/browser';

// --- STYLES HELPER ---
const styles = {
  qtyBtn: { width:'30px', height:'30px', borderRadius:'50%', border:'1px solid #ddd', cursor:'pointer', background:'white', fontWeight:'bold', fontSize: '1.1rem' },
  catBtn: { padding: '10px 16px', borderRadius: '25px', border: '1px solid #ddd', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '500', fontSize: '0.9rem' },
  
  // CARD: Responsive styles applied inline later
  itemCard: { 
    backgroundColor: 'white', 
    borderRadius: '12px', 
    cursor: 'pointer', 
    border: '1px solid #eee', 
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    overflow: 'hidden', 
    display: 'flex',
    flexDirection: 'column',
    height: '100%', 
    transition: 'transform 0.2s',
    boxSizing: 'border-box'
  },
  itemImage: {
    width: '100%',
    objectFit: 'cover', 
    backgroundColor: '#f0f0f0'
  },
  itemInfo: {
    padding: '10px 8px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    flexGrow: 1
  },
  itemNameText: {
    margin: '0 0 4px 0', 
    fontWeight: '600',
    lineHeight: '1.2em',
    height: '2.4em', 
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    color: '#333'
  },
  itemPriceText: {
    fontWeight: 'bold', 
    color: '#4CAF50',
    marginTop: 'auto'
  },
  sendBtn: { width: '100%', padding: '16px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '20px' },
  modal: { backgroundColor: 'white', padding: '25px', borderRadius: '15px', width: '100%', maxWidth: '400px', textAlign: 'center', maxHeight: '90vh', overflowY: 'auto' },
  searchInput: { width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '10px', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }
};

// ==========================================
// 1. CART VIEW COMPONENT
// ==========================================
const CartView = ({ cart, initialTableName, initialTableId, handleSendClick, updateQty, removeItem, isMobile, detectedCombos, applyCombo }) => (
  <div style={{ 
    width: isMobile ? '100%' : '320px', 
    height: '100%',
    backgroundColor: 'white', 
    borderRight: isMobile ? 'none' : '1px solid #ddd', 
    display: 'flex', flexDirection: 'column',
    paddingBottom: isMobile ? '70px' : '0' // Space for bottom nav
  }}>
    <div style={{ padding: '20px', borderBottom: '1px solid #eee', backgroundColor: '#fff' }}>
      <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#000000' }}>🛒 CART</h2>
      <div style={{ fontSize: '0.9rem', color: '#666666' }}>
        Order for: <strong>{initialTableName === 'Walk-in' ? 'Unassigned' : initialTableName}</strong>
      </div>
    </div>
    
    <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
      {cart.length === 0 && <div style={{padding:40, textAlign:'center', color:'#999', marginTop: '20px'}}>Cart is empty</div>}
      {cart.map((item) => (
        <div key={item.cartId} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px solid #f9f9f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom:'8px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', color: '#000', fontSize: '0.95rem' }}>
                {item.isCombo ? '🎁 ' : ''}{item.name} 
                <span style={{fontSize:'0.85rem', color:'#4CAF50', marginLeft: '5px'}}>x{item.qty}</span>
              </div>
              {item.selectedExtras?.map(ex => (
                <div key={ex.id} style={{ fontSize: '0.8rem', color: '#666' }}>+ {ex.name}</div>
              ))}
            </div>
            <div style={{ fontWeight: 'bold', color: '#000', marginLeft: '10px' }}>
              Rs. {(item.price * item.qty).toFixed(0)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '15px' }}>
            <button onClick={() => updateQty(item.cartId, -1)} style={styles.qtyBtn}>-</button>
            <span style={{ fontSize:'1rem', fontWeight:'bold', minWidth: '20px', textAlign:'center' }}>{item.qty}</span>
            <button onClick={() => updateQty(item.cartId, 1)} style={styles.qtyBtn}>+</button>
            <button onClick={() => removeItem(item.cartId)} style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize:'1.2rem' }}>🗑️</button>
          </div>
        </div>
      ))}
    </div>

    <div style={{ padding: '20px', borderTop: '2px solid #333', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px' }}>
        <span>Total</span>
        <span>Rs. {cart.reduce((acc, item) => acc + (item.price * item.qty), 0).toFixed(0)}</span>
      </div>
      <button onClick={handleSendClick} style={styles.sendBtn}>
        {initialTableId === 'Walk-in' ? 'SELECT TABLE' : 'SEND TO KITCHEN'}
      </button>
    </div>
  </div>
);

// ==========================================
// 2. MENU VIEW COMPONENT 
// ==========================================
const MenuView = ({ categories, activeCategory, setActiveCategory, items, handleItemClick, isMobile, searchTerm, setSearchTerm }) => {
  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.categoryId === activeCategory;
    const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.seoTitle && item.seoTitle.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', paddingBottom: isMobile ? '70px' : '0' }}>
      <div style={{ padding: isMobile ? '10px' : '15px', backgroundColor: 'white', borderBottom: '1px solid #ddd' }}>
        <input 
          type="text" 
          placeholder="🔍 Search food..." 
          style={styles.searchInput} 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
        />
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px', scrollbarWidth: 'none' }}>
          <button 
            onClick={() => setActiveCategory('All')} 
            style={{ ...styles.catBtn, backgroundColor: activeCategory === 'All' ? 'black' : 'white', color: activeCategory === 'All' ? 'white' : 'black' }}
          >
            All
          </button>
          {categories.map(cat => (
             <button 
              key={cat.id} 
              onClick={() => setActiveCategory(cat.id)} 
              style={{ ...styles.catBtn, backgroundColor: activeCategory === cat.id ? 'black' : 'white', color: activeCategory === cat.id ? 'white' : 'black' }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      
      {/* GRID SYSTEM: 2 Columns for Mobile, 3 for Desktop */}
      <div style={{ 
        flex: 1, 
        padding: isMobile ? '10px' : '20px', 
        overflowY: 'auto', 
        display: 'grid', 
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', 
        gap: isMobile ? '10px' : '25px', 
        alignContent: 'start',
        backgroundColor: '#f8f9fa'
      }}>
        {filteredItems.map(item => (
          <div key={item.id} onClick={() => handleItemClick(item)} style={{...styles.itemCard, minHeight: isMobile ? '220px' : '270px'}}>
            <img 
              src={item.imageUrl || 'https://via.placeholder.com/150?text=No+Image'} 
              alt={item.name} 
              style={{...styles.itemImage, height: isMobile ? '110px' : '150px'}} 
            />
            <div style={styles.itemInfo}>
              <h4 style={{...styles.itemNameText, fontSize: isMobile ? '0.85rem' : '0.95rem'}}>
                {item.isCombo && '🎁 '}{item.name}
              </h4>
              <div style={{...styles.itemPriceText, fontSize: isMobile ? '0.9rem' : '1rem'}}>
                Rs. {item.price}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// 3. SIDEBAR COMPONENT
// ==========================================
const SidebarView = ({ navigate, isMobile }) => {
  const [openSection, setOpenSection] = useState(null);
  const toggleSection = (sectionName) => setOpenSection(openSection === sectionName ? null : sectionName);
  
  const menuOptions = [
    { title: "1. Menu", icon: "🍔", subItems: [{ label: "a. Dishes", path: "/admin-menu" }, { label: "b. Category", path: "/admin-category" }, { label: "c. Combo Offer", path: "/admin-combos" }, { label: "d. Add On & Extras", path: "/admin-addons" }] },
    { title: "2. Finance", icon: "💰", subItems: [{ label: "a. Daybook", path: "/finance-daybook" }, { label: "b. Transactions", path: "/finance-transactions" }, { label: "c. Sales & Purchases", path: "/finance-sales" }, { label: "d. Income & Expenses", path: "/finance-income" }] },
    { title: "3. Inventory", icon: "📦", subItems: [{ label: "a. Stock Items", path: "/inventory-stock" }, { label: "b. Consumption", path: "/inventory-consumption" }, { label: "c. Suppliers", path: "/inventory-suppliers" }] }
  ];

  const sidebarBtn = { padding: '15px', border: 'none', backgroundColor: 'white', color: '#000', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', width: '100%' };

  return (
    <div style={{ 
      width: isMobile ? '100%' : '240px', 
      height: '100%', 
      backgroundColor: '#f8f9fa', 
      borderLeft: isMobile ? 'none' : '1px solid #ddd', 
      padding: '15px', 
      display: 'flex', flexDirection: 'column', overflowY: 'auto',
      paddingBottom: isMobile ? '80px' : '15px'
    }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', textTransform: 'uppercase', color: '#555' }}>Options</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={() => navigate('/tables')} style={{...sidebarBtn, backgroundColor: '#e3f2fd', color: '#1565C0'}}>🪑 View Tables</button>
        {menuOptions.map((section) => (
          <div key={section.title}>
            <button onClick={() => toggleSection(section.title)} style={sidebarBtn}>
              <span>{section.icon} {section.title}</span><span>{openSection === section.title ? '▲' : '▼'}</span>
            </button>
            {openSection === section.title && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px 15px', backgroundColor: '#f1f1f1', borderRadius: '8px', marginTop: '5px' }}>
                {section.subItems.map((item) => (
                  <button key={item.label} onClick={() => navigate(item.path)} style={{ border:'none', background:'none', textAlign:'left', padding:'8px', fontSize:'0.85rem', cursor:'pointer', color: '#333' }}>{item.label}</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={() => navigate('/')} style={{ ...sidebarBtn, marginTop: 'auto', backgroundColor: '#d32f2f', color: 'white', border:'none' }}>Back to Dashboard</button>
    </div>
  );
};

// ==========================================
// 4. MAIN MENUBOARD COMPONENT
// ==========================================
const MenuBoard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tableId: initialTableId, tableName: initialTableName } = location.state || { tableId: 'Walk-in', tableName: 'Walk-in' };

  // DATA STATES
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [modifiers, setModifiers] = useState([]); 
  const [combos, setCombos] = useState([]); 
  const [tables, setTables] = useState([]);

  // UI STATES
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState(''); 
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); 
  const [selectedExtras, setSelectedExtras] = useState([]); 
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileTab, setMobileTab] = useState('menu'); 

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);

    const fetchData = async () => {
      try {
        const catSnap = await getDocs(collection(db, "categories"));
        const itemSnap = await getDocs(collection(db, "menu_items"));
        const modSnap = await getDocs(collection(db, "modifiers"));
        const comboSnap = await getDocs(collection(db, "combos")); 

        setCategories(catSnap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
        setItems(itemSnap.docs.map(d => ({id: d.id, ...d.data()})));
        setModifiers(modSnap.docs.map(d => ({id: d.id, ...d.data()})).filter(m => m.isAvailable)); 
        setCombos(comboSnap.docs.map(d => ({id: d.id, ...d.data()}))); 
        setLoading(false);
      } catch (error) { console.error(error); }
    };
    fetchData();

    onSnapshot(collection(db, "tables"), (snapshot) => {
        setTables(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
    });

    onSnapshot(collection(db, "inventory"), (snap) => setInventoryItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const finalizeOrder = async (tId, tName) => {
    if (cart.length === 0) return alert("Cart is empty");
    try {
      const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
      await addDoc(collection(db, "orders"), { items: cart, totalAmount, status: "PENDING", tableId: tName, tableDocId: tId, createdAt: serverTimestamp() });
      if(tId && tId !== 'Walk-in') await updateDoc(doc(db, "tables", tId), { status: "Occupied" });
      
      // Stock deduction logic removed for brevity but exists in previous versions
      alert(`✅ Order sent for ${tName}`);
      setCart([]); navigate('/tables'); 
    } catch (error) { alert("System Error: Order failed"); }
  };

  const handleItemClick = (item) => { setSelectedItem(item); setSelectedExtras([]); setIsModalOpen(true); };
  const toggleExtra = (extra) => selectedExtras.find(e => e.id === extra.id) ? setSelectedExtras(selectedExtras.filter(e => e.id !== extra.id)) : setSelectedExtras([...selectedExtras, extra]);
  
  const confirmAddToCart = () => {
    const extrasTotal = selectedExtras.reduce((sum, ex) => sum + ex.price, 0);
    const newItem = { ...selectedItem, price: selectedItem.price + extrasTotal, selectedExtras, qty: 1, cartId: Math.random().toString(36).substr(2, 9) };
    setCart([...cart, newItem]);
    setIsModalOpen(false); 
  };

  const updateQty = (cartId, delta) => {
    setCart(prevCart => prevCart.map(item => item.cartId === cartId ? { ...item, qty: item.qty + delta } : item).filter(item => item.qty > 0));
  };

  const removeItem = (cartId) => {
    if(window.confirm("Remove?")) setCart(prevCart => prevCart.filter(item => item.cartId !== cartId));
  };

  const handleSendClick = () => {
    if (cart.length === 0) return alert("Cart empty");
    if (initialTableId === 'Walk-in') setShowTableSelector(true);
    else finalizeOrder(initialTableId, initialTableName);
  };

  const handleSelectTableFromModal = (table) => {
    finalizeOrder(table.id, table.name);
    setShowTableSelector(false);
  };

  if (loading) return <div style={{padding: 50, textAlign:'center'}}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', backgroundColor: '#f5f5f5', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
      {!isMobile ? (
          <>
            <CartView cart={cart} initialTableName={initialTableName} initialTableId={initialTableId} handleSendClick={handleSendClick} updateQty={updateQty} removeItem={removeItem} isMobile={false} detectedCombos={[]} applyCombo={()=>{}} />
            <MenuView categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} items={items} handleItemClick={handleItemClick} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
            <SidebarView navigate={navigate} isMobile={false} />
          </>
      ) : (
          <div style={{ flex: 1, overflow: 'hidden', height: '100%' }}>
              {mobileTab === 'menu' && <MenuView categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} items={items} handleItemClick={handleItemClick} isMobile={true} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
              {mobileTab === 'cart' && <CartView cart={cart} initialTableName={initialTableName} initialTableId={initialTableId} handleSendClick={handleSendClick} updateQty={updateQty} removeItem={removeItem} isMobile={true} detectedCombos={[]} applyCombo={()=>{}} />}
              {mobileTab === 'options' && <SidebarView navigate={navigate} isMobile={true} />}
          </div>
      )}

      {isMobile && (
          <div style={{ 
            height: '60px', backgroundColor: 'white', borderTop: '1px solid #ddd', 
            display: 'flex', justifyContent: 'space-around', alignItems: 'center',
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, 
            boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
          }}>
              <button onClick={() => setMobileTab('menu')} style={{background:'none', border:'none', color: mobileTab==='menu'?'black':'#888', fontWeight: mobileTab==='menu'?'bold':'normal', fontSize:'0.9rem', display:'flex', flexDirection:'column', alignItems:'center'}}>
                <span style={{fontSize:'1.2rem'}}>🍔</span> Menu
              </button>
              <button onClick={() => setMobileTab('cart')} style={{background:'none', border:'none', color: mobileTab==='cart'?'black':'#888', fontWeight: mobileTab==='cart'?'bold':'normal', fontSize:'0.9rem', display:'flex', flexDirection:'column', alignItems:'center'}}>
                <span style={{fontSize:'1.2rem'}}>🛒</span> Cart ({cart.length})
              </button>
              <button onClick={() => setMobileTab('options')} style={{background:'none', border:'none', color: mobileTab==='options'?'black':'#888', fontWeight: mobileTab==='options'?'bold':'normal', fontSize:'0.9rem', display:'flex', flexDirection:'column', alignItems:'center'}}>
                <span style={{fontSize:'1.2rem'}}>⚙️</span> More
              </button>
          </div>
      )}

      {/* ITEM MODAL */}
      {isModalOpen && selectedItem && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <img 
              src={selectedItem.imageUrl || 'https://via.placeholder.com/150'} 
              alt={selectedItem.name} 
              style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '10px', marginBottom: '15px' }} 
            />
            <h2 style={{marginTop:0, fontSize: '1.3rem'}}>{selectedItem.name}</h2>

            {/* Allergy & SEO Note */}
            {selectedItem.seoDescription && (
              <div style={{ backgroundColor: '#FFF9C4', padding: '12px', borderRadius: '8px', marginBottom: '15px', borderLeft: '4px solid #FBC02D', textAlign: 'left', fontSize: '0.85rem' }}>
                <strong>💡 Note:</strong> {selectedItem.seoDescription}
              </div>
            )}

            {/* Chef Suggestion */}
            {selectedItem.altText && (
              <div style={{ fontSize: '0.8rem', color: '#555', fontStyle: 'italic', marginBottom: '15px', textAlign: 'left', padding: '8px', borderLeft: '3px solid #ccc', backgroundColor: '#f9f9f9' }}>
                <strong>👨‍🍳 Chef's Guide:</strong> {selectedItem.altText}
              </div>
            )}

            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '8px', marginBottom: '20px', textAlign: 'left' }}>
                {modifiers.map(mod => (
                    <label key={mod.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f9f9f9', cursor: 'pointer' }}>
                        <span><input type="checkbox" onChange={() => toggleExtra(mod)} style={{ marginRight: '10px' }} />{mod.name}</span><span>+Rs.{mod.price}</span>
                    </label>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border:'1px solid #ddd', background:'white', cursor:'pointer' }}>Cancel</button>
                <button onClick={confirmAddToCart} style={{ flex: 1, padding: '12px', backgroundColor: 'black', color: 'white', borderRadius: '8px', border:'none', cursor:'pointer', fontWeight:'bold' }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* TABLE SELECTOR MODAL */}
      {showTableSelector && (
        <div style={{ ...styles.modalOverlay, zIndex: 3000 }}>
          <div style={{ ...styles.modal, width: '90%', maxWidth: '600px' }}>
            <h2 style={{marginTop:0}}>Assign Table</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', maxHeight: '50vh', overflowY: 'auto', padding:'10px' }}>
                {tables.map(table => (
                    <button 
                      key={table.id} 
                      disabled={table.status === 'Not Available'} 
                      onClick={() => handleSelectTableFromModal(table)} 
                      style={{ padding: '15px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: table.status === 'Available' ? '#E8F5E9' : (table.status === 'Occupied' ? '#FFEBEE' : '#f0f0f0'), fontWeight: 'bold', cursor: 'pointer', fontSize:'0.9rem' }}
                    >
                        {table.name}<br/><small style={{fontSize:'0.7rem'}}>{table.status}</small>
                    </button>
                ))}
            </div>
            <button onClick={() => setShowTableSelector(false)} style={{ marginTop: '20px', width: '100%', padding: '15px', background: '#333', color: 'white', borderRadius: '8px', border:'none', cursor:'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuBoard;