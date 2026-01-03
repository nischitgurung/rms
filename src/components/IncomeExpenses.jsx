import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

const IncomeExpenses = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  
  // Modal State
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', category: 'Utilities' });

  // --- 1. FETCH DATA (By Month) ---
  useEffect(() => {
    setLoading(true);
    const [year, month] = selectedMonth.split('-');
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const q = query(
        collection(db, "transactions"),
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
  }, [selectedMonth]);

  // --- 2. CALCULATIONS ---
  const incomeList = transactions.filter(t => t.type === 'INCOME');
  const expenseList = transactions.filter(t => t.type === 'EXPENSE');

  const totalIncome = incomeList.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const totalExpense = expenseList.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;

  // Calculate Percentage for Progress Bar
  const totalVolume = totalIncome + totalExpense;
  const incomePercent = totalVolume === 0 ? 0 : (totalIncome / totalVolume) * 100;
  const expensePercent = totalVolume === 0 ? 0 : (totalExpense / totalVolume) * 100;

  // --- 3. ADD EXPENSE HANDLER ---
  const handleAddExpense = async (e) => {
      e.preventDefault();
      if(!expenseForm.amount || !expenseForm.description) return;

      try {
          await addDoc(collection(db, "transactions"), {
              type: "EXPENSE",
              amount: parseFloat(expenseForm.amount),
              description: expenseForm.description,
              category: expenseForm.category, // e.g. Rent, Salary
              paymentMethod: "Cash",
              date: new Date(),
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
    <div style={{ padding: '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate('/')} style={styles.backBtn}>← Back</button>
            <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#333' }}>Income & Expenses</h1>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Profit & Loss Statement</div>
            </div>
        </div>
        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
            <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                style={styles.dateInput}
            />
            <button onClick={() => setShowExpenseForm(true)} style={styles.addBtn}>+ Add Expense</button>
        </div>
      </div>

      {/* --- ADD EXPENSE MODAL --- */}
      {showExpenseForm && (
          <div style={styles.modalOverlay}>
              <div style={styles.modal}>
                  <h3>Add Operational Expense</h3>
                  <form onSubmit={handleAddExpense} style={{display:'grid', gap:'15px'}}>
                      <div>
                          <label style={styles.label}>Category</label>
                          <select 
                            value={expenseForm.category} 
                            onChange={e => setExpenseForm({...expenseForm, category: e.target.value})}
                            style={styles.input}
                          >
                              <option>Utilities</option>
                              <option>Rent</option>
                              <option>Salaries</option>
                              <option>Maintenance</option>
                              <option>Marketing</option>
                              <option>Inventory Purchase</option>
                              <option>Other</option>
                          </select>
                      </div>
                      <div>
                          <label style={styles.label}>Description</label>
                          <input type="text" placeholder="e.g. December Electricity Bill" required 
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
                          <button type="submit" style={styles.saveBtn}>Save Expense</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* --- FINANCIAL OVERVIEW --- */}
      <div style={styles.summaryContainer}>
          <div style={{...styles.statBox, color: '#4CAF50'}}>
              <span style={styles.statLabel}>Total Income</span>
              <span style={styles.statValue}>Rs. {totalIncome.toFixed(2)}</span>
          </div>
          <div style={{...styles.statBox, color: '#D32F2F', borderLeft: '1px solid #eee', borderRight: '1px solid #eee'}}>
              <span style={styles.statLabel}>Total Expenses</span>
              <span style={styles.statValue}>Rs. {totalExpense.toFixed(2)}</span>
          </div>
          <div style={{...styles.statBox, color: netProfit >= 0 ? '#2196F3' : 'orange'}}>
              <span style={styles.statLabel}>Net Profit / Loss</span>
              <span style={styles.statValue}>Rs. {netProfit.toFixed(2)}</span>
          </div>
      </div>

      {/* --- VISUAL BAR CHART --- */}
      <div style={styles.barContainer}>
          <div style={{...styles.barSegment, width: `${incomePercent}%`, backgroundColor: '#4CAF50'}}>
              {incomePercent > 10 && <span style={styles.barText}>{incomePercent.toFixed(0)}% Income</span>}
          </div>
          <div style={{...styles.barSegment, width: `${expensePercent}%`, backgroundColor: '#D32F2F'}}>
              {expensePercent > 10 && <span style={styles.barText}>{expensePercent.toFixed(0)}% Exp</span>}
          </div>
      </div>

      {/* --- SPLIT VIEW (INCOME vs EXPENSE) --- */}
      <div style={styles.splitView}>
          
          {/* INCOME COLUMN */}
          <div style={styles.column}>
              <h3 style={{...styles.colHeader, color: '#4CAF50', borderBottom: '3px solid #4CAF50'}}>
                  Income Sources ({incomeList.length})
              </h3>
              <div style={styles.list}>
                  {loading ? <div>Loading...</div> : incomeList.length === 0 ? <div style={styles.empty}>No income records.</div> : (
                      incomeList.map(item => (
                          <div key={item.id} style={styles.listItem}>
                              <div>
                                  <div style={styles.itemTitle}>{item.table ? `Table: ${item.table}` : 'Direct Sale'}</div>
                                  <div style={styles.itemDate}>{item.date.toLocaleDateString()}</div>
                              </div>
                              <div style={{fontWeight:'bold', color: '#4CAF50'}}>+ {item.amount.toFixed(2)}</div>
                          </div>
                      ))
                  )}
              </div>
          </div>

          {/* EXPENSE COLUMN */}
          <div style={styles.column}>
              <h3 style={{...styles.colHeader, color: '#D32F2F', borderBottom: '3px solid #D32F2F'}}>
                  Expenses ({expenseList.length})
              </h3>
              <div style={styles.list}>
                  {loading ? <div>Loading...</div> : expenseList.length === 0 ? <div style={styles.empty}>No expense records.</div> : (
                      expenseList.map(item => (
                          <div key={item.id} style={styles.listItem}>
                              <div>
                                  <div style={styles.itemTitle}>{item.description}</div>
                                  <div style={styles.itemCategory}>{item.category || item.vendor || 'General'} • {item.date.toLocaleDateString()}</div>
                              </div>
                              <div style={{fontWeight:'bold', color: '#D32F2F'}}>- {item.amount.toFixed(2)}</div>
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
    backBtn: { padding: '8px 16px', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#555' },
    dateInput: { padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' },
    addBtn: { padding: '10px 20px', backgroundColor: '#D32F2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    
    summaryContainer: { display: 'flex', backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '20px', padding: '20px' },
    statBox: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
    statLabel: { fontSize: '0.9rem', color: '#888', textTransform: 'uppercase', marginBottom: '5px' },
    statValue: { fontSize: '2rem', fontWeight: 'bold' },

    barContainer: { display: 'flex', height: '30px', width: '100%', borderRadius: '15px', overflow: 'hidden', marginBottom: '30px', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' },
    barSegment: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'width 0.5s ease' },
    barText: { color: 'white', fontSize: '0.85rem', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.5)' },

    splitView: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' },
    column: { backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden', display:'flex', flexDirection:'column', maxHeight:'600px' },
    colHeader: { margin: 0, padding: '15px', backgroundColor: '#fafafa', fontSize: '1.1rem', textAlign: 'center' },
    list: { padding: '15px', overflowY: 'auto', flex: 1 },
    listItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', padding: '10px 0' },
    itemTitle: { fontWeight: 'bold', fontSize: '0.95rem', color: '#333' },
    itemDate: { fontSize: '0.8rem', color: '#888' },
    itemCategory: { fontSize: '0.8rem', color: '#666', fontStyle: 'italic' },
    empty: { textAlign: 'center', color: '#999', padding: '20px' },

    // Modal
    modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', padding: '25px', borderRadius: '10px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem', color: '#555' },
    input: { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box' },
    cancelBtn: { flex: 1, padding: '10px', border: '1px solid #ccc', backgroundColor: 'white', borderRadius: '5px', cursor: 'pointer' },
    saveBtn: { flex: 1, padding: '10px', border: 'none', backgroundColor: 'black', color: 'white', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }
};

export default IncomeExpenses;