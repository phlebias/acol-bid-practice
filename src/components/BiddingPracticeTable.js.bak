import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../firebase';
import './BiddingPracticeTable.css';
import {
    // Constants
    SUITS,
    RANKS,
    playersOrder,
    // Bidding Logic Functions
    calculateHCP,
    getComputerBid,
    isValidBid,
    isBidHigher,
    getLastActualBidData
    // Other helpers like calculateLengthPoints, hasStopper etc. are used internally by the bidding logic
} from '../utils/biddingLogic'; // Adjust path if needed

// --- Constants (Component Specific) ---
const suitSymbols = { S: '♠', H: '♥', D: '♦', C: '♣' };
const suitColors = { S: 'black', H: 'red', D: 'red', C: 'black' };

// --- Helper Functions (Component Specific or Deck/Deal related) ---

// Deck creation/shuffling/dealing helpers (Could also be moved to utils if preferred)
const createDeck = () => {
    const deck = [];
    for (const suit of SUITS) { // Use imported SUITS
        for (const rank of RANKS) { // Use imported RANKS
            deck.push({ suit, rank });
        }
    }
    return deck;
};

const shuffleDeck = (deck) => {
    let currentIndex = deck.length, randomIndex;
    const shuffledDeck = [...deck];
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [shuffledDeck[currentIndex], shuffledDeck[randomIndex]] = [
            shuffledDeck[randomIndex], shuffledDeck[currentIndex]];
    }
    return shuffledDeck;
};

const dealHands = (deck) => {
    const hands = { N: [], E: [], S: [], W: [] };
    for (let i = 0; i < deck.length; i++) {
        hands[playersOrder[i % 4]].push(deck[i]); // Use imported playersOrder
    }
    for (const player of playersOrder) { // Use imported playersOrder
        if (hands[player]) {
            hands[player].sort((a, b) => {
                const suitIndexA = SUITS.indexOf(a.suit); // Use imported SUITS
                const suitIndexB = SUITS.indexOf(b.suit); // Use imported SUITS
                if (suitIndexA !== suitIndexB) {
                    return suitIndexA - suitIndexB;
                }
                return RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank); // Use imported RANKS
            });
        }
    }
    return hands;
};

// Rendering helper (Stays in component)
const renderHand = (hand, position, isVisible) => {
    if (!hand || !Array.isArray(hand)) {
        return <div className="hand error">Invalid hand data for {position}</div>;
    }
    if (!isVisible) {
        return <div className="hand hidden">{position}: Hidden</div>;
    }

    const sortedHand = [...hand].sort((a, b) => {
          const suitIndexA = SUITS.indexOf(a.suit); // Use imported SUITS
          const suitIndexB = SUITS.indexOf(b.suit); // Use imported SUITS
          if (suitIndexA !== suitIndexB) {
              return suitIndexA - suitIndexB;
          }
          return RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank); // Use imported RANKS
      });

    const suits = { S: [], H: [], D: [], C: [] };
    sortedHand.forEach(card => {
        if (card && card.suit && suits[card.suit]) {
            suits[card.suit].push(card.rank);
        }
    });

  return (
    <div>
      <div className="position-label">{position}</div>
      <div className="hand">
        {SUITS.map(suit => { // Use imported SUITS
          const cardsInSuit = suits[suit];
          const ranks = cardsInSuit.length > 0 ? cardsInSuit.join('') : '-';
          return (
            <div key={suit} className="suit" style={{ color: suitColors[suit] }}>
              <span className="suit-symbol">{suitSymbols[suit]}</span>
              <span className="ranks">{ranks}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- Component ---
function BiddingPracticeTable() {
    // State
    const [hands, setHands] = useState({ N: [], E: [], S: [], W: [] });
    const [dealer, setDealer] = useState('N');
    const [vulnerability, setVulnerability] = useState('None');
    const [auction, setAuction] = useState([]);
    const [nextBidder, setNextBidder] = useState('N');
    const [isAuctionOver, setIsAuctionOver] = useState(false);
    const [userPosition, setUserPosition] = useState('S');
    const [showIssueForm, setShowIssueForm] = useState(false);
    const [issueDescription, setIssueDescription] = useState('');

    // --- Game Flow & State Management ---

    // generateNewDeal can stay as useCallback or be a regular function if deps are stable
    // Note: It now uses imported playersOrder
    const generateNewDeal = useCallback((isInitial = false) => {
        const deck = createDeck();
        const shuffled = shuffleDeck(deck);
        const dealtHands = dealHands(shuffled);
        setHands(dealtHands);

        const vulnerabilities = ['None', 'NS', 'EW', 'Both'];
        const randomDealerIndex = Math.floor(Math.random() * playersOrder.length);
        const randomDealer = playersOrder[randomDealerIndex];
        const randomVulnerability = vulnerabilities[Math.floor(Math.random() * vulnerabilities.length)];

        setDealer(randomDealer);
        setVulnerability(randomVulnerability);
        setNextBidder(randomDealer);
        setAuction([]);
        setIsAuctionOver(false);
        console.clear();
        console.log(`--- New Deal --- Dealer: ${randomDealer}, Vulnerability: ${randomVulnerability}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Keep empty deps if createDeck, shuffleDeck, dealHands are stable refs (defined outside)

    // handleBid needs useCallback because it's in useEffect dependency array
    const handleBid = useCallback((bid) => {
         if (isAuctionOver) {
             alert("Auction is over. Start a new deal.");
             return;
         }
        // Basic input validation
        if (typeof bid !== 'string' || bid.trim() === '') {
            console.error(`Invalid bid received in handleBid: ${bid}. Defaulting to Pass.`);
            bid = 'Pass';
        }

        // Ensure auction is an array before proceeding
        if (!Array.isArray(auction)) {
            console.error("handleBid called with non-array auction:", auction);
            alert("Internal error: Auction data is invalid. Please start a new deal.");
            return;
        }

        // Full validation using imported isValidBid logic
        if (!isValidBid(bid, auction, nextBidder)) {
             // Provide more specific feedback based on why it's invalid
             const lastActualBidData = getLastActualBidData(auction); // Use imported helper
             const lastActualBid = lastActualBidData?.bid;
             if (!['Pass', 'X', 'XX'].includes(bid) && !isBidHigher(bid, auction)) { // Use imported helper
                 alert(`Insufficient bid: ${bid} is not higher than ${lastActualBid || 'the start'}.`);
             } else if (bid === 'X') {
                 if (!lastActualBidData || ['Pass', 'X', 'XX'].includes(lastActualBid)) {
                    alert("Invalid Double (X): Must double an opponent's contract bid.");
                 } else {
                    // Check partnership using imported playersOrder
                    const bidderIndex = playersOrder.indexOf(nextBidder);
                    const lastBidderIndex = playersOrder.indexOf(lastActualBidData.bidder);
                    if (bidderIndex !== -1 && lastBidderIndex !== -1 && (bidderIndex % 2) === (lastBidderIndex % 2)) {
                        alert("Invalid Double (X): Cannot double partner's bid.");
                    } else {
                         alert("Invalid Double (X): General error."); // Fallback if specific check failed
                    }
                 }
             } else if (bid === 'XX') {
                 const lastBidData = auction[auction.length - 1];
                 if (!lastBidData || lastBidData.bid !== 'X') {
                     alert("Invalid Redouble (XX): Must redouble an opponent's Double (X).");
                 } else {
                    // Check partnership using imported playersOrder
                    const bidderIndex = playersOrder.indexOf(nextBidder);
                    const lastDoublerIndex = playersOrder.indexOf(lastBidData.bidder);
                    if (bidderIndex !== -1 && lastDoublerIndex !== -1 && (bidderIndex % 2) === (lastDoublerIndex % 2)) {
                        alert("Invalid Redouble (XX): Cannot redouble partner's Double (X).");
                    } else {
                        alert("Invalid Redouble (XX): General error."); // Fallback
                    }
                 }
             } else {
                 alert(`Invalid bid: ${bid}`); // Generic fallback
             }
             return; // Stop processing invalid bid
        }
        // --- End Validation ---

        // Log and update state
        console.log(`Player ${nextBidder} bids: ${bid}`);
        const newAuctionEntry = { bidder: nextBidder, bid: bid };
        const newAuction = [...auction, newAuctionEntry];
        setAuction(newAuction); // Update state

        // Determine next bidder using imported playersOrder
        const currentBidderIndex = playersOrder.indexOf(nextBidder);
        const nextBidderIndex = (currentBidderIndex + 1) % 4;
        const nextPlayer = playersOrder[nextBidderIndex];

        // Check for auction end
        let auctionHasEnded = false;
        if (newAuction.length >= 4) {
            const lastFourBids = newAuction.slice(-4).map(item => item?.bid);
             if (lastFourBids.every(b => b === 'Pass')) {
                 auctionHasEnded = true;
                 console.log("Auction ended - all passed.");
             } else if (lastFourBids.length === 4 && lastFourBids.slice(1).every(b => b === 'Pass') && !['Pass', 'X', 'XX'].includes(lastFourBids[0])) {
                  auctionHasEnded = true;
                  console.log("Auction ended - bid followed by 3 passes.");
             } else if (lastFourBids.length === 4 && lastFourBids.slice(1).every(b => b === 'Pass') && ['X','XX'].includes(lastFourBids[0])) {
                  auctionHasEnded = true;
                   console.log("Auction ended - double/redouble followed by 3 passes.");
             }
        }


        if (auctionHasEnded) {
            setIsAuctionOver(true);
            setNextBidder('-');
        } else {
            setNextBidder(nextPlayer);
        }

        // --- Firebase Logging ---
        /*
        try {
            addDoc(collection(firestore, 'biddingSessions', 'session_id_example', 'deals'), {
                hands: hands,
                dealer: dealer,
                vulnerability: vulnerability,
                auction: newAuction,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error adding document to Firestore: ", error);
        }
        */

    }, [auction, nextBidder, isAuctionOver]); // Dependencies for useCallback

    // Effect for initial deal
    useEffect(() => {
        generateNewDeal(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // generateNewDeal is stable

     // Effect to handle computer's turn
     useEffect(() => {
         const isComputerTurn = !isAuctionOver && userPosition !== 'All' && userPosition !== nextBidder;

         if (isComputerTurn) {
             const timer = setTimeout(() => {
                  console.log(`--- Computer (${nextBidder}) is thinking... ---`);
                  // Call the imported getComputerBid function
                  const computerBid = getComputerBid(
                      hands,
                      nextBidder,
                      isAuctionOver,
                      auction,
                      dealer,
                      vulnerability
                  );
                  // Check if component might have unmounted or state changed during timeout
                  if (!isAuctionOver && nextBidder !== userPosition) {
                     handleBid(computerBid);
                  }
             }, 1000);

             return () => clearTimeout(timer);
         }
     // Add all dependencies used inside the effect, including handleBid
     }, [nextBidder, isAuctionOver, userPosition, hands, auction, dealer, vulnerability, handleBid]);

    const handleReportIssue = async () => {
        const issueData = {
            northHand: hands.N,
            eastHand: hands.E,
            southHand: hands.S,
            westHand: hands.W,
            dealer: dealer,
            vulnerability: vulnerability,
            auction: auction,
            issueDescription: issueDescription,
            reportedAt: serverTimestamp()
        };
        try {
            if (!firestore) {
                console.error("Firestore instance is not available.");
                alert("Error reporting issue: Firestore not initialized.");
                return;
            }
            const docRef = await addDoc(collection(firestore, "bidding_issues"), issueData);
            console.log("Bidding issue reported with ID: ", docRef.id);
            alert("Bidding issue reported successfully!");
        } catch (e) {
            console.error("Error reporting bidding issue: ", e);
            alert("Error reporting bidding issue.");
        }
    };

    const submitIssueReport = () => {
        handleReportIssue();
        setShowIssueForm(false);
    };

    const handleSaveDeal = async () => {
        const dealData = {
            northHand: hands.N,
            eastHand: hands.E,
            southHand: hands.S,
            westHand: hands.W,
            dealer: dealer,
            vulnerability: vulnerability,
            auction: auction,
            createdAt: serverTimestamp()
        };
        try {
            const docRef = await addDoc(collection(firestore, "savedDeals"), dealData);
            console.log("Deal saved with ID: ", docRef.id);
            alert("Deal saved successfully!");
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Error saving deal.");
        }
    };

    const getAssessment = (points) => {
        if (points >= 20) return "Very Strong Hand (Consider 2C opening)";
        if (points >= 15) return "Strong Opening Hand (15-19)";
        if (points >= 12) return "Opening Hand (12-14)";
        if (points >= 8) return "Invitational Hand";
        if (points >= 6) return "Responding Hand";
        return "Weak Hand";
    };

    // --- Rendering Logic ---
    const isVisible = (position) => {
        if (userPosition === 'All') return true;
        return userPosition === position;
    };

    const isYourTurn = !isAuctionOver && (userPosition === 'All' || userPosition === nextBidder);

    // --- Return JSX ---
    return (
        <div className="bidding-practice-container">
            <nav className="header">
                <a href="/">Home</a>
                <a href="/saved-deals">Saved Deals</a>
                <a href="/solver">Solver</a>
                <button className="logout-btn">Logout</button>
            </nav>

            <h1>Bridge Bidding Practice</h1>

            <div className="controls">
                <button className="new-deal-btn" onClick={() => generateNewDeal(false)}>New Deal</button>
                <div className="position-selector">
                    Your Position: 
                    <select value={userPosition} onChange={(e) => setUserPosition(e.target.value)}>
                        <option value="N">North</option>
                        <option value="E">East</option>
                        <option value="S">South</option>
                        <option value="W">West</option>
                        <option value="All">Show All</option>
                    </select>
                </div>
                <button className="save-deal-btn" onClick={handleSaveDeal}>Save Deal</button>
            </div>

            <div className="table-and-bidding-container">
                <div className="bridge-table">
                    <div className="hand north">
                        {renderHand(hands.N, 'N', isVisible('N'))}
                        {isVisible('N') && <div>HCP: {calculateHCP(hands.N)}</div>}
                    </div>
                    <div className="hand west">
                        {renderHand(hands.W, 'W', isVisible('W'))}
                        {isVisible('W') && <div>HCP: {calculateHCP(hands.W)}</div>}
                    </div>
                    <div className="table-center">
                        <div>Vul: {vulnerability}</div>
                        <div>Dealer: {dealer}</div>
                    </div>
                    <div className="hand east">
                        {renderHand(hands.E, 'E', isVisible('E'))}
                        {isVisible('E') && <div>HCP: {calculateHCP(hands.E)}</div>}
                    </div>
                    <div className="hand south">
                        {renderHand(hands.S, 'S', isVisible('S'))}
                        {isVisible('S') && <div>HCP: {calculateHCP(hands.S)}</div>}
                    </div>
                </div>

                <div className="bidding-box">
                    <div className="auction-display">
                        <div className="auction-header">
                            <div>N</div>
                            <div>E</div>
                            <div>S</div>
                            <div>W</div>
                        </div>
                        <div className="auction-row">
                            {/* Add empty cells for positions before dealer */}
                            {[...Array(playersOrder.indexOf(dealer))].map((_, i) => (
                                <div key={`empty-${i}`} className="auction-cell empty"></div>
                            ))}
                            {/* Show the auction */}
                            {auction.map((bid, index) => (
                                <div key={index} className={`auction-cell ${
                                    bid.bid === 'Pass' ? 'pass' :
                                    bid.bid === 'X' ? 'double' :
                                    bid.bid === 'XX' ? 'redouble' :
                                    bid.bid.includes('♦') || bid.bid.includes('♥') ? 'red-suit' : ''
                                }`}>
                                    {bid.bid}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="position-buttons">
                        <button className={`position-btn ${nextBidder === 'N' ? 'active' : ''}`}>N</button>
                        <button className={`position-btn ${nextBidder === 'E' ? 'active' : ''}`}>E</button>
                        <button className={`position-btn ${nextBidder === 'S' ? 'active' : ''}`}>S</button>
                        <button className={`position-btn ${nextBidder === 'W' ? 'active' : ''}`}>W</button>
                    </div>

                    <div className="next-bidder">
                        Next to Bid: {nextBidder}
                    </div>

                    <div className="action-buttons">
                        <button 
                            className="bid-button"
                            onClick={() => handleBid('Pass')}
                            disabled={!isYourTurn}
                        >
                            Pass
                        </button>
                        <button 
                            className="bid-button"
                            onClick={() => handleBid('X')}
                            disabled={!isYourTurn}
                        >
                            X
                        </button>
                        <button 
                            className="bid-button"
                            onClick={() => handleBid('XX')}
                            disabled={!isYourTurn}
                        >
                            XX
                        </button>
                    </div>

                    <div className="bid-grid">
                        {[1,2,3,4,5,6,7].map(level => (
                            <React.Fragment key={level}>
                                <button
                                    className="bid-button"
                                    onClick={() => handleBid(`${level}C`)}
                                    disabled={!isYourTurn}
                                >
                                    {level}♣
                                </button>
                                <button
                                    className="bid-button red"
                                    onClick={() => handleBid(`${level}D`)}
                                    disabled={!isYourTurn}
                                >
                                    {level}♦
                                </button>
                                <button
                                    className="bid-button red"
                                    onClick={() => handleBid(`${level}H`)}
                                    disabled={!isYourTurn}
                                >
                                    {level}♥
                                </button>
                                <button
                                    className="bid-button"
                                    onClick={() => handleBid(`${level}S`)}
                                    disabled={!isYourTurn}
                                >
                                    {level}♠
                                </button>
                                <button
                                    className="bid-button"
                                    onClick={() => handleBid(`${level}NT`)}
                                    disabled={!isYourTurn}
                                >
                                    {level}NT
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            <button className="report-issue-btn" onClick={() => setShowIssueForm(true)}>
                Report Bidding Issue
            </button>
            {showIssueForm && (
                <div className="issue-report-form">
                    <textarea
                        value={issueDescription}
                        onChange={(e) => setIssueDescription(e.target.value)}
                        placeholder="Describe the bidding issue..."
                    />
                    <button onClick={submitIssueReport}>
                        Submit Report
                    </button>
                </div>
            )}

            <div className="hand-assessments">
                {Object.entries(hands).map(([pos, hand]) => (
                    <div key={pos}>
                        {pos}: {getAssessment(calculateHCP(hand))} ({calculateHCP(hand)} HCP)
                    </div>
                ))}
            </div>
        </div>
    );
}

export default BiddingPracticeTable;