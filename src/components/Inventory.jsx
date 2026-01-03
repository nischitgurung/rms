import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

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
  
  const [stockForm, setStockForm] = useState({ itemName: '', category: '', quantity: '', unit: 'kg', minStock: '', supplierId: '' });
  const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', address: '', email: '' });

  // --- LISTENERS & RESPONSIVENESS ---
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
      const payload = { 
          name: supplierForm.name, 
          contact: supplierForm.contact, 
          address: supplierForm.address, 
          email: supplierForm.email 
      };
      try {
          if (editingId) await updateDoc(doc(db, "suppliers", editingId), payload);
          else await addDoc(collection(db, "suppliers"), payload);
          closeModal();
      } catch (error) { alert("Error saving supplier"); }
  };

  const handleDelete = async (id, type) => {
    const collectionName = type === 'STOCK' ? "inventory" : "suppliers";
    const itemName = type === 'STOCK' ? "item" : "supplier";
    
    if (window.confirm(`Are you sure you want to permanently delete this ${itemName}?`)) {
        try {
            await deleteDoc(doc(db, collectionName, id));
        } catch (error) {
            alert("Error deleting: " + error.message);
        }
    }
  };

  const openEditModal = (item, type) => {
      setEditingId(item.id);
      if (type === 'STOCK') setStockForm({ itemName: item.itemName, category: item.category, quantity: item.quantity, unit: item.unit, minStock: item.minStock, supplierId: item.supplierId || '' });
      else setSupplierForm({ name: item.name, contact: item.contact, address: item.address, email: item.email || '' });
      setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setEditingId(null);
      setStockForm({ itemName: '', category: '', quantity: '', unit: 'kg', minStock: '', supplierId: '' });
      setSupplierForm({ name: '', contact: '', address: '', email: '' });
  };

  const filteredInventory = inventory.filter(i => (i.itemName || "").toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredSuppliers = suppliers.filter(s => (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div style={{padding:'40px', textAlign: 'center'}}>Loading Inventory Data...</div>;

  return (
    <div style={{ padding: isMobile ? '10px' : '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* Header Section */}
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

      {/* Search & Add Action Bar */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', marginBottom: '20px', gap: '10px' }}>
          <input type="text" placeholder={`Search ${activeTab.toLowerCase()}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{...styles.searchInput, width: isMobile ? '100%' : '300px'}} />
          <button onClick={() => setIsModalOpen(true)} style={{...styles.addBtn, padding: isMobile ? '15px' : '10px 20px'}}>{activeTab === 'STOCK' ? '+ Add Item' : '+ Add Supplier'}</button>
      </div>

      {/* Main Content Area */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(activeTab === 'STOCK' ? filteredInventory : filteredSuppliers).map(item => {
                const isLow = activeTab === 'STOCK' && item.quantity <= (item.minStock || 5);
                return (
                    <div key={item.id} style={{ ...styles.card, borderLeft: isLow ? '5px solid #D32F2F' : 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{activeTab === 'STOCK' ? item.itemName : item.name}</span>
                            {activeTab === 'STOCK' && <span style={{ fontWeight: 'bold', color: isLow ? 'red' : 'green' }}>{item.quantity} {item.unit}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => openEditModal(item, activeTab)} style={{ ...styles.editBtn, flex: 2, padding: '10px' }}>Edit</button>
                            <button onClick={() => handleDelete(item.id, activeTab)} style={{ ...styles.deleteBtn, flex: 1, padding: '10px' }}>Delete</button>
                        </div>
                    </div>
                );
            })}
        </div>
      ) : (
        <div style={styles.tableContainer}>
            <table style={styles.table}>
                <thead>
                    <tr style={{backgroundColor: '#f1f1f1'}}>
                        <th style={styles.th}>{activeTab === 'STOCK' ? 'Item Name' : 'Supplier Name'}</th>
                        <th style={styles.th}>{activeTab === 'STOCK' ? 'Available Stock' : 'Contact Information'}</th>
                        <th style={styles.th}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {(activeTab === 'STOCK' ? filteredInventory : filteredSuppliers).map(item => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                            <td style={{...styles.td, fontWeight:'bold'}}>{activeTab === 'STOCK' ? item.itemName : item.name}</td>
                            <td style={styles.td}>
                                {activeTab === 'STOCK' ? (
                                    <span style={{ color: item.quantity <= (item.minStock || 5) ? 'red' : 'inherit', fontWeight: item.quantity <= (item.minStock || 5) ? 'bold' : 'normal' }}>
                                        {item.quantity} {item.unit}
                                    </span>
                                ) : item.contact}
                            </td>
                            <td style={styles.td}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => openEditModal(item, activeTab)} style={styles.editBtn}>Edit</button>
                                    <button onClick={() => handleDelete(item.id, activeTab)} style={styles.deleteBtn}>Delete</button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {/* Forms Modal */}
      {isModalOpen && (
          <div style={styles.modalOverlay}>
              <div style={{...styles.modal, width: isMobile ? '90%' : '400px'}}>
                  <h3 style={{marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px'}}>{editingId ? 'Edit' : 'Add New'} {activeTab === 'STOCK' ? 'Item' : 'Supplier'}</h3>
                  {activeTab === 'STOCK' ? (
                      <form onSubmit={handleSaveStock} style={{display:'grid', gap:'12px', marginTop: '15px'}}>
                          <label style={styles.label}>Item Name</label>
                          <input type="text" required value={stockForm.itemName} onChange={e => setStockForm({...stockForm, itemName: e.target.value})} style={styles.input} />
                          <div style={{display:'flex', gap:'10px'}}>
                              <div style={{flex:1}}><label style={styles.label}>Qty</label><input type="number" step="0.01" required value={stockForm.quantity} onChange={e => setStockForm({...stockForm, quantity: e.target.value})} style={styles.input} /></div>
                              <div style={{flex:1}}><label style={styles.label}>Unit</label>
                                <select value={stockForm.unit} onChange={e => setStockForm({...stockForm, unit: e.target.value})} style={styles.input}>
                                    <option value="kg">kg</option><option value="ltr">ltr</option><option value="pcs">pcs</option><option value="pkt">pkt</option>
                                </select>
                              </div>
                          </div>
                          <label style={styles.label}>Min Alert Level (Stock Warning)</label>
                          <input type="number" value={stockForm.minStock} onChange={e => setStockForm({...stockForm, minStock: e.target.value})} style={styles.input} />
                          <label style={styles.label}>Supplier (Optional)</label>
                          <select value={stockForm.supplierId} onChange={e => setStockForm({...stockForm, supplierId: e.target.value})} style={styles.input}>
                              <option value="">-- No Supplier Linked --</option>
                              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                              <button type="button" onClick={closeModal} style={styles.cancelBtn}>Cancel</button>
                              <button type="submit" style={styles.saveBtn}>Save Changes</button>
                          </div>
                      </form>
                  ) : (
                      <form onSubmit={handleSaveSupplier} style={{display:'grid', gap:'12px', marginTop: '15px'}}>
                          <label style={styles.label}>Supplier Name</label>
                          <input type="text" required value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} style={styles.input} />
                          <label style={styles.label}>Email Address</label>
                          <input type="email" value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} style={styles.input} />
                          <label style={styles.label}>Contact Number</label>
                          <input type="text" value={supplierForm.contact} onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} style={styles.input} />
                          <label style={styles.label}>Office Address</label>
                          <input type="text" value={supplierForm.address} onChange={e => setSupplierForm({...supplierForm, address: e.target.value})} style={styles.input} />
                          <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                              <button type="button" onClick={closeModal} style={styles.cancelBtn}>Cancel</button>
                              <button type="submit" style={styles.saveBtn}>Save Supplier</button>
                          </div>
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
    tabBtn: { padding: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' },
    searchInput: { padding: '12px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none' },
    addBtn: { backgroundColor: '#D32F2F', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    card: { backgroundColor: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    tableContainer: { backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '15px', textAlign: 'left', fontSize: '0.85rem', color: '#555', fontWeight: 'bold' },
    td: { padding: '15px', fontSize: '0.9rem', color: '#333' },
    editBtn: { backgroundColor: '#E3F2FD', color: '#1565C0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', padding: '6px 12px' },
    deleteBtn: { backgroundColor: '#FFEBEE', color: '#C62828', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', padding: '6px 12px' },
    modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' },
    input: { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', outline: 'none' },
    cancelBtn: { flex: 1, padding: '12px', border: '1px solid #ccc', backgroundColor: 'white', borderRadius: '6px', cursor: 'pointer' },
    saveBtn: { flex: 1, padding: '12px', border: 'none', backgroundColor: 'black', color: 'white', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }
};

export default Inventory;