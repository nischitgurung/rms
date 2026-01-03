import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

const SalesPurchases = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form State for New Purchase
  const [purchaseForm, setPurchaseForm] = useState({
    description: '', // e.g. "Vegetables from Vendor A"
    vendor: '',
    amount: '',
    paymentMethod: 'Cash',
    date: new Date().toISOString().split('T')[0] // Default to today
  });

  // --- 1. FETCH DATA (Real-time) ---
  useEffect(() => {
    // Fetch ALL transactions (Income & Expense)
    const q = query(collection(db, "transactions"), orderBy("date", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const allData = snapshot.docs.map(doc => {
            const d = doc.data();
            return { 
                id: doc.id, 
                ...d, 
                date: d.date?.toDate ? d.date.toDate() : new Date(d.date) 
            };
        });

        // Separate into Sales (Income) and Purchases (Expense)
        const incomeData = allData.filter(t => t.type === 'INCOME');
        const expenseData = allData.filter(t => t.type === 'EXPENSE');

        setSales(incomeData);
        setPurchases(expenseData);
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- 2. CALCULATE STATS ---
  const totalSales = sales.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const totalPurchases = purchases.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const netProfit = totalSales - totalPurchases;

  // --- 3. HANDLE ADD PURCHASE ---
  const handleAddPurchase = async (e) => {
      e.preventDefault();
      if(!purchaseForm.amount || !purchaseForm.description) return alert("Please fill details");

      try {
          // Create timestamp from selected date
          const selectedDate = new Date(purchaseForm.date);
          // Set current time to keep sorting accurate
          const now = new Date();
          selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

          await addDoc(collection(db, "transactions"), {
              type: "EXPENSE",
              amount: parseFloat(purchaseForm.amount),
              description: `${purchaseForm.description} (${purchaseForm.vendor})`,
              vendor: purchaseForm.vendor,
              paymentMethod: purchaseForm.paymentMethod,
              date: selectedDate, // Use the date picker value
              createdAt: serverTimestamp()
          });

          alert("Purchase Logged Successfully!");
          setPurchaseForm({ description: '', vendor: '', amount: '', paymentMethod: 'Cash', date: new Date().toISOString().split('T')[0] });
          setShowForm(false);

      } catch (error) {
          console.error("Error adding purchase:", error);
          alert("Failed to save.");
      }
  };

  if (loading) return <div style={{padding:'40px'}}>Loading Financials...</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate('/')} style={styles.backBtn}>← Back</button>
            <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#333' }}>Sales & Purchases</h1>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Track Income vs Expenses</div>
            </div>
        </div>
        <button 
            onClick={() => setShowForm(!showForm)} 
            style={{ padding: '10px 20px', backgroundColor: '#D32F2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
            {showForm ? "Cancel" : "+ Record Purchase"}
        </button>
      </div>

      {/* --- STAT CARDS --- */}
      <div style={styles.statsGrid}>
        <div style={{ ...styles.card, borderTop: '5px solid #4CAF50' }}>
            <div style={styles.cardLabel}>Total Sales</div>
            <div style={{ ...styles.cardValue, color: '#4CAF50' }}>Rs. {totalSales.toFixed(2)}</div>
            <div style={styles.subText}>{sales.length} orders billed</div>
        </div>
        <div style={{ ...styles.card, borderTop: '5px solid #D32F2F' }}>
            <div style={styles.cardLabel}>Total Purchases</div>
            <div style={{ ...styles.cardValue, color: '#D32F2F' }}>Rs. {totalPurchases.toFixed(2)}</div>
            <div style={styles.subText}>{purchases.length} expenses recorded</div>
        </div>
        <div style={{ ...styles.card, borderTop: `5px solid ${netProfit >= 0 ? '#2196F3' : 'orange'}` }}>
            <div style={styles.cardLabel}>Net Profit</div>
            <div style={{ ...styles.cardValue, color: netProfit >= 0 ? '#2196F3' : 'orange' }}>Rs. {netProfit.toFixed(2)}</div>
            <div style={styles.subText}>Sales - Purchases</div>
        </div>
      </div>

      {/* --- PURCHASE FORM (Collapsible) --- */}
      {showForm && (
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '10px', marginBottom: '30px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', borderLeft: '5px solid #D32F2F' }}>
              <h3 style={{ marginTop: 0, color: '#D32F2F' }}>Record New Expense</h3>
              <form onSubmit={handleAddPurchase} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <div>
                      <label style={styles.label}>Item / Description</label>
                      <input 
                        type="text" required placeholder="e.g. Tomatoes 5kg" 
                        value={purchaseForm.description} onChange={e => setPurchaseForm({...purchaseForm, description: e.target.value})} 
                        style={styles.input} 
                      />
                  </div>
                  <div>
                      <label style={styles.label}>Vendor / Source</label>
                      <input 
                        type="text" placeholder="e.g. City Market" 
                        value={purchaseForm.vendor} onChange={e => setPurchaseForm({...purchaseForm, vendor: e.target.value})} 
                        style={styles.input} 
                      />
                  </div>
                  <div>
                      <label style={styles.label}>Cost Amount (Rs.)</label>
                      <input 
                        type="number" required placeholder="0.00" 
                        value={purchaseForm.amount} onChange={e => setPurchaseForm({...purchaseForm, amount: e.target.value})} 
                        style={styles.input} 
                      />
                  </div>
                  <div>
                      <label style={styles.label}>Date</label>
                      <input 
                        type="date" required 
                        value={purchaseForm.date} onChange={e => setPurchaseForm({...purchaseForm, date: e.target.value})} 
                        style={styles.input} 
                      />
                  </div>
                  <div>
                      <label style={styles.label}>Payment Method</label>
                      <select 
                        value={purchaseForm.paymentMethod} onChange={e => setPurchaseForm({...purchaseForm, paymentMethod: e.target.value})} 
                        style={styles.input}
                      >
                          <option>Cash</option>
                          <option>Bank Transfer</option>
                          <option>Credit</option>
                      </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'end' }}>
                      <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                          Save Expense
                      </button>
                  </div>
              </form>
          </div>
      )}

      {/* --- TABLES SECTION --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          
          {/* Recent Purchases Table */}
          <div style={styles.tableContainer}>
              <h3 style={{ padding: '15px', margin: 0, borderBottom: '1px solid #eee', color: '#D32F2F' }}>Recent Purchases</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#fff5f5' }}>
                      <tr>
                          <th style={styles.th}>Date</th>
                          <th style={styles.th}>Description</th>
                          <th style={{...styles.th, textAlign:'right'}}>Amount</th>
                      </tr>
                  </thead>
                  <tbody>
                      {purchases.length === 0 && <tr><td colSpan="3" style={{padding:'20px', textAlign:'center', color:'#999'}}>No purchases recorded.</td></tr>}
                      {purchases.slice(0, 10).map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                              <td style={styles.td}>{p.date.toLocaleDateString()}</td>
                              <td style={styles.td}>
                                  <div style={{fontWeight:'bold'}}>{p.description.split('(')[0]}</div>
                                  <div style={{fontSize:'0.8rem', color:'#888'}}>{p.vendor}</div>
                              </td>
                              <td style={{...styles.td, textAlign:'right', color:'#D32F2F', fontWeight:'bold'}}>
                                  - Rs. {parseFloat(p.amount).toFixed(2)}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>

          {/* Recent Sales Summary (Read Only) */}
          <div style={styles.tableContainer}>
              <h3 style={{ padding: '15px', margin: 0, borderBottom: '1px solid #eee', color: '#4CAF50' }}>Recent Sales</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: '#f0fff4' }}>
                      <tr>
                          <th style={styles.th}>Date</th>
                          <th style={styles.th}>Details</th>
                          <th style={{...styles.th, textAlign:'right'}}>Amount</th>
                      </tr>
                  </thead>
                  <tbody>
                      {sales.length === 0 && <tr><td colSpan="3" style={{padding:'20px', textAlign:'center', color:'#999'}}>No sales recorded.</td></tr>}
                      {sales.slice(0, 10).map(s => (
                          <tr key={s.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                              <td style={styles.td}>{s.date.toLocaleDateString()}</td>
                              <td style={styles.td}>
                                  <div style={{fontWeight:'bold'}}>Table: {s.table || 'Walk-in'}</div>
                                  <div style={{fontSize:'0.8rem', color:'#888'}}>{s.paymentMethod}</div>
                              </td>
                              <td style={{...styles.td, textAlign:'right', color:'#4CAF50', fontWeight:'bold'}}>
                                  + Rs. {parseFloat(s.amount).toFixed(2)}
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>

      </div>

    </div>
  );
};

// --- STYLES ---
const styles = {
    backBtn: { padding: '8px 16px', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#555' },
    statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
    card: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    cardLabel: { fontSize: '0.9rem', color: '#666', marginBottom: '5px', textTransform: 'uppercase' },
    cardValue: { fontSize: '1.8rem', fontWeight: 'bold' },
    subText: { fontSize: '0.8rem', color: '#999', marginTop: '5px' },
    
    label: { display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' },
    
    tableContainer: { backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' },
    th: { padding: '12px 15px', textAlign: 'left', fontSize: '0.85rem', color: '#555', fontWeight: 'bold' },
    td: { padding: '12px 15px', fontSize: '0.9rem', color: '#333' }
};

export default SalesPurchases;