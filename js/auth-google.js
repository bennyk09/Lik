import { auth, db } from './firebase-config.deploy.js';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const provider = new GoogleAuthProvider();

const authView = document.getElementById('auth-gateway-view');
const feedView = document.getElementById('app-feed-view');
const appNav = document.getElementById('app-nav');
const loginBtn = document.getElementById('google-login-btn');
const modal = document.getElementById('onboarding-modal');
const onboardingForm = document.getElementById('onboarding-form');

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
            console.error(err);
        }
    } else {
        showAuthInterface();
    }
});

if (loginBtn) {
    loginBtn.onclick = async () => {
        try { await signInWithPopup(auth, provider); } catch (err) { console.error(err); }
    };
}

if (onboardingForm) {
    onboardingForm.onsubmit = async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        try {
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: document.getElementById('user-name').value.trim(),
                age: parseInt(document.getElementById('user-age').value),
                bio: "",
                profilePic: "",
                totalLikes: 0,
                averageLikScore: 0,
                rank: "Unranked"
            });
            modal.style.display = 'none';
            showAppInterface();
        } catch (err) { alert(err.message); }
    };
}

// Handle Logout click events safely across desktop and mobile containers
const executeLogout = (e) => {
    e.preventDefault();
    signOut(auth).then(() => {
        window.location.href = "index.html";
    }).catch(err => console.error("Logout failed:", err));
};

const logoutDesktop = document.getElementById('logout-btn-desktop');
const logoutMobile = document.getElementById('logout-btn-mobile');

if (logoutDesktop) logoutDesktop.onclick = executeLogout;
if (logoutMobile) logoutMobile.onclick = executeLogout;

function showAppInterface() {
    const desktopNav = document.getElementById('app-nav-desktop');
    if (authView) authView.style.display = 'none';
    if (feedView) feedView.style.display = 'block';
    if (appNav) appNav.style.display = 'flex';
    if (desktopNav) desktopNav.style.display = 'flex';
}

function showAuthInterface() {
    const desktopNav = document.getElementById('app-nav-desktop');
    if (!authView) {
        window.location.href = "index.html";
        return;
    }
    if (authView) authView.style.display = 'flex';
    if (feedView) feedView.style.display = 'none';
    if (appNav) appNav.style.display = 'none';
    if (desktopNav) desktopNav.style.display = 'none';
}