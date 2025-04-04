const admin = require('firebase-admin');
const path = require('path'); // Required for resolving path

// Path to your service account key file
const serviceAccountPath = path.resolve(__dirname, '../serviceAccountKey.json'); // Assumes key is in the root directory

// Attempt to initialize Firebase Admin SDK using the service account key
try {
    // Check if the app is already initialized to prevent errors
    if (admin.apps.length === 0) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccountPath)
        });
        console.log("Firebase Admin SDK initialized successfully using service account key.");
    } else {
        console.log("Firebase Admin SDK already initialized.");
    }
} catch (error) {
    console.error("Error initializing Firebase Admin SDK with service account key:", error);
    console.error(`Please ensure the service account key file exists at: ${serviceAccountPath}`);
    process.exit(1); // Exit if initialization fails
}

const db = admin.firestore();
const issuesCollection = db.collection('bidding_issues');

// Function to fetch and display all issues
async function fetchAndDisplayIssues() {
    console.log("\nFetching bidding issues from Firestore...\n");
    try {
        const snapshot = await issuesCollection.orderBy('reportedAt', 'desc').get(); // Order by most recent

        if (snapshot.empty) {
            console.log("No bidding issues found in the 'bidding_issues' collection.");
            return;
        }

        console.log(`Found ${snapshot.size} bidding issue(s):\n`);
        console.log("----------------------------------------");

        snapshot.forEach(doc => {
            const data = doc.data();
            const reportedAt = data.reportedAt?.toDate ? data.reportedAt.toDate().toLocaleString() : 'N/A'; // Format timestamp nicely

            console.log(`Issue ID: ${doc.id}`); // Display ID for deletion
            console.log(`Reported At: ${reportedAt}`);
            console.log(`Description: ${data.issueDescription || 'No description provided.'}`);
            if (data.auction && Array.isArray(data.auction)) {
                const auctionString = data.auction.map(bid => `${bid.bidder}: ${bid.bid}`).join(' | ');
                console.log(`Auction: ${auctionString}`);
            } else {
                console.log("Auction: (Data not available or invalid format)");
            }
            console.log(`North: ${JSON.stringify(data.northHand)}`);
            console.log(`East: ${JSON.stringify(data.eastHand)}`);
            console.log(`South: ${JSON.stringify(data.southHand)}`);
            console.log(`West: ${JSON.stringify(data.westHand)}`);
            console.log(`Dealer: ${data.dealer || 'N/A'}`);
            console.log(`Vulnerability: ${data.vulnerability || 'N/A'}`);
            console.log("----------------------------------------");
        });

    } catch (error) {
        console.error("Error fetching bidding issues:", error);
    }
}

// Function to delete a specific issue by ID
async function deleteIssue(issueId) {
    if (!issueId) {
        console.error("Error: No issue ID provided for deletion.");
        console.log("Usage: node scripts/fetch-bidding-issues.js --delete <ISSUE_ID>");
        return;
    }
    console.log(`\nAttempting to delete issue with ID: ${issueId}...\n`);
    try {
        const docRef = issuesCollection.doc(issueId);
        const doc = await docRef.get();

        if (!doc.exists) {
            console.log(`Error: No issue found with ID: ${issueId}`);
            return;
        }

        await docRef.delete();
        console.log(`Successfully deleted issue with ID: ${issueId}`);
    } catch (error) {
        console.error(`Error deleting issue ${issueId}:`, error);
    }
}

// --- Main Execution Logic ---
const args = process.argv.slice(2); // Get command line arguments, excluding 'node' and script path

const deleteIndex = args.indexOf('--delete');

if (deleteIndex !== -1) {
    // Delete mode
    const issueIdToDelete = args[deleteIndex + 1];
    deleteIssue(issueIdToDelete);
} else {
    // Default mode: Fetch and display
    fetchAndDisplayIssues();
}