import React, { useState, useEffect } from 'react';
import { getBiddingIssues, analyzeBiddingSequence } from '../utils/biddingAnalysis';

function BiddingAnalyzer() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadIssues();
    }, []);

    const loadIssues = async () => {
        try {
            setLoading(true);
            const fetchedIssues = await getBiddingIssues();
            setIssues(fetchedIssues);
        } catch (err) {
            setError("Failed to load bidding issues: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const analyzeIssue = (issue) => {
        const hands = {
            N: issue.northHand,
            E: issue.eastHand,
            S: issue.southHand,
            W: issue.westHand
        };
        return analyzeBiddingSequence(issue.auction, hands);
    };

    if (loading) return <div>Loading bidding issues...</div>;
    if (error) return <div style={{ color: 'red' }}>{error}</div>;

    return (
        <div className="bidding-analyzer">
            <h2>Bidding Issues Analysis</h2>
            <div className="issues-list">
                {issues.map(issue => {
                    const analysis = analyzeIssue(issue);
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
                                <p><strong>Final Contract:</strong> {analysis.finalContract}</p>
                                
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
                                        <strong>Potential Issues:</strong>
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

// Helper function
const calculateHCP = (hand) => {
    const points = { 'A': 4, 'K': 3, 'Q': 2, 'J': 1 };
    return hand.reduce((total, card) => total + (points[card[0]] || 0), 0);
};

export default BiddingAnalyzer;
