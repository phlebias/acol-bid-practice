// testOpenerRebid.js
// Simple script to test the opener's rebid logic before and after refactoring.

// We need to mock or replicate the necessary parts of the bidding logic
// IMPORTANT: Adjust the path if biddingLogic.js is located differently relative to the root
import { getComputerBid } from './src/utils/biddingLogic.js';
// Importing helpers directly from bridgeUtils is cleaner if needed
// import { calculateHCP, getSuitLengths, isHandBalanced } from './src/utils/bridgeUtils.js';

// --- Test Scenario ---
const hands = {
    N: ['SK', 'SQ', 'SJ', 'ST', 'HA', 'H5', 'DK', 'DQ', 'DT', 'D9', 'C8', 'C7'], // 15 HCP
    E: [], // Not relevant for N's bid
    S: ['SA', 'S9', 'S8', 'S7', 'HK', 'HQ', 'HT', 'DJ', 'D8', 'CJ', 'C9', 'C2'], // 11 HCP
    W: []  // Not relevant for N's bid
};

const currentAuction = [
    { bidder: 'N', bid: '1D' },
    { bidder: 'E', bid: 'Pass' },
    { bidder: 'S', bid: '1S' },
    { bidder: 'W', bid: 'Pass' }
];

const nextBidder = 'N';
const vulnerability = 'None';
const dealer = 'N';

// --- Run Test ---
console.log("--- Running Opener Rebid Test ---");
console.log("Scenario: N opens 1D, S responds 1S. Next bidder: N.");
console.log("N's Hand:", hands.N.join(' '));

try {
    // Call the main entry point function
    const computerBid = getComputerBid(hands, nextBidder, false, currentAuction, dealer, vulnerability);
    console.log(`\n>>> Current logic suggests N should rebid: ${computerBid}`);
} catch (error) {
    console.error("\nError during bidding logic execution:", error);
}

console.log("--- Test Complete ---");
