import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';

const StaffManagement = () => {
  const { restaurantId, role } = useUser();
  const navigate = useNavigate();

  // State
  const [staff, setStaff] = useState([]);
  const [invites, setInvites] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('waiter');

  useEffect(() => {
    if (!restaurantId) return;

    // 1. Fetch Active Staff (Users who already signed up)
    // We look for users who have YOUR restaurantId as their boss
    const qStaff = query(collection(db, "users"), where("restaurantId", "==", restaurantId));
    const unsubStaff = onSnapshot(qStaff, (snap) => {
      setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. Fetch Pending Invites (Emails waiting to sign up)
    const qInvites = query(collection(db, "staff_invites"), where("restaurantId", "==", restaurantId));
    const unsubInvites = onSnapshot(qInvites, (snap) => {
      setInvites(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubStaff(); unsubInvites(); };
  }, [restaurantId]);

  const handleInvite = async (e) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;

    try {
      // Create an "Invite Ticket" in database
      // Document ID is the email itself to prevent duplicates
      await setDoc(doc(db, "staff_invites", email), {
        email: email,
        role: newRole,
        restaurantId: restaurantId, // Link them to YOU
        invitedAt: new Date().toISOString()
      });
      setNewEmail('');
      alert(`Invite sent to ${email}! Tell them to Sign Up now.`);
    } catch (error) {
      console.error(error);
      alert("Error adding staff invite.");
    }
  };

  const handleRemove = async (collectionName, id) => {
    if(!window.confirm("Are you sure you want to remove this member?")) return;
    try {
        await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
        alert("Failed to remove: " + error.message);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      
      <div style={{display:'flex', alignItems:'center', marginBottom:'20px'}}>
        <button onClick={() => navigate('/')} style={{marginRight:'15px', padding:'8px 15px', cursor:'pointer'}}>Back</button>
        <h1>Staff Management</h1>
      </div>
      
      {/* --- INVITE FORM --- */}
      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '30px', border:'1px solid #ddd' }}>
        <h3 style={{marginTop:0}}>Add New Member</h3>
        <p style={{fontSize:'0.9rem', color:'#666', marginBottom:'15px'}}>
            Enter their email below. When they <strong>Sign Up</strong>, they will automatically join your team.
        </p>
        <form onSubmit={handleInvite} style={{ display: 'flex', gap: '10px', flexWrap:'wrap' }}>
          <input 
            type="email" 
            placeholder="Staff Email (e.g. chef@gmail.com)" 
            value={newEmail} 
            onChange={e => setNewEmail(e.target.value)}
            required
            style={{ flex: 2, padding: '12px', borderRadius:'4px', border:'1px solid #ccc', minWidth:'200px' }}
          />
          <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius:'4px', border:'1px solid #ccc' }}>
            <option value="manager">Manager</option>
            <option value="waiter">Waiter</option>
            <option value="kitchen">Kitchen</option>
          </select>
          <button type="submit" style={{ flex: 1, padding: '12px', background: '#333', color: 'white', border: 'none', cursor: 'pointer', borderRadius:'4px', fontWeight:'bold' }}>
            Send Invite
          </button>
        </form>
      </div>

      {/* --- PENDING INVITES --- */}
      {invites.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{color:'#FF9800'}}>⏳ Pending Invites (Waiting for Signup)</h3>
          <ul style={{listStyle:'none', padding:0}}>
            {invites.map(invite => (
              <li key={invite.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #eee', background:'white' }}>
                <div>
                    <div style={{fontWeight:'bold'}}>{invite.email}</div>
                    <div style={{fontSize:'0.8rem', color:'#666'}}>Role: {invite.role.toUpperCase()}</div>
                </div>
                <button onClick={() => handleRemove('staff_invites', invite.id)} style={{ color: 'red', border: '1px solid red', borderRadius:'4px', background: 'white', cursor: 'pointer', padding:'5px 10px' }}>Cancel Invite</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* --- ACTIVE STAFF --- */}
      <div>
        <h3 style={{color:'#4CAF50'}}>✅ Active Team</h3>
        {staff.filter(m => m.id !== restaurantId).length === 0 ? (
            <p style={{color:'#888'}}>No staff members yet. Send an invite above!</p>
        ) : (
            <ul style={{listStyle:'none', padding:0}}>
            {staff.map(member => {
                // Don't show the Owner in the "Remove" list (You can't fire yourself)
                if (member.id === restaurantId) return null;

                return (
                    <li key={member.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #eee', background:'white', alignItems:'center' }}>
                    <div>
                        <div style={{fontWeight:'bold'}}>{member.email || "No Email"}</div>
                        <div style={{fontSize:'0.8rem', color:'#555'}}>
                            Role: <span style={{fontWeight:'bold', color:'#2196F3'}}>{member.role.toUpperCase()}</span>
                        </div>
                    </div>
                    <button onClick={() => handleRemove('users', member.id)} style={{ color: 'white', border: 'none', borderRadius:'4px', background: '#D32F2F', cursor: 'pointer', padding:'8px 12px' }}>Remove Access</button>
                    </li>
                );
            })}
            </ul>
        )}
      </div>
    </div>
  );
};

export default StaffManagement;