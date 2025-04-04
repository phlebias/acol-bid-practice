import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../firebase';
import './BiddingPracticeTable.css';

// --- Constants (Outside Component) ---
const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const suitSymbols = { S: '♠', H: '♥', D: '♦', C: '♣' };
const suitColors = { S: 'black', H: 'red', D: 'red', C: 'black' };
const playersOrder = ['N', 'E', 'S', 'W'];
const denominations = ['C', 'D', 'H', 'S', 'NT']; // Order for ranking

// --- Helper Functions (Outside Component - Pure Functions) ---
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
  const hands = { N: [], E: [], S: [], W: [] }; // Use initials
  for (let i = 0; i < deck.length; i++) {
    hands[playersOrder[i % 4]].push(deck[i]);
  }
  for (const player of playersOrder) {
    if (hands[player]) {
        hands[player].sort((a, b) => {
        if (SUITS.indexOf(a.suit) !== SUITS.indexOf(b.suit)) {
            return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
        }
        return RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank);
        });
    }
  }
  return hands;
};

const calculateHCP = (hand) => {
  if (!hand || !Array.isArray(hand)) return 0;
  let hcp = 0;
  const points = { 'A': 4, 'K': 3, 'Q': 2, 'J': 1 };
  for (const card of hand) {
    if (card && card.rank) {
        hcp += points[card.rank] || 0;
    }
  }
  return hcp;
};

const getBidRank = (bid) => {
  if (!bid || typeof bid !== 'string' || ['Pass', 'X', 'XX'].includes(bid)) {
    return -1;
  }
  const level = parseInt(bid.charAt(0), 10);
  const denom = bid.substring(1);
  const denomIndex = denominations.indexOf(denom);
  if (level < 1 || level > 7 || denomIndex === -1) {
    return -1;
  }
  return (level - 1) * 5 + denomIndex;
};

const displayHand = (hand) => {
  if (!hand || hand.length === 0) return <div style={{ color: '#888' }}>No cards</div>;
  const suits = { S: [], H: [], D: [], C: [] };
  if (Array.isArray(hand)) {
      // Sort within the display function to ensure correct order
      const sortedHand = [...hand].sort((a, b) => {
          const suitIndexA = SUITS.indexOf(a.suit);
          const suitIndexB = SUITS.indexOf(b.suit);
          if (suitIndexA !== suitIndexB) {
              return suitIndexA - suitIndexB;
          }
          return RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank);
      });
      sortedHand.forEach(card => {
        if (card && card.suit && card.rank && suits[card.suit]) {
            suits[card.suit].push(card.rank);
        }
      });
  }

  return (
    <div>
      {SUITS.map(suitKey => {
        const cardsInSuit = suits[suitKey];
        const symbol = suitSymbols[suitKey];
        const color = suitColors[suitKey];
        const ranks = cardsInSuit.length > 0 ? cardsInSuit.join('') : '-';
        return (
          <div key={suitKey} style={{ color: color, marginBottom: '2px' }}>
            {symbol} {ranks}
          </div>
        );
      })}
    </div>
  );
};

const playSound = (soundFile) => {
    try {
      const audio = new Audio(soundFile);
      audio.play().catch(error => console.error("Error playing sound:", error));
    } catch (error) {
      console.error("Error creating audio:", error);
    }
};

// --- Component ---
function BiddingPracticeTable() {
  const [hands, setHands] = useState({ N: [], E: [], S: [], W: [] }); // Use initials
  const [dealer, setDealer] = useState('N');
  const [vulnerability, setVulnerability] = useState('None');
  const [nextBidder, setNextBidder] = useState('N');
  const [auction, setAuction] = useState([]);
  const [isAuctionOver, setIsAuctionOver] = useState(false);
  const [userPosition, setUserPosition] = useState('All'); // Default to seeing all hands

  // --- Memoized Callbacks (Define before useEffect that uses them) ---

  const generateNewDeal = useCallback((isInitial = false) => {
    if (!isInitial) {
      playSound('/sounds/card-shuffle02.mp3');
    }
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    const dealtHands = dealHands(shuffled);
    setHands(dealtHands);

    const vulnerabilities = ['None', 'NS', 'EW', 'Both'];
    const randomDealer = playersOrder[Math.floor(Math.random() * playersOrder.length)];
    const randomVulnerability = vulnerabilities[Math.floor(Math.random() * vulnerabilities.length)];

    setDealer(randomDealer);
    setVulnerability(randomVulnerability);
    setNextBidder(randomDealer);
    setAuction([]);
    setIsAuctionOver(false);
  }, []);

  const isUserTurn = useCallback(() => {
    if (userPosition === 'All') return true; // If user sees all, they can always bid
    if (userPosition === nextBidder) return true;
    return false;
  }, [userPosition, nextBidder]);

  const handleBid = useCallback((bid) => {
    // Safeguard against undefined or non-string bids
    if (typeof bid !== 'string' || bid.trim() === '') {
        console.error(`Invalid bid received in handleBid: ${bid} (type: ${typeof bid}). Defaulting to Pass.`);
        bid = 'Pass'; // Default to Pass to prevent errors
    }

    const lastActualBid = [...auction].reverse().find(
      item => !['Pass', 'X', 'XX'].includes(item.bid)
    );
    const lastActualBidRank = getBidRank(lastActualBid?.bid);
    const newBidRank = getBidRank(bid);

    // --- Bid Validation Logic ---
    // 1. Insufficient Bid Check
    if (!['Pass', 'X', 'XX'].includes(bid) && newBidRank <= lastActualBidRank) {
      alert(`Insufficient bid: ${bid} is not higher than ${lastActualBid?.bid || 'anything'}`);
      return;
    }

    // 2. Double (X) Validation
    if (bid === 'X') {
        const lastBid = auction[auction.length - 1];
        const lastBidder = lastBid?.bidder;
        const partner = playersOrder[(playersOrder.indexOf(nextBidder) + 2) % 4];
        // Can only double if the last bid was by an opponent and was not Pass/X/XX
        if (!lastBid || ['Pass', 'X', 'XX'].includes(lastBid.bid) || lastBidder === partner) {
            alert("Invalid Double (X). Can only double an opponent's contract bid.");
            return;
        }
    }

    // 3. Redouble (XX) Validation
    if (bid === 'XX') {
        const lastBid = auction[auction.length - 1];
        const lastBidder = lastBid?.bidder;
        const partner = playersOrder[(playersOrder.indexOf(nextBidder) + 2) % 4];
        // Can only redouble if the last bid was a Double (X) by an opponent
        if (!lastBid || lastBid.bid !== 'X' || lastBidder === partner) {
            alert("Invalid Redouble (XX). Can only redouble an opponent's Double (X).");
            return;
        }
    }
    // --- End Bid Validation ---


    const newAuction = [...auction, { bidder: nextBidder, bid: bid }];
    setAuction(newAuction);

    const currentBidderIndex = playersOrder.indexOf(nextBidder);
    const nextBidderIndex = (currentBidderIndex + 1) % 4;
    setNextBidder(playersOrder[nextBidderIndex]);

    // Check for end of auction
    if (newAuction.length >= 4) {
      const lastThreeBids = newAuction.slice(-3);
      if (lastThreeBids.every(item => item.bid === 'Pass')) {
        const bidsBeforeLastThree = newAuction.slice(0, -3);
        // Auction ends if last 3 are Pass, AND (either there was a bid before that OR all 4 bids were Pass)
        if (bidsBeforeLastThree.some(item => item.bid !== 'Pass') || newAuction.every(item => item.bid === 'Pass')) {
            setIsAuctionOver(true);
            console.log("Auction ended!");
        }
      }
    }
  }, [auction, nextBidder]); // Dependencies updated

  // Helper to check if a potential bid is valid (higher than last bid)
  // Defined here so it can be used by getComputerBid and helper functions
  const isValidResponse = useCallback((bid) => {
    const lastActualBid = [...auction].reverse().find(item => !['Pass', 'X', 'XX'].includes(item.bid));
    const lastActualBidRank = getBidRank(lastActualBid?.bid);
    // Ensure Pass/X/XX are always valid conceptually; specific rules handled below
    return !bid || ['Pass', 'X', 'XX'].includes(bid) || getBidRank(bid) > lastActualBidRank;
  }, [auction]);

  // Helper function for positive responses to a strong bid
  const determineBestPositiveResponse = useCallback((hand, hcp, suitLengths, balanced) => {
      // Note: This function needs access to isValidResponse, defined above
      let response = 'Pass'; // Default to Pass
      if (hcp >= 7 && suitLengths.S >= 5 && isValidResponse('2S')) response = '2S';
      else if (hcp >= 7 && suitLengths.H >= 5 && isValidResponse('2H')) response = '2H';
      else if (hcp >= 7 && balanced && isValidResponse('2NT')) response = '2NT';
      // Add more positive responses if needed (e.g., 3 level suits)
      // Fallback if no specific positive bid fits, but must bid something over 2C
      else if (isValidResponse('2D')) response = '2D'; // Default positive if nothing else fits

      return response;
  }, [isValidResponse]); // Dependency on isValidResponse

  // Helper function for NT responses
  const determineNTResponse = useCallback((hand, hcp, suitLengths, balanced, ntLevel) => {
      // Note: This function needs access to isValidResponse, defined above
      let response = 'Pass'; // Default response
      const has4CardMajor = suitLengths.H >= 4 || suitLengths.S >= 4;

      // --- Acol Responses to 1NT (12-14) ---
      if (ntLevel === '1NT') {
          // Priority 1: Stayman (Acol: 11+ HCP, at least one 4-card major)
          if (hcp >= 11 && has4CardMajor && isValidResponse('2C')) {
              response = '2C';
          }
          // Priority 2: Game Force Raise (13+ HCP, balanced, no 4-card major suitable for Stayman?) - Check Acol specifics
          else if (hcp >= 13 && balanced && isValidResponse('3NT')) {
              // Typically bid Stayman first if possible, even with game values
              // This 3NT bid assumes no 4-card major or choosing to conceal it.
              response = '3NT';
          }
          // Priority 3: Invitational Raise (11-12 HCP, balanced, NO 4-card major)
          else if (hcp >= 11 && hcp <= 12 && balanced && !has4CardMajor && isValidResponse('2NT')) {
              response = '2NT';
          }
          // TODO: Add Transfers (2D/2H) - Need 5+ card suit (usually takes precedence over Stayman if invitational+)

      }
      // --- Acol Responses to 2NT (20-22) ---
      else if (ntLevel === '2NT') {
          // Priority 1: Stayman (3+ HCP, at least one 4-card major) - Check Acol point req.
          if (hcp >= 3 && has4CardMajor && isValidResponse('3C')) { // 3C is Stayman over 2NT
              response = '3C';
          }
          // Priority 2: Game Force Raise (5+ HCP, balanced, no 4-card major)
          else if (hcp >= 5 && balanced && !has4CardMajor && isValidResponse('3NT')) {
               response = '3NT';
          }
          // TODO: Add Transfers (3D/3H)
      }


      if (response === 'Pass') {
        console.log(`Computer (${nextBidder}) responding to partner's ${ntLevel}. No standard action found, passing.`);
      } else {
        console.log(`Computer (${nextBidder}) responding to partner's ${ntLevel} with ${response}.`);
      }
      return response;
  }, [isValidResponse, nextBidder]); // Added isValidResponse dependency

// Replaced with the new version provided by the user, using the externally defined isValidResponse,
// determineBestPositiveResponse, and determineNTResponse
const getComputerBid = useCallback(() => {
    const computerHand = hands[nextBidder];
    if (!computerHand || !Array.isArray(computerHand) || isAuctionOver) return 'Pass';

    const computerHCP = calculateHCP(computerHand);
    const suitLengths = { S: 0, H: 0, D: 0, C: 0 };
    computerHand.forEach(card => {
        if (card && card.suit) { suitLengths[card.suit]++; }
    });
    const lengths = Object.values(suitLengths);
    const isBalanced = !lengths.includes(0) && !lengths.includes(1) && lengths.filter(l => l === 2).length <= 1;

    // --- Opening Bids ---
    // Check if it's an opening situation (only passes so far)
    if (auction.every(b => b.bid === 'Pass')) {
        console.log(`Computer (${nextBidder}) considering opening bid. HCP: ${computerHCP}, Balanced: ${isBalanced}`);
        let openingBid = 'Pass';

        // Strong 2♣ (Acol: >= 23 points or game force equivalent) - Simplified to >= 20 for now
        if (computerHCP >= 20) {
             // Check for 2NT opening first (Acol 20-22 balanced)
             if (isBalanced && computerHCP <= 22) {
                 openingBid = '2NT';
             } else {
                 openingBid = '2C'; // Default strong opening
             }
        }
        // Strong 2NT (Acol: 20-22 balanced) - Handled above within 2C check
        // else if (isBalanced && computerHCP >= 20 && computerHCP <= 22) {
        //     openingBid = '2NT';
        // }
        // Weak Two Bids (Acol: 6-10 HCP, good 6-card suit)
        else if (computerHCP >= 6 && computerHCP <= 10) {
            if (suitLengths.S >= 6) openingBid = '2S';
            else if (suitLengths.H >= 6) openingBid = '2H';
            // Note: Weak 2D is less common in standard Acol, often conventional
        }
        // 15+ HCP Opening (Standard Acol priorities)
        else if (computerHCP >= 15) {
            if (suitLengths.S >= 5) openingBid = '1S';
            else if (suitLengths.H >= 5) openingBid = '1H';
            else if (isBalanced && computerHCP <= 17) openingBid = '1NT'; // 15-17 Balanced
            else if (suitLengths.H === 4) openingBid = '1H'; // Lowest 4-card major
            else if (suitLengths.S === 4) openingBid = '1S';
            else if (suitLengths.C >= 3) openingBid = '1C'; // Lowest minor (3+ cards)
            else if (suitLengths.D >= 3) openingBid = '1D';
        }
        // Rule of 20 Check (for 10-11 HCP hands)
        else if (computerHCP >= 10 && computerHCP <= 11) {
            const sortedLengths = Object.values(suitLengths).sort((a, b) => b - a);
            const ruleOf20Total = computerHCP + sortedLengths[0] + sortedLengths[1];
            if (ruleOf20Total >= 20) {
                console.log(`Computer (${nextBidder}) opening based on Rule of 20 (${ruleOf20Total}). HCP: ${computerHCP}`);
                // Prioritize opening the longest suit
                if (suitLengths.S >= 5) openingBid = '1S'; // Prefer 5 card suits even if not longest
                else if (suitLengths.H >= 5) openingBid = '1H';
                else if (suitLengths.D >= 5) openingBid = '1D';
                else if (suitLengths.C >= 5) openingBid = '1C';
                // If no 5-card suit, open longest (Acol style - up the line for 4 cards, minors for 3)
                else if (suitLengths.C >= 4 && suitLengths.C >= suitLengths.D && suitLengths.C >= suitLengths.H && suitLengths.C >= suitLengths.S) openingBid = '1C';
                else if (suitLengths.D >= 4 && suitLengths.D >= suitLengths.H && suitLengths.D >= suitLengths.S) openingBid = '1D';
                else if (suitLengths.H >= 4 && suitLengths.H >= suitLengths.S) openingBid = '1H';
                else if (suitLengths.S >= 4) openingBid = '1S';
                else if (suitLengths.C >= 3) openingBid = '1C'; // Fallback to 3-card minor
                else if (suitLengths.D >= 3) openingBid = '1D';
            }
            // If Rule of 20 not met, pass (will be handled by default 'Pass' if no other condition met)
        }
        // 12-14 HCP Opening (Standard Acol priorities)
        else if (computerHCP >= 12) {
            if (suitLengths.S >= 5) openingBid = '1S';
            else if (suitLengths.H >= 5) openingBid = '1H';
            else if (isBalanced) openingBid = '1NT'; // 12-14 Balanced
            else if (suitLengths.C >= 4) openingBid = '1C'; // Up the line 4-card suits
            else if (suitLengths.D >= 4) openingBid = '1D';
            else if (suitLengths.H >= 4) openingBid = '1H';
            else if (suitLengths.S >= 4) openingBid = '1S';
            else if (suitLengths.C >= 3) openingBid = '1C'; // 3-card minor fallback
            else if (suitLengths.D >= 3) openingBid = '1D';
        }
        console.log(`Computer (${nextBidder}) decided opening bid: ${openingBid}`);
        return openingBid;
    }

    // --- Responses / Subsequent Bids ---
    else {
        console.log(`Computer (${nextBidder}) considering response/competitive bid.`);
        const partner = playersOrder[(playersOrder.indexOf(nextBidder) + 2) % 4];
        const partnerLastBidData = [...auction].reverse().find(b => b.bidder === partner);
        const partnerLastBid = partnerLastBidData?.bid;
        const auctionIndexPartnerLastBid = partnerLastBidData ? auction.lastIndexOf(partnerLastBidData) : -1;
        const bidsSincePartner = auctionIndexPartnerLastBid !== -1 ? auction.slice(auctionIndexPartnerLastBid + 1) : auction;
        const interveningBids = bidsSincePartner.filter(b => b.bidder !== nextBidder && b.bidder !== partner);
        const partnerOpened = auctionIndexPartnerLastBid !== -1 && bidsSincePartner.every(b => b.bidder !== partner);

        // Response to Partner's Strong 2♣ Opening
        if (partnerOpened && partnerLastBid === '2C' && interveningBids.length === 0) {
             console.log(`Computer (${nextBidder}) responding to partner's 2C. HCP: ${computerHCP}`);
             // Acol 2D = Negative (0-7 HCP), any other bid = Positive (8+ HCP)
             if (computerHCP <= 7) {
                 return isValidResponse('2D') ? '2D' : 'Pass'; // Must bid 2D if possible
             } else {
                 // Use helper for positive response logic
                 return determineBestPositiveResponse(computerHand, computerHCP, suitLengths, isBalanced);
             }
        }

        // Response to Partner's Strong/Weak NT Opening
        else if (partnerOpened && (partnerLastBid === '1NT' || partnerLastBid === '2NT') && interveningBids.length === 0) {
             console.log(`Computer (${nextBidder}) responding to partner's ${partnerLastBid}. HCP: ${computerHCP}`);
             // Use helper for NT response logic
             return determineNTResponse(computerHand, computerHCP, suitLengths, isBalanced, partnerLastBid);
        }

        // Response to Partner's 1-level Suit Opening (Uncontested)
        else if (partnerOpened && ['1C', '1D', '1H', '1S'].includes(partnerLastBid) && interveningBids.length === 0) {
            const openedSuit = partnerLastBid.charAt(1);
            const supportCount = suitLengths[openedSuit] || 0;
            console.log(`Computer (${nextBidder}) responding to partner's ${partnerLastBid}. HCP: ${computerHCP}, Support: ${supportCount}`);
            let response = 'Pass'; // Default

            // --- Determine Response based on HCP and Shape (Rewritten with strict if/else if chain) ---

            // Priority 1: Game Raise (13-15 HCP, 4+ support)
            if (computerHCP >= 13 && computerHCP <= 15 && supportCount >= 4 && isValidResponse(`4${openedSuit}`)) {
                response = `4${openedSuit}`;
            }
            // Priority 2: Change of Suit at 1-level (6+ HCP, 4+ cards)
            else if (computerHCP >= 6 && suitLengths.H >= 4 && openedSuit !== 'H' && isValidResponse('1H')) {
                 response = '1H';
            } else if (computerHCP >= 6 && suitLengths.S >= 4 && openedSuit !== 'S' && isValidResponse('1S')) {
                 response = '1S';
            } else if (computerHCP >= 6 && suitLengths.D >= 4 && openedSuit === 'C' && isValidResponse('1D')) { // Only 1D over 1C
                 response = '1D';
            }
            // Priority 3: Single Raise (6-9 HCP, 3+ support)
            else if (computerHCP >= 6 && computerHCP <= 9 && supportCount >= 3 && isValidResponse(`2${openedSuit}`)) {
                response = `2${openedSuit}`;
            }
            // Priority 4: 1NT Response (6-9 HCP, balanced)
            else if (computerHCP >= 6 && computerHCP <= 9 && isBalanced && isValidResponse('1NT')) {
                 response = '1NT';
            }
            // Priority 5: Limit Raise (10-12 HCP, 4+ support)
            else if (computerHCP >= 10 && computerHCP <= 12 && supportCount >= 4 && isValidResponse(`3${openedSuit}`)) {
                response = `3${openedSuit}`;
            }
            // Priority 6: 2NT Response (10-12 Balanced)
            else if (computerHCP >= 10 && computerHCP <= 12 && isBalanced && isValidResponse('2NT')) {
                 response = '2NT';
            }
            // Priority 7: Change of Suit at 2-level (10+ HCP, 5+ cards)
            else if (computerHCP >= 10 && suitLengths.H >= 5 && openedSuit !== 'H' && isValidResponse('2H')) {
                 response = '2H';
            } else if (computerHCP >= 10 && suitLengths.S >= 5 && openedSuit !== 'S' && isValidResponse('2S')) {
                 response = '2S';
            } else if (computerHCP >= 10 && suitLengths.C >= 5 && openedSuit !== 'C' && isValidResponse('2C')) { // Acol often needs 5
                 response = '2C';
            } else if (computerHCP >= 10 && suitLengths.D >= 5 && openedSuit !== 'D' && isValidResponse('2D')) { // Acol often needs 5
                 response = '2D';
            }
            // Priority 8: Stronger balanced raises (e.g., 3NT with 13-15 balanced, no 4-card major) - Add if needed

            // Final check: If response is still 'Pass' but we have 6+ HCP, must bid something if possible
            if (response === 'Pass' && computerHCP >= 6) {
                 console.warn(`Computer (${nextBidder}) has 6+ HCP but no standard response found. Forcing cheapest valid bid.`);
                 // Re-check cheapest valid bids in standard order
                 if (isValidResponse('1D') && openedSuit === 'C') response = '1D';
                 else if (isValidResponse('1H') && openedSuit !== 'H') response = '1H';
                 else if (isValidResponse('1S') && openedSuit !== 'S') response = '1S';
                 else if (isValidResponse('1NT')) response = '1NT';
                 else if (isValidResponse(`2${openedSuit}`)) response = `2${openedSuit}`;
                 else if (isValidResponse('2C') && openedSuit !== 'C') response = '2C';
                 else if (isValidResponse('2D') && openedSuit !== 'D') response = '2D';
                 // Add more checks if necessary
            }

            console.log(`Computer (${nextBidder}) decided response to 1-level suit opening: ${response}`);
            return response;
        }
        // --- Partner did NOT open ---
        else {
             console.log(`Computer (${nextBidder}) partner did not open. Considering competitive action.`);

             // Check if partner made an overcall
             const wasPartnerOvercall = partnerLastBidData && // Partner made a bid
                                        !partnerOpened && // It wasn't an opening sequence (redundant check here, but safe)
                                        partnerLastBid.length === 2 && // It's a suit bid
                                        !['NT', 'X', 'XX'].some(s => partnerLastBid.includes(s)) &&
                                        auction.length > 1 &&
                                        auction.slice(0, auction.lastIndexOf(partnerLastBidData)).some(b => b.bidder !== partner && b.bidder !== nextBidder);

             if (wasPartnerOvercall) {
                 // --- Response to Partner's Overcall ---
                 const overcalledSuit = partnerLastBid.charAt(1);
                 const overcallLevel = parseInt(partnerLastBid.charAt(0), 10);
                 const supportCount = suitLengths[overcalledSuit] || 0;
                 console.log(`Computer (${nextBidder}) responding to partner's overcall of ${partnerLastBid}. HCP: ${computerHCP}, Support: ${supportCount}`);
                 let response = 'Pass'; // Default pass if no raise fits

                 // Fit Jump (10+ HCP, 4+ support)
                 const jumpLevel = overcallLevel + 2;
                 const fitJumpBid = `${jumpLevel}${overcalledSuit}`;
                 if (computerHCP >= 10 && supportCount >= 4 && isValidResponse(fitJumpBid)) {
                      console.log(`Computer (${nextBidder}) making fit jump to ${fitJumpBid}.`);
                      response = fitJumpBid;
                 }
                 // Simple Raise (6-9 HCP, 3+ support)
                 else if (computerHCP >= 6 && computerHCP <= 9 && supportCount >= 3) {
                     const raiseLevel = overcallLevel + 1;
                     const simpleRaiseBid = `${raiseLevel}${overcalledSuit}`;
                     if (isValidResponse(simpleRaiseBid)) {
                          console.log(`Computer (${nextBidder}) making simple raise to ${simpleRaiseBid}.`);
                          response = simpleRaiseBid;
                     }
                 }
                 // Add logic here for other responses to overcalls (e.g., new suit, NT) if needed

                 if (response === 'Pass') {
                     console.log(`Computer (${nextBidder}) has no standard raise for partner's overcall. Passing.`);
                 }
                 return response;
             }
             else {
                 // --- Computer Makes Own Overcall / Competitive Bid ---
                 // (Partner didn't open AND partner didn't overcall)
                 console.log(`Computer (${nextBidder}) considering making its own overcall/competitive action.`);
                 let competitiveBid = 'Pass'; // Default

                 // Simple Overcall (8-16 HCP, good 5+ card suit)
                 if (computerHCP >= 8 && computerHCP <= 16) {
                     // Find the highest ranking valid overcall
                     if (suitLengths.S >= 5 && isValidResponse('1S')) competitiveBid = '1S';
                     if (suitLengths.H >= 5 && isValidResponse('1H')) competitiveBid = '1H';
                     if (suitLengths.D >= 5 && isValidResponse('1D')) competitiveBid = '1D';
                     if (suitLengths.C >= 5 && isValidResponse('1C')) competitiveBid = '1C';
                     // Consider 2-level overcalls if necessary and valid
                     if (competitiveBid === 'Pass') { // Only if no 1-level overcall possible
                         if (suitLengths.S >= 5 && isValidResponse('2S')) competitiveBid = '2S';
                         if (suitLengths.H >= 5 && isValidResponse('2H')) competitiveBid = '2H';
                         if (suitLengths.D >= 5 && isValidResponse('2D')) competitiveBid = '2D';
                         if (suitLengths.C >= 5 && isValidResponse('2C')) competitiveBid = '2C';
                     }
                 }
                 // 1NT Overcall (15-18 HCP, balanced, stopper in opponent's suit)
                 const lastOpponentBidData = [...auction].reverse().find(b => b.bidder !== nextBidder && b.bidder !== partner && !['Pass', 'X', 'XX'].includes(b.bid));
                 if (lastOpponentBidData && computerHCP >= 15 && computerHCP <= 18 && isBalanced && isValidResponse('1NT')) {
                     // Basic stopper check (Ace, King, or Qx+) - simplified
                     const oppSuit = lastOpponentBidData.bid.charAt(1);
                     const hasStopper = computerHand.some(c => c.suit === oppSuit && ['A', 'K'].includes(c.rank)) ||
                                        (computerHand.filter(c => c.suit === oppSuit && c.rank === 'Q').length > 0 && suitLengths[oppSuit] >= 2);
                     if (hasStopper) {
                         competitiveBid = '1NT';
                     }
                 }
                 // TODO: Add other competitive actions like takeout doubles, jump overcalls, etc.

                 if (competitiveBid !== 'Pass') {
                     console.log(`Computer (${nextBidder}) making competitive bid: ${competitiveBid}`);
                 } else {
                     console.log(`Computer (${nextBidder}) has no competitive action. Passing.`);
                 }
                 return competitiveBid;
             }
        }
    }
}, [hands, nextBidder, isAuctionOver, auction, isValidResponse, determineBestPositiveResponse, determineNTResponse]); // Added helper dependencies


  // --- Effect Hooks ---
  useEffect(() => {
    generateNewDeal(true); // Generate initial deal on component mount
  }, [generateNewDeal]); // Add generateNewDeal as dependency

  useEffect(() => {
    if (!isAuctionOver && !isUserTurn()) {
      const timer = setTimeout(() => {
        const bid = getComputerBid();
        handleBid(bid);
      }, 1000); // 1-second delay for computer bid
      return () => clearTimeout(timer); // Cleanup timer on unmount or if state changes
    }
  }, [nextBidder, isAuctionOver, isUserTurn, getComputerBid, handleBid]); // Dependencies updated

  // --- Rendering Logic ---
  const isVisible = (position) => {
    if (userPosition === 'All') return true;
    return userPosition === position;
  };

  const renderAuction = () => {
    const rows = [];
    const header = <div className="auction-header" key="header">
      {playersOrder.map(p => <div key={p}>{p}</div>)}
    </div>;
    rows.push(header);

    let currentRow = [];
    let bidCountInRow = 0;
    const startingIndex = playersOrder.indexOf(dealer);

    // Add padding cells before the first bid
    for (let i = 0; i < startingIndex; i++) {
      currentRow.push(<div className="auction-cell empty" key={`pad-${i}`}></div>);
      bidCountInRow++;
    }

    auction.forEach((item, index) => {
      currentRow.push(<div className="auction-cell" key={index}>{item.bid}</div>);
      bidCountInRow++;
      if (bidCountInRow === 4) {
        rows.push(<div className="auction-row" key={`row-${rows.length}`}>{currentRow}</div>);
        currentRow = [];
        bidCountInRow = 0;
      }
    });

    // Add the last partial row if it exists
    if (currentRow.length > 0) {
      // Add padding cells to complete the row
      while (bidCountInRow < 4) {
        currentRow.push(<div className="auction-cell empty" key={`pad-end-${bidCountInRow}`}></div>);
        bidCountInRow++;
      }
      rows.push(<div className="auction-row" key={`row-${rows.length}`}>{currentRow}</div>);
    }

    return <div className="auction-display">{rows}</div>;
  };

  const renderBiddingBox = () => {
    if (isAuctionOver) {
      return <div className="auction-ended-message">Auction Ended</div>;
    }

    const lastActualBid = [...auction].reverse().find(item => !['Pass', 'X', 'XX'].includes(item.bid));
    const lastActualBidRank = getBidRank(lastActualBid?.bid);
    const lastBid = auction[auction.length - 1];
    const lastBidder = lastBid?.bidder;
    const partner = playersOrder[(playersOrder.indexOf(nextBidder) + 2) % 4];
    const canDouble = lastBid && !['Pass', 'X', 'XX'].includes(lastBid.bid) && lastBidder !== partner;
    const canRedouble = lastBid && lastBid.bid === 'X' && lastBidder !== partner;

    return (
      <div className="bidding-box-container">
        <div className="bidding-box-label">Next to Bid: {nextBidder}</div>
        <div className="bidding-controls">
          <button
            className="bid-button pass"
            onClick={() => handleBid('Pass')}
            disabled={!isUserTurn()}
          >
            Pass
          </button>
          <button
            className="bid-button double"
            onClick={() => handleBid('X')}
            disabled={!isUserTurn() || !canDouble}
          >
            X
          </button>
          <button
            className="bid-button redouble"
            onClick={() => handleBid('XX')}
            disabled={!isUserTurn() || !canRedouble}
          >
            XX
          </button>
        </div>
        <div className="bidding-grid">
          {Array.from({ length: 7 }, (_, i) => i + 1).map(level => (
            denominations.map(denom => {
              const bid = `${level}${denom}`;
              const bidRank = getBidRank(bid);
              const isDisabled = !isUserTurn() || bidRank <= lastActualBidRank;
              const color = (denom === 'H' || denom === 'D') ? 'red' : 'black';
              const symbol = denom === 'C' ? '♣' : denom === 'D' ? '♦' : denom === 'H' ? '♥' : denom === 'S' ? '♠' : '';

              return (
                <button
                  key={bid}
                  className="bid-button level-denom"
                  onClick={() => handleBid(bid)}
                  disabled={isDisabled}
                  style={{ color: color }}
                >
                  {level}{symbol || denom /* Show symbol or NT */}
                </button>
              );
            })
          ))}
        </div>
      </div>
    );
  };

  // --- Save Deal Functionality ---
  const handleSaveDeal = async () => {
    const dealData = {
      north: hands.N.map(c => c.rank + c.suit).join(','), // Store as comma-separated strings
      east: hands.E.map(c => c.rank + c.suit).join(','),
      south: hands.S.map(c => c.rank + c.suit).join(','),
      west: hands.W.map(c => c.rank + c.suit).join(','),
      dealer: dealer,
      vulnerability: vulnerability,
      auction: auction, // Store the full auction history
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

  // --- Deal Assessment ---
  const getAssessment = (points) => {
      if (points >= 20) return "Very Strong Hand (Consider 2C opening)";
      if (points >= 15) return "Strong Opening Hand (15-19)";
      if (points >= 12) return "Opening Hand (12-14)";
      if (points >= 8) return "Invitational Hand";
      if (points >= 6) return "Responding Hand";
      return "Weak Hand";
  };

  return (
    <div className="bidding-practice-container">
      <h1>Bridge Bidding Practice</h1>
      <button onClick={() => generateNewDeal(false)} className="new-deal-btn">New Deal</button>
      <button onClick={handleSaveDeal} className="save-deal-btn btn">Save Deal</button> {/* Added Save Button */}

      <div className="position-selector">
        <label htmlFor="positionSelect">Your Position:</label>
        <select
          id="positionSelect"
          value={userPosition}
          onChange={(e) => setUserPosition(e.target.value)}
        >
          <option value="N">North</option>
          <option value="E">East</option>
          <option value="S">South</option>
          <option value="W">West</option>
          <option value="All">Show All</option>
        </select>
      </div>

      {/* Deal Assessment Section */}
      {userPosition !== 'All' && hands[userPosition] && (
          <div className="deal-assessment">
              <div><strong>Your Hand Assessment ({userPosition}):</strong></div>
              <div>HCP: {calculateHCP(hands[userPosition])}</div>
              <div>Assessment: {getAssessment(calculateHCP(hands[userPosition]))}</div>
          </div>
      )}


      <div className="table-and-bidding-container">
        <div className="bridge-table">
          {/* North */}
          <div className="position-label north-label">N</div>
          <div className={`hand north ${!isVisible('N') ? 'hidden-hand' : ''}`}>
            {isVisible('N') ? (
              <>
                {displayHand(hands.N)}
                <div className="hcp-display">HCP: {calculateHCP(hands.N)}</div>
              </>
            ) : "Hidden"}
          </div>

          {/* Middle Row (West, Center, East) */}
          <div className="middle-row">
            <div className="position-label west-label">W</div>
            <div className={`hand west ${!isVisible('W') ? 'hidden-hand' : ''}`}>
              {isVisible('W') ? (
                <>
                  {displayHand(hands.W)}
                  <div className="hcp-display">HCP: {calculateHCP(hands.W)}</div>
                </>
              ) : "Hidden"}
            </div>
            <div className="table-center">
              <div className="center-labels">
                 <div className="vulnerability-display">Vul: {vulnerability}</div>
                 <div>Dealer: {dealer}</div>
                 {/* Optional: Add N/S E/W labels */}
                 {/*
                 <div><span>N</span><span>S</span></div>
                 <div><span>W</span><span>E</span></div>
                 */}
              </div>
            </div>
            <div className={`hand east ${!isVisible('E') ? 'hidden-hand' : ''}`}>
              {isVisible('E') ? (
                <>
                  {displayHand(hands.E)}
                  <div className="hcp-display">HCP: {calculateHCP(hands.E)}</div>
                </>
              ) : "Hidden"}
            </div>
            <div className="position-label east-label">E</div>
          </div>

          {/* South */}
          <div className={`hand south ${!isVisible('S') ? 'hidden-hand' : ''}`}>
            {isVisible('S') ? (
              <>
                {displayHand(hands.S)}
                <div className="hcp-display">HCP: {calculateHCP(hands.S)}</div>
              </>
            ) : "Hidden"}
          </div>
          <div className="position-label south-label">S</div>
        </div>

        {/* Auction Display and Bidding Box */}
        <div className="bidding-area">
          {renderAuction()}
          {renderBiddingBox()}
        </div>
      </div>
    </div>
  );
}

export default BiddingPracticeTable;