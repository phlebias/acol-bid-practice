const admin = require('firebase-admin');
const fs = require('fs');

// Initialize the old Firebase project
// You'll need to download the service account key file from the Firebase console
// and save it to the keys directory
const serviceAccount = require('../keys/acol-pool-firebase-adminsdk-fbsvc-dc57f50e7c.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://acol-pool.firebaseio.com"
});

const db = admin.firestore();

async function exportFirestoreData() {
  try {
    const collections = await db.listCollections();
    const data = {};
    
    for (const collection of collections) {
      const collectionName = collection.id;
      console.log(`Exporting collection: ${collectionName}`);
      
      const snapshot = await db.collection(collectionName).get();
      data[collectionName] = [];
      
      snapshot.forEach(doc => {
        data[collectionName].push({
          id: doc.id,
          data: doc.data()
        });
      });
    }
    
    fs.writeFileSync('firestore-export.json', JSON.stringify(data, null, 2));
    console.log('Export completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error exporting data:', error);
    process.exit(1);
  }
}

exportFirestoreData(); 