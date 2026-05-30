import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBhcDhn5BJuTG0isUKYFOoGKfMoeX7FzpE",
    authDomain: "lik-81e6e.firebaseapp.com",
    databaseURL: "https://lik-81e6e-default-rtdb.firebaseio.com",
    projectId: "lik-81e6e",
    storageBucket: "lik-81e6e.firebasestorage.app",
    messagingSenderId: "511733919470",
    appId: "1:511733919470:web:ce52a820e54db4a3eecdff",
    measurementId: "G-CWGWT13BLK"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);