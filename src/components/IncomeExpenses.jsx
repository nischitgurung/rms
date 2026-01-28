import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext'; // <--- 1. NEW IMPORT

const IncomeExpenses = () => {
  const navigate = useNavigate();
  const { restaurantId } = useUser(); // <--- 2. GET RESTAURANT ID

  // --- STATE ---
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Modal State
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'Utilities' });

  // --- RESPONSIVE LISTENER ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- 1. FETCH DATA (By Month) ---
  useEffect(() => {
    // <--- 3. GUARD CLAUSE
    if (!restaurantId) return;

    setLoading(true);
    const [year, month] = selectedMonth.split('-');
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // <--- 4. UPDATED QUERY: Filter by Restaurant ID + Date Range
    // NOTE: This might require a new Index. Check console for link.
    const q = query(
        collection(db, "transactions"),
        where("userId", "==", restaurantId), // Filter by Restaurant
        where("date", ">=", startDate),
        where("date", "<=", endDate),
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
        setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedMonth, restaurantId]); // <--- 5. ADD DEPENDENCY

  // --- 2. CALCULATIONS ---
  const incomeList = transactions.filter(t => t.type === 'INCOME');
  const expenseList = transactions.filter(t => t.type === 'EXPENSE');

  const totalIncome = incomeList.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const totalExpense = expenseList.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;

  const totalVolume = totalIncome + totalExpense;
  const incomePercent = totalVolume === 0 ? 0 : (totalIncome / totalVolume) * 100;
  const expensePercent = totalVolume === 0 ? 0 : (totalExpense / totalVolume) * 100;

  // --- 3. ADD EXPENSE HANDLER ---
  const handleAddExpense = async (e) => {
      e.preventDefault();
      if(!expenseForm.amount || !expenseForm.description) return;

      try {
          // <--- 6. TAG NEW EXPENSE WITH RESTAURANT ID
          await addDoc(collection(db, "transactions"), {
              type: "EXPENSE",
              amount: parseFloat(expenseForm.amount),
              description: expenseForm.description,
              category: expenseForm.category,
              paymentMethod: "Cash",
              date: new Date(),
              userId: restaurantId, // <--- IMPORTANT
              createdAt: serverTimestamp()
          });
          setShowExpenseForm(false);
          setExpenseForm({ description: '', amount: '', category: 'Utilities' });
          alert("Expense Recorded");
      } catch (error) {
          console.error(error);
          alert("Error saving expense");
      }
  };

  return (
    <div style={{ padding: isMobile ? '10px' : '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '20px', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate('/')} style={styles.backBtn}>←</button>
            <div>
                <h1 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.8rem', color: '#333' }}>Income & Expenses</h1>
            </div>
        </div>
        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
            <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                style={{...styles.dateInput, flex: 1}}
            />
            <button onClick={() => setShowExpenseForm(true)} style={styles.addBtn}>+ Add</button>
        </div>
      </div>

      {/* --- ADD EXPENSE MODAL --- */}
      {showExpenseForm && (
          <div style={styles.modalOverlay}>
              <div style={{...styles.modal, width: isMobile ? '90%' : '400px'}}>
                  <h3 style={{marginTop: 0}}>Add Expense</h3>
                  <form onSubmit={handleAddExpense} style={{display:'grid', gap:'15px'}}>
                      <div>
                          <label style={styles.label}>Category</label>
                          <select 
                            value={expenseForm.category} 
                            onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                            style={styles.input}
                          >
                              <option>Utilities</option><option>Rent</option><option>Salaries</option><option>Maintenance</option><option>Inventory Purchase</option><option>Other</option>
                          </select>
                      </div>
                      <div>
                          <label style={styles.label}>Description</label>
                          <input type="text" placeholder="e.g. Electricity Bill" required 
                            value={expenseForm.description} onChange={e => setExpenseForm({...expenseForm, description: e.target.value})}
                            style={styles.input}
                          />
                      </div>
                      <div>
                          <label style={styles.label}>Amount</label>
                          <input type="number" placeholder="0.00" required 
                            value={expenseForm.amount} onChange={e => setExpenseForm({...expenseForm, amount: e.target.value})}
                            style={styles.input}
                          />
                      </div>
                      <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                          <button type="button" onClick={() => setShowExpenseForm(false)} style={styles.cancelBtn}>Cancel</button>
                          <button type="submit" style={styles.saveBtn}>Save</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* --- FINANCIAL OVERVIEW --- */}
      <div style={{...styles.summaryContainer, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '15px' : '0'}}>
          <div style={{...styles.statBox, color: '#4CAF50'}}>
              <span style={styles.statLabel}>Total Income</span>
              <span style={{...styles.statValue, fontSize: isMobile ? '1.5rem' : '2rem'}}>Rs. {totalIncome.toFixed(0)}</span>
          </div>
          <div style={{...styles.statBox, color: '#D32F2F', borderLeft: isMobile ? 'none' : '1px solid #eee', borderRight: isMobile ? 'none' : '1px solid #eee'}}>
              <span style={styles.statLabel}>Total Expenses</span>
              <span style={{...styles.statValue, fontSize: isMobile ? '1.5rem' : '2rem'}}>Rs. {totalExpense.toFixed(0)}</span>
          </div>
          <div style={{...styles.statBox, color: netProfit >= 0 ? '#2196F3' : 'orange'}}>
              <span style={styles.statLabel}>Net {netProfit >= 0 ? 'Profit' : 'Loss'}</span>
              <span style={{...styles.statValue, fontSize: isMobile ? '1.5rem' : '2rem'}}>Rs. {netProfit.toFixed(0)}</span>
          </div>
      </div>

      {/* --- VISUAL BAR CHART --- */}
      <div style={{...styles.barContainer, height: isMobile ? '40px' : '30px'}}>
          <div style={{...styles.barSegment, width: `${incomePercent}%`, backgroundColor: '#4CAF50'}}>
              {incomePercent > 15 && <span style={styles.barText}>{incomePercent.toFixed(0)}%</span>}
          </div>
          <div style={{...styles.barSegment, width: `${expensePercent}%`, backgroundColor: '#D32F2F'}}>
              {expensePercent > 15 && <span style={styles.barText}>{expensePercent.toFixed(0)}%</span>}
          </div>
      </div>

      {/* --- SPLIT VIEW --- */}
      <div style={{...styles.splitView, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))'}}>
          
          <div style={styles.column}>
              <h3 style={{...styles.colHeader, color: '#4CAF50', borderBottom: '3px solid #4CAF50'}}>Income Sources</h3>
              <div style={styles.list}>
                  {loading ? <div>Loading...</div> : incomeList.length === 0 ? <div style={styles.empty}>No income records.</div> : (
                      incomeList.map(item => (
                          <div key={item.id} style={styles.listItem}>
                              <div>
                                  <div style={styles.itemTitle}>{item.table ? `Table ${item.table}` : 'Sale'}</div>
                                  <div style={styles.itemDate}>{item.date.toLocaleDateString()}</div>
                              </div>
                              <div style={{fontWeight:'bold', color: '#4CAF50'}}>+{item.amount.toFixed(0)}</div>
                          </div>
                      ))
                  )}
              </div>
          </div>

          <div style={styles.column}>
              <h3 style={{...styles.colHeader, color: '#D32F2F', borderBottom: '3px solid #D32F2F'}}>Expenses</h3>
              <div style={styles.list}>
                  {loading ? <div>Loading...</div> : expenseList.length === 0 ? <div style={styles.empty}>No expense records.</div> : (
                      expenseList.map(item => (
                          <div key={item.id} style={styles.listItem}>
                              <div>
                                  <div style={styles.itemTitle}>{item.description}</div>
                                  <div style={styles.itemCategory}>{item.category} • {item.date.toLocaleDateString()}</div>
                              </div>
                              <div style={{fontWeight:'bold', color: '#D32F2F'}}>-{item.amount.toFixed(0)}</div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

// --- STYLES ---
const styles = {
    backBtn: { padding: '8px 12px', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', fontWeight: 'bold' },
    dateInput: { padding: '10px', borderRadius: '6px', border: '1px solid #ddd' },
    addBtn: { padding: '10px 15px', backgroundColor: '#D32F2F', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' },
    summaryContainer: { display: 'flex', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '20px', padding: '20px' },
    statBox: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    statLabel: { fontSize: '0.75rem', color: '#888', textTransform: 'uppercase' },
    statValue: { fontWeight: 'bold' },
    barContainer: { display: 'flex', width: '100%', borderRadius: '20px', overflow: 'hidden', marginBottom: '30px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' },
    barSegment: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    barText: { color: 'white', fontSize: '0.75rem', fontWeight: 'bold' },
    splitView: { display: 'grid', gap: '20px' },
    column: { backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', display:'flex', flexDirection:'column', maxHeight:'400px' },
    colHeader: { margin: 0, padding: '12px', backgroundColor: '#fafafa', fontSize: '1rem', textAlign: 'center' },
    list: { padding: '15px', overflowY: 'auto', flex: 1 },
    listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', padding: '10px 0' },
    itemTitle: { fontWeight: 'bold', fontSize: '0.9rem' },
    itemDate: { fontSize: '0.75rem', color: '#888' },
    itemCategory: { fontSize: '0.75rem', color: '#666' },
    empty: { textAlign: 'center', color: '#999', padding: '20px' },
    modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', padding: '25px', borderRadius: '10px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem' },
    input: { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box' },
    cancelBtn: { flex: 1, padding: '10px', border: '1px solid #ccc', backgroundColor: 'white', borderRadius: '5px' },
    saveBtn: { flex: 1, padding: '10px', border: 'none', backgroundColor: 'black', color: 'white', borderRadius: '5px', fontWeight: 'bold' }
};

export default IncomeExpenses;