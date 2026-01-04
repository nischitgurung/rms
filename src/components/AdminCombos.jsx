import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

// HELPER: Auto-creates URL-friendly slugs
const generateSlug = (text) => {
    return text.toLowerCase().trim().replace(/[^\w ]+/g, '').replace(/ +/g, '-');    
};

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

  // Form Data (Added SEO Fields)
  const [formData, setFormData] = useState({
    name: '', 
    price: '', 
    description: '', 
    comboItems: [], 
    isAvailable: true,
    seoTitle: '',        // NEW: For Search Aliases
    seoDescription: '',  // NEW: To list contents for search
    slug: ''             // NEW: For URL
  });

  // --- 1. DATA FETCHING ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    const fetchData = async () => {
        try {
            const unsubCombos = onSnapshot(collection(db, "combos"), (snapshot) => {
                const fetchedCombos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCombos(fetchedCombos);
                calculateStats(fetchedCombos);
                setLoading(false);
            });

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

  const calculateStats = (data) => {
      const total = data.length;
      const active = data.filter(c => c.isAvailable).length;
      const totalPrices = data.reduce((acc, curr) => acc + (parseFloat(curr.price) || 0), 0);
      const avgPrice = total > 0 ? Math.round(totalPrices / total) : 0;
      setStats({ total, active, avgPrice });
  };

  const getContentsDisplay = (comboItems) => {
      if (!comboItems || comboItems.length === 0) return "No items";
      if (typeof comboItems[0] === 'string') return "Legacy Format (Edit to fix)";
      return comboItems.map(i => `${i.qty}x ${i.name}`).join(', ');
  };

  const handleAddItem = (item) => {
      setFormData(prev => {
          const existing = prev.comboItems.find(i => i.id === item.id);
          let newItems;
          if (existing) {
              newItems = prev.comboItems.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
          } else {
              newItems = [...prev.comboItems, { id: item.id, name: item.name, qty: 1 }];
          }
          return { ...prev, comboItems: newItems };
      });
  };

  const handleDecreaseItem = (itemId) => {
      setFormData(prev => {
          const existing = prev.comboItems.find(i => i.id === itemId);
          if (!existing) return prev;
          let newItems;
          if (existing.qty > 1) {
              newItems = prev.comboItems.map(i => i.id === itemId ? { ...i, qty: i.qty - 1 } : i);
          } else {
              newItems = prev.comboItems.filter(i => i.id !== itemId);
          }
          return { ...prev, comboItems: newItems };
      });
  };

  const handleRemoveItemCompletely = (itemId) => {
      setFormData(prev => ({ ...prev, comboItems: prev.comboItems.filter(i => i.id !== itemId) }));
  };

  const handleEditClick = (combo) => {
      let formattedItems = combo.comboItems || [];
      setFormData({
          name: combo.name,
          price: combo.price,
          description: combo.description || '',
          comboItems: formattedItems,
          isAvailable: combo.isAvailable,
          seoTitle: combo.seoTitle || '',
          seoDescription: combo.seoDescription || '',
          slug: combo.slug || generateSlug(combo.name)
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
        // AUTO-GENERATE SEO DESCRIPTION IF EMPTY
        // This ensures that searching for "Burger" finds the "Family Feast" combo
        let autoSeoDesc = formData.seoDescription;
        if (!autoSeoDesc) {
            const contents = formData.comboItems.map(i => `${i.qty}x ${i.name}`).join(', ');
            autoSeoDesc = `Includes: ${contents}`;
        }

        const flatIds = formData.comboItems.map(item => item.id);
        
        const payload = {
            name: formData.name,
            price: parseFloat(formData.price),
            description: formData.description,
            comboItems: formData.comboItems,
            isAvailable: formData.isAvailable,
            itemIds: flatIds,
            // SEO DATA
            seoTitle: formData.seoTitle || formData.name,
            seoDescription: autoSeoDesc,
            slug: formData.slug || generateSlug(formData.name),
            updatedAt: serverTimestamp(),
            createdAt: editingId ? (formData.createdAt || serverTimestamp()) : serverTimestamp()
        };

        if (editingId) {
            await updateDoc(doc(db, "combos", editingId), payload);
            alert("Combo Updated!");
        } else {
            await addDoc(collection(db, "combos"), payload);
            alert("Combo Created!");
        }
        setFormData({ name: '', price: '', description: '', comboItems: [], isAvailable: true, seoTitle: '', seoDescription: '', slug: '' });
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

  const filteredCombos = combos.filter(c => c.name.toLowerCase().includes(filterText.toLowerCase()));

  if (loading) return <div style={{padding:'40px', textAlign:'center'}}>Loading Combos...</div>;

  return (
    <div style={{ padding: isMobile ? '10px' : '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '20px', gap: '15px' }}>
        <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.5rem', textTransform: 'uppercase' }}>Combo Offers</h1>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>Manage bundles and special deals</div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
            <button onClick={() => navigate('/')} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', background: 'white', borderRadius: '6px' }}>Back</button>
            <button 
              onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ name: '', price: '', description: '', comboItems: [], isAvailable: true, seoTitle: '', seoDescription: '', slug: '' }); }} 
              style={{ flex: 2, padding: '10px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}
            >
              {showForm ? "✕ Close" : "+ Add Combo"}
            </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
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

      {/* FORM */}
      {showForm && (
        <div style={{ backgroundColor: 'white', padding: isMobile ? '15px' : '25px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', borderLeft: '5px solid #000' }}>
          <h3 style={{marginTop:0, fontSize: '1.1rem'}}>{editingId ? "Edit Combo" : "Create New Combo"}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
            
            <div style={{display:'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap:'15px'}}>
                <div>
                    <label style={styles.label}>Combo Name</label>
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value, slug: generateSlug(e.target.value)})} style={styles.input} placeholder="e.g. Family Feast" />
                </div>
                <div>
                    <label style={styles.label}>Price (Rs.)</label>
                    <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} style={styles.input} />
                </div>
            </div>

            {/* SELECTION AREA */}
            <div style={{display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '20px', marginTop:'10px'}}>
                
                {/* SELECTED ITEMS */}
                <div style={{flex: 1, order: isMobile ? 1 : 2}}>
                    <label style={styles.label}>Current Bundle ({formData.comboItems.reduce((acc, i) => acc + i.qty, 0)} items)</label>
                    <div style={{ minHeight: '80px', maxHeight: '200px', overflowY: 'auto', border: '2px dashed #ccc', borderRadius: '6px', padding:'10px', backgroundColor: '#fcfcfc' }}>
                        {formData.comboItems.length === 0 && <div style={{color:'#999', textAlign:'center', fontSize: '0.85rem', marginTop: '10px'}}>Bundle is empty. Add items below.</div>}
                        {formData.comboItems.map((item, index) => (
                            <div key={index} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px', borderBottom:'1px solid #eee', backgroundColor:'#E3F2FD', borderRadius:'4px', marginBottom:'5px' }}>
                                <span style={{fontWeight:'bold', fontSize:'0.85rem'}}>{item.name}</span>
                                <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                                    <button type="button" onClick={() => handleDecreaseItem(item.id)} style={styles.qtyBtn}>-</button>
                                    <span style={{fontWeight:'bold', minWidth: '15px', textAlign:'center'}}>{item.qty}</span>
                                    <button type="button" onClick={() => handleAddItem(item)} style={styles.qtyBtn}>+</button>
                                    <button type="button" onClick={() => handleRemoveItemCompletely(item.id)} style={{...styles.qtyBtn, backgroundColor:'#FFEBEE', color:'red'}}>×</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AVAILABLE ITEMS */}
                <div style={{flex: 1, order: isMobile ? 2 : 1}}>
                    <label style={styles.label}>Add Items to Bundle</label>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', backgroundColor:'white' }}>
                        {menuItems.map(item => (
                            <div key={item.id} onClick={() => handleAddItem(item)} style={{ padding: '12px', borderBottom: '1px solid #eee', display:'flex', justifyContent:'space-between', cursor: 'pointer' }}>
                                <span style={{fontSize: '0.9rem'}}>{item.name}</span>
                                <span style={{fontSize:'0.8rem', color:'#4CAF50', fontWeight:'bold'}}>+ Add</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* SEO & AVAILABILITY SECTION */}
            <div style={styles.seoBox}>
                <h4 style={{margin:'0 0 10px 0', fontSize:'0.9rem', color:'#555'}}>🔍 SEO & Search Settings</h4>
                <div style={{display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'15px'}}>
                    <div>
                        <label style={styles.label}>Search Keywords (SEO Title)</label>
                        <input placeholder="Ex: Burger Deal, Lunch Offer" value={formData.seoTitle} onChange={e => setFormData({...formData, seoTitle: e.target.value})} style={styles.input} />
                    </div>
                    <div>
                        <label style={styles.label}>URL Slug</label>
                        <input value={formData.slug} readOnly style={{...styles.input, backgroundColor:'#f9f9f9'}} />
                    </div>
                </div>
                <div style={{marginTop:'10px'}}>
                    <label style={styles.label}>Search Description (Lists contents if empty)</label>
                    <textarea 
                        placeholder="Leave blank to auto-generate from Bundle contents..." 
                        value={formData.seoDescription} 
                        onChange={e => setFormData({...formData, seoDescription: e.target.value})} 
                        style={{...styles.input, height:'50px'}} 
                    />
                </div>
            </div>

            <div style={{display: 'flex', alignItems:'center', margin:'10px 0'}}>
                <label style={{display:'flex', alignItems:'center', cursor:'pointer', fontSize: '0.9rem'}}>
                    <input type="checkbox" checked={formData.isAvailable} onChange={e => setFormData({...formData, isAvailable: e.target.checked})} style={{marginRight:'10px', width:'22px', height:'22px'}} />
                    Enable this Combo Deal
                </label>
            </div>

            <button type="submit" style={{ padding: '15px', backgroundColor: editingId ? '#2196F3' : 'black', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem' }}>
              {editingId ? "Update Combo" : "Create Deal"}
            </button>
          </form>
        </div>
      )}

      {/* DATA VIEW */}
      {isMobile ? (
          <div style={{ display: 'grid', gap: '15px' }}>
              {filteredCombos.map((combo) => (
                <div key={combo.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{fontWeight:'bold', fontSize:'1rem'}}>{combo.name}</div>
                        <span style={{ fontWeight:'bold', color: '#4CAF50' }}>Rs. {combo.price}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '15px', lineHeight: '1.4' }}>
                        <strong>Includes:</strong> {getContentsDisplay(combo.comboItems)}
                    </div>
                    <div style={{display:'flex', gap:'10px'}}>
                        <button onClick={() => handleEditClick(combo)} style={{flex:1, padding:'10px', background:'#E3F2FD', color:'#1976D2', border:'none', borderRadius:'6px', fontWeight:'bold'}}>Edit</button>
                        <button onClick={() => handleDelete(combo.id)} style={{flex:1, padding:'10px', background:'#FFEBEE', color:'#D32F2F', border:'none', borderRadius:'6px', fontWeight:'bold'}}>Delete</button>
                    </div>
                </div>
              ))}
          </div>
      ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9f9f9', borderBottom: '1px solid #eee' }}>
                  <tr>
                    <th style={styles.th}>Combo Name</th>
                    <th style={styles.th}>Contents (Searchable)</th>
                    <th style={styles.th}>Price</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCombos.map((combo) => (
                    <tr key={combo.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={styles.td}><span style={{fontWeight:'bold'}}>{combo.name}</span></td>
                      <td style={{...styles.td, fontSize: '0.85rem', color: '#666', maxWidth: '300px'}}>{getContentsDisplay(combo.comboItems)}</td>
                      <td style={styles.td}>Rs. {combo.price}</td>
                      <td style={styles.td}>{combo.isAvailable ? <span style={{color:'green', fontWeight:'bold'}}>Active</span> : <span style={{color:'red'}}>Inactive</span>}</td>
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
    statCard: { backgroundColor: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #eee', textAlign: 'center' },
    statLabel: { color: '#888', fontSize: '0.8rem', marginBottom: '5px' },
    statValue: { fontSize: '1.2rem', fontWeight: 'bold' },
    input: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' },
    label: { display: 'block', marginBottom: '5px', fontSize: '0.85rem', fontWeight: 'bold', color: '#555' },
    th: { padding: '15px', textAlign: 'left', fontSize: '0.85rem', color: '#666', fontWeight: 'bold' },
    td: { padding: '15px', fontSize: '0.9rem', color: '#333' },
    qtyBtn: { width:'28px', height:'28px', borderRadius:'6px', border:'none', backgroundColor:'white', cursor:'pointer', fontWeight:'bold', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.1)' },
    seoBox: { background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee', marginTop: '10px', marginBottom: '10px' }
};

export default AdminCombos;