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
    {/* Header */}
    <div style={{ padding: '20px', borderBottom: '1px solid #eee', backgroundColor: '#fff' }}>
      <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#000000' }}>CART</h2>
      <div style={{ fontSize: '0.9rem', color: '#666666' }}>
        Order for: <strong>{initialTableName === 'Walk-in' ? 'Select Table Next ->' : initialTableName}</strong>
      </div>
    </div>

    {/* Combo Detection Banner */}
    {detectedCombos.length > 0 && (
      <div style={{ backgroundColor: '#E8F5E9', padding: '10px', borderBottom: '1px solid #C8E6C9' }}>
        {detectedCombos.map(combo => (
          <div key={combo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
            <span style={{ fontSize: '0.9rem', color: '#2E7D32', fontWeight: 'bold' }}>
              ✨ {combo.name} Detected!
            </span>
            <button 
              onClick={() => applyCombo(combo)}
              style={{ padding: '5px 10px', backgroundColor: '#2E7D32', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
            >
              Apply Deal
            </button>
          </div>
        ))}
      </div>
    )}
    
    {/* Cart Items List */}
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
      {cart.length === 0 && <div style={{padding:20, textAlign:'center', color:'#999'}}>Cart is empty</div>}
      
      {cart.map((item) => (
        <div key={item.cartId} style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px dashed #eee' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom:'5px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', color: '#000000' }}>
                {item.isCombo ? '🎁 ' : ''}{item.name} 
                <span style={{fontSize:'0.8rem', color:'#4CAF50'}}> x{item.qty}</span>
              </div>
              
              {/* Selected Extras */}
              {item.selectedExtras?.map(ex => (
                <div key={ex.id} style={{ fontSize: '0.8rem', color: '#666666' }}>+ {ex.name}</div>
              ))}

              {/* Show Items INSIDE the Combo */}
              {item.isCombo && item.comboItems && (
                <div style={{ marginTop: '4px', paddingLeft: '8px', borderLeft: '2px solid #eee' }}>
                   {item.comboItems.map((subItem, idx) => (
                     <div key={idx} style={{ fontSize: '0.75rem', color: '#555' }}>
                       • {subItem.qty}x {subItem.name}
                     </div>
                   ))}
                </div>
              )}
            </div>

            <div style={{ fontWeight: 'bold', color: '#000000', marginLeft: '10px' }}>
              ${(item.price * item.qty).toFixed(2)}
            </div>
          </div>

          {/* Qty Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={() => updateQty(item.cartId, -1)} style={qtyBtnStyle}>-</button>
            <span style={{ fontSize:'0.9rem', fontWeight:'bold' }}>{item.qty}</span>
            <button onClick={() => updateQty(item.cartId, 1)} style={qtyBtnStyle}>+</button>
            <button onClick={() => removeItem(item.cartId)} style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize:'1rem' }} title="Remove Item">🗑️</button>
          </div>

        </div>
      ))}
    </div>

    {/* Footer / Send Button */}
    <div style={{ padding: '20px', borderTop: '2px solid #333', backgroundColor: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px', color: '#000000' }}>
        <span>Total</span>
        <span>${cart.reduce((acc, item) => acc + (item.price * item.qty), 0).toFixed(2)}</span>
      </div>
      <button 
        onClick={handleSendClick} 
        style={{ width: '100%', padding: '15px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
      >
        {initialTableId === 'Walk-in' ? 'SELECT TABLE & SEND' : 'SEND TO KITCHEN'}
      </button>
    </div>
  </div>
);

// ==========================================
// 2. MENU VIEW COMPONENT
// ==========================================
const MenuView = ({ categories, activeCategory, setActiveCategory, items, handleItemClick, isMobile }) => {
  
  const getFilteredItems = () => {
    if (activeCategory === 'All') return items;
    const currentCat = categories.find(c => c.id === activeCategory);
    const currentCatName = currentCat ? currentCat.name : '';
    return items.filter(item => {
      return item.categoryId === activeCategory || item.categoryId === currentCatName;
    });
  };

  const getCount = (cat) => {
    return items.filter(item => item.categoryId === cat.id || item.categoryId === cat.name).length;
  };

  const filteredItems = getFilteredItems();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: isMobile ? 'calc(100vh - 60px)' : '100vh' }}>
      
      {/* Category Tabs */}
      <div style={{ 
        padding: '15px', backgroundColor: 'white', borderBottom: '1px solid #ddd', 
        display: 'flex', gap: '10px', overflowX: 'auto', whiteSpace: 'nowrap',
        WebkitOverflowScrolling: 'touch' 
      }}>
        <button 
          onClick={() => setActiveCategory('All')}
          style={{ ...catBtnStyle, backgroundColor: activeCategory === 'All' ? 'black' : 'white', color: activeCategory === 'All' ? 'white' : 'black' }}
        >
          All Items ({items.length})
        </button>
        {categories.map(cat => (
           <button 
            key={cat.id} 
            onClick={() => setActiveCategory(cat.id)}
            style={{ ...catBtnStyle, backgroundColor: activeCategory === cat.id ? 'black' : 'white', color: activeCategory === cat.id ? 'white' : 'black' }}
          >
            {cat.name} ({getCount(cat)})
          </button>
        ))}
      </div>

      {/* Grid of Items */}
      <div style={{ 
        flex: 1, padding: '15px', overflowY: 'auto', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
        gap: '15px', alignContent: 'start'
      }}>
        {filteredItems.map(item => (
          <div 
            key={item.id} 
            onClick={() => handleItemClick(item)}
            style={{ 
              backgroundColor: 'white', borderRadius: '12px', padding: '15px', 
              textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', 
              cursor: 'pointer', border: '1px solid #eee',
              display: 'flex', flexDirection: 'column', 
              minHeight: '120px'
            }}
          >
            <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: '#000000' }}>
              {item.isCombo && '🎁 '}{item.name}
            </h4>

            {item.isCombo && item.comboItems && (
              <div style={{ margin: '8px 0', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '6px', textAlign: 'left' }}>
                {item.comboItems.map((sub, i) => (
                  <div key={i} style={{ fontSize: '0.7rem', color: '#666', lineHeight: '1.4' }}>
                    • {sub.qty}x {sub.name}
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontWeight: 'bold', color: '#4CAF50', marginTop: 'auto' }}>
              Rs. {item.price}
            </div>
          </div>
        ))}
        
        {filteredItems.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#888', padding: '20px' }}>
            No items found in this category.
          </div>
        )}
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

  return (
    <div style={{ width: isMobile ? '100%' : '220px', height: isMobile ? 'calc(100vh - 60px)' : '100vh', backgroundColor: '#f8f9fa', borderLeft: isMobile ? 'none' : '1px solid #ddd', padding: '15px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#333', textTransform: 'uppercase', borderBottom:'1px solid #eee', paddingBottom:'10px' }}>Options</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        <button onClick={() => navigate('/tables')} style={{...sidebarBtn, backgroundColor: '#e3f2fd', border: '1px solid #90caf9'}}>🪑 Table Management</button>
        {menuOptions.map((section) => (
          <div key={section.title} style={{ marginBottom: '5px' }}>
            <button onClick={() => toggleSection(section.title)} style={{ ...sidebarBtn, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: openSection === section.title ? '#333' : 'white', color: openSection === section.title ? 'white' : 'black' }}>
              <span>{section.icon} {section.title}</span><span>{openSection === section.title ? '▲' : '▼'}</span>
            </button>
            {openSection === section.title && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px 0 10px 15px', backgroundColor: '#f1f1f1', borderRadius: '0 0 8px 8px' }}>
                {section.subItems.map((item) => (
                  <button key={item.label} onClick={() => navigate(item.path)} style={{ ...sidebarBtn, backgroundColor: 'transparent', boxShadow: 'none', fontSize: '0.85rem', padding: '8px', color: '#555' }}>{item.label}</button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={() => navigate('/')} style={{ ...sidebarBtn, marginTop: '20px', backgroundColor: '#d32f2f', color: 'white' }}>← Dashboard</button>
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

  // State
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [modifiers, setModifiers] = useState([]); 
  const [combos, setCombos] = useState([]); 
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tables & UI State
  const [tables, setTables] = useState([]);
  const [showTableSelector, setShowTableSelector] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); 
  const [selectedExtras, setSelectedExtras] = useState([]); 
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileTab, setMobileTab] = useState('menu'); 

  // --- DATA LOADING ---
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
        
        // --- FIX: Filter Modifiers so only Available ones are shown ---
        const allModifiers = modSnap.docs.map(d => ({id: d.id, ...d.data()}));
        setModifiers(allModifiers.filter(m => m.isAvailable)); 

        setCombos(comboSnap.docs.map(d => ({id: d.id, ...d.data()}))); 
        setLoading(false);
      } catch (error) {
        console.error("Error:", error);
      }
    };
    fetchData();

    // Real-time table listener
    const unsubTables = onSnapshot(collection(db, "tables"), (snapshot) => {
        setTables(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => {
            const numA = parseInt(a.name.replace(/^\D+/g, '')) || 0;
            const numB = parseInt(b.name.replace(/^\D+/g, '')) || 0;
            return numA - numB;
        }));
    });

    return () => {
        window.removeEventListener('resize', handleResize);
        unsubTables();
    };
  }, []);

  // --- COMBO LOGIC (FIXED) ---
  
  // 1. Detect if cart contains ingredients for a combo based on EXACT QUANTITY
  const checkAvailableCombos = () => {
      if (combos.length === 0 || cart.length === 0) return [];
      const detected = [];

      const cartQtyMap = {};
      cart.forEach(item => {
        if(!item.isCombo) {
            cartQtyMap[item.id] = (cartQtyMap[item.id] || 0) + item.qty;
        }
      });

      combos.forEach(combo => {
          if (!combo.isAvailable) return;

          const requiredItems = combo.comboItems || [];
          if (requiredItems.length === 0) return;

          let match = true;
          for (const req of requiredItems) {
              const currentQtyInCart = cartQtyMap[req.id] || 0;
              if (currentQtyInCart < req.qty) {
                  match = false;
                  break; 
              }
          }

          if (match) {
              detected.push(combo);
          }
      });
      return detected;
  };

  // 2. Apply Combo (Remove ingredients, Add Combo Item)
  const applyCombo = (combo) => {
      let newCart = [...cart];
      
      const requiredItems = combo.comboItems || [];

      requiredItems.forEach(req => {
          let qtyToRemove = req.qty;

          for (let i = 0; i < newCart.length; i++) {
              if (newCart[i].id === req.id && !newCart[i].isCombo && qtyToRemove > 0) {
                  
                  if (newCart[i].qty > qtyToRemove) {
                      newCart[i].qty -= qtyToRemove;
                      qtyToRemove = 0;
                  } else {
                      qtyToRemove -= newCart[i].qty;
                      newCart.splice(i, 1);
                      i--; 
                  }
              }
              if (qtyToRemove === 0) break; 
          }
      });

      // Add Combo Item
      const comboItem = {
          id: combo.id, 
          name: combo.name,
          price: parseFloat(combo.price),
          qty: 1,
          isCombo: true, 
          comboItems: combo.comboItems || [], 
          cartId: Math.random().toString(36).substr(2, 9)
      };

      newCart.push(comboItem);
      setCart(newCart);
      alert(`${combo.name} Applied!`);
  };

  const detectedCombos = checkAvailableCombos();

  // --- CART HANDLERS ---
  const handleItemClick = (item) => {
    setSelectedItem(item);
    setSelectedExtras([]); 
    setIsModalOpen(true); 
  };

  const toggleExtra = (extra) => {
    if (selectedExtras.find(e => e.id === extra.id)) {
      setSelectedExtras(selectedExtras.filter(e => e.id !== extra.id));
    } else {
      setSelectedExtras([...selectedExtras, extra]);
    }
  };

  const confirmAddToCart = () => {
    const extrasTotal = selectedExtras.reduce((sum, ex) => sum + ex.price, 0);
    const newExtrasIds = selectedExtras.map(e => e.id).sort().join(',');

    const newItem = {
      ...selectedItem,
      price: selectedItem.price + extrasTotal,
      selectedExtras: selectedExtras, 
      qty: 1
    };

    const existingItemIndex = cart.findIndex(item => {
        const itemExtrasIds = item.selectedExtras ? item.selectedExtras.map(e => e.id).sort().join(',') : '';
        return item.id === newItem.id && itemExtrasIds === newExtrasIds;
    });

    if (existingItemIndex !== -1) {
        const updatedCart = [...cart];
        updatedCart[existingItemIndex].qty += 1;
        setCart(updatedCart);
        if(isMobile) alert("Quantity Updated!"); 
    } else {
        newItem.cartId = Math.random().toString(36).substr(2, 9);
        setCart([...cart, newItem]);
        if(isMobile) alert("Added to Cart!"); 
    }
    setIsModalOpen(false); 
  };

  const handleUpdateQty = (cartId, delta) => {
      setCart(prevCart => {
          return prevCart.map(item => {
              if (item.cartId === cartId) {
                  return { ...item, qty: item.qty + delta };
              }
              return item;
          }).filter(item => item.qty > 0); 
      });
  };

  const handleRemoveItem = (cartId) => {
      if(window.confirm("Remove this item from cart?")) {
          setCart(prevCart => prevCart.filter(item => item.cartId !== cartId));
      }
  };

  const handleSendClick = () => {
      if (cart.length === 0) return alert("Cart is empty!");
      if (initialTableId !== 'Walk-in') {
          if(window.confirm(`Send order for ${initialTableName}?`)) {
              finalizeOrder(initialTableId, initialTableName);
          }
      } else {
          setShowTableSelector(true);
      }
  };

  const handleSelectTable = (table) => {
      if(window.confirm(`Assign order to ${table.name} and send to kitchen?`)) {
          finalizeOrder(table.id, table.name);
      }
  };

  const finalizeOrder = async (tId, tName) => {
    try {
      const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
      await addDoc(collection(db, "orders"), {
        items: cart, // This now includes comboItems array if it's a combo
        totalAmount,
        status: "PENDING",
        createdAt: serverTimestamp(),
        tableId: tName, 
        tableDocId: tId 
      });
      await updateDoc(doc(db, "tables", tId), { status: "Occupied", guests: 4 });
      alert(`Order Sent to Kitchen for ${tName}!`);
      navigate('/tables'); 
    } catch (error) {
      console.error(error);
      alert("Error sending order");
    }
  };

  if (loading) return <div style={{padding: 20, color: 'black'}}>Loading Menu...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', backgroundColor: '#f5f5f5', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
      
      {/* DESKTOP VIEW */}
      {!isMobile && (
          <>
            <CartView 
                cart={cart} 
                initialTableName={initialTableName} 
                initialTableId={initialTableId} 
                handleSendClick={handleSendClick} 
                updateQty={handleUpdateQty} 
                removeItem={handleRemoveItem} 
                isMobile={false} 
                detectedCombos={detectedCombos} 
                applyCombo={applyCombo} 
            />
            <MenuView categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} items={items} handleItemClick={handleItemClick} isMobile={false} />
            <SidebarView navigate={navigate} isMobile={false} />
          </>
      )}

      {/* MOBILE VIEW */}
      {isMobile && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
              {mobileTab === 'menu' && <MenuView categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} items={items} handleItemClick={handleItemClick} isMobile={true} />}
              {mobileTab === 'cart' && (
                <CartView 
                    cart={cart} 
                    initialTableName={initialTableName} 
                    initialTableId={initialTableId} 
                    handleSendClick={handleSendClick} 
                    updateQty={handleUpdateQty} 
                    removeItem={handleRemoveItem} 
                    isMobile={true} 
                    detectedCombos={detectedCombos} 
                    applyCombo={applyCombo}
                />
              )}
              {mobileTab === 'options' && <SidebarView navigate={navigate} isMobile={true} />}
          </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      {isMobile && (
          <div style={{ height: '60px', backgroundColor: 'white', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-around', alignItems: 'center', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }}>
              <button onClick={() => setMobileTab('menu')} style={{ ...mobileNavBtn, color: mobileTab === 'menu' ? 'black' : '#888' }}><span>🍔</span><span style={{fontSize:'0.7rem'}}>Menu</span></button>
              <button onClick={() => setMobileTab('cart')} style={{ ...mobileNavBtn, color: mobileTab === 'cart' ? 'black' : '#888', position: 'relative' }}><span>🛒</span><span style={{fontSize:'0.7rem'}}>Cart</span>{cart.length > 0 && <span style={{position:'absolute', top:5, right:20, background:'red', color:'white', borderRadius:'50%', width:'15px', height:'15px', fontSize:'0.6rem', display:'flex', alignItems:'center', justifyContent:'center'}}>{cart.length}</span>}</button>
              <button onClick={() => setMobileTab('options')} style={{ ...mobileNavBtn, color: mobileTab === 'options' ? 'black' : '#888' }}><span>⚙️</span><span style={{fontSize:'0.7rem'}}>Options</span></button>
          </div>
      )}

      {/* MODAL: ITEM DETAILS */}
      {isModalOpen && selectedItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '400px', color: '#000000' }}>
            <h2 style={{ marginTop: 0, color: '#000000' }}>{selectedItem.name}</h2>
            <p style={{color: '#666'}}>Base Price: ${selectedItem.price.toFixed(2)}</p>
            
            {/* Show contents in modal if combo */}
            {selectedItem.isCombo && selectedItem.comboItems && (
                <div style={{background:'#f9f9f9', padding:10, borderRadius:6, marginBottom:10}}>
                    <strong style={{fontSize:'0.8rem'}}>Includes:</strong>
                    {selectedItem.comboItems.map((c,i)=>(<div key={i} style={{fontSize:'0.8rem'}}>• {c.qty}x {c.name}</div>))}
                </div>
            )}

            <h4 style={{ marginBottom: '10px', color: '#000000' }}>Extras:</h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>
                {/* --- FIX: Only render Available Modifiers --- */}
                {modifiers.map(mod => (
                    <label key={mod.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f9f9f9', cursor: 'pointer', color: '#000000' }}>
                        <span><input type="checkbox" onChange={() => toggleExtra(mod)} style={{ marginRight: '10px' }} />{mod.name}</span><span style={{ fontWeight: 'bold' }}>+${mod.price}</span>
                    </label>
                ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', border: '1px solid #ddd', backgroundColor: 'white', color: 'black', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={confirmAddToCart} style={{ flex: 1, padding: '12px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TABLE SELECTOR */}
      {showTableSelector && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
            <div style={{ backgroundColor: 'white', borderRadius: isMobile ? '0' : '12px', width: isMobile ? '100%' : '600px', height: isMobile ? '100%' : 'auto', maxHeight: isMobile ? '100%' : '90vh', maxWidth: '100%', padding: '20px', display:'flex', flexDirection:'column' }}>
                <h2 style={{marginTop: isMobile ? '20px' : 0, marginBottom: '20px', textAlign:'center'}}>Select Table</h2>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(120px, 1fr))', gap: '15px', overflowY:'auto', flex:1, padding: '5px' }}>
                    {tables.map(table => (
                        <button key={table.id} disabled={table.status === 'Not Available'} onClick={() => handleSelectTable(table)} style={{ padding: '15px', border: '2px solid #eee', borderRadius: '8px', backgroundColor: table.status === 'Available' ? '#E8F5E9' : (table.status === 'Occupied' ? '#FFEBEE' : '#f0f0f0'), color: table.status === 'Not Available' ? '#aaa' : 'black', cursor: table.status === 'Not Available' ? 'not-allowed' : 'pointer', fontSize: '1.1rem', fontWeight: 'bold', minHeight: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span>{table.name}</span><span style={{fontSize:'0.7rem', fontWeight:'normal', marginTop:'5px'}}>{table.status}</span>
                        </button>
                    ))}
                </div>
                <button onClick={() => setShowTableSelector(false)} style={{ marginTop: '20px', padding: '15px', background: '#333', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>Cancel</button>
            </div>
        </div>
      )}

    </div>
  );
};

// ==========================================
// 5. STYLES (Helpers)
// ==========================================
const sidebarBtn = { padding: '15px', border: 'none', backgroundColor: 'white', color: '#000000', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };
const mobileNavBtn = { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '10px' };
const qtyBtnStyle = { width:'25px', height:'25px', borderRadius:'50%', border:'1px solid #ddd', background:'white', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' };
const catBtnStyle = { padding: '8px 16px', borderRadius: '20px', border: '1px solid #ddd', cursor: 'pointer', flexShrink: 0 };

export default MenuBoard;