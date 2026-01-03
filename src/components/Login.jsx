import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/'); // Successful login redirects to Dashboard
    } catch (err) {
      setError("Invalid Email or Password");
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
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>WELCOME BACK</h2>
          <p style={styles.subtitle}>Enter your details to access your account</p>
        </div>

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
            {loading ? "Logging in..." : "Login"}
          </button>

          <button type="button" onClick={handleGoogleLogin} style={styles.googleBtn}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/02-google-logo-color.svg" width="18" alt="G" />
            Sign in with Google
          </button>
        </form>

        <div style={styles.footer}>
          <span style={{ color: '#666' }}>New user? </span>
          <Link to="/signup" style={styles.linkTextBold}>Create an account</Link>
        </div>
      </div>
    </div>
  );
};

// Export styles so Signup/ForgotPass can use them
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