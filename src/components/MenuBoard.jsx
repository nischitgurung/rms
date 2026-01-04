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
  qtyBtn: { width:'30px', height:'30px', borderRadius:'50%', border:'1px solid #ddd', cursor:'pointer', background:'white', fontWeight:'bold' },
  catBtn: { padding: '10px 20px', borderRadius: '25px', border: '1px solid #ddd', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: '500' },
  // Updated Item Card for Images
  itemCard: { 
    backgroundColor: 'white', 
    borderRadius: '12px', 
    cursor: 'pointer', 
    border: '1px solid #eee', 
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    overflow: 'hidden', // Ensures image corners follow border radius
    display: 'flex',
    flexDirection: 'column'
  },
  itemImage: {
    width: '100%',
    height: '120px',
    objectFit: 'cover', // Ensures image fills the space without stretching
    backgroundColor: '#f0f0f0'
  },
  itemInfo: {
    padding: '10px',
    textAlign: 'center'
  },
  sendBtn: { width: '100%', padding: '18px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  modal: { backgroundColor: 'white', padding: '30px', borderRadius: '15px', width: '350px', textAlign: 'center' },
  searchInput: { width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '10px', fontSize: '1rem', outline: 'none' }
};

// ==========================================
// 1. CART VIEW COMPONENT
// ==========================================
const CartView = ({ 
  cart, 
  initialTableName, 
  initialTableId, 
  handleSendClick, 
  updateQty, 
  removeItem, 
  isMobile, 
  detectedCombos, 
  applyCombo 
}) => (
  <div style={{ 
    width: isMobile ? '100%' : '320px', 
    height: isMobile ? 'calc(100vh - 60px)' : '100vh',
    backgroundColor: 'white', 
    borderRight: isMobile ? 'none' : '1px solid #ddd', 
    display: 'flex', flexDirection: 'column' 
  }}>
    <div style={{ padding: '20px', borderBottom: '1px solid #eee', backgroundColor: '#fff' }}>
      <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#000000' }}>CART</h2>
      <div style={{ fontSize: '0.9rem', color: '#666666' }}>
        Order for: <strong>{initialTableName === 'Walk-in' ? 'Unassigned (Walk-in)' : initialTableName}</strong>
      </div>
    </div>

    {detectedCombos.length > 0 && (
      <div style={{ backgroundColor: '#E8F5E9', padding: '10px', borderBottom: '1px solid #C8E6C9' }}>
        {detectedCombos.map(combo => (
          <div key={combo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{ fontSize: '0.85rem', color: '#2E7D32', fontWeight: 'bold' }}>✨ {combo.name} Detected!</span>
            <button onClick={() => applyCombo(combo)} style={{ padding: '4px 8px', backgroundColor: '#2E7D32', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Apply</button>
          </div>
        ))}
      </div>
    )}
    
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
      {cart.length === 0 && <div style={{padding:20, textAlign:'center', color:'#999'}}>Cart is empty</div>}
      {cart.map((item) => (
        <div key={item.cartId} style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #f9f9f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom:'5px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', color: '#000000' }}>
                {item.isCombo ? '🎁 ' : ''}{item.name} 
                <span style={{fontSize:'0.8rem', color:'#4CAF50'}}> x{item.qty}</span>
              </div>
              {item.selectedExtras?.map(ex => (
                <div key={ex.id} style={{ fontSize: '0.8rem', color: '#666666' }}>+ {ex.name}</div>
              ))}
            </div>
            <div style={{ fontWeight: 'bold', color: '#000000', marginLeft: '10px' }}>
              Rs. {(item.price * item.qty).toFixed(2)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={() => updateQty(item.cartId, -1)} style={styles.qtyBtn}>-</button>
            <span style={{ fontSize:'0.9rem', fontWeight:'bold' }}>{item.qty}</span>
            <button onClick={() => updateQty(item.cartId, 1)} style={styles.qtyBtn}>+</button>
            <button onClick={() => removeItem(item.cartId)} style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize:'1rem' }}>🗑️</button>
          </div>
        </div>
      ))}
    </div>

    <div style={{ padding: '20px', borderTop: '2px solid #333', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px' }}>
        <span>Total</span>
        <span>Rs. {cart.reduce((acc, item) => acc + (item.price * item.qty), 0).toFixed(2)}</span>
      </div>
      <button onClick={handleSendClick} style={styles.sendBtn}>
        {initialTableId === 'Walk-in' ? 'SELECT TABLE & SEND' : 'SEND TO KITCHEN'}
      </button>
    </div>
  </div>
);

// ==========================================
// 2. MENU VIEW COMPONENT (Includes Search Bar)
// ==========================================
const MenuView = ({ categories, activeCategory, setActiveCategory, items, handleItemClick, isMobile, searchTerm, setSearchTerm }) => {
  // Filtering logic based on Category AND Search Term (matches Name or SEO Title alias)
  const filteredItems = items.filter(item => {
    const matchesCategory = activeCategory === 'All' || item.categoryId === activeCategory;
    const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (item.seoTitle && item.seoTitle.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: isMobile ? 'calc(100vh - 60px)' : '100vh' }}>
      <div style={{ padding: '15px', backgroundColor: 'white', borderBottom: '1px solid #ddd' }}>
        {/* WAITER SEARCH BAR */}
        <input 
          type="text"
          placeholder="🔍 Search food by name or nickname..."
          style={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
          <button 
            onClick={() => setActiveCategory('All')} 
            style={{ ...styles.catBtn, backgroundColor: activeCategory === 'All' ? 'black' : 'white', color: activeCategory === 'All' ? 'white' : 'black' }}
          >
            All Items
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
      
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '20px' }}>
        {filteredItems.map(item => (
          <div key={item.id} onClick={() => handleItemClick(item)} style={styles.itemCard}>
            <img 
              src={item.imageUrl || 'https://via.placeholder.com/150?text=No+Image'} 
              alt={item.name} 
              style={styles.itemImage} 
            />
            <div style={styles.itemInfo}>
              <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem' }}>{item.isCombo && '🎁 '}{item.name}</h4>
              <div style={{ fontWeight: 'bold', color: '#4CAF50' }}>Rs. {item.price}</div>
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
    <div style={{ width: isMobile ? '100%' : '220px', height: isMobile ? 'calc(100vh - 60px)' : '100vh', backgroundColor: '#f8f9fa', borderLeft: isMobile ? 'none' : '1px solid #ddd', padding: '15px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', textTransform: 'uppercase' }}>Options</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={() => navigate('/tables')} style={{...sidebarBtn, backgroundColor: '#e3f2fd'}}>🪑 Tables</button>
        {menuOptions.map((section) => (
          <div key={section.title}>
            <button onClick={() => toggleSection(section.title)} style={sidebarBtn}>
              <span>{section.icon} {section.title}</span><span>{openSection === section.title ? '▲' : '▼'}</span>
            </button>
            {openSection === section.title && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px 15px', backgroundColor: '#f1f1f1', borderRadius: '8px' }}>
                {section.subItems.map((item) => (
                  <button key={item.label} onClick={() => navigate(item.path)} style={{ border:'none', background:'none', textAlign:'left', padding:'8px', fontSize:'0.85rem', cursor:'pointer' }}>{item.label}</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={() => navigate('/')} style={{ ...sidebarBtn, marginTop: 'auto', backgroundColor: '#d32f2f', color: 'white' }}>Dashboard</button>
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
  const [suppliers, setSuppliers] = useState([]);
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
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setTables(data.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })));
    });

    onSnapshot(collection(db, "inventory"), (snap) => setInventoryItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    onSnapshot(collection(db, "suppliers"), (snap) => setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const triggerLowStockAlert = (stockItem, currentQty) => {
    const supplier = suppliers.find(s => s.id === stockItem.supplierId);
    if (supplier && supplier.email) {
      const templateParams = {
        to_email: supplier.email, vendor_name: supplier.name, item_name: stockItem.itemName, current_qty: currentQty.toFixed(2), unit: stockItem.unit
      };
      emailjs.send("service_lt5byrp", "template_oy39nmc", templateParams, "q6gnSNf0gppPaEkI3")
        .then(() => console.log(`Email alert sent to ${supplier.name}`))
        .catch(err => console.error("Email failed", err));
    }
  };

  const finalizeOrder = async (tId, tName) => {
    if (cart.length === 0) return alert("Cart is empty");
    try {
      const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

      await addDoc(collection(db, "transactions"), {
        type: "INCOME", amount: totalAmount, date: new Date(), table: tName, paymentMethod: "Pending", createdAt: serverTimestamp()
      });

      await addDoc(collection(db, "orders"), {
        items: cart, totalAmount, status: "PENDING", tableId: tName, tableDocId: tId, createdAt: serverTimestamp()
      });

      if(tId && tId !== 'Walk-in') {
        await updateDoc(doc(db, "tables", tId), { status: "Occupied" });
      }

      for (const cartItem of cart) {
        const menuItem = items.find(m => m.id === cartItem.id);
        if (menuItem?.recipe) {
          for (const ingredient of menuItem.recipe) {
            const totalUsed = parseFloat(ingredient.qty) * cartItem.qty;
            const liveStockItem = inventoryItems.find(s => s.id === ingredient.stockId);
            if (liveStockItem) {
              const newQty = parseFloat(liveStockItem.quantity) - totalUsed;
              await updateDoc(doc(db, "inventory", ingredient.stockId), { quantity: newQty, updatedAt: serverTimestamp() });
              if (newQty <= (parseFloat(liveStockItem.minStock) || 0)) {
                triggerLowStockAlert(liveStockItem, newQty);
              }
            }
          }
        }
      }
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
    setCart(prevCart => {
      const updatedCart = prevCart.map(item => {
        if (item.cartId === cartId) return { ...item, qty: item.qty + delta };
        return item;
      });
      return updatedCart.filter(item => item.qty > 0);
    });
  };

  const removeItem = (cartId) => {
    if(window.confirm("Remove this item?")) setCart(prevCart => prevCart.filter(item => item.cartId !== cartId));
  };

  const handleSendClick = () => {
    if (cart.length === 0) return alert("Cart empty");
    if (initialTableId === 'Walk-in') {
      setShowTableSelector(true);
    } else {
      finalizeOrder(initialTableId, initialTableName);
    }
  };

  const handleSelectTableFromModal = (table) => {
    finalizeOrder(table.id, table.name);
    setShowTableSelector(false);
  };

  const checkAvailableCombos = () => {
      if (combos.length === 0 || cart.length === 0) return [];
      const detected = [];
      const cartQtyMap = {};
      cart.forEach(item => { if(!item.isCombo) cartQtyMap[item.id] = (cartQtyMap[item.id] || 0) + item.qty; });
      combos.forEach(combo => {
          if (!combo.isAvailable) return;
          const reqItems = combo.comboItems || [];
          let match = reqItems.length > 0;
          for (const req of reqItems) { if ((cartQtyMap[req.id] || 0) < req.qty) match = false; }
          if (match) detected.push(combo);
      });
      return detected;
  };

  const applyCombo = (combo) => {
      let newCart = [...cart];
      (combo.comboItems || []).forEach(req => {
          let qtyToRem = req.qty;
          for (let i = 0; i < newCart.length; i++) {
              if (newCart[i].id === req.id && !newCart[i].isCombo && qtyToRem > 0) {
                  if (newCart[i].qty > qtyToRem) { newCart[i].qty -= qtyToRem; qtyToRem = 0; }
                  else { qtyToRem -= newCart[i].qty; newCart.splice(i, 1); i--; }
              }
          }
      });
      newCart.push({ id: combo.id, name: combo.name, price: parseFloat(combo.price), qty: 1, isCombo: true, cartId: Math.random().toString(36).substr(2, 9) });
      setCart(newCart);
  };

  if (loading) return <div style={{padding: 50, textAlign:'center'}}>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', backgroundColor: '#f5f5f5', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
      {!isMobile ? (
          <>
            <CartView cart={cart} initialTableName={initialTableName} initialTableId={initialTableId} handleSendClick={handleSendClick} updateQty={updateQty} removeItem={removeItem} isMobile={false} detectedCombos={checkAvailableCombos()} applyCombo={applyCombo} />
            <MenuView 
              categories={categories} 
              activeCategory={activeCategory} 
              setActiveCategory={setActiveCategory} 
              items={items} 
              handleItemClick={handleItemClick}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm} 
            />
            <SidebarView navigate={navigate} isMobile={false} />
          </>
      ) : (
          <div style={{ flex: 1, overflow: 'hidden' }}>
              {mobileTab === 'menu' && 
                <MenuView 
                  categories={categories} 
                  activeCategory={activeCategory} 
                  setActiveCategory={setActiveCategory} 
                  items={items} 
                  handleItemClick={handleItemClick} 
                  isMobile={true} 
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                />
              }
              {mobileTab === 'cart' && <CartView cart={cart} initialTableName={initialTableName} initialTableId={initialTableId} handleSendClick={handleSendClick} updateQty={updateQty} removeItem={removeItem} isMobile={true} detectedCombos={checkAvailableCombos()} applyCombo={applyCombo} />}
              {mobileTab === 'options' && <SidebarView navigate={navigate} isMobile={true} />}
          </div>
      )}

      {isMobile && (
          <div style={{ height: '60px', backgroundColor: 'white', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-around', position: 'fixed', bottom: 0, left: 0, right: 0 }}>
              <button onClick={() => setMobileTab('menu')} style={{background:'none', border:'none', color: mobileTab==='menu'?'black':'#888'}}>🍔 Menu</button>
              <button onClick={() => setMobileTab('cart')} style={{background:'none', border:'none', color: mobileTab==='cart'?'black':'#888'}}>🛒 Cart ({cart.length})</button>
              <button onClick={() => setMobileTab('options')} style={{background:'none', border:'none', color: mobileTab==='options'?'black':'#888'}}>⚙️ Options</button>
          </div>
      )}

      {/* ITEM MODAL */}
      {isModalOpen && selectedItem && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <img 
              src={selectedItem.imageUrl || 'https://via.placeholder.com/150'} 
              alt={selectedItem.name} 
              style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '10px', marginBottom: '15px' }} 
            />
            <h2 style={{marginTop:0}}>{selectedItem.name}</h2>

            {/* ADDED: Internal Staff Notes (SEO Description) */}
            {selectedItem.seoDescription && (
              <div style={{ backgroundColor: '#FFF9C4', padding: '12px', borderRadius: '8px', marginBottom: '15px', borderLeft: '4px solid #FBC02D', textAlign: 'left', fontSize: '0.85rem' }}>
                <strong>💡 Note:</strong> {selectedItem.seoDescription}
              </div>
            )}

            {/* ADDED: Plating Guide (Alt Text) */}
            {selectedItem.altText && (
              <div style={{ fontSize: '0.8rem', color: '#555', fontStyle: 'italic', marginBottom: '15px', textAlign: 'left', padding: '8px', borderLeft: '3px solid #ccc', backgroundColor: '#f9f9f9' }}>
                <strong>👨‍Chef's Guide:</strong> {selectedItem.altText}
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
                <button onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '6px' }}>Cancel</button>
                <button onClick={confirmAddToCart} style={{ flex: 1, padding: '12px', backgroundColor: 'black', color: 'white', borderRadius: '6px' }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* TABLE SELECTOR MODAL */}
      {showTableSelector && (
        <div style={{ ...styles.modalOverlay, zIndex: 3000 }}>
          <div style={{ ...styles.modal, width: '90%', maxWidth: '600px' }}>
            <h2 style={{marginTop:0}}>Assign Table to Order</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '15px', maxHeight: '60vh', overflowY: 'auto', padding:'10px' }}>
                {tables.map(table => (
                    <button 
                      key={table.id} 
                      disabled={table.status === 'Not Available'} 
                      onClick={() => handleSelectTableFromModal(table)} 
                      style={{ padding: '15px', borderRadius: '8px', border: '1px solid #ddd', backgroundColor: table.status === 'Available' ? '#E8F5E9' : (table.status === 'Occupied' ? '#FFEBEE' : '#f0f0f0'), fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        {table.name}<br/><small>{table.status}</small>
                    </button>
                ))}
            </div>
            <button onClick={() => setShowTableSelector(false)} style={{ marginTop: '20px', width: '100%', padding: '15px', background: '#333', color: 'white', borderRadius: '6px', border:'none', cursor:'pointer' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuBoard;