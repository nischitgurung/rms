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
import { Helmet, HelmetProvider } from 'react-helmet-async'; 

// --- STYLES HELPER ---
const styles = {
  qtyBtn: { width:'32px', height:'32px', borderRadius:'8px', border:'1px solid #ddd', cursor:'pointer', background:'white', fontWeight:'bold', fontSize:'1.1rem', display:'flex', alignItems:'center', justifyContent:'center' },
  catBtn: { padding: '10px 20px', borderRadius: '30px', border: '1px solid #eee', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.2s', boxShadow:'0 2px 5px rgba(0,0,0,0.05)' },
  
  // FIX: CARD LAYOUT TO FORCE PRICE VISIBILITY
  itemCard: { 
    backgroundColor: 'white', 
    borderRadius: '16px', 
    cursor: 'pointer', 
    border: 'none', 
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)', 
    overflow: 'hidden', 
    display: 'flex',
    flexDirection: 'column',
    height: '100%', 
    minHeight: '280px', // Increased slightly to ensure room for price
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
    position: 'relative'
  },
  itemImage: {
    width: '100%',
    aspectRatio: '4/3', // Keeps image strict square-ish rectangle
    objectFit: 'cover', 
    backgroundColor: '#f8f9fa',
    flexShrink: 0 // Prevents image from shrinking
  },
  itemInfo: {
    padding: '12px',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    flexGrow: 1, // Forces this section to fill remaining height
    minHeight: '100px' // Guarantees space for text and price
  },
  itemNameText: {
    margin: '0 0 8px 0', 
    fontSize: '1rem', 
    fontWeight: '700',
    lineHeight: '1.3em',
    // Limit to 2 lines so it doesn't push price out
    height: '2.6em', 
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    color: '#2c3e50'
  },
  // FIX: PRICE STYLING
  itemPriceText: {
    fontWeight: '800', 
    color: '#27ae60', 
    fontSize: '1.1rem',
    marginTop: 'auto', // Critical: Pushes price to the absolute bottom of the flex container
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%'
  },
  sendBtn: { width: '100%', padding: '18px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', letterSpacing:'0.5px' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, backdropFilter: 'blur(3px)' },
  modal: { backgroundColor: 'white', padding: '0', borderRadius: '20px', width: '380px', maxWidth: '90%', textAlign: 'center', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' },
  searchInput: { width: '100%', padding: '12px 20px', borderRadius: '30px', border: '1px solid #ddd', marginBottom: '15px', fontSize: '1rem', outline: 'none', boxShadow:'inset 0 2px 5px rgba(0,0,0,0.02)' }
};

// ==========================================
// 1. CART VIEW COMPONENT
// ==========================================
const CartView = ({ cart, initialTableName, initialTableId, handleSendClick, updateQty, removeItem, isMobile, detectedCombos, applyCombo }) => (
  <div style={{ 
    width: isMobile ? '100%' : '340px', 
    height: isMobile ? 'calc(100vh - 60px)' : '100vh',
    backgroundColor: 'white', 
    borderRight: isMobile ? 'none' : '1px solid #eee', 
    display: 'flex', flexDirection: 'column' 
  }}>
    <div style={{ padding: '25px 20px', borderBottom: '1px solid #f0f0f0' }}>
      <h2 style={{ margin: '0 0 5px 0', fontSize: '1.4rem', color: '#2c3e50' }}>Current Order</h2>
      <div style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
        Table: <strong style={{color:'#2c3e50'}}>{initialTableName === 'Walk-in' ? 'Unassigned' : initialTableName}</strong>
      </div>
    </div>

    {/* COMBO NOTIFICATION */}
    {detectedCombos.length > 0 && (
      <div style={{ backgroundColor: '#E3F2FD', padding: '12px 20px', borderBottom: '1px solid #BBDEFB' }}>
        {detectedCombos.map(combo => (
          <div key={combo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div>
                <span style={{ fontSize: '0.85rem', color: '#1565C0', fontWeight: 'bold', display:'block' }}>✨ Bundle Available!</span>
                <span style={{ fontSize: '0.8rem', color: '#555' }}>{combo.name}</span>
            </div>
            <button 
                onClick={() => applyCombo(combo)} 
                style={{ padding: '6px 12px', backgroundColor: '#1976D2', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight:'bold' }}
            >
                Apply (Rs.{combo.price})
            </button>
          </div>
        ))}
      </div>
    )}
    
    <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
      {cart.length === 0 && <div style={{padding:'40px 20px', textAlign:'center', color:'#bdc3c7', fontStyle:'italic'}}>Cart is empty</div>}
      {cart.map((item) => (
        <div key={item.cartId} style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '1px dashed #eee' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom:'8px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', color: '#2c3e50', fontSize:'0.95rem' }}>
                {item.isCombo ? '🎁 ' : ''}{item.name} 
                <span style={{fontSize:'0.85rem', color:'#7f8c8d', marginLeft:'5px'}}>x{item.qty}</span>
              </div>
              {item.selectedExtras?.map(ex => (
                <div key={ex.id} style={{ fontSize: '0.8rem', color: '#95a5a6' }}>+ {ex.name}</div>
              ))}
            </div>
            <div style={{ fontWeight: '700', color: '#2c3e50', marginLeft: '10px' }}>
              Rs. {(item.price * item.qty).toFixed(0)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={() => updateQty(item.cartId, -1)} style={styles.qtyBtn}>-</button>
            <span style={{ fontSize:'0.9rem', fontWeight:'bold', minWidth:'20px', textAlign:'center' }}>{item.qty}</span>
            <button onClick={() => updateQty(item.cartId, 1)} style={styles.qtyBtn}>+</button>
            <button onClick={() => removeItem(item.cartId)} style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize:'1.1rem', opacity: 0.5 }}>🗑️</button>
          </div>
        </div>
      ))}
    </div>

    <div style={{ padding: '20px', backgroundColor: '#f9f9f9', borderTop: '1px solid #eee' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '15px', color:'#2c3e50' }}>
        <span>Total</span>
        <span>Rs. {cart.reduce((acc, item) => acc + (item.price * item.qty), 0).toFixed(2)}</span>
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: isMobile ? 'calc(100vh - 60px)' : '100vh', backgroundColor:'#f4f6f8' }}>
      <div style={{ padding: '20px', backgroundColor: 'white', borderBottom: '1px solid #eee' }}>
        <input type="text" placeholder="🔍 Find food, drinks, desserts..." style={styles.searchInput} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px', scrollbarWidth: 'none' }}>
          <button onClick={() => setActiveCategory('All')} style={{ ...styles.catBtn, backgroundColor: activeCategory === 'All' ? '#2c3e50' : 'white', color: activeCategory === 'All' ? 'white' : '#2c3e50' }}>All Items</button>
          {categories.map(cat => (
             <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{ ...styles.catBtn, backgroundColor: activeCategory === cat.id ? '#2c3e50' : 'white', color: activeCategory === cat.id ? 'white' : '#2c3e50' }}>{cat.name}</button>
          ))}
        </div>
      </div>
      
      <div style={{ 
        flex: 1, padding: '20px', overflowY: 'auto', display: 'grid', 
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(200px, 1fr))', 
        gap: '20px', alignContent: 'start'
      }}>
        {filteredItems.map(item => (
          <div key={item.id} onClick={() => handleItemClick(item)} style={styles.itemCard}>
            <img 
              src={item.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'} 
              alt={item.altText || item.name} 
              style={styles.itemImage} 
              loading="lazy"
            />
            <div style={styles.itemInfo}>
              <h4 style={styles.itemNameText}>{item.isCombo && '🎁 '}{item.name}</h4>
              
              {/* --- PRICE VISIBILITY FIX --- */}
              <div style={styles.itemPriceText}>
                <span>Rs. {item.price}</span>
                {/* Optional Plus icon for UX */}
                <span style={{fontSize:'1.2rem', color:'#ccc', fontWeight:'normal'}}>+</span>
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
    <div style={{ width: isMobile ? '100%' : '240px', height: isMobile ? 'calc(100vh - 60px)' : '100vh', backgroundColor: '#f8f9fa', borderLeft: isMobile ? 'none' : '1px solid #ddd', padding: '15px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', textTransform: 'uppercase', color: '#7f8c8d' }}>Options</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={() => navigate('/tables')} style={{...sidebarBtn, backgroundColor: '#e3f2fd', color: '#1565C0'}}>🪑 Tables</button>
        {menuOptions.map((section) => (
          <div key={section.title}>
            <button onClick={() => toggleSection(section.title)} style={sidebarBtn}>
              <span>{section.icon} {section.title}</span><span>{openSection === section.title ? '▲' : '▼'}</span>
            </button>
            {openSection === section.title && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px 15px', backgroundColor: '#fff', borderRadius: '8px' }}>
                {section.subItems.map((item) => (
                  <button key={item.label} onClick={() => navigate(item.path)} style={{ border:'none', background:'none', textAlign:'left', padding:'8px', fontSize:'0.85rem', cursor:'pointer', color: '#555' }}>{item.label}</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={() => navigate('/')} style={{ ...sidebarBtn, marginTop: 'auto', backgroundColor: '#c0392b', color: 'white' }}>Dashboard</button>
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

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [modifiers, setModifiers] = useState([]); 
  const [combos, setCombos] = useState([]); 
  const [tables, setTables] = useState([]);

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
        
        // --- MERGE ITEMS AND COMBOS ---
        const fetchedMenuItems = itemSnap.docs.map(d => ({id: d.id, ...d.data()}));
        const fetchedCombos = comboSnap.docs.map(d => ({id: d.id, ...d.data(), isCombo: true, categoryId: 'Deals'})); 
        
        setItems([...fetchedMenuItems, ...fetchedCombos]); 
        setCombos(fetchedCombos); 
        
        setModifiers(modSnap.docs.map(d => ({id: d.id, ...d.data()})).filter(m => m.isAvailable)); 
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
    if(window.confirm("Remove item?")) setCart(prevCart => prevCart.filter(item => item.cartId !== cartId));
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

  // --- COMBO DETECTION LOGIC ---
  const checkAvailableCombos = () => {
      if (!combos || combos.length === 0 || cart.length === 0) return [];
      const detected = [];
      const cartCounts = {};
      cart.forEach(item => { 
          if (!item.isCombo) { 
              const id = String(item.id); 
              cartCounts[id] = (cartCounts[id] || 0) + item.qty; 
          }
      });
      combos.forEach(combo => {
          if (!combo.isAvailable) return;
          const reqItems = combo.comboItems || [];
          if (reqItems.length === 0) return;
          let isMatch = true;
          for (const req of reqItems) { 
              const reqId = String(req.id);
              if ((cartCounts[reqId] || 0) < req.qty) { isMatch = false; break; }
          }
          if (isMatch) detected.push(combo);
      });
      return detected;
  };

  const applyCombo = (combo) => {
      let newCart = [...cart];
      (combo.comboItems || []).forEach(req => {
          let qtyToRem = req.qty;
          const reqId = String(req.id);
          for (let i = 0; i < newCart.length; i++) {
              if (String(newCart[i].id) === reqId && !newCart[i].isCombo && qtyToRem > 0) {
                  if (newCart[i].qty > qtyToRem) { newCart[i].qty -= qtyToRem; qtyToRem = 0; } 
                  else { qtyToRem -= newCart[i].qty; newCart.splice(i, 1); i--; }
              }
          }
      });
      newCart.push({ 
          id: combo.id, name: combo.name, price: parseFloat(combo.price), qty: 1, isCombo: true, comboItems: combo.comboItems, cartId: Math.random().toString(36).substr(2, 9) 
      });
      setCart(newCart);
  };

  if (loading) return <div style={{padding: 50, textAlign:'center'}}>Loading...</div>;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Menu",
    "name": "MidTown Galleria Menu",
    "mainEntity": items.map(item => ({
      "@type": "MenuItem",
      "name": item.name,
      "description": item.seoDescription,
      "image": item.imageUrl,
      "offers": { "@type": "Offer", "price": item.price, "priceCurrency": "NPR" }
    }))
  };

  return (
    <HelmetProvider>
      <Helmet>
        <title>{selectedItem ? `${selectedItem.name} | MidTown Galleria` : "Menu | MidTown Galleria Pokhara"}</title>
        <meta name="description" content={selectedItem ? selectedItem.seoDescription : "Explore our delicious menu at MidTown Galleria Pokhara."} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', backgroundColor: '#f5f5f5', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
        {!isMobile ? (
            <>
              <CartView cart={cart} initialTableName={initialTableName} initialTableId={initialTableId} handleSendClick={handleSendClick} updateQty={updateQty} removeItem={removeItem} isMobile={false} detectedCombos={checkAvailableCombos()} applyCombo={applyCombo} />
              <MenuView categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} items={items} handleItemClick={handleItemClick} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
              <SidebarView navigate={navigate} isMobile={false} />
            </>
        ) : (
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {mobileTab === 'menu' && <MenuView categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} items={items} handleItemClick={handleItemClick} isMobile={true} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />}
                {mobileTab === 'cart' && <CartView cart={cart} initialTableName={initialTableName} initialTableId={initialTableId} handleSendClick={handleSendClick} updateQty={updateQty} removeItem={removeItem} isMobile={true} detectedCombos={checkAvailableCombos()} applyCombo={applyCombo} />}
                {mobileTab === 'options' && <SidebarView navigate={navigate} isMobile={true} />}
            </div>
        )}

        {isMobile && (
            <div style={{ height: '60px', backgroundColor: 'white', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-around', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, boxShadow:'0 -2px 10px rgba(0,0,0,0.05)' }}>
                <button onClick={() => setMobileTab('menu')} style={{background:'none', border:'none', fontSize:'0.9rem', color: mobileTab==='menu'?'#2c3e50':'#95a5a6'}}>🍔 Menu</button>
                <button onClick={() => setMobileTab('cart')} style={{background:'none', border:'none', fontSize:'0.9rem', color: mobileTab==='cart'?'#2c3e50':'#95a5a6'}}>🛒 Cart ({cart.length})</button>
                <button onClick={() => setMobileTab('options')} style={{background:'none', border:'none', fontSize:'0.9rem', color: mobileTab==='options'?'#2c3e50':'#95a5a6'}}>⚙️ Options</button>
            </div>
        )}

        {/* ITEM MODAL */}
        {isModalOpen && selectedItem && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={{position:'relative'}}>
                  <img src={selectedItem.imageUrl || 'https://via.placeholder.com/300x200'} alt={selectedItem.name} style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                  <div style={{position:'absolute', top:'10px', right:'10px', background:'rgba(255,255,255,0.9)', color:'#2c3e50', padding:'5px 12px', borderRadius:'15px', fontSize:'0.9rem', fontWeight:'bold', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
                      Rs. {selectedItem.price}
                  </div>
              </div>
              
              <div style={{padding:'20px'}}>
                  <h2 style={{margin:'0 0 10px 0', color:'#2c3e50'}}>{selectedItem.name}</h2>

                  {/* COMBO CONTENTS */}
                  {selectedItem.isCombo && selectedItem.comboItems && (
                      <div style={{backgroundColor:'#E3F2FD', padding:'10px', borderRadius:'8px', marginBottom:'15px', textAlign:'left'}}>
                          <h4 style={{margin:'0 0 5px 0', fontSize:'0.9rem', color:'#1565C0'}}>Combo Includes:</h4>
                          <ul style={{margin:0, paddingLeft:'20px', fontSize:'0.85rem', color:'#333'}}>
                              {selectedItem.comboItems.map((c, i) => (
                                  <li key={i}>{c.qty}x {c.name}</li>
                              ))}
                          </ul>
                      </div>
                  )}

                  {/* SEO Note */}
                  {selectedItem.seoDescription && (
                    <div style={{ backgroundColor: '#FFF9C4', padding: '10px', borderRadius: '8px', marginBottom: '15px', borderLeft: '4px solid #FBC02D', textAlign: 'left', fontSize: '0.85rem' }}>
                      <strong>Note:</strong> {selectedItem.seoDescription}
                    </div>
                  )}

                  <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '8px', marginBottom: '20px', textAlign: 'left' }}>
                      {modifiers.map(mod => (
                          <label key={mod.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f9f9f9', cursor: 'pointer' }}>
                              <span><input type="checkbox" onChange={() => toggleExtra(mod)} style={{ marginRight: '10px' }} />{mod.name}</span><span>+Rs.{mod.price}</span>
                          </label>
                      ))}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border:'1px solid #ddd', background:'white', cursor:'pointer', fontWeight:'bold', color:'#555' }}>Cancel</button>
                      <button onClick={confirmAddToCart} style={{ flex: 1, padding: '12px', backgroundColor: '#2c3e50', color: 'white', borderRadius: '8px', border:'none', cursor:'pointer', fontWeight:'bold' }}>Add to Cart</button>
                  </div>
              </div>
            </div>
          </div>
        )}

        {/* TABLE SELECTOR MODAL */}
        {showTableSelector && (
          <div style={{ ...styles.modalOverlay, zIndex: 3000 }}>
            <div style={{ ...styles.modal, width: '90%', maxWidth: '600px', padding:'20px' }}>
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
              <button onClick={() => setShowTableSelector(false)} style={{ marginTop: '20px', width: '100%', padding: '12px', background: '#333', color: 'white', borderRadius: '8px', border:'none', cursor:'pointer' }}>Close</button>
            </div>
          </div>
        )}
      </div>
    </HelmetProvider>
  );
};

export default MenuBoard;