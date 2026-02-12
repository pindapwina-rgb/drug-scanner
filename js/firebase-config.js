// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB4giz59IGLGL-hPtERktR4vA2fZ396Nq0",
  authDomain: "drug-scanner-e3a5d.firebaseapp.com",
  projectId: "drug-scanner-e3a5d",
  storageBucket: "drug-scanner-e3a5d.firebasestorage.app",
  messagingSenderId: "333446158066",
  appId: "1:333446158066:web:b843c7db1579cf4ff3226b",
  measurementId: "G-JT48P0MTG0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
