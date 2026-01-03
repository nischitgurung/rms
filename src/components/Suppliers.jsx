import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

const Suppliers = () => {
  const navigate = useNavigate();

  // --- STATE ---
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    address: '',
    email: '' // Added email field for completeness
  });

  // --- 1. DATA FETCHING ---
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "suppliers"), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort alphabetically
      setSuppliers(data.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- 2. HANDLERS ---
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
        // Update existing
        await updateDoc(doc(db, "suppliers", editingId), payload);
        alert("Supplier Updated Successfully!");
      } else {
        // Create new
        await addDoc(collection(db, "suppliers"), {
          ...payload,
          createdAt: serverTimestamp()
        });
        alert("New Supplier Added!");
      }
      closeModal();
    } catch (error) {
      console.error("Error saving supplier:", error);
      alert("Failed to save: " + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      try {
        await deleteDoc(doc(db, "suppliers", id));
      } catch (error) {
        console.error("Error deleting:", error);
        alert("Failed to delete.");
      }
    }
  };

  // --- 3. HELPER FUNCTIONS ---
  const openModal = (supplier = null) => {
    if (supplier) {
      setEditingId(supplier.id);
      setFormData({
        name: supplier.name,
        contact: supplier.contact,
        address: supplier.address,
        email: supplier.email || ''
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', contact: '', address: '', email: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  // Filter
  const filteredSuppliers = suppliers.filter(s => 
    (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contact || "").includes(searchTerm)
  );

  if (loading) return <div style={{padding:'40px'}}>Loading Suppliers...</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate('/')} style={styles.backBtn}>← Back</button>
            <div>
                <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#333' }}>Supplier Management</h1>
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Manage Vendor Contacts & Details</div>
            </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Search by Name or Phone..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <button onClick={() => openModal()} style={styles.addBtn}>
              + Add New Supplier
          </button>
      </div>

      {/* --- TABLE --- */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Company / Name</th>
              <th style={styles.th}>Contact Person / Phone</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Address</th>
              <th style={{...styles.th, textAlign:'right'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.length === 0 && (
              <tr><td colSpan="5" style={styles.empty}>No suppliers found.</td></tr>
            )}
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
      </div>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{marginTop:0}}>{editingId ? 'Edit Supplier' : 'Add New Supplier'}</h3>
            <form onSubmit={handleSave} style={{display:'grid', gap:'15px'}}>
              <div>
                <label style={styles.label}>Supplier Name</label>
                <input 
                  type="text" required placeholder="e.g. ABC Foods Pvt Ltd"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                  style={styles.input} 
                />
              </div>
              
              <div style={{display:'flex', gap:'10px'}}>
                <div style={{flex:1}}>
                  <label style={styles.label}>Phone / Contact</label>
                  <input 
                    type="text" required placeholder="98XXXXXXXX"
                    value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} 
                    style={styles.input} 
                  />
                </div>
                <div style={{flex:1}}>
                  <label style={styles.label}>Email (Optional)</label>
                  <input 
                    type="email" placeholder="vendor@email.com"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} 
                    style={styles.input} 
                  />
                </div>
              </div>

              <div>
                <label style={styles.label}>Address</label>
                <input 
                  type="text" placeholder="Full Address"
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} 
                  style={styles.input} 
                />
              </div>

              <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                <button type="button" onClick={closeModal} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.saveBtn}>Save Supplier</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

// --- STYLES ---
const styles = {
    backBtn: { padding: '8px 16px', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#555' },
    searchInput: { padding: '12px', width: '300px', borderRadius: '6px', border: '1px solid #ccc', fontSize:'1rem' },
    addBtn: { padding: '12px 20px', backgroundColor: '#D32F2F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    
    tableContainer: { backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' },
    table: { width: '100%', borderCollapse: 'collapse' },
    thead: { backgroundColor: '#f1f1f1' },
    th: { padding: '15px', textAlign: 'left', fontSize: '0.9rem', color: '#555', fontWeight: 'bold' },
    td: { padding: '15px', fontSize: '0.95rem', color: '#333' },
    empty: { padding: '30px', textAlign: 'center', color: '#999' },

    editBtn: { padding: '6px 12px', backgroundColor: '#E3F2FD', color: '#1565C0', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '8px', fontWeight:'bold' },
    deleteBtn: { padding: '6px 12px', backgroundColor: '#FFEBEE', color: '#C62828', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold' },

    // Modal
    modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', padding: '25px', borderRadius: '10px', width: '450px', maxWidth: '90%', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.9rem', color: '#555' },
    input: { width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', boxSizing: 'border-box' },
    cancelBtn: { flex: 1, padding: '10px', border: '1px solid #ccc', backgroundColor: 'white', borderRadius: '5px', cursor: 'pointer' },
    saveBtn: { flex: 1, padding: '10px', border: 'none', backgroundColor: 'black', color: 'white', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }
};

export default Suppliers;