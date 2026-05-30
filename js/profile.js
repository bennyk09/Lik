import { auth, db } from './firebase-config.deploy.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const usernameLabel = document.getElementById('lbl-username-display');
const bioContainer = document.getElementById('profile-bio-container');
const statsTray = document.getElementById('stats-numbers-tray');
const userMomentsGrid = document.getElementById('user-moments');

// Modal Elements Target Registry
const editModal = document.getElementById('edit-profile-modal');
const openEditBtn = document.getElementById('open-edit-modal-btn');
const closeEditBtn = document.getElementById('close-edit-modal-btn');
const editForm = document.getElementById('edit-profile-form');

const openDeleteBtn = document.getElementById('open-delete-modal-btn');
const closeDeleteBtn = document.getElementById('close-delete-modal-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

const avatarPreview = document.getElementById('avatar-preview');
const avatarInput = document.getElementById('avatar-input');
const removePicBtn = document.getElementById('remove-pic-btn');
const profileLogoutBtn = document.getElementById('logout-btn-profile');

// Read the URL query parameters
const urlParams = new URLSearchParams(window.location.search);
const targetProfileUid = urlParams.get('uid');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const uidToLoad = (targetProfileUid && targetProfileUid !== user.uid) ? targetProfileUid : user.uid;
        const isViewingSelf = (uidToLoad === user.uid);
        
        await loadProfileData(uidToLoad, isViewingSelf);
    } else {
        window.location.href = "index.html";
    }
});

async function loadProfileData(uid, isViewingSelf) {
    try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (!userSnap.exists()) return;
        const userData = userSnap.data();

        if (usernameLabel) {
            usernameLabel.innerHTML = `
                ${userData.name || "User"} 
                <span style="display: block; font-size: 0.95rem; color: var(--text-muted); font-weight: 400; margin-top: 4px;">${userData.username || '/user'}</span>
            `;
        }
        if (bioContainer) bioContainer.textContent = userData.bio || "No biography set yet.";
        
        if (avatarPreview) {
            avatarPreview.style.cursor = isViewingSelf ? "pointer" : "default";
            if (userData.profilePic) {
                avatarPreview.innerHTML = `<img src="${userData.profilePic}" alt="Avatar">`;
                if (removePicBtn) removePicBtn.style.display = isViewingSelf ? "block" : "none";
            } else {
                avatarPreview.textContent = (userData.name || "U").charAt(0).toUpperCase();
                if (removePicBtn) removePicBtn.style.display = "none";
            }
        }

        const momentsQuery = query(collection(db, "moments"), where("userId", "==", uid));
        const momentsSnap = await getDocs(momentsQuery);
        const activeMomentsCount = momentsSnap.size;

        const swappedArray = userData.swappedWith || [];

        if (statsTray) {
            statsTray.innerHTML = `
                <div class="stat-node"><span class="stat-node-val">${userData.totalLikes || 0}</span><span class="stat-node-lbl">Likes</span></div>
                <div class="stat-node"><span class="stat-node-val">${activeMomentsCount}</span><span class="stat-node-lbl">Moments</span></div>
                <div class="stat-node"><span class="stat-node-val">${swappedArray.length}</span><span class="stat-node-lbl">Swaps</span></div>
            `;
        }

        // Configure View Bounds (Self Management vs Visiting Stranger Profile)
        if (isViewingSelf) {
            if (openEditBtn) openEditBtn.style.display = "block";
            if (openDeleteBtn) openDeleteBtn.style.display = "block";
            if (profileLogoutBtn) profileLogoutBtn.style.display = "block";
            
            let foreignSwapBtn = document.getElementById('profile-dynamic-swap-btn');
            if (foreignSwapBtn) foreignSwapBtn.remove();
        } else {
            if (openEditBtn) openEditBtn.style.display = "none";
            if (openDeleteBtn) openDeleteBtn.style.display = "none";
            if (profileLogoutBtn) profileLogoutBtn.style.display = "none";
            
            injectSwapActionButton(uid);
        }

        if (userMomentsGrid) {
            userMomentsGrid.innerHTML = "";
            if (momentsSnap.empty) {
                userMomentsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:var(--text-muted); padding: 40px 0; font-size:0.85rem;">No active photos right now.</p>`;
            }
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

        if (isViewingSelf) {
            document.getElementById('edit-user-name').value = userData.name || "";
            document.getElementById('edit-user-age').value = userData.age || "";
            document.getElementById('edit-user-bio').value = userData.bio || "";
        }

    } catch (err) { console.error(err); }
}

async function injectSwapActionButton(targetUid) {
    const currentUserId = auth.currentUser.uid;
    let existingBtn = document.getElementById('profile-dynamic-swap-btn');
    if (existingBtn) existingBtn.remove();

    const container = document.createElement('div');
    container.id = "profile-dynamic-swap-btn";
    container.style = "margin-bottom: 32px;";

    const myProfileSnap = await getDoc(doc(db, "users", currentUserId));
    const myData = myProfileSnap.data();
    
    const incomingIds = myData.swapRequestsIn || [];
    const sentIds = myData.swapRequestsOut || [];
    const mutualIds = myData.swappedWith || [];

    const btn = document.createElement('button');
    btn.style = "width: 100%; padding: 12px; font-weight: 700; font-size: 0.9rem; border-radius: var(--radius-md); cursor: pointer; transition: var(--transition-smooth);";
    
    function setBtnStyle(labelText) {
        btn.textContent = labelText;
        if (labelText === "Unswap Connection") {
            btn.style.background = "transparent";
            btn.style.color = "var(--text-main)";
            btn.style.border = "1px solid var(--card-border)";
        } else if (labelText === "Requested") {
            btn.style.background = "rgba(255,255,255,0.05)";
            btn.style.color = "var(--text-muted)";
            btn.style.border = "1px solid var(--card-border)";
        } else {
            btn.style.background = "var(--accent-color)";
            btn.style.color = "#fff";
            btn.style.border = "1px solid transparent";
        }
    }

    if (mutualIds.includes(targetUid)) setBtnStyle("Unswap Connection");
    else if (sentIds.includes(targetUid)) setBtnStyle("Requested");
    else if (incomingIds.includes(targetUid)) setBtnStyle("Accept Swap Request");
    else setBtnStyle("Swap Profile");

    btn.onclick = async () => {
        btn.disabled = true;
        const currentLabel = btn.textContent;
        
        try {
            if (currentLabel === "Swap Profile") {
                await Promise.all([
                    updateDoc(doc(db, "users", currentUserId), { swapRequestsOut: arrayUnion(targetUid) }),
                    updateDoc(doc(db, "users", targetUid), { swapRequestsIn: arrayUnion(currentUserId) })
                ]);
                setBtnStyle("Requested");
            } else if (currentLabel === "Unswap Connection") {
                if (!confirm("Disconnect swap link?")) return;
                await Promise.all([
                    updateDoc(doc(db, "users", currentUserId), { swappedWith: arrayRemove(targetUid) }),
                    updateDoc(doc(db, "users", targetUid), { swappedWith: arrayRemove(currentUserId) })
                ]);
                setBtnStyle("Swap Profile");
            } else if (currentLabel === "Accept Swap Request") {
                await Promise.all([
                    updateDoc(doc(db, "users", currentUserId), { swapRequestsIn: arrayRemove(targetUid), swappedWith: arrayUnion(targetUid) }),
                    updateDoc(doc(db, "users", targetUid), { swapRequestsOut: arrayRemove(currentUserId), swappedWith: arrayUnion(currentUserId) })
                ]);
                setBtnStyle("Unswap Connection");
            }
            await loadProfileData(targetUid, false);
        } catch(err) { console.error(err); }
        finally { btn.disabled = false; }
    };

    container.appendChild(btn);
    userMomentsGrid.parentNode.insertBefore(container, userMomentsGrid);
}

if (openEditBtn) openEditBtn.onclick = () => editModal.style.display = 'flex';
if (closeEditBtn) closeEditBtn.onclick = () => editModal.style.display = 'none';
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
            await loadProfileData(user.uid, true);
        } catch (err) { alert(err.message); }
    };
}

if (avatarPreview && avatarInput) {
    avatarPreview.onclick = () => { if(avatarPreview.style.cursor === "pointer") avatarInput.click(); };
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
                await loadProfileData(auth.currentUser.uid, true);
            } catch (err) { alert(err.message); }
        };
    };
}

if (removePicBtn) {
    removePicBtn.onclick = async () => {
        if (!auth.currentUser || !confirm("Remove your avatar?")) return;
        try {
            await updateDoc(doc(db, "users", auth.currentUser.uid), { profilePic: "" });
            await loadProfileData(auth.currentUser.uid, true);
        } catch (err) { alert(err.message); }
    };
}

if (profileLogoutBtn) {
    profileLogoutBtn.onclick = async () => {
        const { signOut } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
        signOut(auth).then(() => { window.location.href = "index.html"; }).catch(err => console.error(err));
    };
}

if (confirmDeleteBtn) {
    confirmDeleteBtn.onclick = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            await deleteDoc(doc(db, "users", user.uid));
            window.location.href = "index.html";
        } catch (err) { alert(err.message); }
    };
}