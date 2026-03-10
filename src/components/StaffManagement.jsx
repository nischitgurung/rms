import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { useUser } from '../contexts/UserContext';

const StaffManagement = () => {
  const navigate = useNavigate();
  const { restaurantId } = useUser();

  // --- STATE ---
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, MANAGER, WAITER, KITCHEN
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: 'Waiter',
    pin: '',
    email: '' // Added email for "Invite" simulation
  });

  // --- 1. DATA FETCHING ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    if (!restaurantId) return;

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
      email: formData.email,
      status: 'Active', // Defaulting to active for now since we don't have a real email server yet
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "staff", editingId), payload);
        alert("Staff Updated!");
      } else {
        await addDoc(collection(db, "staff"), { 
            ...payload, 
            userId: restaurantId,
            createdAt: serverTimestamp() 
        });
        alert("Staff Added! (Invite simulated)");
      }
      closeModal();
    } catch (error) {
      console.error(error);
      alert("Failed to save.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Remove this staff member?")) {
      await deleteDoc(doc(db, "staff", id));
    }
  };

  const openModal = (staff = null) => {
    if (staff) {
      setEditingId(staff.id);
      setFormData({ name: staff.name, role: staff.role, pin: staff.pin, email: staff.email || '' });
    } else {
      setEditingId(null);
      setFormData({ name: '', role: 'Waiter', pin: '', email: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingId(null); };

  // --- FILTERING ---
  const filteredStaff = staffList.filter(staff => {
      if (activeTab === 'ALL') return true;
      return staff.role.toUpperCase() === activeTab;
  });

  if (loading) return <div style={{padding:'40px', textAlign: 'center'}}>Loading Team...</div>;

  return (
    <div style={{ padding: isMobile ? '10px' : '30px', backgroundColor: '#f8f9fa', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER SECTION */}
      <div style={{ marginBottom: '25px' }}>
          <button onClick={() => navigate('/')} style={styles.backBtn}>← Back</button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
              <div>
                  <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold' }}>Staff Management</h1>
                  <p style={{ margin: '5px 0 0', color: '#666' }}>Manage your team and permissions</p>
              </div>
              <button onClick={() => openModal()} style={styles.addBtn}>+ Add Staff</button>
          </div>
      </div>

      {/* TABS / FILTERS */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '5px' }}>
          {['ALL', 'MANAGER', 'WAITER', 'KITCHEN'].map(tab => (
              <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  style={{ 
                      ...styles.tabBtn, 
                      backgroundColor: activeTab === tab ? 'black' : 'white', 
                      color: activeTab === tab ? 'white' : '#555',
                      border: activeTab === tab ? 'none' : '1px solid #ddd'
                  }}
              >
                  {tab === 'ALL' ? 'Active Team' : tab.charAt(0) + tab.slice(1).toLowerCase()}
              </button>
          ))}
          <button style={{ ...styles.tabBtn, backgroundColor: 'white', color: '#888', border: '1px dashed #ccc' }}>
              Pending Invites (0)
          </button>
      </div>

      {/* STAFF LIST GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {filteredStaff.map(staff => (
            <div key={staff.id} style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        {/* Avatar Placeholder */}
                        <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#555' }}>
                            {staff.name.charAt(0)}
                        </div>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{staff.name}</div>
                            <div style={{ fontSize: '0.85rem', color: '#888' }}>{staff.email || 'No Email'}</div>
                        </div>
                    </div>
                    <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontWeight: 'bold',
                        backgroundColor: staff.role === 'Manager' ? '#E3F2FD' : (staff.role === 'Kitchen' ? '#FFF3E0' : '#E8F5E9'),
                        color: staff.role === 'Manager' ? '#1565C0' : (staff.role === 'Kitchen' ? '#E65100' : '#2E7D32'),
                        letterSpacing: '0.5px'
                    }}>
                        {staff.role.toUpperCase()}
                    </span>
                </div>

                <div style={{ backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '8px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: 'bold' }}>ACCESS PIN</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '3px' }}>{staff.pin}</span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => openModal(staff)} style={styles.editBtn}>Edit Details</button>
                    <button onClick={() => handleDelete(staff.id)} style={styles.deleteBtn}>Remove</button>
                </div>
            </div>
        ))}
        
        {filteredStaff.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#999', border: '2px dashed #eee', borderRadius: '12px' }}>
                No staff found in this category.
            </div>
        )}
      </div>

      {/* ADD/EDIT MODAL */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modal, width: isMobile ? '90%' : '420px'}}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>{editingId ? 'Edit Team Member' : 'Send Invite'}</h3>
                <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            <form onSubmit={handleSave} style={{display:'grid', gap:'15px'}}>
              <div>
                  <label style={styles.label}>Full Name</label>
                  <input type="text" required placeholder="e.g. Sarah Jones" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={styles.input} />
              </div>

              <div>
                  <label style={styles.label}>Email Address (Optional)</label>
                  <input type="email" placeholder="sarah@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={styles.input} />
              </div>

              <div>
                  <label style={styles.label}>Assign Role</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      {['Manager', 'Waiter', 'Kitchen'].map(r => (
                          <div 
                            key={r} 
                            onClick={() => setFormData({...formData, role: r})}
                            style={{ 
                                padding: '10px', 
                                textAlign: 'center', 
                                border: formData.role === r ? '2px solid black' : '1px solid #ddd',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: formData.role === r ? 'bold' : 'normal',
                                backgroundColor: formData.role === r ? '#f0f0f0' : 'white',
                                fontSize: '0.9rem'
                            }}
                          >
                              {r}
                          </div>
                      ))}
                  </div>
              </div>

              <div>
                  <label style={styles.label}>Create 4-Digit Login PIN</label>
                  <input 
                    type="text" 
                    maxLength="4" 
                    required 
                    placeholder="0000" 
                    value={formData.pin} 
                    onChange={e => setFormData({...formData, pin: e.target.value.replace(/\D/g,'')})} 
                    style={{...styles.input, fontFamily:'monospace', letterSpacing:'5px', fontSize:'1.2rem', textAlign:'center'}} 
                  />
              </div>

              <button type="submit" style={styles.saveBtn}>
                  {editingId ? 'Save Changes' : 'Create & Send Invite'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
    backBtn: { background: 'none', border: 'none', fontSize: '0.9rem', cursor: 'pointer', color: '#666', fontWeight: 'bold', padding: 0 },
    addBtn: { padding: '10px 20px', backgroundColor: '#000', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' },
    tabBtn: { padding: '10px 20px', borderRadius: '30px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap' },
    card: { backgroundColor: 'white', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' },
    editBtn: { flex: 1, padding: '10px', backgroundColor: 'white', color: '#333', border: '1px solid #ddd', borderRadius: '8px', cursor: 'pointer', fontWeight:'600', fontSize: '0.85rem' },
    deleteBtn: { padding: '10px 15px', backgroundColor: '#FFF0F0', color: '#D32F2F', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight:'600', fontSize: '0.85rem' },
    modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modal: { backgroundColor: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' },
    input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ddd', boxSizing: 'border-box', fontSize: '1rem', outline: 'none' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.85rem', color: '#444' },
    saveBtn: { width: '100%', padding: '14px', border: 'none', backgroundColor: 'black', color: 'white', borderRadius: '10px', fontWeight: 'bold', cursor:'pointer', fontSize: '1rem', marginTop: '10px' }
};

export default StaffManagement;