import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; // Firebase imports included as they were in the old version
import { firestore } from '../firebase'; // Firebase imports included
import './BiddingPracticeTable.css';

// --- Constants (Outside Component) ---
const SUITS = ['S', 'H', 'D', 'C']; // Spades, Hearts, Diamonds, Clubs
const MAJORS = ['S', 'H'];
// const MINORS = ['D', 'C']; // Removed as unused
const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const suitSymbols = { S: '♠', H: '♥', D: '♦', C: '♣' };
const suitColors = { S: 'black', H: 'red', D: 'red', C: 'black' };
const playersOrder = ['N', 'E', 'S', 'W'];
const denominations = ['C', 'D', 'H', 'S', 'NT']; // Order for ranking bids

// --- Helper Functions (Outside Component - Pure Functions) ---
// FROM NEW CODE
const createDeck = () => {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }
    return deck;
};

// FROM NEW CODE
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

// FROM NEW CODE (with sorting fix from old)
const dealHands = (deck) => {
    const hands = { N: [], E: [], S: [], W: [] };
    for (let i = 0; i < deck.length; i++) {
        hands[playersOrder[i % 4]].push(deck[i]);
    }
    for (const player of playersOrder) {
        if (hands[player]) {
            // Sorting logic from old code
            hands[player].sort((a, b) => {
                const suitIndexA = SUITS.indexOf(a.suit);
                const suitIndexB = SUITS.indexOf(b.suit);
                if (suitIndexA !== suitIndexB) {
                    return suitIndexA - suitIndexB; // Sort S, H, D, C
                }
                // Within a suit, sort by rank A, K, Q...
                return RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank);
            });
        }
    }
    return hands;
};

// FROM NEW CODE
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

// FROM NEW CODE
const calculateLengthPoints = (suitLengths) => {
    let lengthPoints = 0;
    for (const suit in suitLengths) {
        if (suitLengths[suit] >= 5) {
            lengthPoints += suitLengths[suit] - 4;
        }
    }
    return lengthPoints;
};

// FROM NEW CODE
const getBidRank = (bid) => {
    if (!bid || typeof bid !== 'string' || ['Pass', 'X', 'XX'].includes(bid)) {
        return -1; // Pass, X, XX don't have a rank in the same way
    }
    const level = parseInt(bid.charAt(0), 10);
    const denom = bid.substring(1);
    const denomIndex = denominations.indexOf(denom); // C=0, D=1, H=2, S=3, NT=4
    if (isNaN(level) || level < 1 || level > 7 || denomIndex === -1) {
        console.error("Error parsing bid rank for:", bid);
        return -1; // Invalid bid format
    }
    // Calculate rank: (level-1)*5 ensures each level is distinct, add denomIndex for intra-level rank
    return (level - 1) * 5 + denomIndex;
};

// FROM NEW CODE
const getLastActualBidData = (auction) => {
    // Ensure auction is an array before attempting to reverse/find
    if (!Array.isArray(auction)) {
        console.error("getLastActualBidData called with non-array auction:", auction);
        return undefined;
    }
    return [...auction].reverse().find(item => item && !['Pass', 'X', 'XX'].includes(item.bid));
};

// FROM NEW CODE
const isBidHigher = (proposedBid, auction) => {
    const lastActualBidData = getLastActualBidData(auction);
    const lastActualBidRank = getBidRank(lastActualBidData?.bid);
    const proposedBidRank = getBidRank(proposedBid);
    return proposedBidRank > lastActualBidRank;
};

// FROM NEW CODE
const hasStopper = (hand, suit, suitLengths) => {
    if (!suit || !hand || !Array.isArray(hand)) return false; // Added array check
    const suitLen = suitLengths ? suitLengths[suit] : hand.filter(c => c && c.suit === suit).length;
    return (
        hand.some(c => c && c.suit === suit && c.rank === 'A') ||
        (hand.some(c => c && c.suit === suit && c.rank === 'K') && suitLen >= 2) ||
        (hand.some(c => c && c.suit === suit && c.rank === 'Q') && suitLen >= 3) ||
        (hand.some(c => c && c.suit === suit && c.rank === 'J') && suitLen >= 4)
    );
};

// FROM NEW CODE
const hasGoodSuitQuality = (hand, suit, suitLengths) => {
     if (!suit || !hand || !Array.isArray(hand)) return false; // Added array check
     const suitLen = suitLengths ? suitLengths[suit] : hand.filter(c => c && c.suit === suit).length;
     if (suitLen < 6) return false; // Usually need 6 for weak twos/good overcalls
     const honors = hand.filter(c => c && c.suit === suit && ['A', 'K', 'Q'].includes(c.rank));
     return honors.length >= 2;
};

// FROM OLD CODE (matches layout)
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
          // Style from old code
          <div key={suitKey} style={{ color: color, marginBottom: '2px' }}>
            {symbol} {ranks}
          </div>
        );
      })}
    </div>
  );
};

// FROM OLD CODE
// const playSound = (soundFile) => {
//     try {
//       const audio = new Audio(soundFile);
//       audio.play().catch(error => console.error("Error playing sound:", error));
//     } catch (error) {
//       console.error("Error creating audio:", error);
//     }
// }; // Commented out as unused

// --- Component ---
function BiddingPracticeTable() {
    // State from NEW code
    const [hands, setHands] = useState({ N: [], E: [], S: [], W: [] });
    const [dealer, setDealer] = useState('N');
    const [vulnerability, setVulnerability] = useState('None'); // 'None', 'NS', 'EW', 'Both'
    const [nextBidder, setNextBidder] = useState('N');
    const [auction, setAuction] = useState([]);
    const [isAuctionOver, setIsAuctionOver] = useState(false);
    const [userPosition, setUserPosition] = useState('All'); // 'N', 'E', 'S', 'W', 'All'

    // --- Bidding Logic Functions (using useCallback) ---
    // FROM NEW CODE

    // Check if a specific bid is valid *at this point* in the auction
    const isValidBid = useCallback((bid, currentAuction, bidder) => {
        if (!Array.isArray(currentAuction)) {
            console.error("isValidBid called with non-array auction:", currentAuction);
            return false; // Cannot validate if auction data is invalid
        }
        if (bid === 'Pass') return true; // Pass is always valid conceptually

        const lastActualBidData = getLastActualBidData(currentAuction);
        const lastActualBid = lastActualBidData?.bid;
        const lastActualBidder = lastActualBidData?.bidder;

        // 1. Rank Check (must be higher than last actual bid)
        if (bid !== 'X' && bid !== 'XX') {
            if (!isBidHigher(bid, currentAuction)) {
                // console.log(`isValidBid Check: ${bid} is not higher than ${lastActualBid || 'anything'}`);
                return false;
            }
        }

        // 2. Double (X) Check
        if (bid === 'X') {
            // Must follow an opponent's contract bid
            if (!lastActualBidData || ['Pass', 'X', 'XX'].includes(lastActualBid)) return false;
            const bidderIndex = playersOrder.indexOf(bidder);
            const lastBidderIndex = playersOrder.indexOf(lastActualBidder);
            // Check if last bidder was an opponent
            if ((bidderIndex % 2) === (lastBidderIndex % 2)) return false; // Same partnership
        }

        // 3. Redouble (XX) Check
        if (bid === 'XX') {
            // Must follow an opponent's Double (X)
            const lastBidData = currentAuction[currentAuction.length - 1];
             if (!lastBidData || lastBidData.bid !== 'X') return false;
            const bidderIndex = playersOrder.indexOf(bidder);
            const lastDoublerIndex = playersOrder.indexOf(lastBidData.bidder);
            // Check if last bidder (the doubler) was an opponent
            if ((bidderIndex % 2) === (lastDoublerIndex % 2)) return false; // Same partnership
        }

        return true;
    }, []); // No dependencies needed as it operates on passed arguments


    // --- Acol Opening Bid Logic ---
    const getOpeningBid = useCallback((hand, hcp, suitLengths, isBalanced) => {
        console.log(`Computer (${nextBidder}) evaluating Opening Bid. HCP: ${hcp}, Balanced: ${isBalanced}`);
        let bid = 'Pass';

        // 1. Strong 2NT (Acol: 20-22 balanced)
        if (isBalanced && hcp >= 20 && hcp <= 22) {
            bid = '2NT';
        }
        // 2. Strong 2♣ (Acol: 23+ HCP or Game Force equivalent - simplified to 23+)
        else if (hcp >= 23) {
            bid = '2C';
        }
        // 3. Weak Two Bids (Acol: 6-10 HCP, good 6-card suit)
        else if (hcp >= 6 && hcp <= 10) {
            if (suitLengths.S >= 6 && hasGoodSuitQuality(hand, 'S', suitLengths)) bid = '2S';
            else if (suitLengths.H >= 6 && hasGoodSuitQuality(hand, 'H', suitLengths)) bid = '2H';
            else if (suitLengths.D >= 6 && hasGoodSuitQuality(hand, 'D', suitLengths)) bid = '2D'; // Acol Weak 2D is sometimes conventional, but basic is ok
        }
        // 4. 1NT Opening (Acol: 15-17 balanced OR 12-14 balanced)
        else if (isBalanced) {
             if (hcp >= 15 && hcp <= 17) bid = '1NT';
             else if (hcp >= 12 && hcp <= 14) bid = '1NT';
        }
        // 5. Rule of 20 (Consider opening light 10-11 HCP hands)
        else if (hcp >= 10 && hcp <= 11) {
             const sortedLengths = Object.values(suitLengths).sort((a, b) => b - a);
             if ((hcp + sortedLengths[0] + sortedLengths[1]) >= 20) {
                 console.log(`Computer (${nextBidder}) applying Rule of 20.`);
                 // Open longest suit (Acol preference: 5+ card suit > 4+ card suit)
                 if      (suitLengths.S >= 5) bid = '1S';
                 else if (suitLengths.H >= 5) bid = '1H';
                 else if (suitLengths.D >= 5) bid = '1D';
                 else if (suitLengths.C >= 5) bid = '1C';
                 // No 5-card suit, open longest 4-card (Acol: H if 4-4 Majors, else up the line)
                 else if (suitLengths.H === 4 && suitLengths.S === 4) bid = '1H';
                 else if (suitLengths.H === 4) bid = '1H';
                 else if (suitLengths.S === 4) bid = '1S';
                 else if (suitLengths.D === 4) bid = '1D';
                 else if (suitLengths.C === 4) bid = '1C';
                 // Only 3-card suits possible (e.g., 4333 shape) - open 1C/1D
                 else if (suitLengths.C === 3) bid = '1C'; // Check Acol specifics on 4333 opening choice
                 else if (suitLengths.D === 3) bid = '1D';
             }
        }
         // 6. Standard 1-Level Suit Opening (12-19 HCP, not fitting above categories)
        else if (hcp >= 12 && hcp <= 19) {
             // Prioritize 5+ card suits
             if      (suitLengths.S >= 5) bid = '1S';
             else if (suitLengths.H >= 5) bid = '1H';
             else if (suitLengths.D >= 5) bid = '1D';
             else if (suitLengths.C >= 5) bid = '1C';
             // No 5+ card suit, open longest 4-card (Acol style)
             else if (suitLengths.H === 4 && suitLengths.S === 4) bid = '1H';
             else if (suitLengths.H === 4) bid = '1H';
             else if (suitLengths.S === 4) bid = '1S';
             else if (suitLengths.D === 4) bid = '1D';
             else if (suitLengths.C === 4) bid = '1C';
             // 4-3-3-3 shape (must have 12-19 points)
             else if (isBalanced) { // Should be caught by 1NT logic unless 18-19
                 // Acol 18-19 Balanced: Open 1 of suit (often minor) and jump rebid NT
                 if (hcp >= 18) {
                     bid = (suitLengths.C >= 3) ? '1C' : '1D'; // Simplification
                 }
                 // If somehow 12-14/15-17 balanced got here, pass (should have bid NT)
             }
        }

        // Ensure the chosen bid is actually possible (should always be Pass if nothing else)
        console.log(`Computer (${nextBidder}) decided opening bid: ${bid}`);
        return bid; // Returns 'Pass' if no other condition met

    }, [nextBidder]); // Depends on nextBidder for logging

    // --- Acol Response Logic (Helper for 2C positive response) ---
    const determineBestPositiveResponse = useCallback((hand, hcp, suitLengths, isBalanced, currentAuction, bidder) => {
        // Assumes 8+ HCP (checked before calling)
        let response = 'Pass'; // Default (should find something)
        // Simple: Bid cheapest 5+ card suit at the 2 level if possible
        if (suitLengths.C >= 5 && isValidBid('2C', currentAuction, bidder)) response = '2C';
        else if (suitLengths.D >= 5 && isValidBid('2D', currentAuction, bidder)) response = '2D';
        else if (suitLengths.H >= 5 && isValidBid('2H', currentAuction, bidder)) response = '2H';
        else if (suitLengths.S >= 5 && isValidBid('2S', currentAuction, bidder)) response = '2S';
        // Else bid 2NT if balanced (8-10 range approx, adjust as needed)
        else if (isBalanced && hcp <= 10 && isValidBid('2NT', currentAuction, bidder)) response = '2NT';
         // Stronger balanced hands might bid 3NT
        else if (isBalanced && hcp >= 13 && isValidBid('3NT', currentAuction, bidder)) response = '3NT'; // Simplified
        // Fallback: Bid 2D if nothing else fits (artificial relay over 2C opening in some systems, but here just a fallback)
        // IMPORTANT: 2D over 2C is NEGATIVE (0-7) in standard Acol. This positive response needs to bid *something else* if possible.
        // Re-evaluate positive responses:
        response = 'Pass'; // Reset
        if (hcp >= 8 && suitLengths.S >= 5 && isValidBid('2S', currentAuction, bidder)) response = '2S';
        else if (hcp >= 8 && suitLengths.H >= 5 && isValidBid('2H', currentAuction, bidder)) response = '2H';
        else if (hcp >= 8 && suitLengths.D >= 5 && isValidBid('3D', currentAuction, bidder)) response = '3D'; // Example jump
        else if (hcp >= 8 && suitLengths.C >= 5 && isValidBid('3C', currentAuction, bidder)) response = '3C'; // Example jump
        else if (hcp >= 8 && isBalanced && isValidBid('2NT', currentAuction, bidder)) response = '2NT'; // Common positive response
        // Needs more sophisticated logic for suit quality, point ranges for jumps etc.
        // If still pass, maybe bid cheapest 4-card suit?
         if (response === 'Pass' && hcp >= 8) {
             if (suitLengths.D >= 4 && isValidBid('2D', currentAuction, bidder)) response = '2D'; // Avoid 2D if possible if it's negative!
             else if (suitLengths.H >= 4 && isValidBid('2H', currentAuction, bidder)) response = '2H';
             else if (suitLengths.S >= 4 && isValidBid('2S', currentAuction, bidder)) response = '2S';
             else if (suitLengths.C >= 4 && isValidBid('3C', currentAuction, bidder)) response = '3C'; // 3 level needed
         }

        return response === 'Pass' ? '2NT' : response; // Default positive if stuck? Risky. Needs better logic.

    }, [isValidBid]);


    // --- Acol Response Logic (Helper for NT responses) ---
    const determineNTResponse = useCallback((hand, hcp, suitLengths, isBalanced, partnerBid, currentAuction, bidder) => {
        let response = 'Pass';
        const has4CardMajor = suitLengths.H >= 4 || suitLengths.S >= 4;
        const has5CardMajor = suitLengths.H >= 5 || suitLengths.S >= 5;

        // Acol Responses to 1NT (partner opened 12-14 or 15-17)
        if (partnerBid === '1NT') {
            // Priority 1: Transfers (0+ HCP, 5+ card major)
            if (suitLengths.H >= 5 && isValidBid('2D', currentAuction, bidder)) { response = '2D'; } // Transfer to Hearts
            else if (suitLengths.S >= 5 && isValidBid('2H', currentAuction, bidder)) { response = '2H'; } // Transfer to Spades
            // Priority 2: Stayman (Acol: 8+ HCP, at least one 4-card major) - only if no transfer shown
            else if (hcp >= 8 && has4CardMajor && isValidBid('2C', currentAuction, bidder)) { response = '2C'; }
            // Priority 3: Raise to 2NT (Invitational, 11-12 HCP balanced, NO 4/5 card major)
            else if (hcp >= 11 && hcp <= 12 && isBalanced && !has4CardMajor && !has5CardMajor && isValidBid('2NT', currentAuction, bidder)) { response = '2NT'; }
            // Priority 4: Raise to 3NT (Game, 13+ HCP balanced, NO 4/5 card major suitable for Stayman/Transfer)
            // Partner has 12-14: Need 13+ (25 total)
            // Partner has 15-17: Need 10+ (25 total) - Adjust based on partner's range if known (not easy here)
            // Simplification: Bid 3NT with 13+ balanced if no major interest
             else if (hcp >= 13 && isBalanced && !has4CardMajor && !has5CardMajor && isValidBid('3NT', currentAuction, bidder)) { response = '3NT'; }
            // TODO: Add Weak Takeouts (e.g., 2S for Minors, etc.)
        }
        // Acol Responses to 2NT (partner opened 20-22)
        else if (partnerBid === '2NT') {
             // Priority 1: Transfers (0+ HCP, 5+ card major)
             if (suitLengths.H >= 5 && isValidBid('3D', currentAuction, bidder)) { response = '3D'; } // Transfer to Hearts
             else if (suitLengths.S >= 5 && isValidBid('3H', currentAuction, bidder)) { response = '3H'; } // Transfer to Spades
             // Priority 2: Stayman (Acol: 3/4+ HCP, at least one 4-card major)
             else if (hcp >= 3 && has4CardMajor && isValidBid('3C', currentAuction, bidder)) { response = '3C'; }
             // Priority 3: Raise to 3NT (Game, 3/4+ HCP balanced, no major interest)
             else if (hcp >= 3 && isBalanced && !has4CardMajor && !has5CardMajor && isValidBid('3NT', currentAuction, bidder)) { response = '3NT'; }
             // TODO: Slam tries, other conventions
        }

        console.log(`Computer (${bidder}) responding to partner's ${partnerBid} with ${response}. HCP: ${hcp}`);
        return response;
    }, [isValidBid]); // Depends on isValidBid

    // --- Acol Response/Competitive Logic ---
    const getResponseOrCompetitiveBid = useCallback((hand, hcp, suitLengths, isBalanced, currentAuction, bidder, vulnerability) => {
        console.log(`Computer (${bidder}) evaluating Response/Competitive Bid. HCP: ${hcp}`);
        let bid = 'Pass'; // Default action

        if (!Array.isArray(currentAuction)) {
            console.error("getResponseOrCompetitiveBid called with non-array auction:", currentAuction);
            return 'Pass'; // Cannot determine bid if auction data is invalid
        }

        const partner = playersOrder[(playersOrder.indexOf(bidder) + 2) % 4];
        const lho = playersOrder[(playersOrder.indexOf(bidder) + 3) % 4]; // Left Hand Opponent
        const rho = playersOrder[(playersOrder.indexOf(bidder) + 1) % 4]; // Right Hand Opponent

        // --- Robust Auction State Detection ---
        const firstBidderIndex = currentAuction.findIndex(b => b && !['Pass'].includes(b.bid)); // Find first non-pass bid index
        const firstBidderData = firstBidderIndex !== -1 ? currentAuction[firstBidderIndex] : null;
        const firstBidder = firstBidderData?.bidder;

        const bidderFirstBidIndex = currentAuction.findIndex(b => b && b.bidder === bidder && !['Pass'].includes(b.bid));
        const partnerFirstBidIndex = currentAuction.findIndex(b => b && b.bidder === partner && !['Pass'].includes(b.bid));
        // const lhoFirstBidIndex = currentAuction.findIndex(b => b && b.bidder === lho && !['Pass'].includes(b.bid)); // Unused
        // const rhoFirstBidIndex = currentAuction.findIndex(b => b && b.bidder === rho && !['Pass'].includes(b.bid)); // Unused

        const iOpened = firstBidder === bidder;
        const partnerOpened = firstBidder === partner;
        const lhoOpened = firstBidder === lho;
        const rhoOpened = firstBidder === rho;
        const opponentOpened = lhoOpened || rhoOpened;
        const partnershipOpened = iOpened || partnerOpened;

        const lastActualBidData = getLastActualBidData(currentAuction); // Still useful
        const lastActualBid = lastActualBidData?.bid;
        const lastActualBidder = lastActualBidData?.bidder;

        // Check for intervention *after* our partnership opened
        let opponentIntervened = false;
        if (partnershipOpened) {
            const openingIndex = iOpened ? bidderFirstBidIndex : partnerFirstBidIndex;
            opponentIntervened = currentAuction.slice(openingIndex + 1).some(b =>
                b && !['Pass'].includes(b.bid) && (b.bidder === lho || b.bidder === rho)
            );
        }

        // Check if we are in a balancing seat (Opponent opened, partner passed, RHO passed)
        const isBalancingSeat = opponentOpened &&
                                currentAuction.find(b => b && b.bidder === partner)?.bid === 'Pass' &&
                                currentAuction.find(b => b && b.bidder === rho)?.bid === 'Pass' &&
                                lastActualBidder === (lhoOpened ? lho : rho); // Last bid was by the opponent opener

        // Get partner's last bid (needed for responses/rebids)
        const partnerLastBidData = [...currentAuction].reverse().find(b => b && b.bidder === partner);
        const partnerLastBid = partnerLastBidData?.bid;
        // Get RHO's last bid (needed for competitive logic)
        const rhoLastBidData = [...currentAuction].reverse().find(b => b && b.bidder === rho);
        const rhoLastBid = rhoLastBidData?.bid;
        // Get LHO's last bid (needed for competitive logic)
        const lhoLastBidData = [...currentAuction].reverse().find(b => b && b.bidder === lho);
        const lhoLastBid = lhoLastBidData?.bid;

        // --- A. I Opened, No Intervention (Opener's Rebid) ---
        if (iOpened && !opponentIntervened) {
             const myOpeningBidData = currentAuction.find(b => b.bidder === bidder && !['Pass', 'X', 'XX'].includes(b.bid));
             const myOpeningBid = myOpeningBidData?.bid;
             console.log(`Computer (${bidder}) Making Rebid over opening ${myOpeningBid} after partner bid ${partnerLastBid} (uncontested)`);

             // --- Simple Rebid Logic ---
             if (myOpeningBid && partnerLastBid) {
                 const partnerSuit = partnerLastBid.length === 2 ? partnerLastBid.charAt(1) : null;
                 const partnerLevel = partnerSuit ? parseInt(partnerLastBid.charAt(0), 10) : 0;

                 // 1. Raise Partner's Suit Response?
                 if (partnerSuit && partnerSuit !== 'NT') {
                     const supportCount = suitLengths[partnerSuit] || 0;
                     if (supportCount >= 4 && hcp >= 15 && hcp <= 17) { // Simple Invitational+ Raise (e.g., 1S-2H; 3H)
                         const targetBid = `${partnerLevel + 1}${partnerSuit}`;
                         if (isValidBid(targetBid, currentAuction, bidder)) bid = targetBid;
                     } else if (supportCount >= 3 && hcp >= 12 && hcp <= 14) { // Simple Minimum Raise (e.g., 1S-2C; 2C) - Needs refinement
                         // const targetBid = `${partnerLevel}${partnerSuit}`; // Unused - Rebid at same level if possible? Risky. Let's raise.
                         const raiseBid = `${partnerLevel + (partnerLevel === 1 ? 1 : 0)}${partnerSuit}`; // Simplistic raise
                          if (isValidBid(raiseBid, currentAuction, bidder)) bid = raiseBid;
                     }
                 }

                 // 2. Specific Case: 1S -> 2H response -> Rebid 2NT (15-16 pts, no fit)
                 if (bid === 'Pass' && myOpeningBid === '1S' && partnerLastBid === '2H') {
                     if (hcp >= 15 && hcp <= 16 && (suitLengths['H'] || 0) < 3) {
                         // Check stoppers (simplified: assume stoppers for now)
                         if (isValidBid('2NT', currentAuction, bidder)) {
                             bid = '2NT';
                         }
                     }
                 }

                 // 3. Rebid own suit? (Simple minimum rebid)
                 if (bid === 'Pass' && myOpeningBid.length === 2) {
                     const openedSuit = myOpeningBid.charAt(1);
                     if (suitLengths[openedSuit] >= 6 && hcp >= 12 && hcp <= 14) { // Minimum hand, 6+ card suit
                         const targetBid = `2${openedSuit}`;
                         if (isValidBid(targetBid, currentAuction, bidder)) bid = targetBid;
                     }
                 }

                 // Add more rebid logic: New suits, NT rebids, Jumps etc.

             }
             // Fallback if no specific rebid found yet
             if (bid === 'Pass') {
                 console.log(`Computer (${bidder}) No specific rebid found, passing (NEEDS MORE LOGIC)`);
                 bid = 'Pass';
             }
        }
        // --- B. Partner Opened, No Intervention ---
        else if (partnerOpened && !opponentIntervened) {
            console.log(`Computer (${bidder}) Responding to Partner's opening ${partnerLastBid} (uncontested)`);

             // Response to Partner's Strong 2♣
             if (partnerLastBid === '2C') {
                 if (hcp <= 7) {
                     bid = isValidBid('2D', currentAuction, bidder) ? '2D' : 'Pass'; // Acol 2D = Negative
                 } else {
                     bid = determineBestPositiveResponse(hand, hcp, suitLengths, isBalanced, currentAuction, bidder);
                 }
             }
             // Response to Partner's NT Opening
             else if (partnerLastBid === '1NT' || partnerLastBid === '2NT') {
                  bid = determineNTResponse(hand, hcp, suitLengths, isBalanced, partnerLastBid, currentAuction, bidder);
             }
             // Response to Partner's 1-level Suit Opening
             else if (['1C', '1D', '1H', '1S'].includes(partnerLastBid)) {
                 const openedSuit = partnerLastBid.charAt(1);
                 const supportCount = suitLengths[openedSuit] || 0;
                 // let responseLevel = parseInt(partnerLastBid.charAt(0), 10); // Usually 1 - Not used directly

                 // Priority Order for Responses:
                 // 1. Game Raise (13-15 HCP, 4+ support) - Needs enough space
                 if (hcp >= 13 && hcp <= 15 && supportCount >= 4) {
                    let targetBid = `4${openedSuit}`;
                    if (MAJORS.includes(openedSuit)) {
                        if (isValidBid(targetBid, currentAuction, bidder)) bid = targetBid;
                    } else { // Minor suit game raise (often 5 level)
                        targetBid = `5${openedSuit}`; // Simplification - could be 3NT
                        if (isValidBid('3NT', currentAuction, bidder)) bid = '3NT'; // Prefer 3NT if balanced
                        else if (isValidBid(targetBid, currentAuction, bidder)) bid = targetBid;
                    }
                 }
                 // 2. Limit Raise (10-12 HCP, 4+ support) - Needs enough space
                 else if (bid === 'Pass' && hcp >= 10 && hcp <= 12 && supportCount >= 4) {
                    const targetBid = `3${openedSuit}`;
                    if (isValidBid(targetBid, currentAuction, bidder)) bid = targetBid;
                 }
                 // 3. Change of Suit at 2-level (Acol: 10/11+ HCP, 5+ cards *strict*)
                 else if (bid === 'Pass' && hcp >= 10) {
                    // Check suits *cheaper* than partner's first
                    if (openedSuit !== 'C' && suitLengths.C >= 5 && isValidBid('2C', currentAuction, bidder)) bid = '2C';
                    else if (openedSuit !== 'D' && suitLengths.D >= 5 && isValidBid('2D', currentAuction, bidder)) bid = '2D';
                    else if (openedSuit !== 'H' && suitLengths.H >= 5 && isValidBid('2H', currentAuction, bidder)) bid = '2H';
                    else if (openedSuit !== 'S' && suitLengths.S >= 5 && isValidBid('2S', currentAuction, bidder)) bid = '2S';
                 }
                 // 4. Change of Suit at 1-level (6+ HCP, 4+ cards) - Must be cheaper/lower rank than opened suit if at same level
                 else if (bid === 'Pass' && hcp >= 6) {
                    if (suitLengths.D >= 4 && getBidRank('1D') > getBidRank(partnerLastBid) && isValidBid('1D', currentAuction, bidder)) bid = '1D';
                    else if (suitLengths.H >= 4 && getBidRank('1H') > getBidRank(partnerLastBid) && isValidBid('1H', currentAuction, bidder)) bid = '1H';
                    else if (suitLengths.S >= 4 && getBidRank('1S') > getBidRank(partnerLastBid) && isValidBid('1S', currentAuction, bidder)) bid = '1S';
                 }
                  // 5. 2NT Response (10-12 Balanced, Stoppers usually assumed uncontested)
                 else if (bid === 'Pass' && hcp >= 10 && hcp <= 12 && isBalanced && isValidBid('2NT', currentAuction, bidder)) {
                     bid = '2NT';
                 }
                 // 6. Single Raise (6-9 HCP, 3+ support)
                 else if (bid === 'Pass' && hcp >= 6 && hcp <= 9 && supportCount >= 3) {
                     const targetBid = `2${openedSuit}`;
                     if (isValidBid(targetBid, currentAuction, bidder)) bid = targetBid;
                 }
                 // 7. 1NT Response (6-9 HCP, balanced, usually no fit)
                 else if (bid === 'Pass' && hcp >= 6 && hcp <= 9 && isBalanced && supportCount < 3 && isValidBid('1NT', currentAuction, bidder)) {
                     bid = '1NT';
                 }
                 // 8. Fallback: Must bid something with 6+ points if possible and haven't found a bid
                 if (bid === 'Pass' && hcp >= 6) {
                      console.warn(`Computer (${bidder}) forcing a bid with ${hcp} HCP over partner's ${partnerLastBid}`);
                      // Try cheapest valid bids in order
                      if (isValidBid('1D', currentAuction, bidder) && getBidRank('1D') > getBidRank(partnerLastBid)) bid = '1D';
                      else if (isValidBid('1H', currentAuction, bidder) && getBidRank('1H') > getBidRank(partnerLastBid)) bid = '1H';
                      else if (isValidBid('1S', currentAuction, bidder) && getBidRank('1S') > getBidRank(partnerLastBid)) bid = '1S';
                      else if (isValidBid('1NT', currentAuction, bidder) && getBidRank('1NT') > getBidRank(partnerLastBid)) bid = '1NT';
                      else if (isValidBid(`2${openedSuit}`, currentAuction, bidder)) bid = `2${openedSuit}`; // Simple raise if possible
                      else if (isValidBid('2C', currentAuction, bidder)) bid = '2C';
                      else if (isValidBid('2D', currentAuction, bidder)) bid = '2D';
                      // Add more...
                 }
             }
             // TODO: Responses to Weak Twos, other openings
        }

        // --- C. Partner Opened, Opponent Intervened (Responder's Action) ---
        // Note: This logic might need refinement based on *which* opponent intervened (LHO/RHO).
        else if (partnerOpened && opponentIntervened) {
             console.log(`Computer (${bidder}) Responding to Partner's opening ${partnerLastBid} (RHO overcalled ${rhoLastBid})`);
             const rhoOvercallSuit = rhoLastBid && rhoLastBid.length === 2 ? rhoLastBid.charAt(1) : null;

             // Priority 1: Negative Double (Shows points and unbid major(s)/suits)
             // Conditions: Partner opened 1-suit, RHO overcalled 1-suit, bidder has 8+ points, usually <4 cards in overcalled suit, support for unbid major(s).
             const couldNegDouble = partnerLastBid && ['1C', '1D', '1H', '1S'].includes(partnerLastBid) &&
                                  rhoLastBid && rhoLastBid.length === 2 && !['X', 'XX', 'NT'].includes(rhoLastBid.substring(1)) &&
                                  isValidBid('X', currentAuction, bidder); // Technically valid place for a double

             if (couldNegDouble && hcp >= 8 && rhoOvercallSuit && suitLengths[rhoOvercallSuit] <= 3) {
                  // Check for unbid major support (simple: 4+ cards in at least one unbid major)
                  const partnerOpenedMajor = MAJORS.includes(partnerLastBid.charAt(1));
                  const rhoOvercalledMajor = MAJORS.includes(rhoOvercallSuit);
                  let unbidMajorSupport = false;
                  if (!partnerOpenedMajor) { // Need to check both majors potentially
                     if (!rhoOvercalledMajor || rhoOvercallSuit === 'S') { // Check H
                         if (suitLengths.H >= 4) unbidMajorSupport = true;
                     }
                     if (!rhoOvercalledMajor || rhoOvercallSuit === 'H') { // Check S
                         if (suitLengths.S >= 4) unbidMajorSupport = true;
                     }
                  } else { // Partner opened a major, check the *other* major
                     const otherMajor = partnerLastBid.charAt(1) === 'H' ? 'S' : 'H';
                     if (rhoOvercallSuit !== otherMajor && suitLengths[otherMajor] >= 4) unbidMajorSupport = true;
                  }
                  // Basic Neg Double: 8+ points and unbid major support (or general values if both majors bid/supported)
                  if (unbidMajorSupport) { // Add point check as needed (e.g., 8-11 = Neg Dbl, 12+ = Cue Bid often)
                     console.log(`Computer (${bidder}) making Negative Double`);
                     bid = 'X';
                  }
             }

             // Priority 2: Cue Bid RHO's Suit (Strong raise for partner, or general force)
             // Conditions: Typically 11/12+ points, often implies fit.
             if (bid === 'Pass' && hcp >= 11 && rhoOvercallSuit && rhoLastBid) {
                  const cueBidLevel = parseInt(rhoLastBid.charAt(0), 10) + (denominations.indexOf(rhoOvercallSuit) >= denominations.indexOf(partnerLastBid.charAt(1)) ? 1 : 0); // Simplified level calc
                  const targetBid = `${cueBidLevel + 1}${rhoOvercallSuit}`; // Ensure it's high enough
                  if (isValidBid(targetBid, currentAuction, bidder)) {
                      console.log(`Computer (${bidder}) Cue Bidding RHO suit`);
                      bid = targetBid;
                  }
             }

             // Priority 3: Simple Raise of Partner's Suit (adjust points slightly higher due to competition: 7-10 HCP, 3+ support)
             else if (bid === 'Pass' && partnerLastBid && partnerLastBid.length === 2 && !partnerLastBid.includes('NT')) {
                  const openedSuit = partnerLastBid.charAt(1);
                  const supportCount = suitLengths[openedSuit] || 0;
                   if (hcp >= 7 && hcp <= 10 && supportCount >= 3) {
                       const targetBid = `2${openedSuit}`;
                       if (isValidBid(targetBid, currentAuction, bidder)) bid = targetBid;
                   }
             }
             // Priority 4: Bid own suit (constructive, 5+ cards, ~8+ points)
             else if (bid === 'Pass' && hcp >= 8 && lastActualBid) {
                  // Find best 5+ card suit that can be bid legally
                  let bestSuitBid = 'Pass';
                  let highestRank = -1;
                  for (const suit of SUITS) {
                      if (suitLengths[suit] >= 5) {
                          // Try bidding at lowest available level
                          let level = parseInt(lastActualBid.charAt(0), 10);
                          if (getBidRank(`${level}${suit}`) <= getBidRank(lastActualBid)) {
                              level++;
                          }
                          if (level <= 7) {
                              const targetBid = `${level}${suit}`;
                              if (isValidBid(targetBid, currentAuction, bidder)) {
                                   if (getBidRank(targetBid) > highestRank) { // Prefer higher suits if level is same
                                       highestRank = getBidRank(targetBid);
                                       bestSuitBid = targetBid;
                                   }
                              }
                          }
                      }
                  }
                  if (bestSuitBid !== 'Pass') {
                      bid = bestSuitBid;
                  }
             }

             // Add logic for NT bids, limit raises in competition, etc.
             console.log(`Computer (${bidder}) decided competitive response: ${bid}`);
        }

        // --- D. Opponent Opened, Partner Passed (Direct Seat Action) ---
        else if (opponentOpened && partnerLastBid === 'Pass' && !isBalancingSeat) {
            // Note: Assumes LHO opened if opponentOpened is true here. Needs refinement if RHO could open and LHO pass.
            console.log(`Computer (${bidder}) Considering action over Opponent's opening ${lhoLastBid || rhoLastBid}`); // Use LHO/RHO bid
            const lhoSuit = lhoLastBid.length === 2 ? lhoLastBid.charAt(1) : null;
            const lhoLevel = lhoSuit ? parseInt(lhoLastBid.charAt(0), 10) : 0;
            const adjustedHCP = hcp; // No adjustment for direct seat

            // Priority 1: Takeout Double (12+ total points - HCP + length, short in opener's suit)
            const lengthPts = calculateLengthPoints(suitLengths);
            if (lhoSuit && (adjustedHCP + lengthPts) >= 12 && suitLengths[lhoSuit] <= 2 && isValidBid('X', currentAuction, bidder)) {
                 // Basic check: support for unbid suits (e.g., 3+ cards in >= 3 other suits)
                 let supportCount = 0;
                 for (const suit of SUITS) { if (suit !== lhoSuit && suitLengths[suit] >= 3) supportCount++; }
                 if (supportCount >= (MAJORS.includes(lhoSuit) ? 2 : 3) ) { // Need support for majors if minor opened
                     console.log(`Computer (${bidder}) making Takeout Double`);
                     bid = 'X';
                 }
            }

            // Priority 2: 1NT Overcall (Acol: 15-18 balanced, stopper in LHO suit)
            else if (bid === 'Pass' && lhoLevel === 1 && lhoSuit && adjustedHCP >= 15 && adjustedHCP <= 18 && isBalanced && hasStopper(hand, lhoSuit, suitLengths) && isValidBid('1NT', currentAuction, bidder)) {
                 console.log(`Computer (${bidder}) making 1NT Overcall`);
                 bid = '1NT';
            }

            // Priority 3: Suit Overcall (Good suit, points depending on level)
            else if (bid === 'Pass') {
                 let bestOvercall = 'Pass';
                 let bestOvercallRank = -1;
                 // Check 1-level overcalls (8-16 HCP, 5+ cards)
                 for (const suit of SUITS) {
                      if (suitLengths[suit] >= 5 && adjustedHCP >= 8 && adjustedHCP <= 16) {
                          const targetBid = `1${suit}`;
                          if (getBidRank(targetBid) > getBidRank(lhoLastBid) && isValidBid(targetBid, currentAuction, bidder)) {
                              if (getBidRank(targetBid) > bestOvercallRank) {
                                   bestOvercall = targetBid;
                                   bestOvercallRank = getBidRank(targetBid);
                              }
                          }
                      }
                 }
                 // Check 2-level overcalls (10-16 HCP, 5+/6+ cards, usually good quality)
                 if (bestOvercall === 'Pass') {
                     for (const suit of SUITS) {
                          if (suitLengths[suit] >= 5 && adjustedHCP >= 10 && adjustedHCP <= 16 && hasGoodSuitQuality(hand, suit, suitLengths)) {
                              const targetBid = `2${suit}`;
                              if (getBidRank(targetBid) > getBidRank(lhoLastBid) && isValidBid(targetBid, currentAuction, bidder)) {
                                  if (getBidRank(targetBid) > bestOvercallRank) {
                                       bestOvercall = targetBid;
                                       bestOvercallRank = getBidRank(targetBid);
                                  }
                              }
                          }
                     }
                 }
                  // TODO: Weak Jump Overcalls (e.g., 2S over 1C - 6-10 HCP, 6+ card suit)

                 if (bestOvercall !== 'Pass') {
                      console.log(`Computer (${bidder}) making Suit Overcall ${bestOvercall}`);
                      bid = bestOvercall;
                 }
            }
            // TODO: Penalty Doubles? Probably not in direct seat unless very strong.
        }

         // --- E. Balancing Seat Action ---
         else if (isBalancingSeat) {
             // Note: Assumes LHO opened if opponentOpened is true here. Needs refinement if RHO could open and LHO pass.
             console.log(`Computer (${bidder}) Considering Balancing Action over Opponent's ${lhoLastBid || rhoLastBid}`); // Use LHO/RHO bid
             const lhoSuit = lhoLastBid.length === 2 ? lhoLastBid.charAt(1) : null;
             const adjustedHCP = hcp + 0; // Balancing: can act with ~3 fewer points than direct seat - Adjust logic below

             // Priority 1: Balancing Takeout Double (9/10+ total points)
             const lengthPts = calculateLengthPoints(suitLengths);
             if (lhoSuit && (adjustedHCP + lengthPts) >= 10 && suitLengths[lhoSuit] <= 2 && isValidBid('X', currentAuction, bidder)) {
                 let supportCount = 0;
                 for (const suit of SUITS) { if (suit !== lhoSuit && suitLengths[suit] >= 3) supportCount++; }
                 if (supportCount >= (MAJORS.includes(lhoSuit) ? 2 : 3)) {
                      console.log(`Computer (${bidder}) making Balancing Takeout Double`);
                      bid = 'X';
                 }
             }
             // Priority 2: Balancing NT Bid (e.g., 11-14 balanced with stopper)
             else if (bid === 'Pass' && lhoSuit && ['1C', '1D', '1H', '1S'].includes(lhoLastBid)) { // Only balance 1-level openings
                 if (adjustedHCP >= 11 && adjustedHCP <= 14 && isBalanced && hasStopper(hand, lhoSuit, suitLengths) && isValidBid('1NT', currentAuction, bidder)) {
                     console.log(`Computer (${bidder}) making Balancing 1NT Bid`);
                     bid = '1NT';
                 }
             }
             // Priority 3: Balancing Suit Bid (Lighter points, 5+ card suit)
             else if (bid === 'Pass' && lhoLastBid && lhoLastBid.length === 2) {
                 let bestBalancingBid = 'Pass';
                 let bestBidRank = -1;
                 for (const suit of SUITS) {
                     if (suitLengths[suit] >= 5 && adjustedHCP >= 8) { // Lower threshold for balancing
                         const targetLevel = parseInt(lhoLastBid.charAt(0), 10);
                         const targetBid1 = `${targetLevel}${suit}`;
                         const targetBid2 = `${targetLevel + 1}${suit}`;

                         if (getBidRank(targetBid1) > getBidRank(lhoLastBid) && isValidBid(targetBid1, currentAuction, bidder)) {
                             if (getBidRank(targetBid1) > bestBidRank) {
                                 bestBidRank = getBidRank(targetBid1);
                                 bestBalancingBid = targetBid1;
                             }
                         } else if (isValidBid(targetBid2, currentAuction, bidder)) {
                              if (getBidRank(targetBid2) > bestBidRank) {
                                 bestBidRank = getBidRank(targetBid2);
                                 bestBalancingBid = targetBid2;
                              }
                         }
                     }
                 }
                  if (bestBalancingBid !== 'Pass') {
                       console.log(`Computer (${bidder}) making Balancing Suit Bid ${bestBalancingBid}`);
                       bid = bestBalancingBid;
                  }
             }
         }

        // --- E. Other situations (Partner Overcalled, Partner Doubled, etc.) ---
        // Needs more logic branches
        else if (partnerLastBidData && !partnerOpened) {
             console.log(`Computer (${bidder}) Responding to Partner's non-opening action ${partnerLastBid}`);
             // E.g., Response to partner's Takeout Double
             if (partnerLastBid === 'X') {
                 const partnerDoubleIndex = currentAuction.lastIndexOf(partnerLastBidData);
                 const doubledBidData = [...currentAuction].slice(0, partnerDoubleIndex)
                                       .reverse().find(b => b && !['Pass','X','XX'].includes(b.bid) && playersOrder.indexOf(b.bidder)%2 !== playersOrder.indexOf(partner)%2 );
                 const doubledSuit = doubledBidData ? doubledBidData.bid.charAt(1) : null;
                 const doubledLevel = doubledBidData ? parseInt(doubledBidData.bid.charAt(0),10) : 0;
                 let minLevel = doubledLevel;
                 // If partner doubled e.g. 1S, min level for C/D/H is 2.
                 if (doubledSuit && doubledBidData.bid !== '1C') minLevel = parseInt(doubledBidData.bid.charAt(0),10);
                 else minLevel = 1; // If 1C doubled, can bid 1D/H/S

                 // Basic Response Logic (Simplified Acol-style)
                 // 0-7 HCP: Bid cheapest available suit (non-jump)
                 if (hcp <= 7) {
                      // Find cheapest valid suit bid
                      let cheapestBid = 'Pass';
                      let currentMinRank = 999;
                      for(let level = minLevel; level <= 7; level++) {
                         for (const suit of denominations) { // C, D, H, S
                            if (suit === 'NT') continue;
                            const targetBid = `${level}${suit}`;
                            if (suitLengths[suit] >= 3 && isValidBid(targetBid, currentAuction, bidder)) { // Need 3+ cards ideally
                                if (getBidRank(targetBid) < currentMinRank) {
                                    currentMinRank = getBidRank(targetBid);
                                    cheapestBid = targetBid;
                                }
                            }
                         }
                         if(cheapestBid !== 'Pass') break; // Found cheapest at this level
                      }
                       bid = cheapestBid; // Should almost always find something unless hand is 0-3-3-7 etc.
                 }
                 // 8-10 HCP: Jump in best suit (usually 4+ cards) or bid NT with stopper
                 else if (hcp >= 8 && hcp <= 10) {
                      let bestSuit = null;
                      let maxLength = 3;
                      if (suitLengths.S >= 4 && suitLengths.S > maxLength) { bestSuit = 'S'; maxLength = suitLengths.S; }
                      if (suitLengths.H >= 4 && suitLengths.H > maxLength) { bestSuit = 'H'; maxLength = suitLengths.H; }
                      if (suitLengths.D >= 4 && suitLengths.D > maxLength) { bestSuit = 'D'; maxLength = suitLengths.D; }
                      if (suitLengths.C >= 4 && suitLengths.C > maxLength) { bestSuit = 'C'; maxLength = suitLengths.C; }

                      if (bestSuit) {
                          const jumpLevel = minLevel + 1; // Jump one level
                          const jumpBid = `${jumpLevel}${bestSuit}`;
                           if (isValidBid(jumpBid, currentAuction, bidder)) {
                               bid = jumpBid;
                           } else { // If jump invalid, try non-jump at the lowest level
                               const nonJumpBid = `${minLevel}${bestSuit}`;
                               if (isValidBid(nonJumpBid, currentAuction, bidder)) bid = nonJumpBid;
                           }
                      }
                      // Try 1NT if balanced with stopper? (Approx 8-10 points)
                      else if (isBalanced && doubledSuit && hasStopper(hand, doubledSuit, suitLengths)) {
                           const targetBid = `${minLevel}NT`; // Check if minLevel is correct for NT
                           if(isValidBid(targetBid, currentAuction, bidder)) {
                              bid = targetBid;
                           }
                      }
                      // Fallback: bid cheapest suit non-jump
                      if (bid === 'Pass') {
                          // Logic from 0-7 HCP to find cheapest
                           let cheapestBid = 'Pass';
                           let currentMinRank = 999;
                           for(let level = minLevel; level <= 7; level++) {
                                for (const suit of denominations) { // C, D, H, S
                                    if (suit === 'NT') continue;
                                    const targetBid = `${level}${suit}`;
                                    if (suitLengths[suit] >= 3 && isValidBid(targetBid, currentAuction, bidder)) {
                                        if (getBidRank(targetBid) < currentMinRank) {
                                            currentMinRank = getBidRank(targetBid);
                                            cheapestBid = targetBid;
                                        }
                                    }
                                }
                                if(cheapestBid !== 'Pass') break;
                           }
                           bid = cheapestBid;
                      }
                 }
                 // 11+ HCP: Cue bid opponent's suit or bid game? (Simplified: Cue bid if possible)
                 else if (hcp >= 11 && doubledSuit) {
                     const cueLevel = minLevel + (denominations.indexOf(doubledSuit) >= 0 ? 1 : 0); // Crude level calc
                     const cueBid = `${cueLevel}${doubledSuit}`; // Ensure level is correct
                     if (isValidBid(cueBid, currentAuction, bidder)) {
                         bid = cueBid; // Simplistic cue bid
                     } else { // Fallback if cue invalid - maybe jump in best suit? Or bid NT?
                          // Logic similar to 8-10 jump, but maybe higher level or 3NT
                          let bestSuit = null;
                          let maxLength = 4; // Prefer 5+ card suit for stronger hands
                          if (suitLengths.S >= 5 && suitLengths.S > maxLength) { bestSuit = 'S'; maxLength = suitLengths.S; }
                          if (suitLengths.H >= 5 && suitLengths.H > maxLength) { bestSuit = 'H'; maxLength = suitLengths.H; }
                          if (suitLengths.D >= 5 && suitLengths.D > maxLength) { bestSuit = 'D'; maxLength = suitLengths.D; }
                          if (suitLengths.C >= 5 && suitLengths.C > maxLength) { bestSuit = 'C'; maxLength = suitLengths.C; }

                           if (bestSuit) {
                               const jumpLevel = minLevel + 1; // Or maybe +2 with good points?
                               const jumpBid = `${jumpLevel}${bestSuit}`;
                               if (isValidBid(jumpBid, currentAuction, bidder)) {
                                   bid = jumpBid;
                               }
                           } else if (isBalanced && hasStopper(hand, doubledSuit, suitLengths) && isValidBid(`${minLevel+1}NT`, currentAuction, bidder)) { // Jump to 2NT?
                               bid = `${minLevel+1}NT`;
                           }
                           // Fallback needed
                     }
                 }
             }
             // Add responses to partner's overcall, etc.
        }


        // --- F. Final Check / Default ---
        if (!isValidBid(bid, currentAuction, bidder)) {
            console.warn(`Computer (${bidder}) generated an invalid bid: ${bid}. Defaulting to Pass.`);
            bid = 'Pass';
        }

        console.log(`Computer (${bidder}) final decision: ${bid}`);
        return bid;

    }, [isValidBid, determineBestPositiveResponse, determineNTResponse]); // Dependencies


     // --- Main Computer Bid Dispatcher ---
     const getComputerBid = useCallback(() => {
        const computerHand = hands[nextBidder];
        if (!computerHand || computerHand.length === 0 || isAuctionOver) return 'Pass'; // Safety check

        const computerHCP = calculateHCP(computerHand);
        const suitLengths = { S: 0, H: 0, D: 0, C: 0 };
        computerHand.forEach(card => {
            if (card && card.suit) { suitLengths[card.suit]++; }
        });
        const lengths = Object.values(suitLengths);
        // Refined balanced check from NEW code
        const isBalanced = lengths.every(l => l >= 2) && lengths.filter(l => l === 2).length <= 1 && !lengths.some(l => l >=6);

// Determine situation: Opening, Responding, Competitive
const bidderIndex = playersOrder.indexOf(nextBidder);
// Corrected check: Is the current bidder the dealer AND the auction empty?
const isDealerOpening = (dealer === nextBidder && auction.length === 0);
// OR is it not the dealer's turn, but everyone before passed?
const isNonDealerOpening = (dealer !== nextBidder &&
                            Array.isArray(auction) &&
                            auction.length === bidderIndex &&
                            auction.slice(0, bidderIndex).every(b => b && b.bid === 'Pass'));
const isOpening = isDealerOpening || isNonDealerOpening;

if (isOpening) {
            return getOpeningBid(computerHand, computerHCP, suitLengths, isBalanced);
        } else {
            // Pass necessary context to the response/competitive logic function
            return getResponseOrCompetitiveBid(computerHand, computerHCP, suitLengths, isBalanced, auction, nextBidder, vulnerability);
        }

     }, [hands, nextBidder, isAuctionOver, auction, getOpeningBid, getResponseOrCompetitiveBid, vulnerability, dealer]); // Added dealer dependency


    // --- Game Flow & State Management ---
    // FROM NEW CODE
    const generateNewDeal = useCallback((isInitial = false) => {
        // if (!isInitial) {
        //     playSound('/sounds/card-shuffle02.mp3'); // Sound removed
        // }
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
        console.clear(); // Optional: Clear console for new deal
        console.log(`--- New Deal --- Dealer: ${randomDealer}, Vulnerability: ${randomVulnerability}`);
    }, []); // No dependencies that change

    // FROM NEW CODE (with validation logic)
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

        // Full validation using isValidBid logic (mirrors internal check but provides user feedback)
        const lastActualBidData = getLastActualBidData(auction);
        const lastActualBid = lastActualBidData?.bid;

        // Rank Check
        if (!['Pass', 'X', 'XX'].includes(bid)) {
            if (!isBidHigher(bid, auction)) {
                alert(`Insufficient bid: ${bid} is not higher than ${lastActualBid || 'the start'}.`);
                return;
            }
        }
        // Double Check
        if (bid === 'X') {
            if (!lastActualBidData || ['Pass', 'X', 'XX'].includes(lastActualBid)) {
                alert("Invalid Double (X): Must double an opponent's contract bid."); return;
            }
            const bidderIndex = playersOrder.indexOf(nextBidder);
            const lastBidderIndex = playersOrder.indexOf(lastActualBidData.bidder);
            if ((bidderIndex % 2) === (lastBidderIndex % 2)) { // Same partnership
                 alert("Invalid Double (X): Cannot double partner's bid."); return;
            }
        }
        // Redouble Check
        if (bid === 'XX') {
            const lastBidData = auction[auction.length - 1];
            if (!lastBidData || lastBidData.bid !== 'X') {
                 alert("Invalid Redouble (XX): Must redouble an opponent's Double (X)."); return;
            }
            const bidderIndex = playersOrder.indexOf(nextBidder);
            const lastDoublerIndex = playersOrder.indexOf(lastBidData.bidder);
            if ((bidderIndex % 2) === (lastDoublerIndex % 2)) { // Same partnership
                 alert("Invalid Redouble (XX): Cannot redouble partner's Double (X)."); return;
            }
        }
        // --- End Validation ---

        // Log and update state
        console.log(`Player ${nextBidder} bids: ${bid}`);
        const newAuctionEntry = { bidder: nextBidder, bid: bid };
        const newAuction = [...auction, newAuctionEntry];
        setAuction(newAuction); // Update state

        // Determine next bidder
        const currentBidderIndex = playersOrder.indexOf(nextBidder);
        const nextBidderIndex = (currentBidderIndex + 1) % 4;
        const nextPlayer = playersOrder[nextBidderIndex];

        // Check for auction end (FROM NEW CODE - more robust)
        let auctionHasEnded = false;
        if (newAuction.length >= 4) {
            const lastFourBids = newAuction.slice(-4).map(item => item?.bid); // Use optional chaining
             if (lastFourBids.every(b => b === 'Pass')) {
                 auctionHasEnded = true; // All four passed
                 console.log("Auction ended - all passed.");
             } else if (lastFourBids.length === 4 && lastFourBids.slice(1).every(b => b === 'Pass') && !['Pass', 'X', 'XX'].includes(lastFourBids[0])) {
                  auctionHasEnded = true; // Bid followed by 3 passes
                  console.log("Auction ended - bid followed by 3 passes.");
             } else if (lastFourBids.length === 4 && lastFourBids.slice(1).every(b => b === 'Pass') && ['X','XX'].includes(lastFourBids[0])) {
                  auctionHasEnded = true; // Double/Redouble followed by 3 passes
                   console.log("Auction ended - double/redouble followed by 3 passes.");
             }
        }


        if (auctionHasEnded) {
            setIsAuctionOver(true);
            setNextBidder('-'); // Indicate no next bidder
            // Optional: Determine final contract here
        } else {
            setNextBidder(nextPlayer); // Move to next bidder
        }

        // --- Firebase Logging (Example - uncomment and adapt if using Firestore) ---
        /*
        try {
            addDoc(collection(firestore, 'biddingSessions', 'session_id_example', 'deals'), {
                hands: hands, // Consider anonymizing opponent hands if saving publicly
                dealer: dealer,
                vulnerability: vulnerability,
                auction: newAuction,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error adding document to Firestore: ", error);
        }
        */

    }, [auction, nextBidder, isAuctionOver]); // Dependencies updated - removed isValidBid, hands, dealer, vulnerability based on ESLint

    // Effect for initial deal (FROM NEW CODE)
    useEffect(() => {
        generateNewDeal(true); // isInitial = true
    }, [generateNewDeal]); // generateNewDeal is memoized

     // Effect to handle computer's turn (FROM NEW CODE, using corrected sound)
     useEffect(() => {
         const isComputerTurn = !isAuctionOver && userPosition !== 'All' && userPosition !== nextBidder;
         // console.log(`Computer turn check: isAuctionOver=${isAuctionOver}, userPosition=${userPosition}, nextBidder=${nextBidder}, isComputerTurn=${isComputerTurn}`);

         if (isComputerTurn) {
             // Add a small delay for realism?
             const timer = setTimeout(() => {
                  console.log(`--- Computer (${nextBidder}) is thinking... ---`);
                  const computerBid = getComputerBid();
                  handleBid(computerBid); // Computer makes its bid
                  // playSound('/sounds/card-shuffle01.mp3'); // Sound removed
             }, 1000); // 1 second delay

             return () => clearTimeout(timer); // Cleanup timer on unmount or if dependencies change
         }
     }, [nextBidder, isAuctionOver, userPosition, getComputerBid, handleBid]); // Dependencies


    // --- Rendering Logic ---
    // FROM OLD CODE (matches layout)
    const isVisible = (position) => {
        if (userPosition === 'All') return true;
        return userPosition === position;
    };

    // FROM OLD CODE (matches layout)
    const renderAuction = () => {
        // Add check to ensure auction is an array
        if (!Array.isArray(auction)) {
            console.error("CRITICAL: auction state is not an array!", auction);
            return <div className="auction-display error">Error: Auction data is invalid.</div>; // Render error message
        }
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
          // console.log(`Rendering auction item ${index}:`, item); // Log the item being processed
          // Defensive check: Ensure item exists and item.bid is a string or number before rendering
          const bidContent = item && (typeof item.bid === 'string' || typeof item.bid === 'number') ? item.bid : JSON.stringify(item); // Stringify the whole item if invalid
          if (!item || (typeof item.bid !== 'string' && typeof item.bid !== 'number')) {
              console.warn(`Invalid auction item or bid type found at index ${index}:`, item);
          }
          // Apply styling from NEW code's renderAuction
          let bidClass = "auction-cell";
          if (bidContent === 'Pass') bidClass += " pass";
          else if (bidContent === 'X') bidClass += " double";
          else if (bidContent === 'XX') bidClass += " redouble";
          else if (typeof bidContent === 'string' && bidContent.length > 1) { // Color suits
              const suit = bidContent.substring(1);
              if (suit === 'H' || suit === 'D') bidClass += " red-suit";
          }

          currentRow.push(<div className={bidClass} key={index}>{bidContent}</div>);
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

    // FROM OLD CODE (matches layout)
    const renderBiddingBox = () => {
        if (isAuctionOver) {
          return <div className="auction-ended-message">Auction Ended</div>;
        }

        // Use validation logic from NEW code's handleBid/isValidBid
        const canDouble = isValidBid('X', auction, nextBidder);
        const canRedouble = isValidBid('XX', auction, nextBidder);
        const allowUserBidding = (!isAuctionOver && (userPosition === 'All' || userPosition === nextBidder));

        return (
          <div className="bidding-box-container">
            <div className="bidding-box-label">Next to Bid: {nextBidder}</div>
            <div className="bidding-controls">
              <button
                className="bid-button pass"
                onClick={() => handleBid('Pass')}
                disabled={!allowUserBidding}
              >
                Pass
              </button>
              <button
                className="bid-button double" // Class from old code
                onClick={() => handleBid('X')}
                disabled={!allowUserBidding || !canDouble}
              >
                X
              </button>
              <button
                className="bid-button redouble" // Class from old code
                onClick={() => handleBid('XX')}
                disabled={!allowUserBidding || !canRedouble}
              >
                XX
              </button>
            </div>
            <div className="bidding-grid">
              {Array.from({ length: 7 }, (_, i) => i + 1).map(level => (
                denominations.map(denom => {
                  const bid = `${level}${denom}`;
                  // Disable if bid is not higher than last actual bid (using NEW logic)
                  const isDisabled = !allowUserBidding || !isBidHigher(bid, auction);
                  const color = (denom === 'H' || denom === 'D') ? 'red' : 'black';
                  const symbol = denom === 'C' ? '♣' : denom === 'D' ? '♦' : denom === 'H' ? '♥' : denom === 'S' ? '♠' : '';

                  return (
                    <button
                      key={bid}
                      className="bid-button level-denom" // Class from old code
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

    // --- Save Deal Functionality (FROM OLD CODE) ---
    const handleSaveDeal = async () => {
        const dealData = {
          northHand: hands.N, // Store the array of objects directly
          eastHand: hands.E,
          southHand: hands.S,
          westHand: hands.W,
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

    // --- Deal Assessment (FROM OLD CODE) ---
    const getAssessment = (points) => {
        if (points >= 20) return "Very Strong Hand (Consider 2C opening)";
        if (points >= 15) return "Strong Opening Hand (15-19)";
        if (points >= 12) return "Opening Hand (12-14)";
        if (points >= 8) return "Invitational Hand";
        if (points >= 6) return "Responding Hand";
        return "Weak Hand";
    };

    // Log auction state on every render for debugging
    // console.log("Rendering BiddingPracticeTable. Current auction state:", JSON.stringify(auction));

    // --- Return JSX (FROM OLD CODE) ---
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