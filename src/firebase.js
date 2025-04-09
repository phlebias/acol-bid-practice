import { initializeApp } from 'firebase/app';
import { initializeFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "acol-pool-new.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "acol-pool-new",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "acol-pool-new.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "253795260111",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:253795260111:web:767dda2b1f9a2f42d189ba",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-VVMPMMP6SS"
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
