import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

const AddonManager = () => {
  const navigate = useNavigate();
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Simple Form State
  const [newAddon, setNewAddon] = useState({ name: '', price: '' });

  // 1. Fetch Add-ons
  const fetchAddons = async () => {
    const snapshot = await getDocs(collection(db, "modifiers"));
    setAddons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  useEffect(() => { fetchAddons(); }, []);

  // 2. Add Logic
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newAddon.name || !newAddon.price) return;

    await addDoc(collection(db, "modifiers"), {
      name: newAddon.name,
      price: parseFloat(newAddon.price),
      isAvailable: true
    });

    setNewAddon({ name: '', price: '' });
    fetchAddons(); // Refresh list
  };

  // 3. Delete Logic
  const handleDelete = async (id) => {
    if (window.confirm("Delete this add-on?")) {
      await deleteDoc(doc(db, "modifiers", id));
      fetchAddons();
    }
  };

  if (loading) return <div style={{padding:'40px'}}>Loading Extras...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <button onClick={() => navigate('/')} style={{ marginRight: '20px', padding: '10px' }}>← Back</button>
        <h1>Ads On & Extras</h1>
      </div>

      {/* --- SIMPLE ADD FORM --- */}
      <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '10px', marginBottom: '30px', display: 'flex', gap: '10px' }}>
        <input 
          type="text" placeholder="Add-on Name (e.g., Extra Cheese)" 
          value={newAddon.name} onChange={e => setNewAddon({...newAddon, name: e.target.value})}
          style={{ flex: 2, padding: '10px', border: '1px solid #ccc' }}
        />
        <input 
          type="number" placeholder="Price ($)" 
          value={newAddon.price} onChange={e => setNewAddon({...newAddon, price: e.target.value})}
          style={{ flex: 1, padding: '10px', border: '1px solid #ccc' }}
        />
        <button 
          onClick={handleAdd}
          style={{ flex: 1, backgroundColor: 'black', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Add New
        </button>
      </div>

      {/* --- TABLE MATCHING PDF PAGE 35 --- */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ backgroundColor: '#eee' }}>
          <tr>
            <th style={{ padding: '15px', textAlign: 'left' }}>Ad On Name</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Price</th>
            <th style={{ padding: '15px', textAlign: 'center' }}>Available</th>
            <th style={{ padding: '15px', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {addons.map((item, index) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '15px' }}>{item.name}</td>
              <td style={{ padding: '15px' }}>${item.price.toFixed(2)}</td>
              <td style={{ padding: '15px', textAlign: 'center', color: 'green' }}>Yes</td>
              <td style={{ padding: '15px', textAlign: 'center' }}>
                <button 
                  onClick={() => handleDelete(item.id)}
                  style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AddonManager;