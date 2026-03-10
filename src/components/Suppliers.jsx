import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"; // <--- Added query, where
import { useUser } from '../contexts/UserContext'; // <--- 1. NEW IMPORT

const Suppliers = () => {
  const navigate = useNavigate();
  const { restaurantId } = useUser(); // <--- 2. GET RESTAURANT ID

  // --- STATE ---
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    address: '',
    email: ''
  });

  // --- RESPONSIVE LISTENER ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    // <--- 3. GUARD CLAUSE
    if (!restaurantId) return;

    // <--- 4. FILTER SUPPLIERS BY RESTAURANT ID
    const qSuppliers = query(collection(db, "suppliers"), where("userId", "==", restaurantId));
    const unsubscribe = onSnapshot(qSuppliers, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSuppliers(data.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      setLoading(false);
    });

    return () => {
        unsubscribe();
        window.removeEventListener('resize', handleResize);
    };
  }, [restaurantId]); // <--- 5. ADD DEPENDENCY

  // --- HANDLERS ---
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert("Supplier Name is required");

    const payload = {
      name: formData.name,
      contact: formData.contact,
      address: formData.address,
      email: formData.email,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "suppliers", editingId), payload);
        alert("Supplier Updated!");
      } else {
        // <--- 6. TAG NEW SUPPLIER WITH RESTAURANT ID
        await addDoc(collection(db, "suppliers"), { 
            ...payload, 
            userId: restaurantId, // <--- IMPORTANT
            createdAt: serverTimestamp() 
        });
        alert("New Supplier Added!");
      }
      closeModal();
    } catch (error) {
      alert("Failed to save: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure?")) {
      try {
        await deleteDoc(doc(db, "suppliers", id));
      } catch (error) {
        alert("Failed to delete.");
      }
    }
  };

  const openModal = (supplier = null) => {
    if (supplier) {
      setEditingId(supplier.id);
      setFormData({ name: supplier.name, contact: supplier.contact, address: supplier.address, email: supplier.email || '' });
    } else {
      setEditingId(null);
      setFormData({ name: '', contact: '', address: '', email: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); };

  const filteredSuppliers = suppliers.filter(s => 
    (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contact || "").includes(searchTerm)
  );

  if (loading) return <div style={{padding:'40px', textAlign: 'center'}}>Loading Directory...</div>;

  return (
    <div style={{ padding: isMobile ? '10px' : '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '20px', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate('/')} style={styles.backBtn}>←</button>
            <div>
                <h1 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.8rem', color: '#333' }}>Suppliers</h1>
            </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', marginBottom: '20px', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Search Name or Phone..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            style={{...styles.searchInput, width: isMobile ? '100%' : '300px'}}
          />
          <button onClick={() => openModal()} style={{...styles.addBtn, padding: isMobile ? '15px' : '12px 20px'}}>
              + Add Supplier
          </button>
      </div>

      {/* --- DATA VIEW --- */}
      <div style={isMobile ? {} : styles.tableContainer}>
        {isMobile ? (
            /* MOBILE CARD VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredSuppliers.map(sup => (
                    <div key={sup.id} style={styles.card}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px', color: '#000' }}>{sup.name}</div>
                        <div style={{ marginBottom: '5px' }}>
                            <a href={`tel:${sup.contact}`} style={{ color: '#1565C0', textDecoration: 'none', fontWeight: 'bold', fontSize: '0.95rem' }}>
                                📞 {sup.contact || 'No Number'}
                            </a>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px' }}>
                            ✉️ {sup.email || '-'}<br/>
                            📍 {sup.address || '-'}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                            <button onClick={() => openModal(sup)} style={{...styles.editBtn, flex: 1, padding: '10px'}}>Edit</button>
                            <button onClick={() => handleDelete(sup.id)} style={{...styles.deleteBtn, flex: 1, padding: '10px'}}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            /* DESKTOP TABLE VIEW */
            <table style={styles.table}>
              <thead style={styles.thead}>
                <tr>
                  <th style={styles.th}>Company / Name</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Address</th>
                  <th style={{...styles.th, textAlign:'right'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((sup) => (
                  <tr key={sup.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{...styles.td, fontWeight:'bold'}}>{sup.name}</td>
                    <td style={styles.td}>{sup.contact}</td>
                    <td style={styles.td}>{sup.email || '-'}</td>
                    <td style={styles.td}>{sup.address}</td>
                    <td style={{...styles.td, textAlign:'right'}}>
                      <button onClick={() => openModal(sup)} style={styles.editBtn}>Edit</button>
                      <button onClick={() => handleDelete(sup.id)} style={styles.deleteBtn}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        )}
        {filteredSuppliers.length === 0 && !loading && (
            <div style={{padding: '40px', textAlign: 'center', color: '#888'}}>No vendors found.</div>
        )}
      </div>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modal, width: isMobile ? '95%' : '450px'}}>
            <h3 style={{marginTop:0}}>{editingId ? 'Edit Supplier' : 'Add New Supplier'}</h3>
            <form onSubmit={handleSave} style={{display:'grid', gap:'15px'}}>
              <input type="text" required placeholder="Company Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={styles.input} />
              <div style={{display:'flex', gap:'10px', flexDirection: isMobile ? 'column' : 'row'}}>
                  <input type="text" required placeholder="Phone" value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} style={{...styles.input, flex: 1}} />
                  <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={{...styles.input, flex: 1}} />
              </div>
              <input type="text" placeholder="Full Address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={styles.input} />
              <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                <button type="button" onClick={closeModal} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.saveBtn}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
    backBtn: { padding: '10px 15px', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    searchInput: { padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize:'1rem' },
    addBtn: { backgroundColor: '#D32F2F', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    card: { backgroundColor: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' },
    tableContainer: { backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse' },
    thead: { backgroundColor: '#f1f1f1' },
    th: { padding: '15px', textAlign: 'left', fontSize: '0.9rem', color: '#555', fontWeight: 'bold' },
    td: { padding: '15px', fontSize: '0.95rem', color: '#333' },
    editBtn: { padding: '6px 12px', backgroundColor: '#E3F2FD', color: '#1565C0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold' },
    deleteBtn: { padding: '6px 12px', backgroundColor: '#FFEBEE', color: '#C62828', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold' },
    modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', padding: '25px', borderRadius: '12px' },
    input: { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box' },
    cancelBtn: { flex: 1, padding: '12px', border: '1px solid #ccc', backgroundColor: 'white', borderRadius: '6px' },
    saveBtn: { flex: 1, padding: '12px', border: 'none', backgroundColor: 'black', color: 'white', borderRadius: '6px', fontWeight: 'bold' }
};

export default Suppliers;