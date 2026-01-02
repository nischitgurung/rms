import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from 'firebase/firestore';

const KitchenDisplay = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- RESPONSIVE STATE ---
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [activeTab, setActiveTab] = useState('PENDING'); // 'PENDING', 'PREPARING', 'READY'

  useEffect(() => {
    // Responsive Listener
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);

    // Database Listener
    const q = query(collection(db, "orders"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter: Hide Completed & Paid
      const kitchenOrders = allOrders.filter(o => 
        o.status !== 'COMPLETED' && 
        o.status !== 'PAID'
      );
      
      setOrders(kitchenOrders);
      setLoading(false);
    });

    return () => {
        window.removeEventListener('resize', handleResize);
        unsubscribe();
    };
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, { status: newStatus });
    } catch (error) {
        console.error("Error updating status:", error);
    }
  };

  // --- COMPONENT: ORDER CARD ---
  const OrderCard = ({ order, buttonText, nextStatus, btnColor }) => (
    <div key={order.id} style={styles.card}>
        <div style={styles.cardHeader}>
            <span style={{fontWeight:'bold', fontSize:'1.2rem'}}>{order.tableId}</span>
            <span style={{fontSize:'0.8rem', color:'#666'}}>#{order.id.slice(-4)}</span>
        </div>
        
        <div style={styles.itemList}>
            {order.items.map((item, index) => (
                <div key={index} style={{marginBottom:'8px', fontSize:'1rem', display:'flex', justifyContent:'space-between'}}>
                    <div>
                        <span style={{fontWeight:'bold', marginRight:'8px'}}>{item.qty}x</span>
                        <span>{item.name}</span>
                    </div>
                    {/* Modifiers */}
                    {item.selectedExtras && item.selectedExtras.length > 0 && (
                        <div style={{fontSize:'0.85rem', color:'#D32F2F', marginTop:'2px', fontStyle:'italic'}}>
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

  // --- COMPONENT: COLUMN RENDERER ---
  const renderColumn = (status, title, nextStatus, btnText, color) => {
      const filteredOrders = orders.filter(o => o.status === status);
      
      return (
        <div style={isMobile ? styles.mobileColumn : styles.column}>
            {!isMobile && (
                <div style={{...styles.colHeader, borderBottom: `4px solid ${color}`}}>
                    {title} ({filteredOrders.length})
                </div>
            )}
            <div style={styles.colContent}>
                {filteredOrders.length === 0 && (
                    <div style={{textAlign:'center', padding:'20px', color:'#999'}}>No orders</div>
                )}
                {filteredOrders.map(order => (
                    <OrderCard 
                        key={order.id} 
                        order={order} 
                        buttonText={btnText} 
                        nextStatus={nextStatus} 
                        btnColor={color} 
                    />
                ))}
            </div>
        </div>
      );
  };

  if (loading) return <div style={{padding:'40px'}}>Loading...</div>;

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <div style={styles.header}>
        <button onClick={() => navigate('/')} style={styles.backBtn}>← Back</button>
        <h1 style={{margin:0, fontSize: isMobile ? '1.2rem' : '2rem'}}>Kitchen Display</h1>
      </div>

      {/* MOBILE TABS */}
      {isMobile && (
          <div style={styles.mobileTabs}>
              <button 
                onClick={() => setActiveTab('PENDING')} 
                style={{...styles.tabBtn, borderBottom: activeTab === 'PENDING' ? '4px solid #FF9800' : 'none', fontWeight: activeTab === 'PENDING' ? 'bold' : 'normal'}}
              >
                  New <span style={styles.badge}>{orders.filter(o => o.status === 'PENDING').length}</span>
              </button>
              <button 
                onClick={() => setActiveTab('PREPARING')} 
                style={{...styles.tabBtn, borderBottom: activeTab === 'PREPARING' ? '4px solid #2196F3' : 'none', fontWeight: activeTab === 'PREPARING' ? 'bold' : 'normal'}}
              >
                  Prep <span style={styles.badge}>{orders.filter(o => o.status === 'PREPARING').length}</span>
              </button>
              <button 
                onClick={() => setActiveTab('READY')} 
                style={{...styles.tabBtn, borderBottom: activeTab === 'READY' ? '4px solid #4CAF50' : 'none', fontWeight: activeTab === 'READY' ? 'bold' : 'normal'}}
              >
                  Ready <span style={styles.badge}>{orders.filter(o => o.status === 'READY').length}</span>
              </button>
          </div>
      )}

      {/* CONTENT AREA */}
      <div style={styles.board}>
        
        {/* DESKTOP: SHOW ALL 3 COLUMNS */}
        {!isMobile && (
            <>
                {renderColumn('PENDING', 'New Order', 'PREPARING', 'Acknowledge', '#FF9800')}
                {renderColumn('PREPARING', 'In Preparation', 'READY', 'Mark Ready', '#2196F3')}
                {renderColumn('READY', 'Ready', 'COMPLETED', 'Serve', '#4CAF50')}
            </>
        )}

        {/* MOBILE: SHOW ONLY ACTIVE TAB */}
        {isMobile && (
            <>
                {activeTab === 'PENDING' && renderColumn('PENDING', 'New Order', 'PREPARING', 'Acknowledge', '#FF9800')}
                {activeTab === 'PREPARING' && renderColumn('PREPARING', 'In Preparation', 'READY', 'Mark Ready', '#2196F3')}
                {activeTab === 'READY' && renderColumn('READY', 'Ready', 'COMPLETED', 'Serve', '#4CAF50')}
            </>
        )}

      </div>
    </div>
  );
};

// --- STYLES ---
const styles = {
    container: {
        padding: '10px',
        backgroundColor: '#f4f6f8',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'Arial, sans-serif',
        overflow: 'hidden'
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '15px',
        padding: '0 10px'
    },
    backBtn: {
        marginRight: '15px',
        padding: '8px 12px',
        border: 'none',
        backgroundColor: '#333',
        color: 'white',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9rem'
    },
    board: {
        display: 'flex',
        gap: '15px',
        flex: 1,
        overflow: 'hidden', // Columns scroll internally
        paddingBottom: '10px'
    },
    // Desktop Column
    column: {
        flex: 1,
        backgroundColor: '#e3e8eb',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: '300px'
    },
    // Mobile Column (Full width, no min-width issues)
    mobileColumn: {
        flex: 1,
        backgroundColor: 'transparent', 
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: '100%'
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
        padding: '10px',
        overflowY: 'auto',
        flex: 1,
        // Smooth scrolling for touch devices
        WebkitOverflowScrolling: 'touch' 
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '15px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid #eee'
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        borderBottom: '1px solid #f0f0f0',
        paddingBottom: '8px'
    },
    itemList: {
        flex: 1,
        marginBottom: '15px'
    },
    actionBtn: {
        width: '100%',
        padding: '12px',
        border: 'none',
        borderRadius: '6px',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '1rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    },
    // Mobile Tabs Styles
    mobileTabs: {
        display: 'flex',
        backgroundColor: 'white',
        marginBottom: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        overflow: 'hidden'
    },
    tabBtn: {
        flex: 1,
        padding: '15px 5px',
        background: 'none',
        border: 'none',
        fontSize: '1rem',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        color: '#333'
    },
    badge: {
        backgroundColor: '#eee',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '0.8rem',
        color: '#555',
        fontWeight: 'bold'
    }
};

export default KitchenDisplay;