import { auth, db } from './firebase-config.deploy.js';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const provider = new GoogleAuthProvider();

// DOM References
const authView = document.getElementById('auth-gateway-view');
const feedView = document.getElementById('app-feed-view');
const appNav = document.getElementById('app-nav');
const loginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const modal = document.getElementById('onboarding-modal');
const onboardingForm = document.getElementById('onboarding-form');

// Core Authentication Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userDocRef);

            if (!userSnap.exists()) {
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
            if (modal || window.location.pathname.endsWith('index.html')) {
                alert("Database Connection Pending: Please try logging in again or refresh the page.");
            }
        }
    } else {
        showAuthInterface();
    }
});

// Click Interactions
if (loginBtn) {
    loginBtn.onclick = async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (err) {
            console.error("Popup Error: ", err);
            alert("Login Failed: " + err.message);
        }
    };
}

if (logoutBtn) {
    logoutBtn.onclick = (e) => {
        e.preventDefault();
        signOut(auth).then(() => {
            window.location.href = "index.html";
        });
    };
}

// Onboarding Form Complete Submission
if (onboardingForm) {
    onboardingForm.onsubmit = async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const name = document.getElementById('user-name').value;
        const age = parseInt(document.getElementById('user-age').value);

        try {
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: name,
                age: age,
                totalLikes: 0,
                averageLikScore: 0,
                rank: "Unranked"
            });
            modal.style.display = 'none';
            showAppInterface();
        } catch (err) {
            alert("Error saving profile: " + err.message);
        }
    };
}

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