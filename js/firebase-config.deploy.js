import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 🪐 COMPLETE DEPLOYMENT CONFIGURATION MATRIX
// Replace these placeholder strings with your actual plaintext keys from the Firebase Console!
const firebaseConfig = {
    apiKey: "AIzaSyYourActualValidKeyHereFromFirebaseConsole",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
};

// Initialize individual service contexts safely for global export
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);