// --- Constants ---
export const SUITS = ['S', 'H', 'D', 'C']; // Spades, Hearts, Diamonds, Clubs
export const MAJORS = ['S', 'H'];
export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
export const denominations = ['C', 'D', 'H', 'S', 'NT']; // Order for ranking bids
export const playersOrder = ['N', 'E', 'S', 'W']; // Moved here

// --- Helper Functions (Pure Functions) ---

/**
 * Calculates the rank of a bid for comparison.
 * Pass, X, XX return -1. Invalid bids return -1.
 * Otherwise, returns a numerical rank (higher is better).
 */
export const getBidRank = (bid) => {
    if (!bid || typeof bid !== 'string' || ['Pass', 'X', 'XX'].includes(bid)) {
        return -1;
    }
    const level = parseInt(bid.charAt(0), 10);
    const denom = bid.substring(1);
    const denomIndex = denominations.indexOf(denom); // C=0, D=1, H=2, S=3, NT=4
    if (isNaN(level) || level < 1 || level > 7 || denomIndex === -1) {
        console.error("Error parsing bid rank for:", bid);
        return -1;
    }
    // Calculate rank: (level-1)*5 ensures each level is distinct, add denomIndex for intra-level rank
    return (level - 1) * 5 + denomIndex;
};

/**
 * Finds the last bid in the auction that wasn't Pass, X, or XX.
 */
export const getLastActualBidData = (auction) => {
    if (!Array.isArray(auction)) {
        console.error("getLastActualBidData called with non-array auction:", auction);
        return undefined;
    }
    // Ensure items are valid before accessing 'bid'
    return [...auction].reverse().find(item => item && item.bid && !['Pass', 'X', 'XX'].includes(item.bid));
};

/**
 * Checks if a proposed bid is higher than the last actual bid in the auction.
 */
export const isBidHigher = (proposedBid, auction) => {
    const lastActualBidData = getLastActualBidData(auction);
    const lastActualBidRank = lastActualBidData ? getBidRank(lastActualBidData.bid) : -1;
    const proposedBidRank = getBidRank(proposedBid);
    return proposedBidRank > lastActualBidRank;
};

/**
 * Checks if a bid is valid in the current auction context for a given bidder.
 */
export const isValidBid = (bid, currentAuction, bidder) => {
    // Basic validation
    if (typeof bid !== 'string' || bid.trim() === '') return false;
    if (!Array.isArray(currentAuction)) {
        console.error("isValidBid called with non-array auction:", currentAuction);
        return false; // Cannot validate if auction data is invalid
    }

    const lastActualBidData = getLastActualBidData(currentAuction);
    const lastActualBid = lastActualBidData?.bid;

    // Rank Check
    if (!['Pass', 'X', 'XX'].includes(bid)) {
        if (!isBidHigher(bid, currentAuction)) {
            // console.log(`isValidBid Check: ${bid} is not higher than ${lastActualBid || 'anything'}`);
            return false;
        }
    }
    // Double Check
    if (bid === 'X') {
        if (!lastActualBidData || ['Pass', 'X', 'XX'].includes(lastActualBid)) return false; // Must double a contract
        const bidderIndex = playersOrder.indexOf(bidder);
        const lastBidderIndex = playersOrder.indexOf(lastActualBidData.bidder);
        if (bidderIndex === -1 || lastBidderIndex === -1) return false; // Invalid bidder
        if ((bidderIndex % 2) === (lastBidderIndex % 2)) return false; // Cannot double partner
    }
    // Redouble Check
    if (bid === 'XX') {
         const lastBidData = currentAuction[currentAuction.length - 1];
         if (!lastBidData || lastBidData.bid !== 'X') return false; // Must redouble a double
         const bidderIndex = playersOrder.indexOf(bidder);
         const lastDoublerIndex = playersOrder.indexOf(lastBidData.bidder);
         if (bidderIndex === -1 || lastDoublerIndex === -1) return false; // Invalid bidder
         if ((bidderIndex % 2) === (lastDoublerIndex % 2)) return false; // Cannot redouble partner's double
    }

    return true;
};


/**
 * Checks if a hand contains a stopper in the given suit.
 * Assumes hand is an array of card objects {suit, rank}.
 * suitLengths is an optional object like {S: 4, H: 3, ...} for efficiency.
 */
export const hasStopper = (hand, suit, suitLengths) => {
    if (!hand || !suit || !Array.isArray(hand)) return false;
    // Ensure suitLengths is an object if provided, otherwise calculate from hand
    const useSuitLengths = typeof suitLengths === 'object' && suitLengths !== null;
    const suitLen = useSuitLengths ? (suitLengths[suit] || 0) : hand.filter(c => c && c.suit === suit).length;

    // Defensive check for card objects and rank property
    const getRank = (card) => card && typeof card.rank === 'string' ? card.rank : null;

    return (
        hand.some(c => c && c.suit === suit && getRank(c) === 'A') ||
        (hand.some(c => c && c.suit === suit && getRank(c) === 'K') && suitLen >= 2) ||
        (hand.some(c => c && c.suit === suit && getRank(c) === 'Q') && suitLen >= 3) ||
        (hand.some(c => c && c.suit === suit && getRank(c) === 'J') && suitLen >= 4)
    );
};


/**
 * Checks if a suit in a hand has good quality (typically 5+ cards with 2+ top honors).
 * Assumes hand is an array of card objects {suit, rank}.
 * suitLengths is an optional object like {S: 4, H: 3, ...} for efficiency.
 */
export const hasGoodSuitQuality = (hand, suit, suitLengths) => {
     if (!hand || !suit || !Array.isArray(hand)) return false;
     // Ensure suitLengths is an object if provided, otherwise calculate from hand
     const useSuitLengths = typeof suitLengths === 'object' && suitLengths !== null;
     const suitLen = useSuitLengths ? (suitLengths[suit] || 0) : hand.filter(c => c && c.suit === suit).length;

     if (suitLen < 5) return false; // Minimum length for good quality usually 5

     // Defensive check for card objects and rank property
     const getRank = (card) => card && typeof card.rank === 'string' ? card.rank : null;
     const honors = hand.filter(c => c && c.suit === suit && ['A', 'K', 'Q'].includes(getRank(c)));
     return honors.length >= 2;
};

/**
 * Calculates length points for suits of 5+ cards.
 * Assumes suitLengths is an object like {S: 5, H: 4, ...}
 */
export const calculateLengthPoints = (suitLengths) => {
    let lengthPoints = 0;
    if (typeof suitLengths !== 'object' || suitLengths === null) return 0; // Guard against invalid input
    for (const suit in suitLengths) {
        // Ensure the property belongs to the object and is a number
        if (Object.hasOwnProperty.call(suitLengths, suit) && typeof suitLengths[suit] === 'number') {
            if (suitLengths[suit] >= 5) {
                lengthPoints += suitLengths[suit] - 4;
            }
        }
    }
    return lengthPoints;
};

/**
 * Calculates High Card Points (HCP) for a hand.
 * Assumes hand is an array of card objects {suit, rank}.
 */
export const calculateHCP = (hand) => {
    if (!hand || !Array.isArray(hand)) return 0;
    let hcp = 0;
    const points = { 'A': 4, 'K': 3, 'Q': 2, 'J': 1 };
    for (const card of hand) {
        // Defensive check for card object and rank property
        if (card && card.rank && typeof card.rank === 'string') {
            hcp += points[card.rank] || 0;
        }
    }
    return hcp;
};

// --- Acol Opening Bid Logic ---
export const getOpeningBid = (hand, hcp, suitLengths, isBalanced) => {
    let bid = 'Pass'; // Default

    // Rule of 20 (HCP + length of two longest suits >= 20) - Simplified check
    const lengths = Object.values(suitLengths).sort((a, b) => b - a);
    const ruleOf20 = hcp + (lengths[0] || 0) + (lengths[1] || 0) >= 20;

    // Strong 2♣ (Acol: Typically 23+ HCP, or game force hand)
    if (hcp >= 23 && isValidBid('2C', [], '')) { // Auction is empty for opening
        bid = '2C';
    }
    // Weak Twos (Acol: 6-10 HCP, good 6-card suit)
    else if (hcp >= 6 && hcp <= 10) {
        if (suitLengths.S >= 6 && hasGoodSuitQuality(hand, 'S', suitLengths) && isValidBid('2S', [], '')) bid = '2S';
        else if (suitLengths.H >= 6 && hasGoodSuitQuality(hand, 'H', suitLengths) && isValidBid('2H', [], '')) bid = '2H';
        else if (suitLengths.D >= 6 && hasGoodSuitQuality(hand, 'D', suitLengths) && isValidBid('2D', [], '')) bid = '2D';
        // Acol doesn't typically use Weak 2C
    }
    // 1NT Opening (Acol: 12-14 balanced OR 15-17 balanced) - Simplified to 12-14 for now
    else if (hcp >= 12 && hcp <= 14 && isBalanced && isValidBid('1NT', [], '')) {
        bid = '1NT';
    }
    // TODO: Add 15-17 1NT logic if needed
    // 1 of a Suit Opening (12+ HCP, usually 5+ card suit or good 4-card minor)
    else if (hcp >= 12 || ruleOf20) { // Open with 12+ or if Rule of 20 applies
        // Priority: 5+ card major
        if (suitLengths.S >= 5 && isValidBid('1S', [], '')) bid = '1S';
        else if (suitLengths.H >= 5 && isValidBid('1H', [], '')) bid = '1H';
        // Then 5+ card minor (longer first)
        else if (suitLengths.D >= 5 && suitLengths.D >= suitLengths.C && isValidBid('1D', [], '')) bid = '1D';
        else if (suitLengths.C >= 5 && isValidBid('1C', [], '')) bid = '1C';
        // Then 4-card suits (Acol: usually 4-card majors only if no 5-card suit, or best 4-card minor)
        // Simplified: Open best 4-card minor if no 5-card suit
        else if (suitLengths.D >= 4 && suitLengths.D >= suitLengths.C && isValidBid('1D', [], '')) bid = '1D';
        else if (suitLengths.C >= 4 && isValidBid('1C', [], '')) bid = '1C';
        // TODO: Acol specifics like opening 1H/1S with only 4 cards in specific balanced scenarios
    }

    console.log(`Decided opening bid: ${bid}`); // Removed bidder dependency
    return bid; // Returns 'Pass' if no other condition met
};

// --- Acol Response Logic (Helper for 2C responses) ---
export const determineBestPositiveResponse = (hand, hcp, suitLengths, isBalanced, currentAuction, bidder) => {
    let response = 'Pass'; // Default

    // Acol Positive Responses to 2C (8+ HCP)
    // Priority: 5+ card suit
    if (suitLengths.S >= 5 && isValidBid('2S', currentAuction, bidder)) response = '2S';
    else if (suitLengths.H >= 5 && isValidBid('2H', currentAuction, bidder)) response = '2H';
    else if (suitLengths.D >= 5 && isValidBid('2D', currentAuction, bidder)) response = '2D'; // Note: 2D is negative, this needs care
    else if (suitLengths.C >= 5 && isValidBid('3C', currentAuction, bidder)) response = '3C'; // Need 3 level
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
};

// --- Acol Response Logic (Helper for NT responses) ---
export const determineNTResponse = (hand, hcp, suitLengths, isBalanced, partnerBid, currentAuction, bidder) => {
    let response = 'Pass';
    const has4CardMajor = suitLengths.H >= 4 || suitLengths.S >= 4;
    const has5CardMajor = suitLengths.H >= 5 || suitLengths.S >= 5;

    // --- Check for Slam Interest to initiate Gerber ---
    const estimatedPartnerMinPoints = (partnerBid === '1NT') ? 12 : 20; // Simplified
    // const estimatedPartnerMaxPoints = (partnerBid === '1NT') ? 14 : 22; // Simplified (Needs adjustment for 15-17 opener if that logic changes)
    const totalMinPoints = hcp + estimatedPartnerMinPoints;
    // const totalMaxPoints = hcp + estimatedPartnerMaxPoints; // Removed - unused
    const hasSlamInterest = totalMinPoints >= 33; // Basic check for small slam points

    if (hasSlamInterest && isValidBid('4C', currentAuction, bidder)) {
        console.log(`Computer (${bidder}) has slam interest (${totalMinPoints}+ pts) over partner's ${partnerBid}, initiating Gerber (4C)`);
        return '4C'; // Initiate Gerber and exit this function
    }
    // --- End Gerber Initiation Check ---


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
};

// --- Acol Response/Competitive Logic ---
export const getResponseOrCompetitiveBid = (hand, hcp, suitLengths, isBalanced, currentAuction, bidder, vulnerability) => {
    console.log(`Computer (${bidder}) evaluating Response/Competitive Bid. HCP: ${hcp}`);
    let bid = 'Pass'; // Default action

    if (!Array.isArray(currentAuction)) {
        console.error("getResponseOrCompetitiveBid called with non-array auction:", currentAuction);
        return 'Pass'; // Cannot determine bid if auction data is invalid
    }

    const partner = playersOrder[(playersOrder.indexOf(bidder) + 2) % 4];
    const partnerLastBidData = [...currentAuction].reverse().find(b => b && b.bidder === partner);
    const partnerLastBid = partnerLastBidData?.bid;
    const myLastBidData = [...currentAuction].reverse().find(b => b && b.bidder === bidder);
    const myLastBid = myLastBidData?.bid; // Bidder's own last bid

    // --- Gerber Response Logic ---
    // Check if partner just bid 4C (Gerber) and I previously bid 1NT or 2NT
    if (partnerLastBid === '4C') {
        const myNTBidData = [...currentAuction].find(b => b && b.bidder === bidder && (b.bid === '1NT' || b.bid === '2NT'));
        if (myNTBidData) {
            console.log(`Computer (${bidder}) Responding to Gerber (4C) after my ${myNTBidData.bid}`);
            const aceCount = hand.filter(c => c && c.rank === 'A').length;
            let gerberResponse = 'Pass'; // Fallback

            if (aceCount === 0 || aceCount === 4) gerberResponse = '4D';
            else if (aceCount === 1) gerberResponse = '4H';
            else if (aceCount === 2) gerberResponse = '4S';
            else if (aceCount === 3) gerberResponse = '4NT'; // Note: 4NT response to Gerber

            if (isValidBid(gerberResponse, currentAuction, bidder)) {
                console.log(`Computer (${bidder}) has ${aceCount} Aces, responding ${gerberResponse}`);
                return gerberResponse; // Return the Gerber response directly
            } else {
                console.warn(`Computer (${bidder}) could not make valid Gerber response ${gerberResponse}`);
                // Fall through is dangerous, maybe pass? Needs review.
            }
        }
    }

    // --- Gerber King Ask Response Logic ---
    // Check if partner just bid 5C (Gerber King Ask) and I previously responded to 4C
    if (partnerLastBid === '5C') {
        const myGerberResponseData = [...currentAuction].reverse().find(b =>
            b && b.bidder === bidder && ['4D', '4H', '4S', '4NT'].includes(b.bid) &&
            currentAuction.slice(0, currentAuction.length - 1).find(prev => prev && prev.bidder === partner && prev.bid === '4C') // Check 4C was bid before my response
        );
        if (myGerberResponseData) {
            console.log(`Computer (${bidder}) Responding to Gerber King Ask (5C)`);
            const kingCount = hand.filter(c => c && c.rank === 'K').length;
            let kingResponse = 'Pass'; // Fallback

            if (kingCount === 0 || kingCount === 4) kingResponse = '5D';
            else if (kingCount === 1) kingResponse = '5H';
            else if (kingCount === 2) kingResponse = '5S';
            else if (kingCount === 3) kingResponse = '5NT';

            if (isValidBid(kingResponse, currentAuction, bidder)) {
                console.log(`Computer (${bidder}) has ${kingCount} Kings, responding ${kingResponse}`);
                return kingResponse; // Return the King response
            } else {
                console.warn(`Computer (${bidder}) could not make valid Gerber King response ${kingResponse}`);
            }
        }
    }


    // --- Blackwood Response Logic ---
    // Check if partner just bid 4NT (Blackwood)
    if (partnerLastBid === '4NT') {
        // Simple check for established suit fit: Did partnership bid/raise the same suit >= 3 level?
        let suitFitEstablished = false;
        let agreedSuit = null;
        const partnerSuitBids = currentAuction.filter(b => b.bidder === partner && b.bid.length === 2 && !b.bid.includes('NT')).map(b => ({ bid: b.bid, rank: getBidRank(b.bid) }));
        const mySuitBids = currentAuction.filter(b => b.bidder === bidder && b.bid.length === 2 && !b.bid.includes('NT')).map(b => ({ bid: b.bid, rank: getBidRank(b.bid) }));

        for(const suit of SUITS) {
            const partnerBidsInSuit = partnerSuitBids.filter(b => b.bid.charAt(1) === suit);
            const myBidsInSuit = mySuitBids.filter(b => b.bid.charAt(1) === suit);
            if (partnerBidsInSuit.length > 0 && myBidsInSuit.length > 0) {
                const highestPartnerRank = Math.max(...partnerBidsInSuit.map(b => b.rank), -1);
                const highestMyRank = Math.max(...myBidsInSuit.map(b => b.rank), -1);
                // Check if suit raised to 3 level or higher by either partner
                if (highestPartnerRank >= getBidRank(`3${suit}`) || highestMyRank >= getBidRank(`3${suit}`)) {
                    suitFitEstablished = true;
                    agreedSuit = suit;
                    break;
                }
            }
        }
        // Add check for direct game raise (e.g., 1H - 4H)
        if (!suitFitEstablished && myLastBid && myLastBid.length === 2 && myLastBid.charAt(0) === '4' && MAJORS.includes(myLastBid.charAt(1))) {
             const partnerOpening = currentAuction.find(b => b.bidder === partner && b.bid === `1${myLastBid.charAt(1)}`);
             if (partnerOpening) {
                 suitFitEstablished = true;
                 agreedSuit = myLastBid.charAt(1);
             }
        }


        if (suitFitEstablished) { // Only respond if fit is likely established
            console.log(`Computer (${bidder}) Responding to Blackwood (4NT), agreed suit likely ${agreedSuit}`);
            const aceCount = hand.filter(c => c && c.rank === 'A').length;
            let blackwoodResponse = 'Pass'; // Fallback

            // Standard Responses
            if (aceCount === 0 || aceCount === 4) blackwoodResponse = '5C';
            else if (aceCount === 1) blackwoodResponse = '5D';
            else if (aceCount === 2) blackwoodResponse = '5H';
            else if (aceCount === 3) blackwoodResponse = '5S';

            if (isValidBid(blackwoodResponse, currentAuction, bidder)) {
                console.log(`Computer (${bidder}) has ${aceCount} Aces, responding ${blackwoodResponse}`);
                return blackwoodResponse; // Return the Blackwood response
            } else {
                console.warn(`Computer (${bidder}) could not make valid Blackwood response ${blackwoodResponse}`);
            }
        } else {
            console.log(`Computer (${bidder}) Interpreting 4NT as natural/quantitative (no clear suit fit found)`);
            // Fall through to treat 4NT as natural (e.g., raise partner's NT bid)
        }
    }

    // --- Blackwood King Ask Response Logic ---
    // Check if partner just bid 5NT (Blackwood King Ask) and I previously responded to 4NT
    if (partnerLastBid === '5NT') {
        const myBlackwoodResponseData = [...currentAuction].reverse().find(b =>
            b && b.bidder === bidder && ['5C', '5D', '5H', '5S'].includes(b.bid) &&
            currentAuction.slice(0, currentAuction.length - 1).find(prev => prev && prev.bidder === partner && prev.bid === '4NT') // Check 4NT was bid before my response
        );
        if (myBlackwoodResponseData) {
            console.log(`Computer (${bidder}) Responding to Blackwood King Ask (5NT)`);
            const kingCount = hand.filter(c => c && c.rank === 'K').length;
            let kingResponse = 'Pass'; // Fallback

            // Standard Responses
            if (kingCount === 0 || kingCount === 4) kingResponse = '6C';
            else if (kingCount === 1) kingResponse = '6D';
            else if (kingCount === 2) kingResponse = '6H';
            else if (kingCount === 3) kingResponse = '6S';

            if (isValidBid(kingResponse, currentAuction, bidder)) {
                console.log(`Computer (${bidder}) has ${kingCount} Kings, responding ${kingResponse}`);
                return kingResponse; // Return the King response
            } else {
                console.warn(`Computer (${bidder}) could not make valid Blackwood King response ${kingResponse}`);
            }
        }
    }

    // --- Check if I should initiate King Ask ---
    if (myLastBid === '4C' && ['4D', '4H', '4S', '4NT'].includes(partnerLastBid)) {
        // TODO: Add check to ensure we have enough Aces+Kings for slam based on partner's response
        if (isValidBid('5C', currentAuction, bidder)) {
            console.log(`Computer (${bidder}) initiating Gerber King Ask (5C)`);
            return '5C';
        }
    }
    if (myLastBid === '4NT' && ['5C', '5D', '5H', '5S'].includes(partnerLastBid)) {
        // TODO: Add check based on partner's Ace response
        if (isValidBid('5NT', currentAuction, bidder)) {
            console.log(`Computer (${bidder}) initiating Blackwood King Ask (5NT)`);
            return '5NT';
        }
    }

    // --- Existing Logic Starts Here ---
    // const partner = playersOrder[(playersOrder.indexOf(bidder) + 2) % 4]; // Moved up

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

             // --- Opener Rebid Logic ---

             // Case 1: Opener opened 1NT
             if (myOpeningBid === '1NT') {
                 // Partner responded 2C (Stayman)
                 if (partnerLastBid === '2C') {
                     console.log(`Computer (${bidder}) Rebidding after 1NT - 2C (Stayman)`);
                     if (suitLengths.H >= 4 && isValidBid('2H', currentAuction, bidder)) {
                         bid = '2H'; // Show 4 Hearts (might also have 4 Spades)
                     } else if (suitLengths.S >= 4 && isValidBid('2S', currentAuction, bidder)) {
                         bid = '2S'; // Show 4 Spades (but not 4 Hearts)
                     } else if (isValidBid('2D', currentAuction, bidder)) {
                         bid = '2D'; // Deny 4-card major
                     }
                 }
                 // Partner responded 2D (Transfer to Hearts)
                 else if (partnerLastBid === '2D') {
                      console.log(`Computer (${bidder}) Accepting Heart transfer (1NT - 2D)`);
                      bid = isValidBid('2H', currentAuction, bidder) ? '2H' : 'Pass'; // Usually mandatory accept
                      // TODO: Add super-accept logic (e.g., jump to 3H with max + 4 hearts)
                 }
                 // Partner responded 2H (Transfer to Spades)
                 else if (partnerLastBid === '2H') {
                      console.log(`Computer (${bidder}) Accepting Spade transfer (1NT - 2H)`);
                      bid = isValidBid('2S', currentAuction, bidder) ? '2S' : 'Pass'; // Usually mandatory accept
                      // TODO: Add super-accept logic
                 }
                 // TODO: Handle other responses like 2S (minors), 2NT (invite), 3C/D/H/S (GF), 3NT (to play)
             }
             // Case 2: Opener opened a suit
             else if (myOpeningBid.length === 2 && !myOpeningBid.includes('NT')) {
                 // Sub-case 2a: Raise Partner's Suit Response?
                 if (partnerSuit && partnerSuit !== 'NT') {
                     const supportCount = suitLengths[partnerSuit] || 0;
                     if (supportCount >= 4 && hcp >= 15 && hcp <= 17) { // Simple Invitational+ Raise (e.g., 1S-2H; 3H)
                         const targetBid = `${partnerLevel + 1}${partnerSuit}`;
                         if (isValidBid(targetBid, currentAuction, bidder)) bid = targetBid;
                     } else if (supportCount >= 3 && hcp >= 12 && hcp <= 14) { // Simple Minimum Raise (e.g., 1S-2C; 2C) - Needs refinement
                         const raiseBid = `${partnerLevel + (partnerLevel === 1 ? 1 : 0)}${partnerSuit}`; // Simplistic raise
                         if (isValidBid(raiseBid, currentAuction, bidder)) bid = raiseBid;
                     }
                 }
                 // Sub-case 2b: Specific Case: 1S -> 2H response -> Rebid 2NT (15-16 pts, no fit)
                 else if (bid === 'Pass' && myOpeningBid === '1S' && partnerLastBid === '2H') {
                     if (hcp >= 15 && hcp <= 16 && (suitLengths['H'] || 0) < 3) {
                         if (isValidBid('2NT', currentAuction, bidder)) { // Add stopper check later
                             bid = '2NT';
                         }
                     }
                 }
                 // Sub-case 2c: Rebid own suit? (Simple minimum rebid)
                 else if (bid === 'Pass') { // Only if no other bid found yet
                     const openedSuit = myOpeningBid.charAt(1);
                     if (suitLengths[openedSuit] >= 6 && hcp >= 12 && hcp <= 14) { // Minimum hand, 6+ card suit
                         const targetBid = `2${openedSuit}`;
                         if (isValidBid(targetBid, currentAuction, bidder)) bid = targetBid;
                     }
                 }
                 // TODO: Add more rebid logic: New suits, NT rebids, Jumps etc.
             }
             // TODO: Handle rebids after 2C opening, Weak Twos etc.

         }
         // Fallback if no specific rebid found yet
         if (bid === 'Pass') {
             console.log(`Computer (${bidder}) No specific rebid found, passing (NEEDS MORE LOGIC)`);
             bid = 'Pass';
         }
    }
    // --- B. Partner Opened, No Intervention ---
    else if (partnerOpened && !opponentIntervened && bidderFirstBidIndex === -1) { // Block B: Initial Response only
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
    // --- B2. Partner Opened, I Responded, Partner Rebid (Responder's Rebid) ---
    // This handles the case: N: 1H -> S: 2D -> N: 2H -> S: ?
    // Now a top-level condition
    else if (partnerOpened && !opponentIntervened && bidderFirstBidIndex !== -1 && lastActualBidder === partner) { // Block B2: Responder's Rebid
        const myFirstBidData = currentAuction[bidderFirstBidIndex];
        const myFirstBid = myFirstBidData?.bid;
        const partnerOpeningBidData = currentAuction[partnerFirstBidIndex];
        const partnerOpeningBid = partnerOpeningBidData?.bid;
        const partnerRebid = partnerLastBid; // Partner's most recent bid

        console.log(`Computer (${bidder}) Making Responder's Rebid over partner's opening ${partnerOpeningBid} and rebid ${partnerRebid}, my first bid was ${myFirstBid}`);
// Estimate partner's points based on their rebid (Simplified)
let partnerMinPoints = 12;
let partnerMaxPoints = 19; // Default opening range
if (partnerRebid && partnerOpeningBid && partnerRebid.length === 2 && partnerOpeningBid.length === 2) {
const rebidLevel = parseInt(partnerRebid.charAt(0), 10);
const openingLevel = parseInt(partnerOpeningBid.charAt(0), 10);
// Simple minimum rebid (e.g., 1H -> 2H) usually shows minimum points (12-14)
if (rebidLevel === openingLevel + 1 && partnerRebid.charAt(1) === partnerOpeningBid.charAt(1)) {
     partnerMinPoints = 12;
     partnerMaxPoints = 14;
     console.log(`Computer (${bidder}) estimates partner has minimum opening (12-14) based on rebid ${partnerRebid}`);
}
// TODO: Add logic for jump rebids (e.g., 1H -> 3H shows 15-17), NT rebids etc.
}

const totalMinPoints = hcp + partnerMinPoints;
const totalMaxPoints = hcp + partnerMaxPoints;

// Game Zone Check (Simplified: 25+ points)
if (totalMinPoints >= 25) {
console.log(`Computer (${bidder}) In Game Zone (${totalMinPoints}-${totalMaxPoints} points)`);

// --- Check for Slam Interest to initiate Blackwood ---
let suitFitEstablished = false;
let agreedSuit = null;
 // Simple check: Did partnership bid/raise the same suit >= 3 level?
const partnerSuitBidsBW = currentAuction.filter(b => b.bidder === partner && b.bid.length === 2 && !b.bid.includes('NT')).map(b => ({ bid: b.bid, rank: getBidRank(b.bid) }));
const mySuitBidsBW = currentAuction.filter(b => b.bidder === bidder && b.bid.length === 2 && !b.bid.includes('NT')).map(b => ({ bid: b.bid, rank: getBidRank(b.bid) }));
for(const suit of SUITS) {
    const partnerBidsInSuit = partnerSuitBidsBW.filter(b => b.bid.charAt(1) === suit);
    const myBidsInSuit = mySuitBidsBW.filter(b => b.bid.charAt(1) === suit);
    if (partnerBidsInSuit.length > 0 && myBidsInSuit.length > 0) {
        const highestPartnerRank = Math.max(...partnerBidsInSuit.map(b => b.rank), -1);
        const highestMyRank = Math.max(...myBidsInSuit.map(b => b.rank), -1);
        if (highestPartnerRank >= getBidRank(`3${suit}`) || highestMyRank >= getBidRank(`3${suit}`)) {
            suitFitEstablished = true;
            agreedSuit = suit;
            break;
        }
    }
}
 // Add check for direct game raise (e.g., 1H - 4H)
 const myFirstBidDataBW = currentAuction[bidderFirstBidIndex];
 const myFirstBidBW = myFirstBidDataBW?.bid;
 if (!suitFitEstablished && myFirstBidBW && myFirstBidBW.length === 2 && myFirstBidBW.charAt(0) === '4' && MAJORS.includes(myFirstBidBW.charAt(1))) {
     const partnerOpeningBW = currentAuction.find(b => b.bidder === partner && b.bid === `1${myFirstBidBW.charAt(1)}`);
     if (partnerOpeningBW) {
         suitFitEstablished = true;
         agreedSuit = myFirstBidBW.charAt(1);
     }
 }

const hasSlamInterest = totalMinPoints >= 33; // Basic check for small slam points

if (suitFitEstablished && hasSlamInterest && isValidBid('4NT', currentAuction, bidder)) {
    console.log(`Computer (${bidder}) has slam interest (${totalMinPoints}+ pts) with agreed suit ${agreedSuit}, initiating Blackwood (4NT)`);
    return '4NT'; // Initiate Blackwood and exit this block
}
// --- End Blackwood Initiation Check ---

// Continue with normal Game Zone logic if Blackwood not initiated
 // console.log(`Computer (${bidder}) In Game Zone (${totalMinPoints}-${totalMaxPoints} points)`); // This console log might be redundant now
 // Priority 1: Bid 3NT if balanced and stoppers (simplified check)
 const partnerSuit = partnerOpeningBid.charAt(1);
 const hasStopperInUnbid = SUITS.every(s => s === partnerSuit || (suitLengths[s] || 0) > 0 || hasStopper(hand, s, suitLengths)); // Very basic stopper check
 if (isBalanced && hasStopperInUnbid && isValidBid('3NT', currentAuction, bidder)) {
     bid = '3NT';
 }
    // Priority 2: Raise partner's major to game if fit (3+ cards)
    else if (MAJORS.includes(partnerSuit) && (suitLengths[partnerSuit] || 0) >= 3) {
        const gameBid = `4${partnerSuit}`;
        if (isValidBid(gameBid, currentAuction, bidder)) {
            bid = gameBid;
        }
    }
    // Priority 3: Rebid own good suit (6+ cards) at appropriate level? Needs care.
    // Example: 1H-2D; 2H-3D (forcing)
    else if (myFirstBid.length === 2 && myFirstBid.charAt(1) !== 'NT' && (suitLengths[myFirstBid.charAt(1)] || 0) >= 6) {
        const mySuit = myFirstBid.charAt(1);
        const targetBid = `3${mySuit}`; // Forcing rebid
        if (isValidBid(targetBid, currentAuction, bidder)) {
            bid = targetBid;
        }
    }
    // Fallback if game bid not obvious (e.g., bid cheapest 4-card suit as a temporizer?) - Needs more advanced logic
    else if (bid === 'Pass') {
        // As a fallback for 18 points, 3NT is often reasonable if balanced.
        if (isBalanced && isValidBid('3NT', currentAuction, bidder)) {
            bid = '3NT';
        }
        // Or raise partner if possible
        else if (MAJORS.includes(partnerSuit) && (suitLengths[partnerSuit] || 0) >= 3 && isValidBid(`4${partnerSuit}`, currentAuction, bidder)) {
            bid = `4${partnerSuit}`;
        }
        // Last resort - maybe just bid 3NT anyway if points are high? Risky.
        else if (isValidBid('3NT', currentAuction, bidder)) {
            console.warn(`Computer (${bidder}) making fallback 3NT bid with ${hcp} points`);
            bid = '3NT';
        }
    }
 // Note: The closing brace for the inner 'if (bid === 'Pass')' was removed by this revert
} // End of Game Zone Check
        // Invitational Zone Check (Simplified: 23-24 points total)
        else if (totalMinPoints >= 23 && totalMaxPoints >= 23) { // Aiming for 25
             console.log(`Computer (${bidder}) In Invitational Zone (${totalMinPoints}-${totalMaxPoints} points)`);
             const partnerSuit = partnerOpeningBid.charAt(1);
             // Priority 1: Bid 2NT if balanced and stoppers
             if (isBalanced && isValidBid('2NT', currentAuction, bidder)) { // Add stopper check later
                 bid = '2NT';
             }
             // Priority 2: Raise partner's major invitational level (3H/3S)
             else if (MAJORS.includes(partnerSuit) && (suitLengths[partnerSuit] || 0) >= 3) {
                 const inviteBid = `3${partnerSuit}`;
                 if (isValidBid(inviteBid, currentAuction, bidder)) {
                     bid = inviteBid;
                 }
             }
             // Priority 3: Rebid own suit invitational level? (e.g. 1H-2C; 2H-3C)
             else if (myFirstBid.length === 2 && myFirstBid.charAt(1) !== 'NT' && (suitLengths[myFirstBid.charAt(1)] || 0) >= 6) {
                 const mySuit = myFirstBid.charAt(1);
                 const targetBid = `3${mySuit}`;
                 if (isValidBid(targetBid, currentAuction, bidder)) {
                     bid = targetBid;
                 }
             }
        }
        // Minimum Zone (Below invitational)
        else {
             console.log(`Computer (${bidder}) In Minimum Zone (${totalMinPoints}-${totalMaxPoints} points), passing.`);
             bid = 'Pass'; // Default action if not inviting or game-forcing
        }

        // Final check if still Pass, ensure minimum action taken if required (e.g. 2NT over 1H-1S; 2H)
        if (bid === 'Pass' && hcp >= 10) { // Should generally not pass with 10+
             console.warn(`Computer (${bidder}) reconsidering Pass with ${hcp} points in Responder Rebid`);
             // Add minimal rebid logic if needed, e.g., rebid 2NT if possible
             if (isBalanced && isValidBid('2NT', currentAuction, bidder)) {
                 bid = '2NT';
             }
             // Or rebid own suit minimally?
             else if (myFirstBid.length === 2 && myFirstBid.charAt(1) !== 'NT' && (suitLengths[myFirstBid.charAt(1)] || 0) >= 5) {
                 const mySuit = myFirstBid.charAt(1);
                 const targetBid = `2${mySuit}`; // Check if this is valid level
                 if (isValidBid(targetBid, currentAuction, bidder)) {
                     // Ensure this isn't lower than partner's rebid!
                     if (getBidRank(targetBid) > getBidRank(partnerRebid)) {
                        bid = targetBid;
                     }
                 }
             }
        }
   } // End of Reconsidering Pass block

// TODO: Responses to Weak Twos, other openings (Moved comment here)

} // End of Responder's Rebid block (nested inside Block B)
// Removed redundant closing brace for original Block B

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
};

// --- Main Computer Bid Dispatcher ---
/**
 * Determines the computer's next bid based on the current game state.
 * @param {object} hands - Object containing hands for N, E, S, W.
 * @param {string} nextBidder - The player whose turn it is ('N', 'E', 'S', 'W').
 * @param {boolean} isAuctionOver - Flag indicating if the auction has ended.
 * @param {array} auction - Array of bid objects {bidder, bid}.
 * @param {string} dealer - The dealer for the current hand.
 * @param {string} vulnerability - The vulnerability status ('None', 'NS', 'EW', 'Both').
 * @returns {string} The computer's calculated bid ('Pass', '1C', 'X', etc.).
 */
export const getComputerBid = (hands, nextBidder, isAuctionOver, auction, dealer, vulnerability) => {
    const computerHand = hands[nextBidder];
    if (!computerHand || computerHand.length === 0 || isAuctionOver) return 'Pass'; // Safety check

    const computerHCP = calculateHCP(computerHand);
    const suitLengths = { S: 0, H: 0, D: 0, C: 0 };
    computerHand.forEach(card => {
        if (card && card.suit) { suitLengths[card.suit]++; }
    });
    const lengths = Object.values(suitLengths);
    // Refined balanced check
    const isBalanced = lengths.every(l => l >= 2) && lengths.filter(l => l === 2).length <= 1 && !lengths.some(l => l >=6);

    // Determine situation: Opening, Responding, Competitive
    const isDealerOpening = (dealer === nextBidder && auction.length === 0);
    const isNonDealerOpening = (dealer !== nextBidder &&
                                Array.isArray(auction) &&
                                auction.length > 0 &&
                                auction.every(b => b && b.bid === 'Pass'));
    const isOpening = isDealerOpening || isNonDealerOpening;

    if (isOpening) {
        return getOpeningBid(computerHand, computerHCP, suitLengths, isBalanced);
    } else {
        // Pass necessary context to the response/competitive logic function
        return getResponseOrCompetitiveBid(computerHand, computerHCP, suitLengths, isBalanced, auction, nextBidder, vulnerability);
    }
};