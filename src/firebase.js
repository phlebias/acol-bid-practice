import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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

// Initialize Firestore
const firestore = getFirestore(app);

export default firestore; 

