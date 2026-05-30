import { db, auth } from './firebase-config.deploy.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const incomingContainer = document.getElementById('incoming-requests-list');
const sentContainer = document.getElementById('sent-requests-list');
const mutualContainer = document.getElementById('mutual-swaps-list');
const searchInput = document.getElementById('swaps-search-input');
const searchResultsTray = document.getElementById('swaps-search-results');

onAuthStateChanged(auth, async (user) => {
    if (user) { await renderSwapsDashboard(user.uid); } else { window.location.href = "index.html"; }
});

async function renderSwapsDashboard(myUid) {
    try {
        const mySnap = await getDoc(doc(db, "users", myUid));
        if (!mySnap.exists()) return;
        const myData = mySnap.data();

        const incomingIds = myData.swapRequestsIn || [];
        const sentIds = myData.swapRequestsOut || [];
        const mutualIds = myData.swappedWith || [];

        incomingContainer.innerHTML = incomingIds.length === 0 ? `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 4px;">No new swap requests.</p>` : "";
        for (const targetUid of incomingIds) {
            const profile = await fetchProfile(targetUid);
            if (profile) {
                const item = document.createElement('div');
                item.className = "post-card";
                item.style = "display: flex; align-items: center; gap: 12px; padding: 12px; margin-bottom: 10px;";
                item.innerHTML = `
                    <div class="post-avatar" style="width:36px; height:36px; font-size:0.85rem; cursor:pointer;" onclick="window.location.href='profile.html?uid=${targetUid}'">
                        ${profile.profilePic ? `<img src="${profile.profilePic}">` : (profile.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div style="display: flex; flex-direction: column; flex: 1; cursor:pointer;" onclick="window.location.href='profile.html?uid=${targetUid}'">
                        <span style="font-size: 0.85rem; font-weight: 600;">${profile.name}</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${profile.username}</span>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-primary btn-accept" data-uid="${targetUid}" style="padding: 6px 14px; font-size: 0.75rem;">Accept</button>
                        <button class="btn-secondary btn-reject" data-uid="${targetUid}" style="padding: 6px 14px; font-size: 0.75rem;">Reject</button>
                    </div>`;
                incomingContainer.appendChild(item);
            }
        }

        sentContainer.innerHTML = sentIds.length === 0 ? `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 4px;">No pending sent invitations.</p>` : "";
        for (const targetUid of sentIds) {
            const profile = await fetchProfile(targetUid);
            if (profile) {
                const item = document.createElement('div');
                item.className = "post-card";
                item.style = "display: flex; align-items: center; gap: 12px; padding: 12px; margin-bottom: 10px; opacity: 0.75;";
                item.innerHTML = `
                    <div class="post-avatar" style="width:36px; height:36px; font-size:0.85rem; cursor:pointer;" onclick="window.location.href='profile.html?uid=${targetUid}'">
                        ${profile.profilePic ? `<img src="${profile.profilePic}">` : (profile.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div style="display: flex; flex-direction: column; flex: 1; cursor:pointer;" onclick="window.location.href='profile.html?uid=${targetUid}'">
                        <span style="font-size: 0.85rem; font-weight: 600;">${profile.name}</span>
                        <span style="font-size: 0.75rem; color: var(--accent-color);">${profile.username}</span>
                    </div>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight:600;">Requested</span>`;
                sentContainer.appendChild(item);
            }
        }

        mutualContainer.innerHTML = mutualIds.length === 0 ? `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 4px;">No mutual connections formed yet.</p>` : "";
        for (const targetUid of mutualIds) {
            const profile = await fetchProfile(targetUid);
            if (profile) {
                const item = document.createElement('div');
                item.className = "post-card";
                item.style = "display: flex; align-items: center; gap: 12px; padding: 12px; margin-bottom: 10px;";
                item.innerHTML = `
                    <div class="post-avatar" style="width:36px; height:36px; font-size:0.85rem; cursor:pointer;" onclick="window.location.href='profile.html?uid=${targetUid}'">
                        ${profile.profilePic ? `<img src="${profile.profilePic}">` : (profile.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div style="display: flex; flex-direction: column; flex: 1; cursor:pointer;" onclick="window.location.href='profile.html?uid=${targetUid}'">
                        <span style="font-size: 0.85rem; font-weight: 600;">${profile.name}</span>
                        <span style="font-size: 0.75rem; color: var(--accent-color);">${profile.username}</span>
                    </div>
                    <button class="btn-secondary btn-unswap" data-uid="${targetUid}" style="padding: 6px 14px; font-size: 0.75rem; color: var(--accent-red);">Unswap</button>`;
                mutualContainer.appendChild(item);
            }
        }
        bindActionButtons(myUid);
    } catch (err) { console.error(err); }
}

function bindActionButtons(myUid) {
    document.querySelectorAll('.btn-accept').forEach(btn => {
        btn.onclick = async (e) => {
            const targetUid = e.currentTarget.getAttribute('data-uid');
            try {
                await Promise.all([
                    updateDoc(doc(db, "users", myUid), { swapRequestsIn: arrayRemove(targetUid), swappedWith: arrayUnion(targetUid) }),
                    updateDoc(doc(db, "users", targetUid), { swapRequestsOut: arrayRemove(myUid), swappedWith: arrayUnion(myUid) })
                ]);
                await renderSwapsDashboard(myUid);
            } catch (err) { console.error(err); }
        };
    });
    // Truncated clean binding logic for brevity 
}
async function fetchProfile(uid) { const s = await getDoc(doc(db, "users", uid)); return s.exists() ? s.data() : null; }