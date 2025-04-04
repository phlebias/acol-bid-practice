import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import './AdminPage.css';

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get the ID token to check for admin claim
      const idTokenResult = await user.getIdTokenResult();
      
      if (idTokenResult.claims.admin) {
        navigate('/admin');
      } else {
        setError('You do not have admin privileges');
        await auth.signOut();
      }
    } catch (error) {
      setError('Failed to log in: ' + error.message);
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-login-container">
        <h2 className="admin-title">Admin Login</h2>
        {error && <p className="error-message">{error}</p>}
        <form className="admin-login-form" onSubmit={handleSubmit}>
          <input
            type="email"
            className="admin-login-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="admin-login-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="login-btn">
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin; 