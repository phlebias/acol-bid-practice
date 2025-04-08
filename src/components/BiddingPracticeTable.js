import React, { useState, useEffect, useCallback } from 'react';
import Draggable from 'react-draggable'; // Import Draggable
import { collection, addDoc, serverTimestamp, query, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { firestore } from '../firebase.js'; // Add .js extension
import './BiddingPracticeTable.css';
import {
    // Constants
    RANKS, // Exported from bridgeUtils
    MAJORS,
    DENOMINATIONS,
    playersOrder, // Exported from bridgeUtils
    SUITS, // Exported from bridgeUtils
    calculateHCP, // Exported from bridgeUtils
    getSuitLengths, // Exported from bridgeUtils
    isHandBalanced, // Exported from bridgeUtils
    findBidIndexBy,
    isBidHigher,
    getLastActualBidData,
    undoLastBid,
    isValidBid
} from '../utils/bridgeUtils.js'; // Import constants and utils from bridgeUtils
import { getComputerBid } from '../utils/biddingLogic.js';

// --- Constants (Component Specific) ---
const suitSymbols = { S: '♠', H: '♥', D: '♦', C: '♣' };
const suitColors = { S: 'black', H: 'red', D: 'red', C: 'black' };

// --- Helper Functions ---

// Deck creation/shuffling/dealing helpers
const createDeck = () => {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
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
        hands[playersOrder[i % 4]].push(deck[i]);
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

// Helper function to determine card style class
function getCardStyle(bid) {
  if (!bid) return ''; // Handle potential undefined bids
  if (bid === 'Pass') return 'pass';
  if (bid === 'X') return 'double';
  if (bid === 'XX') return 'redouble';
  if (bid.includes('H') || bid.includes('D')) return 'red-suit';
  if (bid.includes('S') || bid.includes('C')) return 'black-suit';
  return ''; // Default for NT
}

// --- Component ---
function BiddingPracticeTable() {
    // State declarations
    const [hands, setHands] = useState({ N: [], E: [], S: [], W: [] });
    const [dealer, setDealer] = useState('N');
    const [vulnerability, setVulnerability] = useState('None');
    const [auction, setAuction] = useState([]);
    const [nextBidder, setNextBidder] = useState('N');
    const [isAuctionOver, setIsAuctionOver] = useState(false);
    const [userPosition, setUserPosition] = useState('S');
    const [showIssueForm, setShowIssueForm] = useState(false);
    const [issueDescription, setIssueDescription] = useState('');
    const [showIssuesList, setShowIssuesList] = useState(false);
    const [reportedIssues, setReportedIssues] = useState([]);
    const [bidError, setBidError] = useState('');

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
        setBidError(''); // Clear any previous error/completion messages
        console.clear();
        console.log(`--- New Deal --- Dealer: ${randomDealer}, Vulnerability: ${randomVulnerability}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Keep empty deps if createDeck, shuffleDeck, dealHands are stable refs (defined outside)

    // handleBid needs useCallback because it's in useEffect dependency array
    const handleBid = useCallback((bid) => {
        setBidError('');
        
        if (isAuctionOver) {
            setBidError("Auction is over. Start a new deal.");
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
            setBidError("Internal error: Auction data is invalid. Please start a new deal.");
            return;
        }

        // Full validation using imported isValidBid logic
        if (!isValidBid(bid, auction, nextBidder)) {
            const lastActualBidData = getLastActualBidData(auction);
            const lastActualBid = lastActualBidData?.bid;

            if (!['Pass', 'X', 'XX'].includes(bid) && !isBidHigher(bid, auction)) {
                setBidError(`Insufficient bid: ${bid} is not higher than ${lastActualBid || 'the start'}.`);
            } else if (bid === 'X') {
                if (!lastActualBidData || ['Pass', 'X', 'XX'].includes(lastActualBid)) {
                    setBidError("Invalid Double (X): Must double an opponent's contract bid.");
                } else {
                    const bidderIndex = playersOrder.indexOf(nextBidder);
                    const lastBidderIndex = playersOrder.indexOf(lastActualBidData.bidder);
                    if (bidderIndex !== -1 && lastBidderIndex !== -1 && (bidderIndex % 2) === (lastBidderIndex % 2)) {
                        setBidError("Invalid Double (X): Cannot double partner's bid.");
                    } else {
                        setBidError("Invalid Double (X): Not allowed at this point.");
                    }
                }
            } else if (bid === 'XX') {
                const lastBidData = auction[auction.length - 1];
                if (!lastBidData || lastBidData.bid !== 'X') {
                    setBidError("Invalid Redouble (XX): Must redouble an opponent's Double (X).");
                } else {
                    const bidderIndex = playersOrder.indexOf(nextBidder);
                    const lastDoublerIndex = playersOrder.indexOf(lastBidData.bidder);
                    if (bidderIndex !== -1 && lastDoublerIndex !== -1 && (bidderIndex % 2) === (lastDoublerIndex % 2)) {
                        setBidError("Invalid Redouble (XX): Cannot redouble partner's Double (X).");
                    } else {
                        setBidError("Invalid Redouble (XX): Not allowed at this point.");
                    }
                }
            } else {
                setBidError(`Invalid bid: ${bid}`);
            }
            return;
        }

        // Log and update state
        console.log(`Player ${nextBidder} bids: ${bid}`);
        const newBid = { bidder: nextBidder, bid: bid };
        const newAuction = [...auction, newBid];
        setAuction(newAuction);

        // Determine next bidder
        const currentBidderIndex = playersOrder.indexOf(nextBidder);
        const nextBidderIndex = (currentBidderIndex + 1) % 4;
        const nextPlayer = playersOrder[nextBidderIndex];

        // Check for auction end
        let auctionHasEnded = false;
        const auctionLength = newAuction.length;

        // Check for end condition: 3 consecutive passes after any bid/X/XX, or 4 initial passes
        if (auctionLength >= 3) {
            const lastThreeBids = newAuction.slice(-3).map(item => item?.bid);
            if (lastThreeBids.every(b => b === 'Pass')) {
                // Check if there was a non-Pass bid before the last three passes
                const hasActualBidBeforePasses = auctionLength >= 4 && newAuction[auctionLength - 4]?.bid !== 'Pass';
                // Check if it's exactly four passes total
                const isFourInitialPasses = auctionLength === 4 && newAuction.every(b => b?.bid === 'Pass');

                if (hasActualBidBeforePasses || isFourInitialPasses) {
                    auctionHasEnded = true;
                    // Set the completion message later, after the auctionHasEnded check
                }
            }
        }

        // Set appropriate message if auction ended
        if (auctionHasEnded) {
             const contract = getLastActualBidData(newAuction); // Find the last actual bid
             if (contract) {
                 setBidError(`Auction complete! Final contract: ${contract.bid} by ${contract.bidder}`);
             } else {
                 setBidError('Auction complete! All Pass.'); // Should only happen if 4 initial passes
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
            setIssueDescription(''); // Clear the description
            setShowIssueForm(false); // Hide the form
        } catch (e) {
            console.error("Error reporting bidding issue: ", e);
            alert("Error reporting bidding issue.");
        }
    };

    const fetchReportedIssues = async () => {
        try {
            const issuesQuery = query(
                collection(firestore, "bidding_issues"),
                orderBy("reportedAt", "desc")
            );
            const querySnapshot = await getDocs(issuesQuery);
            const issues = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setReportedIssues(issues);
            setShowIssuesList(true);
        } catch (e) {
            console.error("Error fetching reported issues:", e);
            alert("Error fetching reported issues.");
        }
    };

    const handleDeleteIssue = async (issueId) => {
        try {
            await deleteDoc(doc(firestore, "bidding_issues", issueId));
            setReportedIssues(reportedIssues.filter(issue => issue.id !== issueId));
            alert("Issue deleted successfully!");
        } catch (e) {
            console.error("Error deleting issue:", e);
            alert("Error deleting issue.");
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

    // Updated handleRebid to restart the auction for the current deal
    const handleRebid = useCallback(() => {
        console.log("--- Restarting Auction for current deal ---");
        setBidError(''); // Clear any previous errors/completion messages
        setAuction([]); // Reset the auction sequence
        setIsAuctionOver(false); // Ensure auction is marked as active
        setNextBidder(dealer); // Set the next bidder back to the original dealer
        console.log(`Auction reset. Dealer: ${dealer}, Next Bidder: ${dealer}`);
    }, [dealer]); // Dependency is now only 'dealer'

    // --- Rendering Logic ---
    const isVisible = (position) => {
        if (userPosition === 'All') return true;
        return userPosition === position;
    };

    const isYourTurn = !isAuctionOver && (userPosition === 'All' || userPosition === nextBidder);

    // --- Return JSX ---
    return (
        <div className="bidding-practice-container">
            <div className="header">
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
            </div>
            {/* Rebid button moved to bidding-hub */}

            <Draggable handle=".draggable-handle">
                <div className="instructions">
                    <p><strong className="draggable-handle">Instructions:</strong> Select your position (N, E, S, W) or 'Show All'. Click 'New Deal' to start.
                    If it's your turn, enter your bid (e.g., '1S', 'Pass', 'X', 'XX') in the input box and press Enter or click 'Bid'.
                    The computer will bid for the other positions. Use 'Save Deal' to store the current deal and auction.</p>
                </div>
            </Draggable>
 
 
 
            <div className="table-and-bidding-container">
                <div className="bridge-table">
                    <Draggable>
                        <div className="hand north draggable-handle"> {/* Added draggable-handle class */}
                            {renderHand(hands.N, 'N', isVisible('N'))}
                            {isVisible('N') && (
                                <div className="hcp-display">
                                    <span>♠♥♦♣</span>
                                    <span>{calculateHCP(hands.N)} HCP</span>
                                </div>
                            )}
                        </div>
                    </Draggable>
                    <Draggable>
                        <div className="hand west draggable-handle"> {/* Added draggable-handle class */}
                            {renderHand(hands.W, 'W', isVisible('W'))}
                            {isVisible('W') && (
                                <div className="hcp-display">
                                    <span>♠♥♦♣</span>
                                    <span>{calculateHCP(hands.W)} HCP</span>
                                </div>
                            )}
                        </div>
                    </Draggable>
                    <div className="table-center">
                        <div className="center-labels">
                            <div>Vulnerability: {vulnerability}</div>
                            <div>Dealer: {dealer}</div>
                        </div>
                        {/* Removed old bidding history table */}
                    </div>
                    <Draggable>
                        <div className="hand east draggable-handle"> {/* Added draggable-handle class */}
                            {renderHand(hands.E, 'E', isVisible('E'))}
                            {isVisible('E') && (
                                <div className="hcp-display">
                                    <span>♠♥♦♣</span>
                                    <span>{calculateHCP(hands.E)} HCP</span>
                                </div>
                            )}
                        </div>
                    </Draggable>
                    <Draggable>
                        <div className="hand south draggable-handle"> {/* Added draggable-handle class */}
                            {renderHand(hands.S, 'S', isVisible('S'))}
                            {isVisible('S') && (
                                <div className="hcp-display">
                                    <span>♠♥♦♣</span>
                                    <span>{calculateHCP(hands.S)} HCP</span>
                                </div>
                            )}
                        </div>
                    </Draggable>

                    {/* Bidding Card Areas */}
                    <div className="bidding-card-area bidding-card-area-N">
                      {auction
                        .filter(bidInfo => bidInfo.bidder === 'N')
                        .map((bidInfo, index) => (
                          <div key={`N-${index}`} className={`bidding-card ${getCardStyle(bidInfo.bid)}`}>
                            {bidInfo.bid}
                          </div>
                        ))}
                    </div>
                    <div className="bidding-card-area bidding-card-area-E">
                      {auction
                        .filter(bidInfo => bidInfo.bidder === 'E')
                        .map((bidInfo, index) => (
                          <div key={`E-${index}`} className={`bidding-card ${getCardStyle(bidInfo.bid)}`}>
                            {bidInfo.bid}
                          </div>
                        ))}
                    </div>
                    <div className="bidding-card-area bidding-card-area-S">
                      {auction
                        .filter(bidInfo => bidInfo.bidder === 'S')
                        .map((bidInfo, index) => (
                          <div key={`S-${index}`} className={`bidding-card ${getCardStyle(bidInfo.bid)}`}>
                            {bidInfo.bid}
                          </div>
                        ))}
                    </div>
                    <div className="bidding-card-area bidding-card-area-W">
                      {auction
                        .filter(bidInfo => bidInfo.bidder === 'W')
                        .map((bidInfo, index) => (
                          <div key={`W-${index}`} className={`bidding-card ${getCardStyle(bidInfo.bid)}`}>
                            {bidInfo.bid}
                          </div>
                        ))}
                    </div>
                </div>

                <Draggable defaultPosition={{x: -250, y: 125}}>
                    <div className="bidding-box draggable-handle"> {/* Added handle class */}
                        <div className="next-bidder">
                            Next to Bid: <strong>{nextBidder}</strong>
                        </div>
                        {bidError && <div className="bid-error">{bidError}</div>}
                        
                        <div className="bid-buttons">
                            <button onClick={() => handleBid('Pass')} disabled={!isYourTurn} className="pass-btn">Pass</button>
                            <button onClick={() => handleBid('X')} disabled={!isYourTurn} className="double-btn">X</button>
                            <button onClick={() => handleBid('XX')} disabled={!isYourTurn} className="redouble-btn">XX</button>
                        </div>

                        <div className="bid-grid">
                            {[1,2,3,4,5,6,7].map(level => (
                                <React.Fragment key={level}>
                                    <button onClick={() => handleBid(`${level}C`)} disabled={!isYourTurn} className="bid-button">{level}♣</button>
                                    <button onClick={() => handleBid(`${level}D`)} disabled={!isYourTurn} className="bid-button red">{level}♦</button>
                                    <button onClick={() => handleBid(`${level}H`)} disabled={!isYourTurn} className="bid-button red">{level}♥</button>
                                    <button onClick={() => handleBid(`${level}S`)} disabled={!isYourTurn} className="bid-button">{level}♠</button>
                                    <button onClick={() => handleBid(`${level}NT`)} disabled={!isYourTurn} className="bid-button">{level}NT</button>
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Rebid Button - Moved inside bidding-box */}
                        <button
                            className="rebid-btn"
                            onClick={handleRebid}
                            disabled={auction.length === 0} // Disable only if auction hasn't started
                            title="Undo your last bid and subsequent bids"
                        >
                            Rebid
                        </button>

                    </div>
                </Draggable>


        </div> {/* Closes the first .table-and-bidding-container from line 426 */}

        {/* Issue Management Area - Moved outside the grid container and made draggable */}
        <Draggable>
            <div className="issue-management-area draggable-handle"> {/* Added draggable-handle class */}
                {showIssueForm && (
                    <div className="issue-report-form">
                        <textarea
                            value={issueDescription}
                            onChange={(e) => setIssueDescription(e.target.value)}
                            placeholder="Describe any issues with the bidding or game..."
                        />
                        <button onClick={submitIssueReport}>
                            Submit Report
                        </button>
                    </div>
                )}

                <div className="issue-buttons">
                    <button
                        className="report-issue-btn"
                        onClick={() => setShowIssueForm(true)}
                        style={{ marginTop: '20px' }}
                    >
                        Report Issue
                    </button>
                    <button
                        className="view-issues-btn"
                        onClick={fetchReportedIssues}
                        style={{ marginTop: '20px' }}
                    >
                        View Issues
                    </button>
                </div>

                {/* Modal trigger area ends here */}
            </div>
        </Draggable>

        {/* Issues List Modal - Moved outside the Draggable wrapper */}
        {showIssuesList && (
            <div className="modal-overlay">
                <div className="modal">
                    <h2>Reported Issues</h2>
                    <div className="issues-list">
                        {reportedIssues.length === 0 ? (
                            <p>No issues reported yet.</p>
                        ) : (
                            reportedIssues.map(issue => (
                                <div key={issue.id} className="issue-card">
                                    <p><strong>Description:</strong> {issue.issueDescription}</p>
                                    <p><strong>Dealer:</strong> {issue.dealer}</p>
                                    <p><strong>Vulnerability:</strong> {issue.vulnerability}</p>
                                    <p><strong>Auction:</strong></p>
                                    <div className="auction-sequence">
                                        {issue.auction.map((bid, index) => (
                                            <span key={index}>{bid.bidder}: {bid.bid}, </span>
                                        ))}
                                    </div>
                                    <button onClick={() => handleDeleteIssue(issue.id)} className="delete-btn">
                                        Delete Issue
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    <button onClick={() => setShowIssuesList(false)} className="close-btn">
                        Close
                    </button>
                </div>
            </div>
        )}
            <Draggable handle=".draggable-handle">
                <div className="instructions">
                    <p><strong className="draggable-handle">Using Bridge Solver Online:</strong></p>
                    <p>Bridge Solver Online is a free interactive bridge hand analyser that uses Bo Haglund’s well-known double dummy solver module.</p>
                    <p>To analyse a deal using Bridge Solver Online, follow these steps:</p>
                    <ol>
                        <li>Click "Save Deal" – This saves the current bridge deal.</li>
                        <li>Click "Saved Deals" – This opens a list of all your saved deals.</li>
                        <li>Download the Deal File – Choose the deal you want to analyse and download it to your computer.</li>
                        <li>Click "Solver" – This opens a link to Bridge Solver Online in a new tab.</li>
                    </ol>
                    <p><strong>On the Bridge Solver Online Website:</strong></p>
                    <ol>
                        <li>Click "Start Bridge Solver Online"</li>
                        <li>Upload the File – Use the upload button to select the file you downloaded from your website.</li>
                        <li>Analyse the Deal – The deal will load and you can now use the built-in tools to explore optimal play and contract results.</li>
                    </ol>
                </div>
            </Draggable>
    </div> /* Closes the main .bidding-practice-container from line 406 */
    );
};

export default BiddingPracticeTable;