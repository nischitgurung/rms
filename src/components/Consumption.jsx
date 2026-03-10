import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { useUser } from '../contexts/UserContext'; // <--- 1. NEW IMPORT

const Consumption = () => {
  const navigate = useNavigate();
  const { restaurantId } = useUser(); // <--- 2. GET RESTAURANT ID

  // --- STATE ---
  const [menuItems, setMenuItems] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [todaysOrders, setTodaysOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  const [activeTab, setActiveTab] = useState('RECIPES'); 
  const [selectedDish, setSelectedDish] = useState(null);

  const [ingredientForm, setIngredientForm] = useState({ stockId: '', qty: '' });
  // ADDED: Search state for ingredient picker
  const [ingSearch, setIngSearch] = useState('');

  // --- 1. DATA FETCHING ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);

    // <--- 3. GUARD CLAUSE
    if (!restaurantId) return;

    // 4. FILTER MENU BY RESTAURANT ID
    const qMenu = query(collection(db, "menu_items"), where("userId", "==", restaurantId));
    const unsubMenu = onSnapshot(qMenu, (snap) => {
      setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a.name || "").localeCompare(b.name || "")));
    });

    // 5. FILTER INVENTORY BY RESTAURANT ID
    const qStock = query(collection(db, "inventory"), where("userId", "==", restaurantId));
    const unsubStock = onSnapshot(qStock, (snap) => {
      setStockItems(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a.itemName || "").localeCompare(b.itemName || "")));
    });

    // 6. FILTER ORDERS BY RESTAURANT ID + DATE
    // NOTE: This might require a new Index. Check console for link.
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const qOrders = query(
        collection(db, "orders"), 
        where("userId", "==", restaurantId), // Filter by Restaurant
        where("createdAt", ">=", startOfDay)
    );
    
    const unsubOrders = onSnapshot(qOrders, (snap) => {
        const rawOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTodaysOrders(rawOrders.filter(o => o.status !== "Cancelled"));
        setLoading(false);
    });

    return () => { 
      unsubMenu(); unsubStock(); unsubOrders(); 
      window.removeEventListener('resize', handleResize);
    };
  }, [restaurantId]); // <--- 7. ADD DEPENDENCY

  const getSelectedStockUnit = () => {
      const item = stockItems.find(s => s.id === ingredientForm.stockId);
      return item ? item.unit : '';
  };

  // --- 2. HANDLERS ---
  const handleAddIngredient = async (e) => {
      e.preventDefault();
      if(!selectedDish || !ingredientForm.stockId || !ingredientForm.qty) return;

      const stockItem = stockItems.find(s => s.id === ingredientForm.stockId);
      const newIngredient = {
          stockId: String(stockItem.id),
          name: String(stockItem.itemName), 
          unit: String(stockItem.unit),     
          qty: Number(ingredientForm.qty)
      };

      const currentRecipe = selectedDish.recipe || [];
      const existingIndex = currentRecipe.findIndex(i => i.stockId === newIngredient.stockId);
      
      let updatedRecipe = [...currentRecipe];
      if(existingIndex >= 0) updatedRecipe[existingIndex] = newIngredient; 
      else updatedRecipe.push(newIngredient); 

      try {
          await updateDoc(doc(db, "menu_items", selectedDish.id), { recipe: updatedRecipe });
          setSelectedDish({ ...selectedDish, recipe: updatedRecipe }); 
          setIngredientForm({ stockId: '', qty: '' });
          setIngSearch(''); // Reset search
      } catch (error) { alert("Error: " + error.message); }
  };

  const handleRemoveIngredient = async (indexToRemove) => {
      if(!window.confirm("Remove this ingredient?")) return;
      const updatedRecipe = selectedDish.recipe.filter((_, index) => index !== indexToRemove);
      await updateDoc(doc(db, "menu_items", selectedDish.id), { recipe: updatedRecipe });
      setSelectedDish({ ...selectedDish, recipe: updatedRecipe });
  };

  const calculateConsumption = () => {
      const usageMap = {}; 
      todaysOrders.forEach(order => {
          if (!order.items) return;
          order.items.forEach(orderItem => {
              const menuItem = menuItems.find(m => m.id === orderItem.id);
              if (menuItem && menuItem.recipe) {
                  menuItem.recipe.forEach(ingredient => {
                      const totalQty = (parseFloat(ingredient.qty) || 0) * (parseFloat(orderItem.qty) || 0);
                      if (usageMap[ingredient.stockId]) {
                          usageMap[ingredient.stockId].consumed += totalQty;
                      } else {
                          const liveStock = stockItems.find(s => s.id === ingredient.stockId);
                          usageMap[ingredient.stockId] = {
                              name: ingredient.name,
                              consumed: totalQty,
                              unit: ingredient.unit,
                              currentStock: liveStock ? parseFloat(liveStock.quantity) : 0
                          };
                      }
                  });
              }
          });
      });
      return Object.values(usageMap);
  };

  // ADDED: Logic to filter stock items by name OR nickname (SEO Alias)
  const filteredStock = stockItems.filter(s => 
    s.itemName?.toLowerCase().includes(ingSearch.toLowerCase()) || 
    s.seoTitle?.toLowerCase().includes(ingSearch.toLowerCase())
  );

  if (loading) return <div style={{padding:'40px', textAlign: 'center'}}>Loading Data...</div>;

  return (
    <div style={{ padding: isMobile ? '10px' : '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: isMobile ? '100%' : 'auto' }}>
            <button onClick={() => navigate('/')} style={styles.backBtn}>← Back</button>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.8rem', color: '#333' }}>Consumption</h1>
        </div>
        <div style={{ display: 'flex', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd', width: isMobile ? '100%' : 'auto' }}>
            <button onClick={() => setActiveTab('RECIPES')} style={{ ...styles.tabBtn, flex: 1, backgroundColor: activeTab === 'RECIPES' ? 'black' : 'white', color: activeTab === 'RECIPES' ? 'white' : 'black' }}>Recipes</button>
            <button onClick={() => setActiveTab('REPORT')} style={{ ...styles.tabBtn, flex: 1, backgroundColor: activeTab === 'REPORT' ? 'black' : 'white', color: activeTab === 'REPORT' ? 'white' : 'black' }}>Report</button>
        </div>
      </div>

      {activeTab === 'RECIPES' && (
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px' }}>
              {(!isMobile || !selectedDish) && (
                <div style={{ ...styles.card, flex: 1 }}>
                    <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Select Dish</h3>
                    <div style={{ maxHeight: isMobile ? '60vh' : '70vh', overflowY: 'auto' }}>
                        {menuItems.map(item => (
                            <div key={item.id} onClick={() => setSelectedDish(item)}
                              style={{ padding: '15px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', backgroundColor: selectedDish?.id === item.id ? '#E3F2FD' : 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{fontSize: '0.9rem'}}>{item.name}</span>
                                {item.recipe && item.recipe.length > 0 && <span style={{fontSize:'0.6rem', background:'#4CAF50', color:'white', padding:'3px 8px', borderRadius:'10px'}}>Mapped</span>}
                            </div>
                        ))}
                    </div>
                </div>
              )}

              {selectedDish && (
                <div style={{ ...styles.card, flex: 2 }}>
                    <div style={{ display: 'flex', flexDirection:'column', marginBottom: '15px' }}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <h2 style={{ margin: 0, color:'#2196F3', fontSize: '1.2rem' }}>{selectedDish.name}</h2>
                            {isMobile && <button onClick={() => setSelectedDish(null)} style={styles.closeBtn}>Back to List</button>}
                        </div>
                        
                        {/* ADDED: QUALITY SOP (META DESCRIPTION) DISPLAY */}
                        {selectedDish.seoDescription && (
                            <div style={{marginTop:'10px', padding:'10px', background:'#FFF9C4', borderRadius:'6px', borderLeft:'4px solid #FBC02D', fontSize:'0.8rem'}}>
                                <strong>💡 Quality SOP:</strong> {selectedDish.seoDescription}
                            </div>
                        )}
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', minWidth: '300px' }}>
                            <thead style={{ backgroundColor: '#f9f9f9' }}>
                                <tr><th style={styles.th}>Ingredient</th><th style={styles.th}>Qty</th><th style={styles.th}>Action</th></tr>
                            </thead>
                            <tbody>
                                {(!selectedDish.recipe || selectedDish.recipe.length === 0) && <tr><td colSpan="3" style={{padding:'20px', textAlign:'center', color:'#999'}}>No ingredients yet.</td></tr>}
                                {selectedDish.recipe?.map((ing, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={styles.td}>{ing.name} <br/><span style={{fontSize:'0.7rem', color:'#888'}}>{ing.unit}</span></td>
                                        <td style={{...styles.td, fontWeight:'bold'}}>{ing.qty}</td>
                                        <td style={styles.td}><button onClick={() => handleRemoveIngredient(idx)} style={styles.deleteBtn}>×</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style={{ backgroundColor: '#f0f4f8', padding: '15px', borderRadius: '8px' }}>
                        <form onSubmit={handleAddIngredient} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <label style={styles.label}>Select Raw Material (Search by Name or Alias)</label>
                            
                            {/* ADDED: SEARCH INPUT FOR INGREDIENTS */}
                            <input 
                                type="text" 
                                placeholder="Type alias e.g. 'Momo bag'..." 
                                value={ingSearch}
                                onChange={(e) => setIngSearch(e.target.value)}
                                style={{...styles.input, marginBottom:'5px'}}
                            />

                            <select required value={ingredientForm.stockId} onChange={e => setIngredientForm({...ingredientForm, stockId: e.target.value})} style={styles.input}>
                                <option value="">-- Choose from {filteredStock.length} items --</option>
                                {filteredStock.map(s => (
                                    <option key={s.id} value={s.id}>{s.itemName} ({s.unit}) {s.seoTitle && `- ${s.seoTitle}`}</option>
                                ))}
                            </select>
                            <label style={styles.label}>Quantity {ingredientForm.stockId ? `(${getSelectedStockUnit()})` : ''}</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input type="number" step="0.001" required placeholder="0.00" value={ingredientForm.qty} onChange={e => setIngredientForm({...ingredientForm, qty: e.target.value})} style={{...styles.input, flex: 1}} />
                                <button type="submit" style={styles.addBtn}>Add</button>
                            </div>
                        </form>
                    </div>
                </div>
              )}
          </div>
      )}

      {activeTab === 'REPORT' && (
          <div style={styles.card}>
              <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>Theoretical Consumption (Today)</h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop:'20px', minWidth: '500px' }}>
                    <thead style={{ backgroundColor: '#E0E0E0' }}>
                        <tr><th style={styles.th}>Material</th><th style={styles.th}>Used</th><th style={styles.th}>Unit</th><th style={styles.th}>In Stock</th></tr>
                    </thead>
                    <tbody>
                        {calculateConsumption().length === 0 && <tr><td colSpan="4" style={{textAlign:'center', padding: '20px', color: '#888'}}>No sales data mapped to recipes yet.</td></tr>}
                        {calculateConsumption().map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{...styles.td, fontWeight:'bold'}}>{item.name}</td>
                                <td style={{...styles.td, fontWeight:'bold', color:'#D32F2F'}}>{item.consumed.toFixed(3)}</td>
                                <td style={styles.td}>{item.unit}</td>
                                <td style={{...styles.td, color: item.currentStock < item.consumed ? 'red' : 'green', fontWeight: 'bold'}}>{item.currentStock.toFixed(3)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              </div>
          </div>
      )}
    </div>
  );
};

const styles = {
    backBtn: { padding: '10px 15px', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    closeBtn: { padding: '5px 10px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem' },
    tabBtn: { padding: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' },
    card: { backgroundColor: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    th: { padding: '10px', textAlign: 'left', fontSize: '0.75rem', color: '#555', fontWeight: 'bold', textTransform:'uppercase' },
    td: { padding: '10px', fontSize: '0.85rem', color: '#333' },
    label: { display: 'block', marginBottom: '2px', fontSize: '0.8rem', fontWeight: 'bold', color: '#555' },
    input: { padding: '12px', border: '1px solid #ccc', borderRadius: '6px', boxSizing: 'border-box', backgroundColor:'white', fontSize: '1rem' },
    addBtn: { padding: '0 20px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    deleteBtn: { padding: '5px 10px', backgroundColor: '#FFEBEE', color: '#C62828', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize:'1rem' }
};

export default Consumption;