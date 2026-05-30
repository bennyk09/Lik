import { auth, db } from './firebase-config.deploy.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const usernameLabel = document.getElementById('lbl-username-display');
const bioContainer = document.getElementById('profile-bio-container');
const statsTray = document.getElementById('stats-numbers-tray');
const userMomentsGrid = document.getElementById('user-moments');
const partnerStatusDisplayFrame = document.getElementById('partner-status-display-frame');

const editModal = document.getElementById('edit-profile-modal');
const openEditBtn = document.getElementById('open-edit-modal-btn');
const closeEditBtn = document.getElementById('close-edit-modal-btn');
const editForm = document.getElementById('edit-profile-form');
const avatarPreview = document.getElementById('avatar-preview');
const avatarInput = document.getElementById('avatar-input');
const removePicBtn = document.getElementById('remove-pic-btn');

const urlParams = new URLSearchParams(window.location.search);
const targetProfileUid = urlParams.get('uid');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const uidToLoad = (targetProfileUid && targetProfileUid !== user.uid) ? targetProfileUid : user.uid;
        const isViewingSelf = (uidToLoad === user.uid);
        await loadProfileData(uidToLoad, isViewingSelf);
    } else { window.location.href = "index.html"; }
});

async function loadProfileData(uid, isViewingSelf) {
    try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (!userSnap.exists()) return;
        const userData = userSnap.data();

        let statusBadgeHtml = "";
        if (userData.relationshipStatus === "couple") {
            statusBadgeHtml = `<span id="relationship-status-badge">Committed</span>`;
            if (partnerStatusDisplayFrame && userData.partnerUid) {
                renderPartnerDetailsCard(userData.partnerUid, isViewingSelf);
            }
        } else {
            statusBadgeHtml = `<span id="relationship-status-badge">Single</span>`;
            if (partnerStatusDisplayFrame) partnerStatusDisplayFrame.innerHTML = "";
        }

        if (usernameLabel) {
            usernameLabel.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-weight: 800; font-size: 1.7rem; color: var(--text-main); letter-spacing:-0.5px;">${userData.name || "User"}</span>
                    ${statusBadgeHtml}
                </div>
                <span style="font-size: 0.95rem; color: var(--text-muted); font-weight: 500; margin-top: 2px; display:block;">${userData.username || '/user'}</span>
            `;
        }
        
        if (bioContainer) bioContainer.textContent = userData.bio || "No biography added yet.";
        
        if (avatarPreview) {
            if (userData.profilePic) {
                avatarPreview.innerHTML = `<img src="${userData.profilePic}" alt="Avatar">`;
                if (removePicBtn) removePicBtn.style.display = isViewingSelf ? "block" : "none";
            } else {
                avatarPreview.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#eee; font-weight:bold; font-size:1.5rem; color:#666;">${(userData.name || "U").charAt(0).toUpperCase()}</div>`;
                if (removePicBtn) removePicBtn.style.display = "none";
            }
        }

        const momentsQuery = query(collection(db, "moments"), where("userId", "==", uid));
        const momentsSnap = await getDocs(momentsQuery);
        const activeMomentsCount = momentsSnap.size;

        const swappedArray = userData.swappedWith || [];
        const scoreLikes = userData.totalLikes || 0;

        let computedRankPosition = "#0"; 
        try {
            if (scoreLikes > 0) {
                const rankQuery = query(collection(db, "users"), orderBy("totalLikes", "desc"));
                const rankSnapshot = await getDocs(rankQuery);
                let indexPosition = 1, trueRank = 1, previousLikes = -1;

                for (const docData of rankSnapshot.docs) {
                    const currentDocLikes = docData.data().totalLikes || 0;
                    if (currentDocLikes < previousLikes) trueRank = indexPosition;
                    if (docData.id === uid) { computedRankPosition = `#${trueRank}`; break; }
                    previousLikes = currentDocLikes; indexPosition++;
                }
            }
        } catch (rankErr) { console.warn(rankErr); }

        if (statsTray) {
            statsTray.innerHTML = `
                <div class="stat-node"><span class="stat-node-val">${swappedArray.length}</span><span class="stat-node-lbl">Swaps</span></div>
                <div class="stat-node"><span class="stat-node-val">${activeMomentsCount}</span><span class="stat-node-lbl">Moments</span></div>
                <div class="stat-node"><span class="stat-node-val">${scoreLikes}</span><span class="stat-node-lbl">Score</span></div>
                <div class="stat-node"><span class="stat-node-val">${computedRankPosition}</span><span class="stat-node-lbl">Rank</span></div>
            `;
        }

        if (isViewingSelf) {
            if (openEditBtn) openEditBtn.style.display = "block";
            removeDynamicProfileButtons();
        } else {
            if (openEditBtn) openEditBtn.style.display = "none";
            await injectForeignProfileButtons(uid);
        }

        if (userMomentsGrid) {
            userMomentsGrid.innerHTML = "";
            if (momentsSnap.empty) {
                userMomentsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:var(--text-muted); padding: 40px 0;">No active photos right now.</p>`;
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

async function renderPartnerDetailsCard(partnerUid, isViewingSelf) {
    try {
        const partnerSnap = await getDoc(doc(db, "users", partnerUid));
        if (!partnerSnap.exists()) return;
        const partnerData = partnerSnap.data();

        partnerStatusDisplayFrame.innerHTML = `
            <div class="timeline-post-node" style="margin-bottom: 20px; background: white; border: 1px solid var(--card-border); border-radius: var(--radius-img); padding: 14px; display: flex; align-items: center; gap: 12px;">
                <div class="post-avatar-circle" style="width: 40px; height: 40px; cursor: pointer;" onclick="window.location.href='profile.html?uid=${partnerUid}'">
                    ${partnerData.profilePic ? `<img src="${partnerData.profilePic}">` : (partnerData.name || "U").charAt(0).toUpperCase()}
                </div>
                <div style="display: flex; flex-direction: column; flex: 1; cursor: pointer;" onclick="window.location.href='profile.html?uid=${partnerUid}'">
                    <span style="font-size: 0.8rem; color: #ff3b30; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Partner</span>
                    <span style="font-size: 1.05rem; font-weight: 700; color: var(--text-main);">${partnerData.name}</span>
                </div>
                ${isViewingSelf ? `<button id="btn-break-up-direct" class="sidebar-bottom-pill-btn" style="background:#ff3b30; width:auto; padding: 10px 18px; font-size:0.85rem;">Break Up</button>` : ''}
            </div>
        `;

        if (isViewingSelf) {
            partnerStatusDisplayFrame.querySelector('#btn-break-up-direct').onclick = async (e) => {
                e.stopPropagation();
                if (!confirm("Break up relationship link parameters?")) return;
                const currentUserId = auth.currentUser.uid;
                try {
                    await Promise.all([
                        updateDoc(doc(db, "users", currentUserId), { relationshipStatus: "single", partnerUid: "", coupleRequestIn: "", coupleRequestOut: "" }),
                        updateDoc(doc(db, "users", partnerUid), { relationshipStatus: "single", partnerUid: "", coupleRequestIn: "", coupleRequestOut: "" })
                    ]);
                    await loadProfileData(currentUserId, true);
                } catch(err) { console.error(err); }
            };
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

    const myCoupleStatus = myData.relationshipStatus || "single";
    const myPartnerUid = myData.partnerUid || "";
    const myCoupleReqOut = myData.coupleRequestOut || "";
    const myCoupleReqIn = myData.coupleRequestIn || "";

    const swapContainer = document.createElement('div');
    swapContainer.id = "profile-dynamic-swap-btn";
    swapContainer.style = "margin-bottom: 12px; width: 100%;";

    const swapBtn = document.createElement('button');
    swapBtn.className = "sidebar-bottom-pill-btn";
    swapBtn.style.maxWidth = "100%";
    
    if (mutualIds.includes(targetUid)) {
        swapBtn.textContent = "Unswap Connection"; swapBtn.style.background = "#666";
    } else if (sentIds.includes(targetUid)) {
        swapBtn.textContent = "Requested"; swapBtn.style.background = "#888";
    } else if (incomingIds.includes(targetUid)) {
        swapBtn.textContent = "Accept Swap Request";
    } else {
        swapBtn.textContent = "Swap Profile";
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
                await updateDoc(doc(db, "users", currentUserId), { swappedWith: arrayRemove(targetUid), relationshipStatus: "single", partnerUid: "", coupleRequestIn: "", coupleRequestOut: "" });
                await updateDoc(doc(db, "users", targetUid), { swappedWith: arrayRemove(currentUserId), relationshipStatus: "single", partnerUid: "", coupleRequestIn: "", coupleRequestOut: "" });
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

    if (mutualIds.includes(targetUid)) {
        const coupleContainer = document.createElement('div');
        coupleContainer.id = "profile-dynamic-couple-btn";
        coupleContainer.style = "margin-bottom: 32px; width: 100%;";

        if (myCoupleStatus === "couple" && myPartnerUid !== targetUid) return;

        if (myCoupleStatus === "couple" && myPartnerUid === targetUid) {
            const breakBtn = document.createElement('button');
            breakBtn.className = "sidebar-bottom-pill-btn"; breakBtn.style.background = "#ff3b30"; breakBtn.style.maxWidth = "100__";
            breakBtn.textContent = "Break Up (Remove Couple)";
            breakBtn.onclick = async () => {
                if (!confirm("Are you sure?")) return;
                await updateDoc(doc(db, "users", currentUserId), { relationshipStatus: "single", partnerUid: "", coupleRequestIn: "", coupleRequestOut: "" });
                await updateDoc(doc(db, "users", targetUid), { relationshipStatus: "single", partnerUid: "", coupleRequestIn: "", coupleRequestOut: "" });
                await loadProfileData(targetUid, false);
            };
            coupleContainer.appendChild(breakBtn);
        } else if (myCoupleReqOut === targetUid) {
            const pendingBtn = document.createElement('button');
            pendingBtn.className = "sidebar-bottom-pill-btn"; pendingBtn.style.background = "#888"; pendingBtn.style.maxWidth = "100%"; pendingBtn.disabled = true;
            pendingBtn.textContent = "Couple Proposal Sent...";
            coupleContainer.appendChild(pendingBtn);
        } else if (myCoupleReqIn === targetUid) {
            const rowWrapper = document.createElement('div');
            rowWrapper.style = "display: flex; gap: 12px; width: 100%;";
            rowWrapper.innerHTML = `
                <button id="btn-accept-couple" class="sidebar-bottom-pill-btn" style="flex: 1; background: #ff3b30;">Accept</button>
                <button id="btn-reject-couple" class="sidebar-bottom-pill-btn" style="flex: 1; background: #666;">Reject</button>
            `;
            rowWrapper.querySelector('#btn-accept-couple').onclick = async () => {
                await updateDoc(doc(db, "users", currentUserId), { coupleRequestIn: "", relationshipStatus: "couple", partnerUid: targetUid });
                await updateDoc(doc(db, "users", targetUid), { coupleRequestOut: "", relationshipStatus: "couple", partnerUid: currentUserId });
                await loadProfileData(targetUid, false);
            };
            rowWrapper.querySelector('#btn-reject-couple').onclick = async () => {
                await updateDoc(doc(db, "users", currentUserId), { coupleRequestIn: "" });
                await updateDoc(doc(db, "users", targetUid), { coupleRequestOut: "" });
                await loadProfileData(targetUid, false);
            };
            coupleContainer.appendChild(rowWrapper);
        } else if (myCoupleStatus === "single") {
            const proposeBtn = document.createElement('button');
            proposeBtn.className = "sidebar-bottom-pill-btn"; proposeBtn.style.maxWidth = "100%";
            proposeBtn.textContent = "Add Couple";
            proposeBtn.onclick = async () => {
                await updateDoc(doc(db, "users", currentUserId), { coupleRequestOut: targetUid });
                await updateDoc(doc(db, "users", targetUid), { coupleRequestIn: currentUserId });
                await loadProfileData(targetUid, false);
            };
            coupleContainer.appendChild(proposeBtn);
        }
        userMomentsGrid.parentNode.insertBefore(coupleContainer, userMomentsGrid);
    }
}

if (openEditBtn) openEditBtn.onclick = () => editModal.style.display = 'flex';
if (closeEditBtn) closeEditBtn.onclick = () => editModal.style.display = 'none';

if (editForm) {
    editForm.onsubmit = async (e) => {
        e.preventDefault();
        try {
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                name: document.getElementById('edit-user-name').value.trim(),
                age: parseInt(document.getElementById('edit-user-age').value),
                bio: document.getElementById('edit-user-bio').value.trim()
            });
            editModal.style.display = 'none';
            await loadProfileData(auth.currentUser.uid, true);
        } catch (err) { alert(err.message); }
    };
}

if (avatarPreview && avatarInput) {
    avatarPreview.onclick = () => { avatarInput.click(); };
}

if (avatarInput) {
    avatarInput.onchange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = async () => {
            try {
                await updateDoc(doc(db, "users", auth.currentUser.uid), { profilePic: reader.result });
                await loadProfileData(auth.currentUser.uid, true);
            } catch (err) { alert(err.message); }
        };
    };
}