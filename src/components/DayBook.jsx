import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

const DayBook = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Default: Today
  
  // Stats for the Day
  const [stats, setStats] = useState({
    totalIncome: 0,
    cashTotal: 0,
    onlineTotal: 0,
    count: 0
  });

  // --- FETCH DATA (Real-time) ---
  useEffect(() => {
    setLoading(true);

    // 1. Create Date Range for Query (Start of day to End of day)
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 2. Query Firestore
    // Note: ensure you have a composite index in Firestore for 'date' if needed, 
    // or sorting might need to be done client-side if the index isn't ready.
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
                // Handle Firestore Timestamp safely
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

  // --- CALCULATE TOTALS ---
  const calculateStats = (data) => {
      let total = 0;
      let cash = 0;
      let online = 0;

      data.forEach(txn => {
          const amt = parseFloat(txn.amount) || 0;
          total += amt;
          
          if (txn.paymentMethod === 'Cash') {
              cash += amt;
          } else {
              online += amt;
          }
      });

      setStats({
          totalIncome: total,
          cashTotal: cash,
          onlineTotal: online,
          count: data.length
      });
  };

  return (
    <div style={{ padding: '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate('/')} style={styles.backBtn}>← Back</button>
            <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#333' }}>Day Book</h1>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Financial overview for {selectedDate}</div>
            </div>
        </div>

        {/* DATE PICKER */}
        <div>
            <label style={{ marginRight: '10px', fontWeight: 'bold', color: '#555' }}>Select Date:</label>
            <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                style={styles.dateInput}
            />
        </div>
      </div>

      {/* --- STAT CARDS --- */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.card, borderLeft: '5px solid #2196F3' }}>
            <div style={styles.cardLabel}>Total Transactions</div>
            <div style={styles.cardValue}>{stats.count}</div>
        </div>
        <div style={{ ...styles.card, borderLeft: '5px solid #4CAF50' }}>
            <div style={styles.cardLabel}>Total Income</div>
            <div style={{ ...styles.cardValue, color: '#4CAF50' }}>Rs. {stats.totalIncome.toFixed(2)}</div>
        </div>
        <div style={{ ...styles.card, borderLeft: '5px solid #FF9800' }}>
            <div style={styles.cardLabel}>Cash In Hand</div>
            <div style={styles.cardValue}>Rs. {stats.cashTotal.toFixed(2)}</div>
        </div>
        <div style={{ ...styles.card, borderLeft: '5px solid #9C27B0' }}>
            <div style={styles.cardLabel}>Online / Card</div>
            <div style={styles.cardValue}>Rs. {stats.onlineTotal.toFixed(2)}</div>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div style={{ backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f1f1f1', borderBottom: '2px solid #ddd' }}>
                <tr>
                    <th style={styles.th}>Time</th>
                    <th style={styles.th}>Table / Source</th>
                    <th style={styles.th}>Payment Mode</th>
                    <th style={styles.th}>Transaction ID</th>
                    <th style={{...styles.th, textAlign: 'right'}}>Amount</th>
                </tr>
            </thead>
            <tbody>
                {loading ? (
                    <tr><td colSpan="5" style={{padding:'30px', textAlign:'center'}}>Loading data...</td></tr>
                ) : transactions.length === 0 ? (
                    <tr><td colSpan="5" style={{padding:'30px', textAlign:'center', color:'#888'}}>No transactions found for this date.</td></tr>
                ) : (
                    transactions.map((txn) => (
                        <tr key={txn.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={styles.td}>
                                {txn.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{...styles.td, fontWeight:'bold'}}>{txn.table || "General"}</td>
                            <td style={styles.td}>
                                <span style={{
                                    padding: '4px 8px', 
                                    borderRadius: '4px', 
                                    backgroundColor: txn.paymentMethod === 'Cash' ? '#E8F5E9' : '#E3F2FD',
                                    color: txn.paymentMethod === 'Cash' ? '#2E7D32' : '#1565C0',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold'
                                }}>
                                    {txn.paymentMethod}
                                </span>
                            </td>
                            <td style={{...styles.td, fontFamily: 'monospace', color: '#666'}}>
                                {txn.id.slice(0, 8).toUpperCase()}
                            </td>
                            <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold', color: '#333'}}>
                                Rs. {parseFloat(txn.amount).toFixed(2)}
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
            {/* FOOTER ROW FOR TOTAL */}
            {!loading && transactions.length > 0 && (
                <tfoot style={{ backgroundColor: '#f9f9f9', fontWeight: 'bold' }}>
                    <tr>
                        <td colSpan="4" style={{ padding: '15px', textAlign: 'right' }}>Total for {selectedDate}:</td>
                        <td style={{ padding: '15px', textAlign: 'right', fontSize: '1.1rem', color: '#000' }}>
                            Rs. {stats.totalIncome.toFixed(2)}
                        </td>
                    </tr>
                </tfoot>
            )}
          </table>
      </div>

    </div>
  );
};

// --- STYLES ---
const styles = {
    backBtn: { padding: '8px 16px', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#555' },
    dateInput: { padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
    card: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    cardLabel: { fontSize: '0.9rem', color: '#666', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' },
    cardValue: { fontSize: '1.8rem', fontWeight: 'bold', color: '#333' },
    th: { padding: '15px', textAlign: 'left', fontSize: '0.9rem', color: '#555', fontWeight: 'bold' },
    td: { padding: '15px', fontSize: '0.95rem', color: '#333' }
};

export default DayBook;