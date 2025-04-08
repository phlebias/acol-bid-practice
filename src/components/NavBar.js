import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { playButtonSound } from '../utils/sound.js';
import { getAuth, signOut } from "firebase/auth";
import { getFirebaseApp } from '../firebase.js';
import './NavBar.css';

function NavBar({ isAuthenticated }) {
  const navigate = useNavigate();
  const isDevelopment = process.env.NODE_ENV === 'development';

  const handleLogout = () => {
    playButtonSound();
    localStorage.removeItem('hasAccess');
    navigate('/');
  };

  const goToAdmin = () => {
    window.location.href = '/admin';
  };

  return (
    <nav className="navbar">
      <div className="nav-links">
        {isAuthenticated && (
          <>
            <Link to="/main" className="nav-link" onClick={() => playButtonSound()}>Home</Link>
            <Link to="/saved-deals" className="nav-link" onClick={() => playButtonSound()}>Saved Deals</Link>
            <Link to="/solver" className="nav-link" onClick={() => playButtonSound()}>Solver</Link>
            {isDevelopment && (
              <button className="nav-link" onClick={goToAdmin}>Admin Panel</button>
            )}
            <button onClick={handleLogout} className="nav-link logout-btn">
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

export default NavBar;
