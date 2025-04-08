import { initializeApp } from 'firebase/app';
import { initializeFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDz4wsn8oHgH6OBcsMXM3KFolvdtAh_OAQ",
  authDomain: "acol-pool-new.firebaseapp.com",
  projectId: "acol-pool-new",
  storageBucket: "acol-pool-new.firebasestorage.app",
  messagingSenderId: "253795260111",
  appId: "1:253795260111:web:767dda2b1f9a2f42d189ba",
  measurementId: "G-VVMPMMP6SS"
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

