import KhaltiCheckout from "khalti-checkout-web";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, query, where, serverTimestamp, writeBatch } from 'firebase/firestore';

const TableManagement = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]); // Stores ALL active orders for the dashboard
  const [loading, setLoading] = useState(true);
  
  // Modal & View State
  const [selectedTable, setSelectedTable] = useState(null); 
  const [viewMode, setViewMode] = useState('ACTIONS'); 
  const [currentTableOrders, setCurrentTableOrders] = useState([]); // Orders for the SPECIFIC selected table
  const [grandTotal, setGrandTotal] = useState(0);
  
  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [showKhaltiQR, setShowKhaltiQR] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  // --- KHALTI CONFIG ---
  let khaltiConfig = {
    "publicKey": "test_public_key_dc74e045766a412886b0e57f36311f62", 
    "productIdentity": "1234567890",
    "productName": "Restaurant Bill",
    "productUrl": "http://localhost:3000",
    "eventHandler": {
        onSuccess(payload) {
            handleProcessPayment('Online', payload); 
        },
        onError(error) {
            console.log(error);
            alert("Payment Failed.");
        },
        onClose() {
            console.log('Widget is closing');
        }
    },
    "paymentPreference": ["KHALTI", "EBANKING", "MOBILE_BANKING", "CONNECT_IPS", "SCT"],
  };

  // --- 1. FETCH TABLES & ALL ACTIVE ORDERS ---
  useEffect(() => {
    // A. Tables Listener
    const unsubTables = onSnapshot(collection(db, "tables"), (snapshot) => {
      const tableData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedTables = tableData.sort((a, b) => {
        const numA = parseInt(a.name.replace(/^\D+/g, '')) || 0;
        const numB = parseInt(b.name.replace(/^\D+/g, '')) || 0;
        return numA - numB;
      });
      setTables(sortedTables);
    });

    // B. Active Orders Listener (To show status on cards)
    // We want orders that are NOT paid.
    const qOrders = query(collection(db, "orders"), where("status", "!=", "PAID"));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setActiveOrders(ordersData);
        setLoading(false);
    });

    return () => {
        unsubTables();
        unsubOrders();
    };
  }, []);

  // --- HELPER: GET STATUS FOR SPECIFIC TABLE ---
  const getTableKitchenStatus = (tableName) => {
      // Find the most recent active order for this table
      const tableOrder = activeOrders
        .filter(o => o.tableId === tableName)
        .sort((a,b) => b.createdAt - a.createdAt)[0];

      if (!tableOrder) return null;
      return tableOrder.status; // PENDING, PREPARING, READY, COMPLETED
  };

  // --- HANDLE CLICKING A TABLE ---
  const handleTableClick = (table) => {
    setSelectedTable(table);
    setViewMode('ACTIONS'); 
    setPaymentMethod('Cash');
    setShowKhaltiQR(false);
    setPaymentSuccessData(null);

    // Filter orders for just this table for the modal view
    const specificOrders = activeOrders.filter(o => o.tableId === table.name);
    specificOrders.sort((a, b) => b.createdAt - a.createdAt);
    setCurrentTableOrders(specificOrders);
    
    // Calculate total immediately
    const total = specificOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    setGrandTotal(total);
  };

  // --- ACTIONS ---
  const handleOccupy = async () => { 
    try { await updateDoc(doc(db, "tables", selectedTable.id), { status: "Occupied", guests: 4 }); } catch (e) { console.error(e); }
  };
  const handleReserve = async () => { 
    const name = prompt("Reservation Name:"); if(!name) return;
    try { await updateDoc(doc(db, "tables", selectedTable.id), { status: "Reserved", reservedBy: name }); setSelectedTable(null); } catch (e) { console.error(e); }
  };
  const handleCleanTable = async () => { 
    if(!window.confirm("Table cleaned?")) return;
    try { await updateDoc(doc(db, "tables", selectedTable.id), { status: "Available", guests: 0 }); setSelectedTable(null); } catch (e) { console.error(e); }
  };

  // --- PAYMENT ---
  const handleProcessPayment = async (method = paymentMethod, khaltiPayload = null) => {
    if (currentTableOrders.length === 0) return;
    if (method !== 'Online' && !window.confirm(`Confirm payment of Rs. ${grandTotal.toFixed(2)}?`)) return;

    try {
      const batch = writeBatch(db);
      
      const transactionRef = doc(collection(db, "transactions"));
      batch.set(transactionRef, {
        date: serverTimestamp(),
        type: "INCOME",
        amount: grandTotal,
        paymentMethod: method,
        orderIds: currentTableOrders.map(o => o.id),
        table: selectedTable.name,
        khaltiToken: khaltiPayload ? khaltiPayload.token : null
      });

      currentTableOrders.forEach(order => {
        batch.update(doc(db, "orders", order.id), { status: "PAID" });
      });

      batch.update(doc(db, "tables", selectedTable.id), { status: "Billed" });

      await batch.commit();

      setPaymentSuccessData({
          amount: grandTotal,
          method: method,
          tid: transactionRef.id,
          date: new Date().toLocaleString()
      });
      
    } catch (error) {
      console.error("Billing Error:", error);
      alert("Payment failed.");
    }
  };

  // --- UI HELPERS ---
  const getStatusColor = (status) => {
    switch(status) {
      case 'Available': return '#4CAF50'; 
      case 'Occupied': return '#F44336';  
      case 'Reserved': return '#FFC107';  
      case 'Billed': return '#2196F3';    
      default: return '#9E9E9E';
    }
  };

  const getKitchenBadge = (status) => {
      switch(status) {
          case 'PENDING': return { bg: '#FFF3E0', text: '#E65100', label: '🔔 New Order' };
          case 'PREPARING': return { bg: '#E3F2FD', text: '#1565C0', label: '👨‍🍳 Cooking' };
          case 'READY': return { bg: '#E8F5E9', text: '#2E7D32', label: '✅ Ready' };
          case 'COMPLETED': return { bg: '#F3E5F5', text: '#7B1FA2', label: '🍽️ Served' };
          default: return null;
      }
  };

  if (loading) return <div style={{padding:20}}>Loading...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate('/')} style={{ marginRight: '20px', padding: '10px' }}>← Back</button>
        <h1>Table Management</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
        {tables.map(table => {
            const kStatus = getTableKitchenStatus(table.name); // Get live status
            const badge = getKitchenBadge(kStatus);

            return (
              <div key={table.id} onClick={() => handleTableClick(table)}
                style={{ 
                  border: '1px solid #ddd', borderRadius: '12px', padding: '20px', 
                  boxShadow: '0 4px 6px rgba(0,0,0,0.05)', cursor: 'pointer', backgroundColor: 'white', position: 'relative',
                  borderTop: `6px solid ${getStatusColor(table.status)}`,
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px'
                }}>
                
                <div>
                    <h3 style={{ margin: '0 0 5px 0' }}>{table.name}</h3>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: getStatusColor(table.status), color: 'white' }}>{table.status}</span>
                </div>

                {/* --- KITCHEN STATUS BADGE ON CARD --- */}
                {badge && (
                    <div style={{ 
                        marginTop: '15px', 
                        backgroundColor: badge.bg, 
                        color: badge.text, 
                        padding: '8px', 
                        borderRadius: '6px', 
                        textAlign: 'center', 
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        border: `1px solid ${badge.text}30`
                    }}>
                        {badge.label}
                    </div>
                )}
              </div>
            );
        })}
      </div>

      {/* --- UNIFIED MODAL --- */}
      {selectedTable && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '450px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {paymentSuccessData ? (
                // SUCCESS VIEW
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: '4rem', color: '#4CAF50', marginBottom: '10px' }}>✅</div>
                    <h2 style={{ color: '#4CAF50', margin: '0 0 10px 0' }}>Transaction Successful!</h2>
                    <button 
                        onClick={() => setSelectedTable(null)} 
                        style={{ width: '100%', padding: '15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold', marginTop: '20px' }}
                    >
                        Close & Finish
                    </button>
                </div>
            ) : (
                <>
                    {/* MODAL HEADER WITH STATUS */}
                    <div style={{ borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <h2 style={{ margin: 0 }}>{selectedTable.name}</h2>
                            {/* Show status in modal header too */}
                            {getTableKitchenStatus(selectedTable.name) && (
                                <span style={{
                                    fontSize:'0.8rem', fontWeight:'bold', 
                                    padding:'4px 8px', borderRadius:'4px',
                                    ...getKitchenBadge(getTableKitchenStatus(selectedTable.name))
                                }}>
                                    {getKitchenBadge(getTableKitchenStatus(selectedTable.name)).label}
                                </span>
                            )}
                        </div>
                        <p style={{ margin: '5px 0 0 0', color: '#666' }}>Status: <strong style={{color: getStatusColor(selectedTable.status)}}>{selectedTable.status}</strong></p>
                    </div>

                    {/* ACTIONS VIEW */}
                    {viewMode === 'ACTIONS' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* If there are orders, show a summary here */}
                            {currentTableOrders.length > 0 && (
                                <div style={{background:'#fafafa', padding:'10px', borderRadius:'6px', marginBottom:'10px', border:'1px dashed #ccc'}}>
                                    <div style={{fontSize:'0.9rem', color:'#666'}}>Current Bill:</div>
                                    <div style={{fontSize:'1.5rem', fontWeight:'bold'}}>Rs. {grandTotal.toFixed(2)}</div>
                                </div>
                            )}

                            {selectedTable.status === 'Available' && (
                                <>
                                    <button onClick={handleOccupy} style={btnStyle('#4CAF50')}>✅ Seat Guests</button>
                                    <button onClick={handleReserve} style={btnStyle('#FF9800')}>📅 Reserve</button>
                                </>
                            )}
                            {selectedTable.status === 'Occupied' && (
                                <>
                                    <button onClick={() => navigate('/pos', { state: { tableId: selectedTable.id, tableName: selectedTable.name } })} style={btnStyle('#FF9800')}>🍔 Add Items</button>
                                    <button onClick={() => setViewMode('BILLING')} style={btnStyle('#2196F3')}>💰 View Bill / Pay</button>
                                </>
                            )}
                            {selectedTable.status === 'Billed' && (
                                <button onClick={handleCleanTable} style={btnStyle('#4CAF50')}>✨ Clean Table</button>
                            )}
                            {selectedTable.status === 'Reserved' && (
                                <button onClick={handleOccupy} style={btnStyle('#4CAF50')}>✅ Guest Arrived</button>
                            )}
                            <button onClick={() => setSelectedTable(null)} style={{ ...btnStyle('white'), color: 'black', border: '1px solid #ccc', marginTop: '10px' }}>Close</button>
                        </div>
                    )}

                    {/* BILLING VIEW */}
                    {viewMode === 'BILLING' && (
                        <div>
                             {showKhaltiQR ? (
                                 <div style={{ textAlign: 'center' }}>
                                     <h3 style={{color:'#5C2D91'}}>Scan to Pay</h3>
                                     <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" alt="Khalti QR" style={{ width: '200px', height: '200px', margin: '0 auto' }} />
                                     <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                                         <button onClick={() => setShowKhaltiQR(false)} style={{flex:1, padding:'10px', background:'white', border:'1px solid #ccc', borderRadius:'6px'}}>Cancel</button>
                                         <button onClick={() => handleProcessPayment('Online', { token: 'QR-SCAN-VERIFIED' })} style={{flex:1, padding:'10px', background:'#5C2D91', color:'white', border:'none', borderRadius:'6px'}}>Confirm</button>
                                     </div>
                                 </div>
                             ) : (
                                 <>
                                     {currentTableOrders.length > 0 ? (
                                         <>
                                             <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                                 {currentTableOrders.map((order, idx) => (
                                                     <div key={order.id} style={{ marginBottom: '10px', borderBottom: '1px dashed #ddd', paddingBottom: '5px' }}>
                                                         <div style={{fontSize:'0.8rem', color:'#888', display:'flex', justifyContent:'space-between'}}>
                                                            <span>Ticket #{idx + 1}</span>
                                                            <span style={{ fontWeight:'bold', color: getKitchenBadge(order.status)?.text }}>
                                                                {order.status}
                                                            </span>
                                                         </div>
                                                         {order.items.map((item, i) => (
                                                             <div key={i} style={{display:'flex', justifyContent:'space-between', fontSize: '0.9rem'}}>
                                                                 <span>{item.qty}x {item.name}</span>
                                                                 <span>Rs. {(item.price * item.qty).toFixed(2)}</span>
                                                             </div>
                                                         ))}
                                                     </div>
                                                 ))}
                                                 <div style={{display:'flex', justifyContent:'space-between', fontSize: '1.2rem', fontWeight:'bold', marginTop:'10px'}}>
                                                     <span>Grand Total</span>
                                                     <span>Rs. {grandTotal.toFixed(2)}</span>
                                                 </div>
                                             </div>

                                             <div style={{ margin: '15px 0' }}>
                                                 <label>Payment Method:</label>
                                                 <select value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
                                                     <option value="Cash">Cash</option>
                                                     <option value="Card">Card</option>
                                                     <option value="Online">Online / Khalti</option>
                                                 </select>
                                             </div>

                                             <button onClick={() => paymentMethod === 'Online' ? setShowKhaltiQR(true) : handleProcessPayment(paymentMethod)} style={btnStyle(paymentMethod === 'Online' ? '#5C2D91' : '#2196F3')}>
                                                 {paymentMethod === 'Online' ? 'Generate QR / Pay' : 'Pay & Mark Billed'}
                                             </button>
                                         </>
                                     ) : (
                                         <div style={{textAlign:'center', padding:'20px'}}>
                                             <p>No active unpaid orders found.</p>
                                             <button onClick={handleCleanTable} style={btnStyle('#D32F2F')}>Force Clear</button>
                                         </div>
                                     )}
                                     
                                     <button onClick={() => setViewMode('ACTIONS')} style={{ ...btnStyle('transparent'), color: '#666', marginTop: '10px' }}>← Back</button>
                                 </>
                             )}
                        </div>
                    )}
                </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const btnStyle = (bg) => ({ width: '100%', padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: bg, color: bg === 'white' || bg === 'transparent' ? 'black' : 'white', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold' });

export default TableManagement;