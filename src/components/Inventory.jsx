import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import emailjs from '@emailjs/browser'; // 1. IMPORT EMAILJS

const Inventory = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- CONFIG ---
  // REPLACE THESE WITH YOUR ACTUAL EMAILJS KEYS
  const SERVICE_ID = "service_lt5byrp"; 
  const TEMPLATE_ID = "template_oy39nmc";
  const PUBLIC_KEY = "q6gnSNf0gppPaEkI3";

  // --- STATE ---
  const [activeTab, setActiveTab] = useState('STOCK');
  const [inventory, setInventory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Form Data
  const [stockForm, setStockForm] = useState({
    itemName: '', category: '', quantity: '', unit: 'kg', minStock: '', supplierId: ''
  });
  const [supplierForm, setSupplierForm] = useState({
    name: '', contact: '', address: '', email: '' 
  });

  // --- 1. DATA FETCHING ---
  useEffect(() => {
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

    return () => { unsubInventory(); unsubSuppliers(); };
  }, [location]);

  // --- 2. AUTOMATIC EMAIL LOGIC ---
  const checkAndSendMail = (itemData) => {
      const currentQty = parseFloat(itemData.quantity);
      const minQty = parseFloat(itemData.minStock);

      // Check if stock is low
      if (currentQty <= minQty) {
          // Find the supplier details
          const supplier = suppliers.find(s => s.id === itemData.supplierId);

          if (supplier && supplier.email) {
              console.log("Stock Low! Sending email to:", supplier.email);

              const templateParams = {
                  to_email: supplier.email,
                  vendor_name: supplier.name,
                  item_name: itemData.itemName,
                  current_qty: itemData.quantity,
                  unit: itemData.unit
              };

              emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY)
                  .then((response) => {
                      alert(`⚠️ LOW STOCK ALERT: Quotation request sent to ${supplier.name} successfully!`);
                  })
                  .catch((err) => {
                      console.error('FAILED TO SEND EMAIL:', err);
                      alert("Low stock detected, but failed to send email. Check console.");
                  });
          } else {
              alert("⚠️ Low Stock! (No supplier email found to send quotation)");
          }
      }
  };

  // --- 3. HANDLERS: STOCK ---
  const handleSaveStock = async (e) => {
    e.preventDefault();
    if (!stockForm.itemName || !stockForm.quantity) return alert("Name and Qty required");

    const payload = {
        itemName: stockForm.itemName,
        category: stockForm.category,
        quantity: parseFloat(stockForm.quantity),
        unit: stockForm.unit,
        minStock: parseFloat(stockForm.minStock) || 0,
        supplierId: stockForm.supplierId,
        updatedAt: serverTimestamp()
    };

    try {
        if (editingId) {
            await updateDoc(doc(db, "inventory", editingId), payload);
            alert("Stock Updated Successfully");
            // CHECK FOR LOW STOCK AFTER UPDATE
            checkAndSendMail(payload); 
        } else {
            await addDoc(collection(db, "inventory"), { ...payload, createdAt: serverTimestamp() });
            alert("New Item Added to Inventory");
            // Check (though unlikely new item is low immediately, but good practice)
            checkAndSendMail(payload);
        }
        closeModal();
    } catch (error) {
        console.error(error);
        alert("Error saving stock: " + error.message);
    }
  };

  const handleDeleteStock = async (id) => {
      if(window.confirm("Delete this item from inventory?")) {
          try {
            await deleteDoc(doc(db, "inventory", id));
          } catch (error) {
            alert("Error deleting: " + error.message);
          }
      }
  };

  // --- 4. HANDLERS: SUPPLIERS ---
  const handleSaveSupplier = async (e) => {
      e.preventDefault();
      if (!supplierForm.name) return alert("Supplier Name required");

      const payload = {
          name: supplierForm.name,
          contact: supplierForm.contact,
          address: supplierForm.address,
          email: supplierForm.email // Save email so we can use it later
      };

      try {
          if (editingId) {
              await updateDoc(doc(db, "suppliers", editingId), payload);
          } else {
              await addDoc(collection(db, "suppliers"), payload);
          }
          closeModal();
      } catch (error) {
          console.error(error);
          alert("Error saving supplier");
      }
  };

  const handleDeleteSupplier = async (id) => {
      if(window.confirm("Delete this supplier?")) {
          await deleteDoc(doc(db, "suppliers", id));
      }
  };

  // --- 5. HELPER FUNCTIONS ---
  const openEditModal = (item, type) => {
      setEditingId(item.id);
      if (type === 'STOCK') {
          setStockForm({
              itemName: item.itemName, category: item.category, quantity: item.quantity, 
              unit: item.unit, minStock: item.minStock, supplierId: item.supplierId || ''
          });
      } else {
          setSupplierForm({
              name: item.name, contact: item.contact, address: item.address, email: item.email || ''
          });
      }
      setIsModalOpen(true);
  };

  const closeModal = () => {
      setIsModalOpen(false);
      setEditingId(null);
      setStockForm({ itemName: '', category: '', quantity: '', unit: 'kg', minStock: '', supplierId: '' });
      setSupplierForm({ name: '', contact: '', address: '', email: '' });
  };

  const getSupplierName = (id) => {
      const sup = suppliers.find(s => s.id === id);
      return sup ? sup.name : '-';
  };

  const filteredInventory = inventory.filter(i => (i.itemName || "").toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredSuppliers = suppliers.filter(s => (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <div style={{padding:'40px'}}>Loading Inventory...</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate('/')} style={styles.backBtn}>← Back</button>
            <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#333' }}>Inventory Management</h1>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Track Stock & Suppliers</div>
            </div>
        </div>
        
        <div style={{ display: 'flex', backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
            <button onClick={() => setActiveTab('STOCK')} style={{ ...styles.tabBtn, backgroundColor: activeTab === 'STOCK' ? 'black' : 'white', color: activeTab === 'STOCK' ? 'white' : 'black' }}>Stock Items</button>
            <button onClick={() => setActiveTab('SUPPLIERS')} style={{ ...styles.tabBtn, backgroundColor: activeTab === 'SUPPLIERS' ? 'black' : 'white', color: activeTab === 'SUPPLIERS' ? 'white' : 'black' }}>Suppliers</button>
        </div>
      </div>

      {/* CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '10px' }}>
          <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={styles.searchInput} />
          <button onClick={() => setIsModalOpen(true)} style={styles.addBtn}>{activeTab === 'STOCK' ? '+ Add Stock Item' : '+ Add Supplier'}</button>
      </div>

      {/* --- STOCK TABLE --- */}
      {activeTab === 'STOCK' && (
          <div style={styles.tableContainer}>
              <table style={styles.table}>
                  <thead style={styles.thead}>
                      <tr>
                          <th style={styles.th}>Item Name</th>
                          <th style={styles.th}>Category</th>
                          <th style={styles.th}>Available Stock</th>
                          <th style={styles.th}>Unit</th>
                          <th style={styles.th}>Supplier</th>
                          <th style={{...styles.th, textAlign:'right'}}>Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {filteredInventory.map(item => {
                          const isLowStock = item.quantity <= (item.minStock || 5);
                          return (
                            <tr key={item.id} style={{ borderBottom: '1px solid #eee', backgroundColor: isLowStock ? '#FFF3E0' : 'white' }}>
                                <td style={{...styles.td, fontWeight:'bold'}}>
                                    {item.itemName}
                                    {isLowStock && <span style={styles.lowStockBadge}>LOW</span>}
                                </td>
                                <td style={styles.td}>{item.category}</td>
                                <td style={{...styles.td, color: isLowStock ? 'red' : 'green', fontWeight:'bold', fontSize:'1.1rem'}}>{item.quantity}</td>
                                <td style={styles.td}>{item.unit}</td>
                                <td style={{...styles.td, fontSize:'0.9rem', color:'#666'}}>{getSupplierName(item.supplierId)}</td>
                                <td style={{...styles.td, textAlign:'right'}}>
                                    <button onClick={() => openEditModal(item, 'STOCK')} style={styles.editBtn}>Edit</button>
                                    <button onClick={() => handleDeleteStock(item.id)} style={styles.deleteBtn}>Del</button>
                                </td>
                            </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      )}

      {/* --- SUPPLIERS TABLE --- */}
      {activeTab === 'SUPPLIERS' && (
          <div style={styles.tableContainer}>
              <table style={styles.table}>
                  <thead style={styles.thead}>
                      <tr>
                          <th style={styles.th}>Supplier Name</th>
                          <th style={styles.th}>Contact</th>
                          <th style={styles.th}>Email</th>
                          <th style={styles.th}>Address</th>
                          <th style={{...styles.th, textAlign:'right'}}>Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {filteredSuppliers.map(sup => (
                          <tr key={sup.id} style={{ borderBottom: '1px solid #eee' }}>
                              <td style={{...styles.td, fontWeight:'bold'}}>{sup.name}</td>
                              <td style={styles.td}>{sup.contact}</td>
                              <td style={styles.td}>{sup.email || '-'}</td>
                              <td style={styles.td}>{sup.address}</td>
                              <td style={{...styles.td, textAlign:'right'}}>
                                  <button onClick={() => openEditModal(sup, 'SUPPLIERS')} style={styles.editBtn}>Edit</button>
                                  <button onClick={() => handleDeleteSupplier(sup.id)} style={styles.deleteBtn}>Del</button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* --- MODAL --- */}
      {isModalOpen && (
          <div style={styles.modalOverlay}>
              <div style={styles.modal}>
                  <h3>{editingId ? 'Edit' : 'Add New'} {activeTab === 'STOCK' ? 'Stock Item' : 'Supplier'}</h3>
                  
                  {activeTab === 'STOCK' ? (
                      <form onSubmit={handleSaveStock} style={{display:'grid', gap:'10px'}}>
                          <div>
                              <label style={styles.label}>Item Name</label>
                              <input type="text" required value={stockForm.itemName} onChange={e => setStockForm({...stockForm, itemName: e.target.value})} style={styles.input} />
                          </div>
                          <div style={{display:'flex', gap:'10px'}}>
                              <div style={{flex:1}}>
                                  <label style={styles.label}>Quantity</label>
                                  <input type="number" step="0.01" required value={stockForm.quantity} onChange={e => setStockForm({...stockForm, quantity: e.target.value})} style={styles.input} />
                              </div>
                              <div style={{flex:1}}>
                                  <label style={styles.label}>Unit</label>
                                  <select value={stockForm.unit} onChange={e => setStockForm({...stockForm, unit: e.target.value})} style={styles.input}>
                                      <option value="kg">Kilogram (kg)</option>
                                      <option value="gm">Grams (gm)</option>
                                      <option value="ltr">Liter (ltr)</option>
                                      <option value="ml">Milliliter (ml)</option>
                                      <option value="pcs">Pieces (pcs)</option>
                                      <option value="pkt">Packet (pkt)</option>
                                      <option value="box">Box</option>
                                      <option value="can">Can</option>
                                  </select>
                              </div>
                          </div>
                          <div style={{display:'flex', gap:'10px'}}>
                              <div style={{flex:1}}>
                                  <label style={styles.label}>Min Alert Level</label>
                                  <input type="number" value={stockForm.minStock} onChange={e => setStockForm({...stockForm, minStock: e.target.value})} style={styles.input} />
                              </div>
                              <div style={{flex:1}}>
                                  <label style={styles.label}>Category</label>
                                  <input type="text" placeholder="e.g. Veg" value={stockForm.category} onChange={e => setStockForm({...stockForm, category: e.target.value})} style={styles.input} />
                              </div>
                          </div>
                          <div>
                              <label style={styles.label}>Supplier</label>
                              <select value={stockForm.supplierId} onChange={e => setStockForm({...stockForm, supplierId: e.target.value})} style={styles.input}>
                                  <option value="">-- Select Supplier --</option>
                                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                          </div>
                          <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                              <button type="button" onClick={closeModal} style={styles.cancelBtn}>Cancel</button>
                              <button type="submit" style={styles.saveBtn}>Save Item</button>
                          </div>
                      </form>
                  ) : (
                      <form onSubmit={handleSaveSupplier} style={{display:'grid', gap:'10px'}}>
                          <div>
                              <label style={styles.label}>Supplier Name</label>
                              <input type="text" required value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} style={styles.input} />
                          </div>
                          <div>
                              <label style={styles.label}>Email</label>
                              <input type="email" value={supplierForm.email} onChange={e => setSupplierForm({...supplierForm, email: e.target.value})} style={styles.input} />
                          </div>
                          <div>
                              <label style={styles.label}>Contact No.</label>
                              <input type="text" value={supplierForm.contact} onChange={e => setSupplierForm({...supplierForm, contact: e.target.value})} style={styles.input} />
                          </div>
                          <div>
                              <label style={styles.label}>Address</label>
                              <input type="text" value={supplierForm.address} onChange={e => setSupplierForm({...supplierForm, address: e.target.value})} style={styles.input} />
                          </div>
                          <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
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

// --- STYLES ---
const styles = {
    backBtn: { padding: '8px 16px', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#555' },
    tabBtn: { padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' },
    searchInput: { padding: '10px', width: '300px', borderRadius: '6px', border: '1px solid #ccc' },
    addBtn: { padding: '10px 20px', backgroundColor: '#D32F2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    
    tableContainer: { backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse' },
    thead: { backgroundColor: '#f1f1f1' },
    th: { padding: '12px 15px', textAlign: 'left', fontSize: '0.9rem', color: '#555', fontWeight: 'bold' },
    td: { padding: '12px 15px', fontSize: '0.95rem', color: '#333' },
    empty: { padding: '30px', textAlign: 'center', color: '#999' },

    editBtn: { padding: '5px 10px', backgroundColor: '#E3F2FD', color: '#1565C0', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px', fontWeight:'bold' },
    deleteBtn: { padding: '5px 10px', backgroundColor: '#FFEBEE', color: '#C62828', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold' },
    lowStockBadge: { marginLeft: '10px', backgroundColor: '#D32F2F', color: 'white', fontSize: '0.6rem', padding: '2px 6px', borderRadius: '4px' },

    // Modal
    modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', padding: '25px', borderRadius: '10px', width: '400px', maxWidth: '90%', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem', color: '#555' },
    input: { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box' },
    cancelBtn: { flex: 1, padding: '10px', border: '1px solid #ccc', backgroundColor: 'white', borderRadius: '5px', cursor: 'pointer' },
    saveBtn: { flex: 1, padding: '10px', border: 'none', backgroundColor: 'black', color: 'white', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }
};

export default Inventory;