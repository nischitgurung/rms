import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const AdminMenu = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Stats State
  const [stats, setStats] = useState({ total: 0, topSold: '-', mostCategory: '-' });

  // Filter State
  const [filterText, setFilterText] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  // Form & Editing State
  const [editingId, setEditingId] = useState(null); 
  const [formData, setFormData] = useState({
    name: '', 
    price: '', 
    categoryId: 'mains', 
    type: 'Veg', 
    description: '', 
    isAvailable: true
  });

  // --- 1. DATA FETCHING ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    const fetchData = async () => {
        try {
            const itemSnap = await getDocs(collection(db, "menu_items"));
            const fetchedItems = itemSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setItems(fetchedItems);

            const orderSnap = await getDocs(collection(db, "orders"));
            const fetchedOrders = orderSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(fetchedOrders);

            calculateStats(fetchedItems, fetchedOrders);
            setLoading(false);
        } catch(err) {
            console.error(err);
            setLoading(false);
        }
    };
    fetchData();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- 2. CALCULATE DYNAMIC STATS ---
  const calculateStats = (itemsData, ordersData) => {
      const total = itemsData.length;

      const catCounts = itemsData.reduce((acc, item) => {
          acc[item.categoryId] = (acc[item.categoryId] || 0) + 1;
          return acc;
      }, {});
      const mostCategory = Object.keys(catCounts).reduce((a, b) => catCounts[a] > catCounts[b] ? a : b, '-');

      const itemSales = {};
      ordersData.forEach(order => {
          if(order.items && Array.isArray(order.items)) {
              order.items.forEach(item => {
                  itemSales[item.name] = (itemSales[item.name] || 0) + item.qty;
              });
          }
      });
      const topSold = Object.keys(itemSales).reduce((a, b) => itemSales[a] > itemSales[b] ? a : b, '-');

      setStats({ total, topSold, mostCategory });
  };

  // --- 3. FORM HANDLERS ---
  const handleEditClick = (item) => {
      setFormData(item);
      setEditingId(item.id);
      setShowForm(true);
      window.scrollTo(0, 0); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return alert("Name and Price are required!");

    try {
        const payload = {
            ...formData,
            price: parseFloat(formData.price),
            createdAt: editingId ? formData.createdAt : serverTimestamp() 
        };

        if (editingId) {
            await updateDoc(doc(db, "menu_items", editingId), payload);
            alert("Dish Updated Successfully!");
        } else {
            await addDoc(collection(db, "menu_items"), payload);
            alert("Dish Added Successfully!");
        }

        setFormData({ name: '', price: '', categoryId: 'mains', type: 'Veg', description: '', isAvailable: true });
        setEditingId(null);
        setShowForm(false);
        
        const refreshSnap = await getDocs(collection(db, "menu_items"));
        const refreshItems = refreshSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(refreshItems);
        calculateStats(refreshItems, orders); 

    } catch (error) {
        console.error("Error saving:", error);
        alert("Failed to save.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this dish?")) {
      await deleteDoc(doc(db, "menu_items", id));
      const newItems = items.filter(i => i.id !== id);
      setItems(newItems);
      calculateStats(newItems, orders);
    }
  };

  // --- 4. FILTER LOGIC ---
  const filteredItems = items.filter(item => {
      const matchesText = item.name.toLowerCase().includes(filterText.toLowerCase());
      const matchesCategory = filterCategory === 'All' || item.categoryId === filterCategory;
      return matchesText && matchesCategory;
  });

  // --- 5. HELPER: GET TYPE STYLE ---
  const getTypeStyle = (type) => {
      const label = type || 'Veg'; // Default to Veg if missing
      
      if (label === 'Non-Veg') {
          return { bg: '#FFEBEE', color: '#C62828', border: '#EF9A9A' }; // Red
      } else if (label === 'Drinks') {
          return { bg: '#E3F2FD', color: '#1565C0', border: '#90CAF9' }; // Blue
      } else {
          return { bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7' }; // Green (Veg & Default)
      }
  };

  if (loading) return <div style={{padding:'40px'}}>Loading...</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '20px', gap: '15px' }}>
        <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', textTransform: 'uppercase' }}>Menu Dishes</h1>
            <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>Manage your restaurant menu items</div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
            <button onClick={() => navigate('/')} style={{ flex: isMobile ? 1 : 'none', padding: '10px 20px', border: '1px solid #ccc', background: 'white', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
            <button 
              onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ name: '', price: '', categoryId: 'mains', type: 'Veg', description: '', isAvailable: true }); }} 
              style={{ flex: isMobile ? 2 : 'none', padding: '10px 20px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {showForm ? "Close Form" : "+ Add New Dish"}
            </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px' }}>
          <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Dishes</div>
              <div style={styles.statValue}>{stats.total}/100</div>
          </div>
          <div style={styles.statCard}>
              <div style={styles.statLabel}>Top Sold</div>
              <div style={{...styles.statValue, color: '#4CAF50', fontSize:'1.1rem'}}>{stats.topSold}</div>
          </div>
          <div style={styles.statCard}>
              <div style={styles.statLabel}>Most Dishes Category</div>
              <div style={{...styles.statValue, textTransform:'capitalize'}}>{stats.mostCategory}</div>
          </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="Search by Dish Name..." 
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{ flex: 2, padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}
          />
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #ddd' }}
          >
              <option value="All">All Categories</option>
              <option value="starters">Starters</option>
              <option value="mains">Mains</option>
              <option value="drinks">Drinks</option>
          </select>
      </div>

      {/* FORM */}
      {showForm && (
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', borderLeft: '5px solid #000' }}>
          <h3 style={{marginTop:0}}>{editingId ? "Edit Dish" : "Add New Dish"}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px', maxWidth: '800px' }}>
            
            <div style={{display:'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap:'15px'}}>
                <div>
                    <label style={styles.label}>Dish Name</label>
                    <input 
                      type="text" required
                      value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                      style={styles.input} 
                    />
                </div>
                <div>
                    <label style={styles.label}>Type</label>
                    <select 
                        value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}
                        style={styles.input}
                    >
                        <option value="Veg">Veg</option>
                        <option value="Non-Veg">Non-Veg</option>
                        <option value="Drinks">Drinks</option>
                    </select>
                </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '15px' }}>
              <div>
                  <label style={styles.label}>Price (Rs.)</label>
                  <input 
                    type="number" required
                    value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})}
                    style={styles.input} 
                  />
              </div>
              <div>
                  <label style={styles.label}>Category</label>
                  <select 
                    value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}
                    style={styles.input}
                  >
                    <option value="starters">Starters</option>
                    <option value="mains">Mains</option>
                    <option value="drinks">Drinks</option>
                  </select>
              </div>
              <div style={{display: 'flex', alignItems:'center', marginTop:'25px'}}>
                  <label style={{display:'flex', alignItems:'center', cursor:'pointer'}}>
                      <input 
                        type="checkbox" 
                        checked={formData.isAvailable} 
                        onChange={e => setFormData({...formData, isAvailable: e.target.checked})}
                        style={{marginRight:'10px', width:'20px', height:'20px'}}
                      />
                      Available?
                  </label>
              </div>
            </div>

            <button type="submit" style={{ padding: '12px', backgroundColor: editingId ? '#2196F3' : '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
              {editingId ? "Update Dish" : "Save Dish"}
            </button>
          </form>
        </div>
      )}

      {/* --- RESPONSIVE LIST --- */}
      
      {isMobile ? (
          // MOBILE CARDS
          <div style={{ display: 'grid', gap: '15px' }}>
              {filteredItems.map((item) => {
                  const style = getTypeStyle(item.type);
                  return (
                    <div key={item.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                            <div style={{fontWeight:'bold', fontSize:'1.1rem'}}>{item.name}</div>
                            <span style={{
                                padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                                backgroundColor: style.bg, color: style.color
                            }}>
                                ● {item.type || 'Veg'}
                            </span>
                        </div>
                        <div style={{display:'flex', justifyContent:'space-between', color:'#666', fontSize:'0.9rem', marginBottom:'15px'}}>
                            <span>{item.categoryId}</span>
                            <span style={{color:'black', fontWeight:'bold'}}>Rs. {item.price}</span>
                        </div>
                        <div style={{display:'flex', gap:'10px'}}>
                            <button onClick={() => handleEditClick(item)} style={{flex:1, padding:'8px', background:'#eee', border:'none', borderRadius:'4px', cursor:'pointer'}}>Edit</button>
                            <button onClick={() => handleDelete(item.id)} style={{flex:1, padding:'8px', background:'#FFEBEE', color:'#D32F2F', border:'none', borderRadius:'4px', cursor:'pointer'}}>Delete</button>
                        </div>
                    </div>
                  );
              })}
          </div>
      ) : (
          // DESKTOP TABLE
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9f9f9', borderBottom: '1px solid #eee' }}>
                  <tr>
                    <th style={styles.th}>SN</th>
                    <th style={styles.th}>Dish Name</th>
                    <th style={styles.th}>Price</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Available</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => {
                    const style = getTypeStyle(item.type);
                    return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={styles.td}>{index + 1}</td>
                        <td style={styles.td}>
                            <span style={{fontWeight:'bold'}}>{item.name}</span>
                        </td>
                        <td style={styles.td}>Rs. {item.price}</td>
                        <td style={{...styles.td, textTransform: 'capitalize'}}>{item.categoryId}</td>
                        
                        {/* TYPE INDICATOR - FIXED GREEN DEFAULT */}
                        <td style={styles.td}>
                            <span style={{
                                padding: '4px 10px', borderRadius: '15px', fontSize: '0.8rem', fontWeight: 'bold',
                                backgroundColor: style.bg,
                                color: style.color,
                                border: `1px solid ${style.border}`
                            }}>
                                ● {item.type || 'Veg'} 
                            </span>
                        </td>

                        <td style={styles.td}>
                            {item.isAvailable 
                                ? <span style={{color:'green', fontWeight:'bold', backgroundColor:'#E8F5E9', padding:'4px 8px', borderRadius:'4px'}}>Yes</span> 
                                : <span style={{color:'red', fontWeight:'bold', backgroundColor:'#FFEBEE', padding:'4px 8px', borderRadius:'4px'}}>No</span>}
                        </td>
                        
                        <td style={styles.td}>
                            <button onClick={() => handleEditClick(item)} style={{marginRight:'10px', padding:'6px 12px', background:'#E3F2FD', color:'#1976D2', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold'}}>Edit</button>
                            <button onClick={() => handleDelete(item.id)} style={{padding:'6px 12px', background:'#FFEBEE', color:'#D32F2F', border:'none', borderRadius:'4px', cursor:'pointer', fontWeight:'bold'}}>Delete</button>
                        </td>
                        </tr>
                    );
                  })}
                </tbody>
              </table>
          </div>
      )}

    </div>
  );
};

const styles = {
    statCard: {
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
        textAlign: 'center'
    },
    statLabel: { color: '#888', fontSize: '0.9rem', marginBottom: '5px' },
    statValue: { fontSize: '1.5rem', fontWeight: 'bold' },
    input: {
        width: '100%',
        padding: '12px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '1rem',
        boxSizing: 'border-box'
    },
    label: {
        display: 'block',
        marginBottom: '5px',
        fontSize: '0.9rem',
        fontWeight: 'bold',
        color: '#555'
    },
    th: {
        padding: '15px',
        textAlign: 'left',
        fontSize: '0.9rem',
        color: '#666',
        fontWeight: 'bold'
    },
    td: {
        padding: '15px',
        fontSize: '0.95rem',
        color: '#333'
    }
};

export default AdminMenu;