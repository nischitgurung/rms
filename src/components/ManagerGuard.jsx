import { useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useUser } from '../contexts/UserContext';

const ManagerGuard = ({ onSuccess, onClose, actionName }) => {
  const { restaurantId } = useUser();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const verifyPin = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setError('');

    try {
      // Security Check: Look for a user who is a MANAGER and has this PIN
      const q = query(
          collection(db, "staff"), 
          where("userId", "==", restaurantId),
          where("role", "==", "Manager"), 
          where("pin", "==", pin)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
          // Success: Manager found. 
          // Ideally, we would log this to an 'Audit Log' collection here[cite: 131].
          onSuccess(); 
      } else {
          setError("Invalid Manager PIN.");
      }
    } catch (err) {
      setError("Verification failed.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
           <h3>🛡️ Manager Approval</h3>
           <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        
        <p style={{marginBottom: '15px', color: '#555'}}>
            Approving: <strong>{actionName || 'Restricted Action'}</strong>
        </p>

        <form onSubmit={verifyPin}>
            <input 
                autoFocus
                type="password" 
                maxLength="4" 
                placeholder="PIN"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g,''))}
                style={styles.input}
            />
            
            {error && <p style={{color:'#D32F2F', fontSize:'0.9rem', margin: '10px 0'}}>{error}</p>}
            
            <div style={{display:'flex', gap:'10px', marginTop:'15px'}}>
                <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={verifying} style={styles.approveBtn}>
                    {verifying ? 'Checking...' : 'Approve'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
    overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
    modal: { backgroundColor: 'white', padding: '25px', borderRadius: '12px', width: '320px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
    closeBtn: { background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' },
    input: { padding: '12px', fontSize: '1.5rem', width: '100%', textAlign: 'center', letterSpacing: '8px', marginBottom: '5px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' },
    cancelBtn: { flex: 1, padding: '10px', border: '1px solid #ddd', backgroundColor: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    approveBtn: { flex: 1, padding: '10px', border: 'none', backgroundColor: '#D32F2F', color: 'white', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }
};

export default ManagerGuard;