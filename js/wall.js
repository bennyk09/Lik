import { db, auth } from './firebase-config.deploy.js';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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
            
            if (!userCacheMap.has(moment.userId)) {
                const authorSnap = await getDocs(query(collection(db, "users"), where("uid", "==", moment.userId)));
                if (!authorSnap.empty) {
                    userCacheMap.set(moment.userId, authorSnap.docs[0].data());
                }
            }
            
            const authorData = userCacheMap.get(moment.userId) || { name: "User", profilePic: "" };
            
            const card = document.createElement('div');
            card.className = "post-card";
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
                    <button class="like-btn" data-id="${docData.id}" data-author="${moment.userId}">✕ ${moment.likesCount || 0}</button>
                    <small style="color:var(--text-muted); font-size:0.75rem;">${calcTime(moment.uploadTimestamp)}</small>
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
    } catch(err) { console.error("Feed pipeline error: ", err); }
}

function bindLikes() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.onclick = async (e) => {
            if(!auth.currentUser) return;
            
            const btnEl = e.currentTarget;
            const authorId = btnEl.getAttribute('data-author');
            
            // 🛑 CRITICAL RESTRICTION: Blocks likes if current user matches the post author ID
            if (auth.currentUser.uid === authorId) {
                alert("You cannot like your own moments!");
                return;
            }
            
            const currentLikes = parseInt(btnEl.textContent.replace('✕ ', '')) || 0;
            const momentId = btnEl.getAttribute('data-id');
            
            btnEl.textContent = `✕ ${currentLikes + 1}`;
            btnEl.disabled = true;

            try {
                await Promise.all([
                    updateDoc(doc(db, "moments", momentId), { likesCount: increment(1) }),
                    updateDoc(doc(db, "users", authorId), { totalLikes: increment(1) })
                ]);
            } catch(err) { 
                btnEl.textContent = `✕ ${currentLikes}`; 
            } finally { 
                btnEl.disabled = false; 
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