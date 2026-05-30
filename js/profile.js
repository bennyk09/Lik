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

// Read the incoming URL query parameters
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

        // 🪐 Dynamic Relationship Indicator Tag Engine
        let statusBadgeHtml = "";
        if (userData.relationshipStatus === "couple") {
            statusBadgeHtml = `<span id="relationship-status-badge" style="background: rgba(255, 59, 48, 0.12); color: #ff3b30; border: 1px solid rgba(255, 59, 48, 0.25); font-size: 0.72rem; padding: 3px 10px; border-radius: 20px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; vertical-align: middle; letter-spacing: 0.3px; margin-left: 2px;">❤️ Couple</span>`;
        } else {
            statusBadgeHtml = `<span id="relationship-status-badge" style="background: rgba(255, 255, 255, 0.04); color: var(--text-muted); border: 1px solid var(--card-border); font-size: 0.72rem; padding: 3px 10px; border-radius: 20px; font-weight: 600; display: inline-flex; align-items: center; vertical-align: middle; margin-left: 2px;">Single</span>`;
        }

        if (usernameLabel) {
            usernameLabel.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; width: 100%; flex-wrap: wrap;">
                    <span style="color: var(--text-main); font-weight: 700; font-size: 1.35rem;">${userData.name || "User"}</span>
                    ${statusBadgeHtml}
                </div>
                <span style="display: block; font-size: 0.95rem; color: var(--text-muted); font-weight: 400; margin-top: 6px; width: 100%; letter-spacing: 0px;">${userData.username || '/user'}</span>
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

        // Configure Layout Control Options
        if (isViewingSelf) {
            if (openEditBtn) openEditBtn.style.display = "block";
            if (openDeleteBtn) openDeleteBtn.style.display = "block";
            if (profileLogoutBtn) profileLogoutBtn.style.display = "block";
            
            removeDynamicProfileButtons();
        } else {
            if (openEditBtn) openEditBtn.style.display = "none";
            if (openDeleteBtn) openDeleteBtn.style.display = "none";
            if (profileLogoutBtn) profileLogoutBtn.style.display = "none";
            
            await injectForeignProfileButtons(uid);
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

function removeDynamicProfileButtons() {
    document.getElementById('profile-dynamic-swap-btn')?.remove();
    document.getElementById('profile-dynamic-couple-btn')?.remove();
}

async function injectForeignProfileButtons(targetUid) {
    const currentUserId = auth.currentUser.uid;
    removeDynamicProfileButtons();

    const myProfileSnap = await getDoc(doc(db, "users", currentUserId));
    const myData = myProfileSnap.data();
    
    const mutualIds = myData.swappedWith || [];
    const incomingIds = myData.swapRequestsIn || [];
    const sentIds = myData.swapRequestsOut || [];

    // 🪐 BUTTON CONTAINER A: CORE PROFILE SWAP ACTIONS
    const swapContainer = document.createElement('div');
    swapContainer.id = "profile-dynamic-swap-btn";
    swapContainer.style = "margin-bottom: 12px;";

    const swapBtn = document.createElement('button');
    swapBtn.style = "width: 100%; padding: 12px; font-weight: 700; font-size: 0.9rem; border-radius: var(--radius-md); cursor: pointer; transition: 0.2s;";
    
    if (mutualIds.includes(targetUid)) {
        swapBtn.textContent = "Unswap Connection";
        swapBtn.style.background = "transparent";
        swapBtn.style.color = "var(--text-main)";
        swapBtn.style.border = "1px solid var(--card-border)";
    } else if (sentIds.includes(targetUid)) {
        swapBtn.textContent = "Requested";
        swapBtn.style.background = "rgba(255,255,255,0.05)";
        swapBtn.style.color = "var(--text-muted)";
        swapBtn.style.border = "1px solid var(--card-border)";
    } else if (incomingIds.includes(targetUid)) {
        swapBtn.textContent = "Accept Swap Request";
        swapBtn.style.background = "var(--accent-color)";
        swapBtn.style.color = "#fff";
        swapBtn.style.border = "1px solid transparent";
    } else {
        swapBtn.textContent = "Swap Profile";
        swapBtn.style.background = "var(--accent-color)";
        swapBtn.style.color = "#fff";
        swapBtn.style.border = "1px solid transparent";
    }

    swapBtn.onclick = async () => {
        swapBtn.disabled = true;
        const currentLabel = swapBtn.textContent;
        try {
            if (currentLabel === "Swap Profile") {
                await updateDoc(doc(db, "users", currentUserId), { swapRequestsOut: arrayUnion(targetUid) });
                await updateDoc(doc(db, "users", targetUid), { swapRequestsIn: arrayUnion(currentUserId) });
            } else if (currentLabel === "Unswap Connection") {
                if (!confirm("Disconnect swap link?")) return;
                await updateDoc(doc(db, "users", currentUserId), { swappedWith: arrayRemove(targetUid), relationshipStatus: "single", partnerUid: "" });
                await updateDoc(doc(db, "users", targetUid), { swappedWith: arrayRemove(currentUserId), relationshipStatus: "single", partnerUid: "" });
            } else if (currentLabel === "Accept Swap Request") {
                await updateDoc(doc(db, "users", currentUserId), { swapRequestsIn: arrayRemove(targetUid), swappedWith: arrayUnion(targetUid) });
                await updateDoc(doc(db, "users", targetUid), { swapRequestsOut: arrayRemove(currentUserId), swappedWith: arrayUnion(currentUserId) });
            }
            await loadProfileData(targetUid, false);
        } catch(err) { console.error(err); }
        finally { swapBtn.disabled = false; }
    };
    swapContainer.appendChild(swapBtn);
    userMomentsGrid.parentNode.insertBefore(swapContainer, userMomentsGrid);

    // 🪐 BUTTON CONTAINER B: MUTUAL RELATIONSHIP SUB-ENGINE
    if (mutualIds.includes(targetUid)) {
        const coupleContainer = document.createElement('div');
        coupleContainer.id = "profile-dynamic-couple-btn";
        coupleContainer.style = "margin-bottom: 32px;";

        const coupleBtn = document.createElement('button');
        coupleBtn.style = "width: 100%; padding: 12px; font-weight: 700; font-size: 0.9rem; border-radius: var(--radius-md); cursor: pointer; transition: 0.2s;";
        
        const myCoupleStatus = myData.relationshipStatus || "single";
        const myPartnerUid = myData.partnerUid || "";
        const myCoupleReqOut = myData.coupleRequestOut || "";
        const myCoupleReqIn = myData.coupleRequestIn || "";

        if (myCoupleStatus === "couple" && myPartnerUid === targetUid) {
            coupleBtn.textContent = "Break Up (Remove Couple)";
            coupleBtn.style.background = "transparent";
            coupleBtn.style.color = "var(--accent-red)";
            coupleBtn.style.border = "1px solid rgba(255,59,48,0.2)";
        } else if (myCoupleReqOut === targetUid) {
            coupleBtn.textContent = "Couple Proposal Sent...";
            coupleBtn.style.background = "rgba(255,255,255,0.03)";
            coupleBtn.style.color = "var(--text-muted)";
            coupleBtn.style.border = "1px solid var(--card-border)";
        } else if (myCoupleReqIn === targetUid) {
            coupleBtn.textContent = "Accept Couple Request ❤️";
            coupleBtn.style.background = "#ff3b30";
            coupleBtn.style.color = "#fff";
            coupleBtn.style.border = "1px solid transparent";
        } else if (myCoupleStatus === "single") {
            coupleBtn.textContent = "Add Couple ➕";
            coupleBtn.style.background = "rgba(255,255,255,0.04)";
            coupleBtn.style.color = "var(--text-main)";
            coupleBtn.style.border = "1px solid var(--card-border)";
        } else {
            // Already coupled with someone else, hide choice entirely
            coupleContainer.style.display = "none";
        }

        coupleBtn.onclick = async () => {
            coupleBtn.disabled = true;
            const actionText = coupleBtn.textContent;
            try {
                if (actionText.includes("Add Couple")) {
                    await updateDoc(doc(db, "users", currentUserId), { coupleRequestOut: targetUid });
                    await updateDoc(doc(db, "users", targetUid), { coupleRequestIn: currentUserId });
                } else if (actionText.includes("Accept Couple Request")) {
                    await updateDoc(doc(db, "users", currentUserId), { coupleRequestIn: "", relationshipStatus: "couple", partnerUid: targetUid });
                    await updateDoc(doc(db, "users", targetUid), { coupleRequestOut: "", relationshipStatus: "couple", partnerUid: currentUserId });
                } else if (actionText.includes("Break Up")) {
                    if (!confirm("Are you sure you want to dissolve couple status records?")) return;
                    await updateDoc(doc(db, "users", currentUserId), { relationshipStatus: "single", partnerUid: "" });
                    await updateDoc(doc(db, "users", targetUid), { relationshipStatus: "single", partnerUid: "" });
                }
                await loadProfileData(targetUid, false);
            } catch (err) { console.error(err); }
            finally { coupleBtn.disabled = false; }
        };

        coupleContainer.appendChild(coupleBtn);
        userMomentsGrid.parentNode.insertBefore(coupleContainer, userMomentsGrid);
    }
}

// Global modal toggle event registers
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