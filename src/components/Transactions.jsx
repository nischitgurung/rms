import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, getDocs, Timestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { useUser } from '../contexts/UserContext'; // <--- 1. NEW IMPORT

const Transactions = () => {
  const navigate = useNavigate();
  const { restaurantId } = useUser(); // <--- 2. GET RESTAURANT ID

  // --- STATE ---
  const [allTransactions, setAllTransactions] = useState([]);
  const [displayedTransactions, setDisplayedTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Filters
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');

  const [stats, setStats] = useState({ total: 0, cash: 0, online: 0, count: 0 });

  // --- RESPONSIVE LISTENER ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchTransactions = async () => {
    // <--- 3. GUARD CLAUSE
    if (!restaurantId) return;

    setLoading(true);
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // <--- 4. UPDATED QUERY: Filter by Restaurant ID + Date Range
      // NOTE: This might require a new Index. Check console for link.
      const q = query(
        collection(db, "transactions"),
        where("userId", "==", restaurantId), // Filter by Restaurant
        where("date", ">=", start),
        where("date", "<=", end)
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          date: d.date instanceof Timestamp ? d.date.toDate() : new Date(d.date)
        };
      });

      data.sort((a, b) => b.date - a.date);
      setAllTransactions(data);
      setLoading(false);
    } catch (error) {
      console.error("Error loading transactions:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [startDate, endDate, restaurantId]); // <--- 5. ADD DEPENDENCY

  useEffect(() => {
    let result = allTransactions;

    if (paymentFilter !== 'All') {
      result = result.filter(t => 
        paymentFilter === 'Online' ? (t.paymentMethod !== 'Cash') : (t.paymentMethod === 'Cash')
      );
    }

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.id.toLowerCase().includes(lowerTerm) || (t.table && t.table.toLowerCase().includes(lowerTerm))
      );
    }

    setDisplayedTransactions(result);

    const newStats = result.reduce((acc, curr) => {
      const amt = parseFloat(curr.amount) || 0;
      acc.total += amt;
      acc.count += 1;
      if (curr.paymentMethod === 'Cash') acc.cash += amt;
      else acc.online += amt;
      return acc;
    }, { total: 0, cash: 0, online: 0, count: 0 });

    setStats(newStats);
  }, [allTransactions, searchTerm, paymentFilter]);

  return (
    <div style={{ padding: isMobile ? '10px' : '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate('/')} style={styles.backBtn}>←</button>
        <h1 style={{ margin: '0 0 0 15px', fontSize: isMobile ? '1.2rem' : '1.8rem', color: '#333' }}>History</h1>
      </div>

      {/* CONTROLS BAR */}
      <div style={{ ...styles.controlsBar, flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...styles.input, flex: 1 }} />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ ...styles.input, flex: 1 }} />
        </div>

        <div style={{ display: 'flex', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
            <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} style={{ ...styles.select, flex: 1 }}>
                <option value="All">All</option>
                <option value="Cash">Cash</option>
                <option value="Online">Online</option>
            </select>
            <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                style={{ ...styles.input, flex: 2 }} 
            />
        </div>
      </div>

      {/* SUMMARY STATS */}
      <div style={{ ...styles.statsGrid, gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)' }}>
        <div style={{...styles.statCard, borderLeft: '4px solid #2196F3'}}>
            <div style={styles.statLabel}>Sales</div>
            <div style={{...styles.statValue, color: '#2196F3', fontSize: isMobile ? '1.1rem' : '1.5rem'}}>Rs. {stats.total.toFixed(0)}</div>
        </div>
        <div style={{...styles.statCard, borderLeft: '4px solid #4CAF50'}}>
            <div style={styles.statLabel}>Cash</div>
            <div style={{...styles.statValue, color: '#4CAF50', fontSize: isMobile ? '1.1rem' : '1.5rem'}}>Rs. {stats.cash.toFixed(0)}</div>
        </div>
        <div style={{...styles.statCard, borderLeft: '4px solid #9C27B0'}}>
            <div style={styles.statLabel}>Online</div>
            <div style={{...styles.statValue, color: '#9C27B0', fontSize: isMobile ? '1.1rem' : '1.5rem'}}>Rs. {stats.online.toFixed(0)}</div>
        </div>
        <div style={{...styles.statCard, borderLeft: '4px solid #333'}}>
            <div style={styles.statLabel}>Items</div>
            <div style={{...styles.statValue, fontSize: isMobile ? '1.1rem' : '1.5rem'}}>{stats.count}</div>
        </div>
      </div>

      {/* DATA VIEW */}
      {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {loading ? <p style={{textAlign:'center'}}>Loading...</p> : 
               displayedTransactions.length === 0 ? <p style={{textAlign:'center', color:'#888'}}>No matches.</p> :
               displayedTransactions.map(txn => (
                  <div key={txn.id} style={styles.mobileCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ fontWeight: 'bold' }}>{txn.table || "Sale"}</span>
                          <span style={{ fontWeight: 'bold', color: '#000' }}>Rs. {parseFloat(txn.amount).toFixed(0)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.75rem', color: '#666' }}>
                              {txn.date.toLocaleDateString()} • {txn.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                          <span style={txn.paymentMethod === 'Cash' ? styles.badgeCash : styles.badgeOnline}>
                              {txn.paymentMethod}
                          </span>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '8px', fontFamily: 'monospace' }}>
                          ID: {txn.id.slice(0, 10).toUpperCase()}
                      </div>
                  </div>
              ))}
          </div>
      ) : (
          <div style={styles.tableContainer}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#eee' }}>
                    <tr>
                        <th style={styles.th}>Date & Time</th><th style={styles.th}>ID</th><th style={styles.th}>Table</th><th style={styles.th}>Method</th><th style={{...styles.th, textAlign: 'right'}}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {displayedTransactions.map(txn => (
                        <tr key={txn.id} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: 'white' }}>
                            <td style={styles.td}>
                                <strong>{txn.date.toLocaleDateString()}</strong> {txn.date.toLocaleTimeString()}
                            </td>
                            <td style={{...styles.td, fontFamily: 'monospace', color: '#555'}}>{txn.id.toUpperCase()}</td>
                            <td style={{...styles.td, fontWeight: 'bold'}}>{txn.table}</td>
                            <td style={styles.td}>
                                <span style={txn.paymentMethod === 'Cash' ? styles.badgeCash : styles.badgeOnline}>{txn.paymentMethod}</span>
                            </td>
                            <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold'}}>Rs. {parseFloat(txn.amount).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
      )}
    </div>
  );
};

const styles = {
    backBtn: { padding: '10px 15px', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    controlsBar: { backgroundColor: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', gap: '10px' },
    input: { padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem' },
    select: { padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem' },
    statsGrid: { display: 'grid', gap: '10px', marginBottom: '20px' },
    statCard: { backgroundColor: 'white', padding: '12px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    statLabel: { fontSize: '0.7rem', color: '#888', textTransform: 'uppercase', marginBottom: '4px' },
    statValue: { fontWeight: 'bold' },
    tableContainer: { backgroundColor: 'white', borderRadius: '10px', overflowX: 'auto', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    mobileCard: { backgroundColor: 'white', padding: '15px', borderRadius: '10px', border: '1px solid #eee' },
    th: { padding: '15px', textAlign: 'left', fontSize: '0.85rem', color: '#555', fontWeight: 'bold' },
    td: { padding: '12px 15px', fontSize: '0.85rem' },
    badgeCash: { backgroundColor: '#E8F5E9', color: '#2E7D32', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' },
    badgeOnline: { backgroundColor: '#E3F2FD', color: '#1565C0', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }
};

export default Transactions;