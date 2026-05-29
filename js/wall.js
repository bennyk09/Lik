import { db, auth } from './firebase-config.deploy.js';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const feed = document.getElementById('wall-feed');

async function renderFeed() {
    if (!feed) return;
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const q = query(collection(db, "moments"), where("uploadTimestamp", ">", dayAgo), orderBy("uploadTimestamp", "desc"));
    
    try {
        const snap = await getDocs(q);
        feed.innerHTML = "";
        if(snap.empty) {
            feed.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding: 40px 0;">No live moments active right now.</p>`;
            return;
        }
        snap.forEach((docData) => {
            const moment = docData.data();
            const card = document.createElement('div');
            card.className = "card";
            card.innerHTML = `
                ${moment.imageUrl ? `<img src="${moment.imageUrl}" class="moment-img">` : ''}
                ${moment.text ? `<p class="moment-text">${moment.text}</p>` : ''}
                <div class="moment-footer">
                    <button class="like-btn" data-id="${docData.id}" data-author="${moment.userId}">✕ ${moment.likesCount || 0}</button>
                    <small style="color:var(--text-muted);">${calcTime(moment.uploadTimestamp)}</small>
                </div>
            `;
            feed.appendChild(card);
        });
        bindLikes();
    } catch(err) { console.error("Feed error: ", err); }
}

function bindLikes() {
    document.querySelectorAll('.like-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if(!auth.currentUser) return;
            
            const buttonElement = e.target;
            const momentId = buttonElement.getAttribute('data-id');
            const authorId = buttonElement.getAttribute('data-author');
            
            // OPTIMISTIC UI: Instantly change the value visually on click
            const currentLikes = parseInt(buttonElement.textContent.replace('✕ ', '')) || 0;
            buttonElement.textContent = `✕ ${currentLikes + 1}`;
            buttonElement.style.opacity = "0.7";
            buttonElement.disabled = true; // Prevent spam clicks while processing

            try {
                // Update Firestore collections concurrently
                await Promise.all([
                    updateDoc(doc(db, "moments", momentId), { likesCount: increment(1) }),
                    updateDoc(doc(db, "users", authorId), { totalLikes: increment(1) })
                ]);
            } catch(err) { 
                console.error("Failed to commit interaction record: ", err);
                // Rollback if something went wrong
                buttonElement.textContent = `✕ ${currentLikes}`;
            } finally {
                buttonElement.style.opacity = "1";
                buttonElement.disabled = false;
            }
        });
    });
}
function calcTime(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff/60000);
    if(mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins/60)}h ago`;
}

// Only trigger feed load once user is verified securely
onAuthStateChanged(auth, (user) => {
    if (user) {
        renderFeed();
    }
});