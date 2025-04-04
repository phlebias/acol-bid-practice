import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <h1 className="landing-title">Yer Aktual Acol</h1>
      <img 
        src="/logo.png/Ace-of-Spades (1).png"
        alt="Acol Bridge Logo"
        className="landing-logo spin"
      />
      <div className="landing-buttons">
        <button 
          className="btn landing-btn"
          onClick={() => navigate('/login')}
        >
          Login to Access Content
        </button>
      </div>
    </div>
  );
}

export default LandingPage;
