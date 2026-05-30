import { auth, db } from './firebase-config.deploy.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const usernameLabel = document.getElementById('lbl-username-display');
const bioContainer = document.getElementById('profile-bio-container');
const statsTray = document.getElementById('stats-numbers-tray');
const photosMatrixGrid = document.getElementById('lik-profile-photos-target-matrix');
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
        const userSnap = await getDoc(doc(db, "users", uid)); if (!userSnap.exists()) return;
        const userData = userSnap.data();

        let statusBadgeHtml = "";
        if (userData.relationshipStatus === "couple") {
            statusBadgeHtml = `<span id="relationship-status-badge">Committed</span>`;
            if (partnerStatusDisplayFrame && userData.partnerUid) { renderPartnerDetailsCard(userData.partnerUid, isViewingSelf); }
        } else {
            statusBadgeHtml = `<span id="relationship-status-badge">Single</span>`;
            if (partnerStatusDisplayFrame) partnerStatusDisplayFrame.innerHTML = "";
        }

        if (usernameLabel) {
            usernameLabel.innerHTML = `
                <div style="display:flex; align-items:center; gap:12px;">
                    <span style="font-weight:800; font-size:1.6rem; color:var(--lik-text-dark);">${userData.name || "User"}</span>
                    ${statusBadgeHtml}
                </div>
                <span style="font-size:0.95rem; color:var(--lik-text-gray); font-weight:500; margin-top:2px; display:block;">${userData.username || '/user'}</span>`;
        }
        
        if (bioContainer) bioContainer.textContent = userData.bio || "No biography added yet.";
        
        if (avatarPreview) {
            if (userData.profilePic) {
                avatarPreview.innerHTML = `<img src="${userData.profilePic}">`;
                if (removePicBtn) removePicBtn.style.display = isViewingSelf ? "block" : "none";
            } else {
                avatarPreview.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--lik-bg-outside); font-weight:bold; color:var(--lik-text-gray);">${(userData.name || "U").charAt(0).toUpperCase()}</div>`;
                if (removePicBtn) removePicBtn.style.display = "none";
            }
        }

        const momentsQuery = query(collection(db, "moments"), where("userId", "==", uid));
        const momentsSnap = await getDocs(momentsQuery);

        if (statsTray) {
            statsTray.innerHTML = `
                <div class="lik-profile-counter-node"><span class="lik-profile-counter-value">${(userData.swappedWith || []).length}</span><span class="lik-profile-counter-label">Swaps</span></div>
                <div class="lik-profile-counter-node"><span class="lik-profile-counter-value">${momentsSnap.size}</span><span class="lik-profile-counter-label">Moments</span></div>
                <div class="lik-profile-counter-node"><span class="lik-profile-counter-value">${userData.totalLikes || 0}</span><span class="lik-profile-counter-label">Score</span></div>`;
        }

        if (isViewingSelf) { if (openEditBtn) openEditBtn.style.display = "block"; removeDynamicProfileButtons(); } 
        else { if (openEditBtn) openEditBtn.style.display = "none"; await injectForeignProfileButtons(uid); }

        if (photosMatrixGrid) {
            photosMatrixGrid.innerHTML = "";
            if (momentsSnap.empty) { photosMatrixGrid.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:var(--lik-text-gray); padding:40px 0;">No active moments</p>`; }
            momentsSnap.forEach(d => {
                const m = d.data(); if (m.imageUrl) {
                    const box = document.createElement('div'); box.className = "lik-profile-matrix-square";
                    box.innerHTML = `<img src="${m.imageUrl}">`; photosMatrixGrid.appendChild(box);
                }
            });
        }
        if (isViewingSelf) {
            document.getElementById('edit-user-name').value = userData.name || "";
            document.getElementById('edit-user-age').value = userData.age || "";
            document.getElementById('edit-user-bio').value = userData.bio || "";
        }
    } catch(err) { console.error(err); }
}

async function renderPartnerDetailsCard(partnerUid, isViewingSelf) {
    try {
        const partnerSnap = await getDoc(doc(db, "users", partnerUid)); if (!partnerSnap.exists()) return;
        const partnerData = partnerSnap.data();
        partnerStatusDisplayFrame.innerHTML = `
            <div class="lik-stream-post-card" style="background:#ffffff; border:1px solid var(--lik-border-clean); border-radius:var(--lik-radius-md); padding:14px; display:flex; align-items:center; gap:12px; margin-bottom:20px;">
                <div class="lik-stream-card-avatar-circle" style="width:40px; height:40px; cursor:pointer;" onclick="window.location.href='profile.html?uid=${partnerUid}'">
                    ${partnerData.profilePic ? `<img src="${partnerData.profilePic}">` : partnerData.name.charAt(0)}
                </div>
                <div style="flex:1;">
                    <span style="font-size:0.75rem; color:var(--lik-danger-red); font-weight:700; text-transform:uppercase;">Partner</span>
                    <h4 style="font-size:1.05rem; font-weight:700;">${partnerData.name}</h4>
                </div>
                ${isViewingSelf ? `<button id="btn-break-up-direct" class="lik-sidebar-action-pill-btn" style="background:var(--lik-danger-red); width:auto; padding:10px 16px; border-radius:20px; font-size:0.8rem;">Break Up</button>` : ''}
            </div>`;
        if (isViewingSelf) {
            partnerStatusDisplayFrame.querySelector('#btn-break-up-direct').onclick = async () => {
                if (!confirm("Confirm dissolution parameters?")) return;
                const me = auth.currentUser.uid;
                await Promise.all([
                    updateDoc(doc(db, "users", me), { relationshipStatus: "single", partnerUid: "", coupleRequestIn: "", coupleRequestOut: "" }),
                    updateDoc(doc(db, "users", partnerUid), { relationshipStatus: "single", partnerUid: "", coupleRequestIn: "", coupleRequestOut: "" })
                ]);
                await loadProfileData(me, true);
            };
        }
    } catch(err) { console.error(err); }
}

function removeDynamicProfileButtons() { document.getElementById('profile-dynamic-swap-btn')?.remove(); document.getElementById('profile-dynamic-couple-btn')?.remove(); }
async function injectForeignProfileButtons(targetUid) {
    const me = auth.currentUser.uid; removeDynamicProfileButtons();
    const mySnap = await getDoc(doc(db, "users", me)); const myData = mySnap.data();
    const mutual = myData.swappedWith || []; const sent = myData.swapRequestsOut || []; const inc = myData.swapRequestsIn || [];

    const holder = document.createElement('div'); holder.id = "profile-dynamic-swap-btn"; holder.style = "margin-bottom:12px; width:100%;";
    const b = document.createElement('button'); b.className = "lik-sidebar-action-pill-btn"; b.style.width = "100%"; b.style.borderRadius = "12px";
    if (mutual.includes(targetUid)) { b.textContent = "Unswap Networks"; b.style.background = "#666"; }
    else if (sent.includes(targetUid)) { b.textContent = "Requested"; b.style.background = "#888"; }
    else if (inc.includes(targetUid)) { b.textContent = "Accept Swap Request"; }
    else { b.textContent = "Swap Profile"; }
    b.onclick = async () => {
        if (b.textContent === "Swap Profile") {
            await updateDoc(doc(db, "users", me), { swapRequestsOut: arrayUnion(targetUid) }); await updateDoc(doc(db, "users", targetUid), { swapRequestsIn: arrayUnion(me) });
        } else if (b.textContent === "Unswap Networks") {
            await updateDoc(doc(db, "users", me), { swappedWith: arrayRemove(targetUid), relationshipStatus:"single", partnerUid:"" });
            await updateDoc(doc(db, "users", targetUid), { swappedWith: arrayRemove(me), relationshipStatus:"single", partnerUid:"" });
        } else if (b.textContent === "Accept Swap Request") {
            await updateDoc(doc(db, "users", me), { swapRequestsIn: arrayRemove(targetUid), swappedWith: arrayUnion(targetUid) });
            await updateDoc(doc(db, "users", targetUid), { swapRequestsOut: arrayRemove(me), swappedWith: arrayUnion(me) });
        }
        await loadProfileData(targetUid, false);
    };
    holder.appendChild(b); photosMatrixGrid.parentNode.insertBefore(holder, photosMatrixGrid.parentNode.querySelector('.lik-feed-master-card-shell'));
}

if (openEditBtn) openEditBtn.onclick = () => editModal.style.display = 'flex';
if (closeEditBtn) closeEditBtn.onclick = () => editModal.style.display = 'none';
if (editForm) {
    editForm.onsubmit = async (e) => {
        e.preventDefault(); await updateDoc(doc(db, "users", auth.currentUser.uid), {
            name: document.getElementById('edit-user-name').value.trim(), age: parseInt(document.getElementById('edit-user-age').value), bio: document.getElementById('edit-user-bio').value.trim()
        }); editModal.style.display = 'none'; await loadProfileData(auth.currentUser.uid, true);
    };
}
if (avatarPreview && avatarInput) avatarPreview.onclick = () => avatarInput.click();
if (avatarInput) {
    avatarInput.onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.readAsDataURL(f);
        r.onload = async () => { await updateDoc(doc(db, "users", auth.currentUser.uid), { profilePic: r.result }); await loadProfileData(auth.currentUser.uid, true); };
    };
}