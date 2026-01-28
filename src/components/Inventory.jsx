import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, where } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import { checkAndGenerateLowStockPO } from '../utils/InventoryLogic'; // <--- IMPORT AUTOMATION LOGIC

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
  const { restaurantId } = useUser();

  // --- STATE ---
  const [activeTab, setActiveTab] = useState('STOCK');
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // stockForm with SEO fields
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

    if (!restaurantId) return;

    // Filter Inventory
    const qInventory = query(collection(db, "inventory"), where("userId", "==", restaurantId));
    const unsubInventory = onSnapshot(qInventory, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInventory(data.sort((a,b) => (a.itemName || "").localeCompare(b.itemName || "")));
    });

    // Filter Suppliers
    const qSuppliers = query(collection(db, "suppliers"), where("userId", "==", restaurantId));
    const unsubSuppliers = onSnapshot(qSuppliers, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSuppliers(data);
      setLoading(false);
    });

    return () => { 
        unsubInventory(); 
        unsubSuppliers(); 
        window.removeEventListener('resize', handleResize);
    };
  }, [location, restaurantId]);

  // --- HANDLERS ---
  const handleSaveStock = async (e) => {
    e.preventDefault();
    const payload = { 
        itemName: stockForm.itemName || '', 
        category: stockForm.category || 'General', 
        quantity: parseFloat(stockForm.quantity) || 0, 
        unit: stockForm.unit || 'kg', 
        minStock: parseFloat(stockForm.minStock) || 0, 
        supplierId: stockForm.supplierId || '',
        seoTitle: stockForm.seoTitle || stockForm.itemName,
        seoDescription: stockForm.seoDescription || '',
        slug: stockForm.slug || generateSlug(stockForm.itemName),
        altText: stockForm.altText || stockForm.itemName,
        updatedAt: serverTimestamp() 
    };

    try {
        let currentItemId = editingId;

        if (editingId) {
            // Update existing
            await updateDoc(doc(db, "inventory", editingId), payload);
        } else {
            // Create new
            const docRef = await addDoc(collection(db, "inventory"), { 
                ...payload, 
                userId: restaurantId, 
                createdAt: serverTimestamp() 
            });
            currentItemId = docRef.id;
        }

        // --- TRIGGER AUTOMATION ---
        // We pass the full item object + ID + userId to the logic function
        await checkAndGenerateLowStockPO(
            { ...payload, id: currentItemId, userId: restaurantId }, // Item Data
            payload.quantity, // Current Quantity
            restaurantId // Owner ID
        );

        closeModal();
    } catch (error) { 
        alert("Error saving stock: " + error.message); 
    }
  };

  const handleSaveSupplier = async (e) => {
      e.preventDefault();
      const payload = { 
        name: supplierForm.name || '', 
        contact: supplierForm.contact || '', 
        address: supplierForm.address || '', 
        email: supplierForm.email || '' 
      };
      try {
          if (editingId) {
              await updateDoc(doc(db, "suppliers", editingId), payload);
          } else {
              await addDoc(collection(db, "suppliers"), {
                  ...payload,
                  userId: restaurantId
              });
          }
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
            itemName: item.itemName || '', 
            category: item.category || '', 
            quantity: item.quantity || '', 
            unit: item.unit || 'kg', 
            minStock: item.minStock || '', 
            supplierId: item.supplierId || '',
            seoTitle: item.seoTitle || '',
            seoDescription: item.seoDescription || '',
            slug: item.slug || '',
            altText: item.altText || ''
        });
      } else {
        setSupplierForm({ 
            name: item.name || '', 
            contact: item.contact || '', 
            address: item.address || '', 
            email: item.email || '' 
        });
      }
      setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setEditingId(null);
      setStockForm({ itemName: '', category: '', quantity: '', unit: 'kg', minStock: '', supplierId: '', seoTitle:'', seoDescription:'', slug:'', altText:'' });
      setSupplierForm({ name: '', contact: '', address: '', email: '' });
  };

  // Safe filtering logic
  const filteredData = (activeTab === 'STOCK' ? inventory : suppliers).filter(item => {
    const search = searchTerm.toLowerCase();
    if (activeTab === 'STOCK') {
      return (
        (item.itemName || "").toLowerCase().includes(search) || 
        (item.seoTitle || "").toLowerCase().includes(search) ||
        (item.category || "").toLowerCase().includes(search)
      );
    } else {
      return (item.name || "").toLowerCase().includes(search);
    }
  });

  if (loading) return <div style={{padding: '50px', textAlign: 'center'}}>Loading Inventory...</div>;

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
          <input type="text" placeholder={`Search by name or alias...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{...styles.searchInput, width: isMobile ? '100%' : '300px'}} />
          <button onClick={() => setIsModalOpen(true)} style={{...styles.addBtn, padding: isMobile ? '15px' : '10px 20px'}}>{activeTab === 'STOCK' ? '+ Add Item' : '+ Add Supplier'}</button>
      </div>

      {/* DATA VIEW SWITCH: MOBILE CARDS vs DESKTOP TABLE */}
      {isMobile ? (
          /* MOBILE CARD LIST */
          <div style={{ display: 'grid', gap: '10px' }}>
              {filteredData.map(item => (
                  <div key={item.id} style={styles.mobileCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                          <strong style={{ fontSize: '1rem' }}>{activeTab === 'STOCK' ? item.itemName : item.name}</strong>
                          
                          {activeTab === 'STOCK' && (
                              <span style={{ 
                                  color: (item.quantity <= item.minStock) ? 'red' : '#4CAF50', 
                                  fontWeight: 'bold', 
                                  fontSize: '0.9rem',
                                  backgroundColor: (item.quantity <= item.minStock) ? '#FFEBEE' : '#E8F5E9',
                                  padding: '2px 8px',
                                  borderRadius: '4px'
                              }}>
                                  {item.quantity} {item.unit}
                              </span>
                          )}
                      </div>
                      
                      {activeTab === 'STOCK' ? (
                          <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>
                              <div>Category: {item.category}</div>
                              {item.seoTitle && <div>Alias: {item.seoTitle}</div>}
                          </div>
                      ) : (
                          <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '10px' }}>
                              <div>📞 {item.contact}</div>
                              <div>📧 {item.email}</div>
                          </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => openEditModal(item, activeTab)} style={{...styles.editBtn, flex:1, padding:'8px'}}>Edit</button>
                          <button onClick={() => handleDelete(item.id, activeTab)} style={{...styles.deleteBtn, flex:1, padding:'8px'}}>Delete</button>
                      </div>
                  </div>
              ))}
          </div>
      ) : (
          /* DESKTOP TABLE VIEW */
          <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr style={{backgroundColor: '#f1f1f1'}}>
                            <th style={styles.th}>{activeTab === 'STOCK' ? 'Item' : 'Supplier'}</th>
                            <th style={styles.th}>{activeTab === 'STOCK' ? 'Qty' : 'Contact'}</th>
                            <th style={styles.th}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(item => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={styles.td}>
                                    <div><strong>{activeTab === 'STOCK' ? item.itemName : item.name}</strong></div>
                                    {activeTab === 'STOCK' && item.seoTitle && item.seoTitle !== item.itemName && (
                                        <div style={{fontSize: '0.7rem', color: '#888'}}>Alias: {item.seoTitle}</div>
                                    )}
                                </td>
                                <td style={styles.td}>
                                    {activeTab === 'STOCK' ? (
                                        <span style={{ color: (item.quantity <= item.minStock) ? 'red' : 'inherit', fontWeight: (item.quantity <= item.minStock) ? 'bold' : 'normal' }}>
                                            {item.quantity} {item.unit}
                                        </span>
                                    ) : item.contact}
                                </td>
                                <td style={styles.td}>
                                    <button onClick={() => openEditModal(item, activeTab)} style={styles.editBtn}>Edit</button>
                                    <button onClick={() => handleDelete(item.id, activeTab)} style={styles.deleteBtn}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
          </div>
      )}

      {/* MODAL WITH SEO CMS SECTION */}
      {isModalOpen && (
          <div style={styles.modalOverlay}>
              <div style={{...styles.modal, width: isMobile ? '95%' : '500px'}}>
                  <h3 style={{marginTop: 0}}>{editingId ? 'Edit' : 'Add New'} {activeTab}</h3>
                  
                  {activeTab === 'STOCK' ? (
                      <form onSubmit={handleSaveStock} style={{display:'grid', gap:'12px'}}>
                          <label style={styles.label}>Technical Item Name</label>
                          <input 
                            type="text" required 
                            value={stockForm.itemName} 
                            onChange={e => setStockForm({...stockForm, itemName: e.target.value, slug: generateSlug(e.target.value)})} 
                            style={styles.input} 
                          />
                          
                          <div style={{display:'flex', gap:'10px'}}>
                              <div style={{flex:1}}><label style={styles.label}>Current Qty</label><input type="number" required value={stockForm.quantity} onChange={e => setStockForm({...stockForm, quantity: e.target.value})} style={styles.input} /></div>
                              <div style={{flex:1}}><label style={styles.label}>Unit</label><input type="text" value={stockForm.unit} onChange={e => setStockForm({...stockForm, unit: e.target.value})} style={styles.input} /></div>
                              <div style={{flex:1}}><label style={styles.label}>Min Alert</label><input type="number" value={stockForm.minStock} onChange={e => setStockForm({...stockForm, minStock: e.target.value})} style={styles.input} /></div>
                          </div>

                          {/* SEO CMS SECTION */}
                          <div style={styles.seoBox}>
                              <h4 style={{margin:'0 0 10px 0', color:'#d32f2f', fontSize:'0.9rem'}}>🔍 SEARCH OPTIMIZATION</h4>
                              
                              <label style={styles.label}>Staff Alias / SEO Title</label>
                              <input 
                                type="text" 
                                maxLength="60"
                                value={stockForm.seoTitle} 
                                onChange={e => setStockForm({...stockForm, seoTitle: e.target.value})} 
                                style={styles.input}
                                placeholder="Ex: Momo packing, Small parcel boxes"
                              />
                              <div style={styles.counter}>{stockForm.seoTitle.length}/60</div>

                              <label style={styles.label}>Quality SOP / Meta Description</label>
                              <textarea 
                                maxLength="160"
                                value={stockForm.seoDescription} 
                                onChange={e => setStockForm({...stockForm, seoDescription: e.target.value})} 
                                style={{...styles.input, height: '60px'}}
                                placeholder="Instructions on quality check or storage..."
                              />
                              <div style={styles.counter}>{stockForm.seoDescription.length}/160</div>

                              <label style={styles.label}>URL Slug (Auto)</label>
                              <input type="text" value={stockForm.slug} readOnly style={{...styles.input, backgroundColor:'#f1f1f1'}} />
                          </div>

                          <div style={{display:'flex', gap:'10px'}}>
                              <button type="button" onClick={closeModal} style={styles.cancelBtn}>Cancel</button>
                              <button type="submit" style={styles.saveBtn}>Save with SEO</button>
                          </div>
                      </form>
                  ) : (
                      <form onSubmit={handleSaveSupplier} style={{display:'grid', gap:'12px'}}>
                          <label style={styles.label}>Name</label>
                          <input type="text" required value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} style={styles.input} />
                          <label style={styles.label}>Contact</label>
                          <input type="text" required value={supplierForm.contact} onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} style={styles.input} />
                          <label style={styles.label}>Email</label>
                          <input type="email" value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} style={styles.input} />
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
    
    // Desktop Table Styles
    tableContainer: { backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', marginTop:'20px', border: '1px solid #eee' },
    table: { width: '100%', borderCollapse: 'collapse' },
    th: { padding: '15px', textAlign: 'left', fontSize: '0.85rem', color: '#555', borderBottom: '2px solid #eee' },
    td: { padding: '15px', fontSize: '0.9rem' },
    
    // Mobile Card Styles
    mobileCard: { backgroundColor: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },

    editBtn: { backgroundColor: '#E3F2FD', color: '#1565C0', border: 'none', padding: '5px 10px', borderRadius: '4px', marginRight: '5px', cursor: 'pointer', fontWeight: 'bold' },
    deleteBtn: { backgroundColor: '#FFEBEE', color: '#C62828', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
    
    modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', maxHeight:'90vh', overflowY:'auto' },
    label: { fontSize: '0.7rem', fontWeight: 'bold', color: '#666' },
    input: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' },
    seoBox: { backgroundColor: '#fff5f5', padding: '15px', borderRadius: '8px', border: '1px solid #ffcdd2', marginTop: '10px' },
    counter: { textAlign: 'right', fontSize: '10px', color: '#888', marginTop: '2px' },
    cancelBtn: { flex: 1, padding: '12px', border: '1px solid #ccc', backgroundColor: 'white', borderRadius: '6px', cursor:'pointer' },
    saveBtn: { flex: 1, padding: '12px', border: 'none', backgroundColor: 'black', color: 'white', borderRadius: '6px', fontWeight: 'bold', cursor:'pointer' }
};

export default Inventory;