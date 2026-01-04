import KhaltiCheckout from "khalti-checkout-web";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, query, where, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Helmet, HelmetProvider } from 'react-helmet-async'; // SEO Import

const TableManagement = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  // Search & Filter State (NEW)
  const [searchTerm, setSearchTerm] = useState('');

  // Modal & View State
  const [selectedTable, setSelectedTable] = useState(null); 
  const [viewMode, setViewMode] = useState('ACTIONS'); 
  const [currentTableOrders, setCurrentTableOrders] = useState([]); 
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

    // B. Active Orders Listener
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

  // --- HELPER: GET DATA FOR SPECIFIC TABLE ---
  const getTableData = (tableName) => {
      const tableOrders = activeOrders.filter(o => o.tableId === tableName);
      if (tableOrders.length === 0) return { status: null, items: [] };
      
      // Sort to get latest status
      const latestOrder = [...tableOrders].sort((a,b) => b.createdAt - a.createdAt)[0];
      
      // Flatten all items for search
      const allItems = tableOrders.flatMap(o => o.items.map(i => i.name.toLowerCase()));
      
      return { 
          status: latestOrder.status, 
          items: allItems 
      };
  };

  // --- SEARCH FILTER LOGIC ---
  const filteredTables = tables.filter(table => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      
      // 1. Search by Table Name
      if (table.name.toLowerCase().includes(term)) return true;

      // 2. Search by Reservation Name
      if (table.status === 'Reserved' && table.reservedBy && table.reservedBy.toLowerCase().includes(term)) return true;

      // 3. Search by Food Items Ordered (Advanced Feature)
      const { items } = getTableData(table.name);
      if (items.some(itemName => itemName.includes(term))) return true;

      return false;
  });

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
    const name = prompt("Enter Guest Name for Reservation:"); if(!name) return;
    try { await updateDoc(doc(db, "tables", selectedTable.id), { status: "Reserved", reservedBy: name }); setSelectedTable(null); } catch (e) { console.error(e); }
  };
  const handleCleanTable = async () => { 
    if(!window.confirm("Table cleaned?")) return;
    try { await updateDoc(doc(db, "tables", selectedTable.id), { status: "Available", guests: 0, reservedBy: null }); setSelectedTable(null); } catch (e) { console.error(e); }
  };

  // --- PAYMENT ---
  const handleProcessPayment = async (method = paymentMethod, khaltiPayload = null) => {
    if (currentTableOrders.length === 0) return;
    
    // VALIDATION: Ensure all items are served
    const unservedOrders = currentTableOrders.filter(o => o.status !== 'COMPLETED');
    if (unservedOrders.length > 0) {
        return alert(`Cannot generate bill! ${unservedOrders.length} order(s) are still in the Kitchen (Not Served).`);
    }

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

      batch.update(doc(db, "tables", selectedTable.id), { status: "Billed", reservedBy: null });

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
          case 'PENDING': return { bg: '#FFF3E0', text: '#E65100', label: 'New Order' };
          case 'PREPARING': return { bg: '#E3F2FD', text: '#1565C0', label: 'Preparing' };
          case 'READY': return { bg: '#E8F5E9', text: '#2E7D32', label: 'Ready' };
          case 'COMPLETED': return { bg: '#F3E5F5', text: '#7B1FA2', label: 'Served' };
          default: return null;
      }
  };

  const unservedCount = currentTableOrders.filter(o => o.status !== 'COMPLETED').length;
  const canSettleBill = unservedCount === 0 && currentTableOrders.length > 0;

  if (loading) return <div style={{padding:20}}>Loading...</div>;

  return (
    <HelmetProvider>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        
        {/* SEO META TAGS */}
        <Helmet>
            <title>Table Dashboard | RMS</title>
            <meta name="description" content="Real-time table tracking, reservations, and billing status." />
        </Helmet>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <button onClick={() => navigate('/')} style={{ marginRight: '20px', padding: '10px 15px', border: '1px solid #ccc', background: 'white', borderRadius: '6px', cursor: 'pointer' }}>Back</button>
                <h1 style={{margin:0}}>Table Management</h1>
            </div>
            
            {/* SEARCH BAR FOR FILTERING */}
            <input 
                type="text" 
                placeholder="Search by Table, Reservation Name, or Ordered Item..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                    padding: '12px',
                    fontSize: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    width: '100%',
                    maxWidth: '500px'
                }}
            />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
          {filteredTables.map(table => {
              const { status: kStatus } = getTableData(table.name); 
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
                      <h3 style={{ margin: '0 0 5px 0', fontSize: '1.4rem' }}>{table.name}</h3>
                      <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: getStatusColor(table.status), color: 'white', fontWeight: 'bold' }}>{table.status}</span>
                      
                      {/* --- SEO/VISIBILITY: SHOW RESERVATION NAME --- */}
                      {table.status === 'Reserved' && table.reservedBy && (
                          <div style={{ marginTop: '8px', fontSize: '0.9rem', color: '#E65100', fontWeight: 'bold', borderTop: '1px dashed #FFC107', paddingTop: '5px' }}>
                              Reserved by: {table.reservedBy}
                          </div>
                      )}
                  </div>

                  {/* --- KITCHEN STATUS BADGE --- */}
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
                              {getTableData(selectedTable.name).status && (
                                  <span style={{
                                      fontSize:'0.8rem', fontWeight:'bold', 
                                      padding:'4px 8px', borderRadius:'4px',
                                      ...getKitchenBadge(getTableData(selectedTable.name).status)
                                  }}>
                                      {getKitchenBadge(getTableData(selectedTable.name).status).label}
                                  </span>
                              )}
                          </div>
                          <p style={{ margin: '5px 0 0 0', color: '#666' }}>Status: <strong style={{color: getStatusColor(selectedTable.status)}}>{selectedTable.status}</strong></p>
                          
                          {/* SHOW RESERVATION IN MODAL */}
                          {selectedTable.status === 'Reserved' && selectedTable.reservedBy && (
                              <p style={{ margin: '5px 0 0 0', color: '#FF9800', fontWeight: 'bold' }}>Guest: {selectedTable.reservedBy}</p>
                          )}
                      </div>

                      {/* ACTIONS VIEW */}
                      {viewMode === 'ACTIONS' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {currentTableOrders.length > 0 && (
                                  <div style={{background:'#fafafa', padding:'10px', borderRadius:'6px', marginBottom:'10px', border:'1px dashed #ccc'}}>
                                      <div style={{fontSize:'0.9rem', color:'#666'}}>Current Bill:</div>
                                      <div style={{fontSize:'1.5rem', fontWeight:'bold'}}>Rs. {grandTotal.toFixed(2)}</div>
                                  </div>
                              )}

                              {selectedTable.status === 'Available' && (
                                  <>
                                      <button onClick={handleOccupy} style={btnStyle('#4CAF50')}>Seat Guests</button>
                                      <button onClick={handleReserve} style={btnStyle('#FF9800')}>Reserve</button>
                                  </>
                              )}
                              {selectedTable.status === 'Occupied' && (
                                  <>
                                      <button onClick={() => navigate('/pos', { state: { tableId: selectedTable.id, tableName: selectedTable.name } })} style={btnStyle('#FF9800')}>Add Items</button>
                                      <button onClick={() => setViewMode('BILLING')} style={btnStyle('#2196F3')}>Bill & Payment</button>
                                  </>
                              )}
                              {selectedTable.status === 'Billed' && (
                                  <button onClick={handleCleanTable} style={btnStyle('#4CAF50')}>Mark as Clean</button>
                              )}
                              {selectedTable.status === 'Reserved' && (
                                  <button onClick={handleOccupy} style={btnStyle('#4CAF50')}>Guest Arrived (Start Service)</button>
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
                                                                   {order.status === 'COMPLETED' ? 'SERVED' : 'IN KITCHEN'}
                                                               </span>
                                                           </div>
                                                           
                                                           {order.items.map((item, i) => (
                                                               <div key={i} style={{marginBottom:'5px'}}>
                                                                   <div style={{display:'flex', justifyContent:'space-between', fontSize: '0.9rem'}}>
                                                                       <span>{item.qty}x {item.name}</span>
                                                                       <span>Rs. {(item.price * item.qty).toFixed(2)}</span>
                                                                   </div>
                                                                   {item.isCombo && item.comboItems && (
                                                                       <div style={{ fontSize: '0.75rem', color: '#666', paddingLeft: '12px', marginTop: '2px', borderLeft: '2px solid #ddd' }}>
                                                                           {item.comboItems.map((sub, sIdx) => (
                                                                               <div key={sIdx}>• {sub.qty}x {sub.name}</div>
                                                                           ))}
                                                                       </div>
                                                                   )}
                                                               </div>
                                                           ))}
                                                       </div>
                                                   ))}
                                                   <div style={{display:'flex', justifyContent:'space-between', fontSize: '1.2rem', fontWeight:'bold', marginTop:'10px'}}>
                                                       <span>Grand Total</span>
                                                       <span>Rs. {grandTotal.toFixed(2)}</span>
                                                   </div>
                                               </div>

                                               {/* WARNING IF KITCHEN PENDING */}
                                               {!canSettleBill && (
                                                  <div style={{backgroundColor:'#FFF3E0', color:'#E65100', padding:'10px', borderRadius:'6px', margin:'15px 0', fontSize:'0.9rem', border:'1px solid #FFCC80', display:'flex', alignItems:'center'}}>
                                                      <span style={{marginRight:'8px', fontSize:'1.2rem', fontWeight:'bold'}}>!</span>
                                                      <div>
                                                          <strong>Bill Blocked:</strong> {unservedCount} order(s) are still active in the Kitchen. Please mark them as "Served" in KDS first.
                                                      </div>
                                                  </div>
                                               )}

                                               <div style={{ margin: '15px 0', opacity: !canSettleBill ? 0.5 : 1 }}>
                                                   <label>Payment Method:</label>
                                                   <select disabled={!canSettleBill} value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
                                                       <option value="Cash">Cash</option>
                                                       <option value="Card">Card</option>
                                                       <option value="Online">Online / Khalti</option>
                                                   </select>
                                               </div>

                                               <button 
                                                  disabled={!canSettleBill}
                                                  onClick={() => paymentMethod === 'Online' ? setShowKhaltiQR(true) : handleProcessPayment(paymentMethod)} 
                                                  style={{
                                                      ...btnStyle(paymentMethod === 'Online' ? '#5C2D91' : '#2196F3'),
                                                      opacity: !canSettleBill ? 0.5 : 1,
                                                      cursor: !canSettleBill ? 'not-allowed' : 'pointer'
                                                  }}
                                               >
                                                   {paymentMethod === 'Online' ? 'Generate QR / Pay' : 'Pay & Mark Billed'}
                                               </button>
                                           </>
                                       ) : (
                                           <div style={{textAlign:'center', padding:'20px'}}>
                                               <p>No active unpaid orders found.</p>
                                               <button onClick={handleCleanTable} style={btnStyle('#D32F2F')}>Force Clear</button>
                                           </div>
                                       )}
                                       
                                       <button onClick={() => setViewMode('ACTIONS')} style={{ ...btnStyle('transparent'), color: '#666', marginTop: '10px' }}>Back</button>
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
    </HelmetProvider>
  );
};

const btnStyle = (bg) => ({ width: '100%', padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: bg, color: bg === 'white' || bg === 'transparent' ? 'black' : 'white', fontSize: '1rem', cursor: 'pointer', fontWeight: 'bold' });

export default TableManagement;