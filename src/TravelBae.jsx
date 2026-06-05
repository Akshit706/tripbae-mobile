import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { supabase } from './supabase';
import bglessLogo from './assets/bgless.png';
import {
  aiChat,
  getTrips,
  getMe,
  createTrip,
  joinTrip,
  addExpense,
  updateExpense,
  deleteExpense,
  addContact,
  deleteContact,
  addPhoto,
  deletePhoto,
  deleteAccount,
  getClubHub,
  upsertClubProfile,
  updateClubStatus,
  sendClubRequest,
  respondClubRequest
} from './api';
import HomePageFeature from './features/home/HomePage';
import ShareCodeModalFeature from './features/home/ShareCodeModal';
import TripActionMenuFeature from './features/trips/TripActionMenu';
import SoloExpensesPageFeature from './features/solo/SoloExpensesPage';
import ContactsPageFeature from './features/contacts/ContactsPage';
import SplitPageFeature from './features/split/SplitPage';
import PhotosPageFeature from './features/photos/PhotosPage';
import ItineraryPageFeature from './features/itinerary/ItineraryPage';
import ProfilePageFeature from './features/profile/ProfilePage';
import ClubPageFeature from './features/club/ClubPage';

// Add these two to your api.js:
// export const deleteTrip = (id) => apiFetch(`/trips/${id}`, { method: 'DELETE' });
// export const updateTrip = (id, data) => apiFetch(`/trips/${id}`, { method: 'PATCH', body: data });

/* ─── CONSTANTS ─────────────────────────────────────── */
const MCOLORS = ['#1D9E75','#D85A30','#BA7517','#7F77DD','#378ADD','#D4537E','#0F6E56','#993C1D'];
const API_BASE = 'https://travelbae-backend.onrender.com';
const CATS = [
  {id:'food',icon:'🍽️',label:'Food',bg:'#FAEEDA'},
  {id:'transport',icon:'🚗',label:'Transport',bg:'#E1F5EE'},
  {id:'stay',icon:'🏠',label:'Stay',bg:'#E6F1FB'},
  {id:'activity',icon:'🎟️',label:'Activity',bg:'#EEEDFE'},
  {id:'shopping',icon:'🛍️',label:'Shopping',bg:'#FAECE7'},
  // {id:'other',icon:'•••',label:'Other',bg:'#F1EFE8'},
];
const CONTACT_CATS = [
  {id:'guardian',icon:'🛡️',label:'Guardian',bg:'#EEEDFE',color:'#534AB7'},
  {id:'driver',icon:'🚗',label:'Driver',bg:'#E1F5EE',color:'#0F6E56'},
  {id:'hotel',icon:'🏨',label:'Hotel Staff',bg:'#E6F1FB',color:'#378ADD'},
  {id:'guide',icon:'🗺️',label:'Guide',bg:'#FAEEDA',color:'#854F0B'},
  {id:'medical',icon:'🏥',label:'Medical',bg:'#FAECE7',color:'#993C1D'},
  {id:'emergency',icon:'🚨',label:'Emergency',bg:'#FFF3CD',color:'#856404'},
  {id:'other',icon:'👤',label:'Other',bg:'#F1EFE8',color:'#6b6b68'},
];
const INTERESTS = ['🏖️ Beaches','🛕 Temples','🌿 Nature','🍽️ Food','🧗 Adventure','🎭 Culture','🛍️ Shopping','🌙 Nightlife','🏛️ History','💆 Wellness'];





/* ─── HELPERS ───────────────────────────────────────── */
function nickName(m) {
  if (!m) return '?';
  if (typeof m === 'string') return m;
  if (typeof m === 'object') return m.nickname || m.name || '?';
  return '?';
}

function normalizeMembers(members) {
  if (!Array.isArray(members)) return [];
  return members.map(nickName);
}

function mcolor(n) {
  const name = nickName(n);
  const code = Math.abs(Array.from(name).reduce((acc, c) => acc + c.charCodeAt(0), 0));
  return MCOLORS[code % MCOLORS.length];
}

function Avatar({ name, size = 26 }) {
  const display = nickName(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: mcolor(display),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: Math.round(size * .38), fontWeight: 700,
      flexShrink: 0, fontFamily: "'Sora',sans-serif"
    }}>
      {display.slice(0, 2).toUpperCase()}
    </div>
  );
}

function SoloAvatar({ initials, size = 26 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg,#7F77DD,#534AB7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: Math.round(size * .38), fontWeight: 700,
      flexShrink: 0, fontFamily: "'Sora',sans-serif"
    }}>
      {(initials || 'ME').slice(0, 2).toUpperCase()}
    </div>
  );
}

function Spinner({ text, solo }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <div style={solo ? S.soloSpinner : S.spinner} />
      <p style={{ fontSize: 14, color: '#6b6b68' }}>{text || 'Loading…'}</p>
    </div>
  );
}

function Stars({ n, rating }) {
  return (
    <span>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < n ? '#BA7517' : '#D3D1C7', fontSize: 11 }}>★</span>
      ))}
      <span style={{ fontSize: 11, color: '#6b6b68', marginLeft: 4 }}>{rating}</span>
    </span>
  );
}

function formatDateRange(arrival, departure) {
  const a = new Date(arrival); const d = new Date(departure);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (a.getMonth() === d.getMonth()) return `${a.getDate()}–${d.getDate()} ${months[a.getMonth()]}`;
  return `${a.getDate()} ${months[a.getMonth()]} – ${d.getDate()} ${months[d.getMonth()]}`;
}

function tripDuration(arrival, departure) {
  return Math.max(1, Math.round((new Date(departure) - new Date(arrival)) / 86400000));
}

// Used ONLY for the status badge label/color — does NOT control active/past split
function tripStatusInfo(arrival, departure, completed) {
  if (completed) {
    return { label: 'Completed', color: '#6b6b68', bg: '#F1EFE8', border: '#D3D1C7', isPast: true };
  }
  const now = new Date(); const a = new Date(arrival); const d = new Date(departure);
  if (now < a) {
    const daysLeft = Math.ceil((a - now) / 86400000);
    return { label: `In ${daysLeft}d`, color: '#0F6E56', bg: '#E1F5EE', border: '#9FE1CB', isPast: false };
  } else if (now <= d) {
    return { label: 'Ongoing', color: '#854F0B', bg: '#FAEEDA', border: '#FAC775', isPast: false };
  }
  return { label: 'Past', color: '#6b6b68', bg: '#F1EFE8', border: '#D3D1C7', isPast: false };
}

const AI_CACHE_KEY = 'travelbae_trip_ai_cache_v1';

function readAiCache() {
  try {
    const raw = localStorage.getItem(AI_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAiCache(map) {
  try {
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify(map || {}));
  } catch {
    // ignore cache write failures
  }
}

async function callClaude(prompt) {
  const { reply } = await aiChat(null, [{ role: 'user', content: prompt }]);
  return reply;
}

async function callClaudeJSON(prompt) {
  const text = await callClaude(prompt);
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

async function callClaudeWithSystem(system, messages) {
  const { reply } = await aiChat(system, messages);
  return reply;
}

/* ─── CONFIRM DIALOG ─────────────────────────────────── */
function ConfirmDialog({ title, message, confirmLabel, confirmStyle, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: '1.75rem', maxWidth: 340, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>{confirmStyle === 'danger' ? '🗑️' : '✅'}</div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#6b6b68', lineHeight: 1.6, marginBottom: 22 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...S.btn, flex: 1, justifyContent: 'center', padding: '11px' }} onClick={onCancel}>Cancel</button>
          <button
            style={{ ...S.btn, flex: 1, justifyContent: 'center', padding: '11px', fontWeight: 600,
              ...(confirmStyle === 'danger' ? S.btnDanger : S.btnP),
              background: confirmStyle === 'danger' ? '#993C1D' : undefined,
              color: confirmStyle === 'danger' ? '#fff' : undefined }}
            onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── STYLES ─────────────────────────────────────────── */
const S = {
  root: { fontFamily: "'DM Sans',sans-serif", background: 'radial-gradient(circle at 14% 8%, #ffffff 0%, #f8f7f2 34%, #f3f2ed 100%)', color: '#1a1a18', minHeight: '100vh', WebkitFontSmoothing: 'antialiased', position: 'relative', overflowX: 'hidden' },
  topBar: { background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '0 1.25rem', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', top: 'auto', zIndex: 1, boxShadow: '0 1px 0 rgba(0,0,0,0.04)' },
  logoText: { fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 800, letterSpacing: '-0.45px', color: '#0D2B2E' },
  tripPill: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 999, padding: '6px 13px', fontSize: 12, color: '#F2F4F5', fontWeight: 700, cursor: 'pointer' },
  soloPill: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 999, padding: '6px 13px', fontSize: 12, color: '#F2F4F5', fontWeight: 700, cursor: 'pointer' },
  navTabs: { background: 'rgba(255,255,255,0.42)', backdropFilter: 'blur(16px) saturate(1.08)', borderBottom: 'none', display: 'flex', padding: '8px 1rem 10px', overflowX: 'auto', gap: 8 },
  navTab: { display: 'flex', alignItems: 'center', gap: 5, padding: '9px 12px', fontSize: 12, fontWeight: 500, color: '#5D6A7B', cursor: 'pointer', background: 'rgba(255,255,255,0.56)', border: '1px solid rgba(23,37,84,0.08)', borderRadius: 999, fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap', boxShadow: '0 8px 20px rgba(15,23,42,0.06)' },
  navTabActive: { color: '#0F6E56', background: 'linear-gradient(135deg,#E6FFF4,#F2FFFA)', border: '1px solid rgba(29,158,117,0.32)', fontWeight: 700 },
  soloNavTabActive: { color: '#534AB7', background: 'linear-gradient(135deg,#F0EDFF,#F7F3FF)', border: '1px solid rgba(127,119,221,0.3)', fontWeight: 700 },
  page: { padding: '1rem 0.95rem', flex: 1, paddingBottom: '6.25rem', animation: 'tbPageIn .45s cubic-bezier(.2,.7,.2,1)' },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 999, fontSize: 13, fontWeight: 600, border: '1px solid rgba(25,37,67,0.12)', background: 'linear-gradient(180deg,#ffffff,#f6fafe)', color: '#1a1a18', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'transform .22s cubic-bezier(.2,.7,.2,1), box-shadow .22s ease, border-color .22s ease, background .22s ease', boxShadow: '0 8px 18px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' },
  btnP: { background: 'linear-gradient(135deg,#28B88A,#0F6E56)', color: '#fff', border: '0.5px solid rgba(15,110,86,0.68)', boxShadow: '0 10px 22px rgba(15,110,86,0.24)' },
  btnSolo: { background: 'linear-gradient(135deg,#7F77DD,#534AB7)', color: '#fff', border: 'none' },
  btnOrange: { background: '#FF6B35', color: '#fff', border: '0.5px solid #FF6B35' },
  btnDanger: { background: '#fff', color: '#993C1D', border: '0.5px solid #F5C4B3' },
  card: { background: 'linear-gradient(145deg,rgba(255,255,255,0.78),rgba(243,249,255,0.54))', border: '1px solid rgba(255,255,255,0.72)', borderRadius: 30, padding: '1rem 1.05rem', marginBottom: 12, boxShadow: '0 20px 40px rgba(8,16,35,0.10)', backdropFilter: 'blur(14px)', animation: 'tbCardIn .45s cubic-bezier(.2,.7,.2,1)' },
  input: { fontFamily: "'DM Sans',sans-serif", padding: '11px 13px', border: '1px solid rgba(11,27,50,0.13)', borderRadius: 16, fontSize: 14, background: 'rgba(255,255,255,0.92)', color: '#1a1a18', width: '100%', outline: 'none', boxSizing: 'border-box', boxShadow: '0 6px 16px rgba(15,23,42,0.05)', transition: 'border-color .2s ease, box-shadow .2s ease, transform .2s ease' },
  label: { fontSize: 11, color: '#6b6b68', fontWeight: 600, letterSpacing: .3, textTransform: 'uppercase', display: 'block', marginBottom: 5, marginTop: 10 },
  spinner: { width: 36, height: 36, border: '3px solid #E1F5EE', borderTopColor: '#1D9E75', borderRadius: '50%', animation: 'spin .75s linear infinite', margin: '0 auto 12px' },
  soloSpinner: { width: 36, height: 36, border: '3px solid #EEEDFE', borderTopColor: '#7F77DD', borderRadius: '50%', animation: 'spin .75s linear infinite', margin: '0 auto 12px' },
};

export default function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('travelbae_token'));
  const [authScreen, setAuthScreen] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);
  const [activeTripData, setActiveTripData] = useState(null);
  const [myNickname, setMyNickname] = useState(null);
  const [tripLoading, setTripLoading] = useState(false);
  const [newTripModal, setNewTripModal] = useState(null);
  const [tab, setTab] = useState('main');
  const [profileOpen, setProfileOpen] = useState(false);
  const [sharedFlight, setSharedFlight] = useState(null);
  const [sharedFlightActive, setSharedFlightActive] = useState(false);
  const [profile, setProfile] = useState(() => {
    try {
      const raw = localStorage.getItem('travelbae_profile');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return { name: '', avatar: null };
  });

  const saveProfile = (next) => {
    setProfile(next);
    try { localStorage.setItem('travelbae_profile', JSON.stringify(next)); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!authToken) return;
    setTripsLoading(true);
    getTrips()
      .then(d => {
        const cache = readAiCache();
        const merged = (d.trips || []).map(t => {
          const c = cache[t.id] || {};
          return {
            ...t,
            _cachedItin: c._cachedItin ?? t._cachedItin ?? null,
            _cachedTaste: c._cachedTaste ?? t._cachedTaste ?? null,
          };
        });
        setTrips(merged);
      })
      .catch(() => setTrips([]))
      .finally(() => setTripsLoading(false));
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;
    getMe()
      .then(d => {
        const accountName = d?.user?.name || d?.name || '';
        if (!accountName) return;
        setProfile(prev => {
          if ((prev?.name || '') === accountName) return prev;
          const next = { ...prev, name: accountName };
          try { localStorage.setItem('travelbae_profile', JSON.stringify(next)); } catch (_) {}
          return next;
        });
      })
      .catch(() => {});
  }, [authToken]);

  useEffect(() => {
    if (!activeTrip) { setActiveTripData(null); setMyNickname(null); return; }
    setTripLoading(true);
    import('./api').then(({ getTrip }) => {
      getTrip(activeTrip)
        .then(d => {
          // Always prefer the locally cached itin/taste over server (server doesn't store these)
          const localTrip = trips.find(x => x.id === activeTrip);
          setActiveTripData({
            ...d.trip,
            _cachedItin: localTrip?._cachedItin ?? d.trip._cachedItin ?? null,
            _cachedTaste: localTrip?._cachedTaste ?? d.trip._cachedTaste ?? null,
          });
          setMyNickname(d.myNickname);
        })
        .catch(() => {
          const t = trips.find(x => x.id === activeTrip);
          setActiveTripData(t || null);
          setMyNickname(normalizeMembers(t?.members || [])[0] || 'Me');
        })
        .finally(() => setTripLoading(false));
    });
  }, [activeTrip, trips]); // ← ADD trips as dependency

  const isSolo = activeTripData?.isSolo || false;

  const handleAuth = async () => {
    setAuthError(''); setAuthLoading(true);
    try {
      const endpoint = authScreen === 'signup' ? '/auth/signup' : '/auth/login';
      const body = authScreen === 'signup'
        ? { name: authForm.name, email: authForm.email, password: authForm.password }
        : { email: authForm.email, password: authForm.password };
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      localStorage.setItem('travelbae_token', data.token);
      setAuthToken(data.token);
      const accountName = (data?.user?.name || data?.name || authForm.name || '').trim();
      if (accountName) {
        const nextProfile = { ...profile, name: accountName };
        setProfile(nextProfile);
        try { localStorage.setItem('travelbae_profile', JSON.stringify(nextProfile)); } catch (_) {}
      }
    } catch (err) {
      setAuthError(err.message);
    }
    setAuthLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('travelbae_token');
    localStorage.removeItem(AI_CACHE_KEY);
    setAuthToken(null);
    setTrips([]);
    setActiveTrip(null);
  };

  const handleDeleteAccount = async () => {
    const first = window.confirm('Delete your TripBae account?\n\nThis permanently removes your profile, trip memberships, and any trips where you were the only member (along with their expenses, contacts, photos and itinerary).\n\nThis cannot be undone.');
    if (!first) return;
    const typed = window.prompt('Type DELETE to confirm permanent account deletion.');
    if (typed !== 'DELETE') return;
    try {
      await deleteAccount();
      localStorage.removeItem('travelbae_token');
      localStorage.removeItem('travelbae_profile');
      localStorage.removeItem('travelbae_prefs');
      localStorage.removeItem(AI_CACHE_KEY);
      setAuthToken(null);
      setTrips([]);
      setActiveTrip(null);
      window.alert('Your account has been deleted.');
    } catch (err) {
      window.alert('Could not delete account: ' + (err.message || 'Unknown error'));
    }
  };

  const handleCreateTrip = async (tripData) => {
    const { trip } = await createTrip(tripData);
    setTrips(ts => [trip, ...ts]);
    if (trip.isSolo) {
      setActiveTrip(trip.id);
      setTab('main');
    } else {
      setNewTripModal(trip);
    }
    // Kick off itinerary generation in background immediately
    if (trip.destination) {
      // Mark as in-flight so ItineraryPage doesn't fire a duplicate request
      setTrips(ts => ts.map(t => t.id === trip.id ? { ...t, _generationPending: true } : t));
      import('./api').then(async ({ generateItinerary, generateLocalTaste }) => {
        const days = trip.arrival && trip.departure
          ? Math.max(1, Math.round((new Date(trip.departure) - new Date(trip.arrival)) / 86400000))
          : 1;
        const SLOT_ORDER = ['morning', 'afternoon', 'evening'];
        const arrivalIdx = SLOT_ORDER.indexOf(trip.arrivalSlot || 'morning');
        const firstSlot = SLOT_ORDER[Math.min(arrivalIdx + 1, SLOT_ORDER.length - 1)];
        try {
          const [itinResult, tasteResult] = await Promise.all([
            generateItinerary({
              destination: trip.destination,
              days,
              budget: trip.budget || null,
              people: trip.people || 1,
              interests: ['🛕 Temples', '🍽️ Food', '🛍️ Shopping'],
              arrivalSlot: trip.arrivalSlot || 'morning',
              departureSlot: trip.departureSlot || 'morning',
              firstActivitySlot: firstSlot,
              arrival: trip.arrival,
            }),
            generateLocalTaste({ destination: trip.destination }),
          ]);
          setTrips(ts => ts.map(t => t.id === trip.id
            ? { ...t, _cachedItin: itinResult, _cachedTaste: tasteResult, _generationPending: false }
            : t
          ));
          const cache = readAiCache();
          cache[trip.id] = {
            ...(cache[trip.id] || {}),
            _cachedItin: itinResult,
            _cachedTaste: tasteResult,
          };
          writeAiCache(cache);
        } catch (e) {
          console.warn('Background itinerary generation failed:', e);
          // Clear the pending flag so ItineraryPage can retry on its own
          setTrips(ts => ts.map(t => t.id === trip.id ? { ...t, _generationPending: false } : t));
        }
      });
    }
  };

  const handleJoinTrip = async (shareCode, nickname) => {
    const { trip } = await joinTrip(shareCode, nickname);
    setTrips(ts => [trip, ...ts]);
    return trip;
  };

  const startSharedFlight = (tripId, originRect) => {
    if (!originRect || typeof window === 'undefined') return;
    const trip = trips.find((t) => t.id === tripId);
    const target = {
      left: window.innerWidth < 760 ? 64 : 110,
      top: 10,
      width: window.innerWidth < 760 ? 180 : 220,
      height: 40,
    };
    const dx = (target.left + target.width / 2) - (originRect.left + originRect.width / 2);
    const dy = (target.top + target.height / 2) - (originRect.top + originRect.height / 2);
    const scaleX = target.width / Math.max(1, originRect.width);
    const scaleY = target.height / Math.max(1, originRect.height);

    setSharedFlight({
      left: originRect.left,
      top: originRect.top,
      width: originRect.width,
      height: originRect.height,
      dx,
      dy,
      scaleX,
      scaleY,
      emoji: trip?.emoji || '✈️',
      label: trip?.groupName || 'Trip',
    });
    setSharedFlightActive(false);
    requestAnimationFrame(() => setSharedFlightActive(true));
    setTimeout(() => {
      setSharedFlightActive(false);
      setTimeout(() => setSharedFlight(null), 240);
    }, 520);
  };

  const handleOpenTrip = (tripId, originRect = null) => {
    startSharedFlight(tripId, originRect);
    setActiveTrip(tripId);
    setTab('main');
  };

  const handleShareCodeDismiss = () => {
    const id = newTripModal.id;
    setNewTripModal(null);
    setActiveTrip(id);
    setTab('main');
  };

  // ── DELETE TRIP ──
  const handleDeleteTrip = async (tripId) => {
    try {
      // Call API — import deleteTrip from api.js (add it there)
      const { deleteTrip } = await import('./api');
      await deleteTrip(tripId);
    } catch (err) {
      // If backend doesn't support it yet, still remove from local state
      console.warn('Delete API error (removing locally):', err.message);
    }
    setTrips(ts => ts.filter(t => t.id !== tripId));
    // If currently viewing this trip, go back home
    if (activeTrip === tripId) {
      setActiveTrip(null);
      setActiveTripData(null);
    }
  };

  // ── MARK TRIP AS COMPLETED (move to past) ──
  const handleMarkComplete = async (tripId) => {
    try {
      const { updateTrip } = await import('./api');
      await updateTrip(tripId, { completed: true });
    } catch (err) {
      console.warn('Update API error (updating locally):', err.message);
    }
    setTrips(ts => ts.map(t => t.id === tripId ? { ...t, completed: true } : t));
    // If currently in this trip, update activeTripData too and go back home
    if (activeTrip === tripId) {
      setActiveTripData(d => d ? { ...d, completed: true } : d);
      setActiveTrip(null);
      setActiveTripData(null);
    }
  };

  // ── RESTORE TRIP TO ACTIVE ──
  const handleMarkActive = async (tripId) => {
    try {
      const { updateTrip } = await import('./api');
      await updateTrip(tripId, { completed: false });
    } catch (err) {
      console.warn('Update API error (updating locally):', err.message);
    }
    setTrips(ts => ts.map(t => t.id === tripId ? { ...t, completed: false } : t));
  };
  const handleItineraryCache = useCallback((tripId, update) => {
    setTrips(ts => ts.map(t => t.id === tripId ? { ...t, ...update } : t));
    setActiveTripData(d => d ? { ...d, ...update } : d);

    const cache = readAiCache();
    const prev = cache[tripId] || {};
    const next = {
      ...prev,
      ...(Object.prototype.hasOwnProperty.call(update, '_cachedItin') ? { _cachedItin: update._cachedItin } : {}),
      ...(Object.prototype.hasOwnProperty.call(update, '_cachedTaste') ? { _cachedTaste: update._cachedTaste } : {}),
    };

    if (!next._cachedItin && !next._cachedTaste) {
      delete cache[tripId];
    } else {
      cache[tripId] = next;
    }
    writeAiCache(cache);
  }, []);




  const groupTabs = [
    { id: 'main',      icon: '💳', label: 'Split' },
    { id: 'contacts', icon: '📒', label: 'Contacts' },
    { id: 'itinerary',icon: '🗺️', label: 'Itinerary' },
    { id: 'photos',   icon: '📸', label: 'Photos' },
    { id: 'club',     icon: '🧭', label: 'Club' },
  ];
  const soloTabs = [
    { id: 'main',      icon: '💰', label: 'Expenses' },
    { id: 'itinerary', icon: '🗺️', label: 'Itinerary' },
    { id: 'club',      icon: '🧭', label: 'Club' },
  ];
  const tabs = isSolo ? soloTabs : groupTabs;
  const [viewDirection, setViewDirection] = useState('forward');
  const viewKey = activeTrip ? `${activeTrip}-${tab}` : 'home';

  const handleTabChange = (nextTab) => {
    if (nextTab === tab) return;
    const currentIndex = tabs.findIndex((t) => t.id === tab);
    const nextIndex = tabs.findIndex((t) => t.id === nextTab);
    if (currentIndex !== -1 && nextIndex !== -1) {
      setViewDirection(nextIndex > currentIndex ? 'forward' : 'back');
    }
    setTab(nextTab);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tab, activeTrip]);

  // ── AUTH SCREEN ──
  if (!authToken) return (
    <div style={{ ...S.root, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -120, right: -90, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,158,117,0.18) 0%, rgba(29,158,117,0) 70%)' }} />
      <div style={{ position: 'absolute', bottom: -140, left: -80, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(55,138,221,0.14) 0%, rgba(55,138,221,0) 70%)' }} />
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 68, height: 68, background: 'linear-gradient(135deg,#1D9E75,#0F6E56)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 33, margin: '0 auto 12px', boxShadow: '0 14px 30px rgba(15,110,86,0.28)' }}>✈️</div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 800 }}>Trip<span style={{ color: '#FF6B35' }}>bae</span></div>
          <div style={{ fontSize: 13, color: '#6b6b68', marginTop: 4 }}>Plan less. Experience more.</div>
          <div style={{ fontSize: 11.5, color: '#8d8c87', marginTop: 7 }}>A calmer way to travel with friends.</div>
        </div>
        <div style={{ background: 'linear-gradient(180deg,rgba(255,255,255,0.97),rgba(255,255,255,0.91))', backdropFilter: 'blur(12px)', borderRadius: 22, padding: '1.75rem', boxShadow: '0 26px 60px rgba(0,0,0,0.14)', border: '0.5px solid rgba(0,0,0,0.08)', animation: 'tbModalIn .5s cubic-bezier(.2,.7,.2,1)' }}>
          <div style={{ display: 'flex', gap: 0, background: '#F1EFE8', borderRadius: 12, padding: 3, marginBottom: '1.5rem' }}>
            {['login', 'signup'].map(s => (
              <button key={s} onClick={() => { setAuthScreen(s); setAuthError(''); }}
                style={{ flex: 1, padding: '9px', fontSize: 13, fontWeight: 500, borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", background: authScreen === s ? '#1D9E75' : 'transparent', color: authScreen === s ? '#fff' : '#6b6b68', transition: 'all .2s' }}>
                {s === 'login' ? '🔑 Log In' : '✨ Sign Up'}
              </button>
            ))}
          </div>
          {authScreen === 'signup' && (
            <>
              <label style={S.label}>Your Name</label>
              <input style={{ ...S.input, marginBottom: 10 }} value={authForm.name} onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Arjun" />
            </>
          )}
          <label style={S.label}>Email</label>
          <input style={{ ...S.input, marginBottom: 10 }} type="email" value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} placeholder="you@email.com" />
          <label style={S.label}>Password</label>
          <input style={{ ...S.input, marginBottom: 10 }} type="password" value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleAuth()} placeholder="Min 6 characters" />
          {authError && <div style={{ fontSize: 13, color: '#993C1D', background: '#FAECE7', border: '0.5px solid #F5C4B3', borderRadius: 10, padding: '9px 12px', marginBottom: 10 }}>⚠️ {authError}</div>}
          <button style={{ ...S.btn, ...S.btnP, width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, borderRadius: 12, marginTop: 4, opacity: authLoading ? 0.6 : 1 }}
            onClick={handleAuth} disabled={authLoading}>
            {authLoading ? 'Please wait…' : authScreen === 'login' ? '🔑 Log In' : '🚀 Create Account'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="tb-app-shell" style={S.root}>
      <div style={{ position: 'fixed', top: -180, right: -120, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,158,117,0.13) 0%, rgba(29,158,117,0) 72%)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -190, left: -110, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(127,119,221,0.11) 0%, rgba(127,119,221,0) 72%)', zIndex: 0, pointerEvents: 'none' }} />
      <div className="tb-noise-layer" />
      {sharedFlight && (
        <div
          className={`tb-shared-flight ${sharedFlightActive ? 'is-active' : ''}`}
          style={{
            left: sharedFlight.left,
            top: sharedFlight.top,
            width: sharedFlight.width,
            height: sharedFlight.height,
            '--tb-flight-dx': `${sharedFlight.dx}px`,
            '--tb-flight-dy': `${sharedFlight.dy}px`,
            '--tb-flight-sx': String(sharedFlight.scaleX),
            '--tb-flight-sy': String(sharedFlight.scaleY),
          }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>{sharedFlight.emoji}</span>
          <span style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sharedFlight.label}</span>
        </div>
      )}
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
        @keyframes tbPageIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes tbCardIn{from{opacity:0;transform:translateY(16px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
        @keyframes tbBlobDrift{0%{transform:translate3d(0,0,0)}50%{transform:translate3d(-18px,14px,0)}100%{transform:translate3d(0,0,0)}}
        @keyframes tbGlowPulse{0%{opacity:.65}50%{opacity:1}100%{opacity:.65}}
        @keyframes tbDestDrift1{0%,100%{transform:translateY(0px) translateX(0px)}33%{transform:translateY(-9px) translateX(4px)}66%{transform:translateY(5px) translateX(-3px)}}
        @keyframes tbDestDrift2{0%,100%{transform:translateY(0px)}40%{transform:translateY(-7px) translateX(-5px)}80%{transform:translateY(5px) translateX(4px)}}
        @keyframes tbDestDrift3{0%,100%{transform:translateY(0px) translateX(0px)}50%{transform:translateY(-11px) translateX(3px)}}
        @keyframes tbDestDrift4{0%,100%{transform:translateY(0px) translateX(0px)}35%{transform:translateY(7px) translateX(-5px)}75%{transform:translateY(-6px) translateX(3px)}}
        .tb-bg-ambient{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
        .tb-bg-flag{position:absolute;font-size:18px;pointer-events:none;user-select:none;opacity:0.09;filter:grayscale(40%)}
        .tb-bg-flag.f1{top:58%;left:8%;animation:tbDestDrift1 17s ease-in-out infinite}
        .tb-bg-flag.f2{top:64%;left:31%;animation:tbDestDrift2 22s ease-in-out infinite;animation-delay:3s}
        .tb-bg-flag.f3{top:72%;left:55%;animation:tbDestDrift3 19s ease-in-out infinite;animation-delay:7s}
        .tb-bg-flag.f4{top:55%;left:74%;animation:tbDestDrift4 25s ease-in-out infinite;animation-delay:5s}
        .tb-bg-flag.f5{top:82%;left:18%;animation:tbDestDrift1 14s ease-in-out infinite;animation-delay:11s}
        .tb-bg-flag.f6{top:88%;left:42%;animation:tbDestDrift2 20s ease-in-out infinite;animation-delay:2s}
        .tb-bg-flag.f7{top:78%;left:86%;animation:tbDestDrift3 16s ease-in-out infinite;animation-delay:9s}
        .tb-bg-flag.f8{top:93%;left:63%;animation:tbDestDrift4 23s ease-in-out infinite;animation-delay:4s}
        *{box-sizing:border-box;margin:0;padding:0}
        a{color:inherit;text-decoration:none}
        ::selection{background:#c7eedf;color:#053f31}
        input[type=range]{-webkit-appearance:none;height:4px;border-radius:4px;background:#E1F5EE;outline:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#1D9E75;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.2)}
        input:focus, select:focus, textarea:focus { border-color:#1D9E75 !important; box-shadow:0 0 0 3px rgba(29,158,117,0.14) !important; }
      `}</style>

      <div className="tb-bg-ambient" aria-hidden="true">
        {/* Dot grid */}
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%'}} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="tbDotGrid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="1.1" cy="1.1" r="0.9" fill="#8896AB" opacity="0.28"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#tbDotGrid)" opacity="0.55"/>
        </svg>

        {/* Curved flight arcs + animateMotion planes + pulsing pins */}
        <svg style={{position:'absolute',inset:0,width:'100%',height:'100%'}} viewBox="0 0 400 860" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <path id="tbArc1" d="M-10 820 C70 580 190 360 402 80"/>
            <path id="tbArc2" d="M-30 570 C90 390 230 270 430 45"/>
            <path id="tbArc3" d="M15 940 C140 690 280 470 418 195"/>
            <clipPath id="tbClipBottom">
              <rect x="-20" y="430" width="460" height="540"/>
            </clipPath>
          </defs>

          {/* Dashed arc strokes — confined to bottom 55% of screen */}
          <path d="M-10 820 C70 580 190 360 402 80" fill="none" stroke="#1D9E75" strokeWidth="1.4" strokeDasharray="5 11" opacity="0.15" clipPath="url(#tbClipBottom)"/>
          <path d="M-30 570 C90 390 230 270 430 45" fill="none" stroke="#FF6B35" strokeWidth="1.1" strokeDasharray="4 10" opacity="0.11" clipPath="url(#tbClipBottom)"/>
          <path d="M15 940 C140 690 280 470 418 195" fill="none" stroke="#7F77DD" strokeWidth="1" strokeDasharray="3 9" opacity="0.09" clipPath="url(#tbClipBottom)"/>

          {/* Destination pins — pulsing rings */}
          <circle cx="402" cy="80" r="3.5" fill="#1D9E75" opacity="0.22">
            <animate attributeName="r" values="3.5;6;3.5" dur="3s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.22;0.40;0.22" dur="3s" repeatCount="indefinite"/>
          </circle>
          <circle cx="-10" cy="820" r="3" fill="#1D9E75" opacity="0.16">
            <animate attributeName="r" values="3;5.5;3" dur="3.8s" repeatCount="indefinite" begin="1s"/>
          </circle>
          <circle cx="430" cy="45" r="3" fill="#FF6B35" opacity="0.17">
            <animate attributeName="r" values="3;5;3" dur="4.2s" repeatCount="indefinite" begin="1.5s"/>
          </circle>
          <circle cx="-30" cy="570" r="2.5" fill="#FF6B35" opacity="0.14">
            <animate attributeName="r" values="2.5;4.5;2.5" dur="3.5s" repeatCount="indefinite" begin="2.3s"/>
          </circle>
          <circle cx="195" cy="410" r="2.5" fill="#7F77DD" opacity="0.13">
            <animate attributeName="r" values="2.5;4;2.5" dur="5s" repeatCount="indefinite" begin="3.1s"/>
          </circle>
          <circle cx="418" cy="195" r="3" fill="#7F77DD" opacity="0.15">
            <animate attributeName="r" values="3;5.5;3" dur="3.6s" repeatCount="indefinite" begin="0.4s"/>
          </circle>
          <circle cx="260" cy="560" r="2" fill="#BA7517" opacity="0.12">
            <animate attributeName="r" values="2;3.5;2" dur="4.5s" repeatCount="indefinite" begin="2s"/>
          </circle>

          {/* Plane 1 — green arc */}
          <g opacity="0.30">
            <path d="M0,-4.5 L4.2,0 L0,4.5 L-1.1,0 Z" fill="#FF6B35"/>
            <animateMotion dur="26s" repeatCount="indefinite" rotate="auto">
              <mpath href="#tbArc1"/>
            </animateMotion>
          </g>

          {/* Plane 2 — orange arc, delayed */}
          <g opacity="0.22">
            <path d="M0,-3.8 L3.5,0 L0,3.8 L-0.9,0 Z" fill="#1D9E75"/>
            <animateMotion dur="34s" repeatCount="indefinite" rotate="auto" begin="9s">
              <mpath href="#tbArc2"/>
            </animateMotion>
          </g>

          {/* Plane 3 — purple arc, small */}
          <g opacity="0.16">
            <path d="M0,-3.2 L2.8,0 L0,3.2 L-0.7,0 Z" fill="#7F77DD"/>
            <animateMotion dur="42s" repeatCount="indefinite" rotate="auto" begin="17s">
              <mpath href="#tbArc3"/>
            </animateMotion>
          </g>
        </svg>

        {/* Floating country flags — bottom half only, very faded */}
        <div className="tb-bg-flag f1">🇮🇳</div>
        <div className="tb-bg-flag f2">🇯🇵</div>
        <div className="tb-bg-flag f3">🇫🇷</div>
        <div className="tb-bg-flag f4">🇮🇹</div>
        <div className="tb-bg-flag f5">🇺🇸</div>
        <div className="tb-bg-flag f6">🇬🇧</div>
        <div className="tb-bg-flag f7">🇧🇦</div>
        <div className="tb-bg-flag f8">🇹🇭</div>
      </div>

      {newTripModal && <ShareCodeModalFeature trip={newTripModal} onDismiss={handleShareCodeDismiss} />}

      {/* Top Bar */}
      <div className="tb-topbar-glass" style={S.topBar}>
        {/* Profile button — always top-left */}
        <button
          onClick={() => setProfileOpen(true)}
          title="My profile"
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: profile.avatar ? `url(${profile.avatar}) center/cover` : (isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : 'linear-gradient(135deg,#1D9E75,#0F6E56)'),
            color: '#fff', fontWeight: 700, fontSize: 12, fontFamily: "'Sora',sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0, marginRight: 4,
            boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
            border: '2.5px solid #fff',
            outline: '1.5px solid rgba(0,0,0,0.08)',
          }}
        >
          {!profile.avatar && (profile.name ? profile.name.trim().slice(0, 2).toUpperCase() : '👤')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <img src={bglessLogo} alt="TripBae" style={{ height: 72, width: 'auto', objectFit: 'contain', display: 'block' }} />
        </div>
        {activeTrip && activeTripData ? (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Home icon */}
            <button
              onClick={() => { setActiveTrip(null); setActiveTripData(null); }}
              title="Home"
              style={{ width: 32, height: 32, borderRadius: 9, background: 'transparent', border: '1px solid rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>
                <path d="M9 21V12h6v9"/>
              </svg>
            </button>
            {/* Quick action menu inside a trip */}
            <TripActionMenuFeature
              trip={activeTripData}
              onMarkComplete={() => handleMarkComplete(activeTripData.id)}
              onDelete={() => handleDeleteTrip(activeTripData.id)}
              onEditTrip={(updates) => {
                setActiveTripData(d => d ? { ...d, ...updates, _cachedItin: null, _cachedTaste: null } : d);
                setTrips(ts => ts.map(t => t.id === activeTripData.id 
                  ? { ...t, ...updates, _cachedItin: null, _cachedTaste: null } 
                  : t
                ));
              }}
            />
          </div>
        ) : null}
      </div>

      {/* Nav Tabs */}
      {activeTrip && activeTripData && (
        <div className="tb-nav-ribbon" style={{ ...S.navTabs }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
            gap: 0,
            width: '100%',
            borderBottom: '1px solid rgba(15,23,42,0.12)',
            background: '#fff',
          }}>
            {tabs.map((t, idx) => {
              const isActive = tab === t.id;
              const activeStyle = isSolo ? S.soloNavTabActive : S.navTabActive;
              const accentColor = '#111827';
              return (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  className="tb-nav-pill tb-tab-entrance"
                  style={{
                    ...S.navTab,
                    ...(isActive ? activeStyle : {}),
                    animationDelay: `${idx * 35}ms`,
                    position: 'relative',
                    width: '100%',
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 0,
                    borderLeft: idx > 0 ? '1px solid rgba(15,23,42,0.04)' : 'none',
                    boxShadow: 'none',
                  }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1, filter: isActive ? 'none' : 'grayscale(100%) opacity(0.68)' }}>{t.icon}</span>
                  <span style={{ fontSize: tabs.length > 4 ? 8.6 : 9.5, maxWidth: '100%', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', padding: '0 2px', letterSpacing: 0.12 }}>{t.label}</span>
                  {isActive && <span style={{ position: 'absolute', bottom: 0, left: '16%', right: '16%', height: 2.5, borderRadius: 99, background: accentColor, opacity: 0.9 }} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="tb-page-shell" style={S.page}>
        {!activeTrip && (
          tripsLoading
            ? <Spinner text="Loading your trips…" />
            : <div key={viewKey} className={`tb-view-enter tb-view-${viewDirection}`}><HomePageFeature
                trips={trips}
                onOpenTrip={handleOpenTrip}
                onCreateTrip={handleCreateTrip}
                onJoinTrip={handleJoinTrip}
                onDeleteTrip={handleDeleteTrip}
                onMarkComplete={handleMarkComplete}
                onMarkActive={handleMarkActive}
                profileName={profile.name}
              /></div>
        )}

        {activeTrip && (
          tripLoading || !activeTripData
            ? <Spinner text="Loading trip…" />
            : (
              <div key={viewKey} className={`tb-view-enter tb-view-${viewDirection}`} style={{ animation: 'tbPageIn .35s cubic-bezier(.2,.7,.2,1)' }}>
                {isSolo ? (
                  <>
                    {tab === 'main' && <SoloExpensesPageFeature trip={activeTripData} myNickname={myNickname} onTripUpdate={(update) => handleItineraryCache(activeTripData.id, update)} />}
                    {tab === 'itinerary' && <ItineraryPageFeature trip={activeTripData} onCacheUpdate={(update) => handleItineraryCache(activeTripData.id, update)} />}
                    {tab === 'club' && (
                      <ClubPageFeature
                        trip={activeTripData}
                        onTripRefresh={async () => {
                          try {
                            const { getTrip } = await import('./api');
                            const data = await getTrip(activeTripData.id);
                            setMyNickname(data.myNickname);
                            setActiveTripData(prev => ({
                              ...data.trip,
                              _cachedItin: prev?._cachedItin ?? data.trip._cachedItin ?? null,
                              _cachedTaste: prev?._cachedTaste ?? data.trip._cachedTaste ?? null,
                            }));
                            setTrips(ts => ts.map(t => (t.id === data.trip.id
                              ? {
                                  ...data.trip,
                                  _cachedItin: t._cachedItin ?? null,
                                  _cachedTaste: t._cachedTaste ?? null,
                                }
                              : t)));
                          } catch (err) {
                            console.warn('Could not refresh trip after club update:', err.message);
                          }
                        }}
                      />
                    )}
                  </>
                ) : (
                  <>
                    {tab === 'main' && (
                      <div className="tb-section-flow" style={{ marginLeft: '-1.25rem', marginRight: '-1.25rem', marginTop: 0, marginBottom: '-6rem' }}>
                        <SplitPageFeature trip={activeTripData} myNickname={myNickname} />
                      </div>
                    )}
                    {tab === 'contacts' && <div className="tb-section-flow"><ContactsPageFeature trip={activeTripData} myNickname={myNickname} isSolo={false} /></div>}
                    {tab === 'itinerary' && <div className="tb-section-flow"><ItineraryPageFeature trip={activeTripData} onCacheUpdate={(update) => handleItineraryCache(activeTripData.id, update)} /></div>}
                    {tab === 'photos' && (
                      <div className="tb-section-flow" style={{ marginLeft: '-1.25rem', marginRight: '-1.25rem', marginTop: 0, marginBottom: '-6rem' }}>
                        <PhotosPageFeature trip={activeTripData} myNickname={myNickname} />
                      </div>
                    )}
                    {tab === 'club' && (
                      <div className="tb-section-flow"><ClubPageFeature
                        trip={activeTripData}
                        onTripRefresh={async () => {
                          try {
                            const { getTrip } = await import('./api');
                            const data = await getTrip(activeTripData.id);
                            setMyNickname(data.myNickname);
                            setActiveTripData(prev => ({
                              ...data.trip,
                              _cachedItin: prev?._cachedItin ?? data.trip._cachedItin ?? null,
                              _cachedTaste: prev?._cachedTaste ?? data.trip._cachedTaste ?? null,
                            }));
                            setTrips(ts => ts.map(t => (t.id === data.trip.id
                              ? {
                                  ...data.trip,
                                  _cachedItin: t._cachedItin ?? null,
                                  _cachedTaste: t._cachedTaste ?? null,
                                }
                              : t)));
                          } catch (err) {
                            console.warn('Could not refresh trip after club update:', err.message);
                          }
                        }}
                      /></div>
                    )}
                  </>
                )}
              </div>
            )
        )}
      </div>

      {/* {activeTrip && activeTripData && <TripChatbot trip={activeTripData} myNickname={myNickname} />} */}

      {profileOpen && (
        <ProfilePageFeature
          profile={profile}
          onSave={saveProfile}
          onClose={() => setProfileOpen(false)}
          onLogout={() => { setProfileOpen(false); handleLogout(); }}
          onDeleteAccount={() => { setProfileOpen(false); handleDeleteAccount(); }}
          trips={trips}
        />
      )}
    </div>
  );
}

