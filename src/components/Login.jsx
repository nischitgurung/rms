import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onLogin(true); // Notify App that user is logged in
    } catch (err) {
      setError("Invalid Email or Password");
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '30px', border: '1px solid #ccc', borderRadius: '10px' }}>
      <h2>WELCOME BACK </h2>
      <p style={{color: '#666'}}>Welcome back! Please enter your details.</p>
      
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '15px' }}>
          <label>Email</label>
          <input 
            type="email" 
            placeholder="Enter your email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Password</label>
          <input 
            type="password" 
            placeholder="**********" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '10px', marginTop: '5px' }}
          />
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button 
          type="submit" 
          style={{ width: '100%', padding: '12px', background: 'black', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;
