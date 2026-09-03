import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Window-level pull-to-refresh: the app scrolls at the document level (not a
// nested container) and has `overscroll-behavior: none` globally, so a
// deliberately hard overscroll past scrollY 0 triggers onRefresh. Modeled on
// Facebook/LinkedIn: the refresh only fires on release (touchend), and only
// if the user pulled past a large threshold while staying pinned at the top —
// a gentle scroll/bounce near the top never fires it mid-drag.
const PULL_THRESHOLD = 110;

// Rubber-band resistance applied to the raw finger delta before comparing
// against PULL_THRESHOLD — without this, overscroll-behavior:none means the
// page has zero elastic resistance, so a single ordinary "scroll to the top"
// flick can rack up 110+ raw px and fire a refresh by accident. Real apps
// (LinkedIn/IG/FB) make the pull feel "heavy" so only a deliberate, sustained
// pull crosses the line. With RESISTANCE=0.42, ~260px of real finger travel
// is needed to hit the threshold instead of ~110px.
const PULL_RESISTANCE = 0.42;

// Below the fixed app topbar (~60px content + safe-area-inset-top), so the
// spinner always sits under the header instead of overlapping it.
const SPINNER_TOP = 'calc(64px + env(safe-area-inset-top, 0px))';

export function usePullToRefresh(onRefresh, deps = []) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const pull = { active: false, startY: 0, triggered: false, lastDy: 0 };
    const fire = () => {
      pull.triggered = true;
      setIsRefreshing(refreshing => {
        if (refreshing) return refreshing;
        Promise.resolve(onRefreshRef.current?.())
          .catch(err => console.warn('Refresh error:', err?.message))
          // Reload the whole window so it genuinely feels like a refresh.
          .finally(() => window.location.reload());
        return true;
      });
    };
    const onTouchStart = (e) => {
      if (window.scrollY > 0) return;
      pull.active = true;
      pull.triggered = false;
      pull.lastDy = 0;
      pull.startY = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      if (!pull.active || pull.triggered) return;
      // Scrolling took over (no longer pinned to the top) — abandon the pull.
      if (window.scrollY > 0) { pull.active = false; return; }
      const rawDy = e.touches[0].clientY - pull.startY;
      pull.lastDy = rawDy > 0 ? rawDy * PULL_RESISTANCE : rawDy;
    };
    const onTouchEnd = () => {
      if (pull.active && !pull.triggered && window.scrollY <= 0 && pull.lastDy > PULL_THRESHOLD) fire();
      pull.active = false;
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return isRefreshing;
}

// Same gesture, but scoped to a scrollable container (e.g. a fixed-position
// overlay with its own overflowY:auto) instead of the window — used by pages
// that don't scroll at the document level, like ProfilePage.
export function usePullToRefreshContainer(containerRef, onRefresh, deps = []) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const pull = { active: false, startY: 0, triggered: false, lastDy: 0 };
    const fire = () => {
      pull.triggered = true;
      setIsRefreshing(refreshing => {
        if (refreshing) return refreshing;
        Promise.resolve(onRefreshRef.current?.())
          .catch(err => console.warn('Refresh error:', err?.message))
          // Reload the whole window so it genuinely feels like a refresh.
          .finally(() => window.location.reload());
        return true;
      });
    };
    const onTouchStart = (e) => {
      if (el.scrollTop > 0) return;
      pull.active = true;
      pull.triggered = false;
      pull.lastDy = 0;
      pull.startY = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      if (!pull.active || pull.triggered) return;
      if (el.scrollTop > 0) { pull.active = false; return; }
      const rawDy = e.touches[0].clientY - pull.startY;
      pull.lastDy = rawDy > 0 ? rawDy * PULL_RESISTANCE : rawDy;
    };
    const onTouchEnd = () => {
      if (pull.active && !pull.triggered && el.scrollTop <= 0 && pull.lastDy > PULL_THRESHOLD) fire();
      pull.active = false;
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return isRefreshing;
}

// Loading-spinner-only indicator (no "Refreshing…" text), pinned to the top.
// Rendered via a portal directly under <body> so it's always positioned
// relative to the viewport, regardless of any transformed/animated ancestor
// on the page it's used from (e.g. a page-enter animation on a parent).
export function PullToRefreshSpinner({ active }) {
  if (!active) return null;
  return createPortal(
    <div style={{ position: 'fixed', top: SPINNER_TOP, left: 0, right: 0, textAlign: 'center', zIndex: 3000, pointerEvents: 'none' }}>
      <div style={{ width: 26, height: 26, margin: '0 auto', border: '3px solid rgba(255,106,0,0.25)', borderTopColor: '#FF6A00', borderRadius: '50%', animation: 'tbPullSpin 0.7s linear infinite', background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
      <style>{`@keyframes tbPullSpin { to { transform: rotate(360deg); } }`}</style>
    </div>,
    document.body
  );
}
