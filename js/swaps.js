import { db, auth } from './firebase-config.deploy.js';
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const feed = document.getElementById('wall-feed');
const searchInput = document.getElementById('user-search-input');
const searchResultsTray = document.getElementById('search-results-tray');
const floatingPillAvatarTarget = document.getElementById('floating-pill-avatar-target');

async function renderAppFeed() {
    if (!feed) return;
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const q = query(collection(db, "moments"), where("uploadTimestamp", ">", dayAgo), orderBy("uploadTimestamp", "desc"));
    
    try {
        const snap = await getDocs(q);
        feed.innerHTML = "";
        
        if (snap.empty) {
            feed.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding: 40px 0; font-size:0.9rem;">No moments active right now.</p>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        
        snap.forEach(docSnap => {
            const moment = docSnap.data();
            
            const authorName = moment.authorName || "User";
            const authorProfilePic = moment.authorProfilePic || "";
            const textCaption = moment.text || "";
            
            const timelinePostCardNode = document.createElement('div');
            timelinePostCardNode.className = "timeline-post-node";
            
            // Re-map structural grid layouts: image block container goes on TOP, parameters bar metadata falls underneath
            timelinePostCardNode.innerHTML = `
                <div class="post-media-box-wrapper" style="cursor: pointer;" data-uid="${moment.userId}">
                    ${moment.imageUrl ? `<img src="${moment.imageUrl}" loading="lazy">` : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#eee; color:#aaa; font-weight:bold;">${textCaption}</div>`}
                </div>
                <div class="post-metadata-tray">
                    <div class="post-avatar-circle" style="cursor: pointer;" data-uid="${moment.userId}">
                        ${authorProfilePic ? `<img src="${authorProfilePic}">` : authorName.charAt(0).toUpperCase()}
                    </div>
                    <div class="post-identity-block" style="cursor: pointer;" data-uid="${moment.userId}">
                        <span class="post-author-title-label">${authorName}</span>
                        <span class="post-timestamp-caption-label">${calcTime(moment.uploadTimestamp)}${textCaption && moment.imageUrl ? ` • ${textCaption}` : ''}</span>
                    </div>
                </div>
            `;
            
            timelinePostCardNode.querySelectorAll('[data-uid]').forEach(el => {
                el.onclick = () => { window.location.href = `profile.html?uid=${el.getAttribute('data-uid')}`; };
            });
            fragment.appendChild(timelinePostCardNode);
        });

        feed.appendChild(fragment);
    } catch (err) { console.error("Feed error:", err); }
}

// Hydrate the sticky floating lower account corner pill with the active session user's picture context profile data
async function syncFloatingAccountPillElement(uid) {
    if (!floatingPillAvatarTarget) return;
    try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.profilePic) {
                floatingPillAvatarTarget.innerHTML = `<img src="${userData.profilePic}" style="width:100%; height:100%; object-fit:cover;">`;
            } else {
                floatingPillAvatarTarget.innerHTML = `<div style="width:100%; height:100%; background:var(--input-bg); display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:0.8rem; color:#fff;">${(userData.name || "U").charAt(0).toUpperCase()}</div>`;
            }
        }
    } catch (err) { console.warn(err); }
}

function calcTime(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff/60000);
    if (mins < 60) return `${mins} mins`;
    return `${Math.floor(mins/60)} hours`;
}

onAuthStateChanged(auth, (user) => { 
    if (user) { 
        renderAppFeed(); 
        syncFloatingAccountPillElement(user.uid);
    } 
});