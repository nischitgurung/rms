import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, query, where, getDocs } from 'firebase/firestore'; // Removed orderBy/limit imports

const TableManagement = () => {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // 1. Listen for Tables (No changes here)
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tables"), (snapshot) => {
      const tableData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort tables by ID number
      const sortedTables = tableData.sort((a, b) => {
        const numA = parseInt(a.name.replace(/^\D+/g, '')) || 0;
        const numB = parseInt(b.name.replace(/^\D+/g, '')) || 0;
        return numA - numB;
      });
      setTables(sortedTables);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. FETCH ORDER (FIXED LOGIC)
  const handleTableClick = async (table) => {
    // If table is Green (Available), just seat them
    if (table.status === 'Available') {
      const tableRef = doc(db, "tables", table.id);
      await updateDoc(tableRef, { status: "Occupied", guests: 4 });
      return; 
    }

    // If Occupied, OPEN BILLING
    setSelectedTable(table);
    setActiveOrder(null); // Clear previous data while loading

    try {
      // FIX: Query ONLY by tableId (No orderBy) to avoid Index errors
      const q = query(
        collection(db, "orders"),
        where("tableId", "==", table.name),
        where("status", "==", "PENDING") // Only find active orders
      );

      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        // Sort in Javascript instead of Firestore
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Get the newest one based on creation time
        orders.sort((a, b) => b.createdAt - a.createdAt);
        
        setActiveOrder(orders[0]); // Pick the newest active order
      } else {
        console.log("No PENDING order found for", table.name);
      }
    } catch (error) {
      console.error("Error fetching bill:", error);
    }
  };

  // 3. Process Payment (No changes here)
  const handleSettleBill = async () => {
    if (!activeOrder) {
      // Force clear if no order found
      await updateDoc(doc(db, "tables", selectedTable.id), { status: "Available", guests: 0 });
      setSelectedTable(null);
      return;
    }

    if(!window.confirm(`Settle bill of $${activeOrder.totalAmount.toFixed(2)}?`)) return;

    try {
      // A. Record Transaction
      await addDoc(collection(db, "transactions"), {
        date: new Date(),
        type: "INCOME",
        amount: activeOrder.totalAmount,
        paymentMethod: paymentMethod,
        orderId: activeOrder.id,
        description: `Bill Settlement - ${selectedTable.name}`
      });

      // B. Mark Order Paid
      await updateDoc(doc(db, "orders", activeOrder.id), { status: "PAID", paymentStatus: "Paid" });

      // C. Free Table
      await updateDoc(doc(db, "tables", selectedTable.id), { status: "Available", guests: 0 });

      alert("Paid & Cleared!");
      setSelectedTable(null);
    } catch (error) {
      console.error("Billing Error:", error);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Available': return '#4CAF50';
      case 'Occupied': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  if (loading) return <div>Loading Tables...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate('/')} style={{ marginRight: '20px', padding: '10px' }}>← Back</button>
        <h1>Table Management</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
        {tables.map(table => (
          <div 
            key={table.id}
            onClick={() => handleTableClick(table)}
            style={{ 
              border: '1px solid #ddd', borderRadius: '10px', padding: '20px', 
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer',
              backgroundColor: table.status === 'Occupied' ? '#fff0f0' : 'white',
              position: 'relative'
            }}
          >
            <div style={{ position: 'absolute', top: '15px', right: '15px', width: '15px', height: '15px', borderRadius: '50%', backgroundColor: getStatusColor(table.status) }}></div>
            <h3>{table.name}</h3>
            <p>{table.status}</p>
          </div>
        ))}
      </div>

      {/* BILLING MODAL */}
      {selectedTable && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '10px', width: '400px', maxWidth: '90%' }}>
            <h2>Billing: {selectedTable.name}</h2>
            
            {activeOrder ? (
              <>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', margin: '10px 0', padding: '10px' }}>
                  {activeOrder.items.map((item, i) => (
                    <div key={i} style={{display:'flex', justifyContent:'space-between'}}>
                      <span>{item.name} x{item.qty}</span>
                      <span>${(item.price * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <h3>Total: ${activeOrder.totalAmount.toFixed(2)}</h3>
                <div style={{ margin: '20px 0' }}>
                   <select style={{width:'100%', padding: '10px'}} value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)}>
                     <option>Cash</option>
                     <option>Card</option>
                   </select>
                </div>
                <div style={{display:'flex', gap:'10px'}}>
                  <button onClick={() => setSelectedTable(null)} style={{flex:1, padding:'10px'}}>Cancel</button>
                  <button onClick={handleSettleBill} style={{flex:1, padding:'10px', background:'#4CAF50', color:'white', border:'none'}}>Pay & Clear</button>
                </div>
              </>
            ) : (
              <div style={{textAlign: 'center'}}>
                <p>Table is occupied, but no active order found.</p>
                <button onClick={handleSettleBill} style={{marginTop: '20px', padding:'10px', background:'#D32F2F', color:'white'}}>Force Clear Table</button>
                <br/><br/>
                <button onClick={() => setSelectedTable(null)}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TableManagement;