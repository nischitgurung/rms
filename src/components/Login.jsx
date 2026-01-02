import { useState } from 'react';
import { auth } from '../firebase';
// Import GoogleAuthProvider and signInWithPopup
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // --- 1. Email/Password Login ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin(true);
    } catch (err) {
      setError("Invalid Email or Password");
    }
  };

  // --- 2. Google Login Logic ---
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      onLogin(true); // Notify App that user is logged in
    } catch (err) {
      console.error(err);
      setError("Google Login Failed. Try again.");
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#f8f9fa' 
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '400px', 
        padding: '40px', 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>WELCOME BACK</h2>
          <p style={{ color: '#666', fontSize: '14px' }}>Welcome back! Please enter your details.</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Email</label>
            <input 
              type="email" 
              placeholder="Enter your email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Password</label>
            <input 
              type="password" 
              placeholder="**********" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', fontSize: '13px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input type="checkbox" /> Remember me
            </label>
            <a href="#" style={{ textDecoration: 'none', color: 'black', fontWeight: '500' }}>Forgot Password?</a>
          </div>

          {error && <p style={{ color: 'red', fontSize: '13px', marginBottom: '15px', textAlign: 'center' }}>{error}</p>}

          <button 
            type="submit" 
            style={{ width: '100%', padding: '12px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '15px' }}
          >
            Login
          </button>

          {/* --- 3. Connected Google Button --- */}
          <button 
            type="button" 
            onClick={handleGoogleLogin} // Trigger the function here
            style={{ 
              width: '100%', 
              padding: '12px', 
              backgroundColor: 'white', 
              color: 'black', 
              border: '1px solid #ddd', 
              borderRadius: '6px', 
              fontSize: '14px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>G</span> Login with Google
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px' }}>
          <span style={{ color: '#666' }}>Don't have an account? </span>
          <a href="#" style={{ color: 'black', fontWeight: 'bold', textDecoration: 'none' }}>Sign up!</a>
        </div>

      </div>
    </div>
  );
};

export default Login;