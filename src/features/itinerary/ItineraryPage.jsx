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
import lumi21Img from '../../assets/lumi21.png';
import ExperienceDiscovery from './ExperienceDiscovery';

/* ── Category colours (for My Selections sheet) ───────────── */
const EXP_CAT = {
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
function expCatCfg(c) { return EXP_CAT[c] || { bg: '#F4F2EE', color: '#8A7E76', emoji: '📍' }; }

/* ── Premium design tokens ─────────────────────────────────── */
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

/* ── CSS keyframe injection (pulse dot + card entry + shimmer) ── */
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

/* ── Lightbox ─────────────────────────────────────────────── */
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
      >✕</button>
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
      setData({ headline: `${dest} — Local Flavours`, tagline: 'Curated picks', dishes: [], places: [], experiences: [], tip: '' });
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
      if (i < full) stars.push('★');
      else if (i === full && half) stars.push('½');
      else stars.push('☆');
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

  /* ── Veg / Non-veg dot ── */
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

  /* ── Premium item card ── */
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
        {/* Photo at top — full width, clickable */}
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
              <span style={{ fontSize: 11, fontWeight: 600, color: '#0F6E56', background: D.sageTint, borderRadius: 999, padding: '2px 8px' }}>🕐 {item.bestTime}</span>
            )}
          </div>

          {/* Description with expand */}
          <div style={{ fontSize: 12.5, color: D.secondary, lineHeight: 1.65, marginBottom: 8 }}>
            {isExpanded || !descLong ? item.desc : `${item.desc.slice(0, 130)}…`}
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

  /* ── Section block with editorial header ── */
  const renderSec = ({ icon, title, subtitle, items, secKey, startIndex = 0, photoSuffix = 'photo', accentBg, accentColor: ac, sectionRef, onFilter, filterCount: secFilterCount = 0 }) => {
    const doneCount = items.filter((_, i) => doneItems.has(`${secKey}-${i}`)).length;
    if (!items.length) return null;
    return (
      <div style={{ marginBottom: '1.9rem' }}>
        {/* Section header — matches Nearby style */}
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

  if (step === 'loading') return <Spinner text={`Discovering the local life of ${dest}…`} solo={isSolo} />;

  const filterCount = filters.minRating > 0 ? 1 : 0;
  const TASTE_RATINGS = [{v:0,l:'Any'},{v:3,l:'3+'},{v:3.5,l:'3.5+'},{v:4,l:'4+'},{v:4.5,l:'4.5+'}];

  if (step === 'result' && data) return (
    <div style={{ background: D.bg, paddingBottom: '1.5rem', position: 'relative' }}>
      <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      {/* ── Filter Modal ── */}
      {filterOpen && (
        <div style={{ position:'fixed',inset:0,background:'rgba(14,16,24,0.45)',zIndex:600,display:'flex',alignItems:'flex-end',justifyContent:'center' }}
          onClick={e => { if (e.target === e.currentTarget) setFilterOpen(false); }}>
          <div style={{ width:'100%',maxWidth:560,background:'#fff',borderRadius:'24px 24px 0 0',padding:'1.1rem 1.1rem 2rem',boxShadow:'0 -8px 40px rgba(0,0,0,0.18)',animation:'rSheetIn 0.28s cubic-bezier(0.2,0.7,0.2,1) both' }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
              <div style={{ fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:800 }}>Filter Local Life</div>
              <button onClick={() => setFilterOpen(false)} style={{ width:30,height:30,borderRadius:'50%',border:'1px solid rgba(0,0,0,0.1)',background:'rgba(0,0,0,0.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#6b6b68',padding:0 }}>✕</button>
            </div>
            <div style={{ background:'#FDFCFA',borderRadius:16,padding:'13px 14px',marginBottom:16,border:'1px solid rgba(28,20,16,0.07)' }}>
              <div style={{ fontSize:11,color:D.muted,marginBottom:6,fontWeight:600 }}>Min rating</div>
              <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                {TASTE_RATINGS.map(f => (
                  <button key={f.v} onClick={() => setFilterDraft(p => ({...p,minRating:f.v}))}
                    style={{ fontSize:12,fontWeight:700,padding:'7px 14px',borderRadius:999,cursor:'pointer',fontFamily:"'DM Sans',sans-serif",border:`1.5px solid ${filterDraft.minRating===f.v?D.gold:'rgba(28,20,16,0.13)'}`,background:filterDraft.minRating===f.v?D.goldTint:'#FAFAF8',color:filterDraft.minRating===f.v?D.gold:'#7A7470' }}>
                    {f.v===0?'Any':'★ '+f.l}
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

      {/* ── Hero banner ── */}
      <div style={{
        position: 'relative', minHeight: 140, borderRadius: 16, overflow: 'hidden',
        background: 'linear-gradient(135deg, #2C1810 0%, #8B5E3C 50%, #C9913A 100%)',
        marginBottom: '1.25rem', boxShadow: '0 4px 20px rgba(28,20,16,0.18)',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 130, opacity: 0.06, lineHeight: 1 }}>🍜</div>
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
          {/* Stat buttons — click to switch active tab */}
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

      {/* ── Active section (tab-switched with animation) ── */}
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

      {/* ── Insider tip ── */}
      {data.tip && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: D.surface, border: `0.5px solid ${D.border}`, borderLeft: `3px solid ${D.gold}`, borderRadius: 12, padding: '12px 14px', boxShadow: '0 2px 8px rgba(28,20,16,0.06)' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
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

  /* ── Idle / entry state ── */
  return (
    <div style={{ background: D.bg }}>
      {/* Hero entry card */}
      <div style={{
        position: 'relative', borderRadius: 18, overflow: 'hidden', marginBottom: '1.25rem',
        background: 'linear-gradient(135deg, #1C1410 0%, #8B5E3C 60%, #C9913A 100%)',
        padding: '2rem 1.5rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(28,20,16,0.18)',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, fontSize: 150, opacity: 0.05, lineHeight: 1 }}>🍜</div>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🍽️</div>
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
          ✨ Discover local life
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

/* ═══════════════════════════════════════════════════════
   ITINERARY PAGE
═══════════════════════════════════════════════════════ */
const SLOT_LABELS = {
  night: '12AM–6AM',
  morning: '6AM–12PM',
  afternoon: '12PM–6PM',
  evening: '6PM–12AM',
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
  const [iTab, setITab] = useState(() => {
    try {
      const saved = localStorage.getItem(`tb_itab_${trip.id}`);
      if (saved === 'itinerary' && trip._cachedItin) return 'itinerary';
      // 'nearby' is not restored — Day Planner is always the entry point
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

  const [step, setStep] = useState(trip._cachedItin ? 'result' : 'discover');
  const [itin, setItin] = useState(trip._cachedItin?.itinerary || null);
  const [sources, setSources] = useState(trip._cachedItin?.sources || []);
  const [lastSelectedExps, setLastSelectedExps] = useState([]);
  const [showSelectionsSheet, setShowSelectionsSheet] = useState(false);
  const [sheetExps, setSheetExps] = useState([]);
  const [modifyExps, setModifyExps] = useState(null);
  const [plannerExpandedCats, setPlannerExpandedCats] = useState(new Set());
  const [localTasteData, setLocalTasteData] = useState(trip._cachedTaste || null);
  const [localTasteStep, setLocalTasteStep] = useState(trip._cachedTaste ? 'result' : 'loading');
  const hasGenerated = useRef(false);
  const [doneActivities, setDoneActivities] = useState(new Set());
  const activityNodeRefs = useRef({});
  const lastAutoScrollKeyRef = useRef(null);
  const toggleActivity = (key) => setDoneActivities(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const accentStyle = isSolo ? S.btnSolo : S.btnP;
  const accentColor = isSolo ? '#7F77DD' : '#1D9E75';
  const headerBg = isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : 'linear-gradient(135deg,#1D9E75,#0F6E56)';

  const TYPE_ICONS = {
    attraction: '🏛️', food: '🍽️', experience: '✨',
    transport: '🚗', hotel: '🏨', shopping: '🛍️',
  };

  const ENERGY_CONFIG = {
    high:   { label: 'Active',   symbol: '▲▲', bg: '#FAECE7', color: '#993C1D' },
    medium: { label: 'Moderate', symbol: '▲',  bg: '#E6F1FB', color: '#1A6BAD' },
    low:    { label: 'Easy',     symbol: '–',  bg: '#E8F8EE', color: '#1A7A4A' },
    rest:   { label: 'Rest',     symbol: '○',  bg: '#F4F3FF', color: '#534AB7' },
  };

  const firstActivitySlot = () => {
    const idx = SLOT_ORDER.indexOf(form.arrivalSlot);
    return SLOT_ORDER[Math.min(idx + 1, SLOT_ORDER.length - 1)];
  };

  // Persist iTab per trip so the user returns to the same tab (e.g. 'itinerary')
  useEffect(() => {
    try { localStorage.setItem(`tb_itab_${trip.id}`, iTab); } catch { /* ignore */ }
  }, [iTab, trip.id]);

  useEffect(() => {
    // If we already have cached data from the trip prop, show it immediately
    if (trip._cachedItin) {
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
      setSheetExps(selectedExperiences);
    }
    setStep('loading');
    try {
      const { generateItinerary } = await import('../../api');
      const result = await generateItinerary({
        destination: form.dest,
        days,
        budget: form.budget ? parseFloat(form.budget) : null,
        people: parseInt(form.people) || 1,
        interests: ['🛕 Temples', '🍽️ Food', '🛍️ Shopping'],
        arrivalSlot: form.arrivalSlot,
        departureSlot: form.departureSlot,
        firstActivitySlot: firstActivitySlot(),
        arrival: form.arrival,
        travelNotes: form.travelNotes || '',
        ...(selectedExperiences && selectedExperiences.length > 0 ? { selectedExperiences } : {}),
      });
      setItin(result.itinerary);
      setSources(result.sources || []);
      setStep('result');
      setITab('itinerary'); // auto-switch to Itinerary tab
      // ── Save back to parent trips state so it persists across tab switches ──
      onCacheUpdate?.({ _cachedItin: result });
    } catch {
      setStep('error');
    }
  };

  const runGenerateLocalTaste = async () => {
    // Don't flash spinner if we already have data — refresh silently
    if (!localTasteData) setLocalTasteStep('loading');
    try {
      const r = await generateLocalTaste({ destination: form.dest });
      setLocalTasteData(r);
      setLocalTasteStep('result');
      // Local taste is now Supabase-cached on the backend (destination_taste table).
      // No longer saving per-trip — Supabase is the single source of truth.
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

      {/* ── Underline tab switcher (Club-style) ── */}
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

      {/* ── TAB: DAY PLANNER (experience swipe flow) ── */}
      {iTab === 'planner' && (
        <div>
          {step === 'result' && itin ? (
            /* ── Itinerary Ready — redesigned header + inline selections ── */
            <div style={{ animation: 'edFadeUp 0.35s ease both' }}>

              {/* ── Orange header card with lumi21 ── */}
              <div style={{ background: 'linear-gradient(135deg,#FF6A00 0%,#FF8C3B 100%)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 6px 28px rgba(255,106,0,0.32)', marginBottom: '1rem', display: 'flex', alignItems: 'flex-end', minHeight: 120 }}>
                {/* Lumi on the left */}
                <img src={lumi21Img} alt="Lumi" style={{ height: 118, width: 'auto', objectFit: 'contain', flexShrink: 0, display: 'block' }} />
                {/* Content right */}
                <div style={{ flex: 1, padding: '1rem 1rem 1rem 0.5rem' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase', letterSpacing: 1.8, marginBottom: 3, fontFamily: "'DM Sans',sans-serif" }}>ITINERARY READY</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', fontFamily: "'Sora',sans-serif", lineHeight: 1.2, marginBottom: 2 }}>{days} day{days>1?'s':''} in {form.dest}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.82)', marginBottom: 10, fontFamily: "'DM Sans',sans-serif" }}>{(itin.days||[]).reduce((a,d)=>a+(d.activities||[]).length,0)} activities planned</div>
                  {/* Two CTA buttons */}
                  <div style={{ display: 'flex', gap: 7 }}>
                    <button
                      onClick={() => setITab('itinerary')}
                      style={{ flex: 1, padding: '8px 10px', fontSize: 11.5, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', background: '#fff', color: '#FF6A00', fontFamily: "'DM Sans',sans-serif", boxShadow: '0 2px 8px rgba(0,0,0,0.12)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >Go to Itinerary →</button>
                    <button
                      onClick={() => { if (lastSelectedExps.length > 0) { setModifyExps(lastSelectedExps); setStep('discover'); } else { handleRedo(); } }}
                      style={{ flex: 1, padding: '8px 10px', fontSize: 11.5, fontWeight: 600, borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.5)', cursor: 'pointer', background: 'rgba(255,255,255,0.15)', color: '#fff', fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    >✎ Modify Experiences</button>
                  </div>
                </div>
              </div>

              {/* ── View selected experiences (mirrors ExperienceDiscovery confirm page) ── */}
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
                            <span style={{ fontSize: 14, flexShrink: 0 }}>{cfg.emoji}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: D.espresso, fontFamily: "'DM Sans',sans-serif", flex: 1 }}>{cat}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: D.secondary, background: '#F0EFEC', borderRadius: 999, padding: '2px 7px', border: '1px solid rgba(28,20,16,0.1)', flexShrink: 0 }}>{items.length}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={D.muted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}><polyline points="6 9 12 15 18 9"/></svg>
                          </button>
                          {isOpen && (
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', padding: '6px 12px 10px' }}>
                              {items.map(e => (
                                <span key={e.id} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}22`, fontFamily: "'DM Sans',sans-serif", display: 'inline-flex', alignItems: 'center' }}>
                                  {e.name}
                                </span>
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
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 10, color: D.espresso }}>Building your itinerary…</div>
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
                  <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
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

      {/* ── TAB: ITINERARY (day-by-day schedule) ── */}
      {iTab === 'itinerary' && (
        <div>
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
          {step === 'result' && itin && (
            <div style={{ background: D.bg, paddingBottom: '2.5rem' }}>

              {/* ── Hero ── */}
              <div
                className="itin-hero-card"
                style={{
                  position: 'relative', minHeight: 140, borderRadius: 18, overflow: 'hidden',
                  background: 'linear-gradient(135deg, #1C1410 0%, #4A2C10 50%, #C9913A 100%)',
                  marginBottom: '1.25rem',
                }}>
                {/* Subtle grid texture overlay */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '18px 18px', pointerEvents: 'none', zIndex: 0 }} />
                <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 130, opacity: 0.05, lineHeight: 1, zIndex: 0 }}>🗺️</div>
                <div style={{ position: 'relative', zIndex: 1, padding: '1.25rem 1.25rem 1rem' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 7, fontFamily: "'DM Sans',sans-serif" }}>
                    Day-by-Day Planner
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: -0.4, marginBottom: 4, fontFamily: "'Sora',sans-serif" }}>
                    {days} day{days > 1 ? 's' : ''} in <span style={{ color: '#F5D9A8' }}>{form.dest}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.50)', lineHeight: 1.5, marginBottom: 16 }}>
                    Every hour considered. Every detail placed.
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 999, padding: '4px 10px' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5D9A8', display: 'inline-block' }} />
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Local time</span>
                    <span style={{ width: 1, height: 11, background: 'rgba(255,255,255,0.22)' }} />
                    <span style={{ fontSize: 11.5, color: '#fff', fontWeight: 700 }}>{nowTimeLabel}</span>
                    {destinationClock?.timeZone && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.64)' }}>{destinationClock.timeZone}</span>}
                  </div>
                  {/* Stats — plain text with dividers */}
                  {(() => {
                    const totalActs = (itin.days || []).reduce((a, dd) => a + (dd.activities || []).length, 0);
                    const mustSees  = (itin.days || []).reduce((a, dd) => a + (dd.activities || []).filter(act => act.mustDo).length, 0);
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'nowrap', paddingRight: itin.quickTips?.length > 0 ? '3rem' : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: "'Sora',sans-serif" }}>{days}</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>Days</span>
                        </div>
                        <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: "'Sora',sans-serif" }}>{totalActs}</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>Activities</span>
                        </div>
                        {mustSees > 0 && (
                          <>
                            <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#F5D9A8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#F5D9A8', fontFamily: "'Sora',sans-serif" }}>{mustSees}</span>
                              <span style={{ fontSize: 11, color: 'rgba(245,217,168,0.55)', whiteSpace: 'nowrap' }}>Must-Sees</span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* ── Glowing tips bulb — bottom-right of hero ── */}
                {itin.quickTips?.length > 0 && (
                  <button
                    className="tips-bulb-btn"
                    onClick={() => setShowTipsPopup(true)}
                    title={`${itin.quickTips.length} trip tips`}
                    style={{
                      position: 'absolute', bottom: 12, right: 12, zIndex: 2,
                      width: 38, height: 38, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.13)',
                      backdropFilter: 'blur(8px)',
                      border: '1.5px solid rgba(255,255,255,0.30)',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F5D9A8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="9" y1="18" x2="15" y2="18"/>
                      <line x1="10" y1="22" x2="14" y2="22"/>
                      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* ── Tips bottom-sheet popup ── */}
              {showTipsPopup && itin.quickTips?.length > 0 && (
                <div
                  style={{ position: 'fixed', inset: 0, background: 'rgba(14,16,24,0.50)', zIndex: 700, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
                  onClick={e => { if (e.target === e.currentTarget) setShowTipsPopup(false); }}
                >
                  <div style={{
                    width: '100%', maxWidth: 560,
                    background: '#FFFDF8',
                    borderRadius: '22px 22px 0 0',
                    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
                    boxShadow: '0 -10px 60px rgba(0,0,0,0.22)',
                    animation: 'tipsSheetIn 0.3s cubic-bezier(0.2,0.7,0.2,1) both',
                    maxHeight: '70vh',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                  }}>
                    {/* Drag handle */}
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
                      <div style={{ width: 36, height: 4, borderRadius: 99, background: 'rgba(28,20,16,0.14)' }} />
                    </div>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px 13px', borderBottom: `1px solid ${D.divider}`, flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 12, background: D.goldTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={D.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="9" y1="18" x2="15" y2="18"/>
                            <line x1="10" y1="22" x2="14" y2="22"/>
                            <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 800, color: D.espresso }}>Trip Tips</div>
                          <div style={{ fontSize: 11, color: D.muted, marginTop: 1 }}>{itin.quickTips.length} insider tips for your journey</div>
                        </div>
                      </div>
                      <button onClick={() => setShowTipsPopup(false)} style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${D.border}`, background: D.neutral, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: D.muted, padding: 0, flexShrink: 0 }}>✕</button>
                    </div>
                    {/* Scrollable tips list */}
                    <div style={{ overflowY: 'auto', padding: '12px 16px' }}>
                      {itin.quickTips.map((tip, i) => (
                        <div key={i} style={{
                          display: 'flex', gap: 11, alignItems: 'flex-start',
                          padding: '11px 13px',
                          background: D.surface,
                          borderRadius: 14,
                          marginBottom: 7,
                          border: `0.5px solid ${D.border}`,
                          boxShadow: '0 1px 4px rgba(28,20,16,0.04)',
                        }}>
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



              {/* ── Day sections ─────────────────────────────────── */}
              {firstLiveActivity && (
                <div style={{ position: 'sticky', top: 72, zIndex: 40, pointerEvents: 'none', marginLeft: 56, marginBottom: 8 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.96)', border: `1px solid ${D.gold}`, borderRadius: 999, padding: '5px 11px', boxShadow: '0 8px 24px rgba(201,145,58,0.24)', backdropFilter: 'blur(8px)' }}>
                    <span className="itin-now-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: D.gold, display: 'inline-block' }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: D.gold, letterSpacing: 0.7, textTransform: 'uppercase', fontFamily: "'DM Sans',sans-serif" }}>Now</span>
                    <span style={{ width: 1, height: 12, background: 'rgba(201,145,58,0.32)' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: D.espresso, maxWidth: 190, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nowTimeLabel} • {firstLiveActivity.time} • {firstLiveActivity.name}</span>
                  </div>
                </div>
              )}

              {(() => {
                let photoIndex = 0;
                return (itin.days || []).map((d, dayIndex) => {
                  const dateLabel = form.arrival ? formatTripDate(form.arrival, dayIndex) : `Day ${d.day}`;
                  const isArrivalDay   = dayIndex === 0;
                  const isDepartureDay = dayIndex === (itin.days.length - 1);
                  const dayTotalCount  = (d.activities || []).length;
                  const dayDoneCount   = (d.activities || []).filter((_, ai) => doneActivities.has(`day-${d.day}-act-${ai}`)).length;
                  const timedProgress = (d.activities || []).reduce((sum, act) => {
                    const p = getActivityTimeProgress(act.time, act.endTime, nowMinutes);
                    return sum + (p === null ? 0 : p);
                  }, 0);
                  const timedPct = dayTotalCount > 0 ? (timedProgress / dayTotalCount) * 100 : 0;
                  const donePct = dayTotalCount > 0 ? (dayDoneCount / dayTotalCount) * 100 : 0;
                  const dayProgressPct = Math.max(donePct, timedPct);
                  const dayProgressClamped = Math.max(0, Math.min(100, dayProgressPct));
                  const hasActiveNow = (d.activities || []).some(act => getActivityLiveState(act.time, act.endTime, nowMinutes) === 'active');
                  const WeatherSvg = ({ high }) => {
                    if (high > 30) return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E6A817" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
                    if (high > 18) return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7B9EC4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>;
                    return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7B9EC4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="19" x2="8" y2="21"/><line x1="8" y1="13" x2="8" y2="15"/><line x1="16" y1="19" x2="16" y2="21"/><line x1="16" y1="13" x2="16" y2="15"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="12" y1="15" x2="12" y2="17"/><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/></svg>;
                  };

                  return (
                    <div key={d.day} style={{ marginBottom: '1.75rem' }}>

                      {/* ── Day header ── */}                      <div className="day-header-card" style={{ background: D.surface, borderRadius: 18, marginBottom: 12, overflow: 'hidden', boxShadow: '0 2px 14px rgba(28,20,16,0.08)', border: `0.5px solid ${D.border}` }}>
                        {/* Gradient accent bar at top */}
                        <div style={{ height: 3, background: isSolo ? 'linear-gradient(90deg,#7F77DD,#534AB7)' : `linear-gradient(90deg,${D.gold},#A8731E,${D.gold})` }} />
                        {/* Flex row: content left + Day N right */}
                        <div style={{ display: 'flex', alignItems: 'stretch' }}>
                          <div style={{ flex: 1, padding: '12px 13px 11px' }}>
                            {/* Row 1: date + weather */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: D.muted, letterSpacing: 0.3, fontFamily: "'DM Sans',sans-serif" }}>{dateLabel}</span>
                              {d.weather && (
                                <span style={{ fontSize: 11, color: D.secondary, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                  <WeatherSvg high={d.weather.high} />
                                  <span style={{ color: D.coral, fontWeight: 600 }}>{d.weather.high}°</span>
                                  <span style={{ color: D.muted, opacity: 0.65 }}>/{d.weather.low}°</span>
                                </span>
                              )}
                            </div>
                            {/* Row 2: Theme — Sora 700 */}
                            <div style={{ fontSize: 15, fontWeight: 700, color: D.espresso, fontFamily: "'Sora',sans-serif", lineHeight: 1.35, marginBottom: (isArrivalDay || isDepartureDay || d.estimatedCost || dayDoneCount > 0) ? 8 : 0 }}>
                              {d.title || d.theme}
                            </div>
                            {/* Row 3: Badges */}
                            {(isArrivalDay || isDepartureDay || dayDoneCount > 0 || dayTotalCount > 0) && (
                              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                                {isArrivalDay && (
                                  <span style={{ fontSize: 10, fontWeight: 700, background: D.blueTint, color: '#2563AB', borderRadius: 999, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2c-.6.1-.9.7-.5 1.2l5.7 5.7-1.8 4.8"/></svg>
                                    Arrives
                                  </span>
                                )}
                                {isDepartureDay && (
                                  <span style={{ fontSize: 10, fontWeight: 700, background: D.coralTint, color: D.coral, borderRadius: 999, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
                                    Departs
                                  </span>
                                )}
                                {dayDoneCount > 0 && (
                                  <span style={{ fontSize: 10, fontWeight: 600, background: D.sageTint, color: D.sage, borderRadius: 999, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,6 5,9 10,3"/></svg>
                                    {dayDoneCount}/{dayTotalCount}
                                  </span>
                                )}
                                {dayTotalCount > 0 && (
                                  <span style={{ fontSize: 10, fontWeight: 700, background: hasActiveNow ? D.goldTint : D.neutral, color: hasActiveNow ? D.gold : D.muted, borderRadius: 999, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                    <span className={hasActiveNow ? 'itin-now-dot' : ''} style={{ width: 6, height: 6, borderRadius: '50%', background: hasActiveNow ? D.gold : '#C7C1B8', display: 'inline-block' }} />
                                    Live {Math.round(dayProgressPct)}%
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {/* Day N badge — RIGHT side */}
                          <div style={{ width: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: isSolo ? 'linear-gradient(160deg,#7F77DD,#534AB7)' : `linear-gradient(160deg,${D.gold},#A8731E)`, flexShrink: 0 }}>
                            <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: .5, lineHeight: 1 }}>Day</span>
                            <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.1, fontFamily: "'Sora',sans-serif" }}>{d.day}</span>
                          </div>
                        </div>
                        {/* Integrated tips inside card */}
                        {(d.weather?.tip || d.proTip) && (
                          <div style={{ borderTop: `1px solid ${D.divider}`, background: isSolo ? 'rgba(127,119,221,0.04)' : 'rgba(201,145,58,0.04)', padding: '9px 13px 10px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {d.weather?.tip && (
                              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isSolo ? '#534AB7' : '#0F6E56'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>
                                <span style={{ fontSize: 12, color: isSolo ? '#534AB7' : '#0F6E56', lineHeight: 1.55 }}>{d.weather.tip}</span>
                              </div>
                            )}
                            {d.proTip && (
                              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={D.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                <span style={{ fontSize: 12, color: '#5a3a0a', lineHeight: 1.55 }}><strong style={{ color: D.gold, fontWeight: 700 }}>Local:</strong> {d.proTip}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {/* Progress bar */}
                        {dayTotalCount > 0 && (
                          <div style={{ position: 'relative', height: 20 }}>
                            <div style={{ position: 'absolute', left: 0, right: 0, top: 9, height: 2.5, background: D.neutral }} />
                            <div className={hasActiveNow ? 'itin-live-bar' : ''} style={{ position: 'absolute', left: 0, top: 9, height: 2.5, width: `${dayProgressClamped}%`, background: isSolo ? '#7F77DD' : D.gold, transition: 'width 0.6s ease' }} />
                            <div className={hasActiveNow ? 'itin-now-dot' : ''} style={{ position: 'absolute', top: 5.5, left: `calc(${dayProgressClamped}% - 4px)`, width: 8, height: 8, borderRadius: '50%', background: isSolo ? '#7F77DD' : D.gold, transition: 'left 0.6s ease' }}>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Activities */}
                      {(d.activities || []).map((a, i) => {
                        const showPhoto  = a.type !== 'hotel' && a.type !== 'transport' && a.type !== 'travel';
                        const currentDelay = showPhoto ? photoIndex++ * 600 : 0;
                        const isLast   = i === d.activities.length - 1;
                        const doneKey  = `day-${d.day}-act-${i}`;
                        const isDone   = doneActivities.has(doneKey);
                        const liveState = getActivityLiveState(a.time, a.endTime, nowMinutes);
                        const isActive = liveState === 'active';
                        const isPast = liveState === 'past';
                        const connectorProgress = getActivityTimeProgress(a.time, a.endTime, nowMinutes);
                        const connectorPct = Math.max(0, Math.min(100, ((connectorProgress === null ? (isPast ? 100 : 0) : connectorProgress * 100))));
                        const liveHintKey = `${doneKey}-live`;
                        const isHintVisible = (liveHintHoverKey === liveHintKey) || (liveHintPinnedKey === liveHintKey);
                        const liveWhatText = `Now ${nowTimeLabel}: ${a.name} is in progress (${Math.round(connectorPct)}% done). Follow this step in your itinerary.`;
                        const dotColor = isActive ? D.gold : (isPast ? '#BCA478' : (a.mustDo ? D.gold : '#D3CFC8'));
                        const allTags  = [
                          ...(a.mustDo ? ['MUST DO'] : []),
                          ...(a.energyLevel && ENERGY_CONFIG[a.energyLevel] ? [ENERGY_CONFIG[a.energyLevel].label] : []),
                        ];
                        const typeAccent = a.type === 'food' ? D.coral : a.type === 'experience' ? '#7F77DD' : a.type === 'shopping' ? D.sage : a.mustDo ? D.gold : D.border;

                        return (
                          <div
                            key={i}
                            ref={(el) => {
                              if (el) activityNodeRefs.current[doneKey] = el;
                              else delete activityNodeRefs.current[doneKey];
                            }}
                          >
                            {/* Timeline row */}
                            <div style={{ display: 'flex', gap: 0, opacity: isDone ? 0.42 : 1, transition: 'opacity .3s' }}>

                              {/* Time + dot column */}
                              <div style={{ width: 52, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 10, paddingTop: 5 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: D.espresso, lineHeight: 1, fontFamily: "'DM Sans',sans-serif" }}>{a.time}</span>
                                {a.endTime && <span style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>{a.endTime}</span>}
                                {isActive && (
                                  <span style={{ marginTop: 3, fontSize: 9, fontWeight: 800, color: D.gold, letterSpacing: 0.35, textTransform: 'uppercase' }}>
                                    Now {nowTimeLabel}
                                  </span>
                                )}
                              </div>

                              {/* Connector */}
                              <div style={{ width: 20, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 7 }}>
                                <div style={{ position: 'relative', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {isActive && <div className="itin-dot-glow" style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: 'rgba(201,145,58,0.22)' }} />}
                                  <div className={isActive ? 'itin-dot-active itin-now-dot' : ''} style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, zIndex: 1, boxShadow: (isActive || a.mustDo) ? `0 0 0 3px ${D.goldTint}` : 'none', transition: 'background .35s ease' }} />
                                </div>
                                {!isLast && (
                                  <div style={{ position: 'relative', width: 1.5, flex: 1, background: D.divider, marginTop: 1, overflow: 'visible' }}>
                                    <div
                                      style={{
                                        position: 'absolute', left: 0, right: 0, top: 0,
                                        height: `${connectorPct}%`,
                                        background: isSolo ? '#7F77DD' : D.gold,
                                        transition: 'height 0.7s cubic-bezier(0.2,0.7,0.2,1)',
                                      }}
                                    />
                                    {isActive && (
                                      <div data-live-hint-layer="1">
                                        <button
                                          type="button"
                                          className="itin-live-walker"
                                          title={liveWhatText}
                                          aria-label={liveWhatText}
                                          onMouseEnter={() => setLiveHintHoverKey(liveHintKey)}
                                          onMouseLeave={() => setLiveHintHoverKey(prev => (prev === liveHintKey ? null : prev))}
                                          onClick={() => setLiveHintPinnedKey(prev => (prev === liveHintKey ? null : liveHintKey))}
                                          style={{ position: 'absolute', left: '50%', top: `calc(${connectorPct}% - 8px)`, width: 16, height: 16, borderRadius: '50%', transform: 'translateX(-50%)', background: '#fff', border: `1px solid ${isSolo ? '#7F77DD' : D.gold}`, boxShadow: '0 2px 10px rgba(28,20,16,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'top 0.7s cubic-bezier(0.2,0.7,0.2,1)', cursor: 'pointer', padding: 0, zIndex: 3 }}
                                        >
                                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={isSolo ? '#7F77DD' : D.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="5" r="2.4" />
                                            <path d="M12 8.5v5M12 11.5l-4 2.5M12 11.5l4 2.5M12 13.5l-3 5M12 13.5l3 5" />
                                          </svg>
                                        </button>
                                        {isHintVisible && (
                                          <div style={{ position: 'absolute', left: 12, top: `calc(${connectorPct}% - 14px)`, transform: 'translateX(0)', minWidth: 168, maxWidth: 240, background: '#1F1713', color: '#fff', borderRadius: 10, padding: '8px 9px', boxShadow: '0 10px 24px rgba(0,0,0,0.24)', zIndex: 4 }}>
                                            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.45, textTransform: 'uppercase', color: '#F5D9A8', marginBottom: 4 }}>Live status</div>
                                            <div style={{ fontSize: 11, lineHeight: 1.45 }}>{liveWhatText}</div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* ── PHOTO-FIRST activity card ── */}
                              <div
                                className={`itin-card-enter itin-act-enter itin-photo-card ${isActive ? 'itin-live-active-card' : ''}`}
                                style={{ flex: 1, marginLeft: 10, marginBottom: 10, background: D.surface, borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(28,20,16,0.06)', border: `0.5px solid ${D.border}`, borderLeft: showPhoto ? `0.5px solid ${D.border}` : `3px solid ${typeAccent}`, minWidth: 0, animationDelay: `${i * 60}ms` }}
                              >
                                {/* Photo at top (non-hotel/transport only) */}
                                {showPhoto && (
                                  <div
                                    style={{ position: 'relative', height: 150, overflow: 'hidden', cursor: 'zoom-in', background: D.neutral }}
                                    onClick={e => { const img = e.currentTarget.querySelector('img'); if (img?.src) setLightboxUrl(img.src); }}
                                  >
                                    <PlacePhotoCarousel
                                      query={`${a.name} ${form.dest} photo`}
                                      style={{ height: 150, borderRadius: 0 }}
                                      delay={currentDelay}
                                      limit={3}
                                      alt={a.name}
                                      onImageClick={(url) => setLightboxUrl(url)}
                                    />
                                    {/* gradient on photo */}
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(28,20,16,0.62) 100%)', pointerEvents: 'none' }} />
                                    {/* activity type badge top-left */}
                                    <div className="itin-float" style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 4, backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
                                      <span style={{ fontSize: 14 }}>{a.icon || TYPE_ICONS[a.type] || '📍'}</span>
                                      <span style={{ fontSize: 10, fontWeight: 700, color: D.espresso, textTransform: 'uppercase', letterSpacing: .5, fontFamily: "'DM Sans',sans-serif" }}>{a.type}</span>
                                    </div>
                                    {/* mustDo gold badge top-right */}
                                    {a.mustDo && (
                                      <div style={{ position: 'absolute', top: 10, right: 10, background: D.gold, borderRadius: 999, padding: '3px 9px', fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: .6, textTransform: 'uppercase', fontFamily: "'DM Sans',sans-serif", boxShadow: '0 2px 8px rgba(201,145,58,0.45)' }}>★ Must Do</div>
                                    )}
                                    {/* name + time overlaid */}
                                    <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12, pointerEvents: 'none' }}>
                                      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2, textShadow: '0 1px 6px rgba(0,0,0,0.5)', fontFamily: "'Sora',sans-serif", textDecoration: isDone ? 'line-through' : 'none' }}>{a.name}</div>
                                    </div>
                                    {/* done overlay */}
                                    {isDone && (
                                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,20,16,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(1px)' }}>
                                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <polyline points="4,12 9,17 20,7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Card body */}
                                <div style={{ padding: '11px 13px 12px' }}>
                                  {/* Name row for hotel/transport (no photo) */}
                                  {!showPhoto && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                                      <span style={{ fontSize: 18 }}>{a.icon || TYPE_ICONS[a.type] || '📍'}</span>
                                      <span style={{ fontSize: 14, fontWeight: 700, color: isDone ? D.muted : D.espresso, textDecoration: isDone ? 'line-through' : 'none', fontFamily: "'Sora',sans-serif" }}>{a.name}</span>
                                    </div>
                                  )}

                                  {/* Tags */}
                                  {allTags.length > 0 && (
                                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 7 }}>
                                      {allTags.map((tag, ti) => {
                                        const ts = tagStyle(tag, tag === 'MUST DO');
                                        return <span key={ti} style={{ fontSize: 10, fontWeight: 700, letterSpacing: .7, textTransform: 'uppercase', padding: '2px 9px', borderRadius: 999, background: ts.bg, color: ts.color }}>{tag}</span>;
                                      })}
                                    </div>
                                  )}

                                  {/* Opening hours */}
                                  {a.openingHours && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                                      <span style={{ fontSize: 11 }}>🕐</span>
                                      <span style={{ fontSize: 11.5, color: D.muted }}>Open {a.openingHours}</span>
                                      {a.hoursSource === 'verified'  && <span style={{ fontSize: 9, fontWeight: 700, background: D.sageTint, color: D.sage, borderRadius: 4, padding: '1px 5px' }}>✓ verified</span>}
                                      {a.hoursSource === 'estimated' && <span style={{ fontSize: 9, fontStyle: 'italic', background: '#F4F3FF', color: '#7A6FCF', borderRadius: 4, padding: '1px 5px' }}>Estimated</span>}
                                    </div>
                                  )}

                                  {/* Description */}
                                  {(a.note || a.description) && (
                                    <div style={{ fontSize: 12.5, color: D.secondary, lineHeight: 1.65, marginBottom: 7 }}>{a.note || a.description}</div>
                                  )}

                                  {/* Heads-up warning */}
                                  {a.headsUp && (
                                    <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', background: '#FFFBF0', border: '0.5px solid #FAC775', borderRadius: 8, padding: '7px 10px', marginBottom: 7 }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                      <span style={{ fontSize: 11, color: '#7A4F00', lineHeight: 1.5 }}>{a.headsUp}</span>
                                    </div>
                                  )}

                                  {/* Meta row */}
                                  {(a.duration || a.cost || a.area) && (
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 9 }}>
                                      {a.duration && (
                                        <span style={{ fontSize: 11, color: D.muted, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                          {a.duration}
                                        </span>
                                      )}
                                      {a.cost && (
                                        <span style={{ fontSize: 11, color: D.gold, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                                          {a.cost}
                                        </span>
                                      )}
                                      {a.area && (
                                        <span style={{ fontSize: 11, color: D.muted, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                          {a.area}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Action pills */}
                                  {a.type !== 'hotel' && a.type !== 'transport' && a.type !== 'travel' && (
                                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                                      <a className="itin-action-pill"
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.name} ${form.dest}`)}`}
                                        target="_blank" rel="noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#2563AB', background: D.blueTint, borderRadius: 999, padding: '6px 14px', textDecoration: 'none', fontWeight: 600, border: 'none', fontFamily: "'DM Sans',sans-serif" }}
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                        Maps
                                      </a>
                                      <a className="itin-action-pill"
                                        href={`https://www.google.com/search?q=${encodeURIComponent(`${a.name} ${form.dest}`)}`}
                                        target="_blank" rel="noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: D.secondary, background: D.neutral, borderRadius: 999, padding: '6px 14px', textDecoration: 'none', fontWeight: 600, border: 'none', fontFamily: "'DM Sans',sans-serif" }}
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                        Know more
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Done toggle */}
                              <button
                                onClick={() => toggleActivity(doneKey)}
                                style={{
                                  flexShrink: 0, alignSelf: 'flex-start', marginTop: 6, marginLeft: 6,
                                  width: 28, height: 28, borderRadius: '50%',
                                  border: isDone ? 'none' : `1.5px solid ${D.border}`,
                                  background: isDone ? accentColor : D.surface,
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  boxShadow: isDone ? `0 2px 8px ${accentColor}55` : 'none',
                                  transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                                }}
                              >
                                {isDone ? (
                                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                    <polyline points="2.5,6.5 5.5,9.5 10.5,3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                ) : (
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <circle cx="6" cy="6" r="5" stroke={D.border} strokeWidth="1.5"/>
                                  </svg>
                                )}
                              </button>
                            </div>

                            {/* Transit chip */}
                            {!isLast && a.travelToNext && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0 8px 20px' }}>
                                <div style={{ flex: 1, height: 1, background: D.divider }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: D.neutral, borderRadius: 999, padding: '3px 11px', fontSize: 11, color: D.muted, flexShrink: 0 }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={D.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                                  {a.travelToNext}
                                </div>
                                <div style={{ flex: 1, height: 1, background: D.divider }} />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* ── Day closing ── */}
                      {(() => {
                        const acts = d.activities || [];
                        const lastAct = acts[acts.length - 1];
                        const isLastDay = dayIndex === (itin.days.length - 1);
                        if (!acts.length || lastAct?.type === 'hotel' || lastAct?.type === 'stay') return null;
                        // Pick a unique closing message per day (rotate through the 30)
                        const closing = isLastDay
                          ? { label: 'Journey Home', note: 'Safe travels! Pack up and head to the airport or station — your adventure ends here, until next time.' }
                          : DAY_CLOSING_MSGS[dayIndex % DAY_CLOSING_MSGS.length];
                        return (
                          <div className="day-closing-card" style={{ display: 'flex', gap: 0, marginTop: 6, marginBottom: 8 }}>
                            <div style={{ width: 52, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 10, paddingTop: 10 }}>
                              <span style={{ fontSize: 10, fontWeight: 500, color: D.muted, fontFamily: "'DM Sans',sans-serif", letterSpacing: 0.2 }}>Night</span>
                            </div>
                            <div style={{ width: 20, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C8C4BC', border: `2px solid ${D.neutral}` }} />
                            </div>
                            <div style={{ flex: 1, marginLeft: 10 }}>
                              <div style={{ background: 'linear-gradient(135deg,#F9F7F3,#F4F2EE)', border: `0.5px solid ${D.border}`, borderRadius: 14, padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 34, height: 34, borderRadius: 11, background: isSolo ? '#F4F3FF' : '#F0FAF6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {isLastDay ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isSolo ? '#534AB7' : D.sage} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                      <polyline points="9 22 9 12 15 12 15 22"/>
                                    </svg>
                                  ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isSolo ? '#534AB7' : D.sage} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
                                      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
                                      <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
                                    </svg>
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: D.espresso, fontFamily: "'DM Sans',sans-serif", marginBottom: 3 }}>{closing.label}</div>
                                  <div style={{ fontSize: 11.5, color: D.muted, lineHeight: 1.55, fontFamily: "'DM Sans',sans-serif" }}>{closing.note}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                });
              })()}

              {/* Scroll-to-top in Day Planner */}
              {showPlannerScrollTop && (
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

              {sources.length > 0 && (
                <div style={{ background: D.surface, border: `0.5px solid ${D.border}`, borderRadius: 12, padding: '12px 14px', marginTop: 4, boxShadow: D.cardShadow }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    Researched from
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {sources.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, color: isSolo ? '#534AB7' : '#0F6E56', background: isSolo ? '#EEEDFE' : D.sageTint, borderRadius: 999, padding: '4px 11px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        {s.title?.slice(0, 28) || new URL(s.url).hostname}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
/* ═══════════════════════════════════════════════════════
   TRIP AI CHATBOT
═══════════════════════════════════════════════════════ */
export default ItineraryPage;
export { LocalTastePage };
