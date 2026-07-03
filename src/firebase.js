import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA8UAoCmSYb5oF7gsh4GzETzdLPD4U18Mk",
  authDomain: "agency-crm-system.firebaseapp.com",
  projectId: "agency-crm-system",
  storageBucket: "agency-crm-system.firebasestorage.app",
  messagingSenderId: "590647469598",
  appId: "1:590647469598:web:286e853be27f87f343f00f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable persistence
enableIndexedDbPersistence(db).catch(console.warn);