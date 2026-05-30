import { db, auth } from './firebase-config.deploy.js';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, increment, deleteDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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
            feed.innerHTML = `<p style="text-align:center; color:var(--txt-gray); padding: 40px 0; font-size:0.9rem;">No moments active right now.</p>`;
            return;
        }

        const currentUserId = auth.currentUser ? auth.currentUser.uid : null;
        const fragment = document.createDocumentFragment();
        
        snap.forEach(docSnap => {
            const moment = docSnap.data();
            const momentId = docSnap.id;
            
            const authorName = moment.authorName || "User";
            const authorProfilePic = moment.authorProfilePic || "";
            const textCaption = moment.text || "";
            
            const likedByArray = moment.likedBy || [];
            const hasLiked = currentUserId && likedByArray.includes(currentUserId);
            const isMyMoment = currentUserId === moment.userId;
            
            const freshPostElementNode = document.createElement('div');
            freshPostElementNode.className = "stream-post-card";
            
            // MAPS TO V3 NEW CLASS SYSTEM STYLES: IMAGE CARD REMAINS FORCED CONSTANTLY ON TOP
            freshPostElementNode.innerHTML = `
                <div class="stream-card-media-box" style="cursor: pointer;" data-uid="${moment.userId}">
                    ${moment.imageUrl ? `<img src="${moment.imageUrl}" loading="lazy">` : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--feed-bg); color:var(--txt-gray); font-weight:bold; padding:20px; text-align:center;">${textCaption}</div>`}
                </div>
                <div class="stream-card-meta-row">
                    <div class="stream-card-avatar-circle" style="cursor: pointer;" data-uid="${moment.userId}">
                        ${authorProfilePic ? `<img src="${authorProfilePic}">` : authorName.charAt(0).toUpperCase()}
                    </div>
                    <div class="stream-card-profile-text" style="cursor: pointer;" data-uid="${moment.userId}">
                        <span class="stream-card-author-name">${authorName}</span>
                        <span class="stream-card-sub-label">${calcTime(moment.uploadTimestamp)}${textCaption && moment.imageUrl ? ` • ${textCaption}` : ''}</span>
                    </div>
                    
                    <div class="stream-card-actions-tray">
                        <button class="stream-action-trigger like-toggle-trigger" data-id="${momentId}" data-author="${moment.userId}" data-liked="${hasLiked}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="${hasLiked ? '#dc2626' : 'none'}" stroke="${hasLiked ? '#dc2626' : 'currentColor'}" stroke-width="2.5"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                            <span style="font-size:0.85rem; font-weight:700; margin-left:5px; color:var(--txt-dark);">${likedByArray.length}</span>
                        </button>
                        ${isMyMoment ? `
                        <button class="stream-action-trigger delete-intent delete-moment-trigger" data-id="${momentId}">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>` : ''}
                    </div>
                </div>
            `;
            
            freshPostElementNode.querySelectorAll('[data-uid]').forEach(el => {
                el.onclick = () => { window.location.href = `profile.html?uid=${el.getAttribute('data-uid')}`; };
            });
            fragment.appendChild(freshPostElementNode);
        });

        feed.appendChild(fragment);
        bindLikeActionTriggers();
        bindDeletionActionTriggers();
    } catch (err) { console.error(err); }
}

function bindLikeActionTriggers() {
    document.querySelectorAll('.like-toggle-trigger').forEach(btn => {
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

function bindDeletionActionTriggers() {
    document.querySelectorAll('.delete-moment-trigger').forEach(btn => {
        btn.onclick = async (e) => {
            const momentId = e.currentTarget.getAttribute('data-id');
            if (!confirm("Delete this post moment?")) return;
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