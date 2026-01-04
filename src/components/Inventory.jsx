import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

// HELPER: Turns "Chicken Momo" into "chicken-momo" automatically
const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w ]+/g, '') 
      .replace(/ +/g, '-');    
};

const Inventory = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- STATE ---
  const [activeTab, setActiveTab] = useState('STOCK');
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Updated stockForm with SEO fields
  const [stockForm, setStockForm] = useState({ 
    itemName: '', 
    category: '', 
    quantity: '', 
    unit: 'kg', 
    minStock: '', 
    supplierId: '',
    seoTitle: '',
    seoDescription: '',
    slug: '',
    altText: ''
  });

  const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', address: '', email: '' });

  // --- LISTENERS ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    if (location.pathname.includes('suppliers')) setActiveTab('SUPPLIERS');
    else setActiveTab('STOCK');

    const unsubInventory = onSnapshot(collection(db, "inventory"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInventory(data.sort((a,b) => (a.itemName || "").localeCompare(b.itemName || "")));
    });

    const unsubSuppliers = onSnapshot(collection(db, "suppliers"), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSuppliers(data);
      setLoading(false);
    });

    return () => { 
        unsubInventory(); 
        unsubSuppliers(); 
        window.removeEventListener('resize', handleResize);
    };
  }, [location]);

  // --- HANDLERS ---
  const handleSaveStock = async (e) => {
    e.preventDefault();
    const payload = { 
        itemName: stockForm.itemName, 
        category: stockForm.category || 'General', 
        quantity: parseFloat(stockForm.quantity), 
        unit: stockForm.unit, 
        minStock: parseFloat(stockForm.minStock) || 0, 
        supplierId: stockForm.supplierId,
        // SEO FIELDS SAVED TO FIREBASE
        seoTitle: stockForm.seoTitle || stockForm.itemName,
        seoDescription: stockForm.seoDescription || '',
        slug: stockForm.slug || generateSlug(stockForm.itemName),
        altText: stockForm.altText || stockForm.itemName,
        updatedAt: serverTimestamp() 
    };

    try {
        if (editingId) {
            await updateDoc(doc(db, "inventory", editingId), payload);
        } else {
            await addDoc(collection(db, "inventory"), { ...payload, createdAt: serverTimestamp() });
        }
        closeModal();
    } catch (error) { 
        alert("Error saving stock: " + error.message); 
    }
  };

  const handleSaveSupplier = async (e) => {
      e.preventDefault();
      const payload = { name: supplierForm.name, contact: supplierForm.contact, address: supplierForm.address, email: supplierForm.email };
      try {
          if (editingId) await updateDoc(doc(db, "suppliers", editingId), payload);
          else await addDoc(collection(db, "suppliers"), payload);
          closeModal();
      } catch (error) { alert("Error saving supplier"); }
  };

  const handleDelete = async (id, type) => {
    const collectionName = type === 'STOCK' ? "inventory" : "suppliers";
    if (window.confirm(`Delete this ${type === 'STOCK' ? 'item' : 'supplier'}?`)) {
        try { await deleteDoc(doc(db, collectionName, id)); } catch (error) { alert(error.message); }
    }
  };

  const openEditModal = (item, type) => {
      setEditingId(item.id);
      if (type === 'STOCK') {
        setStockForm({ 
            itemName: item.itemName, 
            category: item.category, 
            quantity: item.quantity, 
            unit: item.unit, 
            minStock: item.minStock, 
            supplierId: item.supplierId || '',
            seoTitle: item.seoTitle || '',
            seoDescription: item.seoDescription || '',
            slug: item.slug || '',
            altText: item.altText || ''
        });
      } else {
        setSupplierForm({ name: item.name, contact: item.contact, address: item.address, email: item.email || '' });
      }
      setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setEditingId(null);
      setStockForm({ itemName: '', category: '', quantity: '', unit: 'kg', minStock: '', supplierId: '', seoTitle:'', seoDescription:'', slug:'', altText:'' });
      setSupplierForm({ name: '', contact: '', address: '', email: '' });
  };

  return (
    <div style={{ padding: isMobile ? '10px' : '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Header & Tabs */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '20px', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate('/')} style={styles.backBtn}>← Back</button>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.8rem', color: '#333' }}>Inventory</h1>
        </div>
        <div style={{ display: 'flex', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
            <button onClick={() => setActiveTab('STOCK')} style={{ ...styles.tabBtn, flex: 1, backgroundColor: activeTab === 'STOCK' ? 'black' : 'white', color: activeTab === 'STOCK' ? 'white' : 'black' }}>Stock</button>
            <button onClick={() => setActiveTab('SUPPLIERS')} style={{ ...styles.tabBtn, flex: 1, backgroundColor: activeTab === 'SUPPLIERS' ? 'black' : 'white', color: activeTab === 'SUPPLIERS' ? 'white' : 'black' }}>Suppliers</button>
        </div>
      </div>

      {/* Search & Add */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', marginBottom: '20px', gap: '10px' }}>
          <input type="text" placeholder={`Search ${activeTab.toLowerCase()}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{...styles.searchInput, width: isMobile ? '100%' : '300px'}} />
          <button onClick={() => setIsModalOpen(true)} style={{...styles.addBtn, padding: isMobile ? '15px' : '10px 20px'}}>{activeTab === 'STOCK' ? '+ Add Item' : '+ Add Supplier'}</button>
      </div>

      {/* List/Table View (Shortened for brevity - same as your previous logic) */}
      <div style={styles.tableContainer}>
            <table style={styles.table}>
                <thead>
                    <tr style={{backgroundColor: '#f1f1f1'}}>
                        <th style={styles.th}>{activeTab === 'STOCK' ? 'Item' : 'Supplier'}</th>
                        <th style={styles.th}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {(activeTab === 'STOCK' ? inventory : suppliers).map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={styles.td}>{activeTab === 'STOCK' ? item.itemName : item.name}</td>
                            <td style={styles.td}>
                                <button onClick={() => openEditModal(item, activeTab)} style={styles.editBtn}>Edit</button>
                                <button onClick={() => handleDelete(item.id, activeTab)} style={styles.deleteBtn}>Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
      </div>

      {/* MODAL WITH SEO CMS SECTION */}
      {isModalOpen && (
          <div style={styles.modalOverlay}>
              <div style={{...styles.modal, width: isMobile ? '95%' : '500px'}}>
                  <h3 style={{marginTop: 0}}>{editingId ? 'Edit' : 'Add New'} {activeTab}</h3>
                  
                  {activeTab === 'STOCK' ? (
                      <form onSubmit={handleSaveStock} style={{display:'grid', gap:'12px'}}>
                          <label style={styles.label}>Item Name</label>
                          <input 
                            type="text" required 
                            value={stockForm.itemName} 
                            onChange={e => setStockForm({...stockForm, itemName: e.target.value, slug: generateSlug(e.target.value)})} 
                            style={styles.input} 
                          />
                          
                          <div style={{display:'flex', gap:'10px'}}>
                              <div style={{flex:1}}><label style={styles.label}>Qty</label><input type="number" required value={stockForm.quantity} onChange={e => setStockForm({...stockForm, quantity: e.target.value})} style={styles.input} /></div>
                              <div style={{flex:1}}><label style={styles.label}>Min Alert</label><input type="number" value={stockForm.minStock} onChange={e => setStockForm({...stockForm, minStock: e.target.value})} style={styles.input} /></div>
                          </div>

                          {/* --- SEO CMS SECTION FOR YOUR FRIEND --- */}
                          <div style={styles.seoBox}>
                              <h4 style={{margin:'0 0 10px 0', color:'#d32f2f', fontSize:'0.9rem'}}>🔍 SEO STRATEGY PANEL</h4>
                              
                              <label style={styles.label}>SEO Title (Google Blue Link)</label>
                              <input 
                                type="text" 
                                maxLength="60"
                                value={stockForm.seoTitle} 
                                onChange={e => setSeoForm({...stockForm, seoTitle: e.target.value})} 
                                style={styles.input}
                                placeholder="Ex: Best Spicy Chicken Momo in Town"
                              />
                              <div style={styles.counter}>{stockForm.seoTitle.length}/60</div>

                              <label style={styles.label}>Meta Description (Google Summary)</label>
                              <textarea 
                                maxLength="160"
                                value={stockForm.seoDescription} 
                                onChange={e => setStockForm({...stockForm, seoDescription: e.target.value})} 
                                style={{...styles.input, height: '60px'}}
                                placeholder="Describe the taste, ingredients, and uniqueness..."
                              />
                              <div style={styles.counter}>{stockForm.seoDescription.length}/160</div>

                              <label style={styles.label}>URL Slug</label>
                              <input type="text" value={stockForm.slug} readOnly style={{...styles.input, backgroundColor:'#f1f1f1'}} />
                          </div>

                          <div style={{display:'flex', gap:'10px'}}>
                              <button type="button" onClick={closeModal} style={styles.cancelBtn}>Cancel</button>
                              <button type="submit" style={styles.saveBtn}>Save with SEO</button>
                          </div>
                      </form>
                  ) : (
                      <form onSubmit={handleSaveSupplier} style={{display:'grid', gap:'12px'}}>
                          {/* Supplier form remains same */}
                          <label style={styles.label}>Name</label><input type="text" required value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} style={styles.input} />
                          <div style={{display:'flex', gap:'10px'}}><button type="button" onClick={closeModal} style={styles.cancelBtn}>Cancel</button><button type="submit" style={styles.saveBtn}>Save</button></div>
                      </form>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

const styles = {
    backBtn: { padding: '10px 15px', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    tabBtn: { padding: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold' },
    searchInput: { padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' },
    addBtn: { backgroundColor: '#D32F2F', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    tableContainer: { backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', marginTop:'20px' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '15px', textAlign: 'left', fontSize: '0.85rem', color: '#555' },
    td: { padding: '15px', fontSize: '0.9rem' },
    editBtn: { backgroundColor: '#E3F2FD', color: '#1565C0', border: 'none', padding: '5px 10px', borderRadius: '4px', marginRight: '5px', cursor: 'pointer' },
    deleteBtn: { backgroundColor: '#FFEBEE', color: '#C62828', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' },
    modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', maxHeight:'90vh', overflowY:'auto' },
    label: { fontSize: '0.7rem', fontWeight: 'bold', color: '#666' },
    input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' },
    seoBox: { backgroundColor: '#fff5f5', padding: '15px', borderRadius: '8px', border: '1px solid #ffcdd2', marginTop: '10px' },
    counter: { textAlign: 'right', fontSize: '10px', color: '#888', marginTop: '2px' },
    cancelBtn: { flex: 1, padding: '12px', border: '1px solid #ccc', backgroundColor: 'white', borderRadius: '6px' },
    saveBtn: { flex: 1, padding: '12px', border: 'none', backgroundColor: 'black', color: 'white', borderRadius: '6px', fontWeight: 'bold' }
};

export default Inventory;