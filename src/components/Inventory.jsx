import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';

const Inventory = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Inventory Logic
  const fetchInventory = async () => {
    try {
      const snapshot = await getDocs(collection(db, "inventory"));
      const inventoryData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(inventoryData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // 2. Helper: Calculate Status based on quantity
  // Matches PDF logic [cite: 261-267] (Low vs Critical)
  const getStockStatus = (qty) => {
    if (qty <= 2) return { label: 'Critical', color: '#D32F2F' }; // Red
    if (qty <= 12) return { label: 'Low', color: '#FF9800' };    // Orange
    return { label: 'Good', color: '#4CAF50' };                  // Green
  };

  // 3. Temporary Seed Function (To get data in quickly)
  const seedInventory = async () => {
    const sampleData = [
      { name: "Christmas Starter", category: "Starters", stock: 12, unit: "pcs" },
      { name: "Margherita Pizza", category: "Mains", stock: 1, unit: "pcs" },
      { name: "Khukri Rum", category: "Drinks", stock: 15, unit: "bottle" },
      { name: "Burger Buns", category: "Raw Material", stock: 50, unit: "pcs" },
      { name: "Mozzarella Cheese", category: "Raw Material", stock: 2.5, unit: "kg" },
    ];

    setLoading(true);
    for (const item of sampleData) {
      await addDoc(collection(db, "inventory"), item);
    }
    await fetchInventory(); // Refresh list
  };

  if (loading) return <div style={{padding:'40px'}}>Loading Stock...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={() => navigate('/')} style={{ marginRight: '20px', padding: '10px' }}>← Back</button>
          <h1>INVENTORY & STOCK</h1>
        </div>
        
        {items.length === 0 && (
          <button onClick={seedInventory} style={{ padding: '10px 20px', backgroundColor: 'black', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>
            Generate Demo Stock
          </button>
        )}
      </div>

      {/* SEARCH & FILTER BAR (Visual only for now) */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input type="text" placeholder="Search Item..." style={{ padding: '10px', width: '300px', borderRadius: '5px', border: '1px solid #ccc' }} />
        <button style={{ padding: '10px 20px', background: '#333', color: 'white', border: 'none', borderRadius: '5px' }}>Filter</button>
        <button style={{ padding: '10px 20px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', marginLeft: 'auto' }}>+ Add Stock</button>
      </div>

      {/* INVENTORY TABLE - Matches PDF Page 24 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <thead style={{ backgroundColor: '#f5f5f5' }}>
          <tr>
            <th style={{ padding: '15px', textAlign: 'left' }}>Item Name</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Category</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>In Stock</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Unit</th>
            <th style={{ padding: '15px', textAlign: 'center' }}>Status</th>
            <th style={{ padding: '15px', textAlign: 'center' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const status = getStockStatus(item.stock);
            return (
              <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '15px' }}>{item.name}</td>
                <td style={{ padding: '15px' }}>{item.category}</td>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>{item.stock}</td>
                <td style={{ padding: '15px' }}>{item.unit}</td>
                
                {/* Status Badge */}
                <td style={{ padding: '15px', textAlign: 'center' }}>
                  <span style={{ 
                    backgroundColor: status.color, 
                    color: 'white', 
                    padding: '8px 15px', 
                    borderRadius: '20px',
                    fontSize: '0.9em',
                    fontWeight: 'bold'
                  }}>
                    {status.label}
                  </span>
                </td>

                {/* Action Buttons */}
                <td style={{ padding: '15px', textAlign: 'center' }}>
                  {status.label === 'Good' ? (
                     <button style={{ padding: '8px 15px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Edit</button>
                  ) : (
                     <button style={{ padding: '8px 15px', backgroundColor: '#D32F2F', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Reorder</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default Inventory;