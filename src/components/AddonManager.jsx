import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

const AddonManager = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null); // To track if we are editing
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    isAvailable: true
  });

  // --- 1. REAL-TIME DATA FETCHING ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    // Use onSnapshot for live updates
    const unsubscribe = onSnapshot(collection(db, "modifiers"), (snapshot) => {
      const fetchedAddons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by name or creation time if you want
      setAddons(fetchedAddons);
      setLoading(false);
    });

    return () => {
        unsubscribe();
        window.removeEventListener('resize', handleResize);
    };
  }, []);

  // --- 2. FORM HANDLERS ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return alert("Name and Price are required!");

    try {
        const payload = {
            name: formData.name,
            price: parseFloat(formData.price),
            isAvailable: formData.isAvailable,
            updatedAt: serverTimestamp()
        };

        if (editingId) {
            // UPDATE Existing
            await updateDoc(doc(db, "modifiers", editingId), payload);
            alert("Add-on Updated Successfully!");
        } else {
            // CREATE New
            await addDoc(collection(db, "modifiers"), {
                ...payload,
                createdAt: serverTimestamp()
            });
            alert("Add-on Created Successfully!");
        }

        // Reset Form
        setFormData({ name: '', price: '', isAvailable: true });
        setEditingId(null);

    } catch (error) {
        console.error("Error saving:", error);
        alert("Failed to save.");
    }
  };

  const handleEditClick = (item) => {
      setFormData({
          name: item.name,
          price: item.price,
          isAvailable: item.isAvailable !== undefined ? item.isAvailable : true
      });
      setEditingId(item.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this Add-on?")) {
      try {
          await deleteDoc(doc(db, "modifiers", id));
      } catch (error) {
          console.error("Error deleting:", error);
          alert("Failed to delete.");
      }
    }
  };

  const handleCancelEdit = () => {
      setFormData({ name: '', price: '', isAvailable: true });
      setEditingId(null);
  };

  if (loading) return <div style={{padding:'40px', textAlign:'center'}}>Loading Add-ons...</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', textTransform: 'uppercase' }}>Add-ons & Extras</h1>
            <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>Manage extra toppings and sides</div>
        </div>
        <button onClick={() => navigate('/')} style={{ padding: '10px 20px', border: '1px solid #ccc', background: 'white', borderRadius: '6px', cursor: 'pointer' }}>Back to Dashboard</button>
      </div>

      {/* --- DYNAMIC FORM (ADD & EDIT) --- */}
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', borderLeft: `5px solid ${editingId ? '#2196F3' : 'black'}` }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>{editingId ? "Edit Add-on" : "Add New Extra"}</h3>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '15px' }}>
                <div style={{ flex: 2 }}>
                    <label style={styles.label}>Name</label>
                    <input 
                        type="text" 
                        placeholder="e.g. Extra Cheese" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        style={styles.input}
                        required
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={styles.label}>Price (Rs.)</label>
                    <input 
                        type="number" 
                        placeholder="0.00" 
                        value={formData.price} 
                        onChange={e => setFormData({...formData, price: e.target.value})}
                        style={styles.input}
                        required
                    />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                    type="checkbox" 
                    id="isAvailable"
                    checked={formData.isAvailable} 
                    onChange={e => setFormData({...formData, isAvailable: e.target.checked})}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="isAvailable" style={{ cursor: 'pointer', fontSize: '0.95rem' }}>Available for Order?</label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                <button 
                    type="submit"
                    style={{ ...styles.btn, backgroundColor: editingId ? '#2196F3' : 'black', flex: 1 }}
                >
                    {editingId ? "Update Add-on" : "+ Add Item"}
                </button>
                
                {editingId && (
                    <button 
                        type="button" 
                        onClick={handleCancelEdit}
                        style={{ ...styles.btn, backgroundColor: '#999', flex: 0.5 }}
                    >
                        Cancel
                    </button>
                )}
            </div>
        </form>
      </div>

      {/* --- DATA TABLE --- */}
      <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f9f9f9', borderBottom: '1px solid #eee' }}>
            <tr>
              <th style={styles.th}>SN</th>
              <th style={styles.th}>Ad On Name</th>
              <th style={styles.th}>Price</th>
              <th style={{...styles.th, textAlign:'center'}}>Status</th>
              <th style={{...styles.th, textAlign:'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {addons.length === 0 && (
                <tr><td colSpan="5" style={{padding:'20px', textAlign:'center', color:'#888'}}>No add-ons found. Add one above!</td></tr>
            )}
            {addons.map((item, index) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={styles.td}>{index + 1}</td>
                <td style={{...styles.td, fontWeight:'bold'}}>{item.name}</td>
                <td style={styles.td}>Rs. {item.price.toFixed(2)}</td>
                <td style={{...styles.td, textAlign:'center'}}>
                    {item.isAvailable 
                        ? <span style={styles.statusActive}>Available</span> 
                        : <span style={styles.statusInactive}>Unavailable</span>
                    }
                </td>
                <td style={{...styles.td, textAlign:'right'}}>
                  <button 
                    onClick={() => handleEditClick(item)}
                    style={{ ...styles.actionBtn, backgroundColor: '#E3F2FD', color: '#1976D2', marginRight: '10px' }}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(item.id)}
                    style={{ ...styles.actionBtn, backgroundColor: '#FFEBEE', color: '#D32F2F' }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- STYLES ---
const styles = {
    label: { display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' },
    btn: { padding: '12px', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' },
    th: { padding: '15px', textAlign: 'left', fontSize: '0.9rem', color: '#666', fontWeight: 'bold', borderBottom: '2px solid #eee' },
    td: { padding: '15px', fontSize: '0.95rem', color: '#333' },
    actionBtn: { padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' },
    statusActive: { color: 'green', backgroundColor: '#E8F5E9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' },
    statusInactive: { color: 'red', backgroundColor: '#FFEBEE', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }
};

export default AddonManager;