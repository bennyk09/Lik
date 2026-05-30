import { db, auth } from './firebase-config.deploy.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const incomingContainer = document.getElementById('incoming-requests-list');
const sentContainer = document.getElementById('sent-requests-list');
const mutualContainer = document.getElementById('mutual-swaps-list');

const searchInput = document.getElementById('swaps-search-input');
const searchResultsTray = document.getElementById('swaps-search-results');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        await renderSwapsDashboard(user.uid);
    } else {
        window.location.href = "index.html";
    }
});

async function renderSwapsDashboard(myUid) {
    try {
        const mySnap = await getDoc(doc(db, "users", myUid));
        if (!mySnap.exists()) return;
        const myData = mySnap.data();

        // 🪐 SAFE FALLBACKS: If arrays are missing from older docs, default to empty arrays
        const incomingIds = myData.swapRequestsIn || [];
        const sentIds = myData.swapRequestsOut || [];
        const mutualIds = myData.swappedWith || [];

        // 1. POPULATE INCOMING REQUESTS
        incomingContainer.innerHTML = incomingIds.length === 0 ? `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 4px;">No new swap requests.</p>` : "";
        for (const targetUid of incomingIds) {
            const profile = await fetchProfile(targetUid);
            if (profile) {
                const item = document.createElement('div');
                item.style = "display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--card-color); border: 1px solid var(--card-border); border-radius: var(--radius-md);";
                item.innerHTML = `
                    <div class="post-avatar" style="width:36px; height:36px; font-size:0.85rem; cursor:pointer;" onclick="window.location.href='profile.html?uid=${targetUid}'">
                        ${profile.profilePic ? `<img src="${profile.profilePic}">` : (profile.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div style="display: flex; flex-direction: column; flex: 1; cursor:pointer;" onclick="window.location.href='profile.html?uid=${targetUid}'">
                        <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-main); line-height:1.2;">${profile.name}</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">${profile.username}</span>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn-primary btn-accept" data-uid="${targetUid}" style="padding: 6px 14px; font-size: 0.75rem; background: var(--accent-color); color:#fff; border-radius:20px; cursor:pointer; border:none; font-weight:700;">Accept</button>
                        <button class="btn-secondary btn-reject" data-uid="${targetUid}" style="padding: 6px 14px; font-size: 0.75rem; border-radius:20px; cursor:pointer; font-weight:600;">Reject</button>
                    </div>`;
                incomingContainer.appendChild(item);
            }
        }

        // 2. POPULATE SENT REQUESTS
        sentContainer.innerHTML = sentIds.length === 0 ? `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 4px;">No pending sent invitations.</p>` : "";
        for (const targetUid of sentIds) {
            const profile = await fetchProfile(targetUid);
            if (profile) {
                const item = document.createElement('div');
                item.style = "display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--card-color); border: 1px solid var(--card-border); border-radius: var(--radius-md); opacity: 0.75;";
                item.innerHTML = `
                    <div class="post-avatar" style="width:36px; height:36px; font-size:0.85rem; cursor:pointer;" onclick="window.location.href='profile.html?uid=${targetUid}'">
                        ${profile.profilePic ? `<img src="${profile.profilePic}">` : (profile.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div style="display: flex; flex-direction: column; flex: 1; cursor:pointer;" onclick="window.location.href='profile.html?uid=${targetUid}'">
                        <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-main); line-height:1.2;">${profile.name}</span>
                        <span style="font-size: 0.75rem; color: var(--accent-color); font-weight: 500;">${profile.username}</span>
                    </div>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight:600; padding-right:4px;">Requested</span>`;
                sentContainer.appendChild(item);
            }
        }

        // 3. POPULATE MUTUAL SWAPPED FRIENDS
        mutualContainer.innerHTML = mutualIds.length === 0 ? `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 8px 4px;">No mutual connections formed yet.</p>` : "";
        for (const targetUid of mutualIds) {
            const profile = await fetchProfile(targetUid);
            if (profile) {
                const item = document.createElement('div');
                item.style = "display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--card-color); border: 1px solid var(--card-border); border-radius: var(--radius-md);";
                item.innerHTML = `
                    <div class="post-avatar" style="width:36px; height:36px; font-size:0.85rem; cursor:pointer;" onclick="window.location.href='profile.html?uid=${targetUid}'">
                        ${profile.profilePic ? `<img src="${profile.profilePic}">` : (profile.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div style="display: flex; flex-direction: column; flex: 1; cursor:pointer;" onclick="window.location.href='profile.html?uid=${targetUid}'">
                        <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-main); line-height:1.2;">${profile.name}</span>
                        <span style="font-size: 0.75rem; color: var(--accent-color); font-weight: 500;">${profile.username}</span>
                    </div>
                    <button class="btn-unswap" data-uid="${targetUid}" style="padding: 6px 14px; font-size: 0.75rem; border-radius:20px; font-weight:600; cursor:pointer; background: transparent; color: var(--accent-red); border: 1px solid rgba(255,59,48,0.2); transition: 0.2s;">Unswap</button>`;
                
                const unswapBtn = item.querySelector('.btn-unswap');
                unswapBtn.onmouseenter = () => { unswapBtn.style.background = "var(--accent-red)"; unswapBtn.style.color = "#fff"; };
                unswapBtn.onmouseleave = () => { unswapBtn.style.background = "transparent"; unswapBtn.style.color = "var(--accent-red)"; };

                mutualContainer.appendChild(item);
            }
        }

        bindActionButtons(myUid);

    } catch (err) { console.error("Swaps dashboard critical render error: ", err); }
}

function bindActionButtons(myUid) {
    document.querySelectorAll('.btn-accept').forEach(btn => {
        btn.onclick = async (e) => {
            const targetUid = e.currentTarget.getAttribute('data-uid');
            e.currentTarget.disabled = true;
            try {
                await Promise.all([
                    updateDoc(doc(db, "users", myUid), { swapRequestsIn: arrayRemove(targetUid), swappedWith: arrayUnion(targetUid) }),
                    updateDoc(doc(db, "users", targetUid), { swapRequestsOut: arrayRemove(myUid), swappedWith: arrayUnion(myUid) })
                ]);
                await renderSwapsDashboard(myUid);
            } catch (err) { console.error(err); }
        };
    });

    document.querySelectorAll('.btn-reject').forEach(btn => {
        btn.onclick = async (e) => {
            const targetUid = e.currentTarget.getAttribute('data-uid');
            e.currentTarget.disabled = true;
            try {
                await Promise.all([
                    updateDoc(doc(db, "users", myUid), { swapRequestsIn: arrayRemove(targetUid) }),
                    updateDoc(doc(db, "users", targetUid), { swapRequestsOut: arrayRemove(myUid) })
                ]);
                await renderSwapsDashboard(myUid);
            } catch (err) { console.error(err); }
        };
    });

    document.querySelectorAll('.btn-unswap').forEach(btn => {
        btn.onclick = async (e) => {
            const targetUid = e.currentTarget.getAttribute('data-uid');
            if (!confirm("Are you sure you want to unswap with this user?")) return;
            e.currentTarget.disabled = true;
            try {
                await Promise.all([
                    updateDoc(doc(db, "users", myUid), { swappedWith: arrayRemove(targetUid) }),
                    updateDoc(doc(db, "users", targetUid), { swappedWith: arrayRemove(myUid) })
                ]);
                await renderSwapsDashboard(myUid);
            } catch (err) { console.error(err); }
        };
    });
}

if (searchInput) {
    searchInput.oninput = async (e) => {
        let keyword = e.target.value.trim().toLowerCase();
        if (!keyword) {
            searchResultsTray.innerHTML = "";
            searchResultsTray.style.display = "none";
            return;
        }
        if (!keyword.startsWith("/")) keyword = "/" + keyword;

        try {
            const endThreshold = keyword + "\uf8ff";
            const q = query(collection(db, "users"), where("username", ">=", keyword), where("username", "<=", endThreshold), limit(5));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                searchResultsTray.innerHTML = `<p style="padding: 12px; font-size: 0.85rem; color: var(--text-muted); text-align: center; margin:0;">No users matched "${keyword}"</p>`;
                searchResultsTray.style.display = "block";
                return;
            }

            searchResultsTray.innerHTML = "";
            snapshot.forEach(docData => {
                const userProfile = docData.data();
                const row = document.createElement('div');
                row.style = "display: flex; align-items: center; gap: 12px; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.03); cursor: pointer; border-radius:4px;";
                row.innerHTML = `
                    <div class="post-avatar" style="width:34px; height:34px; font-size:0.8rem;">
                        ${userProfile.profilePic ? `<img src="${userProfile.profilePic}">` : (userProfile.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-main); line-height:1.2;">${userProfile.name || "User"}</span>
                        <span style="font-size: 0.75rem; color: var(--accent-color); font-weight: 500; margin-top:1px;">${userProfile.username}</span>
                    </div>`;
                
                row.onclick = () => {
                    window.location.href = `profile.html?uid=${userProfile.uid}`;
                };
                row.onmouseenter = () => row.style.background = "rgba(255,255,255,0.03)";
                row.onmouseleave = () => row.style.background = "transparent";
                searchResultsTray.appendChild(row);
            });
            searchResultsTray.style.display = "block";
        } catch (err) { console.error(err); }
    };

    document.addEventListener('click', (e) => {
        if (e.target !== searchInput && e.target !== searchResultsTray) {
            if (searchResultsTray) searchResultsTray.style.display = "none";
        }
    });
}

async function fetchProfile(uid) {
    const s = await getDoc(doc(db, "users", uid));
    return s.exists() ? s.data() : null;
}