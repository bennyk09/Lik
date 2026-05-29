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
            
            const authorData = userCacheMap.get(moment.userId) || { name: "User", profilePic: "" };
            
            // Map individual runtime identification verification parameter rules
            const isMyMoment = auth.currentUser && auth.currentUser.uid === moment.userId;

            const card = document.createElement('div');
            card.className = "post-card";
            card.id = `moment-card-${momentId}`; // Anchor container ID to target for instant DOM pruning
            card.innerHTML = `
                <div class="post-header">
                    <div class="post-avatar">
                        ${authorData.profilePic ? `<img src="${authorData.profilePic}">` : (authorData.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div class="post-username">${authorData.name || "Anonymous"}</div>
                </div>
                ${moment.imageUrl ? `<div class="post-media-container"><img src="${moment.imageUrl}" class="post-img"></div>` : ''}
                ${moment.text ? `<p class="post-caption"><strong>${authorData.name || "User"}</strong> ${moment.text}</p>` : ''}
                <div class="moment-footer">
                    <button class="like-btn" data-id="${momentId}" data-author="${moment.userId}">
                        <!-- Clean Vector Heart SVG Graphic Element Asset -->
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

        userCacheMap.forEach((userProfile) => {
            if (!storiesTray) return;
            const node = document.createElement('div');
            node.className = "story-node";
            node.innerHTML = `
                <div class="story-ring">
                    <div class="story-inner">
                        ${userProfile.profilePic ? `<img src="${userProfile.profilePic}">` : (userProfile.name || "U").charAt(0).toUpperCase()}
                    </div>
                </div>
                <div class="story-label">${userProfile.name || "User"}</div>
            `;
            storiesTray.appendChild(node);
        });

        bindLikes();
        bindDeletions(); // Connect action click listeners 
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
                // Delete explicit document from Firestore mapping configurations
                await deleteDoc(doc(db, "moments", momentId));
                
                // Animate and remove specific HTML post card directly from user interface view bounds
                const postCardTarget = document.getElementById(`moment-card-${momentId}`);
                if (postCardTarget) {
                    postCardTarget.style.opacity = '0';
                    setTimeout(() => postCardTarget.remove(), 250);
                }
            } catch (err) {
                console.error("Purge action failed:", err);
                alert("Failed to delete moment. Please try again.");
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