import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, query, where, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';

const TableManagement = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [selectedTable, setSelectedTable] = useState(null); 
  const [viewMode, setViewMode] = useState('ACTIONS'); // 'ACTIONS' or 'BILLING'
  
  // Billing Data (Changed to Array to hold multiple tickets)
  const [activeOrders, setActiveOrders] = useState([]); 
  const [grandTotal, setGrandTotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // --- 1. FETCH TABLES ---
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tables"), (snapshot) => {
      const tableData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

  // --- 2. HANDLE TABLE CLICK ---
  const handleTableClick = (table) => {
    setSelectedTable(table);
    setViewMode('ACTIONS'); 
    setActiveOrders([]); 
    setGrandTotal(0);
  };

  // --- 3. ACTIONS ---

  const handleOccupy = async () => {
    try {
        await updateDoc(doc(db, "tables", selectedTable.id), { status: "Occupied", guests: 4 });
        setSelectedTable(null);
    } catch (e) { console.error(e); }
  };

  const handleReserve = async () => {
    const name = prompt("Reservation Name:");
    if(!name) return;
    try {
        await updateDoc(doc(db, "tables", selectedTable.id), { status: "Reserved", reservedBy: name });
        setSelectedTable(null);
    } catch (e) { console.error(e); }
  };

  const handleCleanTable = async () => {
      if(!window.confirm("Table cleaned and ready for new guests?")) return;
      try {
          await updateDoc(doc(db, "tables", selectedTable.id), { status: "Available", guests: 0 });
          setSelectedTable(null);
      } catch (e) { console.error(e); }
  };

// --- 4. FETCH ALL ORDERS FOR TABLE (FIXED LOGIC) ---
  const handleViewBill = async () => {
    setViewMode('BILLING');
    try {
      // 1. Simple Query: Just get everything for this table name
      // This does NOT require a special index
      const q = query(
        collection(db, "orders"),
        where("tableId", "==", selectedTable.name)
      );

      const snapshot = await getDocs(q);
      const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 2. Filter in Javascript: Keep only items that are NOT PAID
      // This finds PENDING, PREPARING, READY, SERVED, etc.
      const unpaidOrders = allOrders.filter(order => order.status !== 'PAID');
      
      // 3. Sort manually (Newest First)
      unpaidOrders.sort((a, b) => b.createdAt - a.createdAt);

      // 4. Calculate Total
      const total = unpaidOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      
      setActiveOrders(unpaidOrders);
      setGrandTotal(total);

    } catch (error) {
      console.error("Error fetching bill:", error);
    }
  };
  // --- 5. PROCESS PAYMENT (Batch Update) ---
  const handleProcessPayment = async () => {
    if (activeOrders.length === 0) {
        alert("No active orders to pay.");
        return;
    }

    if(!window.confirm(`Confirm payment of $${grandTotal.toFixed(2)}?`)) return;

    try {
      const batch = writeBatch(db);

      // 1. Create One Transaction Record for the total
      const transactionRef = doc(collection(db, "transactions"));
      batch.set(transactionRef, {
        date: serverTimestamp(),
        type: "INCOME",
        amount: grandTotal,
        paymentMethod: paymentMethod,
        orderIds: activeOrders.map(o => o.id), // Link all order IDs
        table: selectedTable.name
      });

      // 2. Mark ALL individual orders as PAID
      activeOrders.forEach(order => {
        const orderRef = doc(db, "orders", order.id);
        batch.update(orderRef, { status: "PAID" });
      });

      // 3. Mark Table as BILLED (Blue)
      const tableRef = doc(db, "tables", selectedTable.id);
      batch.update(tableRef, { status: "Billed" });

      // Commit all changes at once
      await batch.commit();

      alert("Payment Successful! Table marked as Billed.");
      setSelectedTable(null);
    } catch (error) {
      console.error("Billing Error:", error);
      alert("Payment failed. See console.");
    }
  };

  // --- COLORS ---
  const getStatusColor = (status) => {
    switch(status) {
      case 'Available': return '#4CAF50'; // Green
      case 'Occupied': return '#F44336';  // Red
      case 'Reserved': return '#FFC107';  // Yellow
      case 'Billed': return '#2196F3';    // Blue
      default: return '#9E9E9E';
    }
  };

  if (loading) return <div style={{padding:20}}>Loading Tables...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate('/')} style={{ marginRight: '20px', padding: '10px' }}>← Back</button>
        <h1>Table Management</h1>
      </div>

      {/* LEGEND */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', fontSize: '0.9rem' }}>
          <span style={{color: '#4CAF50'}}>● Available</span>
          <span style={{color: '#F44336'}}>● Occupied</span>
          <span style={{color: '#2196F3'}}>● Billed (Cleaning Needed)</span>
          <span style={{color: '#FFC107'}}>● Reserved</span>
      </div>

      {/* TABLE GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
        {tables.map(table => (
          <div 
            key={table.id}
            onClick={() => handleTableClick(table)}
            style={{ 
              border: '1px solid #ddd', borderRadius: '12px', padding: '20px', 
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)', cursor: 'pointer',
              backgroundColor: 'white', position: 'relative',
              borderTop: `6px solid ${getStatusColor(table.status)}`
            }}
          >
            <h3 style={{ margin: '0 0 10px 0' }}>{table.name}</h3>
            <span style={{ 
                padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', 
                backgroundColor: getStatusColor(table.status), color: 'white' 
            }}>
                {table.status}
            </span>
          </div>
        ))}
      </div>

      {/* --- UNIFIED MODAL --- */}
      {selectedTable && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', 
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '450px', maxWidth: '90%' }}>
            
            <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>{selectedTable.name}</h2>
                <p style={{ margin: '5px 0 0 0', color: '#666' }}>Status: <strong style={{color: getStatusColor(selectedTable.status)}}>{selectedTable.status}</strong></p>
            </div>

            {/* === VIEW 1: ACTIONS === */}
            {viewMode === 'ACTIONS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    
                    {/* AVAILABLE */}
                    {selectedTable.status === 'Available' && (
                        <>
                            <button onClick={handleOccupy} style={btnStyle('#4CAF50')}> Seat Guests (Occupy)</button>
                            <button onClick={handleReserve} style={btnStyle('#FF9800')}> Reserve Table</button>
                        </>
                    )}

                    {/* OCCUPIED (The key part for adding items) */}
                    {selectedTable.status === 'Occupied' && (
                        <>
                            {/* --- THIS BUTTON DIRECTS TO POS FOR ADDING ITEMS --- */}
                            <button 
                                onClick={() => navigate('/pos', { state: { tableId: selectedTable.id, tableName: selectedTable.name } })} 
                                style={btnStyle('#FF9800')}
                            >
                              Add Items 
                            </button>
                            
                            <button onClick={handleViewBill} style={btnStyle('#2196F3')}>
                              View Bill / Pay
                            </button>
                        </>
                    )}

                    {/* BILLED */}
                    {selectedTable.status === 'Billed' && (
                        <>
                             <div style={{textAlign:'center', marginBottom: 10, color: '#666'}}>
                                 Table billed. Ready to clean?
                             </div>
                             <button onClick={handleCleanTable} style={btnStyle('#4CAF50')}>
                                ✨ Clean & Clear Table
                             </button>
                        </>
                    )}

                    {/* RESERVED */}
                    {selectedTable.status === 'Reserved' && (
                         <button onClick={handleOccupy} style={btnStyle('#4CAF50')}>✅ Guest Arrived</button>
                    )}

                    <button onClick={() => setSelectedTable(null)} style={{ ...btnStyle('white'), color: 'black', border: '1px solid #ccc', marginTop: '10px' }}>
                        Close
                    </button>
                </div>
            )}

            {/* === VIEW 2: BILLING (Aggregates all items) === */}
            {viewMode === 'BILLING' && (
                <div>
                     {activeOrders.length > 0 ? (
                        <>
                            <div style={{ maxHeight: '250px', overflowY: 'auto', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                
                                {/* Loop through all Tickets (Order #1, Order #2...) */}
                                {activeOrders.map((order, idx) => (
                                    <div key={order.id} style={{ marginBottom: '15px', borderBottom: '1px dashed #ddd', paddingBottom: '10px' }}>
                                        <div style={{fontSize:'0.8rem', color:'#888', marginBottom:'5px'}}>
                                            Ticket #{idx + 1} ({new Date(order.createdAt?.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
                                        </div>
                                        {order.items.map((item, i) => (
                                            <div key={i} style={{display:'flex', justifyContent:'space-between', marginBottom: 2, fontSize: '0.9rem'}}>
                                                <span>{item.qty}x {item.name}</span>
                                                <span>${(item.price * item.qty).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))}

                                <div style={{display:'flex', justifyContent:'space-between', fontSize: '1.2rem', fontWeight:'bold', marginTop:'10px'}}>
                                    <span>Grand Total</span>
                                    <span>${grandTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            <div style={{ margin: '15px 0' }}>
                                <label>Payment Method:</label>
                                <select 
                                    value={paymentMethod} 
                                    onChange={(e)=>setPaymentMethod(e.target.value)}
                                    style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                                >
                                    <option>Cash</option>
                                    <option>Card</option>
                                    <option>Online</option>
                                </select>
                            </div>

                            <button onClick={handleProcessPayment} style={btnStyle('#2196F3')}>
                                Pay & Mark Billed
                            </button>
                        </>
                     ) : (
                        <div style={{textAlign:'center', padding:'20px'}}>
                            <p>No active unpaid orders found.</p>
                            <button onClick={handleCleanTable} style={btnStyle('#D32F2F')}>Force Clear Table</button>
                        </div>
                     )}
                     
                     <button onClick={() => setViewMode('ACTIONS')} style={{ ...btnStyle('transparent'), color: '#666', marginTop: '10px' }}>
                        ← Back
                     </button>
                </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

const btnStyle = (bg) => ({
    width: '100%', padding: '12px', borderRadius: '6px', border: 'none',
    backgroundColor: bg, color: bg === 'white' || bg === 'transparent' ? 'black' : 'white',
    fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold'
});

export default TableManagement;