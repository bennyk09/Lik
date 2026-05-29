import { auth, db } from './firebase-config.deploy.js';
import { onAuthStateChanged, deleteUser } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const userMoments = document.getElementById('user-moments');
const statsTray = document.getElementById('stats-numbers-tray');
const bioContainer = document.getElementById('profile-bio-container');
const usernameLabel = document.getElementById('lbl-username-display');
const avatarPreview = document.getElementById('avatar-preview');
const avatarInput = document.getElementById('avatar-input');
const removePicBtn = document.getElementById('remove-pic-btn');

// Modal Elements DOM Targets 
const editModal = document.getElementById('edit-profile-modal');
const openEditModalBtn = document.getElementById('open-edit-modal-btn');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const editForm = document.getElementById('edit-profile-form');
const editNameInput = document.getElementById('edit-user-name');
const editAgeInput = document.getElementById('edit-user-age');
const editBioInput = document.getElementById('edit-user-bio');

const aboutModal = document.getElementById('about-info-modal');
const openAboutModalBtn = document.getElementById('open-about-modal-btn');
const closeAboutModalBtn = document.getElementById('close-about-modal-btn');

const deleteModal = document.getElementById('delete-profile-modal');
const openDeleteModalBtn = document.getElementById('open-delete-modal-btn');
const closeDeleteModalBtn = document.getElementById('close-delete-modal-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    
    try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        if(!userSnap.exists()) return;
        const userData = userSnap.data();

        if (usernameLabel) usernameLabel.textContent = userData.name || "User";
        if (bioContainer) bioContainer.textContent = userData.bio || "No biography set yet.";
        
        if (openEditModalBtn) openEditModalBtn.style.display = 'block';
        if (openDeleteModalBtn) openDeleteModalBtn.style.display = 'block';

        if (editNameInput) editNameInput.value = userData.name || "";
        if (editAgeInput) editAgeInput.value = userData.age || "";
        if (editBioInput) editBioInput.value = userData.bio || "";

        if (avatarPreview) {
            if (userData.profilePic) {
                avatarPreview.innerHTML = `<img src="${userData.profilePic}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                if (removePicBtn) removePicBtn.style.display = 'inline-block';
            } else {
                avatarPreview.innerHTML = (userData.name || "U").charAt(0).toUpperCase();
                if (removePicBtn) removePicBtn.style.display = 'none';
            }
        }

        const q = query(collection(db, "moments"), where("userId", "==", user.uid));
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

        // Grid presentation array construction format
        let momentsHtml = "";
        activeMoments.forEach(m => {
            momentsHtml += `
                <div class="user-moment-card">
                    ${m.imageUrl ? `<img src="${m.imageUrl}" style="width:100%; height:100%; object-fit:cover;">` : `<p style="line-height:1.4; font-size:0.9rem; padding:8px; margin:0; text-align:center;">${m.text}</p>`}
                </div>`;
        });
        if(userMoments) userMoments.innerHTML = momentsHtml || `<p style="color:var(--text-muted); font-size:0.9rem; text-align:center; padding:24px 0; grid-column: 1 / -1;">No active moments running on the feed.</p>`;

        const averageLikScore = liveCount > 0 ? (activeLikes / liveCount).toFixed(1) : 0;

        if (statsTray) {
            statsTray.innerHTML = `
                <div class="stat-node"><div class="stat-node-val">${userData.totalLikes || 0}</div><div class="stat-node-lbl">Likes</div></div>
                <div class="stat-node"><div class="stat-node-val">${liveCount}</div><div class="stat-node-lbl">Live</div></div>
                <div class="stat-node"><div class="stat-node-val">${averageLikScore}</div><div class="stat-node-lbl">Lik Score</div></div>
                <div class="stat-node"><div class="stat-node-val">#1</div><div class="stat-node-lbl">Rank</div></div>
            `;
        }

        if (avatarPreview && avatarInput) avatarPreview.onclick = () => { avatarInput.click(); };
        if (avatarInput) {
            avatarInput.onchange = async (e) => {
                if (e.target.files.length === 0) return;
                const file = e.target.files[0];
                if (file.size > 800000) { alert("Image size must be under 800KB."); return; }
                const b64 = await toBase64(file);
                await updateDoc(userDocRef, { profilePic: b64 });
                window.location.reload();
            };
        }
        if (removePicBtn) {
            removePicBtn.onclick = async () => {
                await updateDoc(userDocRef, { profilePic: "" });
                window.location.reload();
            };
        }

        if(openEditModalBtn) openEditModalBtn.onclick = () => { editModal.style.display='flex'; };
        if(closeEditModalBtn) closeEditModalBtn.onclick = () => { editModal.style.display='none'; };
        if(openAboutModalBtn) openAboutModalBtn.onclick = () => { aboutModal.style.display='flex'; };
        if(closeAboutModalBtn) closeAboutModalBtn.onclick = () => { aboutModal.style.display='none'; };
        if(openDeleteModalBtn) openDeleteModalBtn.onclick = () => { deleteModal.style.display='flex'; };
        if(closeDeleteModalBtn) closeDeleteModalBtn.onclick = () => { deleteModal.style.display='none'; };

        if (editForm) {
            editForm.onsubmit = async (e) => {
                e.preventDefault();
                await updateDoc(userDocRef, {
                    name: editNameInput.value.trim(),
                    age: parseInt(editAgeInput.value),
                    bio: editBioInput.value.trim()
                });
                window.location.reload();
            };
        }

        if (confirmDeleteBtn) {
            confirmDeleteBtn.onclick = async () => {
                const postsSnap = await getDocs(query(collection(db, "moments"), where("userId", "==", user.uid)));
                const deletions = [];
                postsSnap.forEach(d => deletions.push(deleteDoc(doc(db, "moments", d.id))));
                await Promise.all(deletions);
                await deleteDoc(userDocRef);
                await deleteUser(user);
                window.location.href = "index.html";
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