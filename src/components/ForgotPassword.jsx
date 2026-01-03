import React, { useState } from 'react';
import { auth } from '../firebase'; 
import { sendPasswordResetEmail } from 'firebase/auth';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      /**
       * IMPORTANT: We do NOT pass ActionCodeSettings here. 
       * This avoids the "Upgrade to Identity Platform" requirement.
       * Firebase will send the email and use the default Google-hosted reset page.
       */
      await sendPasswordResetEmail(auth, email);
      
      setMessage("Success! A reset link has been sent. Please check your Inbox and Spam folder.");
      setEmail(''); 
    } catch (err) {
      console.error("Firebase Reset Error:", err.code);
      
      // Handle standard Firebase error codes
      if (err.code === 'auth/user-not-found') {
        setError("No account found with this email address.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Please enter a valid email format.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many requests. Try again in a few minutes.");
      } else {
        setError("Failed to send email. Ensure this email is registered.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8f9fa',
      padding: '20px'
    },
    card: {
      width: '100%',
      maxWidth: '400px',
      padding: '40px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    header: { textAlign: 'center', marginBottom: '30px' },
    title: { fontSize: '22px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#333' },
    subtitle: { color: '#666', fontSize: '14px', margin: 0 },
    inputGroup: { marginBottom: '20px' },
    label: { display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#444' },
    input: {
      width: '100%',
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '6px',
      fontSize: '14px',
      boxSizing: 'border-box',
      outline: 'none',
      transition: 'border-color 0.2s'
    },
    primaryBtn: {
      width: '100%',
      padding: '12px',
      backgroundColor: 'black',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'background-color 0.2s'
    },
    errorText: { color: '#dc3545', fontSize: '13px', marginBottom: '15px', textAlign: 'center' },
    successText: { color: '#28a745', fontSize: '13px', marginBottom: '15px', textAlign: 'center' },
    footer: { textAlign: 'center', marginTop: '20px', fontSize: '14px' },
    link: { color: '#000', fontWeight: 'bold', textDecoration: 'none' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>RESET PASSWORD</h2>
          <p style={styles.subtitle}>Enter your email to receive a password reset link from Firebase.</p>
        </div>

        <form onSubmit={handleReset}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input 
              type="email" 
              placeholder="name@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
              disabled={isLoading}
            />
          </div>

          {error && <p style={styles.errorText}>{error}</p>}
          {message && <p style={styles.successText}>{message}</p>}

          <button 
            type="submit" 
            disabled={isLoading}
            style={{ 
              ...styles.primaryBtn, 
              backgroundColor: isLoading ? '#666' : 'black',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? "Communicating with Firebase..." : "Send Reset Link"}
          </button>
        </form>

        <div style={styles.footer}>
          <Link to="/login" style={styles.link}>← Back to Login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;