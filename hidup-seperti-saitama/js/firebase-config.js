// js/firebase-config.js
// Firebase config + init sekali untuk semua modul

const firebaseConfig = {
  apiKey: "AIzaSyC_cy-2g1HDmO5VOyLwzZ-asqm7GOTLgH4",
  authDomain: "hidup-seperti-saitama.firebaseapp.com",
  projectId: "hidup-seperti-saitama",
  storageBucket: "hidup-seperti-saitama.firebasestorage.app",
  messagingSenderId: "987138891912",
  appId: "1:987138891912:web:98fe84d940f2a3cd6f7f3d",
  measurementId: "G-FE1WJ0X9HC"
};

// Import SDK dari CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Init sekali saja
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export supaya bisa dipakai modul lain
export { app, auth, db, firebaseConfig };