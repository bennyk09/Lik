import { auth, db } from './firebase-config.deploy.js';
import { onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const profileCard = document.getElementById('profile-card');
const userMoments = document.getElementById('user-moments');

// Modals DOM elements
const editModal = document.getElementById('edit-profile-modal');
const openEditModalBtn = document.getElementById('open-edit-modal-btn');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const editForm = document.getElementById('edit-profile-form');
const editNameInput = document.getElementById('edit-user-name');
const editAgeInput = document.getElementById('edit-user-age');

const deleteModal = document.getElementById('delete-profile-modal');
const openDeleteModalBtn = document.getElementById('open-delete-modal-btn');
const closeDeleteModalBtn = document.getElementById('close-delete-modal-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

// Avatar DOM elements
const avatarPreview = document.getElementById('avatar-preview');
const avatarInput = document.getElementById('avatar-input');
const removePicBtn = document.getElementById('remove-pic-btn');

onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    
    try {
        // 1. Fetch base user profile data
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        
        if(!userSnap.exists()) {
            if(profileCard) {
                profileCard.innerHTML = `<p style="text-align:center; color:var(--text-muted);">No profile records found.</p>`;
            }
            return;
        }
        const userData = userSnap.data();

        // Reveal view actions options buttons
        if (openEditModalBtn) openEditModalBtn.style.display = 'block';
        if (openDeleteModalBtn) openDeleteModalBtn.style.display = 'block';

        // Pre-populate input configurations
        if (editNameInput) editNameInput.value = userData.name || "";
        if (editAgeInput) editAgeInput.value = userData.age || "";

        // TIMING FIX: Render profile avatar directly using Firestore values
        if (avatarPreview) {
            if (userData.profilePic) {
                avatarPreview.innerHTML = `<img src="${userData.profilePic}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                if (removePicBtn) removePicBtn.style.display = 'block';
            } else {
                const initial = (userData.name || "U").charAt(0).toUpperCase();
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
        const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        let liveCount = 0;
        let activeLikes = 0;
        let activeMoments = [];

        postSnap.forEach(d => {
            const m = d.data();
            if (m.uploadTimestamp > dayAgo) {
                liveCount++;
                activeLikes += m.likesCount || 0;
                activeMoments.push(m);
            }
        });

        activeMoments.sort((a, b) => b.uploadTimestamp - a.uploadTimestamp);

        let momentsHtml = "";
        activeMoments.forEach(m => {
            momentsHtml += `
                <div class="card" style="padding:12px; font-size:0.9rem; margin-bottom: 8px;">
                    ${m.text ? `<p style="margin:0 0 8px 0; line-height:1.4;">${m.text}</p>` : '<em>Image post</em>'}
                    <small style="color:var(--text-muted);">✕ Likes: ${m.likesCount || 0}</small>
                </div>`;
        });

        const averageLikScore = liveCount > 0 ? (activeLikes / liveCount).toFixed(1) : 0;

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
        // PROFILE IMAGE HANDLERS
        // ==========================================
        if (avatarPreview && avatarInput) {
            avatarPreview.onclick = () => { avatarInput.click(); };
        }

        if (avatarInput) {
            avatarInput.onchange = async (e) => {
                if (e.target.files.length === 0) return;
                const file = e.target.files[0];
                if (file.size > 800000) { 
                    alert("Image too large! Select an image under 800KB.");
                    return;
                }
                try {
                    const base64String = await toBase64(file);
                    await updateDoc(userDocRef, { profilePic: base64String });
                    window.location.reload();
                } catch (err) { console.error(err); }
            };
        }

        if (removePicBtn) {
            removePicBtn.onclick = async () => {
                try {
                    await updateDoc(userDocRef, { profilePic: "" });
                    window.location.reload();
                } catch (err) { console.error(err); }
            };
        }

        // ==========================================
        // EDIT PROFILE MODAL INTERACTION
        // ==========================================
        if (openEditModalBtn) openEditModalBtn.onclick = () => { editModal.style.display = 'flex'; };
        if (closeEditModalBtn) closeEditModalBtn.onclick = () => { editModal.style.display = 'none'; };

        if (editForm) {
            editForm.onsubmit = async (e) => {
                e.preventDefault();
                const updatedName = editNameInput.value.trim();
                const updatedAge = parseInt(editAgeInput.value);

                if (!updatedName || !updatedAge) return;

                try {
                    await updateDoc(userDocRef, { name: updatedName, age: updatedAge });
                    editModal.style.display = 'none';
                    window.location.reload();
                } catch (err) { alert("Failed to save adjustments."); }
            };
        }

        // ==========================================
        // ACCOUNT REMOVAL PIPELINE LOGIC (NEW)
        // ==========================================
        if (openDeleteModalBtn) openDeleteModalBtn.onclick = () => { deleteModal.style.display = 'flex'; };
        if (closeDeleteModalBtn) closeDeleteModalBtn.onclick = () => { deleteModal.style.display = 'none'; };

        if (confirmDeleteBtn) {
            confirmDeleteBtn.onclick = async () => {
                confirmDeleteBtn.disabled = true;
                confirmDeleteBtn.textContent = "Purging records...";
                
                try {
                    // 1. Fetch and query all post elements uploaded by user
                    const postsQuery = query(collection(db, "moments"), where("userId", "==", user.uid));
                    const postsSnap = await getDocs(postsQuery);
                    
                    // 2. Drop all moments from Firestore
                    const deletePromises = [];
                    postsSnap.forEach((postDoc) => {
                        deletePromises.push(deleteDoc(doc(db, "moments", postDoc.id)));
                    });
                    await Promise.all(deletePromises);

                    // 3. Drop user profile record doc
                    await deleteDoc(userDocRef);

                    // 4. Drop authentication token registration session profile entirely
                    await deleteUser(user);

                    alert("Account purged successfully.");
                    window.location.href = "index.html";

                } catch (err) {
                    console.error("Purge failure structural execution issue: ", err);
                    alert("Security Exception: To delete your account, you must have logged in very recently. Please log out, log back in, and retry.");
                    confirmDeleteBtn.disabled = false;
                    confirmDeleteBtn.textContent = "Delete My Data";
                    deleteModal.style.display = 'none';
                }
            };
        }

    } catch(err) { console.error(err); }
});

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});