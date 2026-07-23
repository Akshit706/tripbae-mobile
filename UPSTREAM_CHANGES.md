# Upstream Changes — 156 commits behind `origin/main`

> Reference document for applying all changes from GitHub to the local mobile app.
> Commit range: `HEAD` (5ac0a99) → `origin/main` (b8e964c)

---

## Table of Contents

1. [New Assets (Images)](#1-new-assets-images)
2. [Modified Assets](#2-modified-assets)
3. [src/TravelBae.jsx — Core App](#3-srctravelbaejsx--core-app)
4. [src/api.js — Changes](#4-srcapijs--changes)
5. [src/index.css — Changes](#5-srcindexcss--changes)
6. [src/features/shared/styles.js — Style Updates](#6-srcfeaturessharedstylesjs--style-updates)
7. [src/features/home/HomePage.jsx — Trip Listing Overhaul](#7-srcfeatureshomehomepagejsx--trip-listing-overhaul)
8. [src/features/home/CreateTripWizard.jsx — Redesigned Wizard](#8-srcfeatureshomecreatetripwizardjsx--redesigned-wizard)
9. [src/features/home/ShareCodeModal.jsx — Redesigned Modal](#9-srcfeatureshomesharecodemodaljsx--redesigned-modal)
10. [src/features/itinerary/ItineraryPage.jsx — Major Rewrite](#10-srcfeaturesitineraryitinerarypagejsx--major-rewrite)
11. [NEW: src/features/itinerary/ExperienceDiscovery.jsx](#11-new-srcfeaturesitineraryexperiencediscoveryjsx)
12. [src/features/itinerary/RecommendationsPage.jsx](#12-srcfeaturesitineraryrecommendationspagejsx)
13. [src/features/profile/ProfilePage.jsx — Orange Rebrand + Lumi](#13-srcfeaturesprofileprofilepagejsx--orange-rebrand--lumi)
14. [src/features/profile/UserProfileWizard.jsx — Major Redesign](#14-srcfeaturesprofileuserprofilewizardjsx--major-redesign)
15. [src/features/profile/UserProfileWizard.jsx.bak — New file](#15-srcfeaturesprofileuserprofilewizardjsxbak--new-file)
16. [src/features/club/ClubPage.jsx — Lumi Intro + T&C Gate](#16-srcfeaturesclubclubpagejsx--lumi-intro--tc-gate)
17. [src/features/contacts/ContactsPage.jsx — Orange Rebrand](#17-srcfeaturescontactscontactspagejsx--orange-rebrand)
18. [src/features/solo/SoloExpensesPage.jsx — Orange Rebrand](#18-srcfeaturessolosoloexpensespagejsx--orange-rebrand)
19. [src/features/split/SplitPage.jsx — Major Rewrite](#19-srcfeaturessplitsplitpagejsx--major-rewrite)
20. [src/features/photos/PhotosPage.jsx — Orange Theme](#20-srcfeaturesphotosphotospagejsx--orange-theme)
21. [src/features/media/PlaceMedia.jsx — Photo Caching](#21-srcfeaturesmediaplacemediajsx--photo-caching)

---

## 1. New Assets (Images)

All go in `src/assets/`. These are referenced by the new code.

```
src/assets/Lumi4_bgless.png       — Lumi character (used in auth, home, club, etc.)
src/assets/bgless1.png            — Logo variant
src/assets/lumi10.png             — Lumi for itinerary
src/assets/lumi11.png             — Lumi
src/assets/lumi12.png             — Lumi
src/assets/lumi13.png             — Lumi
src/assets/lumi14.png             — Lumi
src/assets/lumi15.png             — Lumi for itinerary intro
src/assets/lumi16.png             — Lumi for club
src/assets/lumi17.png             — Lumi for club/contacts
src/assets/lumi18.png             — Lumi for photos
src/assets/lumi19.png             — Lumi
src/assets/lumi20.png             — Lumi
src/assets/lumi21.png             — Lumi (NEW — not in original asset list)
src/assets/lumi5_bgless.png       — Lumi (full body, no bg)
src/assets/lumi7.png              — Lumi
src/assets/lumi8.png              — Lumi
src/assets/lumi9.png              — Lumi
src/assets/lumi_mood1.png         — Mood illustration
src/assets/lumi_mood2.png         — Mood illustration
src/assets/lumi_mood3.png         — Mood illustration
src/assets/lumi_mood4.png         — Mood illustration
src/assets/lumi_mood5.png         — Mood illustration
src/assets/lumi_mood6.png         — Mood illustration
src/assets/mountain.png           — Home hero decoration
src/assets/photos.png             — Photos hero image
src/assets/bgless_club.png        — Club logo variant
```

## 2. Modified Assets

| File | Change |
|------|--------|
| `src/assets/bgless.png` | **Modified** (binary change) — the existing logo asset was updated |

---

## 3. src/TravelBae.jsx — Core App

### Imports
- **ADD** `import bglessClubLogo from './assets/bgless_club.png';`

### Style Constants (`const S = { ... }`)
| Key | Old Value | New Value |
|-----|-----------|-----------|
| `topBar.zIndex` | `1` | `300` |
| `navTabActive.color` | `'#0F6E56'` | `'#043D28'` |
| `navTabActive.background` | `'linear-gradient(135deg,#E6FFF4,#F2FFFA)'` | `'rgba(255,255,255,0.96)'` |
| `navTabActive.border` | `'1px solid rgba(29,158,117,0.32)'` | `'1px solid rgba(4,61,40,0.22)'` |
| `soloNavTabActive.color` | `'#534AB7'` | `'#FF6A00'` |
| `soloNavTabActive.background` | `'linear-gradient(135deg,#F0EDFF,#F7F3FF)'` | `'linear-gradient(135deg,#FFF3EB,#FFF0E6)'` |
| `soloNavTabActive.border` | `'1px solid rgba(127,119,221,0.3)'` | `'1px solid rgba(255,106,0,0.3)'` |
| `btnSolo.background` | `'linear-gradient(135deg,#7F77DD,#534AB7)'` | `'linear-gradient(135deg,#FF6A00,#FF8C3A)'` |
| `soloSpinner.borderTopColor` | `'#7F77DD'` | `'#FF6A00'` |
| `soloSpinner.border` | `'3px solid #EEEDFE'` | `'3px solid #FFF3EB'` |

### State Changes
```js
// ADD: password visibility toggle
const [lgShowPw, setLgShowPw] = useState(false);

// CHANGED: activeTrip initializer — persists across refresh
const [activeTrip, setActiveTrip] = useState(() => {
  if (!localStorage.getItem('travelbae_token')) return null;
  return sessionStorage.getItem('tb_active_trip') || null;
});

// CHANGED: tab initializer — persists across refresh
const [tab, setTab] = useState(() => {
  if (!localStorage.getItem('travelbae_token')) return 'main';
  return sessionStorage.getItem('tb_active_tab') || 'main';
});
```

### New useEffect Hooks (Add after `setProfile` helper)
```js
// Persist active trip across refreshes
useEffect(() => {
  if (activeTrip) sessionStorage.setItem('tb_active_trip', activeTrip);
  else sessionStorage.removeItem('tb_active_trip');
}, [activeTrip]);

// Persist active tab across refreshes
useEffect(() => {
  sessionStorage.setItem('tb_active_tab', tab);
}, [tab]);
```

### Trip Loading — Add validation (inside trips useEffect, after `setTrips(merged)`)
```js
// Validate restored trip ID still exists
const savedTripId = sessionStorage.getItem('tb_active_trip');
if (savedTripId && !merged.find(t => t.id === savedTripId)) {
  setActiveTrip(null);
  sessionStorage.removeItem('tb_active_trip');
}
```

### Profile Loading — Add photo sync
```js
// After setUserProfile(up), add:
if (up.photoUrl) {
  setProfile(prev => {
    if (prev?.avatar === up.photoUrl) return prev;
    const next = { ...prev, avatar: up.photoUrl };
    try { localStorage.setItem('travelbae_profile', JSON.stringify(next)); } catch (_) {}
    return next;
  });
}
```

### handleLogout — Add sessionStorage cleanup
```js
// Add to handleLogout:
sessionStorage.removeItem('tb_active_trip');
sessionStorage.removeItem('tb_active_tab');
```

### handleDeleteAccount — Add sessionStorage cleanup
```js
// Add to handleDeleteAccount:
sessionStorage.removeItem('tb_active_trip');
sessionStorage.removeItem('tb_active_tab');
```

### handleTripClick — Removed background itinerary generation (now only pre-fetches local taste)
```js
// BEFORE (remove — old code that generated both itinerary + local taste):
import('./api').then(async ({ generateItinerary, generateLocalTaste }) => {
  const days = trip.arrival && trip.departure
    ? Math.max(1, Math.round((new Date(trip.departure) - new Date(trip.arrival)) / 86400000))
    : 1;
  const SLOT_ORDER = ['morning', 'afternoon', 'evening'];
  const arrivalIdx = SLOT_ORDER.indexOf(trip.arrivalSlot || 'morning');
  const firstSlot = SLOT_ORDER[Math.min(arrivalIdx + 1, SLOT_ORDER.length - 1)];
  try {
    const [itinResult, tasteResult] = await Promise.all([
      generateItinerary({ ... }),
      generateLocalTaste({ destination: trip.destination }),
    ]);
    setTrips(ts => ts.map(t => t.id === trip.id
      ? { ...t, _cachedItin: itinResult, _cachedTaste: tasteResult }
      : t
    ));
    const cache = readAiCache();
    cache[trip.id] = { ...(cache[trip.id] || {}), _cachedItin: itinResult, _cachedTaste: tasteResult };
    writeAiCache(cache);
    saveAiCache(trip.id, { cachedItinerary: itinResult, cachedTaste: tasteResult })
      .catch(e => console.warn('AI cache DB save failed:', e.message));
  } catch (e) {
    console.warn('Background itinerary generation failed:', e);
  }
});

// AFTER (replace with — only generates local taste, no itinerary):
import('./api').then(async ({ generateLocalTaste }) => {
  try {
    const tasteResult = await generateLocalTaste({ destination: trip.destination });
    setTrips(ts => ts.map(t => t.id === trip.id
      ? { ...t, _cachedTaste: tasteResult }
      : t
    ));
    const cache = readAiCache();
    cache[trip.id] = { ...(cache[trip.id] || {}), _cachedTaste: tasteResult };
    writeAiCache(cache);
    saveAiCache(trip.id, { cachedTaste: tasteResult })
      .catch(e => console.warn('Taste cache DB save failed:', e.message));
  } catch (e) {
    console.warn('Background taste generation failed:', e);
  }
});
```

### Tab Icons
- **Change `expenses` icon SVG** from currency bill (`<line x1="12" y1="1" x2="12" y2="23"/>...`) → wallet card with circle (`<rect x="2" y="6" width="20" height="12" rx="2"/>...`)

### Auth Screen — Complete Redesign
Replace the entire `if (!authToken) return (...)` block with:

- **Background**: Dark green gradient → pure white with floating travel SVG decorations (passport stamp, luggage tag, airplane, world map)
- **Logo**: Sora font icon → PNG image (`bgless.png`) 160px wide
- **Tagline**: Orange `#FF6A00` "Plan the perfect trip" title, gray subtext
- **Card**: Dark glassmorphism → white card with shadow
- **Fields**: Staggered fade-in animation, orange focus border, email/password icons in orange, **password show/hide toggle** (eye icon on right)
- **Extras**: "Remember me" checkbox + "Forgot password" link row
- **Primary button**: Green gradient → orange gradient with arrow animation
- **Signup/Login toggle**: Segmented control → footer link text "Don't have an account? Sign Up"
- **OTP flow**: Kept but restyled with white theme
- **Social buttons**: Google/Apple with text → icon-only rounded buttons
- **CSS**: Complete rewrite — all `.lg-*` classes replaced

---

## 4. src/api.js — Changes

### 4a. `generateItinerary` — Cache key updated
```js
// OLD:
const key = `itin:${data.destination}:${data.days}:${data.budget}:${data.people}:${(data.interests || []).join(',')}:${data.arrivalSlot}:${data.departureSlot}`;

// NEW — adds selected experiences count to cache key:
const expKey = (data.selectedExperiences || []).length;
const key = `itin:${data.destination}:${data.days}:${data.budget}:${data.people}:${(data.interests || []).join(',')}:${data.arrivalSlot}:${data.departureSlot}:sel${expKey}`;
```

### 4b. New function: `fetchExperiences`
```js
export const fetchExperiences = (data) =>
  apiFetch('/ai/experiences', { method: 'POST', body: data });
```
> ⚠️ **Note**: This uses POST with a body object, NOT GET with URL params. The parameter is a single `data` object, not separate `(destination, category)`.

---

## 5. src/index.css — Changes

### 5a. CSS custom properties added (in `:root`)
```css
--tb-safe-bottom: env(safe-area-inset-bottom, 0px);
--tb-z-base: 1;
--tb-z-topbar: 300;
--tb-z-nav: 290;
--tb-z-menu: 420;
```

### 5b. `.tb-topbar-glass` z-index change
```css
/* OLD */
.tb-topbar-glass { z-index: 1; }

/* NEW */
.tb-topbar-glass { z-index: var(--tb-z-topbar); }
```
> ⚠️ This is a z-index refactor using CSS custom properties — **not** a `tbWiggle` keyframe animation.

---

## 6. src/features/shared/styles.js — Style Updates

- **`btnSolo`**: `'linear-gradient(135deg,#7F77DD,#534AB7)'` → `'linear-gradient(135deg,#FF6A00,#FF8C3A)'`
- **`soloSpinner`**: `'3px solid #EEEDFE'` + `borderTopColor: '#7F77DD'` → `'3px solid #FFF3EB'` + `borderTopColor: '#FF6A00'`

---

## 7. src/features/home/HomePage.jsx — Trip Listing Overhaul

### Imports
- **ADD**: `lumi4Img` from assets, `mountainImg` from assets
- **REMOVE**: `HERO_TAGLINES` array constant

### New Constants
```js
// 30 trivia-style entries replacing HERO_TAGLINES
const FUN_TRIVIA = [
  { t: "✈️ Hidden Gems", s: "Discover secret spots even locals don't know about" },
  { t: "🏔️ Mountain Escapes", s: "Breathtaking views that'll make your heart sing" },
  // ... 28 more entries
];
```

### State Changes
- **REMOVE**: `heroTaglineIdx`, `typingLine`, `charIdx`, `heroInterval`
- **ADD**: `triviaIdx` (number) — current trivia card index
- **ADD**: `showFilters` (boolean) — toggle filter/sort dropdown
- **ADD**: `sortBy` → `'budget' | 'days' | 'name' | 'recent'` (default `'recent'`)
- **ADD**: `dateFilter` → `'all' | '6months' | '1year' | 'future'` (default `'all'`)

### Hero Section Changes
- **REMOVE**: Auto-rotating typewriter hero taglines
- **REPLACE WITH**: Static hero with `mountainImg` background decoration, card-style action buttons:
  - "✨ Create New Trip" (orange primary)
  - "🔗 Join with Code"
  - Random trivia card with Lumi avatar + "Next Fact →" button

### TripCard Component Changes
- **ADD**: Progress bar showing budget consumption (spent/total)
- **ADD**: Share code pill (bottom-right)
- **ADD**: Animated Lumi decoration on first trip card
- **CHANGE**: Status badge colors — ongoing uses orange `#FF6A00` bg

### Sort/Filter Controls
- Sort dropdown: budget / days / name / recent
- Filter dropdown: All time / Last 6 months / Last year / Future trips
- Rendered above trip cards with proper z-index (210+ on overlay, buttons container gets zIndex)

### Empty State
- **REPLACE**: Plain text → Lumi character image + "No trips yet! Tap above to create one."

---

## 8. src/features/home/CreateTripWizard.jsx — Redesigned Wizard

### Imports
- **ADD**: `lumi4Img` from assets
- **REMOVE**: Shared styles import (`styles.js`)

### State
- **ADD**: `showLumiStep` (boolean) — Lumi introduction at start
- **CHANGE**: `CREATE_TRIP_STEPS` constant — 7 steps renamed:
  1. "Let's Plan Your Adventure!" → Step 0 (Lumi intro)
  2. "Where to?" → Destination
  3. "When are you going?" → Dates
  4. "Who's coming?" → People
  5. "What's the vibe?" → Budget
  6. "Your arrival" → Arrival/Departure slots
  7. "Trip name" → Review

### LumiStep Component (New)
```jsx
function LumiStep({ onNext }) {
  return (
    <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
      <img src={lumi4Img} alt="Lumi" style={{ width: 180, borderRadius: 16, marginBottom: 16 }} />
      <h3 style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, color: '#FF6A00' }}>
        Hey there! 👋
      </h3>
      <p style={{ color: '#6B7280', margin: '8px 0 20px' }}>
        I'm Lumi, your travel buddy! Let's plan an amazing trip together.
      </p>
      <button onClick={onNext} style={{ /* orange gradient button */ }}>
        Let's Go! ✨
      </button>
    </div>
  );
}
```

### Step Components
- **All steps redesigned**: Orange accent color (`#FF6A00`), conversational Lumi UI
- **Progress**: Orange progress dots (stepper) replacing bar
- **Dates step**: Calendar inputs with orange focus
- **Budget step**: Quick-select buttons (Budget / Comfort / Luxury) + slider
- **Arrival slot**: Toggle between Morning / Afternoon / Evening with orange selected state
- **Review step**: Editable summary before submission
- **Auto-advance**: Conditional — if only one option available for a step, advance automatically

---

## 9. src/features/home/ShareCodeModal.jsx — Redesigned Modal

- **Title**: Lumi character (small, 40px) beside "Share Trip Code"
- **Share code box**: Orange-themed background and border
- **Copy button**: Orange gradient, "Copy Code ✨" text
- **REMOVE**: Emoji display row
- **Colors**: Purple/green → orange `#FF6A00`

---

## 10. src/features/itinerary/ItineraryPage.jsx — Major Rewrite

### Imports (Add all)
```js
import lumi15Img from '../../assets/lumi15.png';
import lumi17Img from '../../assets/lumi17.png';
import lumi4Img from '../../assets/lumi4_bgless.png';
import lumi10Img from '../../assets/lumi10.png';
import lumi19Img from '../../assets/lumi19.png';
import { fetchExperiences } from '../../api';
import ExperienceDiscovery from './ExperienceDiscovery';
```

### Constants Added
```js
// Category color map
const EXP_CAT = {
  Attractions:    { bg: '#FFF3EB', color: '#FF6A00', emoji: '🏛️' },
  Food:           { bg: '#FFF7ED', color: '#F97316', emoji: '🍽️' },
  Cafes:          { bg: '#FEF3C7', color: '#D97706', emoji: '☕' },
  'Hidden Gems':  { bg: '#F0FDF4', color: '#16A34A', emoji: '💎' },
  Adventure:      { bg: '#FEF2F2', color: '#DC2626', emoji: '🧗' },
  Shopping:       { bg: '#FDF4FF', color: '#C026D3', emoji: '🛍️' },
  Nightlife:      { bg: '#F5F3FF', color: '#7C3AED', emoji: '🌙' },
  Culture:        { bg: '#FFF1F2', color: '#E11D48', emoji: '🎭' },
  Viewpoints:     { bg: '#ECFEFF', color: '#0891B2', emoji: '🏔️' },
  'Local Experiences': { bg: '#FFF3EB', color: '#EA580C', emoji: '🌟' },
  Party:          { bg: '#FDF2F8', color: '#DB2777', emoji: '🎉' },
};

// Category SVG icon renderer
function renderExpCatIcon(category, size = 20, color = '#6B7280') { /* returns SVG */ }
```

### localStorage Helpers (Add all)
```js
const _selExpsKey = (tripId) => `tb_sel_exps_${tripId}`;
const _itinDoneKey = (tripId) => `tb_itin_done_${tripId}`;

function loadSelExps(tripId) {
  try { return JSON.parse(localStorage.getItem(_selExpsKey(tripId)) || '[]'); }
  catch { return []; }
}
function saveSelExps(tripId, exps) {
  localStorage.setItem(_selExpsKey(tripId), JSON.stringify(exps));
}
function isItinDone(tripId) { return localStorage.getItem(_itinDoneKey(tripId)) === '1'; }
function markItinDone(tripId) { localStorage.setItem(_itinDoneKey(tripId), '1'); }
function clearItinDone(tripId) { localStorage.removeItem(_itinDoneKey(tripId)); }
```

### Component Structure Changes
Old itinerary sub-tabs:
```
Tabs: Itinerary | Recommendations | Local Life
```

New itinerary sub-tabs:
```
Tabs: Day Planner | Itinerary | Nearby
- Day Planner: Shows ExperienceDiscovery component (swipe cards) + selected experiences sheet
- Itinerary: Accordion-style day-by-day itinerary with trip header card, checkbox activities, tips
- Nearby: Location-based recommendations
```

### New: Lumi Intro Step
```jsx
// When trip is clicked and intro not seen, show Lumi overlay:
function LumiItinIntro({ onDone }) {
  return (
    <div style={{ /* full-screen overlay */ }}>
      <img src={lumi15Img} />
      <h2>Your Perfect Itinerary Awaits!</h2>
      <p>Swipe through experiences, pick your favorites, and Lumi will build your day-by-day plan.</p>
      <button onClick={onDone} style={{ /* orange gradient */ }}>Let's Explore ✨</button>
    </div>
  );
}
```

### Key Logic Changes
- **Tab state**: `'planner' | 'itinerary' | 'nearby'` replacing old 3-tab system
- **Day Planner tab**: Shows `ExperienceDiscovery` if no itinerary built yet, or saved experiences list
- **Itinerary tab**: Accordion days with orange headers, trip summary card at top, checkboxes on activity cards (right-aligned), SVG tips icons
- **Nearby tab**: Shows nearby recommendations or empty state if no itinerary
- **Current day glow**: Current day gets a subtle orange glow/ring
- **HeadsUp hints**: Yellow/orange tip cards with bulb icon
- **Theme**: Full orange-only theme (was green/brown)

---

## 11. NEW: src/features/itinerary/ExperienceDiscovery.jsx

Create new file with the following structure:

### Exports
```js
export default function ExperienceDiscovery({ trip, onComplete, onSkip });
```

### State
```js
const [experiences, setExperiences] = useState([]);
const [currentIdx, setCurrentIdx] = useState(0);
const [category, setCategory] = useState('');
const [loading, setLoading] = useState(true);
const [selections, setSelections] = useState([]);
const [completed, setCompleted] = useState(false);
```

### Behavior
- **Swipe-based card UI** (Bumble/Tinder style):
  - Swipe right = like/save experience
  - Swipe left = skip
  - Tap = expand details
- **Auto-advance categories**: When a category is exhausted, auto-load next category
- **No-repeat**: Track seen experience IDs to prevent duplicates
- **Persistence**: Save swipe progress to localStorage per trip (survives tab switches)
- **Lumi empty state**: When no more experiences to show
- **Complete/Skip buttons**: Header buttons to finish or skip entirely
- **3-photo carousel**: Each experience card shows up to 3 photos
- **Direction-lock gesture**: Only horizontal swipes, no vertical interference
- **Tier badge**: Shows "Premium" / "Popular" / "Hidden Gem" badges on cards

### Key Functions
```js
function handleSwipeRight(exp) { // Save to selections
  const updated = [...selections, exp.id];
  setSelections(updated);
  saveSelExps(trip.id, updated);
  advanceCard();
}

function handleSwipeLeft() { advanceCard(); }

function advanceCard() {
  if (currentIdx >= experiences.length - 1) loadNextCategory();
  else setCurrentIdx(i => i + 1);
}

function loadNextCategory() { /* fetch next category via fetchExperiences */ }
```

---

## 12. src/features/itinerary/RecommendationsPage.jsx

### Changes
- **Tab restructure**: Previously had "Recommendations" tab — now split into Day Planner / Itinerary / Nearby (all handled in ItineraryPage.jsx)
- **Error state**: Show error message if experience fetch fails (instead of loading forever)
- **Empty states**: Show message instead of blank screen in Nearby sections
- **Tab buttons**: Always visible even when content is loading/empty

---

## 13. src/features/profile/ProfilePage.jsx — Orange Rebrand + Lumi

### Imports
- **ADD**: `lumi4Img`, `lumi17Img`, `lumi19Img` from assets
- **ADD**: `bglessClubLogo` from assets

### State Changes
- **ADD**: `showIntro` (boolean) — Lumi intro popup visibility
- **ADD**: `introStep` (0|1) — for multi-step intro
- **ADD**: `showConfirmDelete` (boolean) — account deletion confirmation

### Color Changes
- All purple (`#7F77DD`, `#534AB7`) → orange (`#FF6A00`, `#FF8C3A`)
- All green (`#1D9E75`, `#0F6E56`) → orange

### Component Changes
- **Header**: User avatar + name, email, member since date. If no avatar, show initials in orange circle
- **Stats section**: Trips taken, countries visited, days traveled — orange-themed stat cards
- **Settings**: Notification toggle, currency preference, theme toggle — all orange accent
- **Support section**: FAQ, Contact Us, Report a Bug — with orange icons
- **Lumi Intro**: ⓘ info button on header that opens Lumi intro popup (side-by-side orange/white design)
- **Delete Account**: Confirmation dialog before deletion
- **Logout**: Orange button at bottom

---

## 14. src/features/profile/UserProfileWizard.jsx — Major Redesign

### Imports
- **ADD**: `Fragment` from React, `imagekitAuth` from api
- **ADD**: `lumiImg` from assets (`Lumi4_bgless.png`)

### Color Changes
- All purple → orange theme (accent color `#FF6A00`)
- All green → orange theme

### Component Changes
- **Avatar upload**: Circular with orange border, camera icon overlay, uses ImageKit auth
- **Name input**: Orange focus border
- **Bio textarea**: Orange focus border
- **Interests picker**: Orange selected state chips
- **Home airport**: Auto-complete input with orange accent
- **Travel style**: Quick-select cards (Backpacker / Comfort / Luxury / Adventure / Cultural)
- **Save button**: Orange gradient
- **Step counter**: Orange dots
- **Step metadata**: Each step now has `title` + `sub` (subtitle) fields with conversational Lumi-style text
- **Complete rewrite**: Full restructure with Lumi character, step-by-step conversational flow

### Lumi Intro
- Add ⓘ button to reopen Lumi intro
- Side-by-side layout with Lumi character on left, text on right

---

## 15. src/features/profile/UserProfileWizard.jsx.bak — New file

A backup of the old UserProfileWizard before the rewrite was committed.

---

## 16. src/features/club/ClubPage.jsx — Lumi Intro + T&C Gate

### Imports
- **ADD**: `lumi17Img` from assets

### State Changes
```js
// REPLACE:
const [showClubTerms, setShowClubTerms] = useState(true);
const [termsChecked, setTermsChecked] = useState(false);

// WITH:
const CLUB_INTRO_KEY = 'travelbae_club_intro_${trip.id}';
const [showClubGate, setShowClubGate] = useState(true);
const [clubGateStep, setClubGateStep] = useState(0); // 0 = intro, 1 = T&C
const [termsChecked, setTermsChecked] = useState(() => localStorage.getItem('CLUB_TERMS_KEY') === '1');
const [clubInfoOnly, setClubInfoOnly] = useState(false);
```

### New Functions
```js
function advanceClubGate() {
  if (clubInfoOnly) { dismissClubGate(); return; }
  setClubGateStep(1);
}

function dismissClubGate() {
  setShowClubGate(false);
  if (clubGateStep === 0) localStorage.setItem(CLUB_INTRO_KEY, '1');
}
```

### Lumi Intro Slide (clubGateStep === 0)
```jsx
// Show Lumi character image, welcome text, "Next →" button
// If clubInfoOnly, show "Got it!" button that dismisses
```

### T&C Slide (clubGateStep === 1)
```jsx
// Same as old but with orange theme
// Checkbox + "Accept & Join" button
```

### Content Tabs
- **Clubs**: List of club chat rooms with orange active indicator
- **Members**: Member list with online status (orange dot)
- **Chat**: Message bubbles, send button in orange

---

## 17. src/features/contacts/ContactsPage.jsx — Orange Rebrand

### Imports
- **ADD**: `lumi17Img` from assets

### Color Changes
- Purple/green → orange `#FF6A00`
- Add ⓘ button for Lumi intro popup

### Component Changes
- **Contact list**: Orange avatar borders, online indicators in orange
- **Invite button**: Orange gradient
- **Search bar**: Orange focus border
- **Lumi Intro**: Popup overlay with Lumi character, explaining feature

---

## 18. src/features/solo/SoloExpensesPage.jsx — Orange Rebrand

### Color Changes
- All purple (`#7F77DD`, `#534AB7`) → orange (`#FF6A00`, `#FF8C3A`)
- Replace `soloSpinner`, `soloNavTabActive` colors

### Component Changes
- **Header**: Orange back button, "Solo Expenses" title
- **Expense list**: Orange swipe-to-delete, orange category badges
- **Add expense**: Orange CTA button, orange-themed form fields
- **Totals**: Orange accent on total amounts
- **Filters**: Orange selected state on category filter pills

---

## 19. src/features/split/SplitPage.jsx — Major Rewrite

### Imports
- **ADD**: `lumi4Img`, `lumi17Img`, `lumi19Img` from assets

### Color Changes
- All green (`#1D9E75`, `#0F6E56`) → orange (`#FF6A00`, `#FF8C3A`)
- Member share colors: Green → Orange tones

### Component Changes
- **Header**: Trip name + "Split Expenses" subtitle with Lumi avatar
- **Summary bar**: Total spent, orange progress ring
- **Expense list**: Each expense shows:
  - Paid by avatar + name
  - Amount (orange for totals)
  - Split breakdown per member
  - Category icon (orange)
- **Add expense**: Bottom sheet with orange accent, member selector with avatars
- **Settlement**: "Settle Up" section showing who owes whom, with orange "Pay" buttons
- **Member list**: Avatar circles with orange borders, balance indicators (green = positive, red = negative)
- **Lumi Intro**: Info button + popup explaining split feature

### Data Flow
```js
// Trip members and expenses loaded from API
// Each expense: { id, paidBy, amount, description, category, splitBetween: [{ memberId, share }] }
// Settlements calculated as: net = sum(paid) - sum(share)
```

---

## 20. src/features/photos/PhotosPage.jsx — Orange Theme

### Imports
- **ADD**: `photosImg`, `lumi18Img` from assets
- **ADD**: `lumi17Img` from assets

### Color Changes
- All green/purple → orange `#FF6A00`

### Component Changes
- **Hero section**: `photos.png` as hero background with zoom + orbit animation
- **Tab bar**: Photos / Memories / Shared — orange active indicator
- **Photo grid**: 3-column grid with orange border on selection, lazy load
- **Photo viewer**: Full-screen with orange close button, swipe navigation
- **Upload button**: Orange gradient FAB
- **Album selector**: Horizontal scroll with orange active pill
- **Lumi Intro**: Info button + Lumi popup explaining photo features
- **Empty state**: Lumi character + "No photos yet" message

### Photo Caching
- Uses the caching from PlaceMedia.jsx (see below)

---

## 21. src/features/media/PlaceMedia.jsx — Photo Caching

### New Constants
```js
const _LS_PREFIX = 'tb_ph_';
const _LS_TTL = 10 * 24 * 60 * 60 * 1000; // 10 days
```

### New Functions
```js
function _lsSave(query, urls) {
  const data = { u: urls, e: Date.now() + _LS_TTL };
  try { localStorage.setItem(`${_LS_PREFIX}${query}`, JSON.stringify(data)); } catch {}
}

function _lsPreload() {
  // On module load: iterate localStorage keys matching prefix
  // Parse stored data, remove expired entries
  // Pre-populate _photoListCache and _photoCache
}
```

### Logic Changes
- `fetchCached(query)`:
  - **OLD**: Extract only first photo URL, store in `_photoCache`, return it
  - **NEW**: Extract all unique URLs via `uniquePhotos()`, store full list in `_photoListCache`, store first in `_photoCache`, persist to localStorage
- `fetchCachedList(query, limit)`:
  - **NEW**: Returns cached list if available, otherwise fetches and caches

---

## New Assets Checklist

Before coding, ensure these image files exist in `src/assets/`:

- [ ] `Lumi4_bgless.png` — Lumi full-body (used in auth, home, club, profile, split)
- [ ] `bgless1.png` — Logo variant
- [ ] `gless_club.png` — Club logo variant
- [ ] `lumi10.png` — Itinerary hero
- [ ] `lumi11.png`
- [ ] `lumi12.png`
- [ ] `lumi13.png`
- [ ] `lumi14.png`
- [ ] `lumi15.png` — Itinerary intro popup
- [ ] `lumi16.png` — Club intro
- [ ] `lumi17.png` — Club/contacts/profile
- [ ] `lumi18.png` — Photos empty state
- [ ] `lumi19.png` — Split/profile
- [ ] `lumi20.png`
- [ ] `lumi21.png` — ⚠️ New — ADDED (was missing from original list)
- [ ] `lumi5_bgless.png`
- [ ] `lumi7.png`
- [ ] `lumi8.png`
- [ ] `lumi9.png`
- [ ] `lumi_mood1.png` through `lumi_mood6.png` — Mood illustrations
- [ ] `mountain.png` — Home hero decoration
- [ ] `photos.png` — Photos hero image

### Modified Assets (not new, but updated)

- [ ] `bgless.png` — Modified (binary change to existing file)

---

## Quick Reference: Color Replacements

| Role | Old Color | New Color |
|------|-----------|-----------|
| Solo/Orange primary | `#7F77DD` (purple) | `#FF6A00` (orange) |
| Solo/Orange gradient | `#534AB7` (dark purple) | `#FF8C3A` (light orange) |
| Solo/Orange light | `#EEEDFE` | `#FFF3EB` |
| Active tab (solo) | purple border/gradient | orange border/gradient |
| Primary green | `#1D9E75` | `#FF6A00` |
| Dark green | `#0F6E56` | `#043D28` |
| Green gradient | `#28B88A` → `#0F6E56` | `#FF6A00` → `#FF8C3A` |
| Club primary | `#1D9E75` | `#FF6A00` |
| Club gradient | green gradient | orange gradient |
| Club light | `#E6FFF4` | `#FFF3EB` |

---

## Summary of All Files Changed

| File | Lines Changed | Type |
|------|--------------|------|
| `src/TravelBae.jsx` | +774 / -388 | Major — auth redesign, session persistence, style rebrand |
| `src/api.js` | +6 / -1 | Minor — added `fetchExperiences` (POST), updated `generateItinerary` cache key |
| `src/index.css` | +variable defs / -1 | Minor — z-index refactor: `z-index: 1` → `z-index: var(--tb-z-topbar)`, new CSS custom properties |
| `src/features/shared/styles.js` | +2 / -2 | Minor — solo colors |
| `src/features/home/HomePage.jsx` | +576 / -268 | Major — hero, filters, sort, trip cards |
| `src/features/home/CreateTripWizard.jsx` | +442 / -264 | Major — Lumi wizard redesign |
| `src/features/home/ShareCodeModal.jsx` | +36 / -12 | Minor — orange theme |
| `src/features/itinerary/ItineraryPage.jsx` | +1547 / -1047 | Major rewrite |
| `src/features/itinerary/ExperienceDiscovery.jsx` | +984 (NEW) | New file — swipe-based experience discovery |
| `src/features/itinerary/RecommendationsPage.jsx` | +37 / -28 | Minor — error/empty states |
| `src/features/profile/ProfilePage.jsx` | +729 / -400 | Major — orange rebrand + Lumi |
| `src/features/profile/UserProfileWizard.jsx` | +736 / -410 | Major — orange redesign, Lumi conversational flow, ImageKit integration |
| `src/features/profile/UserProfileWizard.jsx.bak` | New | Backup of old wizard |
| `src/features/club/ClubPage.jsx` | +170 / -80 | Moderate — Lumi intro gate |
| `src/features/contacts/ContactsPage.jsx` | +80 / -40 | Moderate — orange + Lumi |
| `src/features/solo/SoloExpensesPage.jsx` | +447 / -260 | Major — orange rebrand |
| `src/features/split/SplitPage.jsx` | +770 / -520 | Major rewrite |
| `src/features/photos/PhotosPage.jsx` | +128 / -60 | Moderate — orange + caching |
| `src/features/media/PlaceMedia.jsx` | +42 / -8 | Moderate — localStorage caching |
| `src/assets/bgless.png` | Binary (modified) | Updated existing logo asset |
| **New assets** | 27 new image files | 26 listed above + lumi21.png |
| **Total** | **~6,500 lines changed** | |

---

## Commit-by-Commit Breakdown (156 commits, oldest → newest)

> Each commit maps to the section above where its changes are described in detail.

| # | Commit | Message | Files Changed | See Section |
|---|--------|---------|---------------|-------------|
| 1 | `9d273a0` | login | TravelBae.jsx | §3 (Auth screen redesign) |
| 2 | `1f4c4a6` | login | TravelBae.jsx | §3 (Auth screen redesign) |
| 3 | `3c00bcb` | login | TravelBae.jsx | §3 (Auth screen redesign) |
| 4 | `4546eda` | tripform | TravelBae.jsx, CreateTripWizard.jsx, HomePage.jsx | §3, §7, §8 |
| 5 | `0dd4eb0` | Createtrip | CreateTripWizard.jsx, HomePage.jsx | §7, §8 |
| 6 | `3a8d830` | trip | Lumi4_bgless.png, CreateTripWizard.jsx | §1, §8 (LumiStep added) |
| 7 | `d776860` | profile | UserProfileWizard.jsx, UserProfileWizard.jsx.bak | §14, §15 (backup created) |
| 8 | `a3f8267` | profile | UserProfileWizard.jsx | §14 |
| 9 | `f716634` | profile | UserProfileWizard.jsx | §14 |
| 10 | `941eb56` | profile | UserProfileWizard.jsx | §14 |
| 11 | `298f966` | profile | UserProfileWizard.jsx | §14 |
| 12 | `90c4fd2` | login | TravelBae.jsx | §3 |
| 13 | `abd03d2` | update | TravelBae.jsx, UserProfileWizard.jsx | §3, §14 |
| 14 | `046758b` | profile | UserProfileWizard.jsx | §14 |
| 15 | `d8bf8f9` | profile | ProfilePage.jsx, UserProfileWizard.jsx | §13, §14 |
| 16 | `f616362` | profile | ProfilePage.jsx | §13 |
| 17 | `d7e7e64` | home | TravelBae.jsx, lumi9.png, HomePage.jsx, ProfilePage.jsx | §1, §3, §7, §13 |
| 18 | `f4637a0` | create | lumi7.png, CreateTripWizard.jsx, HomePage.jsx | §1, §7, §8 |
| 19 | `fb6acd6` | create | lumi8.png, CreateTripWizard.jsx | §1, §8 |
| 20 | `c74ac7e` | push | CreateTripWizard.jsx | §8 |
| 21 | `dcaa1fe` | update | lumi10.png, HomePage.jsx, ShareCodeModal.jsx | §1, §7, §9 |
| 22 | `f276bc4` | update | lumi11.png, ShareCodeModal.jsx | §1, §9 |
| 23 | `949a591` | home | mountain.png, HomePage.jsx | §1, §7 (hero redesign) |
| 24 | `9b39a63` | home | HomePage.jsx | §7 |
| 25 | `8949783` | home | HomePage.jsx | §7 |
| 26 | `23ce654` | update | HomePage.jsx | §7 |
| 27 | `7bccc2a` | push | HomePage.jsx | §7 |
| 28 | `9a12d95` | home | HomePage.jsx | §7 |
| 29 | `7a331da` | join | HomePage.jsx | §7 |
| 30 | `276de1c` | update | HomePage.jsx | §7 |
| 31 | `39307a9` | push | TravelBae.jsx | §3 |
| 32 | `eba5061` | push | HomePage.jsx | §7 |
| 33 | `9df3fca` | push | HomePage.jsx | §7 |
| 34 | `5935ce4` | update | HomePage.jsx | §7 |
| 35 | `ee819c6` | push | HomePage.jsx | §7 |
| 36 | `63527e0` | push | HomePage.jsx | §7 |
| 37 | `16a0e9c` | push | TravelBae.jsx | §3 |
| 38 | `10ab62f` | push | HomePage.jsx | §7 |
| 39 | `3b2d510` | push | HomePage.jsx | §7 |
| 40 | `79344be` | trips | lumi12.png, HomePage.jsx | §1, §7 |
| 41 | `ea788d9` | push | HomePage.jsx | §7 |
| 42 | `2feba5c` | update | HomePage.jsx | §7 |
| 43 | `12c18b9` | push | HomePage.jsx | §7 |
| 44 | `b4b3815` | home | HomePage.jsx | §7 |
| 45 | `31cc300` | push | lumi5_bgless.png, HomePage.jsx | §1, §7 |
| 46 | `906c3c4` | push | HomePage.jsx | §7 |
| 47 | `87d2384` | push | HomePage.jsx | §7 |
| 48 | `9626d67` | push | HomePage.jsx | §7 |
| 49 | `587e183` | push | HomePage.jsx | §7 |
| 50 | `f59d508` | lumi | HomePage.jsx | §7 (Lumi trivia/hero) |
| 51 | `e9c1229` | lumi | HomePage.jsx | §7 |
| 52 | `d36f3cf` | lumi | HomePage.jsx | §7 |
| 53 | `deb06fd` | lumi | HomePage.jsx | §7 |
| 54 | `5649dcd` | lumi | HomePage.jsx | §7 |
| 55 | `536bbf2` | lumi | HomePage.jsx | §7 |
| 56 | `c706d17` | lumi | HomePage.jsx | §7 |
| 57 | `bd008d6` | lumi | HomePage.jsx | §7 |
| 58 | `8b496c6` | lumi | HomePage.jsx | §7 |
| 59 | `465b2da` | lumi | HomePage.jsx | §7 |
| 60 | `7f6e9e0` | lumi | HomePage.jsx | §7 |
| 61 | `735de2c` | lumi | HomePage.jsx | §7 |
| 62 | `82c1581` | lumi | HomePage.jsx | §7 |
| 63 | `02d78f7` | lumi | HomePage.jsx | §7 |
| 64 | `6d21d50` | update | TravelBae.jsx, shared/styles.js, SoloExpensesPage.jsx, SplitPage.jsx | §3, §6, §18, §19 (orange rebrand) |
| 65 | `c71a686` | update | SoloExpensesPage.jsx, SplitPage.jsx | §18, §19 |
| 66 | `997f538` | update | SplitPage.jsx | §19 |
| 67 | `b8beb55` | update | SplitPage.jsx | §19 |
| 68 | `55bb76c` | update | lumi_mood1-6.png, SoloExpensesPage.jsx, SplitPage.jsx | §1, §18, §19 |
| 69 | `2902654` | update | SoloExpensesPage.jsx, SplitPage.jsx | §18, §19 |
| 70 | `908d2e6` | update | SplitPage.jsx | §19 |
| 71 | `700ae37` | update | TravelBae.jsx, ProfilePage.jsx, UserProfileWizard.jsx | §3, §13, §14 |
| 72 | `427d290` | update | TravelBae.jsx, SplitPage.jsx | §3, §19 |
| 73 | `fb9eadc` | update | SoloExpensesPage.jsx | §18 |
| 74 | `65502e4` | update | TravelBae.jsx, SoloExpensesPage.jsx | §3, §18 |
| 75 | `df22126` | update | TravelBae.jsx, index.css | §3, §5 (z-index refactor) |
| 76 | `11b316b` | feat: Lumi intro popups for all sections | lumi13.png, lumi14.png, ClubPage.jsx, ContactsPage.jsx, ItineraryPage.jsx, PhotosPage.jsx, SoloExpensesPage.jsx, SplitPage.jsx | §1, §10, §16, §17, §18, §19, §20 |
| 77 | `eccd27e` | feat: add ⓘ info button on hero headers | ClubPage.jsx, ContactsPage.jsx, ItineraryPage.jsx, PhotosPage.jsx, SoloExpensesPage.jsx, SplitPage.jsx | §10, §16, §17, §18, §19, §20 |
| 78 | `9702169` | feat: use lumi15 for itinerary intro popup | lumi15.png, ItineraryPage.jsx | §1, §10 |
| 79 | `aafba95` | fix: remove outer circle from info buttons | ClubPage.jsx, ContactsPage.jsx, ItineraryPage.jsx, PhotosPage.jsx, SoloExpensesPage.jsx, SplitPage.jsx | §10, §16, §17, §18, §19, §20 |
| 80 | `191e047` | ui: intro popup improvements | lumi16.png, ClubPage.jsx, PhotosPage.jsx, SoloExpensesPage.jsx, SplitPage.jsx | §1, §16, §18, §19, §20 |
| 81 | `cdfe510` | ui: popup layout polish | lumi17.png, ClubPage.jsx, ItineraryPage.jsx, PhotosPage.jsx, SplitPage.jsx | §1, §10, §16, §19, §20 |
| 82 | `db5ffb1` | feat: photos orange theme + photos.png hero | photos.png, HomePage.jsx, PhotosPage.jsx | §1, §7, §20 |
| 83 | `34c1db1` | fix: YOUR TRIPS position, hero gap, photos zoom | ClubPage.jsx, HomePage.jsx, PhotosPage.jsx | §7, §16, §20 |
| 84 | `59dd85c` | feat: sort button, fix photos hero | HomePage.jsx, PhotosPage.jsx | §7, §20 |
| 85 | `d73afde` | fix: sort/filter dropdown zIndex, remove border lines | HomePage.jsx | §7 |
| 86 | `65bc031` | fix: sort+filter clickable, restore filters, lumi18 | lumi18.png, HomePage.jsx, PhotosPage.jsx | §1, §7, §20 |
| 87 | `4ce824f` | fix: sort+filter zIndex on buttons container | HomePage.jsx, PhotosPage.jsx | §7, §20 |
| 88 | `108f684` | push | ClubPage.jsx | §16 |
| 89 | `d478446` | push | TravelBae.jsx, ClubPage.jsx | §3, §16 |
| 90 | `bf8db73` | push | TravelBae.jsx | §3 |
| 91 | `eb3a286` | push | TravelBae.jsx | §3 |
| 92 | `5f2519d` | push | TravelBae.jsx | §3 |
| 93 | `9591a55` | push | TravelBae.jsx | §3 |
| 94 | `e03eead` | push | TravelBae.jsx | §3 |
| 95 | `2fccc14` | push | TravelBae.jsx | §3 |
| 96 | `964459a` | push | TravelBae.jsx | §3 |
| 97 | `e64b6ec` | feat: experience discovery swipe flow | api.js, ExperienceDiscovery.jsx, ItineraryPage.jsx | §4, §10, §11 |
| 98 | `e7e291a` | fix: tab restructure | ExperienceDiscovery.jsx, ItineraryPage.jsx | §10, §11 |
| 99 | `c51c7fc` | fix: scroll+swipe+flow+photos | ExperienceDiscovery.jsx, ItineraryPage.jsx | §10, §11 |
| 100 | `5471cca` | feat: no-repeat cards, auto-advance, Lumi empty state | ExperienceDiscovery.jsx, ItineraryPage.jsx | §10, §11 |
| 101 | `2479147` | feat: persist swipe progress in localStorage | ExperienceDiscovery.jsx | §11 |
| 102 | `95493a5` | fix: add missing handleComplete/handleSkip defs | ExperienceDiscovery.jsx | §11 |
| 103 | `a7229b7` | push | ExperienceDiscovery.jsx, ItineraryPage.jsx, PlaceMedia.jsx | §10, §11, §21 |
| 104 | `09a5a90` | push | ExperienceDiscovery.jsx, ItineraryPage.jsx, RecommendationsPage.jsx | §10, §11, §12 |
| 105 | `92ca4da` | push | ExperienceDiscovery.jsx, ItineraryPage.jsx | §10, §11 |
| 106 | `ff7ed39` | push | ExperienceDiscovery.jsx, ItineraryPage.jsx | §10, §11 |
| 107 | `e733dac` | push | lumi19.png, ItineraryPage.jsx | §1, §10 |
| 108 | `1fda279` | push | ExperienceDiscovery.jsx | §11 |
| 109 | `cd5b726` | enhance: tier badge, HD photo height, imageQuery fallback | ExperienceDiscovery.jsx | §11 |
| 110 | `a60ed14` | fix: add missing lumi17Img import | ExperienceDiscovery.jsx | §11 |
| 111 | `7181756` | fix: show empty states in nearby, always show tab buttons | RecommendationsPage.jsx | §12 |
| 112 | `29d86a7` | feat: trip cards use HD travel photography | HomePage.jsx | §7 |
| 113 | `b01a0b1` | push | ExperienceDiscovery.jsx | §11 |
| 114 | `1103f33` | push | ExperienceDiscovery.jsx | §11 |
| 115 | `7b53736` | push | ExperienceDiscovery.jsx, ItineraryPage.jsx | §10, §11 |
| 116 | `de0650a` | push | ExperienceDiscovery.jsx | §11 |
| 117 | `81f0573` | push | ExperienceDiscovery.jsx | §11 |
| 118 | `f574659` | push | ExperienceDiscovery.jsx | §11 |
| 119 | `b677ba3` | push | ExperienceDiscovery.jsx | §11 |
| 120 | `6ac16f2` | push | ExperienceDiscovery.jsx | §11 |
| 121 | `926a2df` | push | ExperienceDiscovery.jsx | §11 |
| 122 | `00cd822` | push | ExperienceDiscovery.jsx | §11 |
| 123 | `0efed13` | push | ExperienceDiscovery.jsx | §11 |
| 124 | `dda42e6` | push | ExperienceDiscovery.jsx | §11 |
| 125 | `81655d8` | push | ExperienceDiscovery.jsx | §11 |
| 126 | `66ed4b0` | push | lumi20.png, ExperienceDiscovery.jsx | §1, §11 |
| 127 | `d475262` | push | ExperienceDiscovery.jsx | §11 |
| 128 | `e66e415` | push | ExperienceDiscovery.jsx, ItineraryPage.jsx | §10, §11 |
| 129 | `422dd24` | push | ExperienceDiscovery.jsx, ItineraryPage.jsx | §10, §11 |
| 130 | `3ada1ed` | push | ExperienceDiscovery.jsx, ItineraryPage.jsx | §10, §11 |
| 131 | `113a3a2` | push | ExperienceDiscovery.jsx, ItineraryPage.jsx | §10, §11 |
| 132 | `6c3e1da` | push | ExperienceDiscovery.jsx | §11 |
| 133 | `2c71d50` | push | ExperienceDiscovery.jsx | §11 |
| 134 | `d8dd2d0` | push | ExperienceDiscovery.jsx | §11 |
| 135 | `79163bc` | pushed | lumi21.png, ExperienceDiscovery.jsx, ItineraryPage.jsx | §1, §10, §11 |
| 136 | `d2db2e4` | pushed | ItineraryPage.jsx | §10 |
| 137 | `5b04f3f` | explore | ItineraryPage.jsx | §10 |
| 138 | `3f18342` | explored | ItineraryPage.jsx | §10 |
| 139 | `fb60183` | explored | ItineraryPage.jsx | §10 |
| 140 | `8b00bd4` | explored | ClubPage.jsx, ItineraryPage.jsx, SplitPage.jsx | §10, §16, §19 |
| 141 | `0836bdf` | explored | ClubPage.jsx, ExperienceDiscovery.jsx | §11, §16 |
| 142 | `9872088` | Itinerary | ExperienceDiscovery.jsx | §11 |
| 143 | `5bdddc7` | explo | TravelBae.jsx, bgless.png, bgless1.png, ItineraryPage.jsx, SoloExpensesPage.jsx, SplitPage.jsx, index.css | §1, §2, §3, §5, §10, §18, §19 |
| 144 | `13deefe` | explo | TravelBae.jsx, SoloExpensesPage.jsx, SplitPage.jsx, index.css | §3, §5, §18, §19 |
| 145 | `72d8ae9` | itinerary | ItineraryPage.jsx, SplitPage.jsx | §10, §19 |
| 146 | `4245d52` | revamp itinerary | ItineraryPage.jsx | §10 |
| 147 | `fc1074c` | itinerary | SplitPage.jsx | §19 |
| 148 | `a29eb26` | redesign itinerary tab | ItineraryPage.jsx, PlaceMedia.jsx, SplitPage.jsx | §10, §19, §21 |
| 149 | `ab1bd41` | fix itinerary: unicode escapes, nowrap, image fill | ItineraryPage.jsx | §10 |
| 150 | `b85fe56` | fix itinerary: replace brown gradient with orange | ItineraryPage.jsx | §10 |
| 151 | `5e5ff18` | polish itinerary | ItineraryPage.jsx | §10 |
| 152 | `8d5b0a0` | itinerary: lumi10 hero, orange-only theme | ItineraryPage.jsx | §10 |
| 153 | `b6629db` | itinerary hero: single-row lumi + tips btn | ItineraryPage.jsx | §10 |
| 154 | `f051f58` | itinerary: white expanded day header | ItineraryPage.jsx | §10 |
| 155 | `f5ca6a8` | im | ItineraryPage.jsx | §10 |
| 156 | `b8e964c` | im | ItineraryPage.jsx | §10 |

## Coverage Notes

All 156 commits between `HEAD` (5ac0a99) and `origin/main` (b8e964c) are represented in the 19 modified files + 1 new file + 27 new assets covered by this document. The commits range across:

- **Auth/login redesign** (~15 commits: `login`, `auth`, `im`)
- **Itinerary overhaul** (~10 commits: `itinerary`, `polish itinerary`, `redesign itinerary tab`, etc.)
- **Explore/ExperienceDiscovery** (~25 commits: `explo`, `explored`, `explore`, `feat: experience discovery`, `fix: tab restructure`, etc.)
- **Home page trip listing** (~10 commits: `home`, `fix: sort+filter`, `feat: sort button`, etc.)
- **Profile/user wizard** (~8 commits: `profile`, `update`)
- **Lumi intro popups** (~5 commits: `lumi`, `feat: Lumi intro popups`)
- **Style rebranding** (~25+ commits: `update`, `push` — orange theme, color replacements)
- **Photos/club/split/solo** (~20+ commits: feature-specific work)
- **Generic push commits** (~38 commits: `push`, `update` — mixed across feature files)
