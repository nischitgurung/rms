import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';

const MenuBoard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Get initial table if passed from the previous screen
  const { tableId: initialTableId, tableName: initialTableName } = location.state || { tableId: 'Walk-in', tableName: 'Walk-in' };

  // --- STATE ---
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [modifiers, setModifiers] = useState([]); 
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tables State (For selecting table at the end)
  const [tables, setTables] = useState([]);
  const [showTableSelector, setShowTableSelector] = useState(false);

  // Modal State (For Items)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); 
  const [selectedExtras, setSelectedExtras] = useState([]); 

  // --- DATA FETCHING ---
  useEffect(() => {
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

    // Listen to Tables (Real-time, to show available ones)
    const unsubTables = onSnapshot(collection(db, "tables"), (snapshot) => {
        setTables(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => {
            const numA = parseInt(a.name.replace(/^\D+/g, '')) || 0;
            const numB = parseInt(b.name.replace(/^\D+/g, '')) || 0;
            return numA - numB;
        }));
    });

    return () => unsubTables();
  }, []);

  // --- ITEM HANDLERS ---
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
  };

  // --- SEND ORDER LOGIC ---
  
  // 1. Triggered by "SEND ORDER" button
  const handleSendClick = () => {
      if (cart.length === 0) return alert("Cart is empty!");

      // If we already know the table (passed from Table Management), confirm and send
      if (initialTableId !== 'Walk-in') {
          if(window.confirm(`Send order for ${initialTableName}?`)) {
              finalizeOrder(initialTableId, initialTableName);
          }
      } else {
          // If generic POS mode, OPEN TABLE SELECTOR
          setShowTableSelector(true);
      }
  };

  // 2. Triggered when a table is clicked in the selector
  const handleSelectTable = (table) => {
      if(window.confirm(`Assign order to ${table.name} and send to kitchen?`)) {
          finalizeOrder(table.id, table.name);
      }
  };

  // 3. Actual Database Write
  const finalizeOrder = async (tId, tName) => {
    try {
      const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
      
      // Add Order
      await addDoc(collection(db, "orders"), {
        items: cart,
        totalAmount,
        status: "PENDING",
        createdAt: serverTimestamp(),
        tableId: tName, // Store Name for display
        tableDocId: tId // Store ID for reference
      });

      // Update Table Status to Occupied
      await updateDoc(doc(db, "tables", tId), { status: "Occupied", guests: 4 });

      alert(`Order Sent to Kitchen for ${tName}!`);
      navigate('/tables'); // Go back to dashboard
    } catch (error) {
      console.error(error);
      alert("Error sending order");
    }
  };

  if (loading) return <div style={{padding: 20, color: 'black'}}>Loading Menu...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f5f5f5', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
      
      {/* --- LEFT: CART --- */}
      <div style={{ width: '300px', backgroundColor: 'white', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#000000' }}>CART</h2>
            <div style={{ fontSize: '0.9rem', color: '#666666' }}>
                Order for: <strong>{initialTableName === 'Walk-in' ? 'Select Table Next ->' : initialTableName}</strong>
            </div>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
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

        <div style={{ padding: '20px', borderTop: '2px solid #333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '15px', color: '#000000' }}>
                <span>Total</span>
                <span>${cart.reduce((acc, item) => acc + item.price, 0).toFixed(2)}</span>
            </div>
            {/* UPDATED BUTTON CLICK HANDLER */}
            <button onClick={handleSendClick} style={{ width: '100%', padding: '15px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                {initialTableId === 'Walk-in' ? 'SELECT TABLE & SEND' : 'SEND TO KITCHEN'}
            </button>
        </div>
      </div>

      {/* --- MIDDLE: MENU GRID --- */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Categories */}
        <div style={{ padding: '20px', backgroundColor: 'white', borderBottom: '1px solid #ddd', display: 'flex', gap: '10px', overflowX: 'auto' }}>
            <button 
                onClick={() => setActiveCategory('All')}
                style={{ 
                    padding: '10px 20px', borderRadius: '20px', border: '1px solid #ddd',
                    backgroundColor: activeCategory === 'All' ? 'black' : 'white',
                    color: activeCategory === 'All' ? 'white' : 'black',
                    cursor: 'pointer', whiteSpace: 'nowrap'
                }}
            >
                All Items
            </button>
            {categories.map(cat => (
                 <button 
                    key={cat.id} 
                    onClick={() => setActiveCategory(cat.id)}
                    style={{ 
                        padding: '10px 20px', borderRadius: '20px', border: '1px solid #ddd',
                        backgroundColor: activeCategory === cat.id ? 'black' : 'white',
                        color: activeCategory === cat.id ? 'white' : 'black',
                        cursor: 'pointer', whiteSpace: 'nowrap'
                    }}
                >
                    {cat.name}
                </button>
            ))}
        </div>

        {/* Items */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
            {(activeCategory === 'All' ? items : items.filter(i => i.categoryId === activeCategory)).map(item => (
                <div 
                    key={item.id} 
                    onClick={() => handleItemClick(item)}
                    style={{ 
                        backgroundColor: 'white', borderRadius: '12px', padding: '15px', 
                        textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', 
                        cursor: 'pointer', border: '1px solid #eee'
                    }}
                >
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '1rem', color: '#000000' }}>{item.name}</h4>
                    <div style={{ fontWeight: 'bold', color: '#4CAF50' }}>${item.price}</div>
                </div>
            ))}
        </div>
      </div>

      {/* --- RIGHT: SIDEBAR --- */}
      <div style={{ width: '220px', backgroundColor: '#f0f0f0', borderLeft: '1px solid #ddd', padding: '20px', display: 'flex', flexDirection: 'column' }}>
         <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#000000' }}>OTHER OPTIONS</h3>
         <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={() => navigate('/admin-menu')} style={sidebarBtn}>Menu Dishes</button>
            <button onClick={() => navigate('/tables')} style={sidebarBtn}>Table Management</button>
            <button onClick={() => navigate('/inventory')} style={sidebarBtn}>Inventory</button>
         </div>
         <button onClick={() => navigate('/')} style={{ ...sidebarBtn, marginTop: 'auto', backgroundColor: '#333', color: 'white' }}>← Dashboard</button>
      </div>

      {/* --- MODAL 1: ADD ITEM EXTRAS --- */}
      {isModalOpen && selectedItem && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '400px', color: '#000000' }}>
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

      {/* --- MODAL 2: TABLE SELECTION (Triggered on Send) --- */}
      {showTableSelector && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '600px', maxWidth: '90%', maxHeight: '90vh', display:'flex', flexDirection:'column' }}>
                <h2 style={{marginTop:0, marginBottom: '20px', textAlign:'center'}}>Select Table for Order</h2>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '15px', overflowY:'auto', flex:1, padding: '5px' }}>
                    {tables.map(table => (
                        <button 
                            key={table.id}
                            disabled={table.status === 'Not Available'}
                            onClick={() => handleSelectTable(table)}
                            style={{
                                padding: '20px', 
                                border: '2px solid #eee', 
                                borderRadius: '8px', 
                                backgroundColor: table.status === 'Available' ? '#E8F5E9' : (table.status === 'Occupied' ? '#FFEBEE' : '#f0f0f0'),
                                color: table.status === 'Not Available' ? '#aaa' : 'black',
                                cursor: table.status === 'Not Available' ? 'not-allowed' : 'pointer',
                                fontSize: '1.1rem', fontWeight: 'bold'
                            }}
                        >
                            {table.name}
                            <div style={{fontSize:'0.7rem', fontWeight:'normal', marginTop:'5px'}}>{table.status}</div>
                        </button>
                    ))}
                </div>

                <button 
                    onClick={() => setShowTableSelector(false)}
                    style={{ marginTop: '20px', padding: '15px', background: '#333', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                >
                    Cancel / Go Back
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

export default MenuBoard;