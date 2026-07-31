# Mobile App Fixes Plan

## Problem 1: CreateTripWizard top hidden behind header

### Why it happens
The `CreateTripWizard` component (in `src/features/home/CreateTripWizard.jsx`) renders as a `position:fixed` overlay with `zIndex:1000`. However, the app's top bar in `src/TravelBae.jsx` has `zIndex:300`. On mobile, the wizard's modal card is centered vertically using `alignItems:'center'`, but on smaller screens the card height (`min(660px, 94svh)`) can be tall enough that its top portion slides under the fixed top bar.

Additionally, the wizard overlay padding is only `0.75rem` — not enough to clear the ~56px top bar.

### What to change

**File: `src/features/home/CreateTripWizard.jsx`**

**Line ~155** — The overlay container style:
```jsx
// CURRENT:
style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'0.75rem' }}

// CHANGE TO:
style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'calc(env(safe-area-inset-top, 0px) + 4rem) 0.75rem 0.75rem' }}
```

**Why:** The `padding-top` now uses `calc(env(safe-area-inset-top, 0px) + 4rem)` which adds:
- `env(safe-area-inset-top)` — handles notch/status bar overlap on modern phones
- `4rem` (64px) — clears the app's top bar height (~56px)

This pushes the wizard card down below the header on all devices.

---

## Problem 2: Android back button doesn't work

### Why it happens
The app has no listener for the Android hardware back button. By default, Capacitor's WebView handles the back button by navigating browser history — but since this is a single-page app (SPA), there's no browser history to navigate, so the back button does nothing (or exits the app).

We need to intercept the back button and use it to:
1. Close the CreateTripWizard if it's open
2. Close the profile page if it's open
3. Go back from a trip to the home screen
4. Exit the app only if already on the home screen

### What to change

**File: `src/TravelBae.jsx`**

**Line ~3** — Add import after existing imports:
```jsx
import { App as CapacitorApp } from '@capacitor/app';
```

**After line ~660** (after the `handleTabChange` function, before the `useEffect` for scroll) — Add a new `useEffect`:
```jsx
// ── Android hardware back button ──
useEffect(() => {
  const setupBackButton = async () => {
    try {
      let listener;
      listener = await CapacitorApp.addListener('backbutton', () => {
        // Priority 1: Close profile if open
        if (profileOpen) { setProfileOpen(false); return; }
        // Priority 2: Close notification popover
        if (showNotifPopover) { setShowNotifPopover(false); return; }
        // Priority 3: Go back from trip to home
        if (activeTrip) { setActiveTrip(null); setActiveTripData(null); return; }
        // Priority 4: Exit app if on home screen
        CapacitorApp.exitApp();
      });
      return () => { listener?.remove(); };
    } catch (e) {
      // Not on native platform — ignore
    }
  };
  const cleanup = setupBackButton();
  return () => { cleanup.then(fn => fn?.()); };
}, [profileOpen, showNotifPopover, activeTrip]);
```

**Why:** `@capacitor/app` is already installed (it's in the 10 plugins listed during `cap sync`). The `backbutton` event listener lets us intercept the hardware back press and handle it in priority order — closing overlays first, then navigating back, then exiting.

---

## Problem 3: Make responsive for all mobiles (auto margins)

### Why it happens
The app uses fixed padding values like `padding: '1rem 0.95rem'` and `paddingBottom: '8rem'` that don't account for different screen sizes, notches, or safe areas. On phones with notches or rounded screens, content can overlap the status bar or bottom navigation.

### What to change

**File: `src/TravelBae.jsx`**

**Line ~226** — The `S.page` style:
```jsx
// CURRENT:
page: { padding: '1rem 0.95rem', paddingBottom: '8rem' },

// CHANGE TO:
page: { padding: '1rem max(0.95rem, env(safe-area-inset-left, 0px))', paddingBottom: 'calc(8rem + env(safe-area-inset-bottom, 0px))' },
```

**Why:** 
- `max(0.95rem, env(safe-area-inset-left))` ensures left padding is at least 0.95rem but expands on phones with curved edges (like iPhone landscape)
- `calc(8rem + env(safe-area-inset-bottom))` adds extra bottom padding for phones with home indicators or gesture bars

**Line ~224** — The `S.topBar` style — add safe-area top padding:
```jsx
// CURRENT:
topBar: { background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '12px 1.25rem', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', top: 'auto', zIndex: 300, boxShadow: '0 1px 0 rgba(0,0,0,0.04)' },

// CHANGE TO:
topBar: { background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: 'calc(12px + env(safe-area-inset-top, 0px)) max(1.25rem, env(safe-area-inset-left, 0px)) 12px max(1.25rem, env(safe-area-inset-right, 0px))', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', top: 'auto', zIndex: 300, boxShadow: '0 1px 0 rgba(0,0,0,0.04)' },
```

**Why:** The top bar now respects `safe-area-inset-top` (notch), `safe-area-inset-left/right` (landscape rounded corners). This prevents the header from being hidden under the status bar on any phone.

**Line ~1052** — The bottom nav bar already has `paddingBottom:'env(safe-area-inset-bottom, 12px)'` — this is correct, no change needed.

**File: `src/index.css`** — Add safe-area CSS variables to `:root` (if not already present):
```css
:root {
  --tb-safe-top: env(safe-area-inset-top, 0px);
  --tb-safe-bottom: env(safe-area-inset-bottom, 0px);
  --tb-safe-left: env(safe-area-inset-left, 0px);
  --tb-safe-right: env(safe-area-inset-right, 0px);
}
```

**Why:** These CSS custom properties can be reused across all components for consistent safe-area handling.

---

## Summary of all changes

| # | File | Line(s) | Change |
|---|------|---------|--------|
| 1 | `src/features/home/CreateTripWizard.jsx` | ~155 | Add `calc(env(safe-area-inset-top) + 4rem)` top padding to overlay |
| 2 | `src/TravelBae.jsx` | ~3 | Add `import { App as CapacitorApp } from '@capacitor/app'` |
| 2 | `src/TravelBae.jsx` | After ~660 | Add `useEffect` with `backbutton` listener |
| 3 | `src/TravelBae.jsx` | ~226 | Update `S.page` padding to use `env()` safe areas |
| 3 | `src/TravelBae.jsx` | ~224 | Update `S.topBar` padding to use `env()` safe areas |
| 3 | `src/index.css` | `:root` | Add safe-area CSS custom properties |

## After applying changes
```bash
npx vite build && npx cap sync android