import { db, auth } from './firebase-config.deploy.js';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, increment, deleteDoc, arrayUnion, arrayRemove, limit, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const feed = document.getElementById('wall-feed');
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
    
    // Limits stream query parameters strictly to the past 24 hours
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const q = query(collection(db, "moments"), where("uploadTimestamp", ">", dayAgo), orderBy("uploadTimestamp", "desc"));
    
    try {
        const snap = await getDocs(q);
        feed.innerHTML = "";
        
        if (snap.empty) {
            feed.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding: 40px 0; font-size:0.9rem;">No moments active right now.</p>`;
            return;
        }

        const currentUserId = auth.currentUser ? auth.currentUser.uid : null;
        const fragment = document.createDocumentFragment();
        
        snap.forEach(docSnap => {
            const moment = docSnap.data();
            const momentId = docSnap.id;
            
            // Read pre-embedded profile parameters instantly with zero lag
            const authorName = moment.authorName || "User";
            const authorUsername = moment.authorUsername || "/user";
            const authorProfilePic = moment.authorProfilePic || "";
            
            const isMyMoment = currentUserId === moment.userId;
            const likedByArray = moment.likedBy || [];
            const hasLiked = currentUserId && likedByArray.includes(currentUserId);

            const card = document.createElement('div');
            card.className = "post-card";
            card.id = `moment-card-${momentId}`;
            card.innerHTML = `
                <div class="post-header">
                    <div class="post-avatar" style="cursor: pointer;" data-uid="${moment.userId}">
                        ${authorProfilePic ? `<img src="${authorProfilePic}">` : authorName.charAt(0).toUpperCase()}
                    </div>
                    <div style="display: flex; flex-direction: column; cursor: pointer;" data-uid="${moment.userId}">
                        <span class="post-username" style="font-weight: 600; font-size: 0.9rem; color: var(--text-main); line-height: 1.2;">${authorName}</span>
                        <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 500; margin-top: 2px;">${authorUsername}</span>
                    </div>
                </div>
                ${moment.imageUrl ? `<div class="post-media-container"><img src="${moment.imageUrl}" class="post-img" loading="lazy"></div>` : ''}
                ${moment.text ? `<p class="post-caption"><strong>${authorName}</strong> ${moment.text}</p>` : ''}
                <div class="moment-footer">
                    <button class="like-btn" data-id="${momentId}" data-author="${moment.userId}" data-liked="${hasLiked}" style="${hasLiked ? 'background: var(--accent-red); color: #fff; border-color: var(--accent-red);' : ''}">
                        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        <span class="like-count-num">${likedByArray.length}</span>
                    </button>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${isMyMoment ? `<button class="btn-delete-moment" data-id="${momentId}">Delete</button>` : ''}
                        <small style="color:var(--text-muted); font-size:0.75rem;">${calcTime(moment.uploadTimestamp)}</small>
                    </div>
                </div>
            `;
            
            // Route seamlessly to selected profiles
            card.querySelectorAll('[data-uid]').forEach(el => {
                el.onclick = () => { window.location.href = `profile.html?uid=${el.getAttribute('data-uid')}`; };
            });
            fragment.appendChild(card);
        });

        feed.appendChild(fragment);
        bindLikes();
        bindDeletions();
    } catch (err) { console.error("Feed error:", err); }
}

if (searchInput) {
    let debounceTimer;
    searchInput.oninput = (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            let keyword = e.target.value.trim().toLowerCase();
            if (!keyword) { searchResultsTray.innerHTML = ""; searchResultsTray.style.display = "none"; return; }
            if (!keyword.startsWith("/")) keyword = "/" + keyword;

            try {
                const endThreshold = keyword + "\uf8ff";
                const q = query(collection(db, "users"), where("username", ">=", keyword), where("username", "<=", endThreshold), limit(5));
                const snapshot = await getDocs(q);
                
                if (snapshot.empty) {
                    searchResultsTray.innerHTML = `<p style="padding: 12px; font-size: 0.85rem; color: var(--text-muted); text-align: center; margin:0;">No users matched</p>`;
                    searchResultsTray.style.display = "block";
                    return;
                }

                searchResultsTray.innerHTML = "";
                snapshot.forEach(docData => {
                    const userProfile = docData.data();
                    const row = document.createElement('div');
                    row.style = "display: flex; align-items: center; gap: 12px; padding: 10px; border-bottom: 1px solid var(--card-border); cursor: pointer;";
                    row.innerHTML = `
                        <div class="post-avatar" style="width:34px; height:34px; font-size:0.8rem;">
                            ${userProfile.profilePic ? `<img src="${userProfile.profilePic}">` : (userProfile.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-size: 0.85rem; font-weight: 600;">${userProfile.name || "User"}</span>
                            <span style="font-size: 0.75rem; color: var(--accent-color);">${userProfile.username}</span>
                        </div>`;
                    
                    row.onclick = () => { window.location.href = `profile.html?uid=${userProfile.uid}`; };
                    searchResultsTray.appendChild(row);
                });
                searchResultsTray.style.display = "block";
            } catch (err) { console.error(err); }
        }, 200);
    };
}

function bindLikes() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.onclick = async (e) => {
            if (!auth.currentUser) return;
            const btnEl = e.currentTarget;
            const authorId = btnEl.getAttribute('data-author');
            const momentId = btnEl.getAttribute('data-id');
            const currentUserId = auth.currentUser.uid;
            
            if (currentUserId === authorId) return;
            
            const isLiked = btnEl.getAttribute('data-liked') === 'true';
            const countLabel = btnEl.querySelector('.like-count-num');
            const currentLikes = parseInt(countLabel.textContent) || 0;
            btnEl.disabled = true;

            if (!isLiked) {
                countLabel.textContent = currentLikes + 1;
                btnEl.setAttribute('data-liked', 'true');
                btnEl.style.background = "var(--accent-red)"; btnEl.style.color = "#fff"; btnEl.style.borderColor = "var(--accent-red)";
                try {
                    await Promise.all([
                        updateDoc(doc(db, "moments", momentId), { likedBy: arrayUnion(currentUserId) }),
                        updateDoc(doc(db, "users", authorId), { totalLikes: increment(1) })
                    ]);
                } catch(err) { countLabel.textContent = currentLikes; btnEl.setAttribute('data-liked', 'false'); btnEl.style = ""; }
                finally { btnEl.disabled = false; }
            } else {
                countLabel.textContent = Math.max(0, currentLikes - 1);
                btnEl.setAttribute('data-liked', 'false'); btnEl.style = "";
                try {
                    await Promise.all([
                        updateDoc(doc(db, "moments", momentId), { likedBy: arrayRemove(currentUserId) }),
                        updateDoc(doc(db, "users", authorId), { totalLikes: increment(-1) })
                    ]);
                } catch(err) { countLabel.textContent = currentLikes; btnEl.setAttribute('data-liked', 'true'); btnEl.style.background = "var(--accent-red)"; }
                finally { btnEl.disabled = false; }
            }
        };
    });
}

function bindDeletions() {
    document.querySelectorAll('.btn-delete-moment').forEach(btn => {
        btn.onclick = async (e) => {
            const momentId = e.currentTarget.getAttribute('data-id');
            if (!confirm("Delete this moment permanently?")) return;
            try {
                await deleteDoc(doc(db, "moments", momentId));
                document.getElementById(`moment-card-${momentId}`)?.remove();
            } catch (err) { console.error(err); }
        };
    });
}

function calcTime(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff/60000);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins/60)}h ago`;
}

onAuthStateChanged(auth, (user) => { if (user) renderAppFeed(); });