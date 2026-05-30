# LIK — Real-Time Moments Platform

LIK is a hardware-accelerated, real-time social networking canvas engineered for fast moment sharing, mutual profile swapping, and relationship status synchronization. Built on top of a client-side denormalized architecture powered by Firebase, LIK prioritizes minimal network latency, strict image containment, and a signature clean, logo-only navigation system.

## 🚀 Key Architectural Features

- **Denormalized Shallow Join Architecture**: To eliminate real-time synchronous network bottlenecks (`getDoc` or `getDocs` loops inside iterative UI loops), profile meta parameters (`authorName`, `authorUsername`, `authorProfilePic`) are baked directly into each `moment` payload at the exact second of publication. The Wall feed renders in a single database read.
- **Asynchronous Parallel Promise Channels**: Swaps and social network dashboards fetch bulk user records using concurrent non-blocking loops via `Promise.all()`.
- **Indefinite Session Persistence Engine**: Configured via `setPersistence(auth, browserLocalPersistence)` to enforce persistent local credential records across browser session terminations.
- **Hardware-Accelerated UI**: Implements rendering hints (`will-change: transform, opacity`) to offload heavy interface components directly to the GPU for smooth scrolling and modal animations.
- **Minimalist Logo-Only Interface**: Designed with an iconic layout configuration that strips out textual brand labels from headers to rely strictly on an icon graphic asset (`logo.png`).
- **Dynamic Relationship Binder Matrix**: Complete data tracing loops for mutual Profile Swapping, incoming/outgoing request validation, and an active, cross-profile dissolving loop ("Break Up" trigger) that resets status schemas instantaneously across paired accounts.

## 🛠️ Technology Stack & Dependencies

- **Frontend Core**: Semantic HTML5, CSS3 Custom Properties (Dual-Theme Interface Architecture Variables), Native Vanilla ECMAScript Modules (`ES6`).
- **Database & Identity Management Layer**: Google Firebase JS SDK v10.8.0 (Firestore Database / Authentication via Google Identity Provider Service).
- **Typography Layout Elements**: Apple Native Font Stacks (`SF Pro Display`, `SF Pro Text`, `Inter`).

## 📁 Repository Directory Structure

```text
D:\LIK\
│
├── css/
│   └── main.css                     # Premium responsive standard social UI rules
│
├── js/
│   ├── firebase-config.deploy.js    # Firebase initialization configuration credentials
│   ├── auth-google.js               # Local persistence identity gateway engine
│   ├── wall.js                      # Denormalized single-pass feed timeline controller
│   ├── upload.js                    # Post creator with inline user meta-injection
│   ├── profile.js                   # Dynamic statistics analyzer & relationship controller
│   └── swaps.js                     # Batch promise mutual network connection grid
│
├── index.html                       # Chronological standard home wall stream panel
├── upload.html                      # Moment creator viewport frame
├── swaps.html                       # Connections dashboard panel mapping manager
├── profile.html                     # Account metadata metrics dashboard
├── settings.html                    # Decoupled theme, session, and danger zone controls
└── logo.png                         # Standalone square branding layout graphic asset