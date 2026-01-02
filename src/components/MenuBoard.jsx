import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';

// --- SUB-COMPONENTS ---

const CartView = ({ cart, initialTableName, initialTableId, handleSendClick, isMobile }) => (
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
                Order for: <strong>{initialTableName === 'Walk-in' ? 'Select Table Next ->' : initialTableName}</strong>
            </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {cart.length === 0 && <div style={{padding:20, textAlign:'center', color:'#999'}}>Cart is empty</div>}
            {cart.map((item) => (
                <div key={item.cartId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px dashed #eee' }}>
                    <div>
                        <div style={{ fontWeight: 'bold', color: '#000000' }}>{item.name}</div>
                        {item.selectedExtras?.map(ex => (
                            <div key={ex.id} style={{ fontSize: '0.8rem', color: '#666666' }}>+ {ex.name}</div>
                        ))}
                    </div>
                    <div style={{ fontWeight: 'bold', color: '#000000' }}>${item.price.toFixed(2)}</div>
                </div>
            ))}
        </div>

        <div style={{ padding: '20px', borderTop: '2px solid #333', backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px', color: '#000000' }}>
                <span>Total</span>
                <span>${cart.reduce((acc, item) => acc + item.price, 0).toFixed(2)}</span>
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

const MenuView = ({ categories, activeCategory, setActiveCategory, items, handleItemClick, isMobile }) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: isMobile ? 'calc(100vh - 60px)' : '100vh' }}>
        {/* Categories */}
        <div style={{ 
            padding: '15px', backgroundColor: 'white', borderBottom: '1px solid #ddd', 
            display: 'flex', gap: '10px', overflowX: 'auto', whiteSpace: 'nowrap',
            WebkitOverflowScrolling: 'touch' 
        }}>
            <button 
                onClick={() => setActiveCategory('All')}
                style={{ 
                    padding: '8px 16px', borderRadius: '20px', border: '1px solid #ddd',
                    backgroundColor: activeCategory === 'All' ? 'black' : 'white',
                    color: activeCategory === 'All' ? 'white' : 'black',
                    cursor: 'pointer', flexShrink: 0
                }}
            >
                All Items
            </button>
            {categories.map(cat => (
                 <button 
                    key={cat.id} 
                    onClick={() => setActiveCategory(cat.id)}
                    style={{ 
                        padding: '8px 16px', borderRadius: '20px', border: '1px solid #ddd',
                        backgroundColor: activeCategory === cat.id ? 'black' : 'white',
                        color: activeCategory === cat.id ? 'white' : 'black',
                        cursor: 'pointer', flexShrink: 0
                    }}
                >
                    {cat.name}
                </button>
            ))}
        </div>

        {/* Items */}
        <div style={{ 
            flex: 1, padding: '15px', overflowY: 'auto', 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
            gap: '15px', alignContent: 'start'
        }}>
            {(activeCategory === 'All' ? items : items.filter(i => i.categoryId === activeCategory)).map(item => (
                <div 
                    key={item.id} 
                    onClick={() => handleItemClick(item)}
                    style={{ 
                        backgroundColor: 'white', borderRadius: '12px', padding: '15px', 
                        textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', 
                        cursor: 'pointer', border: '1px solid #eee',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                        minHeight: '100px'
                    }}
                >
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: '#000000' }}>{item.name}</h4>
                    <div style={{ fontWeight: 'bold', color: '#4CAF50', marginTop: 'auto' }}>${item.price}</div>
                </div>
            ))}
        </div>
    </div>
);

// --- NEW DROPDOWN SIDEBAR COMPONENT ---
const SidebarView = ({ navigate, isMobile }) => {
    // State to track which section is open
    const [openSection, setOpenSection] = useState(null);

    const toggleSection = (sectionName) => {
        setOpenSection(openSection === sectionName ? null : sectionName);
    };

    // Data Structure for the Menu
    const menuOptions = [
        {
            title: "1. Menu",
            icon: "🍔",
            subItems: [
                { label: "a. Dishes", path: "/admin-menu" },
                { label: "b. Category", path: "/admin-category" },
                { label: "c. Combo Offer", path: "/admin-combos" },
                { label: "d. Add On & Extras", path: "/admin-addons" }
            ]
        },
        {
            title: "2. Finance",
            icon: "💰",
            subItems: [
                { label: "a. Daybook", path: "/finance-daybook" },
                { label: "b. Transactions", path: "/finance-transactions" },
                { label: "c. Sales & Purchases", path: "/finance-sales" },
                { label: "d. Income & Expenses", path: "/finance-income" }
            ]
        },
        {
            title: "3. Inventory",
            icon: "📦",
            subItems: [
                { label: "a. Stock Items", path: "/inventory-stock" },
                { label: "b. Consumption", path: "/inventory-consumption" },
                { label: "c. Suppliers", path: "/inventory-suppliers" },
                { label: "d. Stock Group Page", path: "/inventory-groups" }
            ]
        }
    ];

    return (
        <div style={{ 
            width: isMobile ? '100%' : '220px', 
            height: isMobile ? 'calc(100vh - 60px)' : '100vh',
            backgroundColor: '#f8f9fa', 
            borderLeft: isMobile ? 'none' : '1px solid #ddd', 
            padding: '15px', 
            display: 'flex', 
            flexDirection: 'column',
            overflowY: 'auto'
        }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#333', textTransform: 'uppercase', borderBottom:'1px solid #eee', paddingBottom:'10px' }}>Options</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                
                {/* Always Visible Core Link */}
                <button onClick={() => navigate('/tables')} style={{...sidebarBtn, backgroundColor: '#e3f2fd', border: '1px solid #90caf9'}}>
                    🪑 Table Management
                </button>

                {/* Render Dropdowns */}
                {menuOptions.map((section) => (
                    <div key={section.title} style={{ marginBottom: '5px' }}>
                        <button 
                            onClick={() => toggleSection(section.title)} 
                            style={{
                                ...sidebarBtn, 
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                backgroundColor: openSection === section.title ? '#333' : 'white',
                                color: openSection === section.title ? 'white' : 'black'
                            }}
                        >
                            <span>{section.icon} {section.title}</span>
                            <span>{openSection === section.title ? '▲' : '▼'}</span>
                        </button>
                        
                        {/* Sub Items Container */}
                        {openSection === section.title && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px 0 10px 15px', backgroundColor: '#f1f1f1', borderRadius: '0 0 8px 8px' }}>
                                {section.subItems.map((item) => (
                                    <button 
                                        key={item.label} 
                                        onClick={() => navigate(item.path)}
                                        style={{
                                            ...sidebarBtn,
                                            backgroundColor: 'transparent',
                                            boxShadow: 'none',
                                            fontSize: '0.85rem',
                                            padding: '8px',
                                            color: '#555'
                                        }}
                                        onMouseEnter={(e) => e.target.style.color = '#000'}
                                        onMouseLeave={(e) => e.target.style.color = '#555'}
                                    >
                                        {item.label}
                                    </button>
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

// --- MAIN COMPONENT ---

const MenuBoard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tableId: initialTableId, tableName: initialTableName } = location.state || { tableId: 'Walk-in', tableName: 'Walk-in' };

  // --- STATE ---
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [modifiers, setModifiers] = useState([]); 
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tables State
  const [tables, setTables] = useState([]);
  const [showTableSelector, setShowTableSelector] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); 
  const [selectedExtras, setSelectedExtras] = useState([]); 

  // --- UI STATE FOR MOBILE ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [mobileTab, setMobileTab] = useState('menu'); // 'menu', 'cart', 'options'

  // --- DATA FETCHING ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);

    const fetchData = async () => {
      try {
        const catSnap = await getDocs(collection(db, "categories"));
        const itemSnap = await getDocs(collection(db, "menu_items"));
        const modSnap = await getDocs(collection(db, "modifiers"));

        setCategories(catSnap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => a.sortOrder - b.sortOrder));
        setItems(itemSnap.docs.map(d => ({id: d.id, ...d.data()})));
        setModifiers(modSnap.docs.map(d => ({id: d.id, ...d.data()})));
        setLoading(false);
      } catch (error) {
        console.error("Error:", error);
      }
    };
    fetchData();

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

  // --- HANDLERS ---
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
    const cartItem = {
      ...selectedItem,
      cartId: Math.random().toString(36).substr(2, 9), 
      price: selectedItem.price + extrasTotal,
      selectedExtras: selectedExtras, 
      qty: 1
    };
    setCart([...cart, cartItem]);
    setIsModalOpen(false); 
    if(isMobile) alert("Added to Cart!"); 
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
        items: cart,
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
      
      {/* DESKTOP LAYOUT */}
      {!isMobile && (
          <>
            <CartView cart={cart} initialTableName={initialTableName} initialTableId={initialTableId} handleSendClick={handleSendClick} isMobile={false} />
            <MenuView categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} items={items} handleItemClick={handleItemClick} isMobile={false} />
            <SidebarView navigate={navigate} isMobile={false} />
          </>
      )}

      {/* MOBILE LAYOUT */}
      {isMobile && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
              {mobileTab === 'menu' && <MenuView categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} items={items} handleItemClick={handleItemClick} isMobile={true} />}
              {mobileTab === 'cart' && <CartView cart={cart} initialTableName={initialTableName} initialTableId={initialTableId} handleSendClick={handleSendClick} isMobile={true} />}
              {mobileTab === 'options' && <SidebarView navigate={navigate} isMobile={true} />}
          </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION */}
      {isMobile && (
          <div style={{ 
              height: '60px', backgroundColor: 'white', borderTop: '1px solid #ddd', 
              display: 'flex', justifyContent: 'space-around', alignItems: 'center',
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000
          }}>
              <button onClick={() => setMobileTab('menu')} style={{ ...mobileNavBtn, color: mobileTab === 'menu' ? 'black' : '#888' }}>
                  <span>🍔</span>
                  <span style={{fontSize:'0.7rem'}}>Menu</span>
              </button>
              <button onClick={() => setMobileTab('cart')} style={{ ...mobileNavBtn, color: mobileTab === 'cart' ? 'black' : '#888', position: 'relative' }}>
                  <span>🛒</span>
                  <span style={{fontSize:'0.7rem'}}>Cart</span>
                  {cart.length > 0 && <span style={{position:'absolute', top:5, right:20, background:'red', color:'white', borderRadius:'50%', width:'15px', height:'15px', fontSize:'0.6rem', display:'flex', alignItems:'center', justifyContent:'center'}}>{cart.length}</span>}
              </button>
              <button onClick={() => setMobileTab('options')} style={{ ...mobileNavBtn, color: mobileTab === 'options' ? 'black' : '#888' }}>
                  <span>⚙️</span>
                  <span style={{fontSize:'0.7rem'}}>Options</span>
              </button>
          </div>
      )}

      {/* --- MODAL 1: ADD ITEM EXTRAS --- */}
      {isModalOpen && selectedItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '400px', color: '#000000' }}>
            <h2 style={{ marginTop: 0, color: '#000000' }}>{selectedItem.name}</h2>
            <p style={{color: '#666'}}>Base Price: ${selectedItem.price.toFixed(2)}</p>
            
            <h4 style={{ marginBottom: '10px', color: '#000000' }}>Extras:</h4>
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>
                {modifiers.map(mod => (
                    <label key={mod.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f9f9f9', cursor: 'pointer', color: '#000000' }}>
                        <span>
                            <input type="checkbox" onChange={() => toggleExtra(mod)} style={{ marginRight: '10px' }} />
                            {mod.name}
                        </span>
                        <span style={{ fontWeight: 'bold' }}>+${mod.price}</span>
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

      {/* --- MODAL 2: TABLE SELECTION (Mobile Optimized) --- */}
      {showTableSelector && (
        <div style={{ 
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', 
            display: 'flex', justifyContent: 'center', alignItems: 'center', 
            zIndex: 3000 // Higher zIndex for mobile safety
        }}>
            <div style={{ 
                backgroundColor: 'white', 
                borderRadius: isMobile ? '0' : '12px', 
                width: isMobile ? '100%' : '600px', 
                height: isMobile ? '100%' : 'auto',
                maxHeight: isMobile ? '100%' : '90vh',
                maxWidth: '100%', 
                padding: '20px', 
                display:'flex', flexDirection:'column' 
            }}>
                <h2 style={{marginTop: isMobile ? '20px' : 0, marginBottom: '20px', textAlign:'center'}}>Select Table</h2>
                
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(120px, 1fr))', 
                    gap: '15px', overflowY:'auto', flex:1, padding: '5px' 
                }}>
                    {tables.map(table => (
                        <button 
                            type="button" 
                            key={table.id}
                            disabled={table.status === 'Not Available'}
                            onClick={() => handleSelectTable(table)}
                            style={{
                                padding: '15px', 
                                border: '2px solid #eee', 
                                borderRadius: '8px', 
                                backgroundColor: table.status === 'Available' ? '#E8F5E9' : (table.status === 'Occupied' ? '#FFEBEE' : '#f0f0f0'),
                                color: table.status === 'Not Available' ? '#aaa' : 'black',
                                cursor: table.status === 'Not Available' ? 'not-allowed' : 'pointer',
                                fontSize: '1.1rem', fontWeight: 'bold',
                                minHeight: '80px', 
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            <span>{table.name}</span>
                            <span style={{fontSize:'0.7rem', fontWeight:'normal', marginTop:'5px'}}>{table.status}</span>
                        </button>
                    ))}
                </div>

                <button 
                    onClick={() => setShowTableSelector(false)}
                    style={{ marginTop: '20px', padding: '15px', background: '#333', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
                >
                    Cancel
                </button>
            </div>
        </div>
      )}

    </div>
  );
};

const sidebarBtn = {
    padding: '15px', border: 'none', backgroundColor: 'white', color: '#000000', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
};

const mobileNavBtn = {
    background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, padding: '10px'
};

export default MenuBoard;