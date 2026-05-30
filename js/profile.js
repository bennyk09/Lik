import { auth, db } from './firebase-config.deploy.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const usernameLabel = document.getElementById('lbl-username-display');
const bioContainer = document.getElementById('profile-bio-container');
const statsTray = document.getElementById('stats-numbers-tray');
const userMomentsGrid = document.getElementById('user-moments');

const swapsSection = document.getElementById('swaps-connections-section');
const swappedUsersList = document.getElementById('swapped-users-list');

// Modal Elements Target Registry
const editModal = document.getElementById('edit-profile-modal');
const openEditBtn = document.getElementById('open-edit-modal-btn');
const closeEditBtn = document.getElementById('close-edit-modal-btn');
const editForm = document.getElementById('edit-profile-form');

const openDeleteBtn = document.getElementById('open-delete-modal-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

const avatarPreview = document.getElementById('avatar-preview');
const avatarInput = document.getElementById('avatar-input');
const removePicBtn = document.getElementById('remove-pic-btn');

// 🪐 READ THE INCOMING URL PARAMETER (Checks if we are viewing someone else or ourselves)
const urlParams = new URLSearchParams(window.location.search);
const targetProfileUid = urlParams.get('uid');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // If there's a target UID in the URL and it's not our own, load them. Otherwise, load our profile.
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

        // Render display name alongside the handle
        if (usernameLabel) {
            usernameLabel.innerHTML = `
                ${userData.name || "User"} 
                <span style="display: block; font-size: 0.95rem; color: var(--text-muted); font-weight: 400; margin-top: 4px; letter-spacing: 0px;">${userData.username || '/user'}</span>
            `;
        }
        if (bioContainer) bioContainer.textContent = userData.bio || "No biography set yet.";
        
        // Avatar rendering configuration rules
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

        // Fetch moments created explicitly by this user account profile
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

        // 🪐 HANDLE PROFILE LAYOUT SWITCHING (SELF VS STRANGER)
        if (isViewingSelf) {
            if (openEditBtn) openEditBtn.style.display = "block";
            if (openDeleteBtn) openDeleteBtn.style.display = "block";
            
            // Only show my direct active swaps section network row if looking at my own profile
            await renderSwapsNetwork(swappedArray);
        } else {
            // Hide personal edit controls on foreign profiles
            if (openEditBtn) openEditBtn.style.display = "none";
            if (openDeleteBtn) openDeleteBtn.style.display = "none";
            if (swapsSection) swapsSection.style.display = "none";
            
            // Inject a dynamic "Swap / Unswap" connection button directly into the main action dashboard
            injectSwapActionButton(uid);
        }

        // Build 3-column timeline grid layout for the active profile
        if (userMomentsGrid) {
            userMomentsGrid.innerHTML = "";
            if (momentsSnap.empty) {
                userMomentsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:var(--text-muted); padding: 20px 0; font-size:0.85rem;">No active photos inside the 24h timeline window.</p>`;
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

        // Sync local edit inputs elements settings configuration text variables
        if (isViewingSelf) {
            document.getElementById('edit-user-name').value = userData.name || "";
            document.getElementById('edit-user-age').value = userData.age || "";
            document.getElementById('edit-user-bio').value = userData.bio || "";
        }

    } catch (err) { console.error("Profile pipeline loader exception: ", err); }
}

// 🪐 NEW MODULE: Renders editable connection rows inside your personal settings card
async function renderSwapsNetwork(swappedArray) {
    if (!swappedUsersList || !swapsSection) return;
    if (swappedArray.length === 0) {
        swapsSection.style.display = "none";
        return;
    }

    swappedUsersList.innerHTML = "";
    swapsSection.style.display = "block";

    for (const targetUid of swappedArray) {
        const friendSnap = await getDoc(doc(db, "users", targetUid));
        if (friendSnap.exists()) {
            const friendData = friendSnap.data();
            const row = document.createElement('div');
            
            row.style = "display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--card-color); border: 1px solid var(--card-border); border-radius: var(--radius-md); cursor: pointer; transition: var(--transition-smooth);";
            row.innerHTML = `
                <div class="post-avatar" style="width:38px; height:38px; font-size:0.9rem;">
                    ${friendData.profilePic ? `<img src="${friendData.profilePic}">` : (friendData.name || "U").charAt(0).toUpperCase()}
                </div>
                <div style="display: flex; flex-direction: column; flex: 1;">
                    <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-main);">${friendData.name || "User"}</span>
                    <span style="font-size: 0.75rem; color: var(--accent-color); font-weight: 500;">${friendData.username}</span>
                </div>
                <span style="font-size: 0.8rem; color: var(--text-muted);">View Profile →</span>
            `;
            
            // 🪐 CRITICAL ROUTE UPDATE: Clicking on any row in your Swaps List transfers view tracking directly into their live timeline
            row.onclick = () => window.location.href = `profile.html?uid=${targetUid}`;
            row.onmouseenter = () => row.style.borderColor = "var(--accent-color)";
            row.onmouseleave = () => row.style.borderColor = "var(--card-border)";
            
            swappedUsersList.appendChild(row);
        }
    }
}

// 🪐 NEW MODULE: Handles injecting a premium connection Swap button into foreign dashboards
async function injectSwapActionButton(targetUid) {
    const currentUserId = auth.currentUser.uid;
    let existingBtn = document.getElementById('profile-dynamic-swap-btn');
    if (existingBtn) existingBtn.remove();

    const container = document.createElement('div');
    container.id = "profile-dynamic-swap-btn";
    container.style = "margin-bottom: 32px;";

    const myProfileSnap = await getDoc(doc(db, "users", currentUserId));
    const myProfileData = myProfileSnap.data();
    const swappedArray = myProfileData.swappedWith || [];
    const isSwapped = swappedArray.includes(targetUid);

    const btn = document.createElement('button');
    btn.style = "width: 100%; padding: 12px; font-weight: 700; font-size: 0.9rem; border-radius: var(--radius-md); cursor: pointer; transition: var(--transition-smooth);";
    
    function setBtnStyle(swapped) {
        if (swapped) {
            btn.textContent = "Unswap Connection";
            btn.style.background = "transparent";
            btn.style.color = "var(--text-main)";
            btn.style.border = "1px solid var(--card-border)";
        } else {
            btn.textContent = "Swap Profile";
            btn.style.background = "var(--accent-color)";
            btn.style.color = "#fff";
            btn.style.border = "1px solid transparent";
        }
    }

    setBtnStyle(isSwapped);

    btn.onclick = async () => {
        btn.disabled = true;
        const currentlySwapped = btn.textContent.includes("Unswap");
        
        try {
            if (!currentlySwapped) {
                await Promise.all([
                    updateDoc(doc(db, "users", currentUserId), { swappedWith: arrayUnion(targetUid) }),
                    updateDoc(doc(db, "users", targetUid), { swappedWith: arrayUnion(currentUserId) })
                ]);
                setBtnStyle(true);
            } else {
                await Promise.all([
                    updateDoc(doc(db, "users", currentUserId), { swappedWith: arrayRemove(targetUid) }),
                    updateDoc(doc(db, "users", targetUid), { swappedWith: arrayRemove(currentUserId) })
                ]);
                setBtnStyle(false);
            }
            // Dynamic hot-reloaded calculations tracking increment syncs
            const targetUserSnap = await getDoc(doc(db, "users", targetUid));
            const activeMomentsCount = document.querySelectorAll('.user-moment-card').length;
            if (statsTray) {
                statsTray.innerHTML = `
                    <div class="stat-node"><span class="stat-node-val">${targetUserSnap.data().totalLikes || 0}</span><span class="stat-node-lbl">Likes</span></div>
                    <div class="stat-node"><span class="stat-node-val">${activeMomentsCount}</span><span class="stat-node-lbl">Moments</span></div>
                    <div class="stat-node"><span class="stat-node-val">${(targetUserSnap.data().swappedWith || []).length}</span><span class="stat-node-lbl">Swaps</span></div>
                `;
            }
        } catch(err) { console.error(err); }
        finally { btn.disabled = false; }
    };

    container.appendChild(btn);
    // Insert button row context directly above timeline grid area module panels
    userMomentsGrid.parentNode.insertBefore(container, userMomentsGrid);
}

// Global modal view event binds closures setup parameters
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

if (avatarPreview) {
    avatarPreview.onclick = () => {
        if(avatarPreview.style.cursor === "pointer" && avatarInput) avatarInput.click();
    };
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