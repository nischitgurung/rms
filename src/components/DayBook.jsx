import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

const DayBook = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [stats, setStats] = useState({ totalIncome: 0, cashTotal: 0, onlineTotal: 0, count: 0 });

  // --- RESPONSIVE LISTENER ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- FETCH DATA ---
  useEffect(() => {
    setLoading(true);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
        collection(db, "transactions"),
        where("date", ">=", startOfDay),
        where("date", "<=", endOfDay),
        orderBy("date", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                ...d,
                date: d.date?.toDate ? d.date.toDate() : new Date(d.date)
            };
        });
        setTransactions(data);
        calculateStats(data);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching transactions:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate]);

  const calculateStats = (data) => {
      let total = 0, cash = 0, online = 0;
      data.forEach(txn => {
          const amt = parseFloat(txn.amount) || 0;
          total += amt;
          if (txn.paymentMethod === 'Cash') cash += amt;
          else online += amt;
      });
      setStats({ totalIncome: total, cashTotal: cash, onlineTotal: online, count: data.length });
  };

  return (
    <div style={{ padding: isMobile ? '10px' : '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '20px', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate('/')} style={styles.backBtn}>←</button>
            <div>
                <h1 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.8rem', color: '#333' }}>Day Book</h1>
                <div style={{ color: '#666', fontSize: '0.8rem' }}>{selectedDate}</div>
            </div>
        </div>

        <div>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{...styles.dateInput, width: isMobile ? '100%' : 'auto'}} />
        </div>
      </div>

      {/* --- STAT CARDS --- */}
      <div style={{ ...styles.statsGrid, gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)' }}>
        <div style={{ ...styles.card, borderLeft: '4px solid #2196F3', padding: isMobile ? '12px' : '20px' }}>
            <div style={styles.cardLabel}>Count</div>
            <div style={{...styles.cardValue, fontSize: isMobile ? '1.2rem' : '1.8rem'}}>{stats.count}</div>
        </div>
        <div style={{ ...styles.card, borderLeft: '4px solid #4CAF50', padding: isMobile ? '12px' : '20px' }}>
            <div style={styles.cardLabel}>Income</div>
            <div style={{ ...styles.cardValue, color: '#4CAF50', fontSize: isMobile ? '1.1rem' : '1.5rem' }}>Rs.{Math.round(stats.totalIncome)}</div>
        </div>
        <div style={{ ...styles.card, borderLeft: '4px solid #FF9800', padding: isMobile ? '12px' : '20px' }}>
            <div style={styles.cardLabel}>Cash</div>
            <div style={{...styles.cardValue, fontSize: isMobile ? '1.1rem' : '1.5rem'}}>Rs.{Math.round(stats.cashTotal)}</div>
        </div>
        <div style={{ ...styles.card, borderLeft: '4px solid #9C27B0', padding: isMobile ? '12px' : '20px' }}>
            <div style={styles.cardLabel}>Online</div>
            <div style={{...styles.cardValue, fontSize: isMobile ? '1.1rem' : '1.5rem'}}>Rs.{Math.round(stats.onlineTotal)}</div>
        </div>
      </div>

      {/* --- TRANSACTIONS LIST --- */}
      <div style={{ backgroundColor: isMobile ? 'transparent' : 'white', borderRadius: '10px', boxShadow: isMobile ? 'none' : '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {loading ? (
              <div style={{padding:'50px', textAlign:'center'}}>Loading...</div>
          ) : transactions.length === 0 ? (
              <div style={{padding:'50px', textAlign:'center', color:'#888', backgroundColor:'white', borderRadius:'10px'}}>No records.</div>
          ) : isMobile ? (
              /* MOBILE VIEW: CARDS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {transactions.map((txn) => (
                      <div key={txn.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '10px', border: '1px solid #eee' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>{txn.table || "General"}</span>
                              <span style={{ fontWeight: 'bold', color: '#333' }}>Rs.{txn.amount}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                  {txn.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ID: {txn.id.slice(0, 5).toUpperCase()}
                              </span>
                              <span style={{
                                  padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold',
                                  backgroundColor: txn.paymentMethod === 'Cash' ? '#E8F5E9' : '#E3F2FD',
                                  color: txn.paymentMethod === 'Cash' ? '#2E7D32' : '#1565C0'
                              }}>{txn.paymentMethod}</span>
                          </div>
                      </div>
                  ))}
              </div>
          ) : (
              /* DESKTOP VIEW: TABLE */
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f1f1f1' }}>
                    <tr>
                        <th style={styles.th}>Time</th><th style={styles.th}>Source</th><th style={styles.th}>Mode</th><th style={styles.th}>ID</th><th style={{...styles.th, textAlign: 'right'}}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((txn) => (
                        <tr key={txn.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={styles.td}>{txn.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td style={{...styles.td, fontWeight:'bold'}}>{txn.table || "General"}</td>
                            <td style={styles.td}>{txn.paymentMethod}</td>
                            <td style={{...styles.td, fontFamily: 'monospace', color: '#666'}}>{txn.id.slice(0, 8).toUpperCase()}</td>
                            <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>Rs.{parseFloat(txn.amount).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
              </table>
          )}
      </div>
    </div>
  );
};

const styles = {
    backBtn: { padding: '10px 15px', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    dateInput: { padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', backgroundColor: 'white' },
    statsGrid: { display: 'grid', gap: '10px', marginBottom: '20px' },
    card: { backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    cardLabel: { fontSize: '0.7rem', color: '#888', marginBottom: '5px', textTransform: 'uppercase' },
    cardValue: { fontWeight: 'bold', color: '#333' },
    th: { padding: '15px', textAlign: 'left', fontSize: '0.85rem', color: '#555', fontWeight: 'bold' },
    td: { padding: '15px', fontSize: '0.9rem', color: '#333' }
};

export default DayBook;