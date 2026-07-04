import { useState, useRef, useEffect, useCallback } from 'react';
import {
  formatDateRange,
  normalizeMembers,
  tripDuration,
  tripStatusInfo,
} from '../shared/constants';
import { S } from '../shared/styles';
import { Avatar, SoloAvatar, ConfirmDialog } from '../shared/ui';
import { fetchPlacePhotos } from '../../api';
import currencyData from '../../../currency.json';
import CreateTripWizard from './CreateTripWizard';

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
  const mem = _fxMemCache[cacheKey];
  if (mem && mem.date === today && mem.rates?.[to] != null) return mem.rates[to];
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
{ icon: '🌿', line: 'Rishikesh, fix me!' },
{ icon: '🐘', line: 'Coorg said "stay"' },
{ icon: '🌊', line: 'Goa, off-season vibes?' },
{ icon: '🎭', line: "Vienna's old town" },
{ icon: '📵', line: 'Spiti, no signal!' },
{ icon: '🎒', line: 'Kasol, lost again?' },
{ icon: '🏔️', line: 'Ladakh called again!' },
{ icon: '🌿', line: 'Meghalaya, clouds live here' },
{ icon: '☕', line: 'Hidden cafes, Lisbon' },
{ icon: '🌴', line: 'Andamans, who needs wifi?' },
{ icon: '🏯', line: 'Jaipur, dress accordingly!' },
{ icon: '🌸', line: 'Cherry blossoms, Tokyo' },
{ icon: '🚂', line: 'Darjeeling, sip slowly.' },
{ icon: '🌊', line: 'Sunrise surf, Bali' },
{ icon: '🍵', line: 'Munnar stole me' },
{ icon: '🛺', line: 'Varanasi never sleeps!' },
];

const HERO_GREETINGS = {
  morning: ['Rise & wander', 'Suitcase ready?', 'Sunrise mode on', 'Up early, go far', 'Morning, explorer'],
  afternoon: ['Midday dreamer', 'Sun-chasing mode', 'Wanderlust calling', 'Plan something wild', 'Afternoon escape'],
  evening: ['Golden hour plans', 'Dusk wanderer', 'Evening plotters', 'Sunset chaser', 'Bag it, book it'],
  night: ['Night owl travels', 'Stars out, bags ready', 'Late night routes', 'Moon & destinations', 'Plotting after dark'],
};

// currency utilities — see top of file (getFxRate, getCurrencyForCountry)

function TripCard({ trip, idx, onOpen, copied, onCopy, menuOpen, setMenuOpen, setConfirmComplete, setConfirmDelete }) {
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

  const status = tripStatusInfo(trip.arrival, trip.departure, trip.completed);
  const days = tripDuration(trip.arrival, trip.departure);
  const totalSpend = (trip.expenses || []).reduce((s, e) => s + e.amount, 0);
  const memberNames = normalizeMembers(trip.members);
  const budgetBase = trip.budget || 0;
  const budgetPct = budgetBase > 0 ? Math.min(100, Math.round((totalSpend / budgetBase) * 100)) : 0;
  const isMenuOpen = menuOpen === trip.id;
  const isPast = status.label === 'Past' || status.label === 'Completed';
  const cardBg = trip.isSolo
    ? 'linear-gradient(145deg,#1c0e40 0%,#2e1a60 55%,#1c0e40 100%)'
    : 'linear-gradient(145deg,#0a2a1f 0%,#0f3d2e 55%,#0a2a1f 100%)';
  const glowBg = trip.isSolo
    ? 'radial-gradient(circle,rgba(127,119,221,0.3) 0%,transparent 70%)'
    : 'radial-gradient(circle,rgba(29,158,117,0.3) 0%,transparent 70%)';
  const barFill = trip.isSolo
    ? 'linear-gradient(90deg,#FF6B35,#FFAA80)'
    : 'linear-gradient(90deg,#1D9E75,#5DCAA5)';
  let statusBadgeStyle;
  if (isPast) {
    statusBadgeStyle = { background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' };
  } else if (status.label === 'Ongoing') {
    statusBadgeStyle = { background: 'rgba(29,158,117,0.18)', color: '#5DCAA5', border: '1px solid rgba(29,158,117,0.25)' };
  } else {
    statusBadgeStyle = { background: 'rgba(29,158,117,0.18)', color: '#5DCAA5', border: '1px solid rgba(29,158,117,0.25)' };
  }
  const cardDelay = idx * 70;

  return (
    <div
      className="tb-trip-card-new"
      style={{ background: cardBg, opacity: isPast ? 0.65 : 1, animation: `fadeUp 0.45s ease both`, animationDelay: `${cardDelay}ms` }}
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
            transition: 'opacity 0.6s ease',
            filter: 'brightness(0.38) saturate(1.15)',
            zIndex: 0,
            pointerEvents: 'none',
          }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      ))}

      {/* Bottom scrim for text contrast */}
      {photos.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.0) 35%, rgba(0,0,0,0.55) 100%)', zIndex: 1, pointerEvents: 'none' }} />
      )}

      {/* Slide dot indicators */}
      {photos.length > 1 && (
        <div style={{ position: 'absolute', bottom: 58, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5, zIndex: 10, pointerEvents: 'none' }}>
          {photos.map((_, i) => (
            <div key={i} style={{ width: i === photoIdx ? 16 : 5, height: 5, borderRadius: 99, background: i === photoIdx ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.28)', transition: 'all 0.3s ease' }} />
          ))}
        </div>
      )}

      {/* glow blob */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 130, height: 130, borderRadius: '50%', background: glowBg, pointerEvents: 'none', zIndex: 1 }} />
      {/* inner top shine */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(180deg,rgba(255,255,255,0.07) 0%,transparent 100%)', borderRadius: '26px 26px 0 0', pointerEvents: 'none', zIndex: 2 }} />
      {/* card body */}
      <div style={{ padding: '20px 20px 0', position: 'relative', zIndex: 3, cursor: 'pointer' }} onClick={(event) => onOpen(trip.id, event)}>
        {/* top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>
            {trip.emoji}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {trip.isSolo && (
              <span style={{ padding: '4px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: 'rgba(127,119,221,0.18)', color: '#AFA9EC', border: '1px solid rgba(127,119,221,0.25)', boxShadow: '0 2px 8px rgba(127,119,221,0.2)' }}>Solo</span>
            )}
            <span style={{ padding: '4px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, ...statusBadgeStyle, ...((!isPast) ? { boxShadow: '0 2px 8px rgba(29,158,117,0.2)' } : {}) }}>
              {isPast ? 'Past' : status.label}
            </span>
          </div>
        </div>
        {/* destination + name */}
        <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1.15, marginBottom: 4, fontFamily: "'Inter',sans-serif", textShadow: '0 1px 12px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4)' }}>{trip.destination}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 12, fontWeight: 500, textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>{trip.groupName}</div>
        {/* stats line */}
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}>
          <span>{formatDateRange(trip.arrival, trip.departure)}</span>
          <span style={{ opacity: 0.35 }}>·</span>
          <span>{days} nights</span>
          <span style={{ opacity: 0.35 }}>·</span>
          <span>{memberNames.length} {memberNames.length === 1 ? 'member' : 'members'}</span>
          <span style={{ opacity: 0.35 }}>·</span>
          <span>₹{Math.round(totalSpend).toLocaleString('en-IN')}</span>
        </div>
        {/* budget bar */}
        {budgetBase > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 5 }}>
              <span>Budget</span>
              <span style={{ color: trip.isSolo ? '#FFAA80' : '#5DCAA5' }}>{budgetPct}% · ₹{Math.round(budgetBase - totalSpend).toLocaleString('en-IN')} left</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, background: barFill, '--w': `${budgetPct}%`, animation: `progressFill 1s ease both`, animationDelay: `${cardDelay + 200}ms`, width: `${budgetPct}%`, boxShadow: trip.isSolo ? '0 0 8px rgba(255,107,53,0.5)' : '0 0 8px rgba(29,158,117,0.5)' }} />
            </div>
          </div>
        )}
      </div>
      {/* card footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', marginTop: budgetBase > 0 ? 0 : 14, borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.18)', backdropFilter: 'blur(10px)', position: 'relative', zIndex: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', flex: 1 }} onClick={(event) => onOpen(trip.id, event)}>
          {trip.isSolo
            ? <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#7F77DD,#534AB7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8, fontWeight: 700 }}>{(memberNames[0] || 'ME').slice(0,2).toUpperCase()}</div>
            : <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#1D9E75,#0F6E56)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8, fontWeight: 700 }}>{(memberNames[0] || '?').slice(0,2).toUpperCase()}</div>
          }
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginLeft: 0 }}>
            {memberNames[0] || (trip.isSolo ? 'You' : 'Member')}{!trip.isSolo && memberNames.length > 1 ? ` +${memberNames.length - 1}` : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {!trip.isSolo && (
            <div onClick={e => { e.stopPropagation(); onCopy(trip.shareCode, trip.id); }}
              style={{ fontFamily: "'SF Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.07)', padding: '3px 8px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.06)', letterSpacing: '0.5px', cursor: 'pointer' }}>
              {copied === trip.id ? '✓ copied' : trip.shareCode}
            </div>
          )}
          <div style={{ position: 'relative' }}>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(isMenuOpen ? null : trip.id); }}
              style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.35)', fontSize: 13, letterSpacing: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
              ⋯
            </button>
            {isMenuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 420 }} onClick={() => setMenuOpen(null)} />
                <div style={{ position: 'absolute', bottom: '110%', right: 0, background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', zIndex: 421, minWidth: 180, overflow: 'hidden' }}>
                  <button
                    onClick={e => { e.stopPropagation(); setMenuOpen(null); setConfirmComplete(trip); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: '#0F6E56', fontFamily: "'DM Sans',sans-serif", borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                    ✅ Mark as Completed
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setMenuOpen(null); setConfirmDelete(trip); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: '#993C1D', fontFamily: "'DM Sans',sans-serif" }}>
                    🗑️ Delete Trip
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function HomePage({ trips, onOpenTrip, onCreateTrip, onJoinTrip, onDeleteTrip, onMarkComplete, onMarkActive, profileName }) {
  const [showCreate, setShowCreate] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [showJoin, setShowJoin] = useState(false);
  const [showPast, setShowPast] = useState(false);
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
  const pastTrips   = trips.filter(t =>  t.completed);

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

  if (showPast) {
    return (
      <div>
        {confirmDelete && (
          <ConfirmDialog
            title="Delete Trip"
            message={`Are you sure you want to delete "${confirmDelete.groupName}"? This cannot be undone.`}
            confirmLabel="🗑️ Delete"
            confirmStyle="danger"
            onConfirm={() => { onDeleteTrip(confirmDelete.id); setConfirmDelete(null); }}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
          <button style={S.btn} onClick={() => setShowPast(false)}>← Back</button>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700 }}>Past Trips</div>
          <span style={{ fontSize: 12, color: '#6b6b68', background: '#F1EFE8', border: '0.5px solid #D3D1C7', borderRadius: 10, padding: '3px 10px' }}>
            {pastTrips.length} trip{pastTrips.length !== 1 ? 's' : ''}
          </span>
        </div>
        {pastTrips.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b6b68' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗂️</div>
            <p>No completed trips yet.</p>
          </div>
        )}
        {pastTrips.map((trip, idx) => {
          const days = tripDuration(trip.arrival, trip.departure);
          const totalSpend = (trip.expenses || []).reduce((s, e) => s + e.amount, 0);
          return (
            <div
              key={trip.id}
              className="tb-trip-card"
              style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 14, animationDelay: `${idx * 50}ms` }}
            >
              <div style={{ position: 'relative', height: 90, overflow: 'hidden', borderRadius: '14px 14px 0 0', cursor: 'pointer' }}
                onClick={(event) => { setShowPast(false); openTripWithMotion(trip.id, event); }}>
                {trip.coverUrl && <img src={trip.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(30%)' }} onError={e => e.target.style.display = 'none'} />}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.55) 100%)' }} />
                <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 24 }}>{trip.emoji}</div>
                <div style={{ position: 'absolute', top: 9, right: 11, display: 'flex', gap: 6 }}>
                  {trip.isSolo && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: '#EEEDFE', color: '#534AB7', border: '0.5px solid #AFA9EC' }}>Solo</span>}
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: '#F1EFE8', color: '#6b6b68', border: '0.5px solid #D3D1C7' }}>Completed</span>
                </div>
                <div style={{ position: 'absolute', bottom: 10, left: 12 }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: '#fff' }}>{trip.groupName}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>📍 {trip.destination}</div>
                </div>
              </div>
              <div style={{ padding: '10px 14px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                {[['📅', formatDateRange(trip.arrival, trip.departure)], ['🌙', `${days} nights`], ['💰', `₹${Math.round(totalSpend).toLocaleString('en-IN')}`]].map(([icon, val]) => (
                  <div key={val} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b6b68' }}>
                    <span>{icon}</span><span>{val}</span>
                  </div>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => onMarkActive(trip.id)}
                    style={{ ...S.btn, fontSize: 11, padding: '4px 10px', color: '#0F6E56', borderColor: '#9FE1CB', background: '#E1F5EE' }}>
                    ↩ Restore
                  </button>
                  <button
                    onClick={() => setConfirmDelete(trip)}
                    style={{ ...S.btn, fontSize: 11, padding: '4px 10px', color: '#993C1D', borderColor: '#F5C4B3', background: '#FAECE7' }}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

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
        .tb-new-btn { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        @media (hover: hover) {
          .tb-new-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255,107,53,0.4) !important; }
        }
        .tb-stat-pill { transition: box-shadow 0.15s ease; }
        @media (hover: hover) {
          .tb-stat-pill:hover { box-shadow: 0 3px 10px rgba(0,0,0,0.1) !important; }
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
          onConfirm={() => { onMarkComplete(confirmComplete.id); setConfirmComplete(null); setMenuOpen(null); }}
          onCancel={() => { setConfirmComplete(null); setMenuOpen(null); }}
        />
      )}

      {/* Hero Section */}
      <div style={{ background: 'transparent', padding: '1.2rem 1.35rem 0.55rem', position: 'relative', textAlign: 'left' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="tb-hero-greet" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.6px', color: '#FF6B35', textTransform: 'uppercase', marginBottom: 7, textAlign: 'left' }}>
            {greetPhrase}{profileName ? <span style={{ color: '#1a1a18', fontWeight: 700 }}>, {profileName.split(' ')[0]}</span> : ''}
          </div>
          <div style={{ overflow: 'hidden', height: 52, marginBottom: 18, display: 'flex', alignItems: 'center' }}>
            <div
              key={tagIdx}
              style={{
                fontFamily: "'Sora',sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.25,
                letterSpacing: '-0.2px', color: '#0F6E56', whiteSpace: 'nowrap',
                animation: tagPhase === 'out'
                  ? 'taglineSlideOut 0.28s cubic-bezier(.4,0,.8,.2) both'
                  : 'taglineSlideIn 0.38s cubic-bezier(.15,.85,.25,1) both',
              }}
            >
              {HERO_TAGLINES[tagIdx].line}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 11, flexWrap: 'nowrap' }}>
            <button
              className="tb-new-btn"
              style={{ ...S.btn, background: '#FF6B35', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, padding: '13px 24px', borderRadius: 999, boxShadow: '0 8px 20px rgba(255,107,53,0.36)', flex: 1, justifyContent: 'center' }}
              onClick={() => {
                setForm({ groupName: '', destination: '', arrival: today, departure: '', arrivalSlot: 'morning', departureSlot: 'morning', createdBy: profileName || '', budget: '', budgetCurrency: 'INR', destinationCurrency: '', destinationCountry: '', travelNotes: '' });
                setCreateStep(0);
                setShowCreate(true);
                setShowJoin(false);
              }}>
              + New Trip
            </button>
            <button
              style={{ ...S.btn, background: 'rgba(255,255,255,0.96)', color: '#1f2937', border: '1px solid rgba(15,23,42,0.15)', boxShadow: '0 4px 14px rgba(15,23,42,0.06)', fontSize: 14, fontWeight: 700, padding: '13px 24px', borderRadius: 999, flex: 1, justifyContent: 'center' }}
              onClick={() => { setShowJoin(true); setShowCreate(false); }}>
              Join with Code
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

      {activeTrips.length === 0 && !showCreate && !showJoin && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}></div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>No upcoming trips!</div>
          <div style={{ fontSize: 13, color: '#6b6b68' }}>Create your first trip or join one with a code.</div>
        </div>
      )}

      {activeTrips.length > 0 && (
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.2px', color: 'rgba(0,0,0,0.28)', textTransform: 'uppercase', marginBottom: 14, marginTop: 12 }}>YOUR TRIPS</div>
      )}

      {activeTrips.map((trip, idx) => (
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
        />
      ))}

      {pastTrips.length > 0 && (
        <div onClick={() => setShowPast(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, padding: '14px 18px', cursor: 'pointer', marginTop: 8, marginBottom: 4 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#F1EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🗂️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Past Trips</div>
            <div style={{ fontSize: 12, color: '#6b6b68' }}>{pastTrips.length} completed trip{pastTrips.length !== 1 ? 's' : ''} · tap to view memories</div>
          </div>
          <div style={{ fontSize: 16, color: '#a8a8a5' }}>›</div>
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
