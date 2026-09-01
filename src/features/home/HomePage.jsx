import { useState, useRef, useEffect, useCallback, memo } from 'react';
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
import flagImg from '../../assets/flag.png';
import lumi9 from '../../assets/lumi9.png';
import lumi5 from '../../assets/lumi5_bgless.png';

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
{ line1: 'Meghalaya,', line2: 'clouds live here' },
{ line1: 'Australia,', line2: 'wider than Moon' },
{ line1: 'Iceland,', line2: 'no mosquitoes' },
{ line1: 'France,', line2: "world's top spot" },
{ line1: 'Maldives,', line2: 'beaches glow' },
{ line1: 'Dead Sea,', line2: 'floats everyone' },
{ line1: 'Bhutan,', line2: 'happiness first' },
{ line1: 'Japan,', line2: 'forest bath culture' },
{ line1: 'Venice,', line2: 'keeps sinking' },
{ line1: 'Greenland,', line2: "isn't green" },
{ line1: 'Antarctica,', line2: "world's desert" },
{ line1: 'Machu Picchu,', line2: 'older than pizza' },
{ line1: 'Great Wall,', line2: 'not from space' },
{ line1: 'Pisa Tower,', line2: "wasn't planned" },
{ line1: 'Petra,', line2: 'carved in stone' },
{ line1: 'Sushi,', line2: 'not always raw' },
{ line1: 'Pizza,', line2: "wasn't always Italian" },
{ line1: 'Tea,', line2: 'beats coffee' },
{ line1: 'Switzerland,', line2: 'bans lonely pets' },
{ line1: 'Finland,', line2: 'coffee champs' },
{ line1: 'India,', line2: 'loves train rides' },
{ line1: 'Northern Lights,', line2: 'best near equinox' },
{ line1: 'Volcanoes,', line2: 'create islands' },
{ line1: 'Coral reefs,', line2: 'are alive' },
{ line1: 'Camels,', line2: 'three eyelids' },
{ line1: 'Penguins,', line2: 'love hot springs' },
{ line1: 'Bananas,', line2: 'are berries' },
{ line1: 'Everest,', line2: 'still growing' },
{ line1: '53-second flight,', line2: "yes it's real" },
{ line1: 'Airplane food,', line2: 'tastes different' },
];

const HERO_GREETINGS = {
  morning: ['Rise & wander', 'Suitcase ready?', 'Sunrise mode on', 'Up early, go far', 'Morning, explorer'],
  afternoon: ['Midday dreamer', 'Sun-chasing mode', 'Wanderlust calling', 'Plan something wild', 'Afternoon escape'],
  evening: ['Golden hour plans', 'Dusk wanderer', 'Evening plotters', 'Sunset chaser', 'Bag it, book it'],
  night: ['Night owl travels', 'Stars out, bags ready', 'Late night routes', 'Moon & destinations', 'Plotting after dark'],
};

// currency utilities — see top of file (getFxRate, getCurrencyForCountry)

const TripCard = memo(function TripCard({ trip, idx, onOpen, copied, onCopy, menuOpen, setMenuOpen, setConfirmComplete, setConfirmDelete, forceMonochrome = false, showMenu = true, isArchiving = false }) {
  const [photos, setPhotos] = useState([]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const didSwipe = useRef(false);
  const openedAt = useRef(0);

  const openTrip = (event) => {
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    const now = Date.now();
    if (now - openedAt.current < 450) return;
    openedAt.current = now;
    onOpen(trip.id, event);
  };

  useEffect(() => {
    if (!trip.destination) return;
    let cancelled = false;
    // Use explicit travel photography query for HD destination cover photos
    fetchPlacePhotos(`${trip.destination} travel photography`)
      .then(data => {
        if (cancelled) return;
        const urls = (data.urls || []).slice(0, 5);
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
    ? 'Ongoing'
    : (daysToStart != null && daysToStart > 0 ? `In ${daysToStart}d` : (isPast ? 'Past' : status.label));
  const cardBg = 'linear-gradient(145deg,#1a1108 0%,#2d1a08 52%,#1a1108 100%)';
  const glowBg = 'radial-gradient(circle,rgba(255,106,0,0.38) 0%,transparent 72%)';
  let statusBadgeStyle;
  if (isPast) {
    statusBadgeStyle = { background: 'rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.78)', border: '1px solid rgba(255,255,255,0.28)', backdropFilter: 'blur(7px)' };
  } else if (status.label === 'Ongoing') {
    statusBadgeStyle = { background: 'rgba(255,106,0,0.28)', color: '#FF8C3A', border: '1px solid rgba(255,106,0,0.55)', backdropFilter: 'blur(7px)' };
  } else {
    statusBadgeStyle = { background: 'rgba(255,106,0,0.22)', color: '#FFB87A', border: '1px solid rgba(94,232,184,0.36)', backdropFilter: 'blur(7px)' };
  }
  const cardDelay = idx * 70;

  return (
    <div
      className={`tb-trip-card-new${isArchiving ? ' tb-trip-archiving' : ''}`}
      role="button"
      tabIndex={0}
      style={{ background: cardBg, opacity: isPast ? 0.72 : 1, animation: `fadeUp 0.45s ease both`, animationDelay: `${cardDelay}ms`, boxShadow: '0 18px 42px rgba(16,24,40,0.22), 0 4px 10px rgba(16,24,40,0.14)', filter: forceMonochrome ? 'grayscale(1) saturate(0.02) contrast(1.06)' : 'none', cursor: 'pointer' }}
      onClick={openTrip}
      onTouchStart={e => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
        didSwipe.current = false;
      }}
      onTouchEnd={e => {
        if (touchStartX.current == null) return;
        const dx = touchStartX.current - e.changedTouches[0].clientX;
        const dy = (touchStartY.current ?? 0) - e.changedTouches[0].clientY;
        touchStartX.current = null;
        touchStartY.current = null;
        if (photos.length >= 2 && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
          didSwipe.current = true;
          setPhotoIdx(i => (i + (dx > 0 ? 1 : -1) + photos.length) % photos.length);
          return;
        }
        // Android WebView often never fires click after touch handlers — treat a tap as open.
        if (Math.abs(dx) < 18 && Math.abs(dy) < 18) {
          const el = e.target;
          if (el && typeof el.closest === 'function' && el.closest('button')) return;
          openTrip(e);
        }
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
          onError={() => setPhotos(prev => { const next = prev.filter(u => u !== url); if (photoIdx >= next.length) setPhotoIdx(Math.max(0, next.length - 1)); return next; })}
        />
      ))}

      {/* Scrims */}
      {photos.length > 0 && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 38%)', zIndex: 1, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(3,9,24,0.02) 0%, rgba(3,9,24,0.08) 48%, rgba(3,9,24,0.5) 100%)', zIndex: 1, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 100% 0%, rgba(255,255,255,0.14) 0%, transparent 52%)', zIndex: 1, pointerEvents: 'none' }} />
        </>
      )}

      {/* glow blob */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 130, height: 130, borderRadius: '50%', background: glowBg, pointerEvents: 'none', zIndex: 1 }} />
      {/* inner top shine */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 68, background: 'linear-gradient(180deg,rgba(255,255,255,0.11) 0%,transparent 100%)', borderRadius: '26px 26px 0 0', pointerEvents: 'none', zIndex: 2 }} />

      {/* card body */}
      <div style={{ padding: '14px 16px 0', position: 'relative', zIndex: 3 }}>
        {/* top row: status badge right-aligned */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', marginBottom: 10 }}>
          {/* Status badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {trip.isSolo && (
              <span style={{ padding: '5px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(99,102,241,0.2)', color: '#C7D2FE', border: '1px solid rgba(129,140,248,0.42)', boxShadow: '0 0 20px rgba(79,70,229,0.28)' }}>Solo</span>
            )}
            <span style={{ padding: '5px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700, ...statusBadgeStyle, ...(!isPast ? { boxShadow: '0 0 20px rgba(255,106,0,0.22)' } : {}) }}>
              {statusPillLabel}
            </span>
          </div>
        </div>
        {/* destination */}
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.7px', lineHeight: 1.12, marginBottom: 3, fontFamily: "'Inter',sans-serif", textShadow: '0 4px 26px rgba(0,0,0,0.78), 0 1px 4px rgba(0,0,0,0.52)' }}>{trip.destination}</div>
        {/* group name */}
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.84)', marginBottom: 8, fontWeight: 600, textShadow: '0 1px 8px rgba(0,0,0,0.62)' }}>{trip.groupName}</div>
        {/* stats line */}
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.96)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', textShadow: '0 1px 10px rgba(0,0,0,0.7)', marginBottom: 0, letterSpacing: 0.1 }}>
          <span>{formatDateRange(trip.arrival, trip.departure)}</span>
          <span style={{ margin: '0 6px', opacity: 0.5 }}>·</span>
          <span>{days} {days === 1 ? 'night' : 'nights'}</span>
          <span style={{ margin: '0 6px', opacity: 0.5 }}>·</span>
          <span>{memberNames.length} {memberNames.length === 1 ? 'member' : 'members'}</span>
          <span style={{ margin: '0 6px', opacity: 0.5 }}>·</span>
          <span>₹{Math.round(totalSpend).toLocaleString('en-IN')}</span>
        </div>
        {/* Photo slide dots — inline, centered */}
        {photos.length > 1 ? (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 14, marginBottom: 6, pointerEvents: 'none' }}>
            {photos.map((_, i) => (
              <div key={i} style={{ width: i === photoIdx ? 18 : 5, height: 5, borderRadius: 99, background: i === photoIdx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.38)', transition: 'all 0.3s ease', boxShadow: i === photoIdx ? '0 1px 8px rgba(255,255,255,0.5)' : 'none' }} />
            ))}
          </div>
        ) : (
          <div style={{ height: 20 }} />
        )}
      </div>

      {/* Budget row */}
      {budgetBase > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.14)', position: 'relative', zIndex: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px 4px' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.52)', fontWeight: 600 }}>Budget</span>
            <span style={{ fontSize: 11, color: '#FF6B35', fontWeight: 800, letterSpacing: 0.1 }}>{budgetPct}% · ₹{budgetLeft.toLocaleString('en-IN')} left</span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', margin: '0 16px 6px' }}>
            <div style={{ height: '100%', width: `${budgetPct}%`, background: 'linear-gradient(90deg,#FF6B35,#FFAA60)', borderRadius: 99, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      )}

      {/* footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px', borderTop: '1px solid rgba(255,255,255,0.12)', background: 'linear-gradient(180deg,rgba(6,12,26,0.55) 0%, rgba(4,9,20,0.84) 100%)', backdropFilter: 'blur(14px)', position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.88)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {memberNames[0] || (trip.isSolo ? 'You' : 'Member')}{!trip.isSolo && memberNames.length > 1 ? ` +${memberNames.length - 1}` : ''}
          </span>
        </div>
        {/* Share code pill */}
        {!trip.isSolo && trip.shareCode && (
          <button
            onClick={e => { e.stopPropagation(); onCopy(trip.shareCode, trip.id); }}
            style={{ padding: '4px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', cursor: 'pointer', marginRight: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: copied === trip.id ? '#FF8C3A' : 'rgba(255,255,255,0.75)', letterSpacing: 0.4 }}>{copied === trip.id ? 'Copied' : trip.shareCode}</span>
          </button>
        )}
        {showMenu && <div style={{ position: 'relative', flexShrink: 0 }}>
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
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: '#FF8C3A', fontFamily: "'DM Sans',sans-serif", borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
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
        </div>}
      </div>
    </div>
  );
});

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
  const [ongoingWarning, setOngoingWarning] = useState(false);
  const [menuOpen, setMenuOpen] = useState(null);
  const [archivingTripId, setArchivingTripId] = useState(null);
  const [tagIdx, setTagIdx] = useState(() => Math.floor(Math.random() * HERO_TAGLINES.length));
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

  const nextFact = useCallback(() => {
    setTagPhase('out');
    tagSwapRef.current = setTimeout(() => {
      setTagIdx(i => (i + 1) % HERO_TAGLINES.length);
      setTagPhase('in');
    }, 310);
  }, []);


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

  const blankForm = (name = profileName) => ({
    groupName: '', destination: '', arrival: today, departure: '',
    arrivalSlot: 'morning', departureSlot: 'morning',
    arrivalCity: '', departureCity: '',
    createdBy: name || '', budget: '', budgetCurrency: 'INR', destinationCurrency: '', destinationCountry: '', travelNotes: '',
    destinationMode: null,
    selectedCities: [],
    lumiHighlights: [],
  });

  const [form, setForm] = useState(() => blankForm());

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

  const [dateFilter, setDateFilter] = useState('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const DATE_FILTER_OPTIONS = [
    { value: 'all', label: 'All time' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'this_month', label: 'This month' },
    { value: 'last_month', label: 'Last month' },
    { value: 'last_3_months', label: 'Last 3 months' },
    { value: 'last_6_months', label: 'Last 6 months' },
    { value: 'last_year', label: 'Last year' },
  ];

  const SORT_OPTIONS = [
    { value: 'recent',      label: 'Most recent',           shortLabel: '' },
    { value: 'budget_high', label: 'Budget: High → Low',    shortLabel: '↓ Budget' },
    { value: 'budget_low',  label: 'Budget: Low → High',    shortLabel: '↑ Budget' },
    { value: 'days_long',   label: 'Duration: Longest',      shortLabel: 'Longest' },
    { value: 'days_short',  label: 'Duration: Shortest',     shortLabel: 'Shortest' },
    { value: 'name_az',     label: 'Name: A → Z',           shortLabel: 'A → Z' },
  ];

  const filteredActiveTrips = (() => {
    if (dateFilter === 'all') return activeTrips;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return activeTrips.filter(t => {
      const d = new Date(t.arrival || t.departure || t.createdAt);
      if (isNaN(d)) return true;
      d.setHours(0, 0, 0, 0);
      if (dateFilter === 'upcoming') return d >= now;
      if (dateFilter === 'this_month') return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      if (dateFilter === 'last_month') {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lmEnd = new Date(now.getFullYear(), now.getMonth(), 1);
        return d >= lm && d < lmEnd;
      }
      if (dateFilter === 'last_3_months') return d >= new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      if (dateFilter === 'last_6_months') return d >= new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      if (dateFilter === 'last_year') return d >= new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      return true;
    });
  })();

  const sortedFilteredTrips = (() => {
    const arr = [...filteredActiveTrips];
    const tripDays = t => (t.arrival && t.departure) ? Math.round(Math.abs(new Date(t.departure) - new Date(t.arrival)) / 86400000) : 0;
    if (sortBy === 'budget_high') return arr.sort((a, b) => (Number(b.budget) || 0) - (Number(a.budget) || 0));
    if (sortBy === 'budget_low')  return arr.sort((a, b) => (Number(a.budget) || 0) - (Number(b.budget) || 0));
    if (sortBy === 'days_long')   return arr.sort((a, b) => tripDays(b) - tripDays(a));
    if (sortBy === 'days_short')  return arr.sort((a, b) => tripDays(a) - tripDays(b));
    if (sortBy === 'name_az')     return arr.sort((a, b) => (a.groupName || '').localeCompare(b.groupName || ''));
    return arr.sort((a, b) => new Date(b.arrival || b.createdAt || 0) - new Date(a.arrival || a.createdAt || 0));
  })();

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
        arrivalCity: form.arrivalCity || null,
        departureCity: form.departureCity || null,
        isSolo: isSoloMode,
        people: isSoloMode ? 1 : 2,
        budget: form.budget ? parseFloat(form.budget) : null,
        budgetCurrency: form.budget ? (form.budgetCurrency || 'INR') : null,
        destinationCurrency: form.destinationCurrency || null,
        budgetInDestination: form.budget ? Number(convertedBudget.toFixed(2)) : null,
        travelNotes: form.travelNotes || null,
        nickname: (profileName || form.createdBy || 'Me').trim(),
        ...(form.destinationMode ? { destinationMode: form.destinationMode } : {}),
        ...(form.selectedCities?.length > 0 ? { selectedCities: form.selectedCities } : {}),
        ...(form.lumiHighlights?.length > 0 ? { lumiHighlights: form.lumiHighlights } : {}),
      });
      setShowCreate(false);
      setCreateStep(0);
      setFxError('');
      setForm(blankForm());
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

  const totalCreateSteps = 8;
  const nextCreateStep = () => setCreateStep((s) => Math.min(totalCreateSteps - 1, s + 1));
  const prevCreateStep = () => setCreateStep((s) => Math.max(0, s - 1));
  const autoAdvance = () => {
    setTimeout(() => nextCreateStep(), 180);
  };
  const canAdvanceCurrentStep = () => {
    if (createStep === 0) return !!form.groupName.trim();
    if (createStep === 1) return !!form.destinationMode;
    if (createStep === 2) return !!form.destination.trim();
    if (createStep === 3) return !!form.arrival && !!form.arrivalCity;
    if (createStep === 4) return !!form.departure && !!form.departureCity;
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
    <div style={{ margin: 0, fontFamily: "'Inter', 'DM Sans', sans-serif", minHeight: '100svh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-5px)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lumiRise { 0%{transform:translateY(0);opacity:0} 8%{opacity:1} 100%{transform:translateY(-100%);opacity:1} }
        @keyframes lumiExit { from{transform:translateY(-100%)} to{transform:translateY(0)} }
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
          -webkit-tap-highlight-color: transparent; touch-action: pan-y;
          box-shadow: 0 4px 6px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.10), 0 24px 48px rgba(0,0,0,0.06);
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
      {ongoingWarning && (
        <ConfirmDialog
          title="Trip in progress!"
          message="You already have an ongoing trip. Are you sure you want to plan another one right now?"
          confirmLabel="Create anyway"
          confirmStyle="primary"
          onConfirm={() => {
            setOngoingWarning(false);
            setForm(blankForm());
            setCreateStep(0); setShowCreate(true); setShowJoin(false);
          }}
          onCancel={() => setOngoingWarning(false)}
        />
      )}
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
            width: '62%', maxWidth: 230, height: 'auto',
            pointerEvents: 'none', opacity: 0.88, zIndex: 0,
          }}
        />
        {/* Prayer flag — mountaineering touch, top-left corner */}
        <img
          src={flagImg}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', top: -22, left: -16,
            width: 120, height: 'auto',
            pointerEvents: 'none', opacity: 0.88, zIndex: 1,
          }}
        />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="tb-hero-greet" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.8px', color: '#FF6B35', textTransform: 'uppercase', marginBottom: 10, textAlign: 'left' }}>
            {greetPhrase}{profileName ? <span style={{ color: '#C44400', fontWeight: 700 }}>, {profileName.split(' ')[0]}</span> : ''}
          </div>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <div style={{ overflow: 'hidden', minHeight: 74 }}>
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
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 900, lineHeight: 1.12, letterSpacing: '-0.7px', whiteSpace: 'nowrap', color: '#C44400' }}>
                  {HERO_TAGLINES[tagIdx].line2}
                </div>
              </div>
            </div>
            <button
              onClick={nextFact}
              style={{ position: 'absolute', right: 0, bottom: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0, opacity: 0.55 }}
              aria-label="Next fact"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polyline points="9 18 15 12 9 6" stroke="#FF6A00" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          {/* Action cards — side by side */}
          <div style={{ display: 'flex', gap: 9 }}>
            {/* New Trip card */}
            <button
              className="tb-hero-card-btn"
              style={{
                flex: 1, background: '#F26419', borderRadius: 16, border: 'none',
                padding: '11px 9px 11px 11px', display: 'flex', alignItems: 'center', gap: 9,
                cursor: 'pointer', position: 'relative', overflow: 'hidden', textAlign: 'left',
                boxShadow: '0 5px 18px rgba(242,100,25,0.36), inset 0 1px 0 rgba(255,255,255,0.14)',
              }}
              onClick={() => {
                const openWizard = () => {
                  setForm(blankForm());
                  setCreateStep(0); setShowCreate(true); setShowJoin(false);
                };
                const ongoing = activeTrips.some(t => !t.completed && t.arrival && t.departure && t.arrival <= today && t.departure >= today);
                if (ongoing) { setOngoingWarning(true); } else { openWizard(); }
              }}
            >
              <div style={{ position: 'absolute', top: -16, left: -16, width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.09)', pointerEvents: 'none' }} />
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,247,240,0.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <rect x="3" y="6" width="18" height="15" rx="2.5" fill="#E8520A"/>
                  <path d="M9 6V4.5C9 3.67 9.67 3 10.5 3h3c.83 0 1.5.67 1.5 1.5V6" fill="none" stroke="rgba(255,247,240,0.9)" strokeWidth="1.7" strokeLinecap="round"/>
                  <rect x="3" y="11.5" width="18" height="2" fill="rgba(255,255,255,0.22)"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '-0.1px', lineHeight: 1.2, fontFamily: "'DM Sans',sans-serif" }}>New Trip</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.72)', marginTop: 1.5, lineHeight: 1.35, fontFamily: "'DM Sans',sans-serif" }}>Plan your adventure</div>
              </div>
              <svg style={{ position: 'absolute', right: 6, bottom: 6, opacity: 0.18, pointerEvents: 'none' }} width="46" height="36" viewBox="0 0 46 36" fill="none">
                <path d="M3 30 C 12 18, 28 10, 41 3" stroke="#fff" strokeWidth="1.2" strokeDasharray="3.5 2.8" strokeLinecap="round"/>
                <path d="M41 3 L 37 8" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
                <path d="M41 3 L 37 1" stroke="#fff" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>
            {/* Join with Code card */}
            <button
              className="tb-hero-card-btn"
              style={{
                flex: 1, background: '#FAFAF9', borderRadius: 16,
                border: '1px solid rgba(0,0,0,0.07)',
                padding: '11px 9px 11px 11px', display: 'flex', alignItems: 'center', gap: 9,
                cursor: 'pointer', position: 'relative', overflow: 'hidden', textAlign: 'left',
                boxShadow: '0 2px 12px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
              }}
              onClick={() => { setShowJoin(true); setShowCreate(false); }}
            >
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FFF3EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" rx="1.4" stroke="#FF6A00" strokeWidth="1.8"/>
                  <rect x="5.5" y="5.5" width="2" height="2" rx="0.4" fill="#FF6A00"/>
                  <rect x="14" y="3" width="7" height="7" rx="1.4" stroke="#FF6A00" strokeWidth="1.8"/>
                  <rect x="16.5" y="5.5" width="2" height="2" rx="0.4" fill="#FF6A00"/>
                  <rect x="3" y="14" width="7" height="7" rx="1.4" stroke="#FF6A00" strokeWidth="1.8"/>
                  <rect x="5.5" y="16.5" width="2" height="2" rx="0.4" fill="#FF6A00"/>
                  <rect x="14" y="14" width="2" height="2" rx="0.3" fill="#FF6A00"/>
                  <rect x="18" y="14" width="2" height="2" rx="0.3" fill="#FF6A00"/>
                  <rect x="14" y="18" width="2" height="2" rx="0.3" fill="#FF6A00"/>
                  <rect x="18" y="18" width="3" height="3" rx="0.5" fill="#FF6A00"/>
                  <rect x="16" y="16" width="1.5" height="1.5" rx="0.3" fill="#FF6A00"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0D1108', letterSpacing: '-0.1px', lineHeight: 1.2, fontFamily: "'DM Sans',sans-serif" }}>Join with Code</div>
                <div style={{ fontSize: 10, color: '#7a7a76', marginTop: 1.5, lineHeight: 1.35, fontFamily: "'DM Sans',sans-serif" }}>Join an existing trip</div>
              </div>
              <svg style={{ position: 'absolute', right: 6, bottom: 6, opacity: 0.1, pointerEvents: 'none' }} width="46" height="36" viewBox="0 0 46 36" fill="none">
                <path d="M3 30 C 12 18, 28 10, 41 3" stroke="#FF6A00" strokeWidth="1.2" strokeDasharray="3.5 2.8" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px 0', display: 'flex', flexDirection: 'column', flex: 1 }}>

      {showJoin && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,14,20,0.62)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 env(safe-area-inset-bottom,0)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowJoin(false); setJoinError(''); } }}
        >
          <div style={{ background: '#fff', borderRadius: '22px 22px 0 0', width: '100%', maxWidth: 520, padding: '0 0 0', boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', animation: 'slideUp .28s cubic-bezier(.15,.85,.25,1) both' }}>
            <style>{`@keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }`}</style>
            {/* drag pill */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 6 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.12)' }} />
            </div>
            <div style={{ padding: '4px 22px 24px' }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>🔗 Join a Trip</div>
              <div style={{ fontSize: 13, color: '#8a8a86', marginBottom: 20 }}>Enter the share code your friend sent you</div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.3, color: '#b0b0aa', textTransform: 'uppercase', marginBottom: 7 }}>Share Code</div>
              <input
                autoFocus
                style={{ ...S.input, letterSpacing: 3, fontFamily: "'Sora',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: 17, padding: '13px 14px', marginBottom: 14, border: '1.5px solid #FFCBA4' }}
                value={joinCode} onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
                placeholder="e.g. JAI-4820" maxLength={10} />
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.3, color: '#b0b0aa', textTransform: 'uppercase', marginBottom: 7 }}>Your Name</div>
              <input
                style={{ ...S.input, fontSize: 15, padding: '13px 14px', marginBottom: 14, border: '1.5px solid #FFCBA4' }}
                value={joinName} onChange={e => { setJoinName(e.target.value); setJoinError(''); }}
                placeholder="e.g. Rahul" />
              {joinError && (
                <div style={{ fontSize: 12, color: '#993C1D', marginBottom: 12, padding: '8px 12px', background: '#FAECE7', borderRadius: 10, border: '0.5px solid #F5C4B3' }}>⚠️ {joinError}</div>
              )}
              <button
                style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', fontSize: 15, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#FF8C3A,#FF6A00)', color: '#fff', boxShadow: '0 6px 20px rgba(255,106,0,0.32)', opacity: (!joinCode.trim() || !joinName.trim() || joining) ? 0.45 : 1, transition: 'opacity .2s' }}
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
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.2px', color: 'rgba(0,0,0,0.28)', textTransform: 'uppercase', marginBottom: 14, marginTop: 12, position: 'relative' }}>
          YOUR TRIPS
          {(showFilterMenu || showSortMenu) && <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => { setShowFilterMenu(false); setShowSortMenu(false); }} />}
          <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4, zIndex: 210 }}>
            {/* Sort button */}
            <button
              onClick={() => { setShowSortMenu(v => !v); setShowFilterMenu(false); }}
              style={{ background: sortBy !== 'recent' ? '#FF6A00' : 'transparent', border: sortBy !== 'recent' ? 'none' : '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: sortBy !== 'recent' ? '#fff' : 'rgba(0,0,0,0.38)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
              {sortBy !== 'recent' && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>{SORT_OPTIONS.find(o => o.value === sortBy)?.shortLabel}</span>}
            </button>
            {showSortMenu && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden', minWidth: 185 }}>
                {SORT_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => { setSortBy(opt.value); setShowSortMenu(false); }}
                    style={{ display: 'block', width: '100%', padding: '10px 14px', background: sortBy === opt.value ? '#FFF3EB' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: sortBy === opt.value ? 700 : 500, color: sortBy === opt.value ? '#FF6A00' : '#1C1410', fontFamily: "'DM Sans',sans-serif" }}>
                    {sortBy === opt.value ? '✓ ' : ''}{opt.label}
                  </button>
                ))}
              </div>
            )}
            {/* Filter button */}
            <button
              onClick={() => { setShowFilterMenu(v => !v); setShowSortMenu(false); }}
              style={{ background: dateFilter !== 'all' ? '#FF6A00' : 'transparent', border: dateFilter !== 'all' ? 'none' : '1px solid rgba(0,0,0,0.12)', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: dateFilter !== 'all' ? '#fff' : 'rgba(0,0,0,0.38)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              {dateFilter !== 'all' && <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'DM Sans',sans-serif" }}>{DATE_FILTER_OPTIONS.find(o => o.value === dateFilter)?.label}</span>}
            </button>
            {showFilterMenu && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, zIndex: 200, background: '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden', minWidth: 155 }}>
                {DATE_FILTER_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => { setDateFilter(opt.value); setShowFilterMenu(false); }}
                    style={{ display: 'block', width: '100%', padding: '10px 14px', background: dateFilter === opt.value ? '#FFF3EB' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: dateFilter === opt.value ? 700 : 500, color: dateFilter === opt.value ? '#FF6A00' : '#1C1410', fontFamily: "'DM Sans',sans-serif" }}>
                    {dateFilter === opt.value ? '✓ ' : ''}{opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {homeTab === 'trips' && filteredActiveTrips.length === 0 && activeTrips.length > 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#8A7E76' }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#5C504A' }}>No trips in this period</div>
          <div style={{ fontSize: 12 }}>Try a different time range</div>
        </div>
      )}

      {homeTab === 'trips' && sortedFilteredTrips.map((trip, idx) => (
        idx === 0 ? (
          <div key={trip.id} style={{ position: 'relative' }}>
            <img
              src={lumi5}
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: +70,
                top: 0,
                transform: 'translateY(-100%)',
                height: 56,
                width: 'auto',
                pointerEvents: 'none',
                userSelect: 'none',
                filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.18))',
                animation: 'lumiRise 0.42s ease-out both 0.45s, lumiExit 0.38s ease-in forwards 5.5s',
              }}
            />
            <TripCard
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
          </div>
        ) : (
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
        )
      ))}

      {homeTab === 'notifications' && (
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', color: 'rgba(0,0,0,0.34)', textTransform: 'uppercase', marginBottom: 10, padding: '12px 0 4px' }}>
          Notifications moved — tap the 🔔 bell in the top bar to view them.
        </div>
      )}

      <div style={{ flex: 1, minHeight: 16 }} />
      {/* Tagline footer — pinned to bottom */}
      <div style={{ borderTop: '1px solid #e8e6e1', padding: '28px 20px calc(28px + env(safe-area-inset-bottom, 16px))', marginTop: 0, flexShrink: 0 }}>
        <div style={{ fontFamily: "'Sora', 'DM Sans', sans-serif", fontSize: 38, fontWeight: 900, color: '#d4d4d4', lineHeight: 1.12, letterSpacing: '-1px', marginBottom: 14 }}>
  One App for Every<br />Part of the Trip.
</div>
        <div style={{ fontSize: 12, color: '#c0bfbb', fontWeight: 500, letterSpacing: '0.2px' }}>
          Made with <svg width="13" height="13" viewBox="0 0 24 24" fill="#e05c5c" stroke="none" style={{ display:'inline-block', verticalAlign:'middle', marginBottom:1 }}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> in India
        </div>
      </div>

      </div>{/* end padding wrapper */}
    </div>
  );
}

export default HomePage;
