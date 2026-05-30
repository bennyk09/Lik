import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

let config;

// Check if running locally or on production deployment domain
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    // 🛠️ Local Mode: Import the untracked private configuration file dynamically
    const localModule = await import("./firebase-config.js");
    config = localModule.firebaseConfig;
} else {
    // 🚀 Production Mode: Safe to hardcode keys HERE ONLY IF you have restricted your keys in the Firebase Console
    config = {
        apiKey: "AIzaSyAzProductionRestrictedKeyExample",
        authDomain: "lik-platform.firebaseapp.com",
        projectId: "lik-platform",
        storageBucket: "lik-platform.appspot.com",
        messagingSenderId: "123456789012",
        appId: "1:123456789012:web:abcdef123456"
    };
}

const app = initializeApp(config);
export const db = getFirestore(app);
export const auth = getAuth(app);