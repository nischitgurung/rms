import { useState } from 'react';
import { signInAnonymously } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { auth, db } from '../firebase'; 
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  getMultiFactorResolver,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier 
} from 'firebase/auth';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext'; 

const Login = () => {
  const navigate = useNavigate();
  const { staffLogin } = useUser(); 

  // --- UI STATE ---
  const [activeTab, setActiveTab] = useState('OWNER'); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- OWNER STATE ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // --- OWNER MFA STATE ---
  const [verificationId, setVerificationId] = useState('');
  const [otp, setOtp] = useState('');
  const [resolver, setResolver] = useState(null);
  const [showOtpInput, setShowOtpInput] = useState(false);

  // --- STAFF STATE ---
  const [staffPin, setStaffPin] = useState('');

  // Initialize reCAPTCHA (Owner Only)
  const setupRecaptcha = (containerId) => {
    if (window.recaptchaVerifier) return;
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => console.log('reCAPTCHA resolved')
    });
  };

  // --- HANDLER: OWNER LOGIN ---
  const handleOwnerLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/multi-factor-auth-required') {
        const mfaResolver = getMultiFactorResolver(auth, err);
        setResolver(mfaResolver);
        setupRecaptcha('recaptcha-container');
        const phoneInfoOptions = {
          multiFactorHint: mfaResolver.hints[0],
          session: mfaResolver.session
        };
        const phoneAuthProvider = new PhoneAuthProvider(auth);
        const vId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, window.recaptchaVerifier);
        setVerificationId(vId);
        setShowOtpInput(true);
      } else {
        setError("Invalid Email or Password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = PhoneAuthProvider.credential(verificationId, otp);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      await resolver.resolveSignIn(multiFactorAssertion);
      navigate('/');
    } catch (err) {
      setError("Invalid OTP Code");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err) {
      setError("Google Login Failed");
    }
  };

  // --- HANDLER: STAFF LOGIN ---
const handleStaffLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
        const q = query(collection(db, "staff"), where("pin", "==", staffPin));
        const snap = await getDocs(q);

        if (snap.empty) throw new Error("Invalid PIN");

        const staffMember = snap.docs[0].data();
        
        // --- THE STRONG FIX: Sign in Anonymously ---
        // This gives the staff a real session in Firebase's eyes
        await signInAnonymously(auth); 

        staffLogin({
            uid: snap.docs[0].id,
            name: staffMember.name,
            role: staffMember.role,
            restaurantId: staffMember.userId 
        });
        
        navigate('/');
    } catch (err) {
        setError("Access Denied: " + err.message);
    } finally {
        setLoading(false);
    }
};
  return (
    <div style={styles.container}>
      <div id="recaptcha-container"></div>
      
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>WELCOME</h2>
          <div style={styles.tabs}>
             <button onClick={() => setActiveTab('OWNER')} style={activeTab === 'OWNER' ? styles.activeTab : styles.tab}>Owner</button>
             <button onClick={() => setActiveTab('STAFF')} style={activeTab === 'STAFF' ? styles.activeTab : styles.tab}>Staff</button>
          </div>
        </div>

        {/* --- OWNER VIEW --- */}
        {activeTab === 'OWNER' && (
            <>
                {!showOtpInput ? (
                <form onSubmit={handleOwnerLogin}>
                    <div style={styles.inputGroup}>
                    <label style={styles.label}>Email Address</label>
                    <input type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} required />
                    </div>
                    <div style={styles.inputGroup}>
                    <label style={styles.label}>Password</label>
                    <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} required />
                    </div>
                    <div style={styles.utilities}>
                        <label style={styles.checkboxLabel}><input type="checkbox" /> Remember me</label>
                        <Link to="/forgot-password" style={styles.linkText}>Forgot Password?</Link>
                    </div>
                    {error && <p style={styles.errorText}>{error}</p>}
                    <button type="submit" disabled={loading} style={styles.primaryBtn}>{loading ? "Processing..." : "Login"}</button>
                    <button type="button" onClick={handleGoogleLogin} style={styles.googleBtn}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Logo.svg" width="18" alt="Google" /> Sign in with Google
                    </button>
                </form>
                ) : (
                <form onSubmit={handleVerifyOtp}>
                    <div style={styles.inputGroup}>
                    <label style={styles.label}>One-Time Password</label>
                    <input type="text" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} style={styles.input} required />
                    </div>
                    {error && <p style={styles.errorText}>{error}</p>}
                    <button type="submit" disabled={loading} style={styles.primaryBtn}>{loading ? "Verifying..." : "Verify & Sign In"}</button>
                </form>
                )}
                <div style={styles.footer}>
                    <span style={{ color: '#666' }}>New restaurant? </span>
                    <Link to="/signup" style={styles.linkTextBold}>Create account</Link>
                </div>
            </>
        )}

        {/* --- STAFF VIEW --- */}
        {activeTab === 'STAFF' && (
            <form onSubmit={handleStaffLogin}>
                <div style={{textAlign:'center', marginBottom:'20px', color:'#555', fontSize:'0.9rem'}}>
                    Enter your 4-digit PIN to access the terminal.
                </div>
                <div style={styles.inputGroup}>
                    <input 
                        type="password" 
                        inputMode="numeric"
                        maxLength="4"
                        placeholder="0 0 0 0" 
                        value={staffPin} 
                        onChange={(e) => setStaffPin(e.target.value)} 
                        style={{...styles.input, textAlign:'center', fontSize:'1.5rem', letterSpacing:'8px', fontWeight:'bold'}} 
                        required 
                    />
                </div>
                {error && <p style={styles.errorText}>{error}</p>}
                <button type="submit" disabled={loading} style={{...styles.primaryBtn, backgroundColor:'#009688'}}>
                    {loading ? "Verifying..." : "Access Terminal"}
                </button>
            </form>
        )}

      </div>
    </div>
  );
};

// --- EXPORTED STYLES (Fixed) ---
export const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa', padding: '20px' },
  card: { width: '100%', maxWidth: '400px', padding: '40px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' },
  header: { textAlign: 'center', marginBottom: '30px' },
  title: { fontSize: '24px', fontWeight: 'bold', margin: '0 0 20px 0', letterSpacing: '1px' },
  tabs: { display:'flex', borderBottom:'2px solid #eee', marginBottom:'20px' },
  tab: { flex:1, padding:'10px', background:'none', border:'none', cursor:'pointer', color:'#888', fontWeight:'bold' },
  activeTab: { flex:1, padding:'10px', background:'none', border:'none', cursor:'pointer', color:'black', borderBottom:'2px solid black', fontWeight:'bold' },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' },
  input: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
  utilities: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', fontSize: '13px' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' },
  linkText: { textDecoration: 'none', color: '#000', fontWeight: '500' },
  linkTextBold: { color: '#000', fontWeight: 'bold', textDecoration: 'none' },
  errorText: { color: '#dc3545', fontSize: '13px', marginBottom: '15px', textAlign: 'center' },
  primaryBtn: { width: '100%', padding: '12px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '15px', opacity: 1 },
  googleBtn: { width: '100%', padding: '12px', backgroundColor: 'white', color: 'black', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  footer: { textAlign: 'center', marginTop: '20px', fontSize: '13px' }
};

export default Login;