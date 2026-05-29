# LIK Framework Documentation (Complete Project Blueprint) ⚡

[cite_start]An open-source, lightweight, temporary social media platform focused entirely on moment sharing and real-time interactive presence[cite: 3, 5, 25]. 

[cite_start]Traditional social spaces permanently log, index, and archive user interactions, fostering data hoarding and digital fatigue[cite: 5]. [cite_start]LIK pivots aggressively away from permanence, building an ephemeral, distraction-free, calm workspace where all text and image assets expire and hard-purge globally after exactly 24 hours[cite: 4, 15, 110, 113].

---

## 🗺️ Master Project Vision & Roadmap

[cite_start]LIK is built on a modular open-source philosophy designed to welcome beginner developers while remaining highly expandable for future production cycles[cite: 150, 154, 155].

### 🕒 Phase 1: Core Architecture (Current v0.1.0 Release)
* [cite_start]**Ephemeral Wall Feed:** A clean, single-page scrollable timeline displaying text or image moments from all users globally[cite: 60, 61, 63, 64].
* [cite_start]**Google Identity Mapping:** Passwordless authentication that maps a secure UID string to a minimal profile dataset[cite: 47, 134].
* [cite_start]**Onboarding Module:** Custom modal system ensuring first-time users declare their Display Name and Age safely upon arrival[cite: 48, 49, 50].
* [cite_start]**Optimistic UI Interaction:** Fast interaction elements via a centralized Like Button system[cite: 65, 69].
* [cite_start]**Dynamic Profile Analytics:** In-memory calculations computing rolling engagement metrics[cite: 79].

### 🕒 Phase 2: System Enhancements (v0.2.0 Pipeline)
* [cite_start]**Automated Cloud Sweeper:** Implementation of background scheduled jobs to permanently clear expired documents and base64 payloads out of memory pools once expiration timestamps pass[cite: 144, 148, 149].
* [cite_start]**Global Leaderboard Dashboard:** An expanded ranking layout rendering the competitive gamification mechanics of the platform[cite: 99, 100].

### 🕒 Phase 3: Cross-Platform Expansion (Future Horizon)
* [cite_start]**Native Hybrid Porting:** Transitioning our semantic web views into native mobile wrappers (iOS and Android applications) using the identical lightweight Firebase backend instance[cite: 160].

---

## 🎮 The Gamified "Lik Score" Engine

[cite_start]The primary interactive mechanic of LIK centers around explicit, real-time user validation[cite: 69, 89]. [cite_start]To keep engagement authentic without permanent archiving, data is measured dynamically[cite: 22, 163]:

### Mathematical Score Distribution
[cite_start]Every uploaded active moment tracks an internal integer variable counter (`likesCount`)[cite: 91, 142]. 
[cite_start]When calculating profile analytics, the engine sums all active likes across a user's collection and divides it by their total number of active posts running on the timeline[cite: 86, 96]:

$$\text{Lik Score} = \frac{\sum(\text{Active Likes})}{\text{Total Active Live Moments}}$$

### The Leaderboard Strategy
* [cite_start]**Consistency of Engagement:** Users are ranked continuously based on this rolling average rather than lifetime historical counts[cite: 101, 102]. 
* [cite_start]**Dynamic Placement:** High-velocity, highly appreciated single moments lift your placement position instantly[cite: 105]. [cite_start]Once a post expires at its 24-hour mark, its likes drop from the formula, shifting global leaderboards daily and encouraging fresh, authentic sharing[cite: 15, 97, 105].

---

## 📑 Complete Architectural Data Structures

[cite_start]LIK standardizes its relational documents into two core collections inside our schema layout[cite: 130]:

### 1. `users` Collection Document Schema
```json
{
  "uid": "String (Firebase Auth Unique Token Identifier)",
  "name": "String (User Configured Display Name)",
  "age": "Number (Declared Onboarding Metric Variable)",
  "totalLikes": "Integer (Lifetime Historical Accumulation Metric)",
  "averageLikScore": "Float (Computed Profile Calculation Value)",
  "rank": "String/Integer (Global Leaderboard Tier Placement)"
}