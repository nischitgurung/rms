import { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { styles } from './Login'; // Reusing styles

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError("Passwords do not match");

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/'); // Success redirect
    } catch (err) {
      setError(err.message.includes("email-already-in-use") ? "Email already exists" : "Signup failed");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>SIGN UP</h2>
          <p style={styles.subtitle}>Join us today by creating your account</p>
        </div>

        <form onSubmit={handleSignup}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input 
              type="email" 
              placeholder="example@mail.com" 
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input 
              type="password" 
              placeholder="Minimum 6 characters" 
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Confirm Password</label>
            <input 
              type="password" 
              placeholder="Repeat password" 
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          {error && <p style={styles.errorText}>{error}</p>}

          <button type="submit" style={styles.primaryBtn}>Create Account</button>
        </form>

        <div style={styles.footer}>
          <span style={{ color: '#666' }}>Already have an account? </span>
          <Link to="/login" style={styles.linkTextBold}>Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;