import { auth, db } from './firebase-config.deploy.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const themeBtn = document.getElementById('theme-toggle-btn');
const logoutBtn = document.getElementById('logout-btn-settings');
const deleteModal = document.getElementById('delete-profile-modal');
const openDeleteBtn = document.getElementById('open-delete-modal-btn');
const closeDeleteBtn = document.getElementById('close-delete-modal-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

onAuthStateChanged(auth, (user) => {
    if (!user) window.location.href = "index.html";
});

if (themeBtn) {
    const savedTheme = localStorage.getItem('lik-theme') || 'dark';
    themeBtn.innerHTML = savedTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
    themeBtn.onclick = () => {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('lik-theme', newTheme);
        themeBtn.innerHTML = newTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
    };
}

if (logoutBtn) {
    logoutBtn.onclick = async () => {
        const { signOut } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
        signOut(auth).then(() => { window.location.href = "index.html"; });
    };
}

if (openDeleteBtn) openDeleteBtn.onclick = () => deleteModal.style.display = 'flex';
if (closeDeleteBtn) closeDeleteBtn.onclick = () => deleteModal.style.display = 'none';

if (confirmDeleteBtn) {
    confirmDeleteBtn.onclick = async () => {
        const user = auth.currentUser;
        if (!user) return;
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = "Deleting Account...";
        try {
            await deleteDoc(doc(db, "users", user.uid));
            const { signOut } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
            signOut(auth).then(() => { window.location.href = "index.html"; });
        } catch (err) { 
            alert(err.message); 
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = "Confirm Delete";
        }
    };
}