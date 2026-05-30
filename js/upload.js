import { auth, db } from './firebase-config.deploy.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const uploadForm = document.getElementById('upload-form');
const fileInput = document.getElementById('moment-file');
const previewBox = document.getElementById('frame-preview-box');
const previewImg = document.getElementById('img-render-target');

// Instant Upload Image Selection Rendering Preview Pipeline Link (NEW)
if (fileInput && previewBox && previewImg) {
    fileInput.onchange = async (e) => {
        if (e.target.files.length === 0) return;
        const file = e.target.files[0];
        try {
            const base64Data = await toBase64(file);
            previewImg.src = base64Data;
            previewBox.style.display = 'flex'; // Reveal the preview frame element container
        } catch(err) { console.error(err); }
    };
}

if(uploadForm) {
    uploadForm.onsubmit = async (e) => {
        e.preventDefault();
        if(!auth.currentUser) return;

        const text = document.getElementById('moment-text').value;
        let imageUrl = previewImg ? previewImg.src : "";

        if(!text && !imageUrl) { alert("Please provide text or an image payload."); return; }

        try {
            const now = Date.now();
            await addDoc(collection(db, "moments"), {
            userId: user.uid,
            text: document.getElementById('moment-text').value.trim(),
            imageUrl: imgStagingUrl, // contains base64 string or empty string
            uploadTimestamp: Date.now(),
            likedBy: [], // 🪐 INITIALIZE AS EMPTY ARRAY FOR TRACKING UNIQUE LIKES
            likesCount: 0 // Keep for legacy aggregation parameters if needed
});
            window.location.href = "index.html";
        } catch(err) { alert(err.message); }
    };
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});