import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';

const AdminMenu = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [newItem, setNewItem] = useState({
    name: '', price: '', categoryId: 'mains', description: '', isAvailable: true
  });

  // 1. Fetch Menu Items
  const fetchItems = async () => {
    const snapshot = await getDocs(collection(db, "menu_items"));
    setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  // 2. Add New Item Logic
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return alert("Name and Price are required!");

    await addDoc(collection(db, "menu_items"), {
      ...newItem,
      price: parseFloat(newItem.price), // Ensure price is a number
      createdAt: new Date()
    });

    alert("Item Added!");
    setShowForm(false);
    setNewItem({ name: '', price: '', categoryId: 'mains', description: '', isAvailable: true });
    fetchItems(); // Refresh list
  };

  // 3. Delete Item Logic
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      await deleteDoc(doc(db, "menu_items", id));
      fetchItems();
    }
  };

  if (loading) return <div style={{padding:'40px'}}>Loading Menu Admin...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={() => navigate('/')} style={{ marginRight: '20px', padding: '10px' }}>← Back</button>
          <h1>Menu Manager</h1>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)} 
          style={{ padding: '10px 20px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {showForm ? "Cancel" : "+ Add New Dish"}
        </button>
      </div>

      {/* --- ADD NEW ITEM FORM (Collapsible) --- */}
      {showForm && (
        <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '10px', marginBottom: '30px', backgroundColor: '#f9f9f9' }}>
          <h3>Add New Dish</h3>
          <form onSubmit={handleAddItem} style={{ display: 'grid', gap: '15px' }}>
            <input 
              type="text" placeholder="Dish Name (e.g., Spicy Momos)" 
              value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})}
              style={{ padding: '10px', border: '1px solid #ccc' }} 
            />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <input 
                type="number" placeholder="Price (e.g., 12.50)" 
                value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})}
                style={{ padding: '10px', border: '1px solid #ccc' }} 
              />
              <select 
                value={newItem.categoryId} onChange={e => setNewItem({...newItem, categoryId: e.target.value})}
                style={{ padding: '10px', border: '1px solid #ccc' }}
              >
                <option value="starters">Starters</option>
                <option value="mains">Mains</option>
                <option value="drinks">Drinks</option>
              </select>
            </div>

            <textarea 
              placeholder="Description (Optional)" 
              value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})}
              style={{ padding: '10px', border: '1px solid #ccc', height: '60px' }} 
            />

            <button type="submit" style={{ padding: '15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
              Save Dish
            </button>
          </form>
        </div>
      )}

      {/* --- MENU TABLE Matches PDF Page 26 --- */}
      <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <thead style={{ backgroundColor: '#f5f5f5', textAlign: 'left' }}>
          <tr>
            <th style={{ padding: '15px' }}>Dish Name</th>
            <th style={{ padding: '15px' }}>Price</th>
            <th style={{ padding: '15px' }}>Category</th>
            <th style={{ padding: '15px' }}>Available?</th>
            <th style={{ padding: '15px', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '15px', fontWeight: 'bold' }}>{item.name}</td>
              <td style={{ padding: '15px' }}>${item.price}</td>
              <td style={{ padding: '15px', textTransform: 'capitalize' }}>{item.categoryId}</td>
              <td style={{ padding: '15px' }}>
                {item.isAvailable ? <span style={{color:'green'}}>Yes</span> : <span style={{color:'red'}}>No</span>}
              </td>
              <td style={{ padding: '15px', textAlign: 'center' }}>
                <button 
                  onClick={() => handleDelete(item.id)}
                  style={{ padding: '5px 10px', backgroundColor: '#D32F2F', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
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

export default AdminMenu;