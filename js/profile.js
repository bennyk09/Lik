import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const profileCard = document.getElementById('profile-card');
const userMoments = document.getElementById('user-moments');

onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    
    try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if(!userSnap.exists()) return;
        const userData = userSnap.data();

        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        const q = query(collection(db, "moments"), where("userId", "==", user.uid), where("uploadTimestamp", ">", dayAgo));
        const postSnap = await getDocs(q);
        
        let liveCount = postSnap.size;
        let activeLikes = 0;
        let momentsHtml = "";

        postSnap.forEach(d => {
            const m = d.data();
            activeLikes += m.likesCount || 0;
            momentsHtml += `
                <div class="card" style="padding:12px; font-size:0.9rem;">
                    ${m.text ? `<p style="margin:0 0 8px 0;">${m.text}</p>` : '<em>Image post</em>'}
                    <small style="color:var(--text-muted);">⚡ Likes: ${m.likesCount || 0}</small>
                </div>`;
        });

        const averageLikScore = liveCount > 0 ? (activeLikes / liveCount).toFixed(1) : 0;

        if(profileCard) {
            profileCard.innerHTML = `
                <h2 style="margin:0 0 4px 0;">${userData.name || "User"}</h2>
                <p style="margin:0 0 16px 0; font-size:0.85rem; color:var(--text-muted);">Age: ${userData.age || "N/A"}</p>
                
                <div class="stats-grid">
                    <div class="stat-box"><div class="stat-val">${userData.totalLikes || 0}</div><div class="stat-lbl">Total Likes</div></div>
                    <div class="stat-box"><div class="stat-val">${liveCount}</div><div class="stat-lbl">Live Posts</div></div>
                    <div class="stat-box"><div class="stat-val">${averageLikScore}</div><div class="stat-lbl">Lik Score</div></div>
                    <div class="stat-box"><div class="stat-val">#1</div><div class="stat-lbl">Rank</div></div>
                </div>
            `;
        }

        if(userMoments) {
            userMoments.innerHTML = momentsHtml || `<p style="color:var(--text-muted); font-size:0.9rem;">No moments published in the last 24 hours.</p>`;
        }

    } catch(err) { console.error(err); }
});