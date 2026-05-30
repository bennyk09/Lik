import { db, auth } from './firebase-config.deploy.js';
import { collection, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const uploadForm = document.getElementById('upload-form');
const momentFile = document.getElementById('moment-file');
const framePreviewBox = document.getElementById('frame-preview-box');
const imgRenderTarget = document.getElementById('img-render-target');

onAuthStateChanged(auth, (user) => { if (!user) window.location.href = "index.html"; });

if (momentFile) {
    momentFile.onchange = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader(); reader.readAsDataURL(file);
        reader.onload = () => {
            if (imgRenderTarget && framePreviewBox) {
                imgRenderTarget.src = reader.result; framePreviewBox.style.display = "block";
            }
        };
    };
}

if (uploadForm) {
    uploadForm.onsubmit = async (e) => {
        e.preventDefault(); const user = auth.currentUser; if (!user) return;
        const submitBtn = uploadForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true; submitBtn.textContent = "Publishing Moment...";

        const textContent = document.getElementById('moment-text').value.trim();
        let base64Image = ""; if (momentFile.files[0]) base64Image = imgRenderTarget.src;

        if (!textContent && !base64Image) {
            alert("Provide content to share a moment!");
            submitBtn.disabled = false; submitBtn.textContent = "Share Moment"; return;
        }

        try {
            const userSnap = await getDoc(doc(db, "users", user.uid));
            const userData = userSnap.exists() ? userSnap.data() : {};

            await addDoc(collection(db, "moments"), {
                userId: user.uid,
                authorName: userData.name || "User",
                authorUsername: userData.username || "/user",
                authorProfilePic: userData.profilePic || "",
                text: textContent, imageUrl: base64Image, uploadTimestamp: Date.now(), likedBy: []
            });
            window.location.href = "index.html";
        } catch (err) {
            alert(err.message); submitBtn.disabled = false; submitBtn.textContent = "Share Moment";
        }
    };
}