import { auth, db } from './firebase-config.deploy.js';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const provider = new GoogleAuthProvider();

const authView = document.getElementById('auth-gateway-view');
const feedView = document.getElementById('app-feed-view');
const appNav = document.getElementById('app-nav');
const loginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const modal = document.getElementById('onboarding-modal');
const onboardingForm = document.getElementById('onboarding-form');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userDocRef);

            if (!userSnap.exists()) {
                // If they are on a sub-page but haven't onboarding yet, send them to index to complete it
                if (!modal) {
                    window.location.href = "index.html";
                    return;
                }
                modal.style.display = 'flex';
            } else {
                showAppInterface();
            }
        } catch (err) {
            console.error("Auth observation caught an error: ", err);
            // Only show alert if it's an actual critical error, not an empty document path
            if (modal || window.location.pathname.endsWith('index.html')) {
                alert("Database Connection Pending: Please try logging in again or refresh the page.");
            }
        }
    } else {
        showAuthInterface();
    }
});
function showAppInterface() {
    if (authView) authView.style.display = 'none';
    if (feedView) feedView.style.display = 'block';
    if (appNav) appNav.style.display = 'flex';
}

function showAuthInterface() {
    if (!authView && !window.location.pathname.endsWith('about.html')) {
        window.location.href = "index.html";
        return;
    }
    if (authView) authView.style.display = 'flex';
    if (feedView) feedView.style.display = 'none';
    if (appNav) appNav.style.display = 'none';
}