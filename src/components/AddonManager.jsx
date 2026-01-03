import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

const AddonManager = () => {
  const navigate = useNavigate();
  
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    isAvailable: true
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    const unsubscribe = onSnapshot(collection(db, "modifiers"), (snapshot) => {
      const fetchedAddons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAddons(fetchedAddons);
      setLoading(false);
    });

    return () => {
        unsubscribe();
        window.removeEventListener('resize', handleResize);
    };
  }, []);

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
            await updateDoc(doc(db, "modifiers", editingId), payload);
            alert("Add-on Updated Successfully!");
        } else {
            await addDoc(collection(db, "modifiers"), {
                ...payload,
                createdAt: serverTimestamp()
            });
            alert("Add-on Created Successfully!");
        }

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
    <div style={{ padding: isMobile ? '10px' : '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER - Stacked on Mobile */}
      <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          justifyContent: 'space-between', 
          marginBottom: '20px',
          gap: '15px'
      }}>
        <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.5rem', textTransform: 'uppercase' }}>Add-ons & Extras</h1>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>Manage extra toppings and sides</div>
        </div>
        <button 
          onClick={() => navigate('/')} 
          style={{ 
            width: isMobile ? '100%' : 'auto',
            padding: '10px 20px', 
            border: '1px solid #ccc', 
            background: 'white', 
            borderRadius: '6px', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}>
            Back to Dashboard
        </button>
      </div>

      {/* --- DYNAMIC FORM --- */}
      <div style={{ 
          backgroundColor: 'white', 
          padding: isMobile ? '15px' : '20px', 
          borderRadius: '12px', 
          marginBottom: '30px', 
          boxShadow: '0 4px 6px rgba(0,0,0,0.05)', 
          borderLeft: `5px solid ${editingId ? '#2196F3' : 'black'}` 
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '1.1rem' }}>{editingId ? "Edit Add-on" : "Add New Extra"}</h3>
        
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 0' }}>
                <input 
                    type="checkbox" 
                    id="isAvailable"
                    checked={formData.isAvailable} 
                    onChange={e => setFormData({...formData, isAvailable: e.target.checked})}
                    style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                />
                <label htmlFor="isAvailable" style={{ cursor: 'pointer', fontSize: '1rem' }}>Available for Order?</label>
            </div>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', marginTop: '5px' }}>
                <button 
                    type="submit"
                    style={{ ...styles.btn, backgroundColor: editingId ? '#2196F3' : 'black', flex: 1, height: '50px' }}
                >
                    {editingId ? "Update Add-on" : "+ Add Item"}
                </button>
                
                {editingId && (
                    <button 
                        type="button" 
                        onClick={handleCancelEdit}
                        style={{ ...styles.btn, backgroundColor: '#999', flex: 0.5, height: '50px' }}
                    >
                        Cancel
                    </button>
                )}
            </div>
        </form>
      </div>

      {/* --- DATA VIEW --- */}
      {isMobile ? (
        /* MOBILE CARD VIEW */
        <div style={{ display: 'grid', gap: '15px' }}>
            {addons.map((item, index) => (
                <div key={item.id} style={{ 
                    backgroundColor: 'white', 
                    borderRadius: '12px', 
                    padding: '15px', 
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    border: '1px solid #eee'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                            <span style={{ fontSize: '0.75rem', color: '#999' }}>#{index + 1}</span>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginTop: '2px' }}>{item.name}</div>
                        </div>
                        <div style={{ fontWeight: 'bold', color: '#333' }}>Rs. {item.price.toFixed(2)}</div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #f0f0f0' }}>
                        <div>
                            {item.isAvailable 
                                ? <span style={styles.statusActive}>Available</span> 
                                : <span style={styles.statusInactive}>Unavailable</span>
                            }
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={() => handleEditClick(item)}
                                style={{ ...styles.actionBtn, backgroundColor: '#E3F2FD', color: '#1976D2', padding: '10px 15px' }}
                            >
                                Edit
                            </button>
                            <button 
                                onClick={() => handleDelete(item.id)}
                                style={{ ...styles.actionBtn, backgroundColor: '#FFEBEE', color: '#D32F2F', padding: '10px 15px' }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            {addons.length === 0 && <div style={{textAlign:'center', color:'#888', padding:'20px'}}>No items found.</div>}
        </div>
      ) : (
        /* DESKTOP TABLE VIEW */
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
                      <button onClick={() => handleEditClick(item)} style={{ ...styles.actionBtn, backgroundColor: '#E3F2FD', color: '#1976D2', marginRight: '10px' }}>Edit</button>
                      <button onClick={() => handleDelete(item.id)} style={{ ...styles.actionBtn, backgroundColor: '#FFEBEE', color: '#D32F2F' }}>Delete</button>
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

// --- STYLES ---
const styles = {
    label: { display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' },
    btn: { padding: '12px', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' },
    th: { padding: '15px', textAlign: 'left', fontSize: '0.9rem', color: '#666', fontWeight: 'bold', borderBottom: '2px solid #eee' },
    td: { padding: '15px', fontSize: '0.95rem', color: '#333' },
    actionBtn: { border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' },
    statusActive: { color: 'green', backgroundColor: '#E8F5E9', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' },
    statusInactive: { color: 'red', backgroundColor: '#FFEBEE', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }
};

export default AddonManager;