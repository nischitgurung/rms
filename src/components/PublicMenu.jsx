import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const PublicMenu = () => {
  const { restaurantId } = useParams(); // Get ID from URL
  
  const [menu, setMenu] = useState([]);
  const [categories, setCategories] = useState([]);
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState('All');
  const [cart, setCart] = useState({}); // Simple Cart State

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
      if (!restaurantId) return;

      try {
        // 1. Fetch Categories
        const catQ = query(collection(db, "categories"), where("userId", "==", restaurantId));
        const catSnap = await getDocs(catQ);
        setCategories(catSnap.docs.map(d => ({id: d.id, ...d.data()})));

        // 2. Fetch Menu Items
        const menuQ = query(collection(db, "menu_items"), where("userId", "==", restaurantId));
        const menuSnap = await getDocs(menuQ);
        setMenu(menuSnap.docs.map(d => ({id: d.id, ...d.data()})));

        // 3. Fetch Combos
        const comboQ = query(collection(db, "combos"), where("userId", "==", restaurantId));
        const comboSnap = await getDocs(comboQ);
        const activeCombos = comboSnap.docs
            .map(d => ({id: d.id, ...d.data()}))
            .filter(c => c.isAvailable);
        
        setCombos(activeCombos);
        setLoading(false);
      } catch (error) {
        console.error("Error loading menu:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, [restaurantId]);

  // --- CART HANDLERS ---
  const addToCart = (item) => {
    setCart(prev => ({
        ...prev,
        [item.id]: (prev[item.id] || 0) + 1
    }));
  };

  const removeFromCart = (item) => {
    setCart(prev => {
        const newCount = (prev[item.id] || 0) - 1;
        if (newCount <= 0) {
            const newCart = { ...prev };
            delete newCart[item.id];
            return newCart;
        }
        return { ...prev, [item.id]: newCount };
    });
  };

  const cartTotalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotalPrice = Object.entries(cart).reduce((total, [id, qty]) => {
      const item = menu.find(i => i.id === id) || combos.find(c => c.id === id);
      return total + ((parseFloat(item?.price) || 0) * qty);
  }, 0);

  // --- FILTERING ---
  const filteredItems = activeCat === 'All' 
    ? menu 
    : menu.filter(item => {
        // Handle both ID-based and Name-based category links
        if (item.categoryId === activeCat) return true; 
        const catObj = categories.find(c => c.id === activeCat);
        return catObj && item.categoryId === catObj.name;
    });

  if (loading) return <div style={{padding:50, textAlign:'center', color:'#666'}}>Loading Menu...</div>;

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f8f9fa', minHeight: '100vh', paddingBottom: '80px' }}>
      
      {/* HEADER */}
      <div style={{ backgroundColor: 'white', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 100 }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', textAlign: 'center' }}>🍽️ Our Menu</h1>
      </div>

      {/* CATEGORY TABS */}
      <div style={{ display: 'flex', overflowX: 'auto', padding: '15px', gap: '10px', scrollbarWidth: 'none' }}>
        <button 
            onClick={() => setActiveCat('All')} 
            style={{ ...styles.catBtn, backgroundColor: activeCat === 'All' ? 'black' : 'white', color: activeCat === 'All' ? 'white' : 'black' }}
        >
            All
        </button>
        {categories.map(cat => (
            <button 
                key={cat.id} 
                onClick={() => setActiveCat(cat.id)} 
                style={{ ...styles.catBtn, backgroundColor: activeCat === cat.id ? 'black' : 'white', color: activeCat === cat.id ? 'white' : 'black' }}
            >
                {cat.name}
            </button>
        ))}
      </div>

      {/* COMBOS (Horizontal Scroll) */}
      {combos.length > 0 && activeCat === 'All' && (
          <div style={{ padding: '0 15px 15px' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#D32F2F' }}>🔥 Hot Deals</h3>
              <div style={{ display: 'flex', overflowX: 'auto', gap: '15px', paddingBottom: '10px' }}>
                  {combos.map(combo => (
                      <div key={combo.id} style={styles.comboCard}>
                          <div style={{fontWeight:'bold'}}>{combo.name}</div>
                          <div style={{fontSize:'0.8rem', color:'#666', margin:'5px 0', height:'35px', overflow:'hidden'}}>{combo.seoDescription || 'Special Bundle'}</div>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                              <span style={{fontWeight:'bold', color:'#D32F2F'}}>Rs. {combo.price}</span>
                              {cart[combo.id] ? (
                                  <div style={styles.qtyControl}>
                                      <button onClick={() => removeFromCart(combo)}>-</button>
                                      <span>{cart[combo.id]}</span>
                                      <button onClick={() => addToCart(combo)}>+</button>
                                  </div>
                              ) : (
                                  <button onClick={() => addToCart(combo)} style={styles.addBtn}>Add</button>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* MENU ITEMS (List) */}
      <div style={{ padding: '15px', display: 'grid', gap: '15px' }}>
          {filteredItems.map(item => (
              <div key={item.id} style={styles.itemCard}>
                  {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} style={styles.itemImg} />
                  )}
                  <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{item.name}</div>
                      <div style={{ fontSize: '0.8rem', color: '#888', margin: '4px 0' }}>{item.description || item.category}</div>
                      <div style={{ fontWeight: 'bold', color: '#333' }}>Rs. {item.price}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                      {cart[item.id] ? (
                          <div style={styles.qtyControl}>
                              <button onClick={() => removeFromCart(item)}>-</button>
                              <span>{cart[item.id]}</span>
                              <button onClick={() => addToCart(item)}>+</button>
                          </div>
                      ) : (
                          <button onClick={() => addToCart(item)} style={styles.addBtn}>Add</button>
                      )}
                  </div>
              </div>
          ))}
          {filteredItems.length === 0 && <div style={{textAlign:'center', color:'#999', marginTop:'20px'}}>No items in this category.</div>}
      </div>

      {/* FLOATING CART BAR */}
      {cartTotalItems > 0 && (
          <div style={styles.cartBar}>
              <div>
                  <div style={{fontSize:'0.8rem'}}>Total Items: {cartTotalItems}</div>
                  <div style={{fontSize:'1.1rem', fontWeight:'bold'}}>Rs. {cartTotalPrice.toFixed(2)}</div>
              </div>
              <button style={styles.checkoutBtn} onClick={() => alert("Order Sent to Kitchen! (Simulated)")}>
                  Place Order
              </button>
          </div>
      )}

    </div>
  );
};

const styles = {
    catBtn: { padding: '8px 16px', borderRadius: '20px', border: '1px solid #ddd', whiteSpace: 'nowrap', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' },
    comboCard: { minWidth: '200px', backgroundColor: 'white', padding: '12px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #eee' },
    itemCard: { display: 'flex', gap: '15px', backgroundColor: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.03)', alignItems: 'center' },
    itemImg: { width: '70px', height: '70px', borderRadius: '8px', objectFit: 'cover' },
    addBtn: { padding: '6px 15px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
    qtyControl: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f0f0f0', borderRadius: '6px', padding: '2px' },
    cartBar: { position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: 'black', color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 -2px 10px rgba(0,0,0,0.1)' },
    checkoutBtn: { backgroundColor: 'white', color: 'black', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }
};

export default PublicMenu;