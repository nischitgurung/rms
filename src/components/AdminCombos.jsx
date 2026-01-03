import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';

const AdminCombos = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [combos, setCombos] = useState([]);
  const [menuItems, setMenuItems] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, avgPrice: 0 });
  
  // Filter
  const [filterText, setFilterText] = useState('');

  // Form Data
  const [formData, setFormData] = useState({
    name: '', 
    price: '', 
    description: '', 
    comboItems: [], // CHANGED: Array of objects { id, name, qty }
    isAvailable: true
  });

  // --- 1. DATA FETCHING ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    const fetchData = async () => {
        try {
            // A. Fetch Combos
            const unsubCombos = onSnapshot(collection(db, "combos"), (snapshot) => {
                const fetchedCombos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCombos(fetchedCombos);
                calculateStats(fetchedCombos);
                setLoading(false);
            });

            // B. Fetch Menu Items
            const itemSnap = await getDocs(collection(db, "menu_items"));
            const fetchedItems = itemSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMenuItems(fetchedItems);

            return () => unsubCombos();
        } catch(err) {
            console.error(err);
            setLoading(false);
        }
    };
    fetchData();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- 2. STATS ---
  const calculateStats = (data) => {
      const total = data.length;
      const active = data.filter(c => c.isAvailable).length;
      const totalPrices = data.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);
      const avgPrice = total > 0 ? Math.round(totalPrices / total) : 0;
      setStats({ total, active, avgPrice });
  };

  // --- 3. HELPER: Display contents nicely in the table ---
  const getContentsDisplay = (comboItems) => {
      if (!comboItems || comboItems.length === 0) return "No items";
      // If it's the old format (array of strings), handle gracefully
      if (typeof comboItems[0] === 'string') return "Legacy Format (Edit to fix)";
      
      return comboItems.map(i => `${i.qty}x ${i.name}`).join(', ');
  };

  // --- 4. FORM LOGIC (QUANTITY HANDLING) ---

  // Add item or Increase Quantity
  const handleAddItem = (item) => {
      setFormData(prev => {
          const existing = prev.comboItems.find(i => i.id === item.id);
          let newItems;
          
          if (existing) {
              // Increment Qty
              newItems = prev.comboItems.map(i => 
                  i.id === item.id ? { ...i, qty: i.qty + 1 } : i
              );
          } else {
              // Add New
              newItems = [...prev.comboItems, { id: item.id, name: item.name, qty: 1 }];
          }
          return { ...prev, comboItems: newItems };
      });
  };

  // Decrease Quantity or Remove
  const handleDecreaseItem = (itemId) => {
      setFormData(prev => {
          const existing = prev.comboItems.find(i => i.id === itemId);
          if (!existing) return prev;

          let newItems;
          if (existing.qty > 1) {
              // Decrease Qty
              newItems = prev.comboItems.map(i => 
                  i.id === itemId ? { ...i, qty: i.qty - 1 } : i
              );
          } else {
              // Remove completely
              newItems = prev.comboItems.filter(i => i.id !== itemId);
          }
          return { ...prev, comboItems: newItems };
      });
  };

  const handleRemoveItemCompletely = (itemId) => {
      setFormData(prev => ({
          ...prev,
          comboItems: prev.comboItems.filter(i => i.id !== itemId)
      }));
  };

  // --- 5. CRUD ACTIONS ---
  const handleEditClick = (combo) => {
      // Compatibility check: If modifying an old combo that only had itemIds
      let formattedItems = [];
      if (combo.comboItems) {
          formattedItems = combo.comboItems;
      } else if (combo.itemIds) {
          // Attempt to convert old simple array to new qty array
          const counts = {};
          combo.itemIds.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
          formattedItems = Object.keys(counts).map(id => {
              const mi = menuItems.find(m => m.id === id);
              return { id: id, name: mi ? mi.name : 'Unknown', qty: counts[id] };
          });
      }

      setFormData({
          name: combo.name,
          price: combo.price,
          description: combo.description || '',
          comboItems: formattedItems,
          isAvailable: combo.isAvailable
      });
      setEditingId(combo.id);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return alert("Name and Price are required!");
    if (formData.comboItems.length === 0) return alert("Please select items.");

    try {
        // We save 'comboItems' for the quantity breakdown
        // We also save 'itemIds' (flat array) if you ever need to search "Which combos have pepsi?" easily
        const flatIds = [];
        formData.comboItems.forEach(item => {
             // push ID as many times as qty if you want, or just once. 
             // Usually just once is enough for searching, but let's do once per ID.
             flatIds.push(item.id);
        });

        const payload = {
            ...formData,
            itemIds: flatIds, // Searchable IDs
            price: parseFloat(formData.price),
            createdAt: editingId ? formData.createdAt : serverTimestamp() 
        };

        if (editingId) {
            await updateDoc(doc(db, "combos", editingId), payload);
            alert("Combo Updated!");
        } else {
            await addDoc(collection(db, "combos"), payload);
            alert("Combo Created!");
        }

        setFormData({ name: '', price: '', description: '', comboItems: [], isAvailable: true });
        setEditingId(null);
        setShowForm(false);

    } catch (error) {
        console.error("Error saving:", error);
        alert("Failed to save.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this combo offer?")) {
      await deleteDoc(doc(db, "combos", id));
    }
  };

  // --- 6. RENDER ---
  const filteredCombos = combos.filter(c => c.name.toLowerCase().includes(filterText.toLowerCase()));

  if (loading) return <div style={{padding:'40px'}}>Loading Combos...</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '20px', gap: '15px' }}>
        <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', textTransform: 'uppercase' }}>Combo Offers</h1>
            <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>Manage bundles and special deals</div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
            <button onClick={() => navigate('/')} style={{ flex: isMobile ? 1 : 'none', padding: '10px 20px', border: '1px solid #ccc', background: 'white', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
            <button 
              onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ name: '', price: '', description: '', comboItems: [], isAvailable: true }); }} 
              style={{ flex: isMobile ? 2 : 'none', padding: '10px 20px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {showForm ? "Close Form" : "+ Add Combo"}
            </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px' }}>
          <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Combos</div>
              <div style={styles.statValue}>{stats.total}</div>
          </div>
          <div style={styles.statCard}>
              <div style={styles.statLabel}>Active Offers</div>
              <div style={{...styles.statValue, color: '#4CAF50'}}>{stats.active}</div>
          </div>
          <div style={styles.statCard}>
              <div style={styles.statLabel}>Avg Price</div>
              <div style={styles.statValue}>Rs. {stats.avgPrice}</div>
          </div>
      </div>

      {/* FILTER */}
      <div style={{ marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="Search Combos..." 
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
      </div>

      {/* FORM */}
      {showForm && (
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', borderLeft: '5px solid #000' }}>
          <h3 style={{marginTop:0}}>{editingId ? "Edit Combo" : "Create New Combo"}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px', maxWidth: '800px' }}>
            
            <div style={{display:'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap:'15px'}}>
                <div>
                    <label style={styles.label}>Combo Name</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={styles.input} placeholder="e.g. Family Feast" />
                </div>
                <div>
                    <label style={styles.label}>Price (Rs.)</label>
                    <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} style={styles.input} />
                </div>
            </div>

            <div>
                <label style={styles.label}>Description</label>
                <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={styles.input} placeholder="Short description..." />
            </div>

            {/* --- UPDATED: ITEM SELECTION WITH QUANTITY --- */}
            <div style={{display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', marginTop:'10px'}}>
                
                {/* LEFT: AVAILABLE ITEMS */}
                <div style={{flex: 1}}>
                    <label style={styles.label}>Available Items (Click to Add)</label>
                    <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', backgroundColor:'#fafafa' }}>
                        {menuItems.map(item => (
                            <div 
                                key={item.id} 
                                onClick={() => handleAddItem(item)}
                                style={{ 
                                    padding: '10px', borderBottom: '1px solid #eee', cursor: 'pointer', 
                                    display:'flex', justifyContent:'space-between',
                                    backgroundColor: 'white'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            >
                                <span>{item.name}</span>
                                <span style={{fontSize:'0.8rem', color:'#4CAF50'}}>+ Add</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: SELECTED ITEMS (WITH COUNTER) */}
                <div style={{flex: 1}}>
                    <label style={styles.label}>Selected Contents ({formData.comboItems.reduce((acc, i) => acc + i.qty, 0)} items)</label>
                    <div style={{ minHeight:'100px', maxHeight: '250px', overflowY: 'auto', border: '2px dashed #ccc', borderRadius: '6px', padding:'10px', backgroundColor:'#fff' }}>
                        
                        {formData.comboItems.length === 0 && <div style={{color:'#999', textAlign:'center', marginTop:'20px'}}>No items selected</div>}

                        {formData.comboItems.map((item, index) => (
                            <div key={index} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px', borderBottom:'1px solid #eee', backgroundColor:'#E3F2FD', borderRadius:'4px', marginBottom:'5px' }}>
                                <span style={{fontWeight:'bold', fontSize:'0.9rem'}}>{item.name}</span>
                                
                                <div style={{display:'flex', alignItems:'center', gap:'5px'}}>
                                    <button type="button" onClick={() => handleDecreaseItem(item.id)} style={styles.qtyBtn}>-</button>
                                    <span style={{fontWeight:'bold', width:'20px', textAlign:'center'}}>{item.qty}</span>
                                    <button type="button" onClick={() => handleAddItem(item)} style={styles.qtyBtn}>+</button>
                                    <button type="button" onClick={() => handleRemoveItemCompletely(item.id)} style={{...styles.qtyBtn, backgroundColor:'#FFEBEE', color:'red', marginLeft:'5px'}}>x</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            <div style={{display: 'flex', alignItems:'center', marginTop:'10px'}}>
                <label style={{display:'flex', alignItems:'center', cursor:'pointer'}}>
                    <input type="checkbox" checked={formData.isAvailable} onChange={e => setFormData({...formData, isAvailable: e.target.checked})} style={{marginRight:'10px', width:'20px', height:'20px'}} />
                    Active / Available?
                </label>
            </div>

            <button type="submit" style={{ padding: '12px', backgroundColor: editingId ? '#2196F3' : '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
              {editingId ? "Update Combo" : "Save Combo"}
            </button>
          </form>
        </div>
      )}

      {/* TABLE / LIST */}
      {isMobile ? (
          <div style={{ display: 'grid', gap: '15px' }}>
              {filteredCombos.map((combo) => (
                <div key={combo.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                        <div style={{fontWeight:'bold', fontSize:'1.1rem'}}>{combo.name}</div>
                        <span style={{ fontWeight:'bold', color: '#4CAF50' }}>Rs. {combo.price}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '10px', fontStyle: 'italic' }}>
                        {getContentsDisplay(combo.comboItems)}
                    </div>
                    <div style={{display:'flex', gap:'10px'}}>
                        <button onClick={() => handleEditClick(combo)} style={{flex:1, padding:'8px', background:'#eee', border:'none', borderRadius:'4px', cursor:'pointer'}}>Edit</button>
                        <button onClick={() => handleDelete(combo.id)} style={{flex:1, padding:'8px', background:'#FFEBEE', color:'#D32F2F', border:'none', borderRadius:'4px', cursor:'pointer'}}>Delete</button>
                    </div>
                </div>
              ))}
          </div>
      ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9f9f9', borderBottom: '1px solid #eee' }}>
                  <tr>
                    <th style={styles.th}>SN</th>
                    <th style={styles.th}>Combo Name</th>
                    <th style={styles.th}>Contents</th>
                    <th style={styles.th}>Price</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCombos.map((combo, index) => (
                        <tr key={combo.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={styles.td}>{index + 1}</td>
                        <td style={styles.td}><span style={{fontWeight:'bold'}}>{combo.name}</span></td>
                        <td style={{...styles.td, fontSize: '0.85rem', color: '#666', maxWidth: '300px'}}>
                            {getContentsDisplay(combo.comboItems)}
                        </td>
                        <td style={styles.td}>Rs. {combo.price}</td>
                        <td style={styles.td}>
                            {combo.isAvailable 
                                ? <span style={{color:'green', fontWeight:'bold', backgroundColor:'#E8F5E9', padding:'4px 8px', borderRadius:'4px'}}>Active</span> 
                                : <span style={{color:'red', fontWeight:'bold', backgroundColor:'#FFEBEE', padding:'4px 8px', borderRadius:'4px'}}>Inactive</span>}
                        </td>
                        <td style={styles.td}>
                            <button onClick={() => handleEditClick(combo)} style={{marginRight:'10px', padding:'6px 12px', background:'#E3F2FD', color:'#1976D2', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold'}}>Edit</button>
                            <button onClick={() => handleDelete(combo.id)} style={{padding:'6px 12px', background:'#FFEBEE', color:'#D32F2F', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold'}}>Delete</button>
                        </td>
                        </tr>
                  ))}
                </tbody>
              </table>
          </div>
      )}
    </div>
  );
};

const styles = {
    statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', textAlign: 'center' },
    statLabel: { color: '#888', fontSize: '0.9rem', marginBottom: '5px' },
    statValue: { fontSize: '1.5rem', fontWeight: 'bold' },
    input: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' },
    label: { display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 'bold', color: '#555' },
    th: { padding: '15px', textAlign: 'left', fontSize: '0.9rem', color: '#666', fontWeight: 'bold' },
    td: { padding: '15px', fontSize: '0.95rem', color: '#333' },
    qtyBtn: { width:'25px', height:'25px', borderRadius:'50%', border:'none', backgroundColor:'white', cursor:'pointer', fontWeight:'bold', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 2px rgba(0,0,0,0.2)' }
};

export default AdminCombos;