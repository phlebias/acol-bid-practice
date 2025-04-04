import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom'; // Remove navigate import again
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore'; // Add doc, deleteDoc
import { firestore } from '../firebase';
import './SavedDealsPage.css'; // Create this CSS file later

function SavedDealsPage() {
  // Removed unused navigate import and hook
  const [savedDeals, setSavedDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDeals = async () => {
      setLoading(true);
      setError(null);
      try {
        // Query savedDeals, order by creation time descending
        const dealsQuery = query(collection(firestore, "savedDeals"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(dealsQuery);
        const deals = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSavedDeals(deals);
      } catch (err) {
        console.error("Error fetching saved deals:", err);
        setError("Failed to load saved deals.");
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, []); // Fetch only once on component mount

  // Function to format timestamp (if createdAt exists)
  const formatTimestamp = (timestamp) => {
    if (!timestamp || !timestamp.toDate) {
      return 'N/A';
    }
    return timestamp.toDate().toLocaleString(); // Simple local string format
  };
  // Define RANKS here as it's needed for sorting in formatHandPBN
  const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

  // Helper to format a single hand for PBN format (e.g., SAKQ.HJT.D54.C987)
  const formatHandPBN = (hand) => {
    // Return PBN hand format: Ranks only, separated by dots (S.H.D.C order)
    if (!hand || !Array.isArray(hand)) {
      console.error("formatHandPBN received invalid hand data:", hand);
      return '...'; // Return placeholder on error
    }
    const suits = { S: [], H: [], D: [], C: [] };
    // Create a shallow copy before sorting
    const sortedHand = [...hand].sort((a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank));
    sortedHand.forEach(card => {
      if (card && card.suit && card.rank && suits[card.suit]) {
         suits[card.suit].push(card.rank);
      } else {
         console.warn("Skipping invalid card object in formatHandPBN:", card);
      }
    });
    // Join ranks within each suit, handle empty suits with '-'
    const spades = suits.S.join('') || '-';
    const hearts = suits.H.join('') || '-';
    const diamonds = suits.D.join('') || '-';
    const clubs = suits.C.join('') || '-';
    // Return ranks only, separated by dots
    return `${spades}.${hearts}.${diamonds}.${clubs}`;
  };
 // Removed duplicated RANKS definition and formatHandPBN function

  // Function to generate and download PBN file
  const downloadPbnFile = (deal) => {
    if (!deal) {
      console.error("No deal data provided for PBN download.");
      return;
    }

    // 1. Correctly access hand data using property names like 'northHand', 'eastHand' etc.
    const handData = {
        N: deal.northHand,
        E: deal.eastHand,
        S: deal.southHand,
        W: deal.westHand
    };

    // 2. Format all hands first
    const formattedHands = {
        N: formatHandPBN(handData.N),
        E: formatHandPBN(handData.E),
        S: formatHandPBN(handData.S),
        W: formatHandPBN(handData.W)
    };

    // 3. Construct the PBN Hand String in clockwise order starting from dealer
    const playersClockwise = ['N', 'E', 'S', 'W'];
    const dealerIndex = playersClockwise.indexOf(deal.dealer);
    const hand1 = formattedHands[playersClockwise[dealerIndex]];
    const hand2 = formattedHands[playersClockwise[(dealerIndex + 1) % 4]];
    const hand3 = formattedHands[playersClockwise[(dealerIndex + 2) % 4]];
    const hand4 = formattedHands[playersClockwise[(dealerIndex + 3) % 4]];

    const pbnHandsString = `[Deal "${deal.dealer}:${hand1} ${hand2} ${hand3} ${hand4}"]`;

    // 3. Add other relevant PBN tags (optional but good practice)
    const dealerPBN = deal.dealer || 'N'; // Default dealer if missing
    const vulMapPBN = { 'None': 'None', 'NS': 'NS', 'EW': 'EW', 'Both': 'All' }; // PBN vulnerability names
    const vulPBN = vulMapPBN[deal.vulnerability] || 'None';
    const pbnHeader = `[Dealer "${dealerPBN}"]\n[Vulnerable "${vulPBN}"]\n`;

    // 4. Combine into full PBN content
    const pbnContent = `${pbnHeader}${pbnHandsString}\n`;
    // console.log("Generated PBN Content:", pbnContent); // Remove log
 
    // 5. Create and trigger download link
    const element = document.createElement("a");
    const file = new Blob([pbnContent], {type: 'application/vnd.bridge-pbn'});
    element.href = URL.createObjectURL(file);
    element.download = `deal-${deal.id}.pbn`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Function to handle deleting a saved deal
  const handleDeleteDeal = async (dealId) => {
    if (!dealId) {
      console.error("No deal ID provided for deletion.");
      return;
    }
    // Optional: Confirm deletion with the user
    if (!window.confirm("Are you sure you want to delete this saved deal?")) {
      return;
    }

    console.log("Attempting to delete deal:", dealId);
    try {
      const dealDocRef = doc(firestore, "savedDeals", dealId);
      await deleteDoc(dealDocRef);
      console.log("Deal deleted successfully:", dealId);
      // Refresh the list of deals after deletion
      setSavedDeals(prevDeals => prevDeals.filter(deal => deal.id !== dealId));
      alert("Deal deleted.");
    } catch (err) {
      console.error("Error deleting deal:", err);
      alert("Failed to delete deal.");
    }
  };

  return (
    <div className="saved-deals-container">
      <h1>Saved Deals</h1>
      {loading && <p>Loading deals...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <ul className="deals-list">
          {savedDeals.length === 0 ? (
            <p>No deals saved yet.</p>
          ) : (
            savedDeals.map(deal => (
              <li key={deal.id} className="deal-item">
                <span>
                  Saved: {formatTimestamp(deal.createdAt)} |
                  Dealer: {deal.dealer} |
                  Vul: {deal.vulnerability}
                </span>
                {/* In a later step, this could link to the solver page */}
                <button onClick={() => downloadPbnFile(deal)} className="btn analyze-btn" style={{ marginRight: '10px' }}>
                  Download PBN
                </button>
                <button onClick={() => handleDeleteDeal(deal.id)} className="btn delete-btn">
                  Delete
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default SavedDealsPage;