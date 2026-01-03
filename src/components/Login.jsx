import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  getMultiFactorResolver,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier 
} from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 2FA States
  const [verificationId, setVerificationId] = useState('');
  const [otp, setOtp] = useState('');
  const [resolver, setResolver] = useState(null);
  const [showOtpInput, setShowOtpInput] = useState(false);

  const navigate = useNavigate();

  // Initialize reCAPTCHA
  const setupRecaptcha = (containerId) => {
    if (window.recaptchaVerifier) return;
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => console.log('reCAPTCHA resolved')
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Step 1: Standard Login Attempt
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      if (err.code === 'auth/multi-factor-auth-required') {
        // Step 2: Handle MFA Requirement
        const mfaResolver = getMultiFactorResolver(auth, err);
        setResolver(mfaResolver);
        
        // Setup reCAPTCHA for SMS sending
        setupRecaptcha('recaptcha-container');
        
        const phoneInfoOptions = {
          multiFactorHint: mfaResolver.hints[0], // Assumes user has one phone registered
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

  return (
    <div style={styles.container}>
      <div id="recaptcha-container"></div> {/* Hidden reCAPTCHA container */}
      
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>{showOtpInput ? "VERIFY OTP" : "WELCOME BACK"}</h2>
          <p style={styles.subtitle}>
            {showOtpInput ? "Enter the 6-digit code sent to your phone" : "Enter your details to access your account"}
          </p>
        </div>

        {!showOtpInput ? (
          <form onSubmit={handleLogin}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input 
                type="email" 
                placeholder="name@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.utilities}>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" /> Remember me
              </label>
              <Link to="/forgot-password" style={styles.linkText}>Forgot Password?</Link>
            </div>

            {error && <p style={styles.errorText}>{error}</p>}

            <button type="submit" disabled={loading} style={styles.primaryBtn}>
              {loading ? "Processing..." : "Login"}
            </button>

            <button type="button" onClick={handleGoogleLogin} style={styles.googleBtn}>
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_Logo.svg" 
                width="18" 
                alt="Google" 
              />
              Sign in with Google
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>One-Time Password</label>
              <input 
                type="text" 
                placeholder="123456" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            {error && <p style={styles.errorText}>{error}</p>}
            <button type="submit" disabled={loading} style={styles.primaryBtn}>
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>
            <button 
              type="button" 
              onClick={() => setShowOtpInput(false)} 
              style={{...styles.googleBtn, border: 'none'}}
            >
              Back to Login
            </button>
          </form>
        )}

        <div style={styles.footer}>
          <span style={{ color: '#666' }}>New user? </span>
          <Link to="/signup" style={styles.linkTextBold}>Create an account</Link>
        </div>
      </div>
    </div>
  );
};

// ... (keep your existing styles object)
export const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8f9fa', padding: '20px' },
  card: { width: '100%', maxWidth: '400px', padding: '40px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' },
  header: { textAlign: 'center', marginBottom: '30px' },
  title: { fontSize: '24px', fontWeight: 'bold', margin: '0 0 10px 0', letterSpacing: '1px' },
  subtitle: { color: '#666', fontSize: '14px', margin: 0 },
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