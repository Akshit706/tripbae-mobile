import { useState, useRef, useEffect } from 'react';
import { PlacePhotoCarousel } from '../media/PlaceMedia';
import lumi8Img from '../../assets/lumi8.png';
import lumi11Img from '../../assets/lumi11.png';
import lumi15Img from '../../assets/lumi15.png';
import lumi17Img from '../../assets/lumi17.png';
import lumi5Img from '../../assets/lumi5_bgless.png';

/* ── Design tokens (matches ItineraryPage) ───────────────── */
const D = {
  bg:        '#FAF8F4',
  surface:   '#FFFFFF',
  espresso:  '#1C1410',
  gold:      '#C9913A',
  goldTint:  '#FDF3E3',
  muted:     '#8A7E76',
  secondary: '#5C504A',
  border:    'rgba(28,20,16,0.08)',
  divider:   'rgba(28,20,16,0.06)',
  cardShadow:'0 2px 8px rgba(28,20,16,0.06)',
};

const CAT = {
  'Attractions':       { bg: '#EEF2FF', color: '#4F46E5', emoji: '🏛️' },
  'Food':              { bg: '#FEF3C7', color: '#D97706', emoji: '🍽️' },
  'Cafes':             { bg: '#FDF2F8', color: '#DB2777', emoji: '☕' },
  'Hidden Gems':       { bg: '#ECFDF5', color: '#059669', emoji: '💎' },
  'Adventure':         { bg: '#FFF7ED', color: '#EA580C', emoji: '🎯' },
  'Shopping':          { bg: '#FFF1F2', color: '#BE123C', emoji: '🛍️' },
  'Nightlife':         { bg: '#F5F3FF', color: '#7C3AED', emoji: '🌙' },
  'Culture':           { bg: '#FFFBEB', color: '#B45309', emoji: '🎭' },
  'Viewpoints':        { bg: '#EFF6FF', color: '#2563EB', emoji: '🌅' },
  'Local Experiences': { bg: '#F7FEE7', color: '#4D7C0F', emoji: '🌿' },
  'Party':             { bg: '#FDF4FF', color: '#9333EA', emoji: '🎉' },
};
const ALL_CATS = Object.keys(CAT);
function catCfg(c) { return CAT[c] || { bg: '#F4F2EE', color: '#8A7E76', emoji: '📍' }; }

function renderCatIcon(category, size = 13, color = 'currentColor') {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', style: { display: 'block', flexShrink: 0 } };
  switch (category) {
    case 'Attractions':
      return <svg {...p}><path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><path d="M9 21v-6h6v6"/></svg>;
    case 'Food':
      return <svg {...p}><path d="M3 2v7c0 1.1.9 2 2 2a2 2 0 0 0 2-2V2"/><line x1="5" y1="12" x2="5" y2="22"/><path d="M15 2v20M15 2a5 5 0 0 1 5 5v2a5 5 0 0 1-5 5"/></svg>;
    case 'Cafes':
      return <svg {...p}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/></svg>;
    case 'Hidden Gems':
      return <svg {...p}><path d="M6 3h12l4 6-10 13L2 9z"/><line x1="2" y1="9" x2="22" y2="9"/></svg>;
    case 'Adventure':
      return <svg {...p}><path d="M3 17l6-11 4 7 3-4 5 8H3z"/></svg>;
    case 'Shopping':
      return <svg {...p}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
    case 'Nightlife':
      return <svg {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
    case 'Culture':
      return <svg {...p}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
    case 'Viewpoints':
      return <svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'Local Experiences':
      return <svg {...p}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>;
    case 'Party':
      return <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill={color} stroke="none"/></svg>;
    default:
      return <svg {...p}><circle cx="12" cy="12" r="8"/></svg>;
  }
}

function parseDurationHours(dur) {
  if (!dur) return 1.5;
  const m = String(dur).match(/(\d+(?:\.\d+)?)\s*[-–to]\s*(\d+(?:\.\d+)?)/);
  if (m) return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
  const s = String(dur).match(/(\d+(?:\.\d+)?)/);
  return s ? Math.max(0.5, parseFloat(s[1])) : 1.5;
}

/* ── Progress persistence helpers ───────────────────────── */
function _progKey(tripId) { return `ed_swipe_${tripId}`; }
function loadProgress(tripId) {
  try {
    const raw = localStorage.getItem(_progKey(tripId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveProgress(tripId, swipedIds, likedIds, activeFilter, experiences, phase) {
  try {
    localStorage.setItem(_progKey(tripId), JSON.stringify({
      swipedIds: [...swipedIds],
      likedIds:  [...likedIds],
      activeFilter,
      experiences: experiences || [],
      phase: phase || 'swipe',
    }));
  } catch { /* ignore quota errors */ }
}
function clearProgress(tripId) {
  try { localStorage.removeItem(_progKey(tripId)); } catch { /* ignore */ }
}

/* ── CSS injection ───────────────────────────────────────── */
if (typeof document !== 'undefined' && !document.getElementById('exp-disc-styles')) {
  const el = document.createElement('style');
  el.id = 'exp-disc-styles';
  el.textContent = `
    @keyframes edFlyRight { to { transform: translateX(140vw) rotate(28deg); opacity: 0; } }
    @keyframes edFlyLeft  { to { transform: translateX(-140vw) rotate(-28deg); opacity: 0; } }
    @keyframes edFadeUp   { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes edLumiFloat{ 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
    @keyframes edPulseDot { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.3); opacity: 0.7; } }
    @keyframes edBtnGlow  { 0%,100% { box-shadow: 0 4px 18px rgba(34,197,94,0.26); } 50% { box-shadow: 0 6px 30px rgba(34,197,94,0.52); } }
    @keyframes edStampL   { 0% { transform: scale(0.4) rotate(-10deg); opacity: 0; } 60% { transform: scale(1.15) rotate(-10deg); } 100% { transform: scale(1) rotate(-10deg); opacity: 1; } }
    @keyframes edStampR   { 0% { transform: scale(0.4) rotate(10deg); opacity: 0; } 60% { transform: scale(1.15) rotate(10deg); } 100% { transform: scale(1) rotate(10deg); opacity: 1; } }
    @keyframes edCardIn   { from { opacity: 0; transform: translateY(22px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes edConfirmIn{ from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes edSheetIn  { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes edIntroIn  { from { opacity:0; transform:scale(0.97) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
    @keyframes edSlideNext{ from { opacity:0; transform:translateX(30px); } to { opacity:1; transform:translateX(0); } }
    @keyframes lumiExplorePop { 0% { opacity:0; transform:scale(0.88) translateY(22px); } 65% { transform:scale(1.02) translateY(-2px); } 100% { opacity:1; transform:scale(1) translateY(0); } }
    @keyframes ctaBtnGlow { 0%,100% { box-shadow:0 3px 10px rgba(255,106,0,0.22); } 50% { box-shadow:0 4px 18px rgba(255,106,0,0.4); } }
    @keyframes ctaShimmer { 0%{transform:translateX(-130%) skewX(-18deg)} 100%{transform:translateX(230%) skewX(-18deg)} }
    @keyframes ctaArrowNudge { 0%,100%{transform:translateX(0)} 60%{transform:translateX(4px)} }
    .ed-cta-lumi { animation: ctaBtnGlow 2.2s ease-in-out infinite !important; overflow:hidden !important; position:relative !important; }
    .ed-cta-lumi::after { content:''; position:absolute; top:0; bottom:0; width:28%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.22),transparent); animation:ctaShimmer 2.6s ease-in-out infinite 0.9s; pointer-events:none; }
    .ed-cta-arrow { animation: ctaArrowNudge 1.6s ease-in-out infinite; }
    .ed-like-btn,.ed-pass-btn { transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease !important; }
    .ed-like-btn:active { transform: scale(0.88) !important; }
    .ed-pass-btn:active { transform: scale(0.88) !important; }
    .ed-cat-pill { transition: all 0.15s ease; }
    .ed-cat-pill:hover { transform: scale(1.05); }
    .ed-cat-scroll::-webkit-scrollbar { display: none; }
  `;
  document.head.appendChild(el);
}

/* ══════════════════════════════════════════
   SWIPE CARD
══════════════════════════════════════════ */
function SwipeCard({ exp, dragX, dragY, isDragging, swipeOut, isTop, stackIndex, onPointerDown, destination }) {
  const cfg = catCfg(exp.category);
  // Stamps: visible during drag AND during the fly-out transition
  const likeOpacity = isTop && (isDragging || swipeOut === 'right') ? Math.max(0, Math.min(1, dragX / 65)) : 0;
  const passOpacity = isTop && (isDragging || swipeOut === 'left')  ? Math.max(0, Math.min(1, -dragX / 65)) : 0;
  const rotation    = isTop ? Math.max(-34, Math.min(34, dragX * 0.055)) : 0;
  const stackScale  = 1 - stackIndex * 0.044;
  const stackY      = stackIndex * 13;
  const zIdx        = 10 - stackIndex;

  // Always use dragX for the top card's transform — fly-out is driven by a state update,
  // not a CSS keyframe, so the card continues from wherever the user released.
  const transform = !isTop
    ? `scale(${stackScale}) translateY(${stackY}px) translateZ(0)`
    : `translateX(${dragX}px) translateY(${swipeOut ? 0 : dragY * 0.18}px) rotate(${rotation}deg) translateZ(0)`;

  return (
    <div
      onPointerDown={isTop && !swipeOut ? onPointerDown : undefined}
      style={{
        position: 'absolute', width: '100%',
        borderRadius: 24, overflow: 'hidden', background: D.surface,
        boxShadow: isTop
          ? `0 ${8 + Math.abs(dragX) * 0.05}px ${30 + Math.abs(dragX) * 0.12}px rgba(28,20,16,0.18)`
          : '0 3px 14px rgba(28,20,16,0.09)',
        transform, zIndex: zIdx,
        // dragging: no transition (direct tracking)
        // fly-out:  fast ease-in so it accelerates off screen from current position
        // snap-back: spring ease for settling back to centre
        transition: isDragging
          ? 'none'
          : swipeOut
          ? 'transform 0.30s cubic-bezier(0.4,0,1,1), box-shadow 0.20s ease'
          : 'transform 0.44s cubic-bezier(0.175,0.885,0.32,1.275), box-shadow 0.22s ease',
        cursor: isTop ? (isDragging ? 'grabbing' : 'grab') : 'default',
        userSelect: 'none', WebkitUserSelect: 'none',
        touchAction: 'pan-y', willChange: 'transform',
      }}
    >
      {/* ── Photo 256px ── */}
      <div style={{ position: 'relative', height: 256, overflow: 'hidden', background: '#EDE8E2' }}>
        <PlacePhotoCarousel
          query={exp.imageQuery || `${exp.name} ${destination} high resolution travel photography`}
          style={{ height: '100%', borderRadius: 0 }}
          delay={stackIndex * 220}
          limit={3}
        />
        {/* gradient */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.04) 0%,transparent 30%,rgba(0,0,0,0.76) 100%)', pointerEvents:'none' }} />

        {/* category badge */}
        <div style={{ position:'absolute', top:14, left:14, display:'inline-flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.94)', backdropFilter:'blur(10px)', borderRadius:999, padding:'4px 10px 4px 7px', boxShadow:'0 2px 8px rgba(0,0,0,0.12)' }}>
          {renderCatIcon(exp.category, 13, cfg.color)}
          <span style={{ fontSize:10.5, fontWeight:700, color:cfg.color, fontFamily:"'DM Sans',sans-serif", textTransform:'uppercase', letterSpacing:0.7 }}>{exp.category}</span>
        </div>

        {/* tier-1 must-do badge */}
        {exp.tier === 1 && (
          <div style={{ position:'absolute', top:14, right:14, display:'inline-flex', alignItems:'center', gap:4, background:'linear-gradient(135deg,#FF6B35,#E8390E)', borderRadius:999, padding:'4px 9px 4px 7px', boxShadow:'0 2px 10px rgba(232,57,14,0.45)' }}>
            <span style={{ fontSize:10 }}>🔥</span>
            <span style={{ fontSize:9.5, fontWeight:800, color:'#fff', fontFamily:"'Sora',sans-serif", textTransform:'uppercase', letterSpacing:1 }}>MUST DO</span>
          </div>
        )}

        {/* LIKE stamp */}
        <div style={{ position:'absolute', top:52, right:18, opacity:likeOpacity, transform:'rotate(-12deg)', border:'3px solid #22C55E', borderRadius:8, padding:'4px 12px', color:'#22C55E', fontSize:17, fontWeight:900, letterSpacing:1.5, background:'rgba(255,255,255,0.9)', backdropFilter:'blur(4px)', pointerEvents:'none', fontFamily:"'Sora',sans-serif", animation: likeOpacity > 0.85 ? 'edStampL 0.22s both' : undefined }}>
          LIKE ♥
        </div>

        {/* PASS stamp */}
        <div style={{ position:'absolute', top:52, left:18, opacity:passOpacity, transform:'rotate(12deg)', border:'3px solid #EF4444', borderRadius:8, padding:'4px 12px', color:'#EF4444', fontSize:17, fontWeight:900, letterSpacing:1.5, background:'rgba(255,255,255,0.9)', backdropFilter:'blur(4px)', pointerEvents:'none', fontFamily:"'Sora',sans-serif", animation: passOpacity > 0.85 ? 'edStampR 0.22s both' : undefined }}>
          PASS ✗
        </div>

        {/* name + vibe overlay */}
        <div style={{ position:'absolute', bottom:12, left:14, right:14, pointerEvents:'none' }}>
          <div style={{ fontSize:19, fontWeight:800, color:'#fff', lineHeight:1.2, textShadow:'0 2px 8px rgba(0,0,0,0.6)', fontFamily:"'Sora',sans-serif", letterSpacing:-0.2 }}>{exp.name}</div>
          {exp.vibe && (
            <span style={{ marginTop:4, display:'inline-block', fontSize:9.5, fontWeight:700, color:'rgba(255,255,255,0.9)', background:'rgba(255,255,255,0.14)', borderRadius:999, padding:'2px 8px', backdropFilter:'blur(4px)', textTransform:'uppercase', letterSpacing:0.8 }}>{exp.vibe}</span>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding:'13px 15px 17px', display:'flex', flexDirection:'column', gap:9 }}>
        <p style={{ fontSize:12.5, color:'#5C504A', lineHeight:1.65, margin:0, fontFamily:"'DM Sans',sans-serif", display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
          {exp.description}
        </p>
        {/* thin accent divider */}
        <div style={{ height:'1px', background:'linear-gradient(90deg,rgba(255,106,0,0.15),transparent)', margin:'0 -1px' }} />
        {/* premium tags row */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
          {exp.duration && (
            <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, color:'#5C504A', background:'#F4F2EE', borderRadius:999, padding:'4px 10px', border:'1px solid rgba(28,20,16,0.07)', fontFamily:"'DM Sans',sans-serif" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {exp.duration}
            </span>
          )}
          {exp.bestTime && (
            <span style={{ fontSize:11, fontWeight:600, color:'#0F6E56', background:'#ECFDF5', borderRadius:999, padding:'4px 10px', border:'1px solid rgba(15,110,86,0.15)', fontFamily:"'DM Sans',sans-serif" }}>🕐 {exp.bestTime}</span>
          )}
          {exp.cost && exp.cost !== 'null' && exp.cost !== 'N/A' && (
            <span style={{ fontSize:11, fontWeight:700, color:'#1C1410', background:'#F4F2EE', borderRadius:999, padding:'4px 10px', border:'1px solid rgba(28,20,16,0.1)', fontFamily:"'DM Sans',sans-serif" }}>{exp.cost}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function ExperienceDiscovery({ trip, onComplete, onSkip }) {
  // Initialise from saved progress so swipes + experience cards survive tab-switches / phone sleep
  const _savedProg = loadProgress(trip.id);
  const _hasCachedExps = (_savedProg?.experiences?.length || 0) > 0;

  const [phase, setPhase] = useState(() => _hasCachedExps ? (_savedProg?.phase || 'swipe') : 'loading');
  const [experiences, setExperiences] = useState(() => _savedProg?.experiences || []);

  const [swipedIds, setSwipedIds] = useState(() => new Set(_savedProg?.swipedIds || []));
  const [likedIds,  setLikedIds]  = useState(() => new Set(_savedProg?.likedIds  || []));
  const [activeFilter, setActiveFilter] = useState(() => _savedProg?.activeFilter || null);
  const [swipeOut, setSwipeOut] = useState(null); // 'left'|'right'|null
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [reviewExp, setReviewExp] = useState(null); // experience card being reviewed in confirm sheet

  /* ── One-time intro overlay ── */
  const [showIntro, setShowIntro] = useState(() => {
    try { return !localStorage.getItem('ed_intro_seen'); } catch { return false; }
  });
  const [introStep, setIntroStep] = useState(0);
  const dismissIntro = () => {
    try { localStorage.setItem('ed_intro_seen', '1'); } catch {}
    setShowIntro(false);
  };

  const pointerStart = useRef(null);
  const lastDragXRef = useRef(0);
  const rafRef       = useRef(null);

  const destination = trip.destination || '';
  const days = (trip.arrival && trip.departure)
    ? Math.max(1, Math.round((new Date(trip.departure) - new Date(trip.arrival)) / 86400000))
    : 1;
  const tripActiveHours = days * 10; // ~10 usable hours/day

  /* ── Fetch experiences (skipped if already loaded from localStorage cache) ── */
  useEffect(() => {
    if (experiences.length > 0) return; // already restored from cache — skip API call
    let cancelled = false;
    import('../../api').then(({ fetchExperiences }) =>
      fetchExperiences({ destination, days, budget: trip.budget })
    ).then(data => {
      if (cancelled) return;
      const exps = (data.experiences || []).map((e, i) => ({ ...e, id: e.id || `exp-${i}` }));
      setExperiences(exps);
      setPhase('swipe');
    }).catch(() => {
      if (!cancelled) setPhase('error');
    });
    return () => { cancelled = true; };
  }, []);

  /* ── Derived ────────────────────────────────────────── */
  const allUnswiped = experiences.filter(e => !swipedIds.has(e.id));
  const filteredExp = activeFilter ? allUnswiped.filter(e => e.category === activeFilter) : allUnswiped;
  const total = filteredExp.length; // remaining unswiped in current view
  const likedExps = experiences.filter(e => likedIds.has(e.id));
  const selectedHours = likedExps.reduce((s, e) => s + parseDurationHours(e.duration), 0);
  const availableCats = ALL_CATS.filter(c => experiences.some(e => e.category === c));

  /* ── Swipe action ───────────────────────────────────── */
  const doSwipe = (dir, startX = 0) => {
    if (swipeOut || total === 0) return;
    const exp = filteredExp[0];
    if (!exp) return;
    // Project the card off-screen continuing from its current drag position
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 420;
    const flyX = dir === 'right'
      ? Math.max(startX, screenW * 1.25)
      : Math.min(startX, -screenW * 1.25);
    setSwipeOut(dir);
    setDragX(flyX);   // transition (not keyframe) carries it off from startX → flyX
    setDragY(0);
    lastDragXRef.current = flyX;
    setTimeout(() => {
      setSwipedIds(prev => new Set([...prev, exp.id]));
      if (dir === 'right') setLikedIds(prev => new Set([...prev, exp.id]));
      setSwipeOut(null);
      setDragX(0);
      setDragY(0);
      lastDragXRef.current = 0;
    }, 330);
  };

  /* ── Pointer handlers ───────────────────────────────── */
  const handlePointerDown = (e) => {
    if (swipeOut) return;
    pointerStart.current = { x: e.clientX, y: e.clientY, id: e.pointerId, locked: false, lastX: e.clientX, lastT: Date.now(), vx: 0 };
  };

  const handlePointerMove = (e) => {
    if (!pointerStart.current || e.pointerId !== pointerStart.current.id) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;

    if (!pointerStart.current.locked) {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (absX < 4 && absY < 4) return;
      if (absY > absX) {
        pointerStart.current = null;
        setIsDragging(false);
        return;
      }
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      pointerStart.current = { ...pointerStart.current, locked: true };
      setIsDragging(true);
    }

    // Track instantaneous velocity (px/ms) for flick detection
    const now = Date.now();
    const dt = now - pointerStart.current.lastT;
    const vx = dt > 0 ? (e.clientX - pointerStart.current.lastX) / dt : 0;
    pointerStart.current = { ...pointerStart.current, lastX: e.clientX, lastT: now, vx };

    lastDragXRef.current = dx;

    // Batch DOM updates to the next animation frame for silky rendering
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const snapDx = dx, snapDy = dy;
    rafRef.current = requestAnimationFrame(() => {
      setDragX(snapDx);
      setDragY(snapDy);
      rafRef.current = null;
    });
  };

  const handlePointerUp = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (!isDragging) {
      pointerStart.current = null;
      return;
    }
    const dx = lastDragXRef.current; // sync ref — always current even if rAF hasn't flushed
    const vx = pointerStart.current?.vx || 0;
    setIsDragging(false);
    pointerStart.current = null;
    // Keep lastDragXRef intact so doSwipe can read the real position
    // Trigger on distance ≥ 55 OR flick (|vx| ≥ 0.35 px/ms with some displacement)
    if      (dx >  55 || (vx >  0.35 && dx >  25)) { lastDragXRef.current = 0; doSwipe('right', dx); }
    else if (dx < -55 || (vx < -0.35 && dx < -25)) { lastDragXRef.current = 0; doSwipe('left',  dx); }
    else { lastDragXRef.current = 0; setDragX(0); setDragY(0); }
  };

  const handlePointerCancel = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setIsDragging(false);
    pointerStart.current = null;
    lastDragXRef.current = 0;
    setDragX(0);
    setDragY(0);
  };

  /* ── Wrapped handlers: clear storage on complete / skip ── */
  const handleComplete = (selectedExps) => { clearProgress(trip.id); onComplete(selectedExps); };
  const handleSkip     = ()              => { clearProgress(trip.id); onSkip(); };
  const removeFromPicks = (expId) => {
    setLikedIds(prev => { const next = new Set(prev); next.delete(expId); return next; });
    setReviewExp(null);
  };

  /* ── Persist progress (including experience cards + phase) to localStorage ── */
  useEffect(() => {
    if (experiences.length === 0) return;
    saveProgress(trip.id, swipedIds, likedIds, activeFilter, experiences, phase);
  }, [swipedIds, likedIds, activeFilter, experiences.length, phase]);

  /* ── Auto-advance: next category or confirm ────────── */
  useEffect(() => {
    if (phase !== 'swipe' || experiences.length === 0 || swipeOut) return;
    if (total > 0) return; // still cards available

    if (activeFilter !== null) {
      // Find next category in ALL_CATS order that has unswiped cards
      const catIdx = availableCats.indexOf(activeFilter);
      let nextCat = null;
      for (let i = catIdx + 1; i < availableCats.length; i++) {
        if (experiences.some(e => e.category === availableCats[i] && !swipedIds.has(e.id))) {
          nextCat = availableCats[i]; break;
        }
      }
      if (!nextCat) {
        // Wrap around from beginning of list
        for (let i = 0; i < catIdx; i++) {
          if (experiences.some(e => e.category === availableCats[i] && !swipedIds.has(e.id))) {
            nextCat = availableCats[i]; break;
          }
        }
      }
      const timer = setTimeout(() => {
        setActiveFilter(nextCat || null); // null = switch to "All" (which will show all-done or remaining)
      }, 450);
      return () => clearTimeout(timer);
    } else {
      // "All" filter exhausted — go to confirm
      const timer = setTimeout(() => setPhase('confirm'), 360);
      return () => clearTimeout(timer);
    }
  }, [total, phase, activeFilter, swipeOut, experiences.length]);

  /* ── Build visible card stack ──────────────────────── */
  const visibleCards = filteredExp.slice(0, 3).map((exp, stackIndex) => ({ exp, stackIndex }));

  /* ── Intro overlay (rendered over both loading + swipe phases, one time only) ── */
  const introOverlay = showIntro ? (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(28,20,16,0.55)', backdropFilter:'blur(6px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.25rem' }}
      onClick={dismissIntro}
    >
      <div
        style={{ background:'#fff', borderRadius:24, overflow:'hidden', width:'100%', maxWidth:400, boxShadow:'0 28px 80px rgba(28,20,16,0.28)', animation:'lumiExplorePop .45s cubic-bezier(0.34,1.3,0.64,1) both', position:'relative' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ height:4, background:'linear-gradient(90deg,#FF6A00,#FF8C3B,#FF6A00)' }} />
        <button onClick={dismissIntro} style={{ position:'absolute', top:14, right:14, width:28, height:28, borderRadius:'50%', border:'none', background:'#F3F4F6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, zIndex:1 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        {introStep === 0 && (
          <div key="es0" style={{ animation:'edSlideNext 0.3s ease both' }}>
            <div style={{ padding:'1.2rem 1.25rem 0.6rem' }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'#FFF3EB', borderRadius:999, padding:'3px 9px', marginBottom:8 }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:'#FF6A00' }} />
                <span style={{ fontSize:9.5, fontWeight:700, color:'#FF6A00', letterSpacing:.8, textTransform:'uppercase', fontFamily:"'DM Sans',sans-serif" }}>Lumi says</span>
              </div>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, color:'#1C1410', lineHeight:1.25, marginBottom:6 }}>Your Personal Travel Curator</div>
              <div style={{ fontSize:12, color:'#5C504A', lineHeight:1.62 }}>Your swipes shape your trip. Unlike rigid AI, Lumi crafts a <strong style={{ color:'#1C1410' }}>personalised, flexible itinerary</strong> you can modify anytime.</div>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', padding:'0 1.25rem 0', gap:12 }}>
              <div style={{ width:88, flexShrink:0, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
                <img src={lumi15Img} alt="Lumi" style={{ width:'auto', height:110, objectFit:'contain', display:'block' }} />
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6, paddingBottom:'0.7rem', paddingTop:'0.25rem' }}>
                {['Built around your tastes', 'Fully modifiable after creation', 'Not a one-size-fits-all AI plan'].map((f, i) => (
                  <div key={i} style={{ display:'flex', gap:8, alignItems:'center', padding:'7px 10px', borderRadius:10, border:'1.5px solid rgba(255,106,0,0.25)', background:'#FFF8F4' }}>
                    <svg width="8" height="8" viewBox="0 0 12 10" fill="none" style={{ flexShrink:0 }}><polyline points="1,5 4,8 11,1" stroke="#FF6A00" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span style={{ fontSize:11, color:'#1C1410', fontWeight:700, lineHeight:1.35, fontFamily:"'DM Sans',sans-serif" }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {introStep === 1 && (
          <div key="es1" style={{ animation:'edSlideNext 0.3s ease both', padding:'1.25rem 1.25rem 0.5rem' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
              <div style={{ width:52, height:52, borderRadius:16, background:'#FFF3EB', display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid rgba(255,106,0,0.2)' }}><span style={{ fontSize:26 }}>🗺️</span></div>
            </div>
            <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, color:'#1C1410', lineHeight:1.25, marginBottom:6 }}>Your Itinerary = Your Picks</div>
            <div style={{ fontSize:12, color:'#5C504A', lineHeight:1.62, marginBottom:12 }}>Every swipe right becomes part of your trip. Lumi balances experiences, meals, and free time — <strong style={{ color:'#1C1410' }}>perfectly tailored to you</strong>.</div>
            <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
              {['🏛️ Attractions','🍽️ Food','💎 Hidden Gems','🎯 Adventure','🌙 Nightlife','🌿 Local Life'].map(t => (
                <span key={t} style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:999, background:'#FFF3EB', color:'#FF6A00', border:'1.5px solid rgba(255,106,0,0.22)', fontFamily:"'DM Sans',sans-serif" }}>{t}</span>
              ))}
            </div>
          </div>
        )}
        {introStep === 2 && (
          <div key="es2" style={{ animation:'edSlideNext 0.3s ease both', padding:'1.25rem 1.25rem 0.5rem' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
              <div style={{ width:52, height:52, borderRadius:16, background:'#FFF3EB', display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid rgba(255,106,0,0.2)' }}><span style={{ fontSize:26 }}>📍</span></div>
            </div>
            <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, color:'#1C1410', lineHeight:1.25, marginBottom:6 }}>Discover What's Nearby</div>
            <div style={{ fontSize:12, color:'#5C504A', lineHeight:1.62, marginBottom:12 }}>Once your itinerary is built, explore a curated <strong style={{ color:'#1C1410' }}>Nearby section</strong> — local gems, hidden cafes, and must-try spots right where you'll be.</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {['Local shops & cafes near your stay', 'Points of interest on your route', 'Insider picks from local knowledge'].map((f, i) => (
                <div key={i} style={{ display:'flex', gap:8, alignItems:'center', padding:'7px 10px', borderRadius:10, border:'1.5px solid rgba(255,106,0,0.25)', background:'#FFF8F4' }}>
                  <svg width="8" height="8" viewBox="0 0 12 10" fill="none" style={{ flexShrink:0 }}><polyline points="1,5 4,8 11,1" stroke="#FF6A00" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span style={{ fontSize:11, color:'#1C1410', fontWeight:700, lineHeight:1.35, fontFamily:"'DM Sans',sans-serif" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ padding:'0.75rem 1.25rem 1.25rem', display:'flex', flexDirection:'column', gap:10, alignItems:'center' }}>
          <div style={{ display:'flex', gap:7, alignItems:'center' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ height:6, borderRadius:999, background: i===introStep ? '#FF6A00' : '#FFD4B8', width: i===introStep ? 20 : 6, transition:'all 0.25s cubic-bezier(0.2,0.7,0.2,1)' }} />
            ))}
          </div>
          <button
            onClick={introStep < 2 ? () => setIntroStep(s => s + 1) : dismissIntro}
            style={{ width:'100%', padding:'13px', fontSize:14, fontWeight:700, borderRadius:14, border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", background:'linear-gradient(135deg,#FF6A00,#FF8C3B)', color:'#fff', boxShadow:'0 4px 16px rgba(255,106,0,0.3)' }}
          >
            {introStep < 2 ? 'Next →' : "Let's Explore! 🎉"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  /* ════════════════════════════════════════════
     PHASE: ERROR
  ════════════════════════════════════════════ */
  if (phase === 'error') {
    return (
      <div style={{ background: D.bg, padding: '3rem 1rem', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>😕</div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: D.espresso, marginBottom: 6 }}>Couldn't load experiences</div>
        <div style={{ fontSize: 12.5, color: D.muted, marginBottom: 22, lineHeight: 1.6 }}>The backend might still be waking up.<br/>Try again in a moment, or skip to auto-generate.</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setSwipedIds(new Set()); setLikedIds(new Set()); setActiveFilter(null); setPhase('loading'); clearProgress(trip.id);
            import('../../api').then(({ fetchExperiences }) => fetchExperiences({ destination, days, budget: trip.budget })).then(data => { setExperiences((data.experiences||[]).map((e,i)=>({...e,id:e.id||`exp-${i}`}))); setPhase('swipe'); }).catch(() => setPhase('error')); }}
            style={{ padding: '11px 22px', fontSize: 13, fontWeight: 700, borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${D.gold},#A8731E)`, color: '#fff', fontFamily: "'Sora',sans-serif" }}
          >
            Try Again
          </button>
          <button onClick={handleSkip} style={{ padding: '11px 22px', fontSize: 13, fontWeight: 600, borderRadius: 14, border: `1.5px solid ${D.border}`, cursor: 'pointer', background: D.surface, color: D.secondary, fontFamily: "'DM Sans',sans-serif" }}>
            Skip — auto-generate
          </button>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     PHASE: LOADING
  ════════════════════════════════════════════ */
  if (phase === 'loading') {
    return (
      <>
      <div style={{ background: D.bg, padding: '2rem 1rem', textAlign: 'center' }}>
        {/* Lumi floating */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <img src={lumi17Img} alt="Lumi" style={{ width: 88, height: 'auto', animation: 'edLumiFloat 2.6s ease-in-out infinite' }} />
        </div>

        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: D.muted, marginBottom: 4, letterSpacing: 0.3 }}>
          Lumi is curating experiences for
        </div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: D.gold, marginBottom: 22, letterSpacing: -0.4 }}>
          {destination}
        </div>

        {/* Step indicators */}
        {[
          '🔍 Scanning top travel guides & blogs',
          '✨ Curating experiences across 11 categories',
          '🎯 Food, gems, adventures, nightlife & more',
        ].map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: D.surface, borderRadius: 12, padding: '10px 14px', marginBottom: 8, border: `0.5px solid ${D.border}`, animation: `edFadeUp 0.5s ease ${i * 0.16}s both`, boxShadow: D.cardShadow }}>
            <div style={{ width: 22, height: 22, borderRadius: 8, background: D.goldTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: D.gold, animation: `edPulseDot 1.4s ease-in-out ${i * 0.28}s infinite` }} />
            </div>
            <span style={{ fontSize: 12.5, color: D.secondary, fontFamily: "'DM Sans',sans-serif" }}>{s}</span>
          </div>
        ))}

        <button onClick={onSkip} style={{ marginTop: 20, fontSize: 12, color: D.muted, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontFamily: "'DM Sans',sans-serif" }}>
          Skip — auto-generate itinerary instead
        </button>
      </div>
      {introOverlay}
      </>
    );
  }

  /* ════════════════════════════════════════════
     PHASE: CONFIRM
  ════════════════════════════════════════════ */
  if (phase === 'confirm') {
    const isOver = selectedHours > tripActiveHours * 1.1;
    const hoursRatio = Math.min(1, selectedHours / tripActiveHours);
    const byCategory = availableCats.reduce((acc, cat) => {
      const items = likedExps.filter(e => e.category === cat);
      if (items.length) acc[cat] = items;
      return acc;
    }, {});

    return (
      <div style={{ background: D.bg, paddingBottom: '2rem', animation: 'edConfirmIn 0.38s ease both' }}>

        {/* Hero banner */}
        <div style={{ background: 'linear-gradient(135deg,#1C1410 0%,#7C4A1C 55%,#C9913A 100%)', borderRadius: 20, padding: '1.4rem', marginBottom: '1.1rem', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 24px rgba(28,20,16,0.2)' }}>
          <img src={lumi15Img} alt="" style={{ position: 'absolute', bottom: 0, right: 0, height: 106, width: 'auto', objectFit: 'contain', opacity: 0.95 }} />
          <div style={{ position: 'relative', zIndex: 1, maxWidth: '60%' }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1.8, marginBottom: 5, fontFamily: "'DM Sans',sans-serif" }}>YOUR PICKS</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: "'Sora',sans-serif", lineHeight: 1.2, marginBottom: 6 }}>
              {likedExps.length} experience{likedExps.length !== 1 ? 's' : ''} ✦
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.68)', lineHeight: 1.5 }}>
              ~{Math.round(selectedHours)}h of activities · {days} day{days > 1 ? 's' : ''} trip
            </div>
          </div>
        </div>

        {/* Time gauge */}
        <div style={{ background: D.surface, borderRadius: 16, padding: '1rem 1.1rem', marginBottom: '1rem', border: `0.5px solid ${D.border}`, boxShadow: D.cardShadow }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: D.espresso, fontFamily: "'DM Sans',sans-serif" }}>Activity time usage</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: isOver ? '#EF4444' : '#22C55E' }}>{Math.round(selectedHours)}h / {tripActiveHours}h</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: '#EDE8E2', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, hoursRatio * 100)}%`, borderRadius: 999, background: isOver ? 'linear-gradient(90deg,#F59E0B,#EF4444)' : 'linear-gradient(90deg,#34D399,#22C55E)', transition: 'width 0.7s cubic-bezier(0.2,0.7,0.2,1)' }} />
          </div>
          {isOver && (
            <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: '#FFF8F4', border: '1px solid rgba(201,145,58,0.22)', fontSize: 12, color: '#7A4F00', lineHeight: 1.65, fontFamily: "'DM Sans',sans-serif" }}>
              <strong style={{ color: D.gold }}>✦ Lumi says:</strong> You've selected more experiences than comfortably fit your trip. No worries — I'll optimize and prioritize the best ones while keeping your schedule enjoyable!
            </div>
          )}
        </div>

        {/* Selected by category */}
        {Object.keys(byCategory).length > 0 ? (
          <div style={{ background: D.surface, borderRadius: 16, padding: '1rem 1.1rem', marginBottom: '1rem', border: `0.5px solid ${D.border}`, boxShadow: D.cardShadow }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: D.espresso, fontFamily: "'Sora',sans-serif", marginBottom: 12 }}>Selected experiences</div>
            {Object.entries(byCategory).map(([cat, items]) => {
              const cfg = catCfg(cat);
              return (
                <div key={cat} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    {renderCatIcon(cat, 14, cfg.color)}
                    <span style={{ fontSize: 12, fontWeight: 700, color: D.espresso, fontFamily: "'DM Sans',sans-serif" }}>{cat}</span>
                    <span style={{ fontSize: 10, color: D.muted, background: '#F4F2EE', borderRadius: 999, padding: '1px 6px' }}>{items.length}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', paddingLeft: 20 }}>
                    {items.map(e => (
                      <button key={e.id} onClick={() => setReviewExp(e)} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px 3px 10px', borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}22`, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {e.name}
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: D.muted, fontSize: 13, background: D.surface, borderRadius: 16, marginBottom: '1rem', border: `0.5px solid ${D.border}` }}>
            No experiences selected yet.
            <div style={{ marginTop: 8 }}>
              <button onClick={() => { setSwipedIds(new Set()); setLikedIds(new Set()); setActiveFilter(null); setPhase('swipe'); clearProgress(trip.id); }} style={{ fontSize: 12, color: D.gold, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}>
                Go back and swipe
              </button>
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <button
            onClick={() => handleComplete(likedExps)}
            style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 700, borderRadius: 16, border: 'none', cursor: 'pointer', fontFamily: "'Sora',sans-serif", background: 'linear-gradient(135deg,#C9913A,#A8731E)', color: '#fff', boxShadow: '0 4px 20px rgba(201,145,58,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            Build My Itinerary ✦
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setSwipedIds(new Set()); setLikedIds(new Set()); setActiveFilter(null); setPhase('swipe'); clearProgress(trip.id); }} style={{ flex: 1, padding: '11px', fontSize: 13, fontWeight: 600, borderRadius: 14, border: `1.5px solid ${D.border}`, cursor: 'pointer', background: D.surface, color: D.secondary, fontFamily: "'DM Sans',sans-serif" }}>↩ Swipe from start</button>
            <button onClick={handleSkip} style={{ flex: 1, padding: '11px', fontSize: 13, fontWeight: 600, borderRadius: 14, border: `1.5px solid ${D.border}`, cursor: 'pointer', background: D.surface, color: D.muted, fontFamily: "'DM Sans',sans-serif" }}>✦ Create by Lumi</button>
          </div>
        </div>

        {/* ── Experience Review Sheet ── */}
        {reviewExp && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setReviewExp(null)}
          >
            <div
              style={{ width: '100%', maxWidth: 480, background: D.surface, borderRadius: '20px 20px 0 0', overflow: 'hidden', animation: 'edSheetIn 0.28s cubic-bezier(0.2,0.7,0.2,1) both' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ position: 'relative', height: 220 }}>
                <PlacePhotoCarousel
                  query={reviewExp.imageQuery || `${reviewExp.name} ${destination} high resolution travel photography`}
                  style={{ height: 220, borderRadius: 0 }}
                  limit={3}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.72) 100%)', pointerEvents: 'none' }} />
                {(() => { const cfg = catCfg(reviewExp.category); return (
                  <div style={{ position: 'absolute', top: 14, left: 14, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(10px)', borderRadius: 999, padding: '4px 10px 4px 7px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                    {renderCatIcon(reviewExp.category, 13, cfg.color)}
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: cfg.color, fontFamily: "'DM Sans',sans-serif", textTransform: 'uppercase', letterSpacing: 0.7 }}>{reviewExp.category}</span>
                  </div>
                ); })()}
                {reviewExp.tier === 1 && (
                  <div style={{ position: 'absolute', top: 14, right: 44, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'linear-gradient(135deg,#FF6B35,#E8390E)', borderRadius: 999, padding: '4px 9px 4px 7px', boxShadow: '0 2px 10px rgba(232,57,14,0.45)' }}>
                    <span style={{ fontSize: 10 }}>🔥</span>
                    <span style={{ fontSize: 9.5, fontWeight: 800, color: '#fff', fontFamily: "'Sora',sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>MUST DO</span>
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: 14, left: 14, right: 50, pointerEvents: 'none' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2, textShadow: '0 2px 8px rgba(0,0,0,0.6)', fontFamily: "'Sora',sans-serif" }}>{reviewExp.name}</div>
                  {reviewExp.vibe && <span style={{ marginTop: 4, display: 'inline-block', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.15)', borderRadius: 999, padding: '2px 8px', backdropFilter: 'blur(4px)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{reviewExp.vibe}</span>}
                </div>
                <button onClick={() => setReviewExp(null)} style={{ position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.45)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', zIndex: 2, padding: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div style={{ padding: '14px 16px 24px' }}>
                <p style={{ fontSize: 13, color: D.secondary, lineHeight: 1.65, margin: '0 0 12px' }}>{reviewExp.description}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                  {reviewExp.duration && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11.5, fontWeight: 600, color: D.muted, background: '#F4F2EE', borderRadius: 999, padding: '4px 10px' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {reviewExp.duration}
                    </span>
                  )}
                  {reviewExp.bestTime && <span style={{ fontSize: 11.5, fontWeight: 600, color: '#0F6E56', background: '#ECFDF5', borderRadius: 999, padding: '4px 10px' }}>🕐 {reviewExp.bestTime}</span>}
                  {reviewExp.cost && reviewExp.cost !== 'null' && reviewExp.cost !== 'N/A' && <span style={{ fontSize: 11.5, fontWeight: 700, color: D.gold, background: D.goldTint, borderRadius: 999, padding: '4px 10px' }}>{reviewExp.cost}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => removeFromPicks(reviewExp.id)} style={{ flex: 1, padding: '12px', fontSize: 13, fontWeight: 700, borderRadius: 14, border: '1.5px solid #FEE2E2', background: '#FFF5F5', color: '#EF4444', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    Remove
                  </button>
                  <button onClick={() => setReviewExp(null)} style={{ flex: 1, padding: '12px', fontSize: 13, fontWeight: 700, borderRadius: 14, border: 'none', background: `linear-gradient(135deg,${D.gold},#A8731E)`, color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>
                    Keep it ✓
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ════════════════════════════════════════════
     PHASE: SWIPE
  ════════════════════════════════════════════ */
  const allSwiped = experiences.length > 0 && allUnswiped.length === 0 && activeFilter === null;

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      style={{ background: D.bg, userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* ── Create with Lumi — full-width CTA (top) ── */}
      <button
        onClick={handleSkip}
        className="ed-cta-lumi"
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 12px 12px', borderRadius: 16, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#FF6A00,#FF8C3B)', marginBottom: 0, textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ flexShrink: 0 }}>
            <ellipse cx="14" cy="13" rx="6" ry="7.5" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.26)" strokeWidth="1"/>
            <ellipse cx="38" cy="13" rx="6" ry="7.5" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.26)" strokeWidth="1"/>
            <ellipse cx="14" cy="13" rx="3.2" ry="4.2" fill="rgba(255,170,120,0.28)"/>
            <ellipse cx="38" cy="13" rx="3.2" ry="4.2" fill="rgba(255,170,120,0.28)"/>
            <circle cx="26" cy="29" r="20" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.34)" strokeWidth="1.5"/>
            <ellipse cx="19.5" cy="26" rx="3.3" ry="3.3" fill="white"/>
            <ellipse cx="32.5" cy="26" rx="3.3" ry="3.3" fill="white"/>
            <circle cx="20.4" cy="26.6" r="1.8" fill="#1a0e08"/>
            <circle cx="33.4" cy="26.6" r="1.8" fill="#1a0e08"/>
            <circle cx="21.2" cy="25.7" r="0.7" fill="white"/>
            <circle cx="34.2" cy="25.7" r="0.7" fill="white"/>
            <ellipse cx="26" cy="31.5" rx="1.6" ry="1" fill="rgba(255,255,255,0.62)"/>
            <path d="M19 35.5 Q26 40.5 33 35.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
            <ellipse cx="14" cy="31" rx="3.8" ry="2.4" fill="rgba(255,140,100,0.22)"/>
            <ellipse cx="38" cy="31" rx="3.8" ry="2.4" fill="rgba(255,140,100,0.22)"/>
            <path d="M44 5L44.9 8.2L48.1 9.1L44.9 10L44 13.2L43.1 10L39.9 9.1L43.1 8.2Z" fill="rgba(255,255,255,0.88)"/>
            <circle cx="7" cy="9" r="1.3" fill="rgba(255,255,255,0.62)"/>
            <circle cx="46" cy="18" r="0.9" fill="rgba(255,255,255,0.5)"/>
          </svg>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.75)', fontFamily: "'DM Sans',sans-serif", textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>Don't want to swipe?</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', fontFamily: "'Sora',sans-serif", lineHeight: 1.15 }}>Create with Lumi</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: "'DM Sans',sans-serif", marginTop: 3 }}>Instantly build your full itinerary — no swiping needed.</div>
          </div>
        </div>
        <div className="ed-cta-arrow" style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 6 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </button>

      {/* ── separator ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0 12px' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(28,20,16,0.08)' }} />
        <span style={{ fontSize: 10, color: D.muted, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", letterSpacing: 0.6, whiteSpace: 'nowrap' }}>or explore &amp; swipe</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(28,20,16,0.08)' }} />
      </div>

      {/* ── Explored / Saved / Planned stats bar ── */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '10px 14px', marginBottom: 10, border: `0.5px solid ${D.border}`, boxShadow: D.cardShadow }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {/* Explored */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: D.muted, fontFamily: "'DM Sans',sans-serif", marginBottom: 5 }}>
              <span style={{ fontWeight: 700, color: '#1C1410' }}>{swipedIds.size}</span> of {experiences.length} explored
            </div>
            <div style={{ height: 5, borderRadius: 999, background: '#FFF3EB', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${experiences.length > 0 ? (swipedIds.size / experiences.length) * 100 : 0}%`, background: 'linear-gradient(90deg,#FF6A00,#FF8C3B)', borderRadius: 999, transition: 'width 0.3s ease' }} />
            </div>
          </div>
          <div style={{ width: 1, height: 34, background: 'rgba(28,20,16,0.08)', margin: '0 13px', flexShrink: 0 }} />
          {/* Saved */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill={likedIds.size > 0 ? '#FF6A00' : 'none'} stroke="#FF6A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1410', fontFamily: "'DM Sans',sans-serif", lineHeight: 1 }}>{likedIds.size}</div>
              <div style={{ fontSize: 10, color: D.muted, fontFamily: "'DM Sans',sans-serif" }}>Saved</div>
            </div>
          </div>
          <div style={{ width: 1, height: 34, background: 'rgba(28,20,16,0.08)', margin: '0 13px', flexShrink: 0 }} />
          {/* Planned */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1C1410', fontFamily: "'DM Sans',sans-serif", lineHeight: 1 }}>{Math.round(selectedHours)}h</div>
              <div style={{ fontSize: 10, color: D.muted, fontFamily: "'DM Sans',sans-serif" }}>Planned</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Category filter pills ── */}
      <div className="ed-cat-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, marginBottom: 13, scrollbarWidth: 'none' }}>
        <button onClick={() => setActiveFilter(null)} style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, border: `1.5px solid ${!activeFilter ? D.gold : D.border}`, background: !activeFilter ? D.goldTint : D.surface, color: !activeFilter ? D.gold : D.muted, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all 0.15s' }}>All</button>
        {availableCats.map(cat => {
          const cfg = catCfg(cat);
          const active = activeFilter === cat;
          const hasUnswiped = experiences.some(e => e.category === cat && !swipedIds.has(e.id));
          return (
            <button key={cat} className="ed-cat-pill"
              onClick={() => setActiveFilter(active ? null : cat)}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 999, border: `1.5px solid ${active ? cfg.color : D.border}`, background: active ? cfg.bg : D.surface, color: active ? cfg.color : (hasUnswiped ? D.muted : '#C8C4BE'), cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", opacity: hasUnswiped ? 1 : 0.55 }}
            >
              {renderCatIcon(cat, 12, active ? cfg.color : (hasUnswiped ? D.muted : '#C8C4BE'))}
              <span>{cat}</span>
              {!hasUnswiped && <span style={{ fontSize: 9, marginLeft: 1 }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* ── Card stack ── */}
      {allSwiped ? (
        <div style={{ height: 430, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: D.surface, borderRadius: 24, boxShadow: '0 4px 22px rgba(28,20,16,0.10)', border: `0.5px solid ${D.border}`, textAlign: 'center', padding: '2rem', animation: 'edFadeUp 0.4s ease both' }}>
          <img src={lumi5Img} alt="" style={{ height: 84, width: 'auto', marginBottom: 14, animation: 'edLumiFloat 2.5s ease-in-out infinite' }} />
          <div style={{ fontSize: 17, fontWeight: 800, color: D.espresso, fontFamily: "'Sora',sans-serif", marginBottom: 5 }}>All swiped! 🎉</div>
          <div style={{ fontSize: 12.5, color: D.muted, marginBottom: 22 }}>{likedIds.size} liked · ~{Math.round(selectedHours)}h of activities</div>
          <button onClick={() => setPhase('confirm')} style={{ padding: '11px 26px', fontSize: 14, fontWeight: 700, borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${D.gold},#A8731E)`, color: '#fff', fontFamily: "'Sora',sans-serif", boxShadow: '0 4px 16px rgba(201,145,58,0.28)' }}>
            See my picks →
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative', minHeight: 450, margin: '0 auto', maxWidth: 420 }}>
          {/* Render back-to-front */}
          {[...visibleCards].reverse().map(({ exp, stackIndex }) => (
            <SwipeCard
              key={exp.id}
              exp={exp}
              dragX={stackIndex === 0 ? dragX : 0}
              dragY={stackIndex === 0 ? dragY : 0}
              isDragging={stackIndex === 0 && isDragging}
              swipeOut={stackIndex === 0 ? swipeOut : null}
              isTop={stackIndex === 0}
              stackIndex={stackIndex}
              onPointerDown={handlePointerDown}
              destination={destination}
            />
          ))}
        </div>
      )}

      {/* ── Action buttons ── */}
      {!allSwiped && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 18 }}>
          {/* Pass */}
          <button
            className="ed-pass-btn"
            onClick={() => doSwipe('left')}
            disabled={!!swipeOut}
            style={{ width: 60, height: 60, borderRadius: '50%', border: '2px solid rgba(239,68,68,0.22)', background: '#FFF5F5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(239,68,68,0.10)', opacity: swipeOut ? 0.4 : 1 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>

          {/* Center: destination hint */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 12, color: D.gold, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>{destination}</div>
            <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>swipe to explore</div>
          </div>

          {/* Like */}
          <button
            className="ed-like-btn"
            onClick={() => doSwipe('right')}
            disabled={!!swipeOut}
            style={{ width: 60, height: 60, borderRadius: '50%', border: '2px solid rgba(34,197,94,0.3)', background: '#F0FDF4', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'edBtnGlow 2.5s ease-in-out infinite', boxShadow: '0 4px 16px rgba(34,197,94,0.18)', opacity: swipeOut ? 0.4 : 1 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#22C55E" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
      )}

      {/* ── Early-done CTA (shown after 5+ likes) ── */}
      {!allSwiped && likedIds.size >= 5 && (
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <button
            onClick={() => setPhase('confirm')}
            style={{ fontSize: 13, fontWeight: 700, padding: '10px 24px', borderRadius: 14, border: '1.5px solid rgba(255,106,0,0.28)', cursor: 'pointer', background: '#fff', color: '#FF6A00', fontFamily: "'Sora',sans-serif", boxShadow: '0 3px 12px rgba(255,106,0,0.12)', animation: 'edFadeUp 0.3s ease both' }}
          >
            Done — build my itinerary ({likedIds.size} picks) →
          </button>
        </div>
      )}

      {/* ── one-time intro overlay ── */}
      {false && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(28,20,16,0.55)', backdropFilter:'blur(6px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.25rem' }}
          onClick={dismissIntro}
        >
          <div
            style={{ background:'#fff', borderRadius:24, overflow:'hidden', width:'100%', maxWidth:400, boxShadow:'0 28px 80px rgba(28,20,16,0.28)', animation:'lumiExplorePop .45s cubic-bezier(0.34,1.3,0.64,1) both', position:'relative' }}
            onClick={e => e.stopPropagation()}
          >
            {/* top orange bar */}
            <div style={{ height:4, background:'linear-gradient(90deg,#FF6A00,#FF8C3B,#FF6A00)' }} />

            {/* X close */}
            <button onClick={dismissIntro} style={{ position:'absolute', top:14, right:14, width:28, height:28, borderRadius:'50%', border:'none', background:'#F3F4F6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, zIndex:1 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            {/* ── SLIDE 0 ── */}
            {introStep === 0 && (
              <div key="es0" style={{ animation:'edSlideNext 0.3s ease both' }}>
                <div style={{ padding:'1.2rem 1.25rem 0.6rem' }}>
                  <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'#FFF3EB', borderRadius:999, padding:'3px 9px', marginBottom:8 }}>
                    <div style={{ width:5, height:5, borderRadius:'50%', background:'#FF6A00' }} />
                    <span style={{ fontSize:9.5, fontWeight:700, color:'#FF6A00', letterSpacing:.8, textTransform:'uppercase', fontFamily:"'DM Sans',sans-serif" }}>Lumi says</span>
                  </div>
                  <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, color:'#1C1410', lineHeight:1.25, marginBottom:6 }}>Your Personal Travel Curator</div>
                  <div style={{ fontSize:12, color:'#5C504A', lineHeight:1.62 }}>Your swipes shape your trip. Unlike rigid AI, Lumi crafts a <strong style={{ color:'#1C1410' }}>personalised, flexible itinerary</strong> you can modify anytime.</div>
                </div>
                <div style={{ display:'flex', alignItems:'flex-end', padding:'0 1.25rem 0', gap:12 }}>
                  <div style={{ width:88, flexShrink:0, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
                    <img src={lumi15Img} alt="Lumi" style={{ width:'auto', height:110, objectFit:'contain', display:'block' }} />
                  </div>
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6, paddingBottom:'0.7rem', paddingTop:'0.25rem' }}>
                    {['Built around your tastes', 'Fully modifiable after creation', 'Not a one-size-fits-all AI plan'].map((f, i) => (
                      <div key={i} style={{ display:'flex', gap:8, alignItems:'center', padding:'7px 10px', borderRadius:10, border:'1.5px solid rgba(255,106,0,0.25)', background:'#FFF8F4' }}>
                        <svg width="8" height="8" viewBox="0 0 12 10" fill="none" style={{ flexShrink:0 }}><polyline points="1,5 4,8 11,1" stroke="#FF6A00" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span style={{ fontSize:11, color:'#1C1410', fontWeight:700, lineHeight:1.35, fontFamily:"'DM Sans',sans-serif" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── SLIDE 1 ── */}
            {introStep === 1 && (
              <div key="es1" style={{ animation:'edSlideNext 0.3s ease both', padding:'1.25rem 1.25rem 0.5rem' }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
                  <div style={{ width:52, height:52, borderRadius:16, background:'#FFF3EB', display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid rgba(255,106,0,0.2)' }}>
                    <span style={{ fontSize:26 }}>🗺️</span>
                  </div>
                </div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, color:'#1C1410', lineHeight:1.25, marginBottom:6 }}>Your Itinerary = Your Picks</div>
                <div style={{ fontSize:12, color:'#5C504A', lineHeight:1.62, marginBottom:12 }}>Every swipe right becomes part of your trip. Lumi balances experiences, meals, and free time — <strong style={{ color:'#1C1410' }}>perfectly tailored to you</strong>.</div>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                  {['🏛️ Attractions','🍽️ Food','💎 Hidden Gems','🎯 Adventure','🌙 Nightlife','🌿 Local Life'].map(t => (
                    <span key={t} style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:999, background:'#FFF3EB', color:'#FF6A00', border:'1.5px solid rgba(255,106,0,0.22)', fontFamily:"'DM Sans',sans-serif" }}>{t}</span>
                  ))}
                </div>
              </div>
            )}

            {/* ── SLIDE 2 ── */}
            {introStep === 2 && (
              <div key="es2" style={{ animation:'edSlideNext 0.3s ease both', padding:'1.25rem 1.25rem 0.5rem' }}>
                <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
                  <div style={{ width:52, height:52, borderRadius:16, background:'#FFF3EB', display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid rgba(255,106,0,0.2)' }}>
                    <span style={{ fontSize:26 }}>📍</span>
                  </div>
                </div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, color:'#1C1410', lineHeight:1.25, marginBottom:6 }}>Discover What's Nearby</div>
                <div style={{ fontSize:12, color:'#5C504A', lineHeight:1.62, marginBottom:12 }}>Once your itinerary is built, explore a curated <strong style={{ color:'#1C1410' }}>Nearby section</strong> — local gems, hidden cafes, and must-try spots right where you'll be.</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {['Local shops & cafes near your stay', 'Points of interest on your route', 'Insider picks from local knowledge'].map((f, i) => (
                    <div key={i} style={{ display:'flex', gap:8, alignItems:'center', padding:'7px 10px', borderRadius:10, border:'1.5px solid rgba(255,106,0,0.25)', background:'#FFF8F4' }}>
                      <svg width="8" height="8" viewBox="0 0 12 10" fill="none" style={{ flexShrink:0 }}><polyline points="1,5 4,8 11,1" stroke="#FF6A00" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      <span style={{ fontSize:11, color:'#1C1410', fontWeight:700, lineHeight:1.35, fontFamily:"'DM Sans',sans-serif" }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* dots + CTA */}
            <div style={{ padding:'0.75rem 1.25rem 1.25rem', display:'flex', flexDirection:'column', gap:10, alignItems:'center' }}>
              <div style={{ display:'flex', gap:7, alignItems:'center' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ height:6, borderRadius:999, background: i===introStep ? '#FF6A00' : '#FFD4B8', width: i===introStep ? 20 : 6, transition:'all 0.25s cubic-bezier(0.2,0.7,0.2,1)' }} />
                ))}
              </div>
              <button
                onClick={introStep < 2 ? () => setIntroStep(s => s + 1) : dismissIntro}
                style={{ width:'100%', padding:'13px', fontSize:14, fontWeight:700, borderRadius:14, border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", background:'linear-gradient(135deg,#FF6A00,#FF8C3B)', color:'#fff', boxShadow:'0 4px 16px rgba(255,106,0,0.3)' }}
              >
                {introStep < 2 ? 'Next →' : "Let's Explore! 🎉"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
