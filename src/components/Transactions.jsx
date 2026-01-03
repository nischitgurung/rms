import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

const Transactions = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [allTransactions, setAllTransactions] = useState([]); // Raw data from DB
  const [displayedTransactions, setDisplayedTransactions] = useState([]); // Filtered data for UI
  const [loading, setLoading] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('All');

  // Stats
  const [stats, setStats] = useState({ total: 0, cash: 0, online: 0, count: 0 });

  // --- 1. FETCH DATA (Based on Date Range) ---
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Create Date Objects for Query
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      // Query Firestore
      // Note: Indexing might be required by Firebase for complex queries.
      // We query by Date first, then sort manually to avoid index errors in development.
      const q = query(
        collection(db, "transactions"),
        where("date", ">=", start),
        where("date", "<=", end)
      );

      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          // Handle Timestamp conversion safely
          date: d.date instanceof Timestamp ? d.date.toDate() : new Date(d.date)
        };
      });

      // Client-side Sort (Newest First)
      data.sort((a, b) => b.date - a.date);

      setAllTransactions(data);
      setLoading(false);
    } catch (error) {
      console.error("Error loading transactions:", error);
      setLoading(false);
    }
  };

  // Initial Fetch
  useEffect(() => {
    fetchTransactions();
  }, [startDate, endDate]);

  // --- 2. CLIENT-SIDE FILTERING & STATS ---
  useEffect(() => {
    let result = allTransactions;

    // A. Apply Payment Filter
    if (paymentFilter !== 'All') {
      result = result.filter(t => 
        paymentFilter === 'Online' 
          ? (t.paymentMethod !== 'Cash') 
          : (t.paymentMethod === 'Cash')
      );
    }

    // B. Apply Search (ID or Table Name)
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(t => 
        t.id.toLowerCase().includes(lowerTerm) || 
        (t.table && t.table.toLowerCase().includes(lowerTerm))
      );
    }

    setDisplayedTransactions(result);

    // C. Calculate Stats for Displayed Data
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
    <div style={{ padding: '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* --- HEADER --- */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => navigate('/')} style={styles.backBtn}>← Back</button>
        <h1 style={{ margin: '0 0 0 15px', color: '#333' }}>Transaction History</h1>
      </div>

      {/* --- CONTROLS BAR --- */}
      <div style={styles.controlsBar}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Date Range */}
            <div style={styles.controlGroup}>
                <label style={styles.label}>From:</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.controlGroup}>
                <label style={styles.label}>To:</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={styles.input} />
            </div>
            <button onClick={fetchTransactions} style={styles.refreshBtn}>🔄 Refresh</button>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Payment Filter */}
            <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} style={styles.select}>
                <option value="All">All Methods</option>
                <option value="Cash">Cash Only</option>
                <option value="Online">Online / Card</option>
            </select>

            {/* Search */}
            <input 
                type="text" 
                placeholder="Search ID or Table..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                style={{ ...styles.input, width: '200px' }} 
            />
        </div>
      </div>

      {/* --- SUMMARY STATS --- */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Sales</div>
            <div style={{...styles.statValue, color: '#2196F3'}}>Rs. {stats.total.toFixed(2)}</div>
        </div>
        <div style={styles.statCard}>
            <div style={styles.statLabel}>Cash Collected</div>
            <div style={{...styles.statValue, color: '#4CAF50'}}>Rs. {stats.cash.toFixed(2)}</div>
        </div>
        <div style={styles.statCard}>
            <div style={styles.statLabel}>Online / Khalti</div>
            <div style={{...styles.statValue, color: '#9C27B0'}}>Rs. {stats.online.toFixed(2)}</div>
        </div>
        <div style={styles.statCard}>
            <div style={styles.statLabel}>Txn Count</div>
            <div style={styles.statValue}>{stats.count}</div>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div style={styles.tableContainer}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#eee', borderBottom: '2px solid #ddd' }}>
                <tr>
                    <th style={styles.th}>Date & Time</th>
                    <th style={styles.th}>Transaction ID</th>
                    <th style={styles.th}>Table</th>
                    <th style={styles.th}>Method</th>
                    <th style={{...styles.th, textAlign: 'right'}}>Amount</th>
                </tr>
            </thead>
            <tbody>
                {loading ? (
                    <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center' }}>Loading...</td></tr>
                ) : displayedTransactions.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#888' }}>No transactions found for this range.</td></tr>
                ) : (
                    displayedTransactions.map(txn => (
                        <tr key={txn.id} style={{ borderBottom: '1px solid #f0f0f0', backgroundColor: 'white' }}>
                            <td style={styles.td}>
                                <div style={{fontWeight:'bold'}}>{txn.date.toLocaleDateString()}</div>
                                <div style={{fontSize:'0.8rem', color:'#888'}}>{txn.date.toLocaleTimeString()}</div>
                            </td>
                            <td style={{...styles.td, fontFamily: 'monospace', color: '#555'}}>
                                {txn.id.toUpperCase()}
                            </td>
                            <td style={{...styles.td, fontWeight: 'bold'}}>{txn.table}</td>
                            <td style={styles.td}>
                                <span style={txn.paymentMethod === 'Cash' ? styles.badgeCash : styles.badgeOnline}>
                                    {txn.paymentMethod}
                                </span>
                            </td>
                            <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold', fontSize: '1rem'}}>
                                Rs. {parseFloat(txn.amount).toFixed(2)}
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
      </div>

    </div>
  );
};

// --- STYLES ---
const styles = {
    backBtn: { padding: '8px 16px', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#555' },
    
    controlsBar: { backgroundColor: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '15px' },
    controlGroup: { display: 'flex', alignItems: 'center', gap: '5px' },
    label: { fontSize: '0.9rem', fontWeight: 'bold', color: '#555' },
    input: { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' },
    select: { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem', minWidth: '120px' },
    refreshBtn: { padding: '8px 12px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },

    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '20px' },
    statCard: { backgroundColor: 'white', padding: '15px 20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', borderLeft: '4px solid #ddd' },
    statLabel: { fontSize: '0.85rem', color: '#888', textTransform: 'uppercase', marginBottom: '5px' },
    statValue: { fontSize: '1.5rem', fontWeight: 'bold', color: '#333' },

    tableContainer: { backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflowX: 'auto' },
    th: { padding: '15px', textAlign: 'left', fontSize: '0.9rem', color: '#555', fontWeight: 'bold', whiteSpace: 'nowrap' },
    td: { padding: '12px 15px', fontSize: '0.9rem', color: '#333' },

    badgeCash: { backgroundColor: '#E8F5E9', color: '#2E7D32', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' },
    badgeOnline: { backgroundColor: '#E3F2FD', color: '#1565C0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }
};

export default Transactions;