# 🪐 LIK — Ephemeral Micro-Moments Space

LIK is a minimalist, mobile-first temporary social media ecosystem built for immediate presence rather than permanent archives. Every shared moment (text thoughts or compressed base64 images) automatically drops off the universal feed timeline exactly 24 hours after creation.

---

## 📁 Repository Architecture & Component Responsibilities

The codebase separates visual template elements (`HTML`/`CSS`) from operational lifecycle engines (`JavaScript`/`Firebase NoSQL`):

### 🌐 Presentation Interface Files (HTML/CSS)
* **`index.html`** — The primary application gateway. Handles rendering conditional workspace states (the public Google login form for unauthenticated sessions vs. the horizontal feed stream for verified profiles).
* **`upload.html`** — Staging sandbox for post creation. Houses the drop area for files and binds text areas to transient moment objects.
* **`profile.html`** — Personal user dashboard. Displays calculated points tracking tables, user bio fields, and a dense 3-column chronological grid layout of active personal posts.
* **`css/style.css`** — The unified responsive dark design matrix. Utilizes specific CSS Media Queries to transition between wide centered layouts for laptops and sticky bottom nav bars for phones.

### ⚡ Logic Controllers (`js/`)
* **`js/auth-google.js`** — Manages identity routing. Hooks into Firebase Authentication for single-click entry, triggers onboarding states for new registrations, and drops cookie sessions upon logging out.
* **`js/wall.js`** — Drives the core feed pipeline. Pulls non-expired moments from Firestore using query filters, injects vector heart SVGs, and runs security checks to block self-liking.
* **`js/upload.js`** — Listens to file selections, serializes asset streams into lightweight Base64 strings, and adds the data payload to Firestore with matching expiration timestamps.
* **`js/profile.js`** — Tracks personal metrics. Queries user documents, calculates engagement rates, and hooks up the absolute deletion sequence to purge records permanently.

---

## ⚙️ Core Technical Logic Systems

### 1. The 24-Hour Ephemerality Sweeper Matrix
Instead of expensive server-side cron daemons, LIK uses programmatic client-side query masking. When the wall loads, a Firestore filter discards any records where the creation timestamp is older than the current Unix window.

```javascript
const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
const q = query(
    collection(db, "moments"), 
    where("uploadTimestamp", ">", dayAgo), 
    orderBy("uploadTimestamp", "desc")
);