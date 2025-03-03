import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBTEuGAD2MDaShqbXR1pBQ-SY2XW_7Q6XA",
  authDomain: "acol-pool.firebaseapp.com",
  projectId: "acol-pool",
  storageBucket: "acol-pool.firebasestorage.app",
  messagingSenderId: "659103503233",
  appId: "1:659103503233:web:93c8415021dbaf3bfc4e80",
  measurementId: "G-ZQHM11VWWH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with modern persistence settings
const firestore = initializeFirestore(app, {
  cache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

// Initialize Firebase Authentication
const auth = getAuth(app);

export { firestore, auth };

