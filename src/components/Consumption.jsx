import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, query, where } from 'firebase/firestore';

const Consumption = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [menuItems, setMenuItems] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [todaysOrders, setTodaysOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const [activeTab, setActiveTab] = useState('RECIPES'); 
  const [selectedDish, setSelectedDish] = useState(null);

  const [ingredientForm, setIngredientForm] = useState({
    stockId: '',
    qty: ''
  });

  // --- 1. DATA FETCHING ---
  useEffect(() => {
    setLoading(true);

    const unsubMenu = onSnapshot(collection(db, "menu_items"), 
      (snap) => setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a.name || "").localeCompare(b.name || ""))), 
      (error) => console.error(error)
    );

    const unsubStock = onSnapshot(collection(db, "inventory"), 
      (snap) => setStockItems(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a.itemName || "").localeCompare(b.itemName || ""))),
      (error) => console.error(error)
    );

    // Simplified Query for Orders
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const qOrders = query(collection(db, "orders"), where("createdAt", ">=", startOfDay));
    
    const unsubOrders = onSnapshot(qOrders, 
      (snap) => {
        const rawOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTodaysOrders(rawOrders.filter(o => o.status !== "Cancelled"));
        setLoading(false);
      }, 
      (error) => { setErrorMsg(error.message); setLoading(false); }
    );

    return () => { unsubMenu(); unsubStock(); unsubOrders(); };
  }, []);

  // --- HELPER: Get Unit of Selected Stock Item ---
  const getSelectedStockUnit = () => {
      const item = stockItems.find(s => s.id === ingredientForm.stockId);
      return item ? item.unit : ''; // e.g. returns "kg" or "ltr"
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
      if(existingIndex >= 0) {
          updatedRecipe[existingIndex] = newIngredient; 
      } else {
          updatedRecipe.push(newIngredient); 
      }

      try {
          await updateDoc(doc(db, "menu_items", selectedDish.id), { recipe: updatedRecipe });
          setSelectedDish({ ...selectedDish, recipe: updatedRecipe }); 
          setIngredientForm({ stockId: '', qty: '' });
      } catch (error) {
          alert("Error: " + error.message);
      }
  };

  const handleRemoveIngredient = async (indexToRemove) => {
      if(!window.confirm("Remove this ingredient?")) return;
      const updatedRecipe = selectedDish.recipe.filter((_, index) => index !== indexToRemove);
      await updateDoc(doc(db, "menu_items", selectedDish.id), { recipe: updatedRecipe });
      setSelectedDish({ ...selectedDish, recipe: updatedRecipe });
  };

  // --- 3. REPORT ---
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

  if (loading) return <div style={{padding:'40px'}}>Loading...</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate('/')} style={styles.backBtn}>← Back</button>
            <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#333' }}>Consumption & Recipes</h1>
        </div>
        <div style={{ display: 'flex', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
            <button onClick={() => setActiveTab('RECIPES')} style={{ ...styles.tabBtn, backgroundColor: activeTab === 'RECIPES' ? 'black' : 'white', color: activeTab === 'RECIPES' ? 'white' : 'black' }}>Recipe Builder</button>
            <button onClick={() => setActiveTab('REPORT')} style={{ ...styles.tabBtn, backgroundColor: activeTab === 'REPORT' ? 'black' : 'white', color: activeTab === 'REPORT' ? 'white' : 'black' }}>Daily Report</button>
        </div>
      </div>

      {/* --- RECIPE BUILDER --- */}
      {activeTab === 'RECIPES' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
              
              {/* LEFT: Menu Items */}
              <div style={styles.card}>
                  <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Select Dish</h3>
                  <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                      {menuItems.map(item => (
                          <div key={item.id} onClick={() => setSelectedDish(item)}
                            style={{ padding: '12px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', backgroundColor: selectedDish?.id === item.id ? '#E3F2FD' : 'white', fontWeight: selectedDish?.id === item.id ? 'bold' : 'normal', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{item.name}</span>
                              {item.recipe && item.recipe.length > 0 && <span style={{fontSize:'0.7rem', background:'#4CAF50', color:'white', padding:'2px 6px', borderRadius:'10px'}}>Mapped</span>}
                          </div>
                      ))}
                  </div>
              </div>

              {/* RIGHT: Recipe Details */}
              <div style={styles.card}>
                  {selectedDish ? (
                      <>
                          <h2 style={{ marginTop: 0, color:'#2196F3' }}>{selectedDish.name}</h2>
                          <p style={{ color: '#666', fontSize: '0.9rem' }}>Ingredients used for 1 unit:</p>

                          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                              <thead style={{ backgroundColor: '#f9f9f9', borderBottom: '2px solid #ddd' }}>
                                  <tr><th style={styles.th}>Ingredient</th><th style={styles.th}>Qty Used</th><th style={styles.th}>Unit</th><th style={styles.th}>Action</th></tr>
                              </thead>
                              <tbody>
                                  {(!selectedDish.recipe || selectedDish.recipe.length === 0) && <tr><td colSpan="4" style={{padding:'20px', textAlign:'center', color:'#999'}}>No ingredients.</td></tr>}
                                  {selectedDish.recipe?.map((ing, idx) => (
                                      <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                          <td style={styles.td}>{ing.name}</td>
                                          <td style={{...styles.td, fontWeight:'bold'}}>{ing.qty}</td>
                                          <td style={styles.td}>{ing.unit}</td>
                                          <td style={styles.td}><button onClick={() => handleRemoveIngredient(idx)} style={styles.deleteBtn}>Remove</button></td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>

                          {/* ADD INGREDIENT FORM */}
                          <div style={{ backgroundColor: '#f0f4f8', padding: '20px', borderRadius: '8px' }}>
                              <h4 style={{margin:'0 0 15px 0'}}>Add Ingredient</h4>
                              <form onSubmit={handleAddIngredient} style={{ display: 'flex', gap: '15px', alignItems: 'end' }}>
                                  <div style={{flex: 2}}>
                                      <label style={styles.label}>Raw Material</label>
                                      <select required value={ingredientForm.stockId} onChange={e => setIngredientForm({...ingredientForm, stockId: e.target.value})} style={styles.input}>
                                          <option value="">-- Select Material --</option>
                                          {stockItems.map(s => (
                                              <option key={s.id} value={s.id}>{s.itemName} ({s.unit})</option>
                                          ))}
                                      </select>
                                  </div>
                                  <div style={{flex: 1}}>
                                      {/* DYNAMIC LABEL SHOWS UNIT */}
                                      <label style={styles.label}>
                                          Qty {ingredientForm.stockId ? `(${getSelectedStockUnit()})` : ''}
                                      </label>
                                      <input 
                                        type="number" step="0.001" required placeholder="0.00"
                                        value={ingredientForm.qty} 
                                        onChange={e => setIngredientForm({...ingredientForm, qty: e.target.value})}
                                        style={styles.input}
                                      />
                                  </div>
                                  <button type="submit" style={styles.addBtn}>+ Add</button>
                              </form>
                              <p style={{fontSize:'0.8rem', color:'#666', marginTop:'10px'}}>
                                  *Tip: If stock is in KG but you use Grams, enter decimal (e.g. 100g = 0.1 KG)
                              </p>
                          </div>
                      </>
                  ) : (
                      <div style={{textAlign:'center', padding:'50px', color:'#999'}}>Select a dish to start mapping.</div>
                  )}
              </div>
          </div>
      )}

      {/* --- REPORT VIEW --- */}
      {activeTab === 'REPORT' && (
          <div style={styles.card}>
              <h2 style={{ marginTop: 0 }}>Theoretical Consumption (Today)</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop:'20px' }}>
                  <thead style={{ backgroundColor: '#E0E0E0' }}>
                      <tr><th style={styles.th}>Raw Material</th><th style={styles.th}>Consumed</th><th style={styles.th}>Unit</th><th style={styles.th}>Stock Left</th></tr>
                  </thead>
                  <tbody>
                      {calculateConsumption().map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{...styles.td, fontWeight:'bold'}}>{item.name}</td>
                              <td style={{...styles.td, fontWeight:'bold', color:'#D32F2F'}}>{item.consumed.toFixed(3)}</td>
                              <td style={styles.td}>{item.unit}</td>
                              <td style={{...styles.td, color: item.currentStock < item.consumed ? 'red' : 'green'}}>{item.currentStock.toFixed(3)}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}
    </div>
  );
};

// --- STYLES ---
const styles = {
    backBtn: { padding: '8px 16px', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    tabBtn: { padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
    card: { backgroundColor: 'white', padding: '25px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', height:'100%' },
    th: { padding: '12px 15px', textAlign: 'left', fontSize: '0.85rem', color: '#555', fontWeight: 'bold', textTransform:'uppercase' },
    td: { padding: '12px 15px', fontSize: '0.95rem', color: '#333' },
    label: { display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '6px', boxSizing: 'border-box', backgroundColor:'white' },
    addBtn: { padding: '12px 20px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', height: '100%' },
    deleteBtn: { padding: '5px 10px', backgroundColor: '#FFEBEE', color: '#C62828', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize:'0.8rem', fontWeight:'bold' }
};

export default Consumption;