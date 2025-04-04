import React, { useState, useEffect } from 'react';
import './UserLogin.css';

function UserLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Store the expected password in a variable to ensure it's captured
  const expectedPassword = process.env.REACT_APP_ACCESS_PASSWORD;

  useEffect(() => {
    // Only log environment variables in development mode
    if (isDevelopment) {
      const envInfo = {
        accessPassword: expectedPassword ? '(set)' : '(not set)',
        nodeEnv: process.env.NODE_ENV,
        hasAccess: localStorage.getItem('hasAccess')
      };
      console.log('Environment check:', envInfo);
      setDebugInfo(JSON.stringify(envInfo, null, 2));
    }
    
    // Clear any existing access on component mount
    if (!isDevelopment) {
      localStorage.removeItem('hasAccess');
    }
  }, [isDevelopment, expectedPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Clear any previous errors

    // Only log attempt info in development mode
    if (isDevelopment) {
      const attemptInfo = {
        enteredPassword: password,
        expectedPasswordExists: !!expectedPassword,
        hasAccess: localStorage.getItem('hasAccess')
      };
      console.log('Login attempt:', attemptInfo);
      setDebugInfo(JSON.stringify(attemptInfo, null, 2));
    }

    if (!expectedPassword) {
      console.error('Access password not found in environment variables');
      setError('System configuration error. Please contact administrator.');
      return;
    }

    if (password === expectedPassword) {
      try {
        localStorage.setItem('hasAccess', 'true');
        console.log('Access granted, navigating to main');
        // Force a page reload to ensure the auth state is updated
        window.location.href = '/main';
      } catch (err) {
        console.error('Error setting localStorage:', err);
        setError('Error saving access. Please try again.');
      }
    } else {
      console.log('Password incorrect');
      setError('Incorrect password');
    }
  };

  return (
    <div className="user-login-container">
      <div className="user-login-box">
        <h2 className="user-login-title">Enter Password to Access Content</h2>
        {error && <p className="error-message">{error}</p>}
        <form className="user-login-form" onSubmit={handleSubmit}>
          <input
            type="password"
            className="user-login-input"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="user-login-btn">
            Access Content
          </button>
        </form>
        {/* Only show debug information in development mode */}
        {isDevelopment && debugInfo && (
          <div style={{ marginTop: '20px', textAlign: 'left', fontSize: '12px', color: '#666' }}>
            <pre>{debugInfo}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserLogin; 