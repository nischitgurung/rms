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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Form State
  const [purchaseForm, setPurchaseForm] = useState({
    description: '',
    vendor: '',
    amount: '',
    paymentMethod: 'Cash',
    date: new Date().toISOString().split('T')[0]
  });

  // --- RESPONSIVE LISTENER ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
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
        setSales(allData.filter(t => t.type === 'INCOME'));
        setPurchases(allData.filter(t => t.type === 'EXPENSE'));
        setLoading(false);
    });

    return () => {
        unsubscribe();
        window.removeEventListener('resize', handleResize);
    };
  }, []);

  const totalSales = sales.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const totalPurchases = purchases.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const netProfit = totalSales - totalPurchases;

  const handleAddPurchase = async (e) => {
      e.preventDefault();
      if(!purchaseForm.amount || !purchaseForm.description) return alert("Please fill details");

      try {
          const selectedDate = new Date(purchaseForm.date);
          const now = new Date();
          selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

          await addDoc(collection(db, "transactions"), {
              type: "EXPENSE",
              amount: parseFloat(purchaseForm.amount),
              description: `${purchaseForm.description} (${purchaseForm.vendor})`,
              vendor: purchaseForm.vendor,
              paymentMethod: purchaseForm.paymentMethod,
              date: selectedDate,
              createdAt: serverTimestamp()
          });

          alert("Purchase Logged!");
          setPurchaseForm({ description: '', vendor: '', amount: '', paymentMethod: 'Cash', date: new Date().toISOString().split('T')[0] });
          setShowForm(false);
      } catch (error) { console.error(error); alert("Failed to save."); }
  };

  if (loading) return <div style={{padding:'40px', textAlign: 'center'}}>Loading Financials...</div>;

  return (
    <div style={{ padding: isMobile ? '10px' : '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '20px', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate('/')} style={styles.backBtn}>←</button>
            <div>
                <h1 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.8rem', color: '#333' }}>Sales & Purchases</h1>
            </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
            {showForm ? "Cancel" : "+ Record Purchase"}
        </button>
      </div>

      {/* STATS */}
      <div style={{ ...styles.statsGrid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)' }}>
        <div style={{ ...styles.card, borderTop: '5px solid #4CAF50' }}>
            <div style={styles.cardLabel}>Sales</div>
            <div style={{ ...styles.cardValue, color: '#4CAF50' }}>Rs.{totalSales.toFixed(0)}</div>
            <div style={styles.subText}>{sales.length} orders</div>
        </div>
        <div style={{ ...styles.card, borderTop: '5px solid #D32F2F' }}>
            <div style={styles.cardLabel}>Purchases</div>
            <div style={{ ...styles.cardValue, color: '#D32F2F' }}>Rs.{totalPurchases.toFixed(0)}</div>
            <div style={styles.subText}>{purchases.length} expenses</div>
        </div>
        <div style={{ ...styles.card, borderTop: `5px solid ${netProfit >= 0 ? '#2196F3' : 'orange'}` }}>
            <div style={styles.cardLabel}>Net Profit</div>
            <div style={{ ...styles.cardValue, color: netProfit >= 0 ? '#2196F3' : 'orange' }}>Rs.{netProfit.toFixed(0)}</div>
        </div>
      </div>

      {/* PURCHASE FORM */}
      {showForm && (
          <div style={styles.formContainer}>
              <h3 style={{ marginTop: 0, color: '#D32F2F', fontSize: '1rem' }}>Record New Purchase</h3>
              <form onSubmit={handleAddPurchase} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input type="text" required placeholder="Item (e.g. Vegetables)" value={purchaseForm.description} onChange={e => setPurchaseForm({...purchaseForm, description: e.target.value})} style={styles.input} />
                  <input type="text" placeholder="Vendor" value={purchaseForm.vendor} onChange={e => setPurchaseForm({...purchaseForm, vendor: e.target.value})} style={styles.input} />
                  <div style={{display:'flex', gap:'10px'}}>
                    <input type="number" required placeholder="Amount" value={purchaseForm.amount} onChange={e => setPurchaseForm({...purchaseForm, amount: e.target.value})} style={{...styles.input, flex: 1}} />
                    <input type="date" required value={purchaseForm.date} onChange={e => setPurchaseForm({...purchaseForm, date: e.target.value})} style={{...styles.input, flex: 1}} />
                  </div>
                  <button type="submit" style={styles.saveBtn}>Save Transaction</button>
              </form>
          </div>
      )}

      {/* DATA VIEW */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
          
          {/* PURCHASES */}
          <div>
              <h3 style={{ color: '#D32F2F', fontSize: '1rem', marginBottom: '10px' }}>Purchases</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {purchases.slice(0, 5).map(p => (
                    <div key={p.id} style={styles.dataCard}>
                        <div>
                            <div style={{fontWeight:'bold', fontSize:'0.9rem'}}>{p.description.split('(')[0]}</div>
                            <div style={{fontSize:'0.75rem', color:'#888'}}>{p.date.toLocaleDateString()} • {p.vendor}</div>
                        </div>
                        <div style={{fontWeight:'bold', color:'#D32F2F'}}>-Rs.{p.amount}</div>
                    </div>
                ))}
              </div>
          </div>

          {/* SALES */}
          <div>
              <h3 style={{ color: '#4CAF50', fontSize: '1rem', marginBottom: '10px' }}>Sales</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {sales.slice(0, 5).map(s => (
                    <div key={s.id} style={styles.dataCard}>
                        <div>
                            <div style={{fontWeight:'bold', fontSize:'0.9rem'}}>Table {s.table || 'Walk-in'}</div>
                            <div style={{fontSize:'0.75rem', color:'#888'}}>{s.date.toLocaleDateString()} • {s.paymentMethod}</div>
                        </div>
                        <div style={{fontWeight:'bold', color:'#4CAF50'}}>+Rs.{s.amount}</div>
                    </div>
                ))}
              </div>
          </div>

      </div>
    </div>
  );
};

const styles = {
    backBtn: { padding: '10px 15px', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    addBtn: { padding: '12px 20px', backgroundColor: '#D32F2F', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    statsGrid: { display: 'grid', gap: '15px', marginBottom: '25px' },
    card: { backgroundColor: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
    cardLabel: { fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '5px' },
    cardValue: { fontSize: '1.5rem', fontWeight: 'bold' },
    subText: { fontSize: '0.7rem', color: '#999' },
    formContainer: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', marginBottom: '25px', borderLeft: '5px solid #D32F2F', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
    input: { padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' },
    saveBtn: { padding: '15px', backgroundColor: '#333', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    dataCard: { backgroundColor: 'white', padding: '12px 15px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #eee' }
};

export default SalesPurchases;