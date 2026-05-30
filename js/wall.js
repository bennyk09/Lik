import { db, auth } from './firebase-config.deploy.js';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, increment, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const feed = document.getElementById('wall-feed');
const storiesTray = document.getElementById('stories-tray');

async function renderAppFeed() {
    if (!feed) return;
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const q = query(collection(db, "moments"), where("uploadTimestamp", ">", dayAgo), orderBy("uploadTimestamp", "desc"));
    
    try {
        const snap = await getDocs(q);
        feed.innerHTML = "";
        if (storiesTray) storiesTray.innerHTML = "";
        
        if(snap.empty) {
            feed.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding: 40px 0; font-size:0.9rem;">No moments active right now.</p>`;
            return;
        }

        const userCacheMap = new Map();
        
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
            const isMyMoment = auth.currentUser && auth.currentUser.uid === moment.userId;

            const card = document.createElement('div');
            card.className = "post-card";
            card.id = `moment-card-${momentId}`;
            card.innerHTML = `
                <div class="post-header" style="display: flex; align-items: center; gap: 12px;">
                    <div class="post-avatar">
                        ${authorData.profilePic ? `<img src="${authorData.profilePic}">` : (authorData.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        <span class="post-username" style="font-weight: 600; font-size: 0.9rem; color: var(--text-main); line-height: 1.2;">${authorData.name || "Anonymous"}</span>
                        <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 500; margin-top: 2px;">${authorData.username || "/user"}</span>
                    </div>
                </div>
                ${moment.imageUrl ? `<div class="post-media-container"><img src="${moment.imageUrl}" class="post-img"></div>` : ''}
                ${moment.text ? `<p class="post-caption"><strong>${authorData.name || "User"}</strong> ${moment.text}</p>` : ''}
                <div class="moment-footer">
                    <button class="like-btn" data-id="${momentId}" data-author="${moment.userId}">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                        <span class="like-count-num">${moment.likesCount || 0}</span>
                    </button>
                    
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${isMyMoment ? `<button class="btn-delete-moment" data-id="${momentId}">Delete</button>` : ''}
                        <small style="color:var(--text-muted); font-size:0.75rem;">${calcTime(moment.uploadTimestamp)}</small>
                    </div>
                </div>
            `;
            feed.appendChild(card);
        }

        bindLikes();
        bindDeletions();
    } catch(err) { console.error("Feed pipeline error: ", err); }
}

function bindLikes() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.onclick = async (e) => {
            if(!auth.currentUser) return;
            
            const btnEl = e.currentTarget;
            const authorId = btnEl.getAttribute('data-author');
            
            if (auth.currentUser.uid === authorId) {
                alert("You cannot like your own moments!");
                return;
            }
            
            const countLabel = btnEl.querySelector('.like-count-num');
            const currentLikes = parseInt(countLabel.textContent) || 0;
            const momentId = btnEl.getAttribute('data-id');
            
            countLabel.textContent = currentLikes + 1;
            btnEl.disabled = true;

            try {
                await Promise.all([
                    updateDoc(doc(db, "moments", momentId), { likesCount: increment(1) }),
                    updateDoc(doc(db, "users", authorId), { totalLikes: increment(1) })
                ]);
            } catch(err) { 
                countLabel.textContent = currentLikes; 
            } finally { 
                btnEl.disabled = false; 
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