import { auth, db } from './firebase-config.deploy.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const profileCard = document.getElementById('profile-card');
const userMoments = document.getElementById('user-moments');

// Modal DOM elements
const editModal = document.getElementById('edit-profile-modal');
const openModalBtn = document.getElementById('open-edit-modal-btn');
const closeModalBtn = document.getElementById('close-edit-modal-btn');
const editForm = document.getElementById('edit-profile-form');
const editNameInput = document.getElementById('edit-user-name');
const editAgeInput = document.getElementById('edit-user-age');

// Avatar DOM elements
const avatarPreview = document.getElementById('avatar-preview');
const avatarInput = document.getElementById('avatar-input');
const removePicBtn = document.getElementById('remove-pic-btn');

onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    
    try {
        // 1. Fetch base user profile documentation data
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        
        if(!userSnap.exists()) {
            if(profileCard) {
                profileCard.innerHTML = `<p style="text-align:center; color:var(--text-muted);">No profile records found. Please register via the home page.</p>`;
            }
            return;
        }
        const userData = userSnap.data();

        // Reveal the edit button once data is validated
        if (openModalBtn) openModalBtn.style.display = 'block';

        // Pre-populate input placeholders for modal fields
        if (editNameInput) editNameInput.value = userData.name || "";
        if (editAgeInput) editAgeInput.value = userData.age || "";

        // Render profile picture avatar or structural letter fallback
        if (avatarPreview) {
            if (userData.profilePic) {
                avatarPreview.innerHTML = `<img src="${userData.profilePic}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                if (removePicBtn) removePicBtn.style.display = 'block';
            } else {
                // Take the first character of the username as a minimalist letter placeholder
                const initial = (userData.name || user.email || "U").charAt(0).toUpperCase();
                avatarPreview.innerHTML = initial;
                if (removePicBtn) removePicBtn.style.display = 'none';
            }
        }

        // 2. Query user's specific moments
        const q = query(
            collection(db, "moments"), 
            where("userId", "==", user.uid)
        );
        
        const postSnap = await getDocs(q);
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000); // 24-hour expiration threshold
        
        let liveCount = 0;
        let activeLikes = 0;
        let activeMoments = [];

        // 3. Filter the 24-hour expiration window manually in memory safely
        postSnap.forEach(d => {
            const m = d.data();
            if (m.uploadTimestamp > dayAgo) {
                liveCount++;
                activeLikes += m.likesCount || 0;
                activeMoments.push(m);
            }
        });

        // 4. Sort moments chronologically in memory (Newest first)
        activeMoments.sort((a, b) => b.uploadTimestamp - a.uploadTimestamp);

        // 5. Generate UI feed elements string
        let momentsHtml = "";
        activeMoments.forEach(m => {
            momentsHtml += `
                <div class="card" style="padding:12px; font-size:0.9rem; margin-bottom: 8px;">
                    ${m.text ? `<p style="margin:0 0 8px 0; line-height:1.4;">${m.text}</p>` : '<em>Image post</em>'}
                    <small style="color:var(--text-muted);">✕ Likes: ${m.likesCount || 0}</small>
                </div>`;
        });

        // 6. Compute gamified engagement stats parameters
        const averageLikScore = liveCount > 0 ? (activeLikes / liveCount).toFixed(1) : 0;

        // 7. Inject into the DOM profile card interface element
        if(profileCard) {
            profileCard.innerHTML = `
                <h2 style="margin:0 0 4px 0; font-weight:700;">${userData.name || "User"}</h2>
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
            userMoments.innerHTML = momentsHtml || `<p style="color:var(--text-muted); font-size:0.9rem; text-align:center; padding:16px 0;">No active moments in the last 24 hours.</p>`;
        }

        // ==========================================
        // PROFILE IMAGE ACTIONS INTERFACES
        // ==========================================
        
        // Trigger file picker selection overlay on avatar container tap
        if (avatarPreview && avatarInput) {
            avatarPreview.onclick = () => { avatarInput.click(); };
        }

        // Handle selected file array serialization
        if (avatarInput) {
            avatarInput.onchange = async (e) => {
                if (e.target.files.length === 0) return;
                const file = e.target.files[0];
                
                // Keep image files light so Base64 strings don't cross Firestore limits (Max 1MB per document)
                if (file.size > 800000) { 
                    alert("Image too large! Please select an image under 800KB to keep things optimal.");
                    return;
                }

                try {
                    const base64String = await toBase64(file);
                    await updateDoc(userDocRef, { profilePic: base64String });
                    window.location.reload();
                } catch (err) {
                    console.error("Avatar conversion failure: ", err);
                }
            };
        }

        // Wipe photo parameters out of document snapshot context entirely
        if (removePicBtn) {
            removePicBtn.onclick = async () => {
                try {
                    await updateDoc(userDocRef, { profilePic: "" });
                    window.location.reload();
                } catch (err) {
                    console.error("Failed removing profile avatar data parameters: ", err);
                }
            };
        }

        // ==========================================
        // MODAL DIALOGS ACTIONS INTERFACES
        // ==========================================
        if (openModalBtn) {
            openModalBtn.onclick = () => { editModal.style.display = 'flex'; };
        }
        if (closeModalBtn) {
            closeModalBtn.onclick = () => { editModal.style.display = 'none'; };
        }

        if (editForm) {
            editForm.onsubmit = async (e) => {
                e.preventDefault();
                const updatedName = editNameInput.value.trim();
                const updatedAge = parseInt(editAgeInput.value);

                if (!updatedName || !updatedAge) return;

                try {
                    await updateDoc(userDocRef, {
                        name: updatedName,
                        age: updatedAge
                    });
                    editModal.style.display = 'none';
                    window.location.reload();
                } catch (updateError) {
                    console.error("Error saving updates:", updateError);
                    alert("Failed to save changes. Try again.");
                }
            };
        }

    } catch(err) { 
        console.error("Profile view processing failed: ", err); 
        if(profileCard) {
            profileCard.innerHTML = `<p style="text-align:center; color:var(--text-muted);">Failed to balance profile analytics calculations.</p>`;
        }
    }
});

// Helper base64 transformer converter promise module
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});