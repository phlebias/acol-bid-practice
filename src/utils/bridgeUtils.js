// src/utils/bridgeUtils.js
// General utility functions for bridge logic

// --- Constants ---
export const SUITS = ['S', 'H', 'D', 'C'];
export const MAJORS = ['S', 'H'];
export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
export const DENOMINATIONS = ['C', 'D', 'H', 'S', 'NT']; // Order for ranking
export const playersOrder = ['N', 'E', 'S', 'W']; // Standard order of play

// --- Helper Functions ---

export const getSuitRank = (suit) => {
    const ranks = { 'C': 1, 'D': 2, 'H': 3, 'S': 4, 'NT': 5 };
    return ranks[suit] || 0;
};

export const calculateHCP = (hand) => {
    const points = { 'A': 4, 'K': 3, 'Q': 2, 'J': 1 };
    // Ensure hand is an array before reducing
    if (!Array.isArray(hand)) {
        console.error("Invalid hand format for calculateHCP:", hand);
        return 0;
    }
    const total = hand.reduce((total, card) => {
        // Expects card object: { suit: 'S', rank: 'K' }
        if (card && typeof card === 'object' && card.rank) {
            const rank = card.rank.toUpperCase();
            const cardPoints = points[rank] || 0;
            return total + cardPoints;
        }
        return total;
    }, 0);
    return total;
};

export const getDistribution = (hand) => {
    const dist = { 'S': 0, 'H': 0, 'D': 0, 'C': 0 };
     // Ensure hand is an array before processing
    if (!Array.isArray(hand)) {
        console.error("Invalid hand format for getDistribution:", hand);
        return dist; // Return default empty distribution
    }
    hand.forEach(card => {
        // Ensure card is a string and has a suit character
         if (typeof card === 'string' && card.length > 1) {
             dist[card[1]]++;
         }
    });
    return dist;
};

// Calculates suit lengths directly - often more useful than distribution object
export const getSuitLengths = (hand) => {
    const lengths = { S: 0, H: 0, D: 0, C: 0 };
     // Ensure hand is an array before processing
    if (!Array.isArray(hand)) {
        console.error("Invalid hand format for getSuitLengths:", hand);
        return lengths; // Return default empty lengths
    }
    hand.forEach(card => {
        // Ensure card is a string and has a suit character
         if (typeof card === 'string' && card.length > 1) {
             // Data format is SuitRank (e.g., SK = Spade King)
             // Use suit (index 0) for lengths lookup
             const suit = card[0].toUpperCase(); // Use index 0 for Suit
              if (lengths.hasOwnProperty(suit)) {
                   lengths[suit]++;
              } else {
                 // console.log(`DEBUG (getSuitLengths loop): Suit=${suit} is not a valid suit key in lengths object.`); // Keep commented if needed
              }
           } else {
              // console.log(`DEBUG (getSuitLengths): Skipping invalid card: ${JSON.stringify(card)}`); // Keep commented if needed
           }
    });
    return lengths;
};

export const isPreemptive = (bid) => {
    // Consider bids like 2H, 2S, 3C, etc. as preemptive
    if (typeof bid !== 'string' || bid.length < 2) return false;
    const level = parseInt(bid[0]);
    const suit = bid.slice(1);
    return (level >= 2 && level <= 3 && suit !== 'NT');
};

// Function to get partner - needed by biddingLogic
export const getPartner = (position) => {
    const partners = { N: 'S', S: 'N', E: 'W', W: 'E' };
    return partners[position];
};

// Function to get opponent (specifically LHO - Left Hand Opponent)
export const getLHO = (position) => {
    const lhos = { N: 'W', S: 'E', E: 'N', W: 'S' };
    return lhos[position];
};

// Function to get opponent (specifically RHO - Right Hand Opponent)
export const getRHO = (position) => {
    const rhos = { N: 'E', S: 'W', E: 'S', W: 'N' };
    return rhos[position];
};

// Generic opponent function (returns LHO for simplicity for now)
// Might need refinement later if RHO is specifically needed somewhere
export const getOpponent = (position) => {
    return getLHO(position);
};

// Function to check if a bid is valid (higher than last bid) - basic version
// Assumes auction is sorted chronologically
export const isBidHigher = (bidToMake, auction) => {
    if (bidToMake === 'Pass' || bidToMake === 'X' || bidToMake === 'XX') return true; // These are always valid placement-wise

    let lastActualBid = null;
    for (let i = auction.length - 1; i >= 0; i--) {
        const bidInfo = auction[i];
        if (bidInfo.bid !== 'Pass' && bidInfo.bid !== 'X' && bidInfo.bid !== 'XX') {
            lastActualBid = bidInfo.bid;
            break;
        }
    }

    if (!lastActualBid) return true; // First actual bid

    const rankToMake = getBidRank(bidToMake);
    const lastRank = getBidRank(lastActualBid);

    return rankToMake > lastRank;
};

// Gets numerical rank of a bid like "1C", "3NT", "7S"
export const getBidRank = (bid) => {
    if (!bid || typeof bid !== 'string' || bid.length < 2 || bid === 'Pass' || bid === 'X' || bid === 'XX') {
        return 0; // Or handle error appropriately
    }
    const level = parseInt(bid.charAt(0), 10);
    const denomination = bid.substring(1);
    const denomRank = DENOMINATIONS.indexOf(denomination);

    if (level < 1 || level > 7 || denomRank === -1) {
        return 0; // Invalid bid format
    }

    // Rank = (Level - 1) * 5 + Denomination Rank
    return (level - 1) * 5 + denomRank + 1; // +1 to make 1C rank 1
};


// Find the last actual bid (not Pass, X, XX)
export const getLastActualBidData = (auction) => {
     for (let i = auction.length - 1; i >= 0; i--) {
         const bidInfo = auction[i];
         if (bidInfo.bid !== 'Pass' && bidInfo.bid !== 'X' && bidInfo.bid !== 'XX') {
             return bidInfo;
         }
     }
     return null; // No actual bid yet
 };

// Find the index of the first bid by a specific player
export const findBidIndexBy = (bidder, auction) => {
    return auction.findIndex(b => b.bidder === bidder);
};

// Find the last bid (any bid) by a specific player
export const findLastBidBy = (bidder, auction) => {
     for (let i = auction.length - 1; i >= 0; i--) {
         if (auction[i].bidder === bidder) {
             return auction[i];
         }
     }
     return null;
 };

// Basic check if a hand is balanced (4333, 4432, 5332)
export const isHandBalanced = (handOrSuitLengths) => {
    let lengths;
    if (Array.isArray(handOrSuitLengths)) {
        // Input is a hand, calculate lengths
        lengths = Object.values(getSuitLengths(handOrSuitLengths));
    } else if (typeof handOrSuitLengths === 'object' && handOrSuitLengths !== null) {
         // Input is likely a suitLengths object
        lengths = Object.values(handOrSuitLengths);
    } else {
        console.error("Invalid input for isHandBalanced:", handOrSuitLengths);
        return false;
    }

    if (lengths.length !== 4) return false; // Should always have 4 suits

    lengths.sort((a, b) => b - a); // Sort lengths descending (e.g., [5, 3, 3, 2])

    const pattern = lengths.join('');
    return pattern === '4333' || pattern === '4432' || pattern === '5332';
};


// Check for a stopper in a suit (A, Kx, Qxx, Jxxx)
export const hasStopper = (hand, suit) => {
    if (!hand || !Array.isArray(hand) || !suit) return false;

    const suitCards = hand.filter(card => typeof card === 'string' && card.length > 1 && card[1] === suit).map(card => card[0]); // Get ranks in the suit

    if (suitCards.includes('A')) return true;
    if (suitCards.includes('K') && suitCards.length >= 2) return true;
    if (suitCards.includes('Q') && suitCards.length >= 3) return true;
    if (suitCards.includes('J') && suitCards.length >= 4) return true;

    return false;
};


// Placeholder for isValidBid - more complex, needs context
// This needs to check legality (higher bid, valid double/redouble)
export const isValidBid = (bid, auction, bidder) => {
     // 1. Check if bid itself is syntactically valid? (e.g., "1C", "Pass", "X")
     if (bid === 'Pass') return true;

     const validDenominations = [...DENOMINATIONS, 'NT']; // Include NT if not already
     if (bid === 'X' || bid === 'XX') {
         // Check if double/redouble is legal
         // Double is legal if last bid != Pass was by an opponent and wasn't X or XX
         // Redouble is legal if last bid != Pass was by own side and was X
         let lastBidData = null;
         let lastActualBidData = null;
         let lastOpponentActualBidData = null;
         let lastPartnerActualBidData = null;
         const partner = getPartner(bidder);

         for (let i = auction.length - 1; i >= 0; i--) {
             if (!lastBidData && auction[i].bid !== 'Pass') lastBidData = auction[i];
             if (!lastActualBidData && auction[i].bid !== 'Pass' && auction[i].bid !== 'X' && auction[i].bid !== 'XX') lastActualBidData = auction[i];
             if (!lastOpponentActualBidData && auction[i].bidder !== bidder && auction[i].bidder !== partner && auction[i].bid !== 'Pass' && auction[i].bid !== 'X' && auction[i].bid !== 'XX') lastOpponentActualBidData = auction[i];
              if (!lastPartnerActualBidData && auction[i].bidder === partner && auction[i].bid !== 'Pass' && auction[i].bid !== 'X' && auction[i].bid !== 'XX') lastPartnerActualBidData = auction[i];

             if(lastBidData && lastActualBidData && lastOpponentActualBidData && lastPartnerActualBidData) break; // Found all needed bids
         }

         if (bid === 'X') {
             if (!lastBidData || lastBidData.bidder === bidder || lastBidData.bidder === partner || lastBidData.bid === 'X' || lastBidData.bid === 'XX') {
                 console.log(`DEBUG (isValidBid): Double by ${bidder} illegal. Last non-pass:`, lastBidData);
                 return false; // Cannot double own side or a double/pass
             }
             return true;
         }
         if (bid === 'XX') {
             if (!lastBidData || (lastBidData.bidder !== bidder && lastBidData.bidder !== partner) || lastBidData.bid !== 'X') {
                  console.log(`DEBUG (isValidBid): Redouble by ${bidder} illegal. Last non-pass:`, lastBidData);
                  return false; // Can only redouble an opponent's double
             }
             return true;
         }

     } else {
         // Check standard bids (e.g., "1C", "3NT")
         const level = parseInt(bid.charAt(0), 10);
         const denom = bid.substring(1);
         if (isNaN(level) || level < 1 || level > 7 || !DENOMINATIONS.includes(denom)) {
            console.log(`DEBUG (isValidBid): Invalid bid format ${bid}`);
            return false; // Invalid format
         }
          // Check if higher than last actual bid
         if (!isBidHigher(bid, auction)) {
             console.log(`DEBUG (isValidBid): Bid ${bid} is not higher than last actual bid.`);
             return false;
         }
         return true;
     }
     return false; // Should not be reached
};


// *** Add other necessary utilities here as needed ***
// e.g., getOpponent, suit ranking, point adjustments, etc.
