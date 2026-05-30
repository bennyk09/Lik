import { auth, db } from './firebase-config.deploy.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const usernameLabel = document.getElementById('lbl-username-display');
const bioContainer = document.getElementById('profile-bio-container');
const statsTray = document.getElementById('stats-numbers-tray');
const userMomentsGrid = document.getElementById('user-moments');

// Modal Elements
const editModal = document.getElementById('edit-profile-modal');
const openEditBtn = document.getElementById('open-edit-modal-btn');
const closeEditBtn = document.getElementById('close-edit-modal-btn');
const editForm = document.getElementById('edit-profile-form');

const aboutModal = document.getElementById('about-info-modal');
const openAboutBtn = document.getElementById('open-about-modal-btn');
const closeAboutBtn = document.getElementById('close-about-modal-btn');

const deleteModal = document.getElementById('delete-profile-modal');
const openDeleteBtn = document.getElementById('open-delete-modal-btn');
const closeDeleteBtn = document.getElementById('close-delete-modal-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

const avatarPreview = document.getElementById('avatar-preview');
const avatarInput = document.getElementById('avatar-input');
const removePicBtn = document.getElementById('remove-pic-btn');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        await loadProfileData(user.uid);
    } else {
        window.location.href = "index.html";
    }
});

async function loadProfileData(uid) {
    try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (!userSnap.exists()) return;
        const userData = userSnap.data();

        // 🪐 STEP 2: Render display name alongside the permanent handle below it
        if (usernameLabel) {
            usernameLabel.innerHTML = `
                ${userData.name || "User"} 
                <span style="display: block; font-size: 0.95rem; color: var(--text-muted); font-weight: 400; margin-top: 4px; letter-spacing: 0px;">${userData.username || '/user'}</span>
            `;
        }
        if (bioContainer) bioContainer.textContent = userData.bio || "No biography set yet. Click Edit Profile to add one!";
        
        // Avatar handlers
        if (avatarPreview) {
            if (userData.profilePic) {
                avatarPreview.innerHTML = `<img src="${userData.profilePic}" alt="Avatar">`;
                if (removePicBtn) removePicBtn.style.display = "block";
            } else {
                avatarPreview.textContent = (userData.name || "U").charAt(0).toUpperCase();
                if (removePicBtn) removePicBtn.style.display = "none";
            }
        }

        // Fetch user posts to compute metrics
        const momentsQuery = query(collection(db, "moments"), where("userId", "==", uid));
        const momentsSnap = await getDocs(momentsQuery);
        const activeMomentsCount = momentsSnap.size;

        if (statsTray) {
            statsTray.innerHTML = `
                <div class="stat-node"><span class="stat-node-val">${userData.totalLikes || 0}</span><span class="stat-node-lbl">Likes</span></div>
                <div class="stat-node"><span class="stat-node-val">${activeMomentsCount}</span><span class="stat-node-lbl">Moments</span></div>
                <div class="stat-node"><span class="stat-node-val">#1</span><span class="stat-node-lbl">Rank</span></div>
            `;
        }

        // Build grid layout
        if (userMomentsGrid) {
            userMomentsGrid.innerHTML = "";
            momentsSnap.forEach(docData => {
                const moment = docData.data();
                if (moment.imageUrl) {
                    const card = document.createElement('div');
                    card.className = "user-moment-card";
                    card.innerHTML = `<img src="${moment.imageUrl}">`;
                    userMomentsGrid.appendChild(card);
                }
            });
        }

        // Set form inputs (Excluding handle input since it cannot be changed)
        document.getElementById('edit-user-name').value = userData.name || "";
        document.getElementById('edit-user-age').value = userData.age || "";
        document.getElementById('edit-user-bio').value = userData.bio || "";

        if (openEditBtn) openEditBtn.style.display = "block";
        if (openDeleteBtn) openDeleteBtn.style.display = "block";

    } catch (err) { console.error(err); }
}

// Modal Toggle Handlers
if (openEditBtn) openEditBtn.onclick = () => editModal.style.display = 'flex';
if (closeEditBtn) closeEditBtn.onclick = () => editModal.style.display = 'none';
if (openAboutBtn) openAboutBtn.onclick = () => aboutModal.style.display = 'flex';
if (closeAboutBtn) closeAboutBtn.onclick = () => aboutModal.style.display = 'none';
if (openDeleteBtn) openDeleteBtn.onclick = () => deleteModal.style.display = 'flex';
if (closeDeleteBtn) closeDeleteBtn.onclick = () => deleteModal.style.display = 'none';

if (editForm) {
    editForm.onsubmit = async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        try {
            await updateDoc(doc(db, "users", user.uid), {
                name: document.getElementById('edit-user-name').value.trim(),
                age: parseInt(document.getElementById('edit-user-age').value),
                bio: document.getElementById('edit-user-bio').value.trim()
            });
            editModal.style.display = 'none';
            await loadProfileData(user.uid);
        } catch (err) { alert(err.message); }
    };
}

if (avatarPreview) {
    avatarPreview.onclick = () => avatarInput && avatarInput.click();
}

if (avatarInput) {
    avatarInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file || !auth.currentUser) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                await updateDoc(doc(db, "users", auth.currentUser.uid), { profilePic: reader.result });
                await loadProfileData(auth.currentUser.uid);
            } catch (err) { alert(err.message); }
        };
    };
}

if (removePicBtn) {
    removePicBtn.onclick = async () => {
        if (!auth.currentUser || !confirm("Remove your avatar?")) return;
        try {
            await updateDoc(doc(db, "users", auth.currentUser.uid), { profilePic: "" });
            await loadProfileData(auth.currentUser.uid);
        } catch (err) { alert(err.message); }
    };
}

if (confirmDeleteBtn) {
    confirmDeleteBtn.onclick = async () => {
        const user = auth.currentUser;
        if (!user) return;

        try {
            await deleteDoc(doc(db, "users", user.uid));
            alert("Account data purged.");
            window.location.href = "index.html";
        } catch (err) { alert(err.message); }
    };
}