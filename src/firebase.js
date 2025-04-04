import { initializeApp } from 'firebase/app';
import { initializeFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Log Firebase configuration (without sensitive data)
console.log('Firebase Project ID:', firebaseConfig.projectId);
console.log('Firebase Auth Domain:', firebaseConfig.authDomain);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with memory cache fallback
const firestore = initializeFirestore(app, {
  cacheSizeBytes: 50 * 1024 * 1024  // 50 MB
});

// Enable offline persistence
enableIndexedDbPersistence(firestore)
  .then(() => {
    console.log('Firestore persistence enabled successfully');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support persistence.');
    }
  });

// Initialize Auth
const auth = getAuth(app);

export { firestore, auth };

