import { useState, useRef, useEffect } from 'react';
import { normalizeMembers } from '../shared/constants';
import { S } from '../shared/styles';
import { Spinner } from '../shared/ui';
import { PlacePhoto, PlacePhotosStrip, PlacePhotoCarousel } from '../media/PlaceMedia';
import RecommendationsPage from './RecommendationsPage';
import { fetchRecommendations, generateLocalTaste, fetchDestinationLocalTime } from '../../api';
import lumi15Img from '../../assets/lumi15.png';
import lumi17Img from '../../assets/lumi17.png';
import lumi4Img from '../../assets/Lumi4_bgless.png';
import lumi19Img from '../../assets/lumi19.png';
import ExperienceDiscovery from './ExperienceDiscovery';

/* -- Category colours (for My Selections sheet) ------------- */
const EXP_CAT = {
  'Attractions':       { bg: '#EEF2FF', color: '#4F46E5', emoji: '???' },
  'Food':              { bg: '#FEF3C7', color: '#D97706', emoji: '???' },
  'Cafes':             { bg: '#FDF2F8', color: '#DB2777', emoji: '?' },
  'Hidden Gems':       { bg: '#ECFDF5', color: '#059669', emoji: '??' },
  'Adventure':         { bg: '#FFF7ED', color: '#EA580C', emoji: '??' },
  'Shopping':          { bg: '#FFF1F2', color: '#BE123C', emoji: '???' },
  'Nightlife':         { bg: '#F5F3FF', color: '#7C3AED', emoji: '??' },
  'Culture':           { bg: '#FFFBEB', color: '#B45309', emoji: '??' },
  'Viewpoints':        { bg: '#EFF6FF', color: '#2563EB', emoji: '??' },
  'Local Experiences': { bg: '#F7FEE7', color: '#4D7C0F', emoji: '??' },
  'Party':             { bg: '#FDF4FF', color: '#9333EA', emoji: '??' },
};
function expCatCfg(c) { return EXP_CAT[c] || { bg: '#F4F2EE', color: '#8A7E76', emoji: '??' }; }

function renderExpCatIcon(category, size = 13, color = 'currentColor') {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', style: { display: 'block', flexShrink: 0 } };
  switch (category) {
    case 'Attractions': return <svg {...p}><path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><path d="M9 21v-6h6v6"/></svg>;
    case 'Food': return <svg {...p}><path d="M3 2v7c0 1.1.9 2 2 2a2 2 0 0 0 2-2V2"/><line x1="5" y1="12" x2="5" y2="22"/><path d="M15 2v20M15 2a5 5 0 0 1 5 5v2a5 5 0 0 1-5 5"/></svg>;
    case 'Cafes': return <svg {...p}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/></svg>;
    case 'Hidden Gems': return <svg {...p}><path d="M6 3h12l4 6-10 13L2 9z"/><line x1="2" y1="9" x2="22" y2="9"/></svg>;
    case 'Adventure': return <svg {...p}><path d="M3 17l6-11 4 7 3-4 5 8H3z"/></svg>;
    case 'Shopping': return <svg {...p}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
    case 'Nightlife': return <svg {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
    case 'Culture': return <svg {...p}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
    case 'Viewpoints': return <svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'Local Experiences': return <svg {...p}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>;
    case 'Party': return <svg {...p} fill={color} stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    default: return <svg {...p}><circle cx="12" cy="12" r="8"/></svg>;
  }
}

/* -- Selected-experiences localStorage (survives refresh, per trip) -- */
function _selExpsKey(id) { return `tb_sel_exps_${id}`; }
function loadSelExps(id) {
  try { return JSON.parse(localStorage.getItem(_selExpsKey(id)) || 'null') || []; } catch { return []; }
}
function saveSelExps(id, exps) {
  try { localStorage.setItem(_selExpsKey(id), JSON.stringify(exps || [])); } catch {}
}

/* -- Itinerary-built marker: set whenever user triggers generation (swipe OR Lumi) -- */
function _itinDoneKey(id) { return `tb_itin_done_${id}`; }
function isItinDone(id)   { try { return !!localStorage.getItem(_itinDoneKey(id)); } catch { return false; } }
function markItinDone(id) { try { localStorage.setItem(_itinDoneKey(id), '1'); } catch {} }
function clearItinDone(id){ try { localStorage.removeItem(_itinDoneKey(id)); } catch {} }

/* -- Day-Planner step persistence: survives refresh so user stays on the same page -- */
function _plannerStepKey(id) { return `tb_pstep_${id}`; }
function loadPlannerStep(id) { try { return localStorage.getItem(_plannerStepKey(id)); } catch { return null; } }
function savePlannerStep(id, s) { try { localStorage.setItem(_plannerStepKey(id), s); } catch {} }
function clearPlannerStep(id)  { try { localStorage.removeItem(_plannerStepKey(id)); } catch {} }

/* -- Premium design tokens ----------------------------------- */
const D = {
  bg:        '#FAF8F4',
  surface:   '#FFFFFF',
  espresso:  '#1C1410',
  gold:      '#C9913A',
  goldTint:  '#FDF3E3',
  sage:      '#7A9E7E',
  sageTint:  '#EBF3EC',
  coral:     '#E8715A',
  coralTint: '#FDF0EE',
  blueTint:  '#E6F1FB',
  neutral:   '#F4F2EE',
  muted:     '#8A7E76',
  secondary: '#5C504A',
  divider:   'rgba(28,20,16,0.06)',
  border:    'rgba(28,20,16,0.08)',
  cardShadow:'0 2px 8px rgba(28,20,16,0.06)',
};

function parseClockToMinutes(value) {
  if (!value || typeof value !== 'string') return null;
  const txt = value.trim().toUpperCase();
  const m = txt.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (!m) return null;
  let hours = parseInt(m[1], 10);
  const mins = parseInt(m[2] || '0', 10);
  const period = m[3];
  if (Number.isNaN(hours) || Number.isNaN(mins)) return null;
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
}

function getActivityTimeProgress(time, endTime, nowMinutes) {
  const start = parseClockToMinutes(time);
  const end = parseClockToMinutes(endTime);
  if (start === null || end === null || end <= start) return null;
  if (nowMinutes <= start) return 0;
  if (nowMinutes >= end) return 1;
  return (nowMinutes - start) / (end - start);
}

function getActivityLiveState(time, endTime, nowMinutes) {
  const p = getActivityTimeProgress(time, endTime, nowMinutes);
  if (p === null) return 'unknown';
  if (p <= 0) return 'upcoming';
  if (p >= 1) return 'past';
  return 'active';
}

function getZonedNow(nowMs, timeZone) {
  const baseDate = new Date(nowMs);
  if (!timeZone) {
    const hours = baseDate.getHours();
    const minutes = baseDate.getMinutes();
    return {
      hours,
      minutes,
      label: baseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }
  try {
    const numericParts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(baseDate);
    const hourPart = numericParts.find(p => p.type === 'hour')?.value;
    const minutePart = numericParts.find(p => p.type === 'minute')?.value;
    const hours = parseInt(hourPart || '0', 10);
    const minutes = parseInt(minutePart || '0', 10);
    const label = new Intl.DateTimeFormat([], {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(baseDate);
    return {
      hours: Number.isNaN(hours) ? baseDate.getHours() : hours,
      minutes: Number.isNaN(minutes) ? baseDate.getMinutes() : minutes,
      label,
    };
  } catch {
    return {
      hours: baseDate.getHours(),
      minutes: baseDate.getMinutes(),
      label: baseDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }
}

/* -- CSS keyframe injection (pulse dot + card entry + shimmer) -- */
if (typeof document !== 'undefined' && !document.getElementById('itinerary-styles')) {
  const el = document.createElement('style');
  el.id = 'itinerary-styles';
  el.textContent = `
    @keyframes dotPulse {
      0%,100% { transform: scale(1);   opacity: 1; }
      50%      { transform: scale(1.6); opacity: 0.8; }
    }
    @keyframes glowPulse {
      0%,100% { transform: scale(1);   opacity: 0.25; }
      50%      { transform: scale(1.9); opacity: 0; }
    }
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    @keyframes floatBadge {
      0%,100% { transform: translateY(0px); }
      50%      { transform: translateY(-3px); }
    }
    @keyframes fadeSlideUp {
      from { opacity:0; transform:translateY(10px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes rSheetIn { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
    @keyframes rFadeIn  { from{opacity:0} to{opacity:1} }
    .itin-card-enter { animation: cardIn 0.38s cubic-bezier(0.34,1.3,0.64,1) both; }
    .itin-dot-active  { animation: dotPulse 1.4s ease-in-out infinite; }
    .itin-dot-glow    { animation: glowPulse 1.4s ease-in-out infinite; }
    .itin-float       { animation: floatBadge 3s ease-in-out infinite; }
    .itin-shimmer     {
      background: linear-gradient(90deg,#f0ede8 25%,#e8e4dc 50%,#f0ede8 75%);
      background-size: 800px 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }
    @keyframes checkPop {
      0%   { transform: scale(0.4); opacity: 0; }
      60%  { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(1);   opacity: 1; }
    }
    @keyframes sectionIn {
      from { opacity: 0; transform: translateX(-10px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .itin-photo-card:hover { transform: translateY(-2px) scale(1.008); box-shadow: 0 10px 36px rgba(28,20,16,0.14) !important; }
    .itin-photo-card { transition: transform 0.22s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.22s ease; }
    .itin-action-pill:hover { transform: scale(1.05); filter: brightness(0.96); }
    .itin-action-pill { transition: transform 0.15s ease, filter 0.15s ease; }
    .itin-done-btn { transition: all 0.18s cubic-bezier(0.34,1.56,0.64,1); }
    .itin-done-btn.checked { animation: checkPop 0.28s cubic-bezier(0.34,1.56,0.64,1) both; }
    .itin-sec-header { animation: sectionIn 0.32s ease both; }
    .itin-taste-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(28,20,16,0.12) !important; }
    .itin-taste-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
    @keyframes tipsBulbPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(245,217,168,0.72), 0 2px 10px rgba(0,0,0,0.28); }
      50%       { box-shadow: 0 0 0 10px rgba(245,217,168,0), 0 4px 18px rgba(0,0,0,0.32); }
    }
    .tips-bulb-btn { animation: tipsBulbPulse 2.6s ease-in-out infinite; transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), background 0.2s ease !important; }
    .tips-bulb-btn:hover { transform: scale(1.14) !important; background: rgba(255,255,255,0.26) !important; }
    @keyframes tipsSheetIn { from { opacity:0; transform:translateY(38px); } to { opacity:1; transform:translateY(0); } }
    @keyframes dayHeaderIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    .day-header-card { animation: dayHeaderIn 0.3s ease both; }
    @keyframes welcomePopIn {
      0%   { opacity:0; transform:scale(0.88) translateY(22px); }
      65%  { transform:scale(1.02) translateY(-2px); }
      100% { opacity:1; transform:scale(1) translateY(0); }
    }
    @keyframes welcomeFadeIn { from{opacity:0} to{opacity:1} }
    @keyframes statCountUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes heroGlow {
      0%,100% { box-shadow: 0 4px 20px rgba(28,20,16,0.18); }
      50%      { box-shadow: 0 8px 40px rgba(201,145,58,0.28); }
    }
    .itin-hero-card { animation: heroGlow 4s ease-in-out infinite; }
    @keyframes actCardIn {
      from { opacity:0; transform:translateX(-8px); }
      to   { opacity:1; transform:translateX(0); }
    }
    .itin-act-enter { animation: actCardIn 0.3s cubic-bezier(0.2,0.7,0.2,1) both; }
    @keyframes accordionSlide {
      from { opacity:0; transform:translateY(-8px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes detailSheetIn {
      from { transform:translateY(100%); }
      to   { transform:translateY(0); }
    }
    .act-card-compact { transition: transform 0.15s ease, box-shadow 0.15s ease; }
    .act-card-compact:active { transform: scale(0.985) !important; }
    @keyframes closingSlide {
      from { opacity:0; transform:translateX(10px); }
      to   { opacity:1; transform:translateX(0); }
    }
    @keyframes timelineFlow {
      0%   { box-shadow: 0 0 0 0 rgba(201,145,58,0.42); }
      70%  { box-shadow: 0 0 0 9px rgba(201,145,58,0); }
      100% { box-shadow: 0 0 0 0 rgba(201,145,58,0); }
    }
    @keyframes nowSweep {
      0% { transform: translateX(-110%); }
      100% { transform: translateX(210%); }
    }
    .itin-now-dot { animation: timelineFlow 1.6s ease-in-out infinite; }
    .itin-live-bar {
      position: relative;
      overflow: hidden;
    }
    .itin-live-bar::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.45) 50%, transparent 70%);
      animation: nowSweep 2.2s linear infinite;
      pointer-events: none;
    }
    @keyframes liveCardBreath {
      0%,100% { transform: translateY(0); box-shadow: 0 2px 10px rgba(28,20,16,0.08); }
      50% { transform: translateY(-1px); box-shadow: 0 10px 26px rgba(201,145,58,0.22); }
    }
    @keyframes walkerStep {
      0%,100% { transform: translateY(0); }
      50% { transform: translateY(-2px); }
    }
    .itin-live-active-card {
      border-color: rgba(201,145,58,0.52) !important;
      animation: liveCardBreath 2.4s ease-in-out infinite;
    }
    .itin-live-walker { animation: walkerStep 1.15s ease-in-out infinite; }
    .day-closing-card { animation: closingSlide 0.35s ease both; }
    .itin-day-wrap { position:relative; }
    .itin-day-wrap::before {
      content:''; position:absolute; left:61px; top:0; bottom:0;
      width:1.5px; background:linear-gradient(to bottom,rgba(201,145,58,0.15),rgba(201,145,58,0.04));
      pointer-events:none; z-index:0;
    }
  `;
  document.head.appendChild(el);
}

/* -- Lightbox ----------------------------------------------- */
function Lightbox({ url, onClose }) {
  if (!url) return null;
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, cursor: 'zoom-out' }}
    >
      <img
        src={url}
        alt=""
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 14, objectFit: 'contain', boxShadow: '0 8px 48px rgba(0,0,0,0.6)' }}
      />
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      >?</button>
    </div>
  );
}

/* Tag colour resolver */
function tagStyle(tag, mustDo) {
  if (mustDo || ['must do','must-do','must-try','iconic'].includes(tag.toLowerCase()))
    return { bg: D.goldTint, color: D.gold };
  const t = tag.toLowerCase();
  if (['heritage','cultural','culture','historic','offbeat'].some(k => t.includes(k)))
    return { bg: D.blueTint, color: '#2563AB' };
  if (['scenic','nature','park','beach','lake'].some(k => t.includes(k)))
    return { bg: D.sageTint, color: '#3A7A42' };
  if (['easy'].includes(t))  return { bg: D.sageTint,  color: '#3A7A42' };
  if (['moderate'].includes(t)) return { bg: '#FFF8E6', color: '#A0761C' };
  if (['strenuous','hard'].some(k => t.includes(k))) return { bg: D.coralTint, color: D.coral };
  return { bg: D.neutral, color: D.muted };
}
function LocalTastePage({ destination, isSolo, autoData, autoStep, onRetry }) {
  const [step, setStep] = useState(autoStep || 'idle');
  const [data, setData] = useState(autoData || null);
  const [dest, setDest] = useState(destination || '');
  const [doneItems, setDoneItems] = useState(new Set());
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ minRating: 0 });
  const [filterDraft, setFilterDraft] = useState({ minRating: 0 });
  const [activeTab, setActiveTab] = useState('dishes');
  const [tabDir, setTabDir] = useState('right');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const TASTE_TAB_ORDER = ['dishes', 'places', 'exp'];
  const switchTasteTab = (key) => {
    const dir = TASTE_TAB_ORDER.indexOf(key) > TASTE_TAB_ORDER.indexOf(activeTab) ? 'right' : 'left';
    setTabDir(dir);
    setActiveTab(key);
  };

  useEffect(() => {
    if (autoStep && autoStep !== step) setStep(autoStep);
    if (autoData && !data) setData(autoData);
  }, [autoStep, autoData]);

  useEffect(() => {
    const handler = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const generate = async () => {
    if (!dest.trim()) return;
    if (onRetry && dest === destination) { onRetry(); return; }
    setStep('loading');
    setDoneItems(new Set());
    try {
      const { generateLocalTaste } = await import('../../api');
      const r = await generateLocalTaste({ destination: dest });
      setData(r);
      setStep('result');
    } catch {
      setData({ headline: `${dest} � Local Flavours`, tagline: 'Curated picks', dishes: [], places: [], experiences: [], tip: '' });
      setStep('result');
    }
  };

  const toggleDone = key => setDoneItems(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleExpand = key => setExpandedItems(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const renderStars = (rating) => {
    if (!rating) return null;
    const r = parseFloat(rating);
    if (isNaN(r)) return null;
    const full = Math.floor(r);
    const half = r - full >= 0.3;
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < full) stars.push('?');
      else if (i === full && half) stars.push('�');
      else stars.push('?');
    }
    return (
      <span style={{ fontSize: 12, letterSpacing: 1 }}>
        <span style={{ color: '#E6A817' }}>{stars.slice(0, full + (half ? 1 : 0)).join('')}</span>
        <span style={{ color: '#D3D1C7' }}>{stars.slice(full + (half ? 1 : 0)).join('')}</span>
        <span style={{ fontFamily: "'DM Sans',sans-serif", color: D.muted, marginLeft: 4, fontSize: 11 }}>{r.toFixed(1)}</span>
      </span>
    );
  };

  const tastTagBg = t => {
    const tl = t.toLowerCase();
    if (['must-try','must-do','iconic','legendary','signature'].includes(tl)) return { bg: D.goldTint, color: D.gold };
    if (['heritage','traditional','authentic','artisan'].includes(tl)) return { bg: D.blueTint, color: '#2563AB' };
    if (['street food','casual','quick bite'].includes(tl)) return { bg: D.coralTint, color: D.coral };
    if (['vegetarian','vegan'].includes(tl)) return { bg: D.sageTint, color: '#3A7A42' };
    return { bg: D.neutral, color: D.muted };
  };

  const accentColor = isSolo ? '#7F77DD' : '#1D9E75';

  /* -- Veg / Non-veg dot -- */
  const VegDot = ({ item }) => {
    const str = ((item.tags || []).join(' ') + ' ' + (item.desc || '') + ' ' + (item.name || '')).toLowerCase();
    const isVeg    = /\bveg\b|vegetarian|paneer|sabzi|dal |aloo|gobi|palak|chole|rajma|dosa|idli|pongal|dhokla|poha|chaat|lassi/.test(str);
    const isNonVeg = /non.?veg|chicken|mutton|lamb|fish|prawn|seafood|\begg\b|keema|rogan|kebab|tandoori chicken|crab|lobster/.test(str);
    if (!isVeg && !isNonVeg) return null;
    const veg = isVeg && !isNonVeg;
    return (
      <div title={veg ? 'Vegetarian' : 'Non-vegetarian'} style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${veg ? '#2E7D32' : '#C62828'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 4 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: veg ? '#2E7D32' : '#C62828' }} />
      </div>
    );
  };

  /* -- Premium item card -- */
  const renderTasteCard = ({ item, secKey, index, photoSuffix, startIndex }) => {
    const key = `${secKey}-${index}`;
    const isDone = doneItems.has(key);
    const isExpanded = expandedItems.has(key);
    const descLong = (item.desc || '').length > 130;

    return (
      <div
        key={key}
        className="itin-card-enter itin-taste-card"
        style={{
          background: D.surface,
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 12,
          boxShadow: '0 2px 8px rgba(28,20,16,0.06)',
          border: `0.5px solid ${D.border}`,
          opacity: isDone ? 0.5 : 1,
          filter: isDone ? 'grayscale(0.5) blur(0.4px)' : 'none',
          transition: 'opacity 0.3s ease, filter 0.3s ease',
          animationDelay: `${index * 70}ms`,
        }}
      >
        {/* Photo at top � full width, clickable */}
        <div
          style={{ position: 'relative', height: 160, cursor: 'zoom-in', overflow: 'hidden', background: D.neutral }}
          onClick={e => { const img = e.currentTarget.querySelector('img'); if (img?.src) setLightboxUrl(img.src); }}
        >
          <PlacePhoto
            query={`${item.name} ${dest} ${photoSuffix}`}
            style={{ height: 160, borderRadius: 0 }}
            delay={index * 60}
          />
          {/* bottom gradient on photo */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 35%, rgba(28,20,16,0.72) 100%)', pointerEvents: 'none' }} />
          {/* done overlay tick */}
          {isDone && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,20,16,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(1px)' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <polyline points="4,12 9,17 20,7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          )}
          {/* name + veg dot overlaid on photo gradient */}
          <div style={{ position: 'absolute', bottom: 10, left: 12, right: 52, pointerEvents: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2, textShadow: '0 1px 6px rgba(0,0,0,0.55)', fontFamily: "'Sora',sans-serif", textDecoration: isDone ? 'line-through' : 'none', flex: 1 }}>
                {item.name}
              </span>
              {secKey === 'dishes' && (() => {
                const str = ((item.tags||[]).join(' ')+' '+(item.desc||'')+' '+(item.name||'')).toLowerCase();
                const veg = /\bveg\b|vegetarian|paneer|sabzi|dal |aloo|gobi|palak|chole|rajma|dosa|idli|dhokla|poha|chaat|lassi/.test(str) && !/non.?veg|chicken|mutton|lamb|fish|prawn|seafood|\begg\b|keema|kebab|crab|lobster/.test(str);
                const nonVeg = /non.?veg|chicken|mutton|lamb|fish|prawn|seafood|\begg\b|keema|rogan|kebab|crab|lobster/.test(str);
                if (!veg && !nonVeg) return null;
                return (
                  <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${veg ? '#4CAF50' : '#EF5350'}`, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: veg ? '#2E7D32' : '#C62828' }} />
                  </div>
                );
              })()}
            </div>
          </div>
          {/* done button over photo */}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); toggleDone(key); }}
            style={{
              position: 'absolute', bottom: 10, right: 10,
              display: 'flex', alignItems: 'center', gap: 5,
              padding: isDone ? '5px 11px 5px 8px' : '5px 10px',
              borderRadius: 999,
              border: isDone ? 'none' : '1.5px solid rgba(255,255,255,0.6)',
              background: isDone ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: isDone ? '0 2px 10px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            {isDone ? (
              <>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="6.5" fill={accentColor}/>
                  <polyline points="3.5,6.5 5.5,8.5 9.5,4.5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, fontFamily: "'DM Sans',sans-serif" }}>Done</span>
              </>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/>
              </svg>
            )}
          </button>
        </div>

        {/* Card body */}
        <div style={{ padding: '12px 14px 13px' }}>
          {/* Rating + price + best time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 7 }}>
            {item.rating && renderStars(item.rating)}
            {item.priceRange && (
              <span style={{ fontSize: 11, fontWeight: 700, color: D.gold, background: D.goldTint, borderRadius: 999, padding: '2px 8px' }}>{item.priceRange}</span>
            )}
            {item.bestTime && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#0F6E56', background: D.sageTint, borderRadius: 999, padding: '2px 8px' }}>?? {item.bestTime}</span>
            )}
          </div>

          {/* Description with expand */}
          <div style={{ fontSize: 12.5, color: D.secondary, lineHeight: 1.65, marginBottom: 8 }}>
            {isExpanded || !descLong ? item.desc : `${item.desc.slice(0, 130)}�`}
            {descLong && (
              <span
                onClick={() => toggleExpand(key)}
                style={{ color: D.gold, fontWeight: 600, cursor: 'pointer', marginLeft: 4, fontSize: 12 }}
              >
                {isExpanded ? ' less' : ' more'}
              </span>
            )}
          </div>

          {/* Tags + Know More inline */}
          {(item.tags || []).length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 2, alignItems: 'center' }}>
              {item.tags.map(t => {
                const c = tastTagBg(t);
                return (
                  <span key={t} style={{ fontSize: 10, fontWeight: 700, letterSpacing: .6, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', background: isDone ? D.neutral : c.bg, color: isDone ? D.muted : c.color }}>
                    {t}
                  </span>
                );
              })}
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(item.name + ' ' + dest)}`}
                target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                title="Know more"
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: D.goldTint, border: `1px solid rgba(201,145,58,0.25)`, color: D.gold, textDecoration: 'none', flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </a>
            </div>
          )}
        </div>
      </div>
    );
  };

  /* -- Section block with editorial header -- */
  const renderSec = ({ icon, title, subtitle, items, secKey, startIndex = 0, photoSuffix = 'photo', accentBg, accentColor: ac, sectionRef, onFilter, filterCount: secFilterCount = 0 }) => {
    const doneCount = items.filter((_, i) => doneItems.has(`${secKey}-${i}`)).length;
    if (!items.length) return null;
    return (
      <div style={{ marginBottom: '1.9rem' }}>
        {/* Section header � matches Nearby style */}
        <div className="itin-sec-header" style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
          background: D.surface, borderRadius: 16, padding: '12px 14px',
          boxShadow: '0 2px 12px rgba(28,20,16,0.07)', border: `0.5px solid ${D.border}`,
          borderLeft: `4px solid ${ac}`,
        }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ac} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: D.espresso, fontFamily: "'Sora',sans-serif", lineHeight: 1.1 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: D.muted, marginTop: 2, lineHeight: 1.3 }}>{subtitle}</div>}
          </div>
          {onFilter && (
            <button onClick={onFilter} style={{ position: 'relative', flexShrink: 0, width: 34, height: 34, borderRadius: 11, border: `1.5px solid ${secFilterCount > 0 ? ac : 'rgba(28,20,16,0.12)'}`, background: secFilterCount > 0 ? accentBg : '#FAFAF8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={secFilterCount > 0 ? ac : '#888'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              {secFilterCount > 0 && (
                <span style={{ position: 'absolute', top: -5, right: -5, width: 15, height: 15, borderRadius: '50%', background: ac, color: '#fff', fontSize: 8, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>{secFilterCount}</span>
              )}
            </button>
          )}
        </div>
        {/* Cards */}
        {items.map((item, i) => renderTasteCard({ item, secKey, index: i, photoSuffix, startIndex }))}
      </div>
    );
  };

  if (step === 'loading') return <Spinner text={`Discovering the local life of ${dest}�`} solo={isSolo} />;

  const filterCount = filters.minRating > 0 ? 1 : 0;
  const TASTE_RATINGS = [{v:0,l:'Any'},{v:3,l:'3+'},{v:3.5,l:'3.5+'},{v:4,l:'4+'},{v:4.5,l:'4.5+'}];

  if (step === 'result' && data) return (
    <div style={{ background: D.bg, paddingBottom: '1.5rem', position: 'relative' }}>
      <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      {/* -- Filter Modal -- */}
      {filterOpen && (
        <div style={{ position:'fixed',inset:0,background:'rgba(14,16,24,0.45)',zIndex:600,display:'flex',alignItems:'flex-end',justifyContent:'center' }}
          onClick={e => { if (e.target === e.currentTarget) setFilterOpen(false); }}>
          <div style={{ width:'100%',maxWidth:560,background:'#fff',borderRadius:'24px 24px 0 0',padding:'1.1rem 1.1rem 2rem',boxShadow:'0 -8px 40px rgba(0,0,0,0.18)',animation:'rSheetIn 0.28s cubic-bezier(0.2,0.7,0.2,1) both' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
              <div style={{ fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:800 }}>Filter Local Life</div>
              <button onClick={() => setFilterOpen(false)} style={{ width:30,height:30,borderRadius:'50%',border:'1px solid rgba(0,0,0,0.1)',background:'rgba(0,0,0,0.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#6b6b68',padding:0 }}>?</button>
            </div>
            <div style={{ background:'#FDFCFA',borderRadius:16,padding:'13px 14px',marginBottom:16,border:'1px solid rgba(28,20,16,0.07)' }}>
              <div style={{ fontSize:11,color:D.muted,marginBottom:6,fontWeight:600 }}>Min rating</div>
              <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                {TASTE_RATINGS.map(f => (
                  <button key={f.v} onClick={() => setFilterDraft(p => ({...p,minRating:f.v}))}
                    style={{ fontSize:12,fontWeight:700,padding:'7px 14px',borderRadius:999,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",border:`1.5px solid ${filterDraft.minRating===f.v?D.gold:'rgba(28,20,16,0.13)'}`,background:filterDraft.minRating===f.v?D.goldTint:'#FAFAF8',color:filterDraft.minRating===f.v?D.gold:'#7A7470' }}>
                    {f.v===0?'Any':'? '+f.l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex',gap:8 }}>
              <button onClick={() => setFilterDraft({minRating:0})} style={{ flex:1,padding:'12px',fontSize:13,fontWeight:700,borderRadius:14,border:'1px solid rgba(0,0,0,0.1)',background:'rgba(0,0,0,0.04)',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",color:'#444' }}>Reset</button>
              <button onClick={() => { setFilters(filterDraft); setFilterOpen(false); }} style={{ flex:2,padding:'12px',fontSize:13,fontWeight:700,borderRadius:14,border:'none',background:`linear-gradient(135deg,${D.gold},#A8731E)`,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",color:'#fff' }}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* -- Hero banner -- */}
      <div style={{
        position: 'relative', minHeight: 140, borderRadius: 16, overflow: 'hidden',
        background: 'linear-gradient(135deg, #2C1810 0%, #8B5E3C 50%, #C9913A 100%)',
        marginBottom: '1.25rem', boxShadow: '0 4px 20px rgba(28,20,16,0.18)',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 130, opacity: 0.06, lineHeight: 1 }}>??</div>
        <div style={{ position: 'relative', zIndex: 1, padding: '1.25rem 1.25rem 1rem' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 1.8, marginBottom: 6, fontFamily: "'DM Sans',sans-serif" }}>
            LOCAL LIFE GUIDE
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: -0.3, marginBottom: 4, fontFamily: "'Sora',sans-serif" }}>
            Local life in <span style={{ color: '#F5D9A8' }}>{destination}</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)', lineHeight: 1.6, marginBottom: 14 }}>
            The food. The streets. The moments.
          </div>
          {/* Stat buttons � click to switch active tab */}
          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            {[
              { n: (data.dishes||[]).length,      label:'dishes',      key:'dishes' },
              { n: (data.places||[]).length,      label:'places',      key:'places' },
              { n: (data.experiences||[]).length, label:'experiences', key:'exp' },
            ].map(({ n, label, key }) => n > 0 && (
              <button key={key} onClick={() => switchTasteTab(key)}
                style={{ flex:1, background: activeTab === key ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.13)', border: activeTab === key ? '1.5px solid rgba(255,255,255,0.65)' : '0.5px solid rgba(255,255,255,0.22)', backdropFilter:'blur(6px)', borderRadius:999, padding:'5px 8px', display:'flex', gap:5, alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s ease' }}
              >
                <span style={{ fontSize:13, fontWeight:800, color:'#fff' }}>{n}</span>
                <span style={{ fontSize:11, color: activeTab === key ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* -- Active section (tab-switched with animation) -- */}
      <div style={{ animation: `${tabDir === 'right' ? 'rSlideRight' : 'rSlideLeft'} 0.25s cubic-bezier(0.2,0.7,0.2,1) both` }}>
        {activeTab === 'dishes' && (
          renderSec({
            icon: <><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><line x1="7" y1="2" x2="7" y2="22"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></>,
            title: 'Must-Eat Dishes',
            subtitle: "Iconic plates you can't leave without trying",
            items: (data.dishes || []).filter(it => !filters.minRating || !it.rating || parseFloat(it.rating) >= filters.minRating),
            secKey: 'dishes',
            startIndex: 0,
            photoSuffix: 'food dish restaurant',
            accentBg: '#FAEEDA',
            accentColor: D.gold,
            onFilter: () => { setFilterDraft(filters); setFilterOpen(true); },
            filterCount: filters.minRating > 0 ? 1 : 0,
          })
        )}
        {activeTab === 'places' && (
          renderSec({
            icon: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
            title: 'Unmissable Places',
            subtitle: 'The landmarks and streets that define this city',
            items: (data.places || []).filter(it => !filters.minRating || !it.rating || parseFloat(it.rating) >= filters.minRating),
            secKey: 'places',
            startIndex: 5,
            photoSuffix: 'tourist attraction landmark',
            accentBg: D.blueTint,
            accentColor: '#2563AB',
            onFilter: () => { setFilterDraft(filters); setFilterOpen(true); },
            filterCount: filters.minRating > 0 ? 1 : 0,
          })
        )}
        {activeTab === 'exp' && (
          renderSec({
            icon: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>,
            title: 'Local Experiences',
            subtitle: 'Things to do that no guidebook will tell you',
            items: (data.experiences || []).filter(it => !filters.minRating || !it.rating || parseFloat(it.rating) >= filters.minRating),
            secKey: 'exp',
            startIndex: 10,
            photoSuffix: 'travel experience',
            accentBg: '#EEEDFE',
            accentColor: '#534AB7',
            onFilter: () => { setFilterDraft(filters); setFilterOpen(true); },
            filterCount: filters.minRating > 0 ? 1 : 0,
          })
        )}
      </div>

      {/* -- Insider tip -- */}
      {data.tip && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: D.surface, border: `0.5px solid ${D.border}`, borderLeft: `3px solid ${D.gold}`, borderRadius: 12, padding: '12px 14px', boxShadow: '0 2px 8px rgba(28,20,16,0.06)' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>??</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: D.gold, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 4, fontFamily: "'DM Sans',sans-serif" }}>Insider Tip</div>
            <div style={{ fontSize: 13, color: D.secondary, lineHeight: 1.65 }}>{data.tip}</div>
          </div>
        </div>
      )}

      {/* Scroll-to-top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position: 'fixed', bottom: '5.8rem', right: '1rem', zIndex: 90,
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, animation: 'rFadeIn 0.25s ease both',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
      )}

    </div>
  );

  /* -- Idle / entry state -- */
  return (
    <div style={{ background: D.bg }}>
      {/* Hero entry card */}
      <div style={{
        position: 'relative', borderRadius: 18, overflow: 'hidden', marginBottom: '1.25rem',
        background: 'linear-gradient(135deg, #1C1410 0%, #8B5E3C 60%, #C9913A 100%)',
        padding: '2rem 1.5rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(28,20,16,0.18)',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, fontSize: 150, opacity: 0.05, lineHeight: 1 }}>??</div>
        <div style={{ fontSize: 44, marginBottom: 12 }}>???</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6, fontFamily: "'Sora',sans-serif", letterSpacing: -0.3 }}>Local Life Guide</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.68)', lineHeight: 1.65, maxWidth: 280, margin: '0 auto 0' }}>
          Dishes, places, and experiences that define this city.
        </div>
      </div>

      {/* Input card */}
      <div style={{ background: D.surface, borderRadius: 16, padding: '1.1rem 1.25rem', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(28,20,16,0.06)', border: `0.5px solid ${D.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Where are you headed?</div>
        <input
          style={{ width: '100%', border: `1.5px solid ${D.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: "'DM Sans',sans-serif", color: D.espresso, background: D.bg, outline: 'none', boxSizing: 'border-box' }}
          value={dest}
          onChange={e => setDest(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && generate()}
          placeholder="e.g. Jaipur, Rajasthan"
        />
        <button
          style={{ width: '100%', marginTop: 10, padding: '12px', fontSize: 14, fontWeight: 700, borderRadius: 12, border: 'none', cursor: dest.trim() ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans',sans-serif", background: dest.trim() ? (isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : `linear-gradient(135deg,${D.gold},#A8731E)`) : D.neutral, color: dest.trim() ? '#fff' : D.muted, transition: 'all .2s', opacity: dest.trim() ? 1 : 0.6 }}
          onClick={generate}
          disabled={!dest.trim()}
        >
          ? Discover local life
        </button>
      </div>

      {/* Quick-pick chips */}
      <div style={{ fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Popular destinations</div>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {['Jaipur', 'Udaipur', 'Goa', 'Varanasi', 'Mumbai', 'Coorg', 'Hampi'].map(c => (
          <button
            key={c}
            onClick={() => setDest(c)}
            style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 999, border: `0.5px solid ${D.border}`, background: D.surface, color: D.secondary, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", boxShadow: '0 1px 4px rgba(28,20,16,0.05)' }}
          >{c}</button>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------
   ITINERARY PAGE
------------------------------------------------------- */
const SLOT_LABELS = {
  night: '12AM�6AM',
  morning: '6AM�12PM',
  afternoon: '12PM�6PM',
  evening: '6PM�12AM',
};

const SLOT_ORDER = ['morning', 'afternoon', 'evening'];

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatTripDate(arrivalStr, dayIndex) {
  // dayIndex: 0 = arrival day
  const base = new Date(arrivalStr);
  base.setDate(base.getDate() + dayIndex);
  return `${base.getDate()} ${MONTH_NAMES[base.getMonth()]}`;
}

function ItineraryPage({ trip, onCacheUpdate }) {
  const isSolo = trip.isSolo;
  // Whether the user explicitly built an itinerary (swipe flow OR "Create with Lumi")
  const _hasSwipeItin = trip._cachedItin && isItinDone(trip.id);

  const [iTab, setITab] = useState(() => {
    try {
      const saved = localStorage.getItem(`tb_itab_${trip.id}`);
      // Only restore 'itinerary' tab if user went through the swipe-selection flow
      if (saved === 'itinerary' && _hasSwipeItin) return 'itinerary';
      // 'nearby' is not restored � Day Planner is always the entry point
    } catch { /* ignore */ }
    return 'planner';
  });

  const [form] = useState({
    dest: trip.destination || '',
    arrival: trip.arrival ? new Date(trip.arrival).toISOString().split('T')[0] : '',
    departure: trip.departure ? new Date(trip.departure).toISOString().split('T')[0] : '',
    arrivalSlot: trip.arrivalSlot || 'morning',
    departureSlot: trip.departureSlot || 'morning',
    budget: trip.budget ? String(trip.budget) : '',
    people: String(normalizeMembers(trip.members).length || 1),
    travelNotes: trip.travelNotes || '',
  });

  const days = form.arrival && form.departure
    ? Math.max(1, Math.round((new Date(form.departure) - new Date(form.arrival)) / 86400000))
    : 1;

  const [step, setStep] = useState(() => {
    const saved = loadPlannerStep(trip.id);
    // 'discover' is always safe: covers first-time discovery and modification mode
    if (saved === 'discover') return 'discover';
    // 'result' only valid when the user actually built an itinerary
    if (saved === 'result' && _hasSwipeItin) return 'result';
    // No saved step � derive from whether itin was built
    return _hasSwipeItin ? 'result' : 'discover';
  });
  const [itin, setItin] = useState(_hasSwipeItin ? (trip._cachedItin?.itinerary || null) : null);
  const [sources, setSources] = useState(_hasSwipeItin ? (trip._cachedItin?.sources || []) : []);
  const [lastSelectedExps, setLastSelectedExps] = useState(() => loadSelExps(trip.id));
  const [showSelectionsSheet, setShowSelectionsSheet] = useState(false);
  const [sheetExps, setSheetExps] = useState([]);
  const [modifyExps, setModifyExps] = useState(null);
  const [plannerExpandedCats, setPlannerExpandedCats] = useState(new Set());
  const [plannerReviewExp, setPlannerReviewExp] = useState(null);
  const [collapsedDays, setCollapsedDays] = useState(new Set());
  const [localTasteData, setLocalTasteData] = useState(trip._cachedTaste || null);
  const [localTasteStep, setLocalTasteStep] = useState(trip._cachedTaste ? 'result' : 'loading');
  const hasGenerated = useRef(false);
  const [doneActivities, setDoneActivities] = useState(new Set());
  const activityNodeRefs = useRef({});
  const lastAutoScrollKeyRef = useRef(null);
  const dayHeaderRefs = useRef({});
  const collapsedInitRef = useRef(false);
  const toggleActivity = (key) => setDoneActivities(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const accentStyle = isSolo ? S.btnSolo : S.btnP;
  const accentColor = isSolo ? '#7F77DD' : '#1D9E75';
  const headerBg = isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : 'linear-gradient(135deg,#1D9E75,#0F6E56)';

  const TYPE_ICONS = {
    attraction: '???', food: '???', experience: '?',
    transport: '??', hotel: '??', shopping: '???',
  };

  const ENERGY_CONFIG = {
    high:   { label: 'Active',   symbol: '??', bg: '#FAECE7', color: '#993C1D' },
    medium: { label: 'Moderate', symbol: '?',  bg: '#E6F1FB', color: '#1A6BAD' },
    low:    { label: 'Easy',     symbol: '�',  bg: '#E8F8EE', color: '#1A7A4A' },
    rest:   { label: 'Rest',     symbol: '?',  bg: '#F4F3FF', color: '#534AB7' },
  };

  const firstActivitySlot = () => {
    const idx = SLOT_ORDER.indexOf(form.arrivalSlot);
    return SLOT_ORDER[Math.min(idx + 1, SLOT_ORDER.length - 1)];
  };

  // Persist iTab per trip so the user returns to the same tab (e.g. 'itinerary')
  useEffect(() => {
    try { localStorage.setItem(`tb_itab_${trip.id}`, iTab); } catch { /* ignore */ }
  }, [iTab, trip.id]);

  // Persist Day Planner step so refresh keeps user on the same page
  // Only save stable states (discover / result); loading and error are transient
  useEffect(() => {
    if (step === 'discover' || step === 'result') {
      savePlannerStep(trip.id, step);
    }
  }, [step, trip.id]);

  // On first itin load: collapse all days except today's, then scroll to it
  useEffect(() => {
    if (!itin || collapsedInitRef.current) return;
    collapsedInitRef.current = true;
    const itinDays = itin.days || [];
    if (!itinDays.length) return;
    let openDay = itinDays[0].day;
    if (trip.arrival) {
      const arr = new Date(trip.arrival);
      arr.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const idx = Math.round((today - arr) / 86400000);
      if (idx >= 0 && idx < itinDays.length) openDay = itinDays[idx].day;
    }
    const collapsed = new Set();
    itinDays.forEach(d => { if (d.day !== openDay) collapsed.add(d.day); });
    setCollapsedDays(collapsed);
    setTimeout(() => {
      const el = dayHeaderRefs.current[openDay];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
  }, [itin]);

  useEffect(() => {
    // Only apply cached itin if user explicitly triggered itinerary generation
    if (trip._cachedItin && isItinDone(trip.id)) {
      setItin(trip._cachedItin.itinerary);
      setSources(trip._cachedItin.sources || []);
      setStep('result');
    }
    if (trip._cachedTaste) {
      setLocalTasteData(trip._cachedTaste);
      setLocalTasteStep('result');
    }

    // Generate what's missing
    if (!hasGenerated.current) {
      hasGenerated.current = true;
      // Itinerary generation is triggered by ExperienceDiscovery (onComplete/onSkip)
      runGenerateLocalTaste();
    }
  }, [trip._cachedItin, trip._cachedTaste]);

  const runGenerateItinerary = async (selectedExperiences) => {
    if (selectedExperiences && selectedExperiences.length > 0) {
      setLastSelectedExps(selectedExperiences);
      saveSelExps(trip.id, selectedExperiences);
      setSheetExps(selectedExperiences);
    }
    setStep('loading');
    try {
      const { generateItinerary } = await import('../../api');
      // Derive interests from selected categories so the AI knows what the user cares about
      const interests = (selectedExperiences && selectedExperiences.length > 0)
        ? [...new Set(selectedExperiences.map(e => e.category).filter(Boolean))]
        : [];
      const result = await generateItinerary({
        destination: form.dest,
        days,
        budget: form.budget ? parseFloat(form.budget) : null,
        people: parseInt(form.people) || 1,
        interests,
        arrivalSlot: form.arrivalSlot,
        departureSlot: form.departureSlot,
        firstActivitySlot: firstActivitySlot(),
        arrival: form.arrival,
        travelNotes: form.travelNotes || '',
        ...(selectedExperiences && selectedExperiences.length > 0 ? { selectedExperiences } : {}),
      });
      setItin(result.itinerary);
      setSources(result.sources || []);
      markItinDone(trip.id); // mark as user-triggered so Day Planner shows modify view on return
      setStep('result');
      setITab('itinerary'); // auto-switch to Itinerary tab
      // -- Save back to parent trips state so it persists across tab switches --
      onCacheUpdate?.({ _cachedItin: { ...result, selectedExps: selectedExperiences || [] } });
    } catch {
      setStep('error');
    }
  };

  const runGenerateLocalTaste = async () => {
    // Don't flash spinner if we already have data � refresh silently
    if (!localTasteData) setLocalTasteStep('loading');
    try {
      const r = await generateLocalTaste({ destination: form.dest });
      setLocalTasteData(r);
      setLocalTasteStep('result');
      // Local taste is now Supabase-cached on the backend (destination_taste table).
      // No longer saving per-trip � Supabase is the single source of truth.
    } catch {
      if (!localTasteData) setLocalTasteStep('error');
    }
  };

  useEffect(() => {
    const handler = () => setShowPlannerScrollTop(window.scrollY > 240);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Pre-fetch nearby data on mount so the tab opens instantly
  useEffect(() => {
    if (!form.dest) return;
    let cancelled = false;
    fetchRecommendations(form.dest)
      .then(result => { if (!cancelled) { setNearbyData(result); setNearbyStep('result'); } })
      .catch(() => { if (!cancelled) setNearbyStep('error'); });
    return () => { cancelled = true; };
  }, [form.dest]);

  const handleRedo = () => {
    clearItinDone(trip.id);
    clearPlannerStep(trip.id);
    onCacheUpdate?.({ _cachedItin: null });
    setStep('discover');
  };

  const SlotBadge = ({ slot, label }) => (
    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#fff' }}>
      {label} {SLOT_LABELS[slot]}
    </div>
  );

  const ITABS = [
    { id: 'planner',   label: 'Day Planner' },
    { id: 'itinerary', label: 'Itinerary' },
    { id: 'nearby',    label: 'Nearby' },
  ];
  const [lightboxUrl,        setLightboxUrl]        = useState(null);
  const [nearbyData,         setNearbyData]         = useState(null);
  const [nearbyStep,         setNearbyStep]         = useState('loading');
  const [showPlannerScrollTop, setShowPlannerScrollTop] = useState(false);
  const [showTipsPopup,      setShowTipsPopup]      = useState(false);
  const [clockNowMs,         setClockNowMs]         = useState(() => Date.now());
  const [destinationClock,   setDestinationClock]   = useState(null);
  const [liveHintPinnedKey,  setLiveHintPinnedKey]  = useState(null);
  const [expandedTipsDay,    setExpandedTipsDay]    = useState(new Set());
  const [liveHintHoverKey,   setLiveHintHoverKey]   = useState(null);

  useEffect(() => {
    if (!liveHintPinnedKey) return;
    const onDocPointerDown = (e) => {
      const el = e.target;
      if (el instanceof Element && el.closest('[data-live-hint-layer="1"]')) return;
      setLiveHintPinnedKey(null);
      setLiveHintHoverKey(null);
    };
    const onDocKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLiveHintPinnedKey(null);
        setLiveHintHoverKey(null);
      }
    };
    document.addEventListener('mousedown', onDocPointerDown);
    document.addEventListener('keydown', onDocKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocPointerDown);
      document.removeEventListener('keydown', onDocKeyDown);
    };
  }, [liveHintPinnedKey]);

  useEffect(() => {
    const tick = () => setClockNowMs(Date.now());
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!form.dest) {
      setDestinationClock(null);
      return;
    }
    let cancelled = false;
    fetchDestinationLocalTime(form.dest)
      .then((payload) => {
        if (cancelled || !payload?.timeZone) return;
        setDestinationClock({
          timeZone: payload.timeZone || null,
          resolvedName: payload.resolvedName || form.dest,
        });
      })
      .catch(() => {
        if (!cancelled) setDestinationClock(null);
      });
    return () => { cancelled = true; };
  }, [form.dest]);

  const zonedNow = getZonedNow(clockNowMs, destinationClock?.timeZone || null);
  const nowMinutes = zonedNow.hours * 60 + zonedNow.minutes;
  const nowTimeLabel = zonedNow.label;

  const firstLiveActivity = (() => {
    const daysList = itin?.days || [];
    for (const d of daysList) {
      const acts = d.activities || [];
      for (let i = 0; i < acts.length; i++) {
        const a = acts[i];
        if (getActivityLiveState(a.time, a.endTime, nowMinutes) === 'active') {
          return {
            key: `day-${d.day}-act-${i}`,
            day: d.day,
            name: a.name,
            time: a.time,
            endTime: a.endTime,
          };
        }
      }
    }
    return null;
  })();

  useEffect(() => {
    if (iTab !== 'planner') {
      lastAutoScrollKeyRef.current = null;
      return;
    }
    if (step !== 'result' || !firstLiveActivity?.key) return;
    if (lastAutoScrollKeyRef.current === firstLiveActivity.key) return;

    const timer = setTimeout(() => {
      const target = activityNodeRefs.current[firstLiveActivity.key];
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      lastAutoScrollKeyRef.current = firstLiveActivity.key;
    }, 260);

    return () => clearTimeout(timer);
  }, [iTab, step, firstLiveActivity?.key]);

  const DAY_CLOSING_MSGS = [
    { label: 'Rest & Recharge', note: 'Head back to your stay. Freshen up, put your feet up, and let the day settle in.' },
    { label: 'Wind Down', note: 'The city can wait. Take a breath, grab a light bite nearby, and ease into the evening.' },
    { label: 'Golden Hour', note: 'Head back as the sky turns gold. Let the last light of the day follow you home.' },
    { label: 'Evening In', note: "Return to your accommodation. A good night's rest makes tomorrow even better." },
    { label: 'Reflect & Rest', note: 'What a day. Let the memories settle while you get some well-earned rest.' },
    { label: 'Soft Landing', note: 'Head back, unwind with some local chai or a quiet walk before you sleep.' },
    { label: 'End of Day', note: "Another chapter done. Your room awaits \u2014 rest up for what tomorrow brings." },
    { label: 'Night Mode', note: 'The day was full. Let the city hum in the background as you wind down.' },
    { label: 'Twilight Return', note: 'Make your way back as the lights come on. The city looks different at dusk.' },
    { label: 'Debrief & Rest', note: 'Swap stories over dinner at your hotel, then get a solid night of sleep.' },
    { label: 'Slow Close', note: 'No rush. Pick up a snack from a roadside stall and walk back slowly.' },
    { label: 'Check In & Chill', note: 'Settle back in, charge your devices, and let the day digest.' },
    { label: "Tonight's Quiet", note: 'A gentle close to a full day. Rest is also part of the journey.' },
    { label: 'Recharge Mode', note: 'Body and mind both need fuel. Early night, great tomorrow.' },
    { label: 'Dusk Stroll', note: 'If energy allows, a slow evening walk back to base is the perfect cooldown.' },
    { label: 'Night Cap', note: 'Grab a warm drink from a local caf\u00e9 before heading back to your stay.' },
    { label: 'Settle In', note: "Back to base. Lay out tomorrow's plan, then let go and rest." },
    { label: 'Late Calm', note: 'Even the busiest cities go quiet after dark. Return and embrace the stillness.' },
    { label: 'Lights Out', note: 'A well-earned rest after a well-spent day. Sleep well, traveller.' },
    { label: 'Evening Pause', note: 'The best way to end a great day \u2014 slowly, with no agenda.' },
    { label: 'Drift Off', note: 'Return to your stay, let the day replay in your mind, and drift into sleep.' },
    { label: 'Quiet Hours', note: "Head back in time to avoid the late-night rush. Tomorrow starts early." },
    { label: 'Comfortable Retreat', note: 'Your room is your sanctuary tonight. Enjoy it.' },
    { label: 'Night Walk Home', note: 'The streets at night carry a different energy. Walk back, take it in.' },
    { label: 'Easy Does It', note: 'No alarm, no rush \u2014 just a quiet end to a beautiful day.' },
    { label: 'Wrap Up', note: "Today's itinerary is complete. Grab a snack, rest, and rise ready." },
    { label: 'Sundown', note: 'The day is done. Make your way back to your stay as the city dims its lights.' },
    { label: 'Close of Play', note: 'A full day, well-lived. Time to rest before the next one.' },
    { label: 'The Long Way Home', note: 'Take the scenic route back to your stay. There\u2019s no hurry.' },
    { label: 'Home Base', note: 'Back to your accommodation. Safe, warm, and ready for tomorrow.' },
  ];

  return (
    <div>
      <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      {/* -- Experience preview modal (selected-experiences panel, view-only) -- */}
      {plannerReviewExp && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, background: 'rgba(10,7,5,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}
          onClick={() => setPlannerReviewExp(null)}
        >
          <div
            style={{ width: '100%', maxWidth: 420, background: D.surface, borderRadius: 24, overflow: 'hidden', boxShadow: '0 8px 40px rgba(28,20,16,0.22)', animation: 'cardIn 0.28s cubic-bezier(0.2,0.7,0.2,1) both', maxHeight: 'calc(100vh - 2.5rem)', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ position: 'relative', height: 256, overflow: 'hidden', background: '#EDE8E2' }}>
              <PlacePhotoCarousel
                query={plannerReviewExp.imageQuery || `${plannerReviewExp.name} ${form.dest} high resolution travel photography`}
                style={{ height: '100%', borderRadius: 0 }}
                limit={3}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.04) 0%,transparent 30%,rgba(0,0,0,0.76) 100%)', pointerEvents: 'none' }} />
              {(() => {
                if (plannerReviewExp._catColor) {
                  return (
                    <div style={{ position: 'absolute', top: 14, left: 14, display: 'inline-flex', alignItems: 'center', gap: 5, background: plannerReviewExp._catBg || '#FFF3E8', backdropFilter: 'blur(10px)', borderRadius: 999, padding: '4px 10px 4px 10px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: plannerReviewExp._catColor, fontFamily: "'DM Sans',sans-serif", textTransform: 'uppercase', letterSpacing: 0.7 }}>{plannerReviewExp.category}</span>
                    </div>
                  );
                }
                const cfg = expCatCfg(plannerReviewExp.category);
                return (
                  <div style={{ position: 'absolute', top: 14, left: 14, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(10px)', borderRadius: 999, padding: '4px 10px 4px 7px', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                    {renderExpCatIcon(plannerReviewExp.category, 13, cfg.color)}
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: cfg.color, fontFamily: "'DM Sans',sans-serif", textTransform: 'uppercase', letterSpacing: 0.7 }}>{plannerReviewExp.category}</span>
                  </div>
                );
              })()}
              {plannerReviewExp.tier === 1 && (
                <div style={{ position: 'absolute', top: 14, right: 44, display: 'inline-flex', alignItems: 'center', gap: 4, background: 'linear-gradient(135deg,#FF6B35,#E8390E)', borderRadius: 999, padding: '4px 9px 4px 7px', boxShadow: '0 2px 10px rgba(232,57,14,0.45)' }}>
                  <span style={{ fontSize: 10 }}>??</span>
                  <span style={{ fontSize: 9.5, fontWeight: 800, color: '#fff', fontFamily: "'Sora',sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>MUST DO</span>
                </div>
              )}
              <div style={{ position: 'absolute', bottom: 12, left: 14, right: 50, pointerEvents: 'none' }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: '#fff', lineHeight: 1.2, textShadow: '0 2px 8px rgba(0,0,0,0.6)', fontFamily: "'Sora',sans-serif", letterSpacing: -0.2 }}>{plannerReviewExp.name}</div>
                {plannerReviewExp.vibe && <span style={{ marginTop: 4, display: 'inline-block', fontSize: 9.5, fontWeight: 700, color: 'rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.14)', borderRadius: 999, padding: '2px 8px', backdropFilter: 'blur(4px)', textTransform: 'uppercase', letterSpacing: 0.8 }}>{plannerReviewExp.vibe}</span>}
              </div>
              <button onClick={() => setPlannerReviewExp(null)} style={{ position: 'absolute', top: 12, right: 12, width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.45)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', zIndex: 2, padding: 0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ padding: '13px 15px 17px', display: 'flex', flexDirection: 'column', gap: 9 }}>
              {/* Time range row � shown for itinerary activities */}
              {plannerReviewExp._time && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#FFF3E8', borderRadius: 8, border: '0.5px solid rgba(255,106,0,0.18)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#FF6A00', fontFamily: "'DM Sans',sans-serif" }}>
                    {plannerReviewExp._time}{plannerReviewExp._endTime ? ` � ${plannerReviewExp._endTime}` : ''}{plannerReviewExp.duration ? ` (${plannerReviewExp.duration})` : ''}
                  </span>
                  {plannerReviewExp._area && (
                    <><span style={{ color: 'rgba(255,106,0,0.35)', fontSize: 12 }}>�</span>
                    <span style={{ fontSize: 11.5, color: '#A0673A', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {plannerReviewExp._area}
                    </span></>
                  )}
                </div>
              )}
              <p style={{ fontSize: 12.5, color: D.secondary, lineHeight: 1.65, margin: 0, fontFamily: "'DM Sans',sans-serif", display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {plannerReviewExp.description}
              </p>
              {/* Tips / heads-up row */}
              {plannerReviewExp.bestTime && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', background: '#FFFBF0', borderRadius: 8, border: '0.5px solid #FAC775' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <span style={{ fontSize: 12, color: '#7A4F00', lineHeight: 1.55 }}>{plannerReviewExp.bestTime}</span>
                </div>
              )}
              <div style={{ height: '1px', background: 'linear-gradient(90deg,rgba(255,106,0,0.15),transparent)', margin: '0 -1px' }} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap', alignItems: 'center', overflow: 'hidden' }}>
                {plannerReviewExp.duration && !plannerReviewExp._time && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#5C504A', background: '#F4F2EE', borderRadius: 999, padding: '4px 10px', border: '1px solid rgba(28,20,16,0.07)', fontFamily: "'DM Sans',sans-serif", flexShrink: 0, whiteSpace: 'nowrap' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {plannerReviewExp.duration}
                  </span>
                )}
                {!plannerReviewExp._time && plannerReviewExp.bestTime && <span style={{ fontSize: 11, fontWeight: 600, color: '#5C504A', background: '#F4F2EE', borderRadius: 999, padding: '4px 10px', border: '1px solid rgba(28,20,16,0.07)', fontFamily: "'DM Sans',sans-serif", flexShrink: 0, whiteSpace: 'nowrap' }}>?? {plannerReviewExp.bestTime}</span>}
                {plannerReviewExp.cost && plannerReviewExp.cost !== 'null' && plannerReviewExp.cost !== 'N/A' && <span style={{ fontSize: 11, fontWeight: 700, color: '#1C1410', background: '#F4F2EE', borderRadius: 999, padding: '4px 10px', border: '1px solid rgba(28,20,16,0.1)', fontFamily: "'DM Sans',sans-serif", flexShrink: 0, whiteSpace: 'nowrap' }}>{plannerReviewExp.cost}</span>}
              </div>
              {/* Action buttons (itinerary activities only) */}
              {plannerReviewExp._doneKey && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${plannerReviewExp.name} ${form.dest}`)}`} target="_blank" rel="noreferrer"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 12, color: '#2563AB', background: D.blueTint, borderRadius: 10, padding: '9px 12px', textDecoration: 'none', fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    Maps
                  </a>
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(`${plannerReviewExp.name} ${form.dest}`)}`} target="_blank" rel="noreferrer"
                    style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 12, color: D.secondary, background: D.neutral, borderRadius: 10, padding: '9px 12px', textDecoration: 'none', fontWeight: 600, fontFamily: "'DM Sans',sans-serif" }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Know More
                  </a>
                </div>
              )}
              {/* Mark as Done (itinerary only) */}
              {plannerReviewExp._doneKey && (
                <button
                  onClick={() => { toggleActivity(plannerReviewExp._doneKey); setPlannerReviewExp(null); }}
                  style={{ width: '100%', padding: '13px', background: doneActivities.has(plannerReviewExp._doneKey) ? D.neutral : 'linear-gradient(135deg,#FF6A00,#E8390E)', color: doneActivities.has(plannerReviewExp._doneKey) ? D.muted : '#fff', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: doneActivities.has(plannerReviewExp._doneKey) ? 'none' : '0 4px 14px rgba(255,106,0,0.32)', transition: 'all 0.2s ease', marginTop: 2 }}
                >
                  {doneActivities.has(plannerReviewExp._doneKey) ? (
                    <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Marked as Done</>
                  ) : (
                    <>Mark as Done <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -- Underline tab switcher (Club-style) -- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: `1.5px solid ${D.border}`, marginBottom: '1rem', position: 'relative', zIndex: 200, background: 'transparent' }}>
        {ITABS.map(t => {
          const isActive = iTab === t.id;
          const tabIcons = {
            planner:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
            itinerary: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
            nearby:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
          };
          return (
            <button key={t.id} onClick={() => setITab(t.id)}
              style={{ ...S.navTab, ...(isActive ? S.navTabActive : {}), position: 'relative', padding: '9px 2px 10px', fontSize: 12, borderRadius: 0, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: isActive ? 700 : 500, fontSize: 12 }}>
                {tabIcons[t.id]}
                {t.label}
              </span>
              {isActive && (
                <span style={{ position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 2.5, borderRadius: '99px 99px 0 0', background: isSolo ? '#7F77DD' : '#FF6A00' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* -- TAB: DAY PLANNER (experience swipe flow) -- */}
      {iTab === 'planner' && (
        <div>
          {step === 'result' && itin ? (
            /* -- Itinerary Ready � redesigned header + inline selections -- */
            <div style={{ animation: 'edFadeUp 0.35s ease both' }}>

              {/* -- Orange header card -- */}
              <div style={{ background: 'linear-gradient(135deg,#FF6A00 0%,#E8390E 100%)', borderRadius: 20, padding: '1.2rem 1.2rem 1rem', boxShadow: '0 6px 28px rgba(255,106,0,0.3)', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
                {/* Subtle circle decorations */}
                <div style={{ position: 'absolute', top: -28, right: -28, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: -18, left: 60, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 4, fontFamily: "'DM Sans',sans-serif" }}>? Itinerary Ready</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 3, fontFamily: "'Sora',sans-serif", letterSpacing: -0.3 }}>{days} day{days>1?'s':''} in {form.dest}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.78)', marginBottom: 14, fontFamily: "'DM Sans',sans-serif" }}>{(itin.days||[]).reduce((a,d)=>a+(d.activities||[]).length,0)} activities planned</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setITab('itinerary')}
                      style={{ flex: 1, padding: '10px', fontSize: 12.5, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', background: '#fff', color: '#FF6A00', fontFamily: "'DM Sans',sans-serif", boxShadow: '0 2px 10px rgba(0,0,0,0.14)' }}
                    >Go to Itinerary ?</button>
                    <button
                      onClick={() => { setModifyExps(lastSelectedExps.length > 0 ? lastSelectedExps : null); setStep('discover'); }}
                      style={{ flex: 1, padding: '10px', fontSize: 12.5, fontWeight: 600, borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.5)', cursor: 'pointer', background: 'rgba(255,255,255,0.15)', color: '#fff', fontFamily: "'DM Sans',sans-serif" }}
                    >Modify Experiences</button>
                  </div>
                </div>
              </div>

              {/* -- View selected experiences (mirrors ExperienceDiscovery confirm page) -- */}
              {lastSelectedExps.length > 0 && (() => {
                const ALL_EXP_CATS = ['Attractions','Food','Cafes','Hidden Gems','Adventure','Shopping','Nightlife','Culture','Viewpoints','Local Experiences','Party'];
                const byCategory = ALL_EXP_CATS.reduce((acc, cat) => {
                  const items = lastSelectedExps.filter(e => e.category === cat);
                  if (items.length) acc[cat] = items;
                  return acc;
                }, {});
                if (Object.keys(byCategory).length === 0) return null;
                return (
                  <div style={{ background: D.surface, borderRadius: 16, padding: '1rem 1.1rem', border: `0.5px solid ${D.border}`, boxShadow: D.cardShadow }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: D.espresso, fontFamily: "'Sora',sans-serif", marginBottom: 10 }}>View selected experiences</div>
                    {Object.entries(byCategory).map(([cat, items]) => {
                      const cfg = expCatCfg(cat);
                      const isOpen = plannerExpandedCats.has(cat);
                      return (
                        <div key={cat} style={{ marginBottom: 6, borderRadius: 12, border: `1px solid ${isOpen ? 'rgba(28,20,16,0.15)' : D.border}`, overflow: 'hidden', transition: 'border-color 0.2s ease' }}>
                          <button
                            onClick={() => setPlannerExpandedCats(prev => { const next = new Set(prev); next.has(cat) ? next.delete(cat) : next.add(cat); return next; })}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: isOpen ? '#F8F7F5' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s ease' }}
                          >
                            {renderExpCatIcon(cat, 13, isOpen ? D.espresso : D.muted)}
                            <span style={{ fontSize: 12, fontWeight: 700, color: D.espresso, fontFamily: "'DM Sans',sans-serif", flex: 1 }}>{cat}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: D.secondary, background: '#F0EFEC', borderRadius: 999, padding: '2px 7px', border: '1px solid rgba(28,20,16,0.1)', flexShrink: 0 }}>{items.length}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={D.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}><polyline points="6 9 12 15 18 9"/></svg>
                          </button>
                          {isOpen && (
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', padding: '6px 12px 10px' }}>
                              {items.map(e => (
                                <button key={e.id} onClick={() => setPlannerReviewExp(e)} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: '#F4F2EE', color: D.espresso, border: '1px solid rgba(28,20,16,0.09)', fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                  {e.name}
                                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.35 }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          ) : (
            <>
              {step === 'discover' && (
                <>
                  {/* Back button � only shown when in modify mode so user can cancel without rebuilding */}
                  {modifyExps !== null && (
                    <button
                      onClick={() => { setModifyExps(null); setStep('result'); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 10, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(28,20,16,0.1)', background: '#fff', color: '#5C504A', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                      Back to Planner
                    </button>
                  )}
                  <ExperienceDiscovery
                    trip={trip}
                    modifyExps={modifyExps}
                    onComplete={(selectedExps) => { setModifyExps(null); runGenerateItinerary(selectedExps); }}
                    onSkip={() => { setModifyExps(null); runGenerateItinerary(); }}
                  />
                </>
              )}
              {step === 'loading' && (
                <div style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
                  <div style={isSolo ? S.soloSpinner : S.spinner} />
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 10, color: D.espresso }}>Building your itinerary�</div>
                  <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 7, textAlign: 'left' }}>
                    {[
                      { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, text: 'Organizing your selected experiences' },
                      { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>, text: 'Optimizing for travel time & energy flow' },
                      { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, text: `Scheduling from your ${SLOT_LABELS[firstActivitySlot()]} slot` },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: D.secondary, animation: `statCountUp 0.4s ease ${i * 0.15}s both` }}>
                        {item.icon} {item.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {step === 'error' && (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>??</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Couldn't generate itinerary</div>
                  <div style={{ fontSize: 12.5, color: '#8A7E76', marginBottom: 20 }}>Something went wrong. Try again or pick differently.</div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button style={{ ...S.btn, ...accentStyle, padding: '10px 24px' }} onClick={() => runGenerateItinerary()}>Try Again</button>
                    <button style={{ ...S.btn, padding: '10px 24px', background: '#F4F2EE', color: '#5C504A', border: 'none', borderRadius: 12 }} onClick={() => setStep('discover')}>Pick Experiences</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* -- TAB: ITINERARY (day-by-day schedule) -- */}
      {iTab === 'itinerary' && (
        <div style={{ paddingBottom: '2.5rem' }}>
          {step === 'loading' && (
            <div style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
              <div style={isSolo ? S.soloSpinner : S.spinner} />
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 8, color: D.espresso }}>Lumi is building your itinerary…</div>
              <div style={{ fontSize: 12.5, color: D.muted }}>Crafting your perfect {days}-day {form.dest} plan.</div>
            </div>
          )}
          {!itin && step !== 'loading' && (
            <div style={{ padding: '2rem 1.25rem', textAlign: 'center', animation: 'edFadeUp 0.35s ease both' }}>
              <img src={lumi4Img} alt="" style={{ width: 84, height: 'auto', marginBottom: 14 }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: D.espresso, fontFamily: "'Sora',sans-serif", marginBottom: 6 }}>No itinerary yet</div>
              <div style={{ fontSize: 12, color: D.muted, lineHeight: 1.65, fontFamily: "'DM Sans',sans-serif", maxWidth: 260, margin: '0 auto' }}>
                Head to <strong style={{ color: '#FF6A00' }}>Day Planner</strong> to swipe experiences and build your itinerary.
              </div>
            </div>
          )}
          {itin && step !== 'loading' && (() => {
            const totalActs = (itin.days || []).reduce((a, dd) => a + (dd.activities || []).length, 0);
            const livePct = Math.round((doneActivities.size / Math.max(1, totalActs)) * 100);
            const arrLabel = form.arrival ? formatTripDate(form.arrival, 0) : '';
            const depLabel = form.arrival ? formatTripDate(form.arrival, days - 1) : '';
            return (
              <div>
                {/* Trip header card */}
                <div style={{ background: '#fff', borderRadius: 18, marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 14px rgba(28,20,16,0.07)', border: '1px solid #EBEBEB' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px' }}>
                    <div style={{ width: 76, height: 76, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#EDE8E2' }}>
                      <PlacePhoto query={`${form.dest} travel photography`} style={{ width: '100%', height: 76, borderRadius: 0 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16.5, fontWeight: 800, color: D.espresso, fontFamily: "'Sora',sans-serif", marginBottom: 2, lineHeight: 1.2 }}>
                        {form.dest} Trip
                      </div>
                      <div style={{ fontSize: 12, color: D.muted, marginBottom: 7, fontFamily: "'DM Sans',sans-serif" }}>
                        {arrLabel && depLabel ? `${arrLabel} \u2013 ${depLabel} \u00b7 ${days} Day${days > 1 ? 's' : ''}` : `${days} Day${days > 1 ? 's' : ''}`}
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#FFF3E8', borderRadius: 999, padding: '3px 10px', border: '1px solid rgba(255,106,0,0.18)' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#FF6A00', flexShrink: 0, animation: 'dotPulse 1.6s ease-in-out infinite', boxShadow: '0 0 0 2.5px rgba(255,106,0,0.22)' }} />
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#FF6A00', fontFamily: "'DM Sans',sans-serif" }}>Live {livePct}%</span>
                      </div>
                    </div>
                    {itin.quickTips?.length > 0 && (
                      <button onClick={() => setShowTipsPopup(true)} style={{ flexShrink: 0, display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 12, border: '1.5px solid #E0E0E0', background: '#fff', cursor: 'pointer' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>
                        <span style={{ fontSize: 10, fontWeight: 700, color: D.espresso, fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>Trip Tips</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Tips popup */}
                {showTipsPopup && itin.quickTips?.length > 0 && (
                  <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,16,24,0.50)', zIndex: 700, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setShowTipsPopup(false); }}>
                    <div style={{ width: '100%', maxWidth: 560, background: '#FFFDF8', borderRadius: '22px 22px 0 0', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)', boxShadow: '0 -10px 60px rgba(0,0,0,0.22)', animation: 'tipsSheetIn 0.3s cubic-bezier(0.2,0.7,0.2,1) both', maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
                        <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(28,20,16,0.14)' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px 13px', borderBottom: `1px solid ${D.divider}`, flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 12, background: D.goldTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={D.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>
                          </div>
                          <div>
                            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 800, color: D.espresso }}>Trip Tips</div>
                            <div style={{ fontSize: 11, color: D.muted, marginTop: 1 }}>{itin.quickTips.length} insider tips for your journey</div>
                          </div>
                        </div>
                        <button onClick={() => setShowTipsPopup(false)} style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${D.border}`, background: D.neutral, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: D.muted, padding: 0, flexShrink: 0 }}>\u2715</button>
                      </div>
                      <div style={{ overflowY: 'auto', padding: '12px 16px' }}>
                        {itin.quickTips.map((tip, i) => (
                          <div key={i} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '11px 13px', background: D.surface, borderRadius: 14, marginBottom: 7, border: `0.5px solid ${D.border}`, boxShadow: '0 1px 4px rgba(28,20,16,0.04)' }}>
                            <div style={{ width: 26, height: 26, borderRadius: 9, background: D.goldTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={D.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>
                            </div>
                            <span style={{ fontSize: 13.5, color: D.secondary, lineHeight: 1.65, fontFamily: "'DM Sans',sans-serif", flex: 1, paddingTop: 3 }}>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Day sections */}
                {(itin.days || []).map((d, dayIndex) => {
                  const dateLabel = form.arrival ? formatTripDate(form.arrival, dayIndex) : `Day ${d.day}`;
                  const isArrivalDay   = dayIndex === 0;
                  const isDepartureDay = dayIndex === (itin.days.length - 1);
                  const acts = d.activities || [];
                  const dayTotalCount = acts.length;
                  const dayDoneCount  = acts.filter((_, ai) => doneActivities.has(`day-${d.day}-act-${ai}`)).length;
                  const donePct = dayTotalCount > 0 ? (dayDoneCount / dayTotalCount) * 100 : 0;
                  const isExpanded = !collapsedDays.has(d.day);

                  const dayEmojiList = ['🌅','🏛','🌊','\u26F0','🌿','🏙','🛍','🍽','\u26F5','🌙','🏖','🗺'];
                  const titleLower = (d.title || d.theme || '').toLowerCase();
                  let dayIcon = d.icon || dayEmojiList[dayIndex % dayEmojiList.length];
                  if (!d.icon) {
                    if (isArrivalDay || titleLower.includes('arriv')) dayIcon = '\u2708\uFE0F';
                    else if (isDepartureDay || titleLower.includes('depart') || titleLower.includes('journey home')) dayIcon = '🏠';
                    else if (titleLower.includes('beach') || titleLower.includes('coast') || titleLower.includes('sea')) dayIcon = '🏖';
                    else if (titleLower.includes('mountain') || titleLower.includes('trek') || titleLower.includes('hike')) dayIcon = '\u26F0';
                    else if (titleLower.includes('food') || titleLower.includes('culinar') || titleLower.includes('gastro')) dayIcon = '🍽';
                    else if (titleLower.includes('museum') || titleLower.includes('history') || titleLower.includes('heritage') || titleLower.includes('heart')) dayIcon = '🏛';
                    else if (titleLower.includes('temple') || titleLower.includes('palace') || titleLower.includes('fort') || titleLower.includes('castle')) dayIcon = '🏰';
                    else if (titleLower.includes('market') || titleLower.includes('shop') || titleLower.includes('bazaar')) dayIcon = '🛍';
                    else if (titleLower.includes('island') || titleLower.includes('escape') || titleLower.includes('retreat')) dayIcon = '🏝';
                    else if (titleLower.includes('city') || titleLower.includes('urban') || titleLower.includes('metro')) dayIcon = '🏙';
                    else if (titleLower.includes('adventure') || titleLower.includes('outdoor') || titleLower.includes('wild')) dayIcon = '🌿';
                    else if (titleLower.includes('boat') || titleLower.includes('cruise') || titleLower.includes('river')) dayIcon = '\u26F5';
                    else if (titleLower.includes('night') || titleLower.includes('twilight') || titleLower.includes('sunset')) dayIcon = '🌅';
                  }

                  const toggleDay = () => setCollapsedDays(prev => { const next = new Set(prev); next.has(d.day) ? next.delete(d.day) : next.add(d.day); return next; });
                  const toggleTips = () => setExpandedTipsDay(prev => { const next = new Set(prev); next.has(d.day) ? next.delete(d.day) : next.add(d.day); return next; });
                  const tipsOpen = expandedTipsDay.has(d.day);
                  const hasTips = !!(d.weather || d.proTip);

                  const walkMins = acts.reduce((sum, act) => {
                    if (!act.travelToNext) return sum;
                    const lower = act.travelToNext.toLowerCase();
                    if (!lower.includes('walk')) return sum;
                    const m = act.travelToNext.match(/(\d+)\s*min/i);
                    return sum + (m ? parseInt(m[1]) : 0);
                  }, 0);

                  const totalMins = acts.reduce((sum, act) => {
                    const m = (act.duration || '').match(/(\d+(?:\.\d+)?)\s*(hr|hour|min)/i);
                    if (!m) return sum;
                    return sum + (m[2].toLowerCase().startsWith('h') ? parseFloat(m[1]) * 60 : parseFloat(m[1]));
                  }, 0);
                  const durHrs = Math.floor(totalMins / 60);
                  const durMins = Math.round(totalMins % 60);
                  const durLabel = durHrs > 0 ? `${durHrs}h${durMins > 0 ? ` ${durMins}m` : ''}` : (durMins > 0 ? `${durMins}m` : '\u2014');

                  const paidActs = acts.filter(act => { const c = (act.cost || '').toLowerCase(); return c && c !== 'free' && c !== 'included'; });
                  const estSpend = paidActs.length === 0 ? 'Free' : (paidActs[0]?.cost || `${paidActs.length} paid`);

                  return (
                    <div key={d.day} ref={el => { if (el) dayHeaderRefs.current[d.day] = el; else delete dayHeaderRefs.current[d.day]; }} style={{ marginBottom: 10 }}>

                      {isExpanded ? (
                        /* Expanded dark header */
                        <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 3px 16px rgba(28,20,16,0.12)' }}>
                          <div onClick={toggleDay} style={{ background: isSolo ? 'linear-gradient(140deg,#3A2D6E,#2A1F56)' : 'linear-gradient(140deg,#FF5500,#FF8C3A)', padding: '14px 14px 0', cursor: 'pointer', userSelect: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{dayIcon}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.58)', fontFamily: "'DM Sans',sans-serif", marginBottom: 2, lineHeight: 1 }}>
                                  Day {d.day} · {dateLabel}{isArrivalDay ? ' · Arrival' : isDepartureDay ? ' · Departure' : ''}
                                </div>
                                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: "'Sora',sans-serif", lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title || d.theme}</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>{dayTotalCount} activities</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="18 15 12 9 6 15"/></svg>
                              </div>
                            </div>
                            <div style={{ margin: '12px 0 0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans',sans-serif" }}>{dayDoneCount}/{dayTotalCount} completed</span>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: "'DM Sans',sans-serif" }}>{Math.round(donePct)}%</span>
                              </div>
                              <div style={{ height: 4, background: 'rgba(255,255,255,0.25)', borderRadius: 99, marginBottom: 14 }}>
                                <div style={{ height: '100%', width: `${donePct}%`, background: '#fff', borderRadius: 99, transition: 'width 0.5s ease', boxShadow: donePct > 0 ? '0 0 8px rgba(255,255,255,0.5)' : 'none' }} />
                              </div>
                            </div>
                          </div>

                          <div style={{ background: '#F7F7F7', padding: '10px 10px 2px', animation: 'accordionSlide 0.28s ease both' }}>
                            {acts.map((a, i) => {
                              const doneKey = `day-${d.day}-act-${i}`;
                              const isDone = doneActivities.has(doneKey);
                              const isLast = i === acts.length - 1;
                              const isTransport = a.type === 'transport' || a.type === 'travel';
                              const isHotelType = a.type === 'hotel' || a.type === 'stay';
                              const isRest = a.energyLevel === 'rest';
                              const liveState = getActivityLiveState(a.time, a.endTime, nowMinutes);
                              const isActive = liveState === 'active';
                              const catLabel = isRest ? 'REST' : isHotelType ? 'STAY' : isTransport ? 'TRANSIT' : (a.type || 'activity').toUpperCase();
                              const catColor = isRest ? '#7F77DD' : isHotelType ? '#2563AB' : isTransport ? '#6B7280' : a.type === 'food' ? '#D97706' : '#FF6A00';
                              const catBg   = isRest ? '#F4F3FF' : isHotelType ? '#E6F1FB' : isTransport ? '#F3F4F6' : a.type === 'food' ? '#FEF3C7' : '#FFF3E8';

                              return (
                                <div key={i} ref={el => { if (el) activityNodeRefs.current[doneKey] = el; else delete activityNodeRefs.current[doneKey]; }}>
                                  <div className={`act-card-compact${isActive ? ' itin-live-active-card' : ''}`} style={{ background: isDone ? 'rgba(28,20,16,0.03)' : '#fff', borderRadius: 14, border: `1px solid ${isActive ? 'rgba(255,106,0,0.28)' : '#EBEBEB'}`, marginBottom: 8, overflow: 'hidden', boxShadow: isActive ? '0 4px 14px rgba(255,106,0,0.1)' : '0 1px 5px rgba(28,20,16,0.05)', opacity: isDone ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
                                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                                      {/* Checkbox */}
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', flexShrink: 0 }}>
                                        <button onClick={e => { e.stopPropagation(); toggleActivity(doneKey); }} className="itin-done-btn" style={{ width: 20, height: 20, borderRadius: 5, border: isDone ? 'none' : '1.5px solid #CDCAC4', background: isDone ? '#FF6A00' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0, boxShadow: isDone ? '0 2px 8px rgba(255,106,0,0.35)' : 'none', transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>
                                          {isDone && <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><polyline points="2,5.5 4.5,8 9,3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                        </button>
                                      </div>
                                      {/* Photo */}
                                      {!isTransport && !isHotelType && (
                                        <div style={{ width: 92, flexShrink: 0, overflow: 'hidden', background: '#EDE8E2', alignSelf: 'stretch', cursor: 'pointer' }} onClick={() => setPlannerReviewExp({ name: a.name, category: catLabel, _catColor: catColor, _catBg: catBg, description: a.note || a.description || '', duration: a.duration, bestTime: a.headsUp, cost: a.cost, vibe: null, tier: a.mustDo ? 1 : 0, imageQuery: `${a.name} ${form.dest} travel photography`, _time: a.time, _endTime: a.endTime, _area: a.area, _doneKey: doneKey })}>
                                          <PlacePhotoCarousel query={`${a.name} ${form.dest} photo`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 0 }} limit={1} />
                                        </div>
                                      )}
                                      {/* Content */}
                                      <div style={{ flex: 1, padding: '10px 10px', minWidth: 0, cursor: isTransport || isHotelType ? 'default' : 'pointer' }} onClick={() => isTransport || isHotelType ? null : setPlannerReviewExp({ name: a.name, category: catLabel, _catColor: catColor, _catBg: catBg, description: a.note || a.description || '', duration: a.duration, bestTime: a.headsUp, cost: a.cost, vibe: null, tier: a.mustDo ? 1 : 0, imageQuery: `${a.name} ${form.dest} travel photography`, _time: a.time, _endTime: a.endTime, _area: a.area, _doneKey: doneKey })}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                          {(a.time || a.endTime) ? (
                                            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#FF6A00', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>{a.time}{a.endTime ? ` \u2013 ${a.endTime}` : ''}</span>
                                          ) : <span />}
                                          <span style={{ color: '#CDCAC4', fontSize: 16, lineHeight: 1, letterSpacing: 1 }}>···</span>
                                        </div>
                                        {isTransport || isHotelType ? (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                                            <span style={{ fontSize: 16 }}>{a.icon || (isHotelType ? '🏨' : '🚗')}</span>
                                            <span style={{ fontSize: 13.5, fontWeight: 700, color: D.espresso, fontFamily: "'Sora',sans-serif", lineHeight: 1.25, textDecoration: isDone ? 'line-through' : 'none' }}>{a.name}</span>
                                          </div>
                                        ) : (
                                          <div style={{ fontSize: 13.5, fontWeight: 700, color: D.espresso, fontFamily: "'Sora',sans-serif", lineHeight: 1.25, marginBottom: 5, textDecoration: isDone ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                                        )}
                                        <div style={{ marginBottom: 6 }}>
                                          <span style={{ fontSize: 10, fontWeight: 700, background: catBg, color: catColor, borderRadius: 999, padding: '2px 9px', textTransform: 'uppercase', letterSpacing: 0.5, border: isRest ? `1px solid ${catColor}` : 'none' }}>{catLabel}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
                                          {a.duration && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: D.muted, whiteSpace: 'nowrap', flexShrink: 0 }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>{a.duration}</span>}
                                          {a.duration && a.cost && <span style={{ color: '#DDDAD6', fontSize: 11 }}>·</span>}
                                          {a.cost && <span style={{ fontSize: 11, color: D.muted, whiteSpace: 'nowrap', flexShrink: 0 }}>{a.cost}</span>}
                                          {a.cost && a.area && <span style={{ color: '#DDDAD6', fontSize: 11 }}>·</span>}
                                          {a.area && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: D.muted, minWidth: 0, overflow: 'hidden' }}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.area}</span></span>}
                                        </div>
                                      </div>
                                      {/* Must Do badge */}
                                      {a.mustDo && (
                                        <div style={{ display: 'flex', alignItems: 'flex-end', padding: '0 10px 10px 4px', flexShrink: 0 }}>
                                          <span style={{ border: '1.5px solid #FF6A00', color: '#FF6A00', borderRadius: 7, padding: '3px 8px', fontSize: 9.5, fontWeight: 800, whiteSpace: 'nowrap', letterSpacing: 0.5, textTransform: 'uppercase', background: '#FFF3E8', animation: 'floatBadge 3s ease-in-out infinite' }}>Must Do</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Transit connector */}
                                  {!isLast && a.travelToNext && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, marginTop: -2 }}>
                                      <div style={{ flex: 1, height: 1, background: 'rgba(28,20,16,0.07)' }} />
                                      <span style={{ fontSize: 11, color: '#6B7280', background: '#F3F4F6', borderRadius: 999, padding: '4px 12px', border: '1px solid #E5E7EB', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12m0 0V4m0 8H4m8 0h8" /><circle cx="12" cy="19" r="2"/></svg>
                                        {a.travelToNext}
                                      </span>
                                      <div style={{ flex: 1, height: 1, background: 'rgba(28,20,16,0.07)' }} />
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Day Summary bar */}
                            {acts.length > 0 && (
                              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', marginBottom: 8, overflow: 'hidden', boxShadow: '0 1px 5px rgba(28,20,16,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 56 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 10px 0 12px', borderRight: '1px solid #EBEBEB', flexShrink: 0 }}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                                    <span style={{ fontSize: 10.5, fontWeight: 700, color: D.espresso, fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap' }}>Day {d.day} Summary</span>
                                  </div>
                                  <div style={{ flex: 1, display: 'flex' }}>
                                    {[
                                      { val: `${dayDoneCount}/${dayTotalCount}`, label: 'Completed' },
                                      { val: durLabel, label: 'Total duration' },
                                      { val: walkMins > 0 ? `${walkMins} min` : '\u2014', label: 'Walk time' },
                                      { val: estSpend, label: 'Est. spend' },
                                    ].map((stat, si) => (
                                      <div key={si} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 3px', borderRight: si < 3 ? '1px solid #EBEBEB' : 'none' }}>
                                        <span style={{ fontSize: 12, fontWeight: 700, color: D.espresso, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.2 }}>{stat.val}</span>
                                        <span style={{ fontSize: 9.5, color: D.muted, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.3, textAlign: 'center' }}>{stat.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Tips & Recommendations */}
                            {hasTips && (
                              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EBEBEB', marginBottom: 8, overflow: 'hidden' }}>
                                <button onClick={toggleTips} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: D.espresso, fontFamily: "'Sora',sans-serif" }}>Tips &amp; Recommendations</span>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={D.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: tipsOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.22s ease' }}><polyline points="6 9 12 15 18 9"/></svg>
                                </button>
                                {tipsOpen && (
                                  <div style={{ display: 'flex', gap: 8, padding: '0 10px 12px', animation: 'accordionSlide 0.22s ease both' }}>
                                    {d.weather && (
                                      <div style={{ flex: 1, minWidth: 80, background: '#F4F9FF', borderRadius: 12, padding: '12px 10px', border: '1px solid #DDEEFF' }}>
                                        <div style={{ fontSize: 20, marginBottom: 5 }}>{(d.weather.high || 0) > 30 ? '\u2600\uFE0F' : (d.weather.high || 0) > 18 ? '\u26C5' : '🌧'}</div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: D.espresso, fontFamily: "'DM Sans',sans-serif", marginBottom: 3 }}>Weather</div>
                                        {(d.weather.high != null || d.weather.low != null) && <div style={{ fontSize: 11, color: D.muted }}>{d.weather.high}\u00b0C / {d.weather.low}\u00b0C</div>}
                                        {d.weather.condition && <div style={{ fontSize: 11, color: D.muted }}>{d.weather.condition}</div>}
                                      </div>
                                    )}
                                    {d.proTip && (
                                      <div style={{ flex: 1, minWidth: 90, background: '#FFFBF0', borderRadius: 12, padding: '12px 10px', border: '1px solid #FAC775' }}>
                                        <div style={{ fontSize: 20, marginBottom: 5 }}>⭐</div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: D.espresso, fontFamily: "'DM Sans',sans-serif", marginBottom: 3 }}>Local Tip</div>
                                        <div style={{ fontSize: 11, color: D.secondary, lineHeight: 1.55 }}>{d.proTip}</div>
                                      </div>
                                    )}
                                    {d.weather?.tip && (
                                      <div style={{ flex: 1, minWidth: 90, background: '#FFF8F3', borderRadius: 12, padding: '12px 10px', border: '1px solid rgba(255,106,0,0.18)' }}>
                                        <div style={{ fontSize: 20, marginBottom: 5 }}>💡</div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: D.espresso, fontFamily: "'DM Sans',sans-serif", marginBottom: 3 }}>Note</div>
                                        <div style={{ fontSize: 11, color: D.secondary, lineHeight: 1.55 }}>{d.weather.tip}</div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Collapsed day row */
                        <div onClick={toggleDay} style={{ background: '#fff', borderRadius: 14, border: '1px solid #EBEBEB', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 6px rgba(28,20,16,0.05)', cursor: 'pointer', userSelect: 'none' }}>
                          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FFF3E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, border: '1px solid rgba(255,106,0,0.1)' }}>{dayIcon}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11.5, color: D.muted, fontFamily: "'DM Sans',sans-serif", marginBottom: 2, lineHeight: 1 }}>
                              Day {d.day} · {dateLabel}{isArrivalDay ? ' · Arrival' : isDepartureDay ? ' · Departure' : ''}
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: D.espresso, fontFamily: "'Sora',sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title || d.theme}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: 12.5, color: D.muted, fontWeight: 500 }}>{dayDoneCount > 0 ? `${dayDoneCount}/${dayTotalCount}` : dayTotalCount} activities</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={D.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      <div style={{ display: iTab === 'nearby' ? 'block' : 'none' }}>
        <RecommendationsPage
          destination={form.dest}
          isSolo={isSolo}
          autoData={nearbyData}
          autoStep={nearbyStep}
          onRetry={() => {
            setNearbyStep('loading'); setNearbyData(null);
            fetchRecommendations(form.dest)
              .then(r => { setNearbyData(r); setNearbyStep('result'); })
              .catch(() => setNearbyStep('error'));
          }}
        />
      </div>
    </div>
  );
}
/* -------------------------------------------------------
   TRIP AI CHATBOT
------------------------------------------------------- */
export default ItineraryPage;
export { LocalTastePage };
