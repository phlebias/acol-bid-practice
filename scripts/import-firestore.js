const admin = require('firebase-admin');
const fs = require('fs');

// Initialize the new Firebase project
// You'll need to download the service account key file from the Firebase console
// and save it to the keys directory
const serviceAccount = require('../keys/acol-pool-new-firebase-adminsdk-fbsvc-ede16175e8.json');

console.log('Service account project details:', {
  project_id: serviceAccount.project_id,
  client_email: serviceAccount.client_email,
  private_key_id: serviceAccount.private_key_id
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://acol-pool-new.firebaseio.com"
});

const db = admin.firestore();

async function importFirestoreData() {
  try {
    console.log('Reading export file...');
    const data = JSON.parse(fs.readFileSync('firestore-export.json', 'utf8'));
    console.log('Collections found in export:', Object.keys(data));
    
    // Process each collection
    for (const collectionName in data) {
      console.log(`\nImporting collection: ${collectionName}`);
      console.log(`Documents to import: ${data[collectionName].length}`);
      
      const batch = db.batch();
      let batchCount = 0;
      let totalImported = 0;
      
      for (const item of data[collectionName]) {
        console.log(`Processing document: ${item.id}`);
        const docRef = db.collection(collectionName).doc(item.id);
        batch.set(docRef, item.data);
        
        batchCount++;
        totalImported++;
        
        // Firestore batches are limited to 500 operations
        if (batchCount >= 400) {
          await batch.commit();
          console.log(`Committed batch of ${batchCount} documents`);
          batchCount = 0;
        }
      }
      
      // Commit any remaining documents
      if (batchCount > 0) {
        await batch.commit();
        console.log(`Committed final batch of ${batchCount} documents`);
      }
      
      // Verify the import
      const querySnapshot = await db.collection(collectionName).get();
      console.log(`Verification - Collection ${collectionName}:`, {
        documentsFound: querySnapshot.size,
        expectedCount: data[collectionName].length,
        isEmpty: querySnapshot.empty
      });
      
      console.log(`Imported ${totalImported} documents to ${collectionName}`);
    }
    
    console.log('\nImport completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
}

importFirestoreData(); 