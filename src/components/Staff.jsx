import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, where } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext'; // <--- 1. SECURE CONTEXT

const Staff = () => {
  const navigate = useNavigate();
  const { restaurantId } = useUser(); // <--- 2. GET OWNER ID

  // --- STATE ---
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: 'Waiter',
    pin: '',
  });

  // --- 1. DATA FETCHING (SECURE) ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    if (!restaurantId) return;

    // Filter staff by YOUR Restaurant ID only
    const qStaff = query(collection(db, "staff"), where("userId", "==", restaurantId));
    
    const unsubscribe = onSnapshot(qStaff, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaffList(data.sort((a, b) => (a.name || "").localeCompare(b.name || "")));
      setLoading(false);
    });

    return () => {
        unsubscribe();
        window.removeEventListener('resize', handleResize);
    };
  }, [restaurantId]);

  // --- 2. HANDLERS ---
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.pin) return alert("Name and PIN are required");
    if (formData.pin.length !== 4) return alert("PIN must be 4 digits");

    const payload = {
      name: formData.name,
      role: formData.role,
      pin: formData.pin,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "staff", editingId), payload);
        alert("Staff Updated!");
      } else {
        // Tag new staff with YOUR Restaurant ID
        await addDoc(collection(db, "staff"), { 
            ...payload, 
            userId: restaurantId,
            createdAt: serverTimestamp() 
        });
        alert("New Staff Added!");
      }
      closeModal();
    } catch (error) {
      console.error(error);
      alert("Failed to save.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this staff member?")) {
      await deleteDoc(doc(db, "staff", id));
    }
  };

  const openModal = (staff = null) => {
    if (staff) {
      setEditingId(staff.id);
      setFormData({ name: staff.name, role: staff.role, pin: staff.pin });
    } else {
      setEditingId(null);
      setFormData({ name: '', role: 'Waiter', pin: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); };

  if (loading) return <div style={{padding:'40px', textAlign: 'center'}}>Loading Staff...</div>;

  return (
    <div style={{ padding: isMobile ? '10px' : '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '20px', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button onClick={() => navigate('/')} style={styles.backBtn}>←</button>
            <div>
                <h1 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.8rem', color: '#333' }}>Staff Management</h1>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem', color: '#666' }}>Create accounts for your team</p>
            </div>
        </div>
        <button onClick={() => openModal()} style={styles.addBtn}>+ Add Staff</button>
      </div>

      {/* STAFF LIST */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
        {staffList.map(staff => (
            <div key={staff.id} style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{staff.name}</div>
                        <span style={{ 
                            fontSize: '0.75rem', 
                            backgroundColor: staff.role === 'Manager' ? '#E3F2FD' : (staff.role === 'Kitchen' ? '#FFF3E0' : '#E8F5E9'),
                            color: staff.role === 'Manager' ? '#1565C0' : (staff.role === 'Kitchen' ? '#E65100' : '#2E7D32'),
                            padding: '3px 8px', 
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            display: 'inline-block',
                            marginTop: '5px'
                        }}>
                            {staff.role}
                        </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: '#888' }}>Login PIN</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: '2px' }}>{staff.pin}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '15px', paddingTop: '10px', borderTop: '1px solid #f0f0f0' }}>
                    <button onClick={() => openModal(staff)} style={styles.editBtn}>Edit</button>
                    <button onClick={() => handleDelete(staff.id)} style={styles.deleteBtn}>Delete</button>
                </div>
            </div>
        ))}

        {staffList.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#999', backgroundColor: 'white', borderRadius: '10px' }}>
                No staff members yet. Click "+ Add Staff" to create one.
            </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modal, width: isMobile ? '90%' : '400px'}}>
            <h3 style={{marginTop:0}}>{editingId ? 'Edit Staff' : 'Add New Staff'}</h3>
            <form onSubmit={handleSave} style={{display:'grid', gap:'15px'}}>
              
              <div>
                  <label style={styles.label}>Name</label>
                  <input type="text" required placeholder="e.g. John Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={styles.input} />
              </div>

              <div>
                  <label style={styles.label}>Role</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={styles.input}>
                      <option value="Waiter">Waiter (POS & Orders)</option>
                      <option value="Kitchen">Kitchen (KDS Display)</option>
                      <option value="Manager">Manager (Inventory & Menu)</option>
                  </select>
              </div>

              <div>
                  <label style={styles.label}>4-Digit PIN</label>
                  <input type="text" maxLength="4" required placeholder="e.g. 1234" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value.replace(/\D/g,'')})} style={{...styles.input, fontFamily:'monospace', letterSpacing:'3px', fontSize:'1.2rem'}} />
              </div>

              <div style={{display:'flex', gap:'10px', marginTop:'10px'}}>
                <button type="button" onClick={closeModal} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.saveBtn}>Save Staff</button>
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
    addBtn: { padding: '10px 20px', backgroundColor: '#000', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
    card: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #eee' },
    editBtn: { flex: 1, padding: '8px', backgroundColor: '#E3F2FD', color: '#1565C0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight:'bold' },
    deleteBtn: { flex: 1, padding: '8px', backgroundColor: '#FFEBEE', color: '#C62828', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight:'bold' },
    modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', padding: '25px', borderRadius: '12px' },
    input: { width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '1rem' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.85rem', color: '#555' },
    cancelBtn: { flex: 1, padding: '12px', border: '1px solid #ccc', backgroundColor: 'white', borderRadius: '6px', cursor:'pointer' },
    saveBtn: { flex: 1, padding: '12px', border: 'none', backgroundColor: 'black', color: 'white', borderRadius: '6px', fontWeight: 'bold', cursor:'pointer' }
};

export default Staff;