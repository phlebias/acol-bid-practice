import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { firestore } from '../firebase';
import { bridgeUtils } from './bridgeUtils'; // Added import for bridgeUtils

// Analyze a single bidding sequence
export const analyzeBiddingSequence = (auction, hands) => {
    const analysis = {
        problems: [],
        suggestions: [],
        finalContract: 'All Pass',
        totalBids: auction.length
    };

    // Find final contract
    const lastNonPassBid = auction
        .slice()
        .reverse()
        .find(bid => !['Pass', 'X', 'XX'].includes(bid.bid));

    if (lastNonPassBid) {
        analysis.finalContract = `${lastNonPassBid.bid} by ${lastNonPassBid.bidder}`;
        if (auction.slice(-1)[0].bid === 'X') {
            analysis.finalContract += ' (Doubled)';
        } else if (auction.slice(-1)[0].bid === 'XX') {
            analysis.finalContract += ' (Redoubled)';
        }
    }

    // Check for potential issues
    let consecutivePasses = 0;
    auction.forEach((bid, index) => {
        if (bid.bid === 'Pass') {
            consecutivePasses++;
        } else {
            consecutivePasses = 0;
        }

        // Check for unusual bidding patterns
        if (index > 0) {
            const prevBid = auction[index - 1];
            
            // Check for insufficient bids
            if (!['Pass', 'X', 'XX'].includes(prevBid.bid) && 
                !['Pass', 'X', 'XX'].includes(bid.bid)) {
                const prevLevel = parseInt(prevBid.bid[0]);
                const currLevel = parseInt(bid.bid[0]);
                const prevSuit = prevBid.bid.slice(1);
                const currSuit = bid.bid.slice(1);
                
                if (currLevel < prevLevel || 
                    (currLevel === prevLevel && getSuitRank(currSuit) <= getSuitRank(prevSuit))) {
                    analysis.problems.push(`Insufficient bid: ${bid.bid} by ${bid.bidder} over ${prevBid.bid}`);
                }
            }

            // Check for unusual doubles
            if (bid.bid === 'X') {
                const partnerIndex = (index - 2 + auction.length) % auction.length;
                if (partnerIndex >= 0 && auction[partnerIndex].bid === 'X') {
                    analysis.problems.push(`Unusual double: ${bid.bidder} doubled when partner had already doubled`);
                }
            }
        }
    });

    // Analyze hands if provided
    if (hands) {
        Object.entries(hands).forEach(([position, hand]) => {
            const hcp = calculateHCP(hand);
            const distribution = getDistribution(hand);
            
            // Check opening bids
            if (auction[0].bidder === position) {
                if (auction[0].bid !== 'Pass' && hcp < 12 && !isPreemptive(auction[0].bid)) {
                    analysis.problems.push(`Light opening: ${position} opened with only ${hcp} HCP`);
                }
                if (auction[0].bid === 'Pass' && hcp >= 12) {
                    analysis.problems.push(`Missed opening: ${position} passed with ${hcp} HCP`);
                }
            }
        });
    }

    return analysis;
};

// Get all bidding issues from Firebase
export const getBiddingIssues = async () => {
    try {
        const issuesQuery = query(
            collection(firestore, "bidding_issues"),
            orderBy("reportedAt", "desc")
        );
        const querySnapshot = await getDocs(issuesQuery);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Error fetching bidding issues:", error);
        throw error;
    }
};

// Helper functions
const getSuitRank = (suit) => {
    const ranks = { 'C': 1, 'D': 2, 'H': 3, 'S': 4, 'NT': 5 };
    return ranks[suit] || 0;
};

const calculateHCP = (hand) => {
    const points = { 'A': 4, 'K': 3, 'Q': 2, 'J': 1 };
    return hand.reduce((total, card) => total + (points[card[0]] || 0), 0);
};

const getDistribution = (hand) => {
    const dist = { 'S': 0, 'H': 0, 'D': 0, 'C': 0 };
    hand.forEach(card => dist[card[1]]++);
    return dist;
};

const isPreemptive = (bid) => {
    // Consider bids like 2H, 2S, 3C, etc. as preemptive
    const level = parseInt(bid[0]);
    const suit = bid.slice(1);
    return (level >= 2 && level <= 3 && suit !== 'NT');
};
