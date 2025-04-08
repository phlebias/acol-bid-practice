     // ... rest of the code remains the same ...

import {
    calculateHCP,
    getDistribution,
    getSuitLengths,
    isHandBalanced,
    getPartner,
 getOpponent, // Not used directly? LHO/RHO used?
    getLHO,
    getRHO,
    SUITS,
    MAJORS,
    DENOMINATIONS,
    getBidRank,
    isBidHigher,
    isValidBid,
    getLastActualBidData,
    findBidIndexBy,
    findLastBidBy,
    hasStopper,
    isPreemptive
} from './bridgeUtils.js';

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
    const suitLengths = getSuitLengths(computerHand);
    const isBalanced = isHandBalanced(suitLengths);

    // Determine situation: Opening, Responding, Competitive
    const isDealerOpening = (dealer === nextBidder && auction.length === 0);
    const isNonDealerOpening = (dealer !== nextBidder &&
                                Array.isArray(auction) &&
                                auction.length > 0 &&
                                auction.every(b => b && b.bid === 'Pass'));
    const isOpening = isDealerOpening || isNonDealerOpening;

    if (isOpening) {
        // Opening logic might also need biddingState if it calls helpers that expect it
        const biddingState = { [nextBidder]: { hcp: computerHCP, suitLengths, isBalanced } };
        return getOpeningBid(computerHand, computerHCP, suitLengths, isBalanced, auction, biddingState); // Add biddingState if needed by getOpeningBid
    } else {
        // Pass necessary context to the response/competitive logic function
        // Create bidding state needed by downstream functions like getOpenerRebid
        const biddingState = {
            [nextBidder]: { hcp: computerHCP, suitLengths, isBalanced }
            // Might need to calculate for partner too if getOpenerRebid uses partner's state
        };
        return getResponseOrCompetitiveBid(hands, computerHand, computerHCP, suitLengths, isBalanced, auction, nextBidder, vulnerability, biddingState);
    }
};

// ... rest of the code remains the same ...

// --- Helper: Get Response or Competitive Bid ---
/**
 * Determines the computer's bid when it's not the opener.
 * @param {object} hands - All hands.
 * @param {object} hand - Computer's hand.
 * @param {number} hcp - Computer's HCP.
 * @param {object} suitLengths - Computer's suit lengths.
 * @param {boolean} isBalanced - Is the computer's hand balanced?
 * @param {array} currentAuction - The current auction sequence.
 * @param {string} bidder - The computer's position ('N', 'E', 'S', 'W').
 * @param {string} vulnerability - The vulnerability status ('None', 'NS', 'EW', 'Both').
 * @param {object} biddingState - Object potentially holding calculated state (hcp, lengths) for players.
 * @returns {string} The calculated bid.
 */
const getResponseOrCompetitiveBid = (hands, hand, hcp, suitLengths, isBalanced, currentAuction, bidder, vulnerability, biddingState) => {
    let bid = 'Pass';
    const partner = getPartner(bidder);
    const opponent = getOpponent(bidder); // Now correctly imported
    const bidderFirstBidIndex = findBidIndexBy(bidder, currentAuction);
    const partnerFirstBidIndex = findBidIndexBy(partner, currentAuction);
    const opponentFirstBidIndex = findBidIndexBy(opponent, currentAuction);
    const iOpened = bidderFirstBidIndex === 0;
    const partnerResponded = partnerFirstBidIndex !== -1;
    const opponentIntervened = opponentFirstBidIndex !== -1 && opponentFirstBidIndex < partnerFirstBidIndex;
    const partnerLastBidData = findLastBidBy(partner, currentAuction);
    const opponentLastBidData = findLastBidBy(opponent, currentAuction);
    const partnerLastBid = partnerLastBidData?.bid;
    const opponentLastBid = opponentLastBidData?.bid;

    // ... rest of the code remains the same ...

    if (iOpened && !opponentIntervened && bidderFirstBidIndex !== -1) {
        /* Case 2: I Opened, Partner Responded, Opponents Silent - My Rebid */
        console.log(`DEBUG: Entering opener rebid logic for ${bidder}`); // Add debug
        const myOpeningBidData = findLastBidBy(bidder, currentAuction);
        const partnerLastBidData = findLastBidBy(partner, currentAuction);
        // Ensure data found before calling (should usually be true here)
        if (myOpeningBidData && partnerLastBidData) {
            const openerRebid = getOpenerRebid(bidder, hands, currentAuction, biddingState, myOpeningBidData, partnerLastBidData);
            console.log(`DEBUG: getOpenerRebid returned: ${openerRebid}`); // Add debug
            if (openerRebid && openerRebid !== 'Pass') { // Check openerRebid exists and isn't Pass
                bid = openerRebid;
                console.log(`DEBUG: Opener rebid set to: ${bid}`); // Add debug
            } else {
                console.log(`DEBUG: getOpenerRebid returned Pass or null/undefined. Bid remains: ${bid}`); // Add debug
            }
        } else {
            console.log(`DEBUG: Missing opening/partner bid data for opener rebid. Bid remains: ${bid}`);
        }
    }

    // ... rest of the code remains the same ...

    // ... (Other cases like responder's rebid, overcalls would go here if not handled by helpers) ...

    // Final decision
    if (bid !== 'Pass') {
        console.log(`Computer (${bidder}) decided bid: ${bid} (via getResponseOrCompetitiveBid)`);
    } else if (bidderFirstBidIndex === -1 && partnerFirstBidIndex === -1) {
        // This case shouldn't be reached if opening logic is separate, but as a fallback
        console.log(`Computer (${bidder}) Passing as initial action (via getResponseOrCompetitiveBid fallback)`);
    } else {
        // If it wasn't an opening, and no other bid was found, pass
        console.log(`Computer (${bidder}) Passing (via getResponseOrCompetitiveBid default/fallback)`);
    }

    return bid;
};

// ... rest of the code remains the same ...

// --- Helper: Get Overcall Bid ---
/**
 * Determines the computer's bid when in a direct overcall position
 * (Opponent opened, partner hasn't bid, computer hasn't bid).
 * @param {object} hand - Computer's hand.
 * @param {number} hcp - Computer's HCP.
 * @param {object} suitLengths - Computer's suit lengths.
 * @param {boolean} isBalanced - Is the computer's hand balanced?
 * @param {array} currentAuction - The current auction sequence.
 * @param {string} bidder - The computer's position ('N', 'E', 'S', 'W').
 * @returns {string} The calculated bid ('Pass', '1H', 'X', etc.).
 */
const getOvercallBid = (hand, hcp, suitLengths, isBalanced, currentAuction, bidder) => {
    let bid = 'Pass'; // Default
    const lastActualBidData = getLastActualBidData(currentAuction);
    const lastActualBid = lastActualBidData?.bid;
    const opponentOpenedSuit = lastActualBid.length === 2 ? lastActualBid.charAt(1) : null;
    const opponentOpenedLevel = lastActualBid.length === 2 ? parseInt(lastActualBid.charAt(0), 10) : 0;

    // 1. Simple Suit Overcall (e.g., 8-16 HCP, good 5+ card suit)
    let bestOvercallSuit = null;
    let bestOvercallSuitLength = 4; // Require 5+

    for (const suit of SUITS) {
        if (suitLengths[suit] >= 5 && suitLengths[suit] > bestOvercallSuitLength) {
             if (hcp >= 8 || suitLengths[suit] >= 6) { // Lower HCP ok with longer suit
                bestOvercallSuit = suit;
                bestOvercallSuitLength = suitLengths[suit];
             }
        }
    }

    if (bestOvercallSuit && hcp >= 8 && hcp <= 16) {
        let overcallLevel = opponentOpenedLevel;
        if (getBidRank(`${overcallLevel}${bestOvercallSuit}`) <= getBidRank(lastActualBid)) {
            overcallLevel++;
        }
        const overcallBid = `${overcallLevel}${bestOvercallSuit}`;
        if (isBidHigher(overcallBid, currentAuction)) {
             console.log(`DEBUG: Applying simple suit overcall ${overcallBid} based on rank and hand criteria.`);
             bid = overcallBid;
        } else {
             console.log(`DEBUG: Simple suit overcall ${overcallBid} blocked by isBidHigher.`);
        }
    }

    // 2. Takeout Double (e.g., 12+ HCP, support for unbid suits, short in opponent's suit)
    else if (bid === 'Pass' && hcp >= 12 && opponentOpenedSuit && (suitLengths[opponentOpenedSuit] || 0) <= 2 && isValidBid('X', currentAuction, bidder)) {
         console.log(`DEBUG: Checking Takeout Double. HCP: ${hcp}, Opponent Suit: ${opponentOpenedSuit}, Length: ${suitLengths[opponentOpenedSuit]}`);
         const unbidSuits = SUITS.filter(s => s !== opponentOpenedSuit);
         const hasSupportForAllUnbid = unbidSuits.every(s => (suitLengths[s] || 0) >= 3);
         console.log(`DEBUG: Takeout Double Checks: HasSupport=${hasSupportForAllUnbid}`);

         if (hasSupportForAllUnbid) {
             bid = 'X';
             console.log("DEBUG: Chose Takeout Double (X)");
         } else {
             console.log("DEBUG: Takeout Double conditions not fully met.");
         }
    }

    // 3. 1NT Overcall (e.g., 15-18 HCP, balanced, stopper in opponent's suit)
    else if (bid === 'Pass' && hcp >= 15 && hcp <= 18 && isBalanced && opponentOpenedSuit && hasStopper(hand, opponentOpenedSuit, suitLengths)) {
         if (isValidBid('1NT', currentAuction, bidder)) {
             bid = '1NT';
         }
    }
    // TODO: Add Weak Jump Overcalls, Michaels, UNT, etc.

    if (bid !== 'Pass') {
         console.log(`Computer (${bidder}) decided overcall: ${bid} (via getOvercallBid)`);
    } else {
         console.log(`Computer (${bidder}) decided to Pass over opponent's opening ${lastActualBid} (via getOvercallBid)`);
    }

    return bid;
};

// --- Helper: Get Responder's Rebid ---
/**
 * Determines the computer's bid when it's the responder's second turn.
 * (Partner opened, Computer responded, Partner rebid, no intervention).
 * @param {object} hand - Computer's hand.
 * @param {number} hcp - Computer's HCP.
 * @param {object} suitLengths - Computer's suit lengths.
 * @param {array} currentAuction - The current auction sequence.
 * @param {string} bidder - The computer's position ('N', 'E', 'S', 'W').
 * @param {number} bidderFirstBidIndex - Index of computer's first bid.
 * @param {number} partnerFirstBidIndex - Index of partner's opening bid.
 * @param {string} partnerLastBid - Partner's most recent bid (their rebid).
 * @returns {string} The calculated bid.
 */
const getResponderRebid = (hand, hcp, suitLengths, currentAuction, bidder, bidderFirstBidIndex, partnerFirstBidIndex, partnerLastBid) => {
    let bid = 'Pass';
    const myFirstBidData = currentAuction[bidderFirstBidIndex];
    const myFirstBid = myFirstBidData?.bid;
    const partnerOpeningBidData = currentAuction[partnerFirstBidIndex];
    const partnerOpeningBid = partnerOpeningBidData?.bid;

    console.log(`Computer (${bidder}) Making Responder's Rebid over partner's opening ${partnerOpeningBid} and rebid ${partnerLastBid}, my first bid was ${myFirstBid}`);

    // Specific check: Raise partner's 2NT rebid to 3NT if game points
    if (partnerLastBid === '2NT') {
        const totalPoints = hcp; // Simplistic, needs partner's range
        // Assume partner showed 20-22. If we have 4+, raise to 3NT
        if (totalPoints >= 4 && isValidBid('3NT', currentAuction, bidder)) {
            bid = '3NT';
        }
    }

    // Preference back to partner's first suit if minimum and they rebid a second suit
    else if (myFirstBid.length === 2 && partnerLastBid.length === 2 && myFirstBid.charAt(0) === partnerLastBid.charAt(0)) { // e.g., 1H - 1S; 2C - ?
        const myFirstSuit = myFirstBid.charAt(1);
        const partnerFirstSuit = partnerOpeningBid.charAt(1);
        const partnerSecondSuit = partnerLastBid.charAt(1);
        if (hcp <= 9) {
            if (suitLengths[partnerFirstSuit] >= suitLengths[partnerSecondSuit] && suitLengths[partnerFirstSuit] >= 3) {
                let preferenceLevel = parseInt(partnerLastBid.charAt(0), 10);
                if (getBidRank(partnerLastBid) > getBidRank(`${preferenceLevel}${partnerFirstSuit}`)) {
                    preferenceLevel++;
                }
                const preferenceBid = `${preferenceLevel}${partnerFirstSuit}`;
                if (isValidBid(preferenceBid, currentAuction, bidder)) {
                    bid = preferenceBid;
                    console.log(`DEBUG: Showing preference to partner's first suit: ${bid}`);
                }
            } else if (suitLengths[partnerSecondSuit] >= 3) {
                const supportLevel = parseInt(partnerLastBid.charAt(0), 10) + 1;
                const supportBid = `${supportLevel}${partnerSecondSuit}`;
                 if (isValidBid(supportBid, currentAuction, bidder)) {
                     bid = supportBid;
                     console.log(`DEBUG: Supporting partner's second suit: ${bid}`);
                 }
            }
        }
    }

    // TODO: Add logic for raises, new suits, NT bids based on responder's strength and partner's rebid

    if (bid === 'Pass') {
        console.log(`Computer (${bidder}) Passing as Responder's Rebid.`);
    } else {
        console.log(`Computer (${bidder}) Making Responder's Rebid: ${bid}`);
    }

    return bid;
};

// --- Helper: Get Opener's Rebid ---
/**
 * Determines the opener's rebid when partner has responded and there was no intervention.
 * @param {string} bidder - Opener's position.
 * @param {object} hands - All hands.
 * @param {array} currentAuction - The auction sequence.
 * @param {object} biddingState - Current bidding state with points etc.
 * @param {object} myOpeningBidData - The bid data object opener started with.
 * @param {object} partnerLastBidData - Partner's response data object.
 * @returns {string} The calculated rebid.
 */
const getOpenerRebid = (bidder, hands, currentAuction, biddingState, myOpeningBidData, partnerLastBidData) => {
    let bid = 'Pass';
    const hand = hands[bidder];
    const { hcp, suitLengths, isBalanced } = biddingState[bidder] || { hcp: 0, suitLengths: {}, isBalanced: false }; // Add default if state missing
    const myOpeningBid = myOpeningBidData.bid;
    const partnerLastBid = partnerLastBidData.bid;

    console.log(`Computer (${bidder}) Making Rebid over opening ${myOpeningBid} after partner bid ${partnerLastBid} (uncontested) - via getOpenerRebid`);

    if (myOpeningBid && partnerLastBid) {
        const partnerSuit = partnerLastBid.length === 2 ? partnerLastBid.charAt(1) : null;
        const partnerLevel = partnerSuit ? parseInt(partnerLastBid.charAt(0), 10) : 0;

        // Case 1: Opener opened 1NT
        if (myOpeningBid === '1NT') {
            if (partnerLastBid === '2C') {
                console.log(`Computer (${bidder}) Rebidding after 1NT - 2C (Stayman)`);
                if (suitLengths.H >= 4 && isValidBid('2H', currentAuction, bidder)) bid = '2H';
                else if (suitLengths.S >= 4 && isValidBid('2S', currentAuction, bidder)) bid = '2S';
                else if (isValidBid('2D', currentAuction, bidder)) bid = '2D';
            } else if (partnerLastBid === '2D') {
                 console.log(`Computer (${bidder}) Accepting Heart transfer (1NT - 2D)`);
                 bid = isValidBid('2H', currentAuction, bidder) ? '2H' : 'Pass';
            } else if (partnerLastBid === '2H') {
                 console.log(`Computer (${bidder}) Accepting Spade transfer (1NT - 2H)`);
                 bid = isValidBid('2S', currentAuction, bidder) ? '2S' : 'Pass';
            }
            // TODO: Handle other 1NT responses
        }
        // Case 2: Opener opened a suit
        else if (myOpeningBid.length === 2 && !myOpeningBid.includes('NT')) {
            const myOpeningLevel = parseInt(myOpeningBid.charAt(0), 10);
            const partnerBidLevel = partnerLastBid.length === 2 ? parseInt(partnerLastBid.charAt(0), 10) : 0;
            const partnerBidSuit = partnerLastBid.length === 2 ? partnerLastBid.charAt(1) : null;
            const isTwoOverOne = partnerBidLevel === 2 && myOpeningLevel === 1 && partnerBidSuit !== 'NT';
            const isOneLevelResponse = partnerBidLevel === 1;

            // Sub-case NEW: Rebid NT with 18-19 balanced
            if (isBalanced && hcp >= 18 && hcp <= 19) {
                const ntRebidLevel = isOneLevelResponse ? 2 : 3;
                const ntRebid = `${ntRebidLevel}NT`;
                if (isValidBid(ntRebid, currentAuction, bidder)) {
                    console.log(`Computer (${bidder}) Rebidding ${ntRebid} (18-19 bal)`);
                    bid = ntRebid;
                }
            }
            // Sub-case 2a: Rebid 2NT after 2-over-1 response (15-17 bal) - Only if 18-19 didn't apply
            else if (bid === 'Pass' && isTwoOverOne && isBalanced && hcp >= 15 && hcp <= 17) {
                 if (isValidBid('2NT', currentAuction, bidder)) {
                     console.log(`Computer (${bidder}) Rebidding 2NT (15-17 bal) after 2/1 response`);
                     bid = '2NT';
                 }
             }
            // Sub-case 2b: Raise Partner's Major Suit Response? (Only if NT rebid didn't apply)
            else if (bid === 'Pass' && partnerSuit && MAJORS.includes(partnerSuit)) {
                 const supportCount = suitLengths[partnerSuit] || 0;
                 console.log(`DEBUG: Opener considering raise of partner's major ${partnerSuit}. Support: ${supportCount}, HCP: ${hcp}`);
                 if (supportCount >= 4 && hcp >= 16) {
                     const targetBid = `4${partnerSuit}`;
                     if (isValidBid(targetBid, currentAuction, bidder)) {
                         console.log(`DEBUG: Opener making game raise to ${targetBid}`);
                         bid = targetBid;
                     }
                 } else if (supportCount >= 4 && hcp >= 13 && hcp <= 15) {
                      const targetBid = `${partnerLevel + 1}${partnerSuit}`;
                     if (isValidBid(targetBid, currentAuction, bidder)) {
                         console.log(`DEBUG: Opener making invitational raise to ${targetBid}`);
                         bid = targetBid;
                     }
                 } else if (supportCount >= 3 && hcp >= 12 && hcp <= 15) {
                     const raiseLevel = partnerLevel === 1 ? 2 : 3;
                     const targetBid = `${raiseLevel}${partnerSuit}`;
                     if (isValidBid(targetBid, currentAuction, bidder)) {
                         console.log(`DEBUG: Opener making minimum raise to ${targetBid}`);
                         bid = targetBid;
                     }
                 }
             }
            // Sub-case 2c: Raise Partner's Minor Suit Response? (Lower priority)
             else if (bid === 'Pass' && partnerSuit && !MAJORS.includes(partnerSuit)) {
                 const supportCount = suitLengths[partnerSuit] || 0;
                 console.log(`DEBUG: Opener considering raise of partner's minor ${partnerSuit}. Support: ${supportCount}, HCP: ${hcp}`);
                 if (supportCount >= 3 && hcp >= 12 && hcp <= 15) {
                     const raiseLevel = partnerLevel === 1 ? 2 : 3;
                     const targetBid = `${raiseLevel}${partnerSuit}`;
                     if (isValidBid(targetBid, currentAuction, bidder)) {
                          console.log(`DEBUG: Opener making minimum minor raise to ${targetBid}`);
                          bid = targetBid;
                     }
                 }
             }
            // Sub-case 2d: Specific Case: 1S -> 2H response -> Rebid 2NT (15-16 pts, no fit) - Moved down
            else if (bid === 'Pass' && myOpeningBid === '1S' && partnerLastBid === '2H' && hcp >= 15 && hcp <= 16 && (suitLengths['H'] || 0) < 3) {
                     if (isValidBid('2NT', currentAuction, bidder)) {
                          bid = '2NT';
                     }
             }
            // Sub-case 2e: Rebid own 5+ card suit? (Minimum hand, 12-15) - Only if no fit found/raised and NT not bid
            else if (bid === 'Pass') {
                 const openedSuit = myOpeningBid.charAt(1);
                 if (suitLengths[openedSuit] >= 5 && hcp >= 12 && hcp <= 15) {
                     const rebidLevel = myOpeningLevel === 1 ? 2 : 3;
                     const targetBid = `${rebidLevel}${openedSuit}`;
                     if (isValidBid(targetBid, currentAuction, bidder)) {
                          console.log(`DEBUG: Opener rebidding own suit ${targetBid}`);
                          bid = targetBid;
                     }
                 }
            }
             // TODO: Add logic for rebidding a second suit, stronger hands etc.
        }
        // TODO: Handle rebids after 2C opening, Weak Twos etc.
    }

    if (bid === 'Pass') {
        console.log(`Computer (${bidder}) No specific rebid found in getOpenerRebid, passing (NEEDS MORE LOGIC)`);
    }

    return bid;
};

/**
 * Determines the computer's opening bid.
 * @param {object} hand - Computer's hand.
 * @param {number} hcp - Computer's HCP.
 * @param {object} suitLengths - Computer's suit lengths.
 * @param {boolean} isBalanced - Is the computer's hand balanced?
 * @param {array} currentAuction - The current auction (should be empty or all passes).
 * @param {object} biddingState - Bidding state (may not be needed for opener).
 * @returns {string} The calculated opening bid.
 */
const getOpeningBid = (hand, hcp, suitLengths, isBalanced, currentAuction, biddingState) => {
    let bid = 'Pass'; // Default

    // Acol Opening Bids
    if (hcp >= 12 && hcp <= 14 && isBalanced) bid = '1NT';
    else if (hcp >= 20 && hcp <= 22 && isBalanced) bid = '2NT';
    else if (hcp >= 23 && isBalanced) bid = '2C'; // Strong 2C
    else if (hcp >= 12) {
        // Open longest suit, prioritizing majors
        let bestSuit = null;
        let bestLength = 0;
        let bestSuitIsMajor = false;

        for (const suit of SUITS) {
            const length = suitLengths[suit] || 0;
            const isMajor = MAJORS.includes(suit);
            if (length > bestLength || (length === bestLength && isMajor && !bestSuitIsMajor)) {
                if (length >= 4) { // Min length for opening
                    bestSuit = suit;
                    bestLength = length;
                    bestSuitIsMajor = isMajor;
                }
            }
        }

        if (bestSuit && bestLength >= 5) bid = `1${bestSuit}`; // Standard length
        else if (bestSuit && bestLength === 4 && !isBalanced) { // Rule of 20 for 4-card openings?
           if (hcp + bestLength >= 20) bid = `1${bestSuit}`;
           else if (suitLengths.D === 4 && bestLength < 4) bid = `1D`; // Default 4-card minor if necessary
           else if (suitLengths.C === 4 && bestLength < 4) bid = `1C`;
           // else pass
        }
        else if (!bestSuit && isBalanced && hcp >= 12) { // Fallback for 4333 hands 12-14 -> 1NT handled above, 15-17?
            if(hcp >= 15 && hcp <= 19) bid = `1C`; // Acol 1C for 15-19 bal 4333 (or open better 4 card suit)
            // Could refine this logic for 4432 etc.
        }
    }
    // TODO: Add Weak Twos

    console.log(`Computer Opening Bid: ${bid} (HCP: ${hcp}, Balanced: ${isBalanced}, Lengths: ${JSON.stringify(suitLengths)})`);
    return bid;
}

// ... rest of the code remains the same ...
