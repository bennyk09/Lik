import { auth, db } from './firebase-config.deploy.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const uploadForm = document.getElementById('upload-form');

if(uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!auth.currentUser) return;

        const text = document.getElementById('moment-text').value;
        const fileInput = document.getElementById('moment-file');
        let imageUrl = "";

        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            imageUrl = await toBase64(file);
        }

        if(!text && !imageUrl) { alert("Please write a post or select an image."); return; }

        try {
            const now = Date.now();
            await addDoc(collection(db, "moments"), {
                userId: auth.currentUser.uid,
                text: text || "",
                imageUrl: imageUrl,
                uploadTimestamp: now,
                expirationTimestamp: now + (24*60*60*1000),
                likesCount: 0
            });
            window.location.href = "index.html";
        } catch(err) { alert(err.message); }
    });
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});