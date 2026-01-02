import KhaltiCheckout from "khalti-checkout-web";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, query, where, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';

const TableManagement = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & View State
  const [selectedTable, setSelectedTable] = useState(null); 
  const [viewMode, setViewMode] = useState('ACTIONS'); 
  
  // Billing & Payment State
  const [activeOrders, setActiveOrders] = useState([]); 
  const [grandTotal, setGrandTotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [showKhaltiQR, setShowKhaltiQR] = useState(false); // To toggle QR display
  const [paymentSuccessData, setPaymentSuccessData] = useState(null); // To show Success Receipt

  // --- KHALTI CONFIG ---
  // Kept as requested, though bypassed in the manual verification flow
  let khaltiConfig = {
    "publicKey": "test_public_key_dc74e045766a412886b0e57f36311f62", // Use your own key if needed
    "productIdentity": "1234567890",
    "productName": "Restaurant Bill",
    "productUrl": "http://localhost:3000",
    "eventHandler": {
        onSuccess(payload) {
            console.log("Khalti Success:", payload);
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

  const checkout = new KhaltiCheckout(khaltiConfig);

  // --- FETCH DATA ---
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

  const handleTableClick = (table) => {
    setSelectedTable(table);
    setViewMode('ACTIONS'); 
    setActiveOrders([]); 
    setGrandTotal(0);
    setPaymentMethod('Cash');
    setShowKhaltiQR(false);
    setPaymentSuccessData(null);
  };

  // --- ACTIONS ---
  const handleOccupy = async () => { 
    try { await updateDoc(doc(db, "tables", selectedTable.id), { status: "Occupied", guests: 4 }); setSelectedTable(null); } catch (e) { console.error(e); }
  };
  const handleReserve = async () => { 
    const name = prompt("Reservation Name:"); if(!name) return;
    try { await updateDoc(doc(db, "tables", selectedTable.id), { status: "Reserved", reservedBy: name }); setSelectedTable(null); } catch (e) { console.error(e); }
  };
  const handleCleanTable = async () => { 
    if(!window.confirm("Table cleaned?")) return;
    try { await updateDoc(doc(db, "tables", selectedTable.id), { status: "Available", guests: 0 }); setSelectedTable(null); } catch (e) { console.error(e); }
  };

  // --- VIEW BILL ---
  const handleViewBill = async () => {
    setViewMode('BILLING');
    try {
      const q = query(collection(db, "orders"), where("tableId", "==", selectedTable.name));
      const snapshot = await getDocs(q);
      const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const unpaidOrders = allOrders.filter(order => order.status !== 'PAID');
      
      unpaidOrders.sort((a, b) => b.createdAt - a.createdAt);
      const total = unpaidOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      
      setActiveOrders(unpaidOrders);
      setGrandTotal(total);
    } catch (error) { console.error(error); }
  };

  // --- PROCESS PAYMENT ---
  const handleProcessPayment = async (method = paymentMethod, khaltiPayload = null) => {
    if (activeOrders.length === 0) return;
    
    // Skip confirm dialog if method is Online (since we just clicked Confirm)
    if (method !== 'Online' && !window.confirm(`Confirm payment of Rs. ${grandTotal.toFixed(2)}?`)) return;

    try {
      const batch = writeBatch(db);
      
      // 1. Transaction
      const transactionRef = doc(collection(db, "transactions"));
      const transactionData = {
        date: serverTimestamp(),
        type: "INCOME",
        amount: grandTotal,
        paymentMethod: method,
        orderIds: activeOrders.map(o => o.id),
        table: selectedTable.name,
        khaltiToken: khaltiPayload ? khaltiPayload.token : null
      };
      batch.set(transactionRef, transactionData);

      // 2. Update Orders
      activeOrders.forEach(order => {
        batch.update(doc(db, "orders", order.id), { status: "PAID" });
      });

      // 3. Update Table
      batch.update(doc(db, "tables", selectedTable.id), { status: "Billed" });

      await batch.commit();

      // --- SHOW SUCCESS SCREEN ---
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

  // --- PAY BUTTON HANDLER (Initial Click) ---
  const handlePayButtonClick = () => {
      if (paymentMethod === 'Online') {
          // Show the QR View
          setShowKhaltiQR(true);
      } else {
          handleProcessPayment(paymentMethod);
      }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Available': return '#4CAF50'; 
      case 'Occupied': return '#F44336';  
      case 'Reserved': return '#FFC107';  
      case 'Billed': return '#2196F3';    
      default: return '#9E9E9E';
    }
  };

  if (loading) return <div style={{padding:20}}>Loading...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER & GRID */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate('/')} style={{ marginRight: '20px', padding: '10px' }}>← Back</button>
        <h1>Table Management</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
        {tables.map(table => (
          <div key={table.id} onClick={() => handleTableClick(table)}
            style={{ 
              border: '1px solid #ddd', borderRadius: '12px', padding: '20px', 
              boxShadow: '0 4px 6px rgba(0,0,0,0.05)', cursor: 'pointer', backgroundColor: 'white', position: 'relative',
              borderTop: `6px solid ${getStatusColor(table.status)}`
            }}>
            <h3 style={{ margin: '0 0 10px 0' }}>{table.name}</h3>
            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: getStatusColor(table.status), color: 'white' }}>{table.status}</span>
          </div>
        ))}
      </div>

      {/* --- UNIFIED MODAL --- */}
      {selectedTable && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', width: '450px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {/* 1. SUCCESS SCREEN (Highest Priority) */}
            {paymentSuccessData ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ fontSize: '4rem', color: '#4CAF50', marginBottom: '10px' }}>✅</div>
                    <h2 style={{ color: '#4CAF50', margin: '0 0 10px 0' }}>Transaction Successful!</h2>
                    <p style={{ color: '#666' }}>Payment has been verified.</p>
                    
                    <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', margin: '20px 0', textAlign: 'left', fontSize: '0.9rem' }}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom: 5}}>
                            <span>Amount Paid:</span> <strong>Rs. {paymentSuccessData.amount.toFixed(2)}</strong>
                        </div>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom: 5}}>
                            <span>Payment Method:</span> <strong>{paymentSuccessData.method}</strong>
                        </div>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom: 5}}>
                            <span>Transaction ID:</span> <span style={{fontFamily:'monospace'}}>{paymentSuccessData.tid.slice(0,8)}...</span>
                        </div>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <span>Date:</span> <span>{paymentSuccessData.date}</span>
                        </div>
                    </div>

                    <button 
                        onClick={() => setSelectedTable(null)} 
                        style={{ width: '100%', padding: '15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1.1rem', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Close & Finish
                    </button>
                </div>
            ) : (
                <>
                    {/* STANDARD MODAL HEADER */}
                    <div style={{ borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>
                        <h2 style={{ margin: 0 }}>{selectedTable.name}</h2>
                        <p style={{ margin: '5px 0 0 0', color: '#666' }}>Status: <strong style={{color: getStatusColor(selectedTable.status)}}>{selectedTable.status}</strong></p>
                    </div>

                    {/* VIEW 1: ACTIONS */}
                    {viewMode === 'ACTIONS' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {selectedTable.status === 'Available' && (
                                <>
                                    <button onClick={handleOccupy} style={btnStyle('#4CAF50')}>✅ Seat Guests</button>
                                    <button onClick={handleReserve} style={btnStyle('#FF9800')}>📅 Reserve</button>
                                </>
                            )}
                            {selectedTable.status === 'Occupied' && (
                                <>
                                    <button onClick={() => navigate('/pos', { state: { tableId: selectedTable.id, tableName: selectedTable.name } })} style={btnStyle('#FF9800')}>🍔 Add Items</button>
                                    <button onClick={handleViewBill} style={btnStyle('#2196F3')}>💰 View Bill / Pay</button>
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

                    {/* VIEW 2: BILLING */}
                    {viewMode === 'BILLING' && (
                        <div>
                             {showKhaltiQR ? (
                                 // --- QR CODE DISPLAY SECTION ---
                                 <div style={{ textAlign: 'center' }}>
                                     <h3 style={{color:'#5C2D91'}}>Scan to Pay</h3>
                                     <img 
                                        src="https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg" 
                                        alt="Khalti QR" 
                                        style={{ width: '200px', height: '200px', margin: '0 auto' }}
                                     />
                                     <p style={{fontSize:'0.9rem', color:'#666'}}>Total: Rs. {grandTotal.toFixed(2)}</p>
                                     
                                     <div style={{display:'flex', gap:'10px', marginTop:'20px'}}>
                                         <button 
                                            onClick={() => setShowKhaltiQR(false)} 
                                            style={{flex:1, padding:'10px', background:'white', border:'1px solid #ccc', borderRadius:'6px'}}
                                         >
                                             Cancel
                                         </button>
                                         
                                         {/* --- MODIFIED BUTTON: CONFIRM DIRECTLY --- */}
                                         <button 
                                            onClick={() => handleProcessPayment('Online', { token: 'QR-SCAN-VERIFIED' })} 
                                            style={{flex:1, padding:'10px', background:'#5C2D91', color:'white', border:'none', borderRadius:'6px'}}
                                         >
                                             Confirm Payment Received
                                         </button>
                                     </div>
                                 </div>
                             ) : (
                                 // --- STANDARD BILLING VIEW ---
                                 <>
                                     {activeOrders.length > 0 ? (
                                        <>
                                            <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                                                {activeOrders.map((order, idx) => (
                                                    <div key={order.id} style={{ marginBottom: '10px', borderBottom: '1px dashed #ddd', paddingBottom: '5px' }}>
                                                        <div style={{fontSize:'0.8rem', color:'#888'}}>Ticket #{idx + 1}</div>
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

                                            <button onClick={handlePayButtonClick} style={btnStyle(paymentMethod === 'Online' ? '#5C2D91' : '#2196F3')}>
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