import { useState, useRef, useEffect, useCallback } from 'react';
import {
  formatDateRange,
  normalizeMembers,
  tripDuration,
  tripStatusInfo,
} from '../shared/constants';
import { S } from '../shared/styles';
import { Avatar, SoloAvatar, ConfirmDialog } from '../shared/ui';
import { fetchPlacePhotos, getFxRatesFromBackend } from '../../api';
import currencyData from '../../../currency.json';
import CreateTripWizard from './CreateTripWizard';
import mountainImg from '../../assets/mountain.png';
import lumi9 from '../../assets/lumi9.png';

const FX_API_KEY = 'cce33519f478fe73220306ed';
const _fxMemCache = {};

const BUDGET_CURRENCIES = [
  'INR','USD','EUR','GBP','AED','AUD','CAD','CHF','CNY','JPY',
  'SGD','THB','MYR','IDR','VND','KRW','NPR','LKR','BDT','PKR',
];

function lookupCountryCurrency(country) {
  if (!country) return '';
  const trimmed = String(country).trim();
  if (currencyData[trimmed]) return currencyData[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [k, v] of Object.entries(currencyData)) {
    if (v && k.toLowerCase() === lower) return v;
  }
  return '';
}

export async function getCurrencyForCountry(country) {
  if (!country) return '';
  const fromJson = lookupCountryCurrency(country);
  if (fromJson) return fromJson;
  try {
    const res = await fetch(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(country)}?fields=currencies`,
      { signal: AbortSignal.timeout(4000) }
    );
    const data = await res.json();
    const codes = data?.[0]?.currencies ? Object.keys(data[0].currencies) : [];
    return codes[0] || '';
  } catch { return ''; }
}

export async function getFxRate(from, to) {
  if (!from || !to || from === to) return 1;
  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = `fx_v2_${from}`;
  // 1. In-memory (instant, no I/O)
  const mem = _fxMemCache[cacheKey];
  if (mem && mem.date === today && mem.rates?.[to] != null) return mem.rates[to];
  // 2. localStorage (instant, survives refresh)
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today && parsed.rates?.[to] != null) {
        _fxMemCache[cacheKey] = parsed;
        return parsed.rates[to];
      }
    }
  } catch { /* ignore */ }
  // 3. Backend / Supabase DB (globally shared, once per day per currency)
  try {
    const data = await getFxRatesFromBackend(from);
    if (data.rates?.[to] != null) {
      const entry = { date: data.date || today, rates: data.rates };
      _fxMemCache[cacheKey] = entry;
      try { localStorage.setItem(cacheKey, JSON.stringify(entry)); } catch { /* ignore */ }
      return data.rates[to];
    }
  } catch { /* ignore */ }
  // 4. Direct ExchangeRate API (last resort, no backend)
  try {
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${FX_API_KEY}/latest/${from}`);
    const data = await res.json();
    if (data.result === 'success' && data.conversion_rates) {
      const entry = { date: today, rates: data.conversion_rates };
      _fxMemCache[cacheKey] = entry;
      try { localStorage.setItem(cacheKey, JSON.stringify(entry)); } catch { /* ignore */ }
      return data.conversion_rates[to] ?? 1;
    }
  } catch { /* ignore */ }
  return 1;
}

const HERO_TAGLINES = [
{ icon: '🌿', line1: 'Rishikesh,', line2: 'fix me!' },
{ icon: '🐘', line1: 'Coorg said', line2: '"stay"' },
{ icon: '🌊', line1: 'Goa,', line2: 'off-season vibes?' },
{ icon: '🎭', line1: "Vienna's", line2: 'old town' },
{ icon: '📵', line1: 'Spiti,', line2: 'no signal!' },
{ icon: '🎒', line1: 'Kasol,', line2: 'lost again?' },
{ icon: '🏔️', line1: 'Ladakh', line2: 'called again!' },
{ icon: '🌿', line1: 'Meghalaya,', line2: 'clouds live here' },
{ icon: '☕', line1: 'Hidden cafes,', line2: 'Lisbon' },
{ icon: '🌴', line1: 'Andamans,', line2: 'who needs wifi?' },
{ icon: '🏯', line1: 'Jaipur,', line2: 'dress accordingly!' },
{ icon: '🌸', line1: 'Cherry blossoms,', line2: 'Tokyo' },
{ icon: '🚂', line1: 'Darjeeling,', line2: 'sip slowly.' },
{ icon: '🌊', line1: 'Sunrise surf,', line2: 'Bali' },
{ icon: '🍵', line1: 'Munnar', line2: 'stole me' },
{ icon: '🛺', line1: 'Varanasi', line2: 'never sleeps!' },
];

const HERO_GREETINGS = {
  morning: ['Rise & wander', 'Suitcase ready?', 'Sunrise mode on', 'Up early, go far', 'Morning, explorer'],
  afternoon: ['Midday dreamer', 'Sun-chasing mode', 'Wanderlust calling', 'Plan something wild', 'Afternoon escape'],
  evening: ['Golden hour plans', 'Dusk wanderer', 'Evening plotters', 'Sunset chaser', 'Bag it, book it'],
  night: ['Night owl travels', 'Stars out, bags ready', 'Late night routes', 'Moon & destinations', 'Plotting after dark'],
};

// currency utilities — see top of file (getFxRate, getCurrencyForCountry)

function TripCard({ trip, idx, onOpen, copied, onCopy, menuOpen, setMenuOpen, setConfirmComplete, setConfirmDelete, forceMonochrome = false, showMenu = true, isArchiving = false }) {
  const [photos, setPhotos] = useState([]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const touchStartX = useRef(null);

  useEffect(() => {
    if (!trip.destination) return;
    let cancelled = false;
    fetchPlacePhotos(trip.destination)
      .then(data => {
        if (cancelled) return;
        const urls = (data.urls || []).slice(0, 3);
        if (urls.length) setPhotos(urls);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [trip.destination]);

  // Auto-advance photos on a loop
  useEffect(() => {
    if (photos.length < 2) return;
    const timer = setInterval(() => {
      setPhotoIdx(i => (i + 1) % photos.length);
    }, 2600);
    return () => clearInterval(timer);
  }, [photos.length]);

  const status = tripStatusInfo(trip.arrival, trip.departure, trip.completed);
  const days = tripDuration(trip.arrival, trip.departure);
  const totalSpend = (trip.expenses || []).reduce((s, e) => s + e.amount, 0);
  const memberNames = normalizeMembers(trip.members);
  const budgetBase = trip.budget || 0;
  const budgetPct = budgetBase > 0 ? Math.min(100, Math.round((totalSpend / budgetBase) * 100)) : 0;
  const budgetLeft = Math.max(0, Math.round(budgetBase - totalSpend));
  const isMenuOpen = menuOpen === trip.id;
  const isPast = status.label === 'Past' || status.label === 'Completed';
  const daysToStart = trip.arrival ? Math.ceil((new Date(trip.arrival).getTime() - Date.now()) / 86400000) : null;
  const statusPillLabel = status.label === 'Ongoing'
    ? 'Live'
    : (daysToStart != null && daysToStart > 0 ? `In ${daysToStart}d` : (isPast ? 'Past' : status.label));
  const cardBg = trip.isSolo
    ? 'linear-gradient(145deg,#121a42 0%,#27316c 52%,#171d4a 100%)'
    : 'linear-gradient(145deg,#083433 0%,#0f5a55 52%,#0a3c38 100%)';
  const glowBg = trip.isSolo
    ? 'radial-gradient(circle,rgba(127,119,221,0.42) 0%,transparent 72%)'
    : 'radial-gradient(circle,rgba(29,158,117,0.42) 0%,transparent 72%)';
  const barFill = trip.isSolo
    ? 'linear-gradient(90deg,#FF6B35,#FFAA80)'
    : 'linear-gradient(90deg,#1D9E75,#5DCAA5)';
  let statusBadgeStyle;
  if (isPast) {
    statusBadgeStyle = { background: 'rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.78)', border: '1px solid rgba(255,255,255,0.28)', backdropFilter: 'blur(7px)' };
  } else if (status.label === 'Ongoing') {
    statusBadgeStyle = { background: 'rgba(29,158,117,0.22)', color: '#86EFC9', border: '1px solid rgba(94,232,184,0.36)', backdropFilter: 'blur(7px)' };
  } else {
    statusBadgeStyle = { background: 'rgba(29,158,117,0.22)', color: '#86EFC9', border: '1px solid rgba(94,232,184,0.36)', backdropFilter: 'blur(7px)' };
  }
  const cardDelay = idx * 70;

  return (
    <div
      className={`tb-trip-card-new${isArchiving ? ' tb-trip-archiving' : ''}`}
      style={{ background: cardBg, opacity: isPast ? 0.72 : 1, animation: `fadeUp 0.45s ease both`, animationDelay: `${cardDelay}ms`, border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 18px 42px rgba(16,24,40,0.22), 0 4px 10px rgba(16,24,40,0.14)', filter: forceMonochrome ? 'grayscale(1) saturate(0.02) contrast(1.06)' : 'none' }}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchStartX.current === null || photos.length < 2) return;
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) setPhotoIdx(i => (i + (diff > 0 ? 1 : -1) + photos.length) % photos.length);
        touchStartX.current = null;
      }}
    >
      {/* Photo backgrounds */}
      {photos.map((url, i) => (
        <img
          key={url}
          src={url}
          alt=""
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            opacity: i === photoIdx ? 1 : 0,
            transition: 'opacity 0.38s ease, transform 2.1s ease',
            transform: i === photoIdx ? 'scale(1.05)' : 'scale(1.008)',
            filter: 'brightness(0.74) saturate(1.24) contrast(1.08)',
            zIndex: 0,
            pointerEvents: 'none',
          }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      ))}

      {/* Bottom scrim for text contrast */}
      {photos.length > 0 && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 38%)', zIndex: 1, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(3,9,24,0.02) 0%, rgba(3,9,24,0.08) 48%, rgba(3,9,24,0.5) 100%)', zIndex: 1, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.14) 0%, transparent 52%)', zIndex: 1, pointerEvents: 'none' }} />
        </>
      )}

      {/* Slide dot indicators */}
      {photos.length > 1 && (
        <div style={{ position: 'absolute', bottom: 38, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5, zIndex: 10, pointerEvents: 'none' }}>
          {photos.map((_, i) => (
            <div key={i} style={{ width: i === photoIdx ? 18 : 5, height: 5, borderRadius: 99, background: i === photoIdx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.38)', transition: 'all 0.3s ease', boxShadow: i === photoIdx ? '0 1px 8px rgba(255,255,255,0.5)' : 'none' }} />
          ))}
        </div>
      )}

      {/* glow blob */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 130, height: 130, borderRadius: '50%', background: glowBg, pointerEvents: 'none', zIndex: 1 }} />
      {/* inner top shine */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 68, background: 'linear-gradient(180deg,rgba(255,255,255,0.11) 0%,transparent 100%)', borderRadius: '26px 26px 0 0', pointerEvents: 'none', zIndex: 2 }} />
      {/* card body */}
      <div style={{ padding: '14px 16px 0', position: 'relative', zIndex: 3, cursor: 'pointer' }} onClick={(event) => onOpen(trip.id, event)}>
        {/* top row */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {trip.isSolo && (
              <span style={{ padding: '5px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(99,102,241,0.2)', color: '#C7D2FE', border: '1px solid rgba(129,140,248,0.42)', boxShadow: '0 0 20px rgba(79,70,229,0.28)' }}>Solo</span>
            )}
            <span style={{ padding: '5px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700, ...statusBadgeStyle, ...((!isPast) ? { boxShadow: '0 0 20px rgba(34,197,94,0.22)' } : {}) }}>
              {statusPillLabel}
            </span>
          </div>
        </div>
        {/* destination + name */}
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.7px', lineHeight: 1.12, marginBottom: 3, fontFamily: "'Inter',sans-serif", textShadow: '0 4px 26px rgba(0,0,0,0.78), 0 1px 4px rgba(0,0,0,0.52)' }}>{trip.destination}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.84)', marginBottom: 7, fontWeight: 600, textShadow: '0 1px 8px rgba(0,0,0,0.62)' }}>{trip.groupName}</div>
        {/* stats line */}
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.94)', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            {formatDateRange(trip.arrival, trip.departure)}
          </span>
          <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.26)' }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9"/><path d="M22 3 12 13"/><path d="M17 3h5v5"/></svg>
            {days} nights
          </span>
          <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.26)' }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            {memberNames.length} {memberNames.length === 1 ? 'member' : 'members'}
          </span>
          <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.26)' }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 10v4"/></svg>
            ₹{Math.round(totalSpend).toLocaleString('en-IN')}
          </span>
        </div>
      </div>
      {/* card footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px', marginTop: 4, borderTop: '1px solid rgba(255,255,255,0.12)', background: 'linear-gradient(180deg,rgba(6,12,26,0.55) 0%, rgba(4,9,20,0.84) 100%)', backdropFilter: 'blur(14px)', position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flex: 1 }} onClick={(event) => onOpen(trip.id, event)}>
          {trip.isSolo
            ? <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#7F77DD,#534AB7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 7, fontWeight: 700, boxShadow: '0 3px 8px rgba(83,74,183,0.4)', flexShrink: 0 }}>{(memberNames[0] || 'ME').slice(0,2).toUpperCase()}</div>
            : <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#1D9E75,#0F6E56)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 7, fontWeight: 700, boxShadow: '0 3px 8px rgba(15,110,86,0.4)', flexShrink: 0 }}>{(memberNames[0] || '?').slice(0,2).toUpperCase()}</div>
          }
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.88)', marginLeft: 1, fontWeight: 600 }}>
            {memberNames[0] || (trip.isSolo ? 'You' : 'Member')}{!trip.isSolo && memberNames.length > 1 ? ` +${memberNames.length - 1}` : ''}
          </span>
        </div>
        {budgetBase > 0 && (
          <div style={{ marginRight: 8, paddingLeft: 10, borderLeft: '1px solid rgba(255,255,255,0.18)', minWidth: 120 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 0 }}>Budget</div>
            <div style={{ fontSize: 11, color: '#FF6B35', fontWeight: 800, letterSpacing: 0.1 }}>{budgetPct}% · ₹{budgetLeft.toLocaleString('en-IN')} left</div>
          </div>
        )}
        {showMenu && <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(isMenuOpen ? null : trip.id); }}
              style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.92)', fontSize: 18, letterSpacing: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.16)', cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
              ⋯
            </button>
            {isMenuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 420 }} onClick={() => setMenuOpen(null)} />
                <div style={{ position: 'absolute', bottom: '110%', right: 0, background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', zIndex: 421, minWidth: 180, overflow: 'hidden' }}>
                  {!trip.isSolo && (
                    <button
                      onClick={e => { e.stopPropagation(); setMenuOpen(null); onCopy(trip.shareCode, trip.id); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: '#1F2937', fontFamily: "'DM Sans',sans-serif", borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                      {copied === trip.id ? 'Code Copied' : 'Copy Share Code'}
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setMenuOpen(null); setConfirmComplete(trip); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: '#0F6E56', fontFamily: "'DM Sans',sans-serif", borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                    Mark as Completed
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setMenuOpen(null); setConfirmDelete(trip); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: '#993C1D', fontFamily: "'DM Sans',sans-serif" }}>
                    Delete Trip
                  </button>
                </div>
              </>
            )}
          </div>
        </div>}
      </div>
    </div>
  );
}

function HomePage({ trips, onOpenTrip, onCreateTrip, onJoinTrip, onDeleteTrip, onMarkComplete, onMarkActive, profileName, homeTab = 'trips', setHomeTab = () => {} }) {
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(null);
  const [copied, setCopied] = useState(null);
  const [isSoloMode, setIsSoloMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmComplete, setConfirmComplete] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [archivingTripId, setArchivingTripId] = useState(null);
  const [tagIdx, setTagIdx] = useState(() => {
    const pool = [0, 1, 2, 9, 10, 7];
    return pool[Math.floor(Math.random() * pool.length)];
  });
  const [tagPhase, setTagPhase] = useState('in');
  const [greetPhrase] = useState(() => {
    const h = new Date().getHours();
    const bucket = h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 17 ? 'afternoon' : h >= 17 && h < 21 ? 'evening' : 'night';
    const pool = HERO_GREETINGS[bucket];
    return pool[Math.floor(Math.random() * pool.length)];
  });

  const [showDestPicker, setShowDestPicker] = useState(false);
  const [destQuery, setDestQuery] = useState('');
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [destLoading, setDestLoading] = useState(false);
  const [fxRate, setFxRate] = useState(1);
  const [fxLoading, setFxLoading] = useState(false);
  const [fxError, setFxError] = useState('');
  const destDebounce = useRef(null);
  const tagSwapRef = useRef(null);

  const searchDest = useCallback(async (text) => {
    if (text.length < 2) { setDestSuggestions([]); return; }
    setDestLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=7&accept-language=en`,
        { headers: { 'User-Agent': 'TravelBae/1.0', 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const TYPES = ['city','town','village','suburb','county','state','district','region'];
      const seen = new Set();
      const filtered = data.filter(p => {
        const ok = TYPES.includes(p.type) || TYPES.includes(p.addresstype);
        const key = formatDestName(p);
        if (!ok || seen.has(key)) return false;
        seen.add(key); return true;
      });
      setDestSuggestions(filtered);
    } catch { setDestSuggestions([]); }
    setDestLoading(false);
  }, []);

  const formatDestName = (item) => {
    const a = item.address || {};
    const city = a.city || a.town || a.village || a.county || a.state_district || a.suburb || '';
    const state = a.state || '';
    const country = a.country || '';
    if (city && state && country) return `${city}, ${state}, ${country}`;
    if (city && country) return `${city}, ${country}`;
    if (state && country) return `${state}, ${country}`;
    return item.display_name.split(',').slice(0, 2).join(',').trim();
  };

  const getDestIcon = (item) => {
    const t = item.type || item.addresstype || '';
    if (['city','town'].includes(t)) return '🏙️';
    if (['village','suburb','district'].includes(t)) return '🏘️';
    if (['state','region','county'].includes(t)) return '🗺️';
    if (t === 'country') return '🌏';
    return '📍';
  };

  const today = new Date().toISOString().split('T')[0];
  const maxDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  })();

  const [form, setForm] = useState({
    groupName: '', destination: '', arrival: today, departure: '',
    arrivalSlot: 'morning', departureSlot: 'morning',
    createdBy: profileName || '', budget: '', budgetCurrency: 'INR', destinationCurrency: '', destinationCountry: '', travelNotes: '',
  });

  useEffect(() => {
    setForm(f => ({ ...f, createdBy: profileName || '' }));
  }, [profileName]);

  useEffect(() => {
    if (!showCreate) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [showCreate]);

  useEffect(() => {
    const from = (form.budgetCurrency || '').toUpperCase();
    const to = (form.destinationCurrency || '').toUpperCase();
    if (!from || !to || from === to) { setFxRate(1); setFxError(''); return; }
    let cancelled = false;
    setFxLoading(true); setFxError('');
    getFxRate(from, to)
      .then(rate => { if (!cancelled) setFxRate(rate); })
      .catch(() => { if (!cancelled) { setFxRate(1); setFxError('Rate unavailable — showing 1:1'); } })
      .finally(() => { if (!cancelled) setFxLoading(false); });
    return () => { cancelled = true; };
  }, [form.budgetCurrency, form.destinationCurrency]);

  const budgetNum = form.budget ? Number(form.budget) : 0;
  const convertedBudget = budgetNum > 0 ? (budgetNum * fxRate) : 0;

  useEffect(() => {
    const tick = () => {
      setTagPhase('out');
      tagSwapRef.current = setTimeout(() => {
        setTagIdx(i => (i + 1) % HERO_TAGLINES.length);
        setTagPhase('in');
      }, 350);
    };
    const id = setInterval(tick, 3200);
    return () => { clearInterval(id); clearTimeout(tagSwapRef.current); };
  }, []);

  const openTripWithMotion = (tripId, event) => {
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    if (rect) {
      onOpenTrip(tripId, {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
      return;
    }
    onOpenTrip(tripId);
  };



  const activeTrips = trips.filter(t => !t.completed);

  const markTripCompleteWithAnimation = (tripId) => {
    setArchivingTripId(tripId);
    setTimeout(() => {
      onMarkComplete(tripId);
      setArchivingTripId(null);
    }, 430);
  };

  const handleCreate = async () => {
    if (!form.groupName || !form.destination || !form.arrival || !form.departure) return;
    setCreating(true);
    try {
      await onCreateTrip({
        groupName: form.groupName,
        destination: form.destination,
        emoji: isSoloMode ? '🎒' : '✈️',
        arrival: form.arrival,
        departure: form.departure,
        arrivalSlot: form.arrivalSlot,
        departureSlot: form.departureSlot,
        isSolo: isSoloMode,
        people: isSoloMode ? 1 : 2,
        budget: form.budget ? parseFloat(form.budget) : null,
        budgetCurrency: form.budget ? (form.budgetCurrency || 'INR') : null,
        destinationCurrency: form.destinationCurrency || null,
        budgetInDestination: form.budget ? Number(convertedBudget.toFixed(2)) : null,
        travelNotes: form.travelNotes || null,
        nickname: (profileName || form.createdBy || 'Me').trim(),
      });
      setShowCreate(false);
      setCreateStep(0);
      setFxError('');
      setForm({ groupName: '', destination: '', arrival: today, departure: '', arrivalSlot: 'morning', departureSlot: 'morning', createdBy: profileName || '', budget: '', budgetCurrency: 'INR', destinationCurrency: '', destinationCountry: '', travelNotes: '' });
    } catch (err) {
      alert('Could not create trip: ' + err.message);
    }
    setCreating(false);
  };

  const handleJoin = async () => {
    setJoinError('');
    if (!joinCode.trim()) { setJoinError('Please enter a share code.'); return; }
    if (!joinName.trim()) { setJoinError('Please enter your name.'); return; }
    setJoining(true);
    try {
      const result = await onJoinTrip(joinCode.trim().toUpperCase(), joinName.trim());
      setJoinSuccess(result);
      setJoinCode(''); setJoinName('');
    } catch (err) {
      setJoinError(err.message || 'Invalid code. Please check and try again.');
    }
    setJoining(false);
  };

  const copyCode = (code, id) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  };

  const totalCreateSteps = 7;
  const nextCreateStep = () => setCreateStep((s) => Math.min(totalCreateSteps - 1, s + 1));
  const prevCreateStep = () => setCreateStep((s) => Math.max(0, s - 1));
  const autoAdvance = () => {
    setTimeout(() => nextCreateStep(), 180);
  };
  const canAdvanceCurrentStep = () => {
    if (createStep === 0) return !!form.groupName.trim();
    if (createStep === 1) return !!form.destination.trim();
    if (createStep === 2) return !!form.arrival;
    if (createStep === 3) return !!form.departure;
    return true;
  };

  if (joinSuccess) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>{joinSuccess.emoji}</div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>You're in! 🎉</div>
        <div style={{ fontSize: 14, color: '#6b6b68', marginBottom: 24 }}>
          You've joined <strong>{joinSuccess.groupName}</strong> → {joinSuccess.destination}
        </div>
        <button style={{ ...S.btn, ...S.btnP, padding: '10px 24px', fontSize: 14 }}
          onClick={() => { setJoinSuccess(null); onOpenTrip(joinSuccess.id); }}>
          Open Trip →
        </button>
      </div>
    );
  }

  return (
    <div style={{ margin: '-1rem -0.95rem', fontFamily: "'Inter', 'DM Sans', sans-serif", minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-5px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes progressFill { from{width:0} to{width:var(--w)} }
        @keyframes tbMacbookFold {
          0%   { transform: scale(1) translateY(0);   opacity: 1; filter: saturate(1); }
          40%  { transform: scale(0.97) translateY(4px); opacity: 0.9; filter: saturate(0.6); }
          100% { transform: scale(0.88) translateY(14px); opacity: 0; filter: saturate(0) brightness(1.1); }
        }
        @keyframes tbPastFolderPulse {
          0% { transform: scale(1); box-shadow: 0 8px 26px rgba(12,20,34,0.08); }
          45% { transform: scale(1.02); box-shadow: 0 14px 36px rgba(20,34,60,0.18); }
          100% { transform: scale(1); box-shadow: 0 8px 26px rgba(12,20,34,0.08); }
        }
        .tb-hero-title { animation: fadeUp 0.5s ease both; animation-delay: 0.05s; }
        .tb-hero-greet { animation: fadeUp 0.4s ease both; }
        @keyframes taglineSlideIn {
          from { transform: translateX(108%); }
          to   { transform: translateX(0); }
        }
        @keyframes taglineSlideOut {
          from { transform: translateX(0); }
          to   { transform: translateX(-112%); }
        }
        .tb-trip-card-new {
          border-radius: 26px; margin-bottom: 16px; overflow: hidden; position: relative;
          cursor: pointer; will-change: transform; transform: translateZ(0);
          box-shadow: 0 4px 6px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.10), 0 24px 48px rgba(0,0,0,0.06);
          border-top: 1px solid rgba(255,255,255,0.15);
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        @media (hover: hover) {
          .tb-trip-card-new:hover { transform: translateY(-3px) translateZ(0); box-shadow: 0 8px 40px rgba(0,0,0,0.18) !important; }
        }
        .tb-trip-card-new:active { transform: scale(0.98) translateZ(0); }
        .tb-trip-archiving { transform-origin: 50% 60%; animation: tbMacbookFold 480ms cubic-bezier(.4,0,.2,1) forwards !important; pointer-events: none; }
        .tb-past-folder-pulse { animation: tbPastFolderPulse 700ms cubic-bezier(.2,.7,.2,1) both; }
        .tb-new-btn { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        @media (hover: hover) {
          .tb-new-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255,107,53,0.4) !important; }
        }
        .tb-hero-card-btn { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        @media (hover: hover) {
          .tb-hero-card-btn:hover { transform: translateY(-2px); }
        }
        .tb-hero-card-btn:active { transform: scale(0.97) translateZ(0); }
        .tb-stat-pill { transition: box-shadow 0.15s ease; }
        @media (hover: hover) {
          .tb-stat-pill:hover { box-shadow: 0 3px 10px rgba(0,0,0,0.1) !important; }
        }
        .tb-home-tab {
          display: inline-flex; align-items: center; gap: 8px; border-radius: 999px;
          padding: 9px 14px; font-size: 12px; font-weight: 700; border: 1px solid rgba(15,23,42,0.12);
          background: rgba(255,255,255,0.84); color: #4b5563; cursor: pointer;
          transition: all .22s ease;
        }
        .tb-home-tab.active {
          background: #111827; color: #fff; border-color: #111827;
          box-shadow: 0 10px 24px rgba(17,24,39,0.22);
        }
      `}</style>

      {/* Confirm dialogs */}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Trip"
          message={`Are you sure you want to delete "${confirmDelete.groupName}"? All expenses, contacts and photos will be lost. This cannot be undone.`}
          confirmLabel="🗑️ Delete"
          confirmStyle="danger"
          onConfirm={() => { onDeleteTrip(confirmDelete.id); setConfirmDelete(null); setMenuOpen(null); }}
          onCancel={() => { setConfirmDelete(null); setMenuOpen(null); }}
        />
      )}
      {confirmComplete && (
        <ConfirmDialog
          title="Mark as Completed?"
          message={`"${confirmComplete.groupName}" will be moved to Past Trips. You can restore it anytime.`}
          confirmLabel="✅ Mark Complete"
          confirmStyle="primary"
          onConfirm={() => { markTripCompleteWithAnimation(confirmComplete.id); setConfirmComplete(null); setMenuOpen(null); }}
          onCancel={() => { setConfirmComplete(null); setMenuOpen(null); }}
        />
      )}

      {/* Hero Section */}
      <div style={{ background: 'transparent', padding: '1.2rem 1.35rem 1.4rem', position: 'relative', textAlign: 'left', overflow: 'hidden' }}>
        {/* Mountain decoration */}
        <img
          src={mountainImg}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', top: -8, right: -14,
            width: '52%', maxWidth: 195, height: 'auto',
            pointerEvents: 'none', opacity: 0.86, zIndex: 0,
          }}
        />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="tb-hero-greet" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.8px', color: '#FF6B35', textTransform: 'uppercase', marginBottom: 10, textAlign: 'left' }}>
            {greetPhrase}{profileName ? <span style={{ color: '#043D28', fontWeight: 700 }}>, {profileName.split(' ')[0]}</span> : ''}
          </div>
          <div style={{ overflow: 'hidden', minHeight: 74, marginBottom: 20 }}>
            <div
              key={tagIdx}
              style={{
                animation: tagPhase === 'out'
                  ? 'taglineSlideOut 0.28s cubic-bezier(.4,0,.8,.2) both'
                  : 'taglineSlideIn 0.38s cubic-bezier(.15,.85,.25,1) both',
              }}
            >
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 900, lineHeight: 1.12, letterSpacing: '-0.7px', color: '#0D1108', whiteSpace: 'nowrap' }}>
                {HERO_TAGLINES[tagIdx].line1}
              </div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 900, lineHeight: 1.12, letterSpacing: '-0.7px', whiteSpace: 'nowrap', background: 'linear-gradient(120deg, #2E7048 0%, #1B4D2C 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {HERO_TAGLINES[tagIdx].line2}
              </div>
            </div>
          </div>
          {/* Action cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* New Trip card */}
            <button
              className="tb-hero-card-btn"
              style={{
                width: '100%', background: '#F26419', borderRadius: 20, border: 'none',
                padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 16,
                cursor: 'pointer', position: 'relative', overflow: 'hidden', textAlign: 'left',
                boxShadow: '0 6px 24px rgba(242,100,25,0.34), inset 0 1px 0 rgba(255,255,255,0.14)',
              }}
              onClick={() => {
                setForm({ groupName: '', destination: '', arrival: today, departure: '', arrivalSlot: 'morning', departureSlot: 'morning', createdBy: profileName || '', budget: '', budgetCurrency: 'INR', destinationCurrency: '', destinationCountry: '', travelNotes: '' });
                setCreateStep(0); setShowCreate(true); setShowJoin(false);
              }}
            >
              <div style={{ position: 'absolute', top: -18, left: -18, width: 66, height: 66, borderRadius: '50%', background: 'rgba(255,255,255,0.09)', pointerEvents: 'none' }} />
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,250,246,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E8520A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2.5"/>
                  <path d="M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.2 }}>New Trip</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.76)', marginTop: 3, lineHeight: 1.35 }}>Plan your next adventure</div>
              </div>
              <svg style={{ position: 'absolute', right: 14, bottom: 10, opacity: 0.18, pointerEvents: 'none' }} width="72" height="54" viewBox="0 0 72 54" fill="none">
                <path d="M6 46 C 20 30, 46 18, 64 6" stroke="#fff" strokeWidth="1.5" strokeDasharray="4.5 3.5" strokeLinecap="round"/>
                <path d="M64 6 L 58 13" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M64 6 L 57 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            {/* Join with Code card */}
            <button
              className="tb-hero-card-btn"
              style={{
                width: '100%', background: '#fff', borderRadius: 20,
                border: '1px solid rgba(0,0,0,0.07)',
                padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 16,
                cursor: 'pointer', position: 'relative', overflow: 'hidden', textAlign: 'left',
                boxShadow: '0 3px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
              }}
              onClick={() => { setShowJoin(true); setShowCreate(false); }}
            >
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: '#EDF5EF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 5px rgba(29,158,117,0.1)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1.3" stroke="#1D9E75" strokeWidth="1.7"/>
                  <rect x="5.5" y="5.5" width="2" height="2" rx="0.4" fill="#1D9E75"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.3" stroke="#1D9E75" strokeWidth="1.7"/>
                  <rect x="16.5" y="5.5" width="2" height="2" rx="0.4" fill="#1D9E75"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.3" stroke="#1D9E75" strokeWidth="1.7"/>
                  <rect x="5.5" y="16.5" width="2" height="2" rx="0.4" fill="#1D9E75"/>
                  <rect x="14" y="14" width="2" height="2" rx="0.3" fill="#1D9E75"/>
                  <rect x="18" y="14" width="2" height="2" rx="0.3" fill="#1D9E75"/>
                  <rect x="14" y="18" width="2" height="2" rx="0.3" fill="#1D9E75"/>
                  <rect x="18" y="18" width="3" height="3" rx="0.5" fill="#1D9E75"/>
                  <rect x="16" y="16" width="1.5" height="1.5" rx="0.3" fill="#1D9E75"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#0D1108', letterSpacing: '-0.3px', lineHeight: 1.2 }}>Join with Code</div>
                <div style={{ fontSize: 12, color: '#8a8a86', marginTop: 3, lineHeight: 1.35 }}>Join an existing trip</div>
              </div>
              <svg style={{ position: 'absolute', right: 14, bottom: 10, opacity: 0.1, pointerEvents: 'none' }} width="72" height="54" viewBox="0 0 72 54" fill="none">
                <path d="M6 46 C 20 30, 46 18, 64 6" stroke="#1D9E75" strokeWidth="1.5" strokeDasharray="4.5 3.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px 0', display: 'flex', flexDirection: 'column', flex: 1 }}>

      {showJoin && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,26,18,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 env(safe-area-inset-bottom,0)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowJoin(false); setJoinError(''); } }}
        >
          <div style={{ background: '#fff', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: 520, padding: '0 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', animation: 'slideUp .28s cubic-bezier(.15,.85,.25,1) both' }}>
            <style>{`@keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }`}</style>
            {/* drag pill */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 6 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)' }} />
            </div>
            <div style={{ padding: '4px 22px 24px' }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, color: '#0F1A12', marginBottom: 4 }}>🔗 Join a Trip</div>
              <div style={{ fontSize: 13, color: '#8a8a86', marginBottom: 20 }}>Enter the share code your friend sent you</div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.3, color: '#b0b0aa', textTransform: 'uppercase', marginBottom: 7 }}>Share Code</div>
              <input
                autoFocus
                style={{ ...S.input, letterSpacing: 3, fontFamily: "'Sora',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: 17, padding: '13px 14px', marginBottom: 14 }}
                value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
                placeholder="e.g. JAI-4820" maxLength={10} />
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.3, color: '#b0b0aa', textTransform: 'uppercase', marginBottom: 7 }}>Your Name</div>
              <input
                style={{ ...S.input, fontSize: 15, padding: '13px 14px', marginBottom: 14 }}
                value={joinName} onChange={e => { setJoinName(e.target.value); setJoinError(''); }}
                placeholder="e.g. Rahul" />
              {joinError && (
                <div style={{ fontSize: 12, color: '#993C1D', marginBottom: 12, padding: '8px 12px', background: '#FAECE7', borderRadius: 10, border: '0.5px solid #F5C4B3' }}>⚠️ {joinError}</div>
              )}
              <button
                style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#1D9E75,#0F6E56)', color: '#fff', boxShadow: '0 6px 20px rgba(29,158,117,0.35)', opacity: (!joinCode.trim() || !joinName.trim() || joining) ? 0.45 : 1, transition: 'opacity .2s' }}
                onClick={handleJoin}
                disabled={!joinCode.trim() || !joinName.trim() || joining}>
                {joining ? '✨ Joining…' : '✓ Join Trip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateTripWizard
          isSoloMode={isSoloMode}
          setIsSoloMode={setIsSoloMode}
          form={form}
          setForm={setForm}
          createStep={createStep}
          setCreateStep={setCreateStep}
          totalCreateSteps={totalCreateSteps}
          nextCreateStep={nextCreateStep}
          prevCreateStep={prevCreateStep}
          autoAdvance={autoAdvance}
          canAdvanceCurrentStep={canAdvanceCurrentStep}
          today={today}
          maxDate={maxDate}
          fxRate={fxRate}
          fxLoading={fxLoading}
          fxError={fxError}
          convertedBudget={convertedBudget}
          BUDGET_CURRENCIES={BUDGET_CURRENCIES}
          creating={creating}
          onClose={() => { setShowCreate(false); setCreateStep(0); }}
          onSubmit={handleCreate}
        />
      )}

      {homeTab === 'trips' && activeTrips.length === 0 && !showCreate && !showJoin && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1.5rem' }}>
          <img
            src={lumi9}
            alt="Lumi disappointed"
            style={{ width: 148, height: 'auto', marginBottom: 14, opacity: 0.92, filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.10))' }}
          />
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, color: '#1a1a18', marginBottom: 6 }}>No upcoming trips!</div>
          <div style={{ fontSize: 13, color: '#6b6b68', maxWidth: 220, lineHeight: 1.5 }}>Create your trip or join one with a code.</div>
        </div>
      )}

      {homeTab === 'trips' && activeTrips.length > 0 && (
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.2px', color: 'rgba(0,0,0,0.28)', textTransform: 'uppercase', marginBottom: 14, marginTop: 12 }}>YOUR TRIPS</div>
      )}

      {homeTab === 'trips' && activeTrips.map((trip, idx) => (
        <TripCard
          key={trip.id}
          trip={trip}
          idx={idx}
          onOpen={openTripWithMotion}
          copied={copied}
          onCopy={copyCode}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          setConfirmComplete={setConfirmComplete}
          setConfirmDelete={setConfirmDelete}
          isArchiving={archivingTripId === trip.id}
        />
      ))}

      {homeTab === 'notifications' && (
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: 'rgba(0,0,0,0.34)', textTransform: 'uppercase', marginBottom: 10, padding: '12px 0 4px' }}>
          Notifications moved — tap the 🔔 bell in the top bar to view them.
        </div>
      )}

      <div style={{ flex: 1, minHeight: 16 }} />
      {/* Tagline footer — pinned to bottom */}
      <div style={{ borderTop: '1px solid #e8e6e1', padding: '28px 20px calc(28px + env(safe-area-inset-bottom, 16px))', marginTop: 0, flexShrink: 0 }}>
        <div style={{ fontFamily: "'Inter', 'DM Sans', sans-serif", fontSize: 32, fontWeight: 900, color: '#d4d4d4', lineHeight: 1.15, letterSpacing: '-0.5px' }}>
          Plan. Split. Explore.
        </div>
        <div style={{ fontFamily: "'Inter', 'DM Sans', sans-serif", fontSize: 32, fontWeight: 900, color: '#d4d4d4', lineHeight: 1.15, letterSpacing: '-0.5px', marginBottom: 14 }}>
          Together.
        </div>
        <div style={{ fontSize: 12, color: '#c0bfbb', fontWeight: 500, letterSpacing: '0.2px' }}>
          Made with <svg width="13" height="13" viewBox="0 0 24 24" fill="#e05c5c" stroke="none" style={{ display:'inline-block', verticalAlign:'middle', marginBottom:1 }}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> in Bangalore
        </div>
      </div>

      </div>{/* end padding wrapper */}
    </div>
  );
}

export default HomePage;
