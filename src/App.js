import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage.js';
import MainPage from './components/MainPage.js';
import ContentPage from './components/ContentPage.js';
import AdminPage from './components/AdminPage.js';
import UserLogin from './components/UserLogin.js';
import NavBar from './components/NavBar.js';
import BiddingPracticeTable from './components/BiddingPracticeTable.js';
import SavedDealsPage from './components/SavedDealsPage.js';
import BridgeSolver from './components/BridgeSolver.js'; // Import BridgeSolver
import { FEATURES } from './config.js';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isDevelopment = process.env.NODE_ENV === 'development';
  const requireLogin = FEATURES.REQUIRE_LOGIN;

  useEffect(() => {
    // Check if user has entered the correct password
    const checkAuth = () => {
      const hasAccess = localStorage.getItem('hasAccess') === 'true';
      
      // In production, verify that authentication is required
      if (!isDevelopment && !requireLogin) {
        console.warn('Login should be required in production!');
      }
      
      setIsAuthenticated(hasAccess);
      setIsLoading(false);
    };
    
    checkAuth();
  }, [isDevelopment, requireLogin]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // If login is not required or in development mode, consider everyone authenticated
  // In production, always require authentication if REQUIRE_LOGIN is true
  const isUserAuthenticated = 
    (isDevelopment && !requireLogin) || // Development without login requirement
    isAuthenticated;

  return (
    <Router>
      <NavBar isAuthenticated={isUserAuthenticated} />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/login" 
          element={
            isUserAuthenticated ? (
              <Navigate to="/main" replace />
            ) : (
              <UserLogin />
            )
          } 
        />

        {/* Protected routes */}
        <Route
          path="/main"
          element={
            isUserAuthenticated ? (
              <MainPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/content/:collection/:id"
          element={
            isUserAuthenticated ? (
              <ContentPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/bidding-practice"
          element={
            isUserAuthenticated ? (
              <BiddingPracticeTable />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/saved-deals"
          element={
            isUserAuthenticated ? (
              <SavedDealsPage />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/solver/:dealId" // Add :dealId parameter
          element={
            isUserAuthenticated ? (
              <BridgeSolver />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        {/* Add route for base solver page without specific deal */}
        <Route
          path="/solver"
          element={
            isUserAuthenticated ? (
              <BridgeSolver /> // Render solver without dealId
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        {/* Admin route */}
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}

export default App;
