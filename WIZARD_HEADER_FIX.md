

# CreateTripWizard Header Overlap — Root Cause & Fix

## Root Cause

The `CreateTripWizard` overlay in `src/features/home/CreateTripWizard.jsx` uses:

```jsx
style={{ position:'fixed', inset:0, zIndex:1000, ..., display:'flex', alignItems:'center', justifyContent:'center', padding:'calc(env(safe-area-inset-top, 0px) + 4rem) 0.75rem 0.75rem' }}
```

The wizard card inside has:
```jsx
style={{ width:'100%', maxWidth:460, height:'min(660px, 94svh)', background:'#fff', bor
derRadius:28, overflow:'hidden', display:'flex', flexDirection:'column', ... }}
```

### The Problem
- The card has `height: min(660px, 94svh)` — on a typical phone (e.g., 800px viewport), this is 660px
- `alignItems: 'center'` vertically centers the card in the viewport
- A centered 660px card in an 800px viewport starts at `(800-660)/2 = 70px` from the top
- The app's top bar is ~60-70px tall
- Result: the card's top portion (header with "Step 1 of 7" + Lumi icon + progress dots) is hidden behind the top bar

### The Fix
Change the overlay to use `alignItems: 'flex-end'` instead of `'center'`. This makes the wizard a **bottom sheet** that slides up from the bottom of the screen, with its top clearly below the status bar + header. This is the standard mobile pattern for modals/sheets.

### Exact Code Change

**File: `src/features/home/CreateTripWizard.jsx`**

**Line 155** — Change:
```jsx
// CURRENT:
style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'calc(env(safe-area-inset-top, 0px) + 4rem) 0.75rem 0.75rem' }}

// CHANGE TO:
style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(8px)', display:'flex', alignItems:'flex-end', justifyContent:'center', paddingTop:'calc(env(safe-area-inset-top, 0px) + 4rem)', padding:'calc(env(safe-area-inset-top, 0px) + 4rem) 0 0' }}
```

**Why this works:**
- `alignItems: 'flex-end'` pushes the card to the BOTTOM of the viewport (bottom sheet pattern)
- The card's top is now well below the top bar
- `paddingTop` still accounts for notch/status bar + top bar height
- On small phones the card fills from just below the header to the bottom
- The dark overlay behind the card is still visible above the card, dimming the header content naturally

**Also change the card height** to account for the new positioning:
- Keep `height: 'min(660px, 94svh)'` — this is fine since it's a bottom sheet now, the top will be visible above it

**Also adjust card border-radius** to look like a proper bottom sheet:
```jsx
// CURRENT:
borderRadius:28

// CHANGE TO:
borderRadius:'28px 28px 0 0'  // top corners rounded, bottom corners square
```

### Expected Result
After the fix:
- The wizard opens as a bottom sheet
- The card's header (Step 1 of 7, Lumi, progress dots) is clearly visible at the top of the card
- The card sits below the app's top bar
- The dark overlay covers the area above the card, dimming the header content