import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

const MenuBoard = () => {
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [modifiers, setModifiers] = useState([]); 
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [saving, setSaving] = useState(false);

  // MODAL STATE
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); 
  const [selectedExtras, setSelectedExtras] = useState([]); 

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

  // DEBUGGING CLICK HANDLER
  const handleItemClick = (item) => {
    console.log("Clicked item:", item.name); // Check your browser console (F12)
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
    const finalPrice = selectedItem.price + extrasTotal;

    const cartItem = {
      ...selectedItem,
      cartId: Math.random().toString(36).substr(2, 9), 
      price: finalPrice,
      selectedExtras: selectedExtras, 
      qty: 1
    };

    setCart([...cart, cartItem]);
    setIsModalOpen(false); 
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Cart is empty!");
    setSaving(true);
    try {
      const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
      await addDoc(collection(db, "orders"), {
        items: cart,
        totalAmount: totalAmount,
        status: "PENDING",
        createdAt: serverTimestamp(),
        tableId: "Table 1", 
      });
      alert("Order Sent to Kitchen!");
      setCart([]);
      setSaving(false);
    } catch (error) {
      console.error(error);
      setSaving(false);
    }
  };

  if (loading) return <div>Loading Menu...</div>;

  return (
    <div style={{ display: 'flex', height: '100vh', flexDirection: 'row', position: 'relative' }}>
      
      {/* --- LEFT: CART --- */}
      <div style={{ width: '30%', backgroundColor: '#f4f4f4', padding: '20px', borderRight: '2px solid #ddd', display: 'flex', flexDirection: 'column' }}>
        <button onClick={() => navigate('/')} style={{ marginBottom: '10px' }}>← Dashboard</button>
        <h2>Current Order</h2>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {cart.map((item) => (
            <div key={item.cartId} style={{ marginBottom: '10px', padding: '10px', background: 'white', borderRadius: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{item.name}</strong>
                <span>${item.price.toFixed(2)}</span>
              </div>
              {item.selectedExtras && item.selectedExtras.length > 0 && (
                <div style={{ fontSize: '0.85em', color: '#666', marginTop: '5px', paddingLeft: '10px', borderLeft: '2px solid #ddd' }}>
                  {item.selectedExtras.map(ex => (
                    <div key={ex.id}>+ {ex.name}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ borderTop: '2px solid #333', paddingTop: '20px' }}>
          <h3>Total: ${cart.reduce((acc, item) => acc + (item.price * item.qty), 0).toFixed(2)}</h3>
          <button onClick={handleCheckout} style={{ width: '100%', padding: '15px', marginTop: '20px', background: '#4CAF50', color: 'white', border: 'none', fontSize: '1.2em' }}>
            {saving ? "Sending..." : "Send to Kitchen"}
          </button>
        </div>
      </div>

      {/* --- RIGHT: MENU GRID --- */}
      <div style={{ width: '70%', padding: '20px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button onClick={() => setActiveCategory('All')} style={{ padding: '10px' }}>All</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{ padding: '10px' }}>{cat.name}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
          {(activeCategory === 'All' ? items : items.filter(i => i.categoryId === activeCategory)).map(item => (
            <div key={item.id} onClick={() => handleItemClick(item)} style={{ padding: '20px', border: '1px solid #eee', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
              <h4>{item.name}</h4>
              <p style={{color: 'green', fontWeight: 'bold'}}>${item.price}</p>
            </div>
          ))}
        </div>
      </div>

      {/* --- MODAL POPUP (Moved to Bottom & High Z-Index) --- */}
      {isModalOpen && selectedItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', // Darker background
          display: 'flex', justifyContent: 'center', alignItems: 'center', 
          zIndex: 9999 // Force to top
        }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '400px', maxWidth: '90%', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>
            <h2>Customize {selectedItem.name}</h2>
            <p>Base Price: ${selectedItem.price.toFixed(2)}</p>
            
            <h3 style={{ marginTop: '20px', borderBottom: '1px solid #ccc' }}>Extras</h3>
            
            {/* Check if modifiers exist */}
            {modifiers.length === 0 ? (
               <p style={{color: 'red'}}>No Extras found. Go to Admin to add them.</p>
            ) : (
              <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
                {modifiers.map(mod => (
                  <div key={mod.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #eee' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedExtras.some(e => e.id === mod.id)}
                        onChange={() => toggleExtra(mod)}
                        style={{ transform: 'scale(1.5)' }}
                      />
                      <span>{mod.name}</span>
                    </label>
                    <span style={{ fontWeight: 'bold' }}>+${mod.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={confirmAddToCart} style={{ padding: '10px 20px', background: 'black', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                Add to Order (${(selectedItem.price + selectedExtras.reduce((s,e)=>s+e.price,0)).toFixed(2)})
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MenuBoard;