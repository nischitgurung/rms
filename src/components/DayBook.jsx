import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const DayBook = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        // Fetch all transactions, sorted by date (Newest first)
        // Note: If you get an index error, remove "orderBy" temporarily
        const q = query(collection(db, "transactions"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        
        const data = snapshot.docs.map(doc => {
            const d = doc.data();
            // Convert Firestore Timestamp to readable JS Date
            return { 
                id: doc.id, 
                ...d, 
                date: d.date?.toDate ? d.date.toDate() : new Date(d.date) 
            };
        });

        setTransactions(data);

        // Calculate Total Income
        const total = data.reduce((sum, txn) => sum + (txn.amount || 0), 0);
        setTotalIncome(total);
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching daybook:", error);
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) return <div style={{padding:'40px'}}>Loading Financials...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <button onClick={() => navigate('/')} style={{ marginRight: '20px', padding: '10px' }}>← Back</button>
        <h1>Day Book & Financials</h1>
      </div>

      {/* --- SUMMARY CARDS (Matches PDF Page 27) --- */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <div style={{ 
          padding: '20px', borderRadius: '10px', 
          backgroundColor: '#4CAF50', color: 'white', flex: 1,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3>Total Income</h3>
          <div style={{ fontSize: '2em', fontWeight: 'bold' }}>${totalIncome.toFixed(2)}</div>
        </div>
        
        <div style={{ 
          padding: '20px', borderRadius: '10px', 
          backgroundColor: '#2196F3', color: 'white', flex: 1,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3>Transactions</h3>
          <div style={{ fontSize: '2em', fontWeight: 'bold' }}>{transactions.length}</div>
        </div>
      </div>

      {/* --- TRANSACTION TABLE --- */}
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
        <thead style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
          <tr>
            <th style={{ padding: '15px', textAlign: 'left' }}>Date / Time</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Description</th>
            <th style={{ padding: '15px', textAlign: 'left' }}>Method</th>
            <th style={{ padding: '15px', textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => (
            <tr key={txn.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '15px' }}>
                {txn.date.toLocaleDateString()} <small style={{color:'#888'}}>{txn.date.toLocaleTimeString()}</small>
              </td>
              <td style={{ padding: '15px' }}>{txn.description}</td>
              <td style={{ padding: '15px' }}>
                <span style={{ padding: '5px 10px', backgroundColor: '#eee', borderRadius: '15px', fontSize: '0.8em' }}>
                  {txn.paymentMethod}
                </span>
              </td>
              <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#4CAF50' }}>
                +${txn.amount.toFixed(2)}
              </td>
            </tr>
          ))}
          {transactions.length === 0 && (
            <tr>
              <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                No transactions recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DayBook;