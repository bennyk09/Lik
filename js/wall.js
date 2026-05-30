import { db, auth } from './firebase-config.deploy.js';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, increment, deleteDoc, arrayUnion, arrayRemove, limit, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const feed = document.getElementById('wall-feed');
const storiesTray = document.getElementById('stories-tray');

const searchInput = document.getElementById('user-search-input');
const searchResultsTray = document.getElementById('search-results-tray');

const viewUserModal = document.getElementById('view-user-modal');
const closeUserModalBtn = document.getElementById('close-user-modal-btn');
const swapActionBtn = document.getElementById('swap-action-btn');
const viewUserAvatar = document.getElementById('view-user-avatar');
const viewUserName = document.getElementById('view-user-name');
const viewUserHandle = document.getElementById('view-user-handle');
const viewUserBio = document.getElementById('view-user-bio');

async function renderAppFeed() {
    if (!feed) return;
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const q = query(collection(db, "moments"), where("uploadTimestamp", ">", dayAgo), orderBy("uploadTimestamp", "desc"));
    
    try {
        const snap = await getDocs(q);
        feed.innerHTML = "";
        
        if(snap.empty) {
            feed.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding: 40px 0; font-size:0.9rem;">No moments active right now.</p>`;
            return;
        }

        const userCacheMap = new Map();
        const currentUserId = auth.currentUser ? auth.currentUser.uid : null;
        
        for (const docData of snap.docs) {
            const moment = docData.data();
            const momentId = docData.id;
            
            if (!userCacheMap.has(moment.userId)) {
                const authorSnap = await getDocs(query(collection(db, "users"), where("uid", "==", moment.userId)));
                if (!authorSnap.empty) {
                    userCacheMap.set(moment.userId, authorSnap.docs[0].data());
                }
            }
            
            const authorData = userCacheMap.get(moment.userId) || { name: "User", username: "/user", profilePic: "" };
            const isMyMoment = currentUserId === moment.userId;
            const likedByArray = moment.likedBy || [];
            const hasLiked = currentUserId && likedByArray.includes(currentUserId);

            const card = document.createElement('div');
            card.className = "post-card";
            card.id = `moment-card-${momentId}`;
            card.innerHTML = `
                <div class="post-header" style="display: flex; align-items: center; gap: 12px;">
                    <div class="post-avatar" style="cursor: pointer;" data-profile-click-uid="${moment.userId}">
                        ${authorData.profilePic ? `<img src="${authorData.profilePic}">` : (authorData.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div style="display: flex; flex-direction: column; cursor: pointer;" data-profile-click-uid="${moment.userId}">
                        <span class="post-username" style="font-weight: 600; font-size: 0.9rem; color: var(--text-main); line-height: 1.2;">${authorData.name || "Anonymous"}</span>
                        <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 500; margin-top: 2px;">${authorData.username || "/user"}</span>
                    </div>
                </div>
                ${moment.imageUrl ? `<div class="post-media-container"><img src="${moment.imageUrl}" class="post-img"></div>` : ''}
                ${moment.text ? `<p class="post-caption"><strong>${authorData.name || "User"}</strong> ${moment.text}</p>` : ''}
                <div class="moment-footer">
                    <button class="like-btn" data-id="${momentId}" data-author="${moment.userId}" data-liked="${hasLiked}" style="${hasLiked ? 'background: #ff3b30; color: #fff; border-color: #ff3b30;' : ''}">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                        <span class="like-count-num">${likedByArray.length}</span>
                    </button>
                    
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${isMyMoment ? `<button class="btn-delete-moment" data-id="${momentId}">Delete</button>` : ''}
                        <small style="color:var(--text-muted); font-size:0.75rem;">${calcTime(moment.uploadTimestamp)}</small>
                    </div>
                </div>
            `;
            
            card.querySelectorAll('[data-profile-click-uid]').forEach(el => {
                el.onclick = () => openUserProfileCard(el.getAttribute('data-profile-click-uid'));
            });
            
            feed.appendChild(card);
        }

        bindLikes();
        bindDeletions();
    } catch(err) { console.error("Feed pipeline error: ", err); }
}

async function openUserProfileCard(targetUid) {
    if (!auth.currentUser) return;
    const currentUserId = auth.currentUser.uid;
    
    try {
        const targetUserSnap = await getDoc(doc(db, "users", targetUid));
        if (!targetUserSnap.exists()) return;
        const targetUserData = targetUserSnap.data();

        if (viewUserAvatar) {
            viewUserAvatar.innerHTML = targetUserData.profilePic ? `<img src="${targetUserData.profilePic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` : (targetUserData.name || "U").charAt(0).toUpperCase();
        }
        if (viewUserName) viewUserName.textContent = targetUserData.name || "User";
        if (viewUserHandle) viewUserHandle.textContent = targetUserData.username || "/user";
        if (viewUserBio) viewUserBio.textContent = targetUserData.bio || "No biography added yet.";

        if (searchResultsTray) searchResultsTray.style.display = "none";
        if (searchInput) searchInput.value = "";

        if (currentUserId === targetUid) {
            swapActionBtn.style.display = "none";
        } else {
            swapActionBtn.style.display = "block";
            
            const myProfileSnap = await getDoc(doc(db, "users", currentUserId));
            const myData = myProfileSnap.data();
            
            const incomingIds = myData.swapRequestsIn || [];
            const sentIds = myData.swapRequestsOut || [];
            const mutualIds = myData.swappedWith || [];

            if (mutualIds.includes(targetUid)) {
                swapActionBtn.textContent = "Unswap";
                swapActionBtn.style.background = "transparent";
                swapActionBtn.style.color = "var(--text-main)";
                swapActionBtn.style.border = "1px solid var(--card-border)";
            } else if (sentIds.includes(targetUid)) {
                swapActionBtn.textContent = "Requested";
                swapActionBtn.style.background = "rgba(255,255,255,0.05)";
                swapActionBtn.style.color = "var(--text-muted)";
                swapActionBtn.style.border = "1px solid var(--card-border)";
            } else if (incomingIds.includes(targetUid)) {
                swapActionBtn.textContent = "Accept Swap";
                swapActionBtn.style.background = "var(--accent-color)";
                swapActionBtn.style.color = "#fff";
                swapActionBtn.style.border = "1px solid transparent";
            } else {
                swapActionBtn.textContent = "Swap";
                swapActionBtn.style.background = "var(--accent-color)";
                swapActionBtn.style.color = "#fff";
                swapActionBtn.style.border = "1px solid transparent";
            }
            
            swapActionBtn.onclick = () => handleModalSwapOperation(targetUid, swapActionBtn.textContent, currentUserId);
        }

        viewUserModal.style.display = "flex";

    } catch(err) { console.error(err); }
}

async function handleModalSwapOperation(targetUid, currentLabel, myUid) {
    swapActionBtn.disabled = true;
    try {
        if (currentLabel === "Swap") {
            await Promise.all([
                updateDoc(doc(db, "users", myUid), { swapRequestsOut: arrayUnion(targetUid) }),
                updateDoc(doc(db, "users", targetUid), { swapRequestsIn: arrayUnion(myUid) })
            ]);
        } else if (currentLabel === "Unswap") {
            if (!confirm("Unswap with this user?")) return;
            await Promise.all([
                updateDoc(doc(db, "users", myUid), { swappedWith: arrayRemove(targetUid) }),
                updateDoc(doc(db, "users", targetUid), { swappedWith: arrayRemove(myUid) })
            ]);
        } else if (currentLabel === "Accept Swap") {
            await Promise.all([
                updateDoc(doc(db, "users", myUid), { swapRequestsIn: arrayRemove(targetUid), swappedWith: arrayUnion(targetUid) }),
                updateDoc(doc(db, "users", targetUid), { swapRequestsOut: arrayRemove(myUid), swappedWith: arrayUnion(myUid) })
            ]);
        }
        viewUserModal.style.display = "none";
    } catch(err) { console.error(err); }
    finally { swapActionBtn.disabled = false; }
}

if (closeUserModalBtn) closeUserModalBtn.onclick = () => viewUserModal.style.display = "none";

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
                    viewUserModal.style.display = "none";
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

function bindLikes() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.onclick = async (e) => {
            if(!auth.currentUser) return;
            const btnEl = e.currentTarget;
            const authorId = btnEl.getAttribute('data-author');
            const momentId = btnEl.getAttribute('data-id');
            const currentUserId = auth.currentUser.uid;
            
            if (currentUserId === authorId) {
                alert("You cannot like your own moments!");
                return;
            }
            
            const isLiked = btnEl.getAttribute('data-liked') === 'true';
            const countLabel = btnEl.querySelector('.like-count-num');
            const currentLikes = parseInt(countLabel.textContent) || 0;
            
            btnEl.disabled = true;

            if (!isLiked) {
                countLabel.textContent = currentLikes + 1;
                btnEl.setAttribute('data-liked', 'true');
                btnEl.style.background = "#ff3b30";
                btnEl.style.color = "#fff";
                btnEl.style.borderColor = "#ff3b30";

                try {
                    await Promise.all([
                        updateDoc(doc(db, "moments", momentId), { likedBy: arrayUnion(currentUserId) }),
                        updateDoc(doc(db, "users", authorId), { totalLikes: increment(1) })
                    ]);
                } catch(err) {
                    countLabel.textContent = currentLikes;
                    btnEl.setAttribute('data-liked', 'false');
                    btnEl.style = "";
                } finally { btnEl.disabled = false; }
            } else {
                countLabel.textContent = Math.max(0, currentLikes - 1);
                btnEl.setAttribute('data-liked', 'false');
                btnEl.style = "";

                try {
                    await Promise.all([
                        updateDoc(doc(db, "moments", momentId), { likedBy: arrayRemove(currentUserId) }),
                        updateDoc(doc(db, "users", authorId), { totalLikes: increment(-1) })
                    ]);
                } catch(err) {
                    countLabel.textContent = currentLikes;
                    btnEl.setAttribute('data-liked', 'true');
                    btnEl.style.background = "#ff3b30";
                    btnEl.style.color = "#fff";
                    btnEl.style.borderColor = "#ff3b30";
                } finally { btnEl.disabled = false; }
            }
        };
    });
}

function bindDeletions() {
    document.querySelectorAll('.btn-delete-moment').forEach(btn => {
        btn.onclick = async (e) => {
            const momentId = e.currentTarget.getAttribute('data-id');
            const userConfirmed = confirm("Are you sure you want to permanently delete this moment from the feed?");
            if (!userConfirmed) return;
            e.currentTarget.disabled = true;
            e.currentTarget.textContent = "Removing...";
            try {
                await deleteDoc(doc(db, "moments", momentId));
                const postCardTarget = document.getElementById(`moment-card-${momentId}`);
                if (postCardTarget) {
                    postCardTarget.style.opacity = '0';
                    setTimeout(() => postCardTarget.remove(), 250);
                }
            } catch (err) {
                console.error(err);
                e.currentTarget.disabled = false;
                e.currentTarget.textContent = "Delete";
            }
        };
    });
}

function calcTime(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff/60000);
    if(mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins/60)}h ago`;
}

onAuthStateChanged(auth, (user) => { if (user) renderAppFeed(); });