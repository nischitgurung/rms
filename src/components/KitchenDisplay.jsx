import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';

const KitchenDisplay = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for all orders, sorted by newest
    const q = query(
      collection(db, "orders"), 
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Only show active orders (Not completed)
      const activeOrders = allOrders.filter(o => o.status !== 'COMPLETED');
      setOrders(activeOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, { status: newStatus });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'PENDING': return '#FF9800'; // Orange
      case 'PREPARING': return '#2196F3'; // Blue
      case 'READY': return '#4CAF50'; // Green
      default: return '#999';
    }
  };

  if (loading) return <div style={{padding:'50px'}}>Loading Kitchen Tickets...</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate('/')} style={{ marginRight: '20px', padding: '10px' }}>← Back</button>
        <h1>Kitchen Display System (KDS)</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {orders.length === 0 && <p>No active orders.</p>}
        
        {orders.map(order => (
          <div key={order.id} style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderTop: `5px solid ${getStatusColor(order.status)}` }}>
            
            {/* Header: Table & Status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>{order.tableId}</span>
              <span style={{ backgroundColor: getStatusColor(order.status), color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '0.8em' }}>
                {order.status}
              </span>
            </div>
            
            {/* Order Items List */}
            <div style={{ borderTop: '1px solid #eee', borderBottom: '1px solid #eee', padding: '15px 0', marginBottom: '15px' }}>
              {order.items.map((item, index) => (
                <div key={index} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>{item.name}</span>
                    <span style={{ fontSize: '1.1em' }}>x{item.qty}</span>
                  </div>
                  
                  {/* --- NEW: Display Modifiers --- */}
                  {item.selectedExtras && item.selectedExtras.length > 0 && (
                    <div style={{ color: '#D32F2F', fontSize: '0.9em', paddingLeft: '10px', marginTop: '2px' }}>
                      {item.selectedExtras.map((ex, i) => (
                        <div key={i}>+ {ex.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              {order.status === 'PENDING' && (
                <button onClick={() => updateStatus(order.id, 'PREPARING')} style={{ flex: 1, padding: '10px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                  Start Cooking
                </button>
              )}
              {order.status === 'PREPARING' && (
                <button onClick={() => updateStatus(order.id, 'READY')} style={{ flex: 1, padding: '10px', background: '#FF9800', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                  Mark Ready
                </button>
              )}
              {order.status === 'READY' && (
                <button onClick={() => updateStatus(order.id, 'COMPLETED')} style={{ flex: 1, padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                  Serve
                </button>
              )}
            </div>
            
            <div style={{ marginTop: '10px', fontSize: '0.7em', color: '#aaa', textAlign: 'center' }}>
               Ticket ID: {order.id.slice(0,6)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KitchenDisplay;