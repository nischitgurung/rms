import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';

const KitchenDisplay = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for orders
    const q = query(collection(db, "orders"), orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // FILTER: Hide 'COMPLETED' and 'PAID' orders. 
      // Kitchen only cares about PENDING, PREPARING, and READY.
      const kitchenOrders = allOrders.filter(o => 
        o.status !== 'COMPLETED' && 
        o.status !== 'PAID'
      );
      
      setOrders(kitchenOrders);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, { status: newStatus });
    } catch (error) {
        console.error("Error updating status:", error);
    }
  };

  // Helper to render a card
  const OrderCard = ({ order, buttonText, nextStatus, btnColor }) => (
    <div key={order.id} style={styles.card}>
        <div style={styles.cardHeader}>
            <span style={{fontWeight:'bold', fontSize:'1.1rem'}}>{order.tableId}</span>
            <span style={{fontSize:'0.8rem', color:'#666'}}>#{order.id.slice(-4)}</span>
        </div>
        
        <div style={styles.itemList}>
            {order.items.map((item, index) => (
                <div key={index} style={{marginBottom:'5px', fontSize:'0.95rem'}}>
                    <span style={{fontWeight:'bold'}}>{item.qty}x </span>
                    <span>{item.name}</span>
                    {/* Modifiers (No onions, etc) */}
                    {item.selectedExtras && item.selectedExtras.length > 0 && (
                        <div style={{fontSize:'0.8rem', color:'#d32f2f', paddingLeft:'20px'}}>
                            {item.selectedExtras.map(e => `+ ${e.name}`).join(', ')}
                        </div>
                    )}
                </div>
            ))}
        </div>

        <button 
            onClick={() => updateStatus(order.id, nextStatus)}
            style={{...styles.actionBtn, backgroundColor: btnColor}}
        >
            {buttonText}
        </button>
    </div>
  );

  if (loading) return <div style={{padding:'40px'}}>Loading Kitchen Board...</div>;

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <button onClick={() => navigate('/')} style={styles.backBtn}>← Dashboard</button>
        <h1 style={{margin:0}}>Kitchen Display System</h1>
      </div>

      {/* KANBAN BOARD */}
      <div style={styles.board}>
        
        {/* COLUMN 1: NEW ORDERS */}
        <div style={styles.column}>
            <div style={{...styles.colHeader, borderBottom: '4px solid #FF9800'}}>
                New Order ({orders.filter(o => o.status === 'PENDING').length})
            </div>
            <div style={styles.colContent}>
                {orders.filter(o => o.status === 'PENDING').map(order => (
                    <OrderCard 
                        key={order.id} 
                        order={order} 
                        buttonText="Acknowledge" 
                        nextStatus="PREPARING" 
                        btnColor="#FF9800" 
                    />
                ))}
            </div>
        </div>

        {/* COLUMN 2: IN PREPARATION */}
        <div style={styles.column}>
            <div style={{...styles.colHeader, borderBottom: '4px solid #2196F3'}}>
                In Preparation ({orders.filter(o => o.status === 'PREPARING').length})
            </div>
            <div style={styles.colContent}>
                {orders.filter(o => o.status === 'PREPARING').map(order => (
                    <OrderCard 
                        key={order.id} 
                        order={order} 
                        buttonText="Mark Ready" 
                        nextStatus="READY" 
                        btnColor="#2196F3" 
                    />
                ))}
            </div>
        </div>

        {/* COLUMN 3: READY */}
        <div style={styles.column}>
            <div style={{...styles.colHeader, borderBottom: '4px solid #4CAF50'}}>
                Ready ({orders.filter(o => o.status === 'READY').length})
            </div>
            <div style={styles.colContent}>
                {orders.filter(o => o.status === 'READY').map(order => (
                    <OrderCard 
                        key={order.id} 
                        order={order} 
                        buttonText="Serve" 
                        nextStatus="COMPLETED" 
                        btnColor="#4CAF50" 
                    />
                ))}
            </div>
        </div>

      </div>
    </div>
  );
};

// --- STYLES ---
const styles = {
    container: {
        padding: '20px',
        backgroundColor: '#f4f6f8',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Arial, sans-serif'
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '20px'
    },
    backBtn: {
        marginRight: '20px',
        padding: '8px 16px',
        border: 'none',
        backgroundColor: '#333',
        color: 'white',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    board: {
        display: 'flex',
        gap: '20px',
        flex: 1,
        overflow: 'hidden' // Prevents page scroll, individual columns scroll
    },
    column: {
        flex: 1,
        backgroundColor: '#e3e8eb',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: '300px'
    },
    colHeader: {
        padding: '15px',
        backgroundColor: 'white',
        fontWeight: 'bold',
        fontSize: '1.1rem',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        textAlign: 'center'
    },
    colContent: {
        padding: '15px',
        overflowY: 'auto',
        flex: 1
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '15px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        borderBottom: '1px solid #eee',
        paddingBottom: '5px'
    },
    itemList: {
        flex: 1,
        marginBottom: '15px'
    },
    actionBtn: {
        width: '100%',
        padding: '10px',
        border: 'none',
        borderRadius: '4px',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '1rem',
        textTransform: 'uppercase'
    }
};

export default KitchenDisplay;