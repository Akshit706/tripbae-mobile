# Capacitor Migration: Complete Change List

> A comprehensive analysis of everything that needs to change to convert the TravelBae React web app into a mobile app using Capacitor.

---

## Table of Contents

1. [Capacitor Project Setup](#1-capacitor-project-setup)
2. [localStorage → @capacitor/preferences](#2-localstorage--capacitorpreferences)
3. [Browser Dialog APIs → @capacitor/dialogs](#3-browser-dialog-apis--capacitordialogs)
4. [Navigator API Replacements](#4-navigator-api-replacements)
5. [Contact Picker API (BLOCKER)](#5-contact-picker-api-blocker)
6. [Chart.js Migration (Remove CDN Loading)](#6-chartjs-migration-remove-cdn-loading)
7. [Dynamic CSS Injection](#7-dynamic-css-injection)
8. [Download Shim Pattern](#8-download-shim-pattern)
9. [Window/DOM APIs to Adapt](#9-windowdom-apis-to-adapt)
10. [CSS & Styling for Mobile](#10-css--styling-for-mobile)
11. [Navigation Architecture](#11-navigation-architecture)
12. [Native App Assets & Config](#12-native-app-assets--config)
13. [Authentication Tokens](#13-authentication-tokens)
14. [Files to Delete or Ignore](#14-files-to-delete-or-ignore)
15. [Architecture Refactoring (Optional)](#15-architecture-refactoring-optional)
16. [Summary: Effort Breakdown](#16-summary-effort-breakdown)

---

## 1. Capacitor Project Setup

### 1.1 Initialize Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npx cap init TravelBae com.travelbae.app
```

This creates `capacitor.config.ts`, `android/`, and `ios/` directories.

### 1.2 Install Required Capacitor Plugins

| Plugin | Replaces | Files Affected |
|---|---|---|
| `@capacitor/preferences` | `localStorage` | 11 files, 46 call sites |
| `@capacitor/dialogs` | `window.confirm()`, `window.alert()`, `window.prompt()` | `TravelBae.jsx`, 4 call sites |
| `@capacitor/share` | `navigator.share()` | `ProfilePage.jsx`, 1 call site |
| `@capacitor/clipboard` | `navigator.clipboard.writeText()` | `ShareCodeModal.jsx`, `HomePage.jsx`, 2 call sites |
| `@capacitor/geolocation` | `navigator.geolocation.getCurrentPosition()` | `ClubPage.jsx`, 1 call site |
| `@capacitor/haptics` | `navigator.vibrate()` | `ClubPage.jsx`, 1 call site |
| `@capacitor/status-bar` | CSS-based status bar handling | Global |
| `@capacitor/splash-screen` | Native splash screen | Global |
| `@capacitor/app` | Back button handling | Global |

### 1.3 Vite Config Changes (`vite.config.js`)

- Add `base: './'` so relative asset paths work in WebView
- Consider adding build output config for Capacitor's `webDir`
- Optionally add `@capacitor/assets` or `@capacitor/cli` Vite plugin

### 1.4 `index.html` Changes

- Add `<meta name="theme-color" content="..." />` for mobile browser chrome
- Remove `<link rel="icon" href="/favicon.svg" />` — Capacitor uses native app icons
- Move Google Fonts `<link>` tags here (Sora, DM Sans, Inter) instead of JSX injection
- Consider adding a service worker registration for PWA fallback

### 1.5 `package.json` Updates

- Add `chart.js` as npm dependency (replacing CDN loading)
- Add Capacitor and plugin versions to `dependencies`
- Add build scripts:

```json
{
  "scripts": {
    "cap-sync": "npm run build && npx cap sync",
    "cap-open:ios": "npm run cap-sync && npx cap open ios",
    "cap-open:android": "npm run cap-sync && npx cap open android"
  }
}
```

- Verify if `lucide-react` is actually used; remove if confirmed dead

---

## 2. localStorage → @capacitor/preferences

**11 files, 46 call sites, 16 unique key patterns.**

### ⚠️ Critical: Preferences is async, localStorage is sync

Every existing read/write to localStorage assumes synchronous access. `@capacitor/preferences` uses an async API (`await Preferences.get(...)` / `await Preferences.set(...)`). This is the single largest code change.

### 2.1 Create a Storage Abstraction Layer

Create `src/storage.js`:

```javascript
import { Preferences } from '@capacitor/preferences';
// or use a platform check to fall back to localStorage in browser dev

export async function getItem(key) { ... }
export async function setItem(key, value) { ... }
export async function removeItem(key) { ... }
```

Add a first-launch migration to copy existing `localStorage` data into `Preferences`.

### 2.2 Files to Change

| # | File | Keys Used | Call Sites |
|---|---|---|---|
| 1 | `src/api.js` | `travelbae_token` | 1 (read) |
| 2 | `src/TravelBae.jsx` | `travelbae_token`, `travelbae_profile`, `travelbae_prefs`, `travelbae_trip_ai_cache_v1` | 14 |
| 3 | `src/features/home/HomePage.jsx` | `fx_v2_{from}` | 3 |
| 4 | `src/features/profile/ProfilePage.jsx` | `travelbae_prefs`, `travelbae_rating` | 5 |
| 5 | `src/features/split/SplitPage.jsx` | `travelbae_custom_expense_tags_{trip.id}` | 2 |
| 6 | `src/features/solo/SoloExpensesPage.jsx` | `travelbae_custom_expense_tags_{trip.id}` | 2 |
| 7 | `src/features/club/ClubPage.jsx` | `travelbae_club_{trip.id}_loc_lat`, `..._loc_lng`, `..._loc_label`, `..._radius`, `travelbae_club_terms_accepted` | 17 |
| 8 | `src/features/photos/PhotosPage.jsx` | `travelbae_photos_welcome_{trip.id}` | 2 |
| 9 | `src/features/contacts/ContactsPage.jsx` | `travelbae_contacts_welcome_{trip.id}`, `travelbae_contacts_emg_dismissed_{trip.id}` | 4 |
| 10 | `src/features/itinerary/ItineraryPage.jsx` | `travelbae_welcome_seen_{trip.id}` | 3 |

### 2.3 All Unique Key Patterns

| Key Pattern | Type | Files |
|---|---|---|
| `travelbae_token` | Literal | `api.js`, `TravelBae.jsx` |
| `travelbae_profile` | Literal | `TravelBae.jsx` |
| `travelbae_prefs` | Literal | `TravelBae.jsx`, `ProfilePage.jsx` |
| `travelbae_trip_ai_cache_v1` | Constant | `TravelBae.jsx` |
| `travelbae_rating` | Literal | `ProfilePage.jsx` |
| `fx_v2_{from}` | Dynamic | `HomePage.jsx` |
| `travelbae_photos_welcome_{trip.id}` | Dynamic | `PhotosPage.jsx` |
| `travelbae_contacts_welcome_{trip.id}` | Dynamic | `ContactsPage.jsx` |
| `travelbae_contacts_emg_dismissed_{trip.id}` | Dynamic | `ContactsPage.jsx` |
| `travelbae_custom_expense_tags_{trip.id}` | Dynamic | `SplitPage.jsx`, `SoloExpensesPage.jsx` |
| `travelbae_club_{trip.id}_loc_lat` | Dynamic | `ClubPage.jsx` |
| `travelbae_club_{trip.id}_loc_lng` | Dynamic | `ClubPage.jsx` |
| `travelbae_club_{trip.id}_loc_label` | Dynamic | `ClubPage.jsx` |
| `travelbae_club_{trip.id}_radius` | Dynamic | `ClubPage.jsx` |
| `travelbae_club_terms_accepted` | Constant | `ClubPage.jsx` |
| `travelbae_welcome_seen_{trip.id}` | Dynamic | `ItineraryPage.jsx` |

### 2.4 Async Refactoring Impacts

- `api.js` line 4 — `getAuthToken()` becomes async → all API call functions become async (they already are, but callers may need changes)
- `TravelBae.jsx` — auth state initializer (`useState(localStorage.getItem(...))`) must be rewritten with `useEffect` + async fetch
- All feature component `useState` initializers that read from localStorage need `useEffect` refactoring

---

## 3. Browser Dialog APIs → @capacitor/dialogs

**All 4 call sites in `TravelBae.jsx`.**

### 3.1 `window.confirm()` → `Dialogs.confirm()`

```
File: src/TravelBae.jsx, line 502
Current:  window.confirm('Are you sure you want to delete your account?')
Replace: Dialogs.confirm({ title: 'Delete Account', message: '...' }) → { value: boolean }
```

### 3.2 `window.prompt()` → `Dialogs.prompt()`

```
File: src/TravelBae.jsx, line 504
Current:  window.prompt('Type "DELETE" to confirm')
Replace: Dialogs.prompt({ title: 'Confirm', message: 'Type DELETE to confirm' }) → { value: string, cancelled: boolean }
```

### 3.3 `window.alert()` → `Dialogs.alert()`

```
File: src/TravelBae.jsx, lines 515, 517
Current:  window.alert('Account deleted.')
Replace: Dialogs.alert({ title: '', message: 'Account deleted.' })
```

---

## 4. Navigator API Replacements

### 4.1 `navigator.share()` → `@capacitor/share`

```
File: src/features/profile/ProfilePage.jsx
Current:  navigator.share({ title, url })
Replace: Share.share({ title, text, url, dialogTitle })
```

### 4.2 `navigator.clipboard.writeText()` → `@capacitor/clipboard`

```
Files:
  - src/features/home/ShareCodeModal.jsx
  - src/features/home/HomePage.jsx
Current:  navigator.clipboard.writeText(text)
Replace: Clipboard.write({ string: text })
```

### 4.3 `navigator.geolocation.getCurrentPosition()` → `@capacitor/geolocation`

```
File: src/features/club/ClubPage.jsx
Current:  navigator.geolocation.getCurrentPosition(callback, error, options)
Replace: Geolocation.getCurrentPosition() → { coords: { latitude, longitude } }
```

Requires requesting location permissions (`NSLocationWhenInUseUsageDescription` in `Info.plist`, `ACCESS_FINE_LOCATION` in `AndroidManifest.xml`).

### 4.4 `navigator.vibrate()` → `@capacitor/haptics`

```
File: src/features/club/ClubPage.jsx
Current:  navigator.vibrate(50)
Replace: Haptics.vibrate({ duration: 50 }) or Haptics.impact({ style: ImpactStyle.Light })
```

---

## 5. Contact Picker API (BLOCKER)

> **There is no official Capacitor plugin for the Contact Picker API.**  
> File: `src/features/contacts/ContactsPage.jsx`

### Options

| Option | Approach | Effort | Risk |
|---|---|---|---|
| **A** | Build a custom Capacitor plugin wrapping native iOS (`CNContactPickerViewController`) and Android (`ContactsContract`) contact pickers | High | Best UX, most work |
| **B** | Use community plugin like `@capacitor-community/contacts` (read-only contact access, different API surface) | Medium | Different API, may need adjustments |
| **C** | Replace with a manual contact entry form (name + phone input) | Low | Worse UX |

---

## 6. Chart.js Migration (Remove CDN Loading)

### 6.1 Install as npm Dependency

```bash
npm install chart.js
```

### 6.2 Refactor `src/features/split/SplitPage.jsx`

- **Remove:** `useEffect` block that creates `<script>` tag and injects into `document.head` (lines 61-67)
- **Remove:** `chartReady` boolean state and all `if (!chartReady)` guard conditions
- **Replace:** `new window.Chart(...)` → `new Chart(...)` (imported from `chart.js`)
- **Add:** `import { Chart } from 'chart.js'` at top of file
- **Destroy cleanup:** Keep existing `.destroy()` calls on re-render

### 6.3 Refactor `src/features/solo/SoloExpensesPage.jsx`

- Same changes as `SplitPage.jsx` — identical pattern
- **Remove:** Script injection effect (lines 64-70)
- **Replace:** `new window.Chart(...)` → `new Chart(...)`

---

## 7. Dynamic CSS Injection

Three files inject `<style>` elements into `document.head` at **module evaluation time** (outside React lifecycle). This can cause race conditions or FOUC in WebViews.

| File | Guard ID | Lines | Size |
|---|---|---|---|
| `src/features/itinerary/ItineraryPage.jsx` | `itinerary-styles` | 102–234 | ~130 lines |
| `src/features/itinerary/RecommendationsPage.jsx` | `recs-v2-styles` | 17–58 | ~41 lines |
| `src/features/photos/PhotosPage.jsx` | `photos-v2-styles` | 24–370 | ~346 lines |

### What to do (choose one per file)

1. **Move to a `.css` file** — extract the CSS into a separate `.css` file and `import` it normally. Simplest, best performance.
2. **Move to React `<style>` tag** — render the `<style>` tag inside the component's JSX (like `TravelBae.jsx` already does). Scoped to component lifecycle.
3. **Convert to inline React styles** — only feasible if the CSS is mostly simple properties (animation keyframes can't be inlined easily).

### 7.1 Google Fonts Loading

```
File: src/TravelBae.jsx, line 905
Current:  <link href="https://fonts.googleapis.com/css2?family=Sora:..." rel="stylesheet" /> (in JSX)
Change:   Move to a static <link> in index.html

File: src/features/home/HomePage.jsx, line 567
Current:  @import url('https://fonts.googleapis.com/css2?family=Inter:...') (inside <style> tag)
Change:   Move to a static <link> in index.html
```

Moving fonts to `index.html` ensures they load before first paint and removes network dependency on component mount.

**Alternative:** Bundle font files locally (works offline, no Google Fonts dependency).

### 7.2 Inline `<style>` Tags Already in JSX

These are fine in WebView — they use React's DOM rendering. No changes strictly needed (but consider moving to `.css` files for better caching):

- `TravelBae.jsx` lines 906–914 — global keyframes (`spin`, `tbShimmer`, `slideIn`, `tbPageIn`, `tbCardIn`, `tbBlobDrift`, `tbGlowPulse`)
- `HomePage.jsx` lines 566+ — Inter font `@import` + keyframes (`float`, `pulse`, `fadeUp`, `progressFill`, `tbMacbookFold`)

---

## 8. Download Shim Pattern (`document.createElement('a')`)

Three locations create temporary `<a>` elements to trigger blob downloads:

### 8.1 Photo downloads

```
File: src/features/photos/PhotosPage.jsx, lines 493–496
File: src/features/club/ClubPage.jsx, lines 1032–1038

Pattern:
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
```

**Options:**
- **A:** Use `@capacitor/filesystem` to write blobs to device storage
- **B:** Use `@capacitor/share` to share the file (user saves from share sheet, more iOS-friendly)
- **C:** Keep the `<a>` download shim (works in iOS WKWebView, may not work on Android without config)

### 8.2 Canvas-based image resize

```
File: src/features/profile/ProfilePage.jsx, lines 160–163

Pattern:
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  const dataUrl = c.toDataURL('image/jpeg', 0.85);
```

Canvas works in WebView but has memory constraints on older devices. Consider server-side resizing or native image compression via `@capacitor/filesystem`.

---

## 9. Window/DOM APIs to Adapt

### 9.1 `window.scrollTo()`

```
File: src/TravelBae.jsx, line 744
File: src/features/itinerary/RecommendationsPage.jsx

Current:  window.scrollTo({ top: 0, behavior: 'smooth' })
Status:   Works in WebView. Test for smooth scrolling performance.
          If janky, use scrollIntoView() or requestAnimationFrame fallback.
```

### 9.2 `window.location.origin`

```
File: src/features/profile/ProfilePage.jsx

Current:  Builds share link using window.location.origin
Problem:  In Capacitor, window.location.origin = "capacitor://localhost" (not a public URL)
Fix:      Replace with a hardcoded production URL or Capacitor config variable
```

### 9.3 `window.innerWidth`

```
File: src/TravelBae.jsx, lines 585, 587 — shared flight animation sizing

Status: Still works in WebView.
        Consider: Capacitor.getPlatform() + Screen.getOrientation() for reliable sizing.
```

### 9.4 `requestAnimationFrame`

```
File: src/TravelBae.jsx, line 608 — shared flight animation

Status: Works in WebView. No change needed.
```

### 9.5 `Image()` constructor

```
File: src/features/profile/ProfilePage.jsx

Status: Works in WebView. No change needed.
```

### 9.6 `FormData`, `FileReader`, `Blob`, `URL.createObjectURL`/`revokeObjectURL`

```
Files: PhotosPage.jsx, ClubPage.jsx, ProfilePage.jsx
Used for photo/avatar uploads

Status: All work in WebView. No changes needed.
```

---

## 10. CSS & Styling for Mobile

### 10.1 `#root { width: 1126px }` (`index.css`)

Desktop-oriented fixed width, constrained by `max-width: 100%`. Should be fine on mobile, but verify rendering on narrow viewports (< 375px).

### 10.2 Fixed Positioning Stack

- **`.tb-noise-layer`** — `position: fixed` covering viewport, `pointer-events: none`. Verify performance on older devices.
- **`.tb-shared-flight`** — `position: fixed, z-index: 999`. Confirm not hidden behind keyboard or notch.
- **`.tb-sheet-overlay`** — `position: fixed, inset: 0, z-index: 620`. Used by `ConfirmDialog`.

### 10.3 Safe Area CSS Tokens (Already Present)

`index.css` already has:

```css
--tb-safe-top: env(safe-area-inset-top, 0px);
--tb-safe-bottom: env(safe-area-inset-bottom, 0px);
```

And `.tb-safe-bottom` applies padding. These are correct for Capacitor — **no changes needed**.

### 10.4 Hover States (Already Handled)

`index.css` line 448 has:

```css
@media (hover: none) {
  button:hover, .tb-nav-pill:hover, .tb-nav-pill:hover::before,
  .tb-trip-card:hover, .tb-float-card:hover {
    transform: none !important;
    box-shadow: inherit;
  }
}
```

All five `:hover` rules are properly neutralized on touch. **No changes needed.**

### 10.5 `cursor: pointer` in Inline Styles

Present in `styles.js` (`S.tripPill`, `S.soloPill`, `S.navTab`, `S.btn`). Harmless on touch (no effect) but unnecessary. Can optionally remove.

### 10.6 `scroll-behavior: smooth` on `body`

Can interfere with programmatic scrolling in WebViews. Test thoroughly; if problematic, remove from global `body` and apply only where needed.

### 10.7 Missing `spin` Keyframe

`styles.js` references `animation: 'spin .75s linear infinite'` for spinners, but `@keyframes spin` is not defined in `index.css`. It's defined in `TravelBae.jsx`'s inline `<style>` tag. Add to `index.css` for safety.

### 10.8 Delete `src/App.css`

185 lines of dead Vite boilerplate. Never imported anywhere. Safe to delete.

---

## 11. Navigation Architecture

### 11.1 Current State: State-Based Navigation (No Router)

The app uses only React state for navigation:

- `activeTrip` (`null` = home, string = inside a trip)
- `tab` (`'main'`, `'itinerary'`, `'photos'`, `'club'`)
- `homeTab` (`'trips'`)
- `profileOpen` (boolean overlay)

No URLs, no browser history, no back button support.

### 11.2 Deep Linking (Recommended for Capacitor)

Capacitor apps typically need URL-based navigation for:

- Push notification deep links
- Universal links (iOS)
- App links (Android)
- Custom URL scheme handling

Options:
- **A:** Install React Router or TanStack Router, map URL paths to state transitions
- **B:** Keep state-based nav but add a deep link handler that maps URLs → state

Not required for basic Capacitor functionality, but strongly recommended for production.

### 11.3 Back Button Handling

Android has a hardware back button; iOS has swipe-back gesture. Currently the app has no concept of navigation history.

```javascript
import { App } from '@capacitor/app';

App.addListener('backButton', ({ canGoBack }) => {
  if (!canGoBack) {
    App.exitApp();
  } else {
    // Navigate back: dismiss modal → leave trip → go to home
    window.history.back();
  }
});
```

### 11.4 Status Bar Configuration

Add `@capacitor/status-bar`:

```javascript
import { StatusBar, Style } from '@capacitor/status-bar';

StatusBar.setStyle({ style: Style.Dark });  // light text for dark bg
StatusBar.setOverlaysWebView({ overlay: false });
```

---

## 12. Native App Assets & Config

### 12.1 App Icons

- Generate 1024×1024 base icon
- Use `@capacitor/assets` to generate all iOS/Android sizes
- Or use tools like `cordova-res` or `app-icon`

### 12.2 Splash Screen

- Generate splash screen assets (2732×2732 base)
- Configure `@capacitor/splash-screen`:

```typescript
{
  launchShowDuration: 2000,
  launchAutoHide: true,
  backgroundColor: '#FFFFFF'
}
```

### 12.3 Platform Permission Config

**`ios/App/App/Info.plist`** — add:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We use your location to find nearby trips</string>
<key>NSCameraUsageDescription</key>
<string>We need camera access to upload photos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to upload photos</string>
```

**`android/app/src/main/AndroidManifest.xml`** — add:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.VIBRATE" />
```

### 12.4 Capacitor Config (`capacitor.config.ts`)

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.travelbae.app',
  appName: 'TravelBae',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true
    },
    StatusBar: {
      style: 'dark'
    }
  }
};

export default config;
```

---

## 13. Authentication Tokens

### 13.1 Token Storage

```
Current:  localStorage.getItem('travelbae_token') — plaintext in WebView
Replace: @capacitor/preferences — uses native storage (still not encrypted, but more secure)
```

For production security, consider:
- `@capacitor-community/secure-storage-plugin` — iOS Keychain / Android Keystore encryption
- Or keep using Preferences (generally sufficient for non-banking apps)

### 13.2 Direct `fetch()` Bypass

```
File: src/TravelBae.jsx, lines 475–490

Current:  Password login uses raw fetch() instead of api.js login()/signup() functions
Fix:      Unify to use api.js functions for consistency and centralized auth handling
```

---

## 14. Files to Delete or Ignore

### 14.1 React Native `rn/` Folder

```
Path: src/features/itinerary/rn/
Files: ItineraryScreen.tsx, DaySection.tsx, ActivityCard.tsx, sampleData.ts, theme.ts

Irrelevant to Capacitor — these are Expo/React Native components for a separate mobile build.
Delete or move outside src/.
```

### 14.2 Dead CSS File

```
Path: src/App.css
Status: 185 lines of Vite startup boilerplate. Never imported anywhere.
Action: Delete.
```

### 14.3 Unused Dependency

```
Package: lucide-react
Status: Listed in package.json but never imported in any source file.
Action: Remove from package.json dependencies.
```

### 14.4 Dead Import in TravelBae.jsx

```
Import: import { supabase } from './supabase.jsx'
Status: supabase is imported at line 2 of TravelBae.jsx but not used in that file.
       It IS used in ClubPage.jsx for file storage.
Action: Keep (still needed transitively), but verify.
```

---

## 15. Architecture Refactoring (Optional)

Not required for Capacitor migration, but makes debugging and maintenance significantly easier.

### 15.1 Break Up `TravelBae.jsx` (1,287 lines)

Extract into separate concerns:

- `useAuth` hook — auth state, login/signup/logout flows
- `useNavigation` hook — tab state, trip navigation
- `useAICache` hook — AI itinerary/taste cache management
- `TopBar` component — navigation bar with trip/solo pills
- `NavRibbon` component — bottom navigation tabs
- `AuthScreen` component — login/signup UI

### 15.2 Lazy Loading

Currently all feature components are eagerly imported at the top of `TravelBae.jsx`. Use React.lazy() for feature pages:

```javascript
const SplitPage = React.lazy(() => import('./features/split/SplitPage.jsx'));
const ItineraryPage = React.lazy(() => import('./features/itinerary/ItineraryPage.jsx'));
// etc.
```

Reduces initial WebView load time significantly.

### 15.3 Platform Detection Helpers

Create `src/platform.js`:

```javascript
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
```

Use for conditional API calls (browser APIs in browser dev, Capacitor plugins on device).

### 15.4 Error Boundaries

WebViews are less forgiving of unhandled React errors. Add `ErrorBoundary` components around each feature page.

---

## 16. Summary: Effort Breakdown

| # | Category | Files Affected | Call Sites / Scope | Effort |
|---|---|---|---|---|
| 1 | Capacitor project setup | 3–4 config files | N/A | **Low** (1 day) |
| 2 | localStorage → Preferences | **11 files** | **46 call sites** | **HIGH** (3–5 days) |
| 3 | dialog APIs (confirm/alert/prompt) | 1 file | 4 call sites | **Low** (few hours) |
| 4 | navigator APIs (share, clipboard, geo, vibrate) | 4 files | 5 call sites | **Low–Medium** (1 day) |
| 5 | **Contact Picker API** | 1 file | 1 call site | **HIGH** (2–5 days, no clean replacement) |
| 6 | Chart.js CDN → npm | 2 files | 2 patterns | **Medium** (1–2 days) |
| 7 | Dynamic CSS injection | 3 files | 3 injection sites | **Medium** (1–2 days) |
| 8 | Download shim | 3 files | 3 patterns | **Low** (few hours) |
| 9 | Window/DOM APIs | 2 files | 3 call sites | **Low** (few hours) |
| 10 | CSS & styling for mobile | 1–2 files | N/A | **Low** (already 80% done) |
| 11 | Navigation architecture | 1 file | N/A | **Medium** (1–2 days, optional) |
| 12 | Native assets & config | Config files | N/A | **Low–Medium** (1 day) |
| 13 | Auth token security | 2 files | N/A | **Low** (few hours) |
| 14 | Dead code cleanup | 7 files | N/A | **Low** (1 hour) |
| 15 | Architecture refactoring | 1 major file | N/A | **Optional** (3–5 days) |

### Estimated Total: 2–4 weeks

- **Minimum viable migration**: ~2 weeks (skip refactoring, keep Contact Picker fallback UI)
- **Full production-quality app**: ~3–4 weeks (includes refactoring, custom Contact Picker plugin, thorough testing)

### Two Critical Blockers

1. **localStorage → Preferences async refactoring** (Category 2) — touches almost every file. The sync-to-async transition in `api.js` and `TravelBae.jsx` auth flow is the most complex part.
2. **Contact Picker API** (Category 5) — no official Capacitor plugin exists. Requires either a custom native plugin or a UX compromise (manual entry).

---

*Generated from a thorough analysis of all 23 source files in `src/`, including all `.jsx`, `.js`, `.tsx`, `.ts` files.*
