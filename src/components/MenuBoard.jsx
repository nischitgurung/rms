import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

const MenuBoard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tableId, tableName } = location.state || { tableId: 'Walk-in', tableName: 'Walk-in' };

  // --- STATE ---
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [modifiers, setModifiers] = useState([]); 
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
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
  };

  const handleSendOrder = async () => {
    if (cart.length === 0) return alert("Cart is empty!");
    try {
      const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
      await addDoc(collection(db, "orders"), {
        items: cart,
        totalAmount,
        status: "PENDING",
        createdAt: serverTimestamp(),
        tableId: tableName, 
        tableDocId: tableId 
      });

      if(tableId !== 'Walk-in') {
        await updateDoc(doc(db, "tables", tableId), { status: "Occupied" });
      }
      alert("Order Sent to Kitchen!");
      navigate('/tables'); 
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) return <div style={{padding: 20, color: 'black'}}>Loading Menu...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f5f5f5', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
      
      {/* --- LEFT: CART --- */}
      <div style={{ width: '300px', backgroundColor: 'white', borderRight: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#000000' }}>CART</h2>
            <div style={{ fontSize: '0.9rem', color: '#666666' }}>Order for: {tableName}</div>
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
            <button onClick={handleSendOrder} style={{ width: '100%', padding: '15px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                SEND ORDER
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
                    padding: '10px 20px', 
                    borderRadius: '20px', 
                    border: '1px solid #ddd',
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
                        padding: '10px 20px', 
                        borderRadius: '20px', 
                        border: '1px solid #ddd',
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
                        backgroundColor: 'white', 
                        borderRadius: '12px', 
                        padding: '15px', 
                        textAlign: 'center', 
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)', 
                        cursor: 'pointer',
                        border: '1px solid #eee'
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

      {/* --- MODAL --- */}
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
    </div>
  );
};

const sidebarBtn = {
    padding: '15px', border: 'none', backgroundColor: 'white', color: '#000000', textAlign: 'left', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
};

export default MenuBoard;