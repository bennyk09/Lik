import { db, auth } from './firebase-config.deploy.js';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, increment, deleteDoc, arrayUnion, arrayRemove, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const feed = document.getElementById('wall-feed');
const searchInput = document.getElementById('user-search-input');
const searchResultsTray = document.getElementById('search-results-tray');

async function renderAppFeed() {
    if (!feed) return;
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const q = query(collection(db, "moments"), where("uploadTimestamp", ">", dayAgo), orderBy("uploadTimestamp", "desc"));
    
    try {
        const snap = await getDocs(q);
        feed.innerHTML = "";
        
        if (snap.empty) {
            feed.innerHTML = `<div class="post-card" style="text-align:center; padding:32px; color:var(--text-muted);">No active moments right now.</div>`;
            return;
        }

        const currentUserId = auth.currentUser ? auth.currentUser.uid : null;
        const fragment = document.createDocumentFragment();
        
        snap.forEach(docSnap => {
            const moment = docSnap.data();
            const momentId = docSnap.id;
            
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
                    <div class="post-identity-block" style="cursor: pointer;" data-uid="${moment.userId}">
                        <span class="post-username">${authorName}</span>
                        <span class="post-timestamp">${authorUsername} • ${calcTime(moment.uploadTimestamp)}</span>
                    </div>
                </div>
                ${moment.imageUrl ? `<div class="post-media-container"><img src="${moment.imageUrl}" class="post-img" loading="lazy"></div>` : ''}
                ${moment.text ? `<p class="post-caption">${moment.text}</p>` : ''}
                <div class="moment-footer">
                    <button class="like-btn" data-id="${momentId}" data-author="${moment.userId}" data-liked="${hasLiked}" style="${hasLiked ? 'color: var(--accent-red); font-weight:700;' : ''}">
                        <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="${hasLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"/></svg>
                        <span>Likes (${likedByArray.length})</span>
                    </button>
                    ${isMyMoment ? `<button class="btn-delete-moment" data-id="${momentId}">Delete</button>` : ''}
                </div>
            `;
            
            card.querySelectorAll('[data-uid]').forEach(el => {
                el.onclick = () => { window.location.href = `profile.html?uid=${el.getAttribute('data-uid')}`; };
            });
            fragment.appendChild(card);
        });

        feed.appendChild(fragment);
        bindLikes();
        bindDeletions();
    } catch (err) { console.error(err); }
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
                    searchResultsTray.innerHTML = `<p style="padding: 8px; font-size: 0.85rem; color: var(--text-muted); text-align: center;">No users matched</p>`;
                    searchResultsTray.style.display = "block";
                    return;
                }

                searchResultsTray.innerHTML = "";
                snapshot.forEach(docData => {
                    const userProfile = docData.data();
                    const row = document.createElement('div');
                    row.style = "display: flex; align-items: center; gap: 12px; padding: 8px; border-bottom: 1px solid var(--card-border); cursor: pointer;";
                    row.innerHTML = `
                        <div class="post-avatar" style="width:30px; height:30px; font-size:0.8rem;">
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
            btnEl.disabled = true;

            try {
                if (!isLiked) {
                    await Promise.all([
                        updateDoc(doc(db, "moments", momentId), { likedBy: arrayUnion(currentUserId) }),
                        updateDoc(doc(db, "users", authorId), { totalLikes: increment(1) })
                    ]);
                } else {
                    await Promise.all([
                        updateDoc(doc(db, "moments", momentId), { likedBy: arrayRemove(currentUserId) }),
                        updateDoc(doc(db, "users", authorId), { totalLikes: increment(-1) })
                    ]);
                }
                await renderAppFeed();
            } catch(err) { console.error(err); btnEl.disabled = false; }
        };
    });
}

function bindDeletions() {
    document.querySelectorAll('.btn-delete-moment').forEach(btn => {
        btn.onclick = async (e) => {
            const momentId = e.currentTarget.getAttribute('data-id');
            if (!confirm("Are you sure you want to delete this post?")) return;
            try {
                await deleteDoc(doc(db, "moments", momentId));
                await renderAppFeed();
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