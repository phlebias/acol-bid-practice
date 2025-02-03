import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAkjQw3Mj-CVbfOeetqcybeKCIgrTps8y8",
  authDomain: "acol-ds.firebaseapp.com",
  projectId: "acol-ds",
  storageBucket: "acol-ds.firebasestorage.app",
  messagingSenderId: "795890660499",
  appId: "1:795890660499:web:53aa690f52ebd854d34966",
  measurementId: "G-KRJCLVQT7G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const firestore = getFirestore(app);

export default firestore; 