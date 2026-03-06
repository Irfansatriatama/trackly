import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD0_dKDpzm3vMuxhVDRlFzjOrq9xGm7pkU",
    authDomain: "trackly-8a17a.firebaseapp.com",
    projectId: "trackly-8a17a",
    storageBucket: "trackly-8a17a.firebasestorage.app",
    messagingSenderId: "959307066237",
    appId: "1:959307066237:web:b63efb881d13d91b2a7a14",
    measurementId: "G-FH99VKEE7J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
