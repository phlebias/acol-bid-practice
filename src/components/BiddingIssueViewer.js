import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { firestore } from '../firebase.js';
import './BiddingAnalyzer.css';

function BiddingIssueViewer() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchIssues = async () => {
            try {
                const issuesQuery = query(
                    collection(firestore, "bidding_issues"),
                    orderBy("reportedAt", "desc")
                );
                console.log('Fetching issues from Firestore...');
                const querySnapshot = await getDocs(issuesQuery);
                console.log('QuerySnapshot:', querySnapshot);
                console.log('Number of docs:', querySnapshot.size);
                
                const fetchedIssues = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    console.log('Document data:', data);
                    return {
                        id: doc.id,
                        ...data
                    };
                });
                
                if (fetchedIssues.length === 0) {
                    console.log('No issues found in Firestore');
                } else {
                    console.log(`Found ${fetchedIssues.length} issues`);
                    fetchedIssues.forEach((issue, index) => {
                        console.log(`Issue ${index + 1}:`, {
                            id: issue.id,
                            northHand: issue.northHand,
                            eastHand: issue.eastHand,
                            southHand: issue.southHand,
                            westHand: issue.westHand,
                            dealer: issue.dealer,
                            vulnerability: issue.vulnerability,
                            auction: issue.auction,
                            description: issue.issueDescription
                        });
                    });
                }
                
                setIssues(fetchedIssues);
            } catch (err) {
                setError(err.message);
                console.error("Error fetching issues:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchIssues();
    }, []);

    const analyzeBidding = (issue) => {
        const analysis = {
            problems: [],
            suggestions: []
        };

        // Check opening bid
        const openingBid = issue.auction[0];
        if (openingBid) {
            const openingHand = issue[openingBid.bidder.toLowerCase() + 'Hand'];
            const hcp = calculateHCP(openingHand);
            
            if (openingBid.bid !== 'Pass' && hcp < 12) {
                analysis.problems.push(`Light opening: ${openingBid.bidder} opened with only ${hcp} HCP`);
            }
            if (openingBid.bid === 'Pass' && hcp >= 12) {
                analysis.problems.push(`Missed opening: ${openingBid.bidder} passed with ${hcp} HCP`);
            }
        }

        // Check bidding sequence
        issue.auction.forEach((bid, index) => {
            if (index > 0) {
                const prevBid = issue.auction[index - 1];
                
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
            }
        });

        return analysis;
    };

    const calculateHCP = (hand) => {
        if (!hand || !Array.isArray(hand)) return 0;
        const points = { 'A': 4, 'K': 3, 'Q': 2, 'J': 1 };
        return hand.reduce((total, card) => total + (points[card?.rank] || 0), 0);
    };

    const getSuitRank = (suit) => {
        const ranks = { 'C': 1, 'D': 2, 'H': 3, 'S': 4, 'NT': 5 };
        return ranks[suit] || 0;
    };

    if (loading) return <div>Loading issues...</div>;
    if (error) return <div>Error: {error}</div>;
    if (issues.length === 0) return <div>No bidding issues reported yet.</div>;

    return (
        <div className="bidding-analyzer">
            <h2>Reported Bidding Issues</h2>
            <div className="issues-list">
                {issues.map(issue => {
                    const analysis = analyzeBidding(issue);
                    return (
                        <div key={issue.id} className="issue-card">
                            <h3>Issue Report</h3>
                            <p><strong>Description:</strong> {issue.issueDescription}</p>
                            
                            <div className="hands-grid">
                                <div>
                                    <strong>North:</strong> {issue.northHand.join(' ')}
                                    <div className="hcp">({calculateHCP(issue.northHand)} HCP)</div>
                                </div>
                                <div>
                                    <strong>East:</strong> {issue.eastHand.join(' ')}
                                    <div className="hcp">({calculateHCP(issue.eastHand)} HCP)</div>
                                </div>
                                <div>
                                    <strong>South:</strong> {issue.southHand.join(' ')}
                                    <div className="hcp">({calculateHCP(issue.southHand)} HCP)</div>
                                </div>
                                <div>
                                    <strong>West:</strong> {issue.westHand.join(' ')}
                                    <div className="hcp">({calculateHCP(issue.westHand)} HCP)</div>
                                </div>
                            </div>

                            <div className="auction-details">
                                <p><strong>Dealer:</strong> {issue.dealer}</p>
                                <p><strong>Vulnerability:</strong> {issue.vulnerability}</p>
                                
                                <div className="auction-sequence">
                                    <strong>Auction:</strong>
                                    <div className="bids-list">
                                        {issue.auction.map((bid, index) => (
                                            <span key={index} className="bid">
                                                {bid.bidder}: {bid.bid}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {analysis.problems.length > 0 && (
                                    <div className="analysis-problems">
                                        <strong>Analysis:</strong>
                                        <ul>
                                            {analysis.problems.map((problem, index) => (
                                                <li key={index}>{problem}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default BiddingIssueViewer;
