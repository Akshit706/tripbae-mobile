# Swipe Jitter Issue in ExperienceDiscovery

## Problem

When swiping through experience cards in the itinerary Day Planner, the entire page feels jittery. Every swipe causes:
- The card stack to visibly "bounce" or flash when the next card comes into position
- The LumiCTA button ("Create with Lumi") visually reloads / its shimmer animation restarts
- The photo in the new top card flashes briefly before showing the correct image

This happens on **every single swipe** — not just occasionally.

## Files Involved

### Primary
- `src/features/itinerary/ExperienceDiscovery.jsx` (main swipe component, ~1060 lines)
- `src/features/media/PlaceMedia.jsx` (PlacePhotoCarousel, responsible for card photos)

### Secondary
- `src/features/itinerary/ItineraryPage.jsx` (parent, passes trip/onComplete/onSkip)

## Known Root Causes Found So Far

### 1. Card Snap-Back Frame Jitter (CURRENT SUSPECT #1 — confirmed)

**Location:** `SwipeStack` component inside `ExperienceDiscovery.jsx`, `handlePointerUp` function (around line 470)

**What happens frame-by-frame on a swipe:**
1. User drags Card A → DOM has `transform: translateX(120px)` (written directly to `el.style.transform`)
2. User releases → `handlePointerUp` fires
3. **`el.style.transform = ''`** instantly snaps the card to position 0
4. `doSwipe` fires → `setSwipeOut('right')`, `setDragX(600)` — React batches these
5. **Browser paints one frame with card at original position** — this is the visible jitter
6. React commits fly-out state → card at `translateX(600px)` with 0.30s transition

**Attempted fix:** Removed `el.style.transform = ''` from the swipe path (only keep it for snap-back). This ensures the card stays at the dragged position and the fly-out continues seamlessly.

**Issue with fix:** May still not work because React `setDragX(flyX)` and `setSwipeOut(dir)` might not reconcile correctly with the DOM inline style. The card's style prop `transform: translateX(flyX)px` might clash with the remaining inline style.

### 2. Stale 220ms Delay Photo Fetch

**Location:** `PlacePhotoCarousel` in `PlaceMedia.jsx`, and `SwipeCard` passes `delay={stackIndex * 220}`

**What happens:**
1. Card B is rendered at stackIndex 1 → `delay=220ms` → photo fetch starts after 220ms delay
2. At ~330ms, Card A is removed, Card B becomes top (stackIndex 0)
3. Card B's photo fetch has only been running for ~110ms — still shows loading skeleton
4. Fetch completes → flash from skeleton to photo

**Attempted fix:** Removed `delay` prop from `SwipeCard`'s `PlacePhotoCarousel`, so all cards fetch immediately regardless of position.

**Issue with fix:** The `delay` prop is still in `PlacePhotoCarousel`'s component signature (line 216 of PlaceMedia.jsx) but no longer passed from SwipeCard — it defaults to 0 now. However, `delay` was already removed from the `useEffect` dependency array in a previous fix (`useEffect(() => {...}, [query, limit])`).

### 3. Card Stack-to-Top CSS Transition Animation

**Location:** `SwipeCard` component, the `transition` style prop (around line 185)

**What happens:**
1. Card B was at stackIndex 1 with `transform: scale(0.956) translateY(13px)`
2. Card A is removed, Card B becomes top at stackIndex 0 with `transform: translateX(0)`
3. With `transition: 'transform 0.44s cubic-bezier(0.175,0.885,0.32,1.275)'` — that's a spring
4. The card **animates** from the stacked position to the top position, causing a visible bounce

**Attempted fix:** Changed the transition to `'none'` when not dragging (only the swipe fly-out keeps `transform 0.30s cubic-bezier(0.4,0,1,1)`).

**Issue with fix:** This might make the card snap rather than smoothly animate, which could feel equally janky. Also, the transition prop is computed inline based on state, so React reconciling it might cause a one-frame paint at the old position.

### 4. Drag State in Parent Causes Full Tree Evaluation

**Location:** Previously the parent `ExperienceDiscovery` held all drag state (`dragX`, `isDragging`, `swipeOut`)

**What happened:** Every pointer move during a drag changed state in the parent, causing the ENTIRE component function to re-execute — evaluating JSX for `LumiCTA`, `StatsBar`, `CategoryPills`, etc.

**Attempted fix:** Extracted all drag state + pointer handlers into a separate `SwipeStack` child component (wrapped in `memo`). The parent now only re-renders when `swipedIds`/`likedIds` change (after swipe completes, via `startTransition`).

**Issue with fix:** This is working correctly now. The parent doesn't re-evaluate during drags. But it didn't solve the visual jitter.

### 5. PlacePhotoCarousel Resetting State on Delay Change

**Location:** `PlacePhotoCarousel` component, `useEffect` dependency array

**What happened:** The `useEffect` had `[query, limit, delay]` as dependencies. When cards shift position, `delay` changes (220→0) for the same query → triggers `setPhotoIdx(0)` and `setImgErr(new Set())` → flash even for cached photos.

**Attempted fix:** Removed `delay` from the dependency array: `// eslint-disable-next-line react-hooks/exhaustive-deps`, now `[query, limit]` only.

**Issue with fix:** Fixed, but `delay` from initial render still created a stale photo fetch that resolved late (see issue #2).

### 6. Parent Component (ItineraryPage) Inline Callbacks

**Location:** `ItineraryPage.jsx`, around line 1452

**What happened:** `onComplete` and `onSkip` were inline arrow functions creating new references every render, defeating `memo` on `ExperienceDiscovery`.

**Attempted fix:** Extracted to stable `useCallback` + `useRef` for the itinerary generation function.

**Status:** Fixed. Not a direct cause of jitter, but needed for memo to work.

### 7. LumiCTA CSS Animation Restart

**Location:** CSS `@keyframes` injected in the global style block, and `LumiCTA` component's `ed-cta-lumi` class

**What happens:** The LumiCTA has a `::after` shimmer animation (`ctaShimmer 2.6s ease-in-out infinite`). When sibling elements shift (card stack changing height/position), the browser repaints the entire container, which can restart CSS animations on elements that share the same compositing layer.

**Attempted fix:** Added `transform: translateZ(0)` (GPU compositing layer promotion) and `contain: 'layout style'` to the LumiCTA style.

**Status:** Applied but effectiveness not confirmed.

## What Has NOT Been Tried

1. **useLayoutEffect instead of useState for the fly-out** — The jitter frame happens between React commit and browser paint. `useLayoutEffect` runs synchronously after DOM mutations but before paint, so the card never renders at position 0.
   - Alternative: `useLayoutEffect` in the doSwipe flow to ensure `setSwipeOut` + `setDragX` are painted in the same frame.
   - Alternative: `requestAnimationFrame` to align state updates with the browser's paint cycle.

2. **Never clearing `el.style.transform` at all** — Instead of `el.style.transform = ''`, handle the DOM inline style through the entire lifecycle and only let React's `transform` prop take over via a class toggle.
   - **The real solution may be:** Don't use direct DOM manipulation + React state for the same CSS property. Pick one system. Either:
     - **Pure React:** Remove all direct DOM `el.style.transform` writes, use React state + requestAnimationFrame throttling for smooth drag.
     - **Pure DOM:** Manage the entire card lifecycle via DOM refs and CSS classes, React only updates the data (experiences list).

3. **CSS `will-change: transform` on the card container** — Already present. Not the issue.

4. **Completely removing the 0.30s fly-out CSS transition** — Instead of relying on CSS transitions that conflict with React state, handle the fly-off animation purely via React `setDragX` updates.

5. **CSS `content-visibility: auto`** on the page sections below the cards — ensures paint isolation.

6. **The cards container minHeight changing** — When cards shift, the container height changes because stacked cards take up different visual space than one top card. This layout shift cascades down. A fixed-height container (`height: 450px` is already there on the card area) should prevent this, but verify.

7. **Replacing `visibleCards.slice(0,3)` rendering** — Currently renders 3 cards even when shadow cards are invisible. When Card A is removed, Card B needs to shift up, and the 3rd card needs to render. This insert/remove of DOM elements causes layout shifts.

## How to Reproduce

1. Open the app on mobile or mobile-DevTools viewport
2. Navigate to a trip's Day Planner tab
3. Swipe right or left on an experience card
4. Observe: next card bounces/flashes, LumiCTA shimmer restarts, photo may flash

## Expected Behavior

Swiping should feel smooth like Tinder. The next card should be in position immediately with no bounce, the photo should already be loaded (no flash), and elements above the card stack (LumiCTA, stats bar) should not visually change.

## Debugging Tips

- Add `console.log` in `handlePointerUp` to trace the exact timing of DOM transform clearing vs React commit
- Use a `requestAnimationFrame` callback to check what position the card is at during the paint frame
- Disable the LumiCTA `::after` shimmer to see if it's just that animation restarting vs actual DOM recreation
- Test with `touchAction: 'none'` instead of `'pan-y'` to see if scroll interference is a factor
