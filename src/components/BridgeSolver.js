import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../firebase.js';
import './BridgeSolver.css';

// Define RANKS needed for hand formatting
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

const BridgeSolver = () => {
  const { dealId } = useParams(); // Get dealId from URL, will be undefined if route is just /solver
  const [solverUrl, setSolverUrl] = useState('');
  const [loading, setLoading] = useState(true); // Start loading until we decide
  const [error, setError] = useState(null);

  // Helper to format a single hand for PBN format (e.g., SAKQ.HJT.D54.C987)
  const formatHandPBN = (hand) => {
    if (!hand) return '';
    const suits = { S: [], H: [], D: [], C: [] };
    // Sort ranks within each suit according to RANKS order for standard PBN
    hand.sort((a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank));
    hand.forEach(card => suits[card.suit].push(card.rank));
    // Join ranks within suit, join suits with '.', handle empty suits
    return `S${suits.S.join('')}.H${suits.H.join('')}.D${suits.D.join('')}.C${suits.C.join('')}`;
  };

  useEffect(() => {
    const loadSolverData = async () => {
      // Case 1: No dealId provided (navigated directly to /solver)
      if (!dealId) {
        console.log("No dealId found, loading base solver URL.");
        setSolverUrl("https://mirgo2.co.uk/bridgesolver/");
        setLoading(false);
        return;
      }

      // Case 2: dealId provided, fetch the deal and generate URL
      console.log(`dealId found (${dealId}), fetching deal data...`);
      setLoading(true); // Ensure loading is true while fetching
      setError(null);
      try {
        const dealDocRef = doc(firestore, "savedDeals", dealId);
        const dealDocSnap = await getDoc(dealDocRef);

        if (dealDocSnap.exists()) {
          const deal = dealDocSnap.data();

          // Generate URL using PBN format
          const northPBN = formatHandPBN(deal.northHand);
          const eastPBN = formatHandPBN(deal.eastHand);
          const southPBN = formatHandPBN(deal.southHand);
          const westPBN = formatHandPBN(deal.westHand);
          const pbnHandsString = `N:${northPBN} E:${eastPBN} S:${southPBN} W:${westPBN}`;

          const dealerPBN = deal.dealer.toLowerCase();
          const vulMapPBN = { 'None': 'o', 'NS': 'n', 'EW': 'e', 'Both': 'b' };
          const vulPBN = vulMapPBN[deal.vulnerability] || 'o';

          const baseUrl = "https://mirgo2.co.uk/bridgesolver/";
          const generatedUrl = `${baseUrl}?d=${dealerPBN}&v=${vulPBN}&pbn=${encodeURIComponent(pbnHandsString)}`;

          console.log("Generated mirgo2 PBN URL:", generatedUrl);
          setSolverUrl(generatedUrl);

        } else {
          console.error("No such deal document!");
          setError(`Saved deal not found (ID: ${dealId}).`);
        }
      } catch (err) {
        console.error("Error fetching deal for solver:", err);
        setError("Failed to load deal data.");
      } finally {
        setLoading(false);
      }
    };

    loadSolverData();
  }, [dealId]); // Dependency array includes dealId

  // Render loading state only if we are expecting a specific deal
  if (loading && dealId) {
    return <div className="bridge-solver-container"><p>Loading deal for solver...</p></div>;
  }

  // Render error state if an error occurred
  if (error) {
    return <div className="bridge-solver-container"><p style={{ color: 'red' }}>Error: {error}</p></div>;
  }

  // Render the main component content
  return (
    <div className="bridge-solver-container">
      <h1>Bridge Solver</h1>
      {dealId ? (
        <>
          <p>Attempting to load saved deal ID: {dealId}</p>
          <p>(If the deal doesn't load correctly below, the URL parameters might need adjustment)</p>
        </>
      ) : (
        <p>Use the interface below to analyze deals manually or load a PBN file.</p>
      )}
      {solverUrl ? ( // Only render iframe if URL is set
        <iframe
          src={solverUrl}
          width="100%"
          height="700px"
          title="Bridge Solver"
          style={{ border: '1px solid #ccc' }}
        ></iframe>
      ) : (
        // Show placeholder only if not loading and no dealId was provided initially
        !loading && !dealId && <p>Initializing solver...</p>
      )}
    </div>
  );
};

export default BridgeSolver;