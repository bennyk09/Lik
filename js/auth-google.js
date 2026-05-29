import { auth, db } from './firebase-config.js';
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
                if (modal) {
                    modal.style.display = 'flex';
                } else {
                    window.location.href = "index.html";
                }
            } else {
                showAppInterface();
            }
        } catch (err) {
            console.error(err);
            alert("Database Error: Verify Firestore is created and rules are set to public.");
        }
    } else {
        showAuthInterface();
    }
});

if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (err) {
            console.error(err);
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth).then(() => {
            window.location.href = "index.html";
        });
    });
}

if (onboardingForm) {
    onboardingForm.addEventListener('submit', async (e) => {
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
    });
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