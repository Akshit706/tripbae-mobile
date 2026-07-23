# Firebase Auth Migration Plan  
## Google Sign-In for Web + Mobile (iOS & Android)

---

## 1. Current State

| Layer | What’s used | Notes |
|-------|-------------|-------|
| Auth backend | Custom Node/Express API at `travelbae-backend-sg.onrender.com` | Endpoints: `/auth/login`, `/auth/signup`, `/auth/send-otp`, `/auth/verify-otp` |
| Auth method | Email + password (legacy) and email OTP (passwordless) | OTP sends a code via email, verified server-side |
| Token storage | Capacitor `@capacitor/preferences` (native) / `localStorage` (web) | Key: `travelbae_token` |
| API auth | Bearer token in `Authorization` header | `src/api.js` → `apiFetch()` |
| Supabase | Used **only for file storage** (`trip-photos` bucket) | **Not used for authentication** |
| Platform | Capacitor (Vite + React) — web, iOS, Android | Already has `@capacitor/preferences`, `@capacitor/google-signin` plugin not yet installed |

---

## 2. Target State

- Replace the custom backend auth with **Firebase Authentication**.
- Add **Google Sign-In** as the primary login method.
- Keep email OTP as a fallback (Firebase also supports email link / phone OTP).
- Work on **web, iOS, and Android** (inside Capacitor).

---

## 3. Backend Changes Required

The current backend issues its own JWTs. After migration:

- **Option A (recommended):** Backend accepts Firebase ID tokens instead of its own tokens.
  - Frontend sends `Authorization: Bearer <firebase-id-token>`.
  - Backend verifies the token using Firebase Admin SDK (`admin.auth().verifyIdToken(token)`).
  - Backend extracts `uid` & `email` from the verified token, looks up/creates the user in its DB.
  - No change to existing trips/expenses/photos data — just the auth header changes.

- **Option B (simpler, less backend work):** Keep backend issuing its own tokens, but add a Firebase-to-backend exchange endpoint.
  - Frontend sends Firebase ID token to a new endpoint (e.g. `/auth/firebase`).
  - Backend verifies it, creates/looks up the user, returns its own legacy token.
  - Frontend then uses the legacy token as before for all other API calls.
  - **Less disruptive** — only one new endpoint, existing auth middleware stays unchanged.

| Comparison | Option A | Option B |
|---|---|---|
| Backend changes | Change auth middleware on every route | Add 1 new endpoint |
| Token flow | Firebase ID token used everywhere | Firebase token exchanged once for legacy token |
| Risk | Higher (touches all routes) | Lower (isolated change) |
| Recommendation | Cleaner long-term | Safer short-term; **recommended for now** |

---

## 4. Frontend Changes (this repo)

### 4.1 Install dependencies

```bash
npm install firebase @capacitor-firebase/authentication
```

- `firebase` — Firebase Web SDK v10+ (modular)
- `@capacitor-firebase/authentication` — Capacitor plugin that wraps native Firebase Auth SDKs for iOS/Android

### 4.2 Create Firebase config

New file: `src/firebase.js`

```js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

### 4.3 Create auth service

New file: `src/auth.js`

This module abstracts the differences between web and native:

```js
import { GoogleAuthProvider, signInWithCredential, signInWithEmailLink, sendSignInLinkToEmail, isSignInWithEmailLink } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth } from './firebase';
import { isNative } from './platform';

export async function signInWithGoogle() {
  if (isNative) {
    // 1. Use Capacitor plugin to get the Google credential on native
    const result = await FirebaseAuthentication.signInWithGoogle();
    // 2. Create Firebase credential from the native result
    const credential = GoogleAuthProvider.credential(result.credential?.idToken);
    // 3. Sign in to Firebase
    return signInWithCredential(auth, credential);
  } else {
    // Web: use Firebase popup/redirect
    const { signInWithPopup } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }
}

export async function signOut() {
  await FirebaseAuthentication.signOut(); // native
  return auth.signOut();                  // web
}

export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
```

### 4.4 Modify `src/TravelBae.jsx`

- Add a "Sign in with Google" button on the login screen.
- On click: call `signInWithGoogle()`, get the Firebase ID token, send it to backend `/auth/firebase`, receive legacy token, store it as before.
- Remove the email/password login UI (or keep it behind a toggle).

**New flow in `handleGoogleSignIn()`:**

```js
const handleGoogleSignIn = async () => {
  setAuthError(''); setAuthLoading(true);
  try {
    const userCredential = await signInWithGoogle();
    const idToken = await userCredential.user.getIdToken();
    // Exchange Firebase token for legacy backend token
    const res = await fetch(`${API_BASE}/auth/firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Google sign-in failed');
    await finishAuth(data);
  } catch (err) {
    setAuthError(err.message);
  }
  setAuthLoading(false);
};
```

### 4.5 Modify `src/api.js`

No changes needed if using **Option B** (token exchange). The existing `apiFetch` still works with the legacy token.  
If using **Option A**, change `apiFetch` to use Firebase ID tokens directly.

### 4.6 Handle token refresh

- Firebase ID tokens expire after 1 hour.
- Use `onIdTokenChanged` listener to auto-refresh:

```js
import { onIdTokenChanged } from 'firebase/auth';

onIdTokenChanged(auth, async (user) => {
  if (user) {
    const token = await user.getIdToken();
    await setItem('travelbae_token', token); // or setItem('firebase_id_token', token)
  }
});
```

### 4.7 UI changes in `TravelBae.jsx`

- Add Google sign-in button in the `.lg-card` section (below or replacing the password form).
- Style: Google’s brand guidelines — white background, Google "G" logo, "Sign in with Google" text.
- Keep the existing auth flow intact as fallback during transition.

---

## 5. Firebase Project Setup

### 5.1 Create Firebase project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. Register a **Web app** — copy the config object into `src/firebase.js`

### 5.2 Enable Google Sign-In
1. In Firebase Console → Authentication → Sign-in method
2. Enable **Google** provider
3. Configure the OAuth consent screen (project name, support email)

### 5.3 iOS setup (for Capacitor)
1. Download `GoogleService-Info.plist` from Firebase Console → Project Settings → Your iOS app
2. Place it in the Xcode project (usually via Capacitor: `ios/App/App/`)
3. Add custom URL scheme in Xcode — the `REVERSED_CLIENT_ID` from the plist
4. Run `npx cap sync` after adding the plist

### 5.4 Android setup (for Capacitor)
1. Download `google-services.json` from Firebase Console → Project Settings → Your Android app
2. Place it in `android/app/`
3. The `@capacitor-firebase/authentication` plugin handles the native Google Sign-In flow

---

## 6. Migration Steps (ordered)

| Step | File(s) | Description |
|------|---------|-------------|
| 1 | `package.json` | Install `firebase` and `@capacitor-firebase/authentication` |
| 2 | `src/firebase.js` (new) | Firebase app initialization |
| 3 | `src/auth.js` (new) | Abstraction: `signInWithGoogle()`, `signOut()`, `getIdToken()` |
| 4 | `src/TravelBae.jsx` | Add Google sign-in button + handler; keep existing login for now |
| 5 | Backend | Add `POST /auth/firebase` endpoint (verify Firebase ID token, return legacy token) |
| 6 | `src/TravelBae.jsx` | Wire up `handleGoogleSignIn` → backend exchange → `finishAuth()` |
| 7 | Firebase Console | Enable Google provider, configure OAuth screen |
| 8 | iOS | Add `GoogleService-Info.plist`, configure URL scheme |
| 9 | Android | Add `google-services.json` |
| 10 | `src/api.js` (optional) | If switching to Option A: update `apiFetch` to use Firebase tokens |
| 11 | `src/TravelBae.jsx` | Remove old password login UI (or keep as fallback behind a toggle) |
| 12 | Testing | Test on web, iOS simulator, Android emulator |

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Existing users have no Google account linked | Backend `/auth/firebase` should match by email — if a user already exists with that email, link the Firebase UID to their account |
| Firebase ID token expiry (1 hour) | Use `onIdTokenChanged` listener to auto-refresh and update stored token |
| Native Google Sign-In plugin issues | The `@capacitor-firebase/authentication` plugin is well-maintained; fallback to Firebase web popup on native if needed |
| Backend JWT verification changes | Use Option B (token exchange) — only 1 new endpoint, minimal backend risk |
| Users with same email but different auth providers | Firebase automatically links accounts with the same email if "One account per email address" is enabled in Firebase Console |

---

## 8. Estimated Effort

| Task | Estimate |
|------|----------|
| Firebase project setup | 30 min |
| Frontend: install deps + config + auth service | 1–2 hours |
| Backend: `/auth/firebase` endpoint | 1–2 hours |
| UI: Google button + login flow wiring | 1–2 hours |
| iOS/Android native config | 1 hour |
| Testing & debugging | 2–3 hours |
| **Total** | **~1–2 days** |