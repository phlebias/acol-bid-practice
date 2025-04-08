import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { firestore } from '../firebase';
import { getComputerBid, calculateHCP } from '../utils/biddingLogic';

function BiddingIssueAnalyzer() {
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
                const querySnapshot = await getDocs(issuesQuery);
                const issues = querySnapshot.docs.map(doc => doc.data());
                console.log('Raw Firestore data:', issues);
                if (issues.length > 0) {
                    console.log('First issue northHand:', issues[0]?.northHand);
                }
                const fetchedIssues = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setIssues(fetchedIssues);
                console.log("Fetched issues:", fetchedIssues);
            } catch (err) {
                setError(err.message);
                console.error("Error fetching issues:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchIssues();
    }, []);

    const analyzeComputerBidding = (issue) => {
        const analysis = {
            problems: [],
            suggestions: []
        };

        // Find computer's bids
        const computerBids = issue.auction.filter(bid => bid.bidder !== issue.userPosition);
        
        // For each computer bid, check if it matches what our current logic would do
        computerBids.forEach((bid, index) => {
            // Reconstruct the auction state at this point
            const auctionAtThisPoint = issue.auction.slice(0, issue.auction.findIndex(b => b === bid));
            
            // Get what our current bidding logic would do
            const expectedBid = getComputerBid(
                {
                    N: issue.northHand,
                    E: issue.eastHand,
                    S: issue.southHand,
                    W: issue.westHand
                },
                bid.bidder,
                false,
                auctionAtThisPoint,
                issue.dealer,
                issue.vulnerability
            );

            // Compare actual vs expected
            if (bid.bid !== expectedBid) {
                analysis.problems.push({
                    position: bid.bidder,
                    actualBid: bid.bid,
                    expectedBid: expectedBid,
                    explanation: `Computer bid ${bid.bid} but current logic suggests ${expectedBid}`
                });
            }
        });

        return analysis;
    };

    if (loading) return <div>Loading issues...</div>;
    if (error) return <div>Error: {error}</div>;
    if (issues.length === 0) return <div>No bidding issues reported yet.</div>;

    return (
        <div className="bidding-analyzer">
            <h2>Reported Bidding Issues</h2>
            <div className="issues-list">
                {issues.map(issue => {
                    const analysis = analyzeComputerBidding(issue);
                    return (
                        <div key={issue.id} className="issue-card">
                            <h3>Issue Report</h3>
                            <p><strong>Description:</strong> {issue.issueDescription}</p>
                            
                            <div className="hands-grid">
                                <div>
                                    <strong>North:</strong> {issue.northHand.map(card => card.rank + card.suit).join(' ')}
                                    <div className="hcp">({calculateHCP(issue.northHand)} HCP)</div>
                                </div>
                                <div>
                                    <strong>East:</strong> {issue.eastHand.map(card => card.rank + card.suit).join(' ')}
                                    <div className="hcp">({calculateHCP(issue.eastHand)} HCP)</div>
                                </div>
                                <div>
                                    <strong>South:</strong> {issue.southHand.map(card => card.rank + card.suit).join(' ')}
                                    <div className="hcp">({calculateHCP(issue.southHand)} HCP)</div>
                                </div>
                                <div>
                                    <strong>West:</strong> {issue.westHand.map(card => card.rank + card.suit).join(' ')}
                                    <div className="hcp">({calculateHCP(issue.westHand)} HCP)</div>
                                </div>
                            </div>

                            <div className="auction-details">
                                <p><strong>Dealer:</strong> {issue.dealer}</p>
                                <p><strong>Vulnerability:</strong> {issue.vulnerability}</p>
                                <p><strong>User Position:</strong> {issue.userPosition}</p>
                                
                                <div className="auction-sequence">
                                    <strong>Auction:</strong>
                                    <div className="bids-list">
                                        {issue.auction.map((bid, index) => (
                                            <span key={index} className={`bid ${bid.bidder === issue.userPosition ? 'user-bid' : 'computer-bid'}`}>
                                                {bid.bidder}: {bid.bid}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {analysis.problems.length > 0 && (
                                    <div className="analysis-problems">
                                        <strong>Computer Bidding Analysis:</strong>
                                        <ul>
                                            {analysis.problems.map((problem, index) => (
                                                <li key={index}>
                                                    Position {problem.position}: {problem.explanation}
                                                </li>
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

export default BiddingIssueAnalyzer;
