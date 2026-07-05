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
  updateUserProfile,
  upsertClubProfile,
  updateClubStatus,
  sendClubRequest,
  respondClubRequest,
  saveAiCache,
  sendOtp,
  verifyOtp,
} from './api';
import HomePageFeature from './features/home/HomePage';
import ShareCodeModalFeature from './features/home/ShareCodeModal';
import TripActionMenuFeature from './features/trips/TripActionMenu';
import SoloExpensesPageFeature from './features/solo/SoloExpensesPage';
// import ContactsPageFeature from './features/contacts/ContactsPage'; // hidden for now
import SplitPageFeature from './features/split/SplitPage';
import PhotosPageFeature from './features/photos/PhotosPage';
import ItineraryPageFeature from './features/itinerary/ItineraryPage';
import ProfilePageFeature from './features/profile/ProfilePage';
import ClubPageFeature from './features/club/ClubPage';
import UserProfileWizard from './features/profile/UserProfileWizard';

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

function Spinner({ text, solo, variant }) {
  // trips list skeleton
  if (variant === 'trips') {
    return (
      <div style={{ padding: '1rem 0.95rem' }}>
        {[1,2,3].map(i => (
          <div key={i} className="tb-shimmer" style={{ height: 96, borderRadius: 18, marginBottom: 12, opacity: 1 - i * 0.15 }} />
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <div className="tb-shimmer" style={{ height: 44, flex: 1, borderRadius: 14 }} />
          <div className="tb-shimmer" style={{ height: 44, flex: 1, borderRadius: 14 }} />
        </div>
      </div>
    );
  }
  // single trip skeleton
  if (variant === 'trip') {
    return (
      <div style={{ padding: '1rem 0.95rem' }}>
        <div className="tb-shimmer" style={{ height: 180, borderRadius: 18, marginBottom: 14 }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[80,100,70,90].map((w,i) => <div key={i} className="tb-shimmer" style={{ height: 32, width: w, borderRadius: 999 }} />)}
        </div>
        {[1,2,3,4].map(i => (
          <div key={i} className="tb-shimmer" style={{ height: 72, borderRadius: 14, marginBottom: 10, opacity: 1 - i * 0.12 }} />
        ))}
      </div>
    );
  }
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
  page: { padding: '1rem 0.95rem', flex: 1, paddingBottom: '5.5rem', animation: 'tbPageIn .45s cubic-bezier(.2,.7,.2,1)' },
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
  // authMode: 'otp-email' | 'otp-code' | 'otp-name' | 'password-login' | 'password-signup'
  const [authMode, setAuthMode] = useState('otp-email');
  const [authScreen, setAuthScreen] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', otp: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [otpSentTo, setOtpSentTo] = useState('');
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [activeTrip, setActiveTrip] = useState(null);
  const [activeTripData, setActiveTripData] = useState(null);
  const [myNickname, setMyNickname] = useState(null);
  const [tripLoading, setTripLoading] = useState(false);
  const [newTripModal, setNewTripModal] = useState(null);
  const [tab, setTab] = useState('main');
  const [profileOpen, setProfileOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [homeTab, setHomeTab] = useState('trips');
  const [seenHomeNotifIds, setSeenHomeNotifIds] = useState(new Set());
  const [showNotifPopover, setShowNotifPopover] = useState(false);

  const tripNotifications = useMemo(() => {
    const now = new Date();
    const notes = [];
    const rank = { high: 0, medium: 1, low: 2 };
    trips.forEach((trip) => {
      const status = tripStatusInfo(trip.arrival, trip.departure, trip.completed);
      const arrival = trip.arrival ? new Date(trip.arrival) : null;
      const departure = trip.departure ? new Date(trip.departure) : null;
      const totalSpend = (trip.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const budgetBase = Number(trip.budget) || 0;
      const budgetPct = budgetBase > 0 ? Math.round((totalSpend / budgetBase) * 100) : 0;
      if (!trip.completed && arrival) {
        const diffDays = Math.ceil((arrival.getTime() - now.getTime()) / 86400000);
        if (diffDays >= 0 && diffDays <= 3) {
          notes.push({ id: `upcoming-${trip.id}`, level: 'high', title: `${trip.groupName} starts soon`, body: `${trip.destination} starts in ${diffDays === 0 ? 'less than a day' : `${diffDays} day${diffDays > 1 ? 's' : ''}`}.` });
        }
      }
      if (!trip.completed && status.label === 'Ongoing') {
        notes.push({ id: `ongoing-${trip.id}`, level: 'medium', title: `${trip.groupName} is live`, body: `Your trip to ${trip.destination} is currently ongoing.` });
      }
      if (!trip.completed && budgetBase > 0 && budgetPct >= 85) {
        notes.push({ id: `budget-${trip.id}`, level: budgetPct >= 100 ? 'high' : 'medium', title: `${trip.groupName} budget alert`, body: `${budgetPct}% of your trip budget has been used.` });
      }
      if (trip.completed && departure) {
        const sinceDays = Math.floor((now.getTime() - departure.getTime()) / 86400000);
        if (sinceDays >= 0 && sinceDays <= 7) {
          notes.push({ id: `recent-past-${trip.id}`, level: 'low', title: `${trip.groupName} moved to Past Trips`, body: `${trip.destination} is now in your Past Trips.` });
        }
      }
    });
    return notes.sort((a, b) => rank[a.level] - rank[b.level]);
  }, [trips]);

  const homeNotifCount = useMemo(
    () => tripNotifications.filter(n => !seenHomeNotifIds.has(n.id)).length,
    [tripNotifications, seenHomeNotifIds]
  );
  const [userProfile, setUserProfile] = useState(null);
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
            // DB is source of truth (shared across all members); localStorage is fallback
            _cachedItin:   t.cachedItinerary  ?? c._cachedItin  ?? null,
            _cachedTaste:  t.cachedTaste      ?? c._cachedTaste ?? null,
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
        // Show onboarding wizard if profile not completed yet
        const up = d?.userProfile;
        if (!up || up.onboardingDone === false) {
          setShowOnboarding(true);
        } else {
          setUserProfile(up);
        }
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
            _cachedItin:  d.trip.cachedItinerary  ?? localTrip?._cachedItin  ?? null,
            _cachedTaste: d.trip.cachedTaste      ?? localTrip?._cachedTaste ?? null,
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

  // ── OTP countdown timer ──
  useEffect(() => {
    if (otpResendCountdown <= 0) return;
    const t = setTimeout(() => setOtpResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpResendCountdown]);

  const finishAuth = (data) => {
    localStorage.setItem('travelbae_token', data.token);
    setAuthToken(data.token);
    const accountName = (data?.user?.name || data?.name || authForm.name || '').trim();
    if (accountName) {
      const nextProfile = { ...profile, name: accountName };
      setProfile(nextProfile);
      try { localStorage.setItem('travelbae_profile', JSON.stringify(nextProfile)); } catch (_) {}
    }
  };

  // Step 1: send OTP
  const handleSendOtp = async () => {
    setAuthError(''); setAuthLoading(true);
    try {
      await sendOtp(authForm.email, authForm.name);
      setOtpSentTo(authForm.email);
      setAuthMode('otp-code');
      setOtpResendCountdown(30);
    } catch (err) { setAuthError(err.message); }
    setAuthLoading(false);
  };

  // Step 2: verify OTP
  const handleVerifyOtp = async () => {
    setAuthError(''); setAuthLoading(true);
    try {
      const data = await verifyOtp(authForm.email, authForm.otp, authForm.name);
      if (data.needsName) { setAuthMode('otp-name'); setAuthLoading(false); return; }
      finishAuth(data);
    } catch (err) { setAuthError(err.message); }
    setAuthLoading(false);
  };

  // Step 3 (only if new user without name): submit name then verify again
  const handleSubmitName = async () => {
    if (!authForm.name.trim()) { setAuthError('Please enter your name.'); return; }
    setAuthError(''); setAuthLoading(true);
    try {
      const data = await verifyOtp(authForm.email, authForm.otp, authForm.name);
      finishAuth(data);
    } catch (err) { setAuthError(err.message); }
    setAuthLoading(false);
  };

  // Password login (classic)
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
      finishAuth(data);
    } catch (err) { setAuthError(err.message); }
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
            ? { ...t, _cachedItin: itinResult, _cachedTaste: tasteResult }
            : t
          ));
          const cache = readAiCache();
          cache[trip.id] = {
            ...(cache[trip.id] || {}),
            _cachedItin: itinResult,
            _cachedTaste: tasteResult,
          };
          writeAiCache(cache);
          // Persist to DB so all group members see it without regenerating
          saveAiCache(trip.id, { cachedItinerary: itinResult, cachedTaste: tasteResult })
            .catch(e => console.warn('AI cache DB save failed:', e.message));
        } catch (e) {
          console.warn('Background itinerary generation failed:', e);
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

    // Persist to DB so all group members see the same itinerary
    const dbUpdate = {};
    if (Object.prototype.hasOwnProperty.call(update, '_cachedItin')) {
      dbUpdate.cachedItinerary = update._cachedItin ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(update, '_cachedTaste')) {
      dbUpdate.cachedTaste = update._cachedTaste ?? null;
    }
    if (Object.keys(dbUpdate).length > 0) {
      saveAiCache(tripId, dbUpdate).catch(e => console.warn('AI cache DB save failed:', e.message));
    }
  }, []);




  const TAB_ICONS = {
    split:    (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
    contacts: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    explore:  (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
    photos:   (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    club:     (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    expenses: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  };
  const groupTabs = [
    { id: 'main',      iconKey: 'split',    label: 'Split' },
    // { id: 'contacts',  iconKey: 'contacts', label: 'Contacts' }, // temporarily hidden
    { id: 'itinerary', iconKey: 'explore',  label: 'Explore' },
    { id: 'photos',    iconKey: 'photos',   label: 'Photos' },
    { id: 'club',      iconKey: 'club',     label: 'Club' },
  ];
  const soloTabs = [
    { id: 'main',      iconKey: 'expenses', label: 'Expenses' },
    { id: 'itinerary', iconKey: 'explore',  label: 'Explore' },
    { id: 'club',      iconKey: 'club',     label: 'Club' },
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
    <div className="lg-root">
      <style>{`
        @keyframes lgPageIn   { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lgSheen    { 0%{left:-80%;opacity:0} 8%{opacity:1} 92%{opacity:1} 100%{left:160%;opacity:0} }
        @keyframes lgFloat    { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-8px)} }
        @keyframes lgSpin     { to{transform:rotate(360deg)} }
        @keyframes lgFadeUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lgGlow     { 0%,100%{box-shadow:0 0 0 0 rgba(29,158,117,0.5)} 50%{box-shadow:0 0 0 8px rgba(29,158,117,0)} }

        .lg-root {
          min-height:100vh;
          background:linear-gradient(160deg,#061510 0%,#0a2e1c 25%,#0f5c38 55%,#7a5a1a 85%,#c9913a 100%);
          display:flex; flex-direction:column;
          align-items:center; justify-content:center;
          padding:2rem 1.25rem;
          font-family:'DM Sans',sans-serif;
          position:relative; overflow:hidden;
          animation:lgPageIn .4s ease both;
        }
        .lg-blob1 { position:absolute; width:320px; height:320px; border-radius:50%; background:rgba(29,158,117,0.12); top:-100px; left:-100px; pointer-events:none; filter:blur(40px); }
        .lg-blob2 { position:absolute; width:240px; height:240px; border-radius:50%; background:rgba(201,145,58,0.10); bottom:-60px; right:-60px; pointer-events:none; filter:blur(50px); }
        .lg-blob3 { position:absolute; width:160px; height:160px; border-radius:50%; background:rgba(255,255,255,0.04); top:40%; left:5%; pointer-events:none; filter:blur(30px); }
        .lg-dots { position:absolute; inset:0; pointer-events:none; background-image:radial-gradient(circle,rgba(255,255,255,0.07) 1px,transparent 1px); background-size:22px 22px; }
        .lg-logo-wrap { position:relative; z-index:2; display:flex; flex-direction:column; align-items:center; margin-bottom:1.75rem; animation:lgFloat 4s ease-in-out infinite; }
        .lg-logo-icon { width:72px; height:72px; border-radius:22px; background:linear-gradient(145deg,#1D9E75,#0A5C42); display:flex; align-items:center; justify-content:center; box-shadow:0 8px 32px rgba(15,110,86,0.55),0 2px 8px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.2); margin-bottom:12px; overflow:hidden; }
        .lg-logo-text { font-family:'Sora',sans-serif; font-size:26px; font-weight:800; letter-spacing:-0.5px; line-height:1; }
        .lg-logo-trip { color:#ffffff; }
        .lg-logo-bae  { color:#F4A94E; }
        .lg-tagline { font-size:10.5px; color:rgba(255,255,255,0.42); letter-spacing:2.8px; text-transform:uppercase; font-weight:600; margin-top:6px; }
        .lg-card { position:relative; z-index:2; width:100%; max-width:400px; background:rgba(10,30,18,0.55); border:1px solid rgba(255,255,255,0.14); border-radius:28px; padding:2rem 1.75rem 1.75rem; box-shadow:0 24px 64px rgba(0,0,0,0.45),0 2px 0 rgba(255,255,255,0.08) inset,0 -1px 0 rgba(0,0,0,0.3) inset; backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px); }
        .lg-tag { display:inline-flex; align-items:center; gap:5px; background:rgba(29,158,117,0.18); border:1px solid rgba(29,158,117,0.32); border-radius:99px; padding:4px 12px; font-size:10px; font-weight:700; color:#5BE3B0; letter-spacing:1px; text-transform:uppercase; margin-bottom:14px; }
        .lg-title { font-family:'Sora',sans-serif; font-size:28px; font-weight:800; color:#ffffff; line-height:1.15; margin-bottom:6px; letter-spacing:-0.4px; }
        .lg-subtitle { font-size:13.5px; color:rgba(255,255,255,0.45); margin-bottom:22px; line-height:1.55; }
        .lg-input-wrap { position:relative; margin-bottom:14px; }
        .lg-input-icon { position:absolute; left:16px; top:50%; transform:translateY(-50%); color:rgba(255,255,255,0.35); display:flex; align-items:center; pointer-events:none; }
        .lg-input { width:100%; box-sizing:border-box; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); border-radius:99px; padding:14px 18px 14px 46px; font-size:14px; font-family:'DM Sans',sans-serif; color:#fff; outline:none; transition:border-color .2s,background .2s,box-shadow .2s; }
        .lg-input::placeholder { color:rgba(255,255,255,0.28); }
        .lg-input:focus { border-color:rgba(29,158,117,0.7); background:rgba(255,255,255,0.10); box-shadow:0 0 0 3px rgba(29,158,117,0.18); }
        .lg-input.otp { font-size:28px; font-weight:800; letter-spacing:14px; text-align:center; padding:16px 14px; }
        .lg-input.no-icon { padding-left:18px; }
        .lg-btn-primary { width:100%; padding:15px; background:linear-gradient(135deg,#1D9E75 0%,#0A5C42 100%); border:none; border-radius:99px; font-size:14.5px; font-weight:700; font-family:'DM Sans',sans-serif; color:#fff; cursor:pointer; letter-spacing:0.3px; box-shadow:0 6px 28px rgba(10,92,66,0.55),0 2px 8px rgba(0,0,0,0.25); margin-bottom:10px; position:relative; overflow:hidden; transition:transform .15s,box-shadow .15s; }
        .lg-btn-primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 10px 36px rgba(10,92,66,0.65); }
        .lg-btn-primary:active:not(:disabled) { transform:scale(0.98); }
        .lg-btn-primary:disabled { opacity:0.6; cursor:not-allowed; }
        .lg-sheen { position:absolute; top:0; bottom:0; left:-80%; width:55%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent); transform:skewX(-20deg); pointer-events:none; animation:lgSheen 3.5s ease-in-out infinite 1.5s; }
        .lg-btn-ghost { width:100%; padding:13px; background:transparent; border:1px solid rgba(255,255,255,0.16); border-radius:99px; font-size:13.5px; font-weight:600; font-family:'DM Sans',sans-serif; color:rgba(255,255,255,0.6); cursor:pointer; transition:background .2s,color .2s,border-color .2s; margin-bottom:20px; }
        .lg-btn-ghost:hover { background:rgba(255,255,255,0.07); color:#fff; border-color:rgba(255,255,255,0.28); }
        .lg-back-btn { background:none; border:none; color:rgba(255,255,255,0.45); font-size:13px; cursor:pointer; padding:0; margin-bottom:20px; display:flex; align-items:center; gap:5px; font-family:'DM Sans',sans-serif; transition:color .15s; }
        .lg-back-btn:hover { color:#fff; }
        .lg-divider { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
        .lg-div-line { flex:1; height:1px; background:rgba(255,255,255,0.1); }
        .lg-div-text { font-size:11px; color:rgba(255,255,255,0.28); font-weight:600; }
        .lg-social-row { display:flex; gap:10px; margin-bottom:22px; }
        .lg-social-btn { flex:1; padding:12px 8px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); border-radius:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:7px; font-size:13px; font-weight:600; font-family:'DM Sans',sans-serif; color:rgba(255,255,255,0.65); transition:background .2s,border-color .2s,color .2s; }
        .lg-social-btn:hover { background:rgba(255,255,255,0.12); border-color:rgba(255,255,255,0.22); color:#fff; }
        .lg-footer { display:flex; align-items:center; justify-content:center; gap:5px; font-size:11px; color:rgba(255,255,255,0.25); }
        .lg-terms { text-align:center; margin-top:1.25rem; font-size:11.5px; color:rgba(255,255,255,0.25); line-height:1.6; position:relative; z-index:2; }
        .lg-terms a { color:rgba(255,255,255,0.45); text-decoration:underline; cursor:pointer; }
        .lg-spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:lgSpin .6s linear infinite; display:inline-block; }
        .lg-seg-track { display:flex; background:rgba(255,255,255,0.08); border-radius:99px; padding:4px; margin-bottom:22px; border:1px solid rgba(255,255,255,0.1); }
        .lg-seg-btn { flex:1; padding:9px; font-size:13px; font-weight:600; border-radius:99px; border:none; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all .2s; }
        .lg-seg-active { background:rgba(29,158,117,0.85); color:#fff; box-shadow:0 2px 10px rgba(10,92,66,0.4); }
        .lg-seg-inactive { background:transparent; color:rgba(255,255,255,0.45); }
        .lg-error { font-size:12px; color:#F4877A; margin-bottom:10px; padding-left:6px; }
        .lg-content { animation:lgFadeUp .28s ease both; }
      `}</style>

      <div className="lg-blob1" />
      <div className="lg-blob2" />
      <div className="lg-blob3" />
      <div className="lg-dots" />

      {/* ── Logo ── */}
      <div className="lg-logo-wrap">
        <div className="lg-logo-icon">
          <img src={bglessLogo} alt="TripBae" style={{ width:56, height:56, objectFit:'contain' }} />
        </div>
        <div className="lg-logo-text">
          <img src={bglessLogo} alt="TripBae" style={{ height: 30, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))' }} />
        </div>
        <div className="lg-tagline">Plan · Split · Explore · Together</div>
      </div>

      {/* ── Card ── */}
      <div className="lg-card">

        {/* ── Step: Enter email ── */}
        {authMode === 'otp-email' && (
          <div className="lg-content">
            <div className="lg-tag">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Secure Sign In
            </div>
            <div className="lg-title">Welcome back ✦</div>
            <div className="lg-subtitle">Enter your email to receive a one-time sign-in code</div>
            <div className="lg-input-wrap">
              <span className="lg-input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </span>
              <input className="lg-input" type="email" placeholder="your@email.com" autoFocus
                value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()} />
            </div>
            {authError && <div className="lg-error">{authError}</div>}
            <button className="lg-btn-primary" onClick={handleSendOtp} disabled={authLoading || !authForm.email.trim()}>
              <div className="lg-sheen" />
              {authLoading ? <span className="lg-spinner" /> : 'Continue with Email'}
            </button>
            <button className="lg-btn-ghost" onClick={() => { setAuthMode('password-login'); setAuthError(''); }}>
              Use password instead
            </button>
            <div className="lg-divider">
              <div className="lg-div-line" /><span className="lg-div-text">or continue with</span><div className="lg-div-line" />
            </div>
            <div className="lg-social-row">
              <button className="lg-social-btn" type="button" onClick={() => setAuthError('Google sign-in coming soon!')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="rgba(255,255,255,0.6)"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="rgba(255,255,255,0.5)"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="rgba(255,255,255,0.45)"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="rgba(255,255,255,0.55)"/>
                </svg>
                Google
              </button>
            </div>
            <div className="lg-footer">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              End-to-end encrypted · Visible only to your group
            </div>
          </div>
        )}

        {/* ── Step: OTP code ── */}
        {authMode === 'otp-code' && (
          <div className="lg-content">
            <button className="lg-back-btn" onClick={() => { setAuthMode('otp-email'); setAuthError(''); setAuthForm(f => ({ ...f, otp:'' })); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </button>
            <div className="lg-tag">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.11 1.2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z"/></svg>
              Check your inbox
            </div>
            <div className="lg-title">Enter your code</div>
            <div className="lg-subtitle">We sent a 6-digit code to <strong style={{ color:'rgba(255,255,255,0.8)' }}>{otpSentTo || authForm.email}</strong></div>
            <input className="lg-input otp" type="tel" inputMode="numeric" maxLength={6} placeholder="000000" autoFocus
              value={authForm.otp} onChange={e => setAuthForm(f => ({ ...f, otp: e.target.value.replace(/\D/g,'').slice(0,6) }))}
              onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()} />
            {authError && <div className="lg-error" style={{ marginTop:8 }}>{authError}</div>}
            <button className="lg-btn-primary" style={{ marginTop:14 }} onClick={handleVerifyOtp} disabled={authLoading || authForm.otp.length < 6}>
              <div className="lg-sheen" />
              {authLoading ? <span className="lg-spinner" /> : 'Verify Code'}
            </button>
            <div style={{ textAlign:'center', fontSize:13, color:'rgba(255,255,255,0.4)' }}>
              {otpResendCountdown > 0
                ? <span>Resend in <strong style={{ color:'rgba(255,255,255,0.7)' }}>{otpResendCountdown}s</strong></span>
                : <button onClick={handleSendOtp} style={{ background:'none', border:'none', color:'#5BE3B0', fontWeight:700, cursor:'pointer', fontSize:13, fontFamily:"'DM Sans',sans-serif", textDecoration:'underline' }}>Resend code</button>
              }
            </div>
          </div>
        )}

        {/* ── Step: Enter name (new user) ── */}
        {authMode === 'otp-name' && (
          <div className="lg-content">
            <div className="lg-tag">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Almost there
            </div>
            <div className="lg-title">One last thing</div>
            <div className="lg-subtitle">What should your trip mates call you?</div>
            <div className="lg-input-wrap">
              <span className="lg-input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </span>
              <input className="lg-input" type="text" placeholder="Your first name" autoFocus
                value={authForm.name} onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSubmitName()} />
            </div>
            {authError && <div className="lg-error">{authError}</div>}
            <button className="lg-btn-primary" onClick={handleSubmitName} disabled={authLoading || !authForm.name.trim()}>
              <div className="lg-sheen" />
              {authLoading ? <span className="lg-spinner" /> : 'Get Started →'}
            </button>
          </div>
        )}

        {/* ── Password flow ── */}
        {(authMode === 'password-login' || authMode === 'password-signup') && (
          <div className="lg-content">
            <button className="lg-back-btn" onClick={() => { setAuthMode('otp-email'); setAuthScreen('login'); setAuthError(''); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Back
            </button>
            <div className="lg-seg-track">
              {[['password-login','Log In'],['password-signup','Sign Up']].map(([m, l]) => (
                <button key={m} className={`lg-seg-btn ${authMode === m ? 'lg-seg-active' : 'lg-seg-inactive'}`}
                  onClick={() => { setAuthMode(m); setAuthScreen(m === 'password-login' ? 'login' : 'signup'); setAuthError(''); }}>{l}</button>
              ))}
            </div>
            {authMode === 'password-signup' && (
              <div className="lg-input-wrap">
                <span className="lg-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </span>
                <input className="lg-input" type="text" placeholder="Your name" autoFocus value={authForm.name}
                  onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            )}
            <div className="lg-input-wrap">
              <span className="lg-input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </span>
              <input className="lg-input" type="email" placeholder="Email address" value={authForm.email}
                autoFocus={authMode === 'password-login'}
                onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="lg-input-wrap" style={{ marginBottom:0 }}>
              <span className="lg-input-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <input className="lg-input" type="password" value={authForm.password}
                onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
                placeholder={authMode === 'password-signup' ? 'Min 6 characters' : 'Your password'} />
            </div>
            {authError && <div className="lg-error" style={{ marginTop:12 }}>{authError}</div>}
            <button className="lg-btn-primary" style={{ marginTop:16 }} onClick={handleAuth}
              disabled={authLoading || !authForm.email.trim() || !authForm.password.trim() || (authMode === 'password-signup' && !authForm.name.trim())}>
              <div className="lg-sheen" />
              {authLoading ? <span className="lg-spinner" /> : authMode === 'password-login' ? 'Log In' : 'Create Account'}
            </button>
          </div>
        )}
      </div>

      <div className="lg-terms">
        By continuing you agree to our <a>Terms of Service</a> and <a>Privacy Policy</a>
      </div>
    </div>
  );



  return (
    <div className="tb-app-shell" style={S.root}>
      <div style={{ position: 'fixed', top: -180, right: -120, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,158,117,0.13) 0%, rgba(29,158,117,0) 72%)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -190, left: -110, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(127,119,221,0.11) 0%, rgba(127,119,221,0) 72%)', zIndex: 0, pointerEvents: 'none' }} />
      <div className="tb-noise-layer" />
      {showOnboarding && (
        <UserProfileWizard
          userName={profile?.name || ''}
          onDone={(savedProfile) => { setShowOnboarding(false); setUserProfile({ ...savedProfile, onboardingDone: true }); }}
        />
      )}
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
        @keyframes tbShimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
        .tb-shimmer{background:linear-gradient(90deg,#f0ede8 25%,#e4e0d8 50%,#f0ede8 75%);background-size:1200px 100%;animation:tbShimmer 1.4s ease-in-out infinite;border-radius:8px}
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
        {!activeTrip && !activeTripData && (
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={() => {
                setShowNotifPopover(v => {
                  if (!v) setSeenHomeNotifIds(new Set(tripNotifications.map(n => n.id)));
                  return !v;
                });
              }}
              title="Notifications"
              style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a18" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {homeNotifCount > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 4, width: 9, height: 9, borderRadius: '50%', background: '#FF6B35', border: '2px solid #fff', display: 'block' }} />
              )}
            </button>
          </div>
        )}
        {activeTrip && activeTripData ? (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Home icon — bare, no box */}
            <button
              onClick={() => { setActiveTrip(null); setActiveTripData(null); }}
              title="Home"
              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.65 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1a18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      {/* Notification popover — must live OUTSIDE the topbar because backdrop-filter
          creates a containing block for position:fixed children in all modern browsers */}
      {showNotifPopover && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setShowNotifPopover(false)} />
          <div style={{ position: 'fixed', top: 62, right: 12, width: 'min(340px, calc(100vw - 24px))', maxHeight: 420, overflowY: 'auto', background: '#fff', borderRadius: 18, boxShadow: '0 8px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)', border: '0.5px solid rgba(0,0,0,0.1)', zIndex: 9999, animation: 'notifPopIn .18s cubic-bezier(.15,.85,.25,1)' }}>
            <style>{`@keyframes notifPopIn { from { opacity:0; transform:translateY(-8px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }`}</style>
            <div style={{ padding: '14px 16px 10px', borderBottom: '0.5px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderRadius: '18px 18px 0 0' }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: '#0F1A12' }}>Notifications</div>
              <button onClick={() => setShowNotifPopover(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9a9a96', lineHeight: 1, padding: '2px 4px' }}>×</button>
            </div>
            <div style={{ padding: '10px 12px 12px' }}>
              {tripNotifications.length === 0 ? (
                <div style={{ padding: '1.25rem 0.5rem', textAlign: 'center', color: '#6b7280' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 8px' }}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 3 }}>No new notifications</div>
                  <div style={{ fontSize: 12 }}>Trip updates and budget alerts will appear here.</div>
                </div>
              ) : tripNotifications.map((n) => {
                const accent = n.level === 'high' ? '#B42318' : n.level === 'medium' ? '#92400E' : '#1D4ED8';
                const bg = n.level === 'high' ? '#FEF3F2' : n.level === 'medium' ? '#FFFBEB' : '#EFF6FF';
                return (
                  <div key={n.id} style={{ borderLeft: `3px solid ${accent}`, borderRadius: 10, padding: '10px 10px 10px 11px', marginBottom: 7, background: '#fafaf8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: accent, background: bg, border: `1px solid ${accent}30`, borderRadius: 999, padding: '2px 7px', letterSpacing: 0.4, textTransform: 'uppercase' }}>{n.level}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{n.body}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Bottom Nav Bar */}
      {activeTrip && (
        <div style={{
          position:'fixed', bottom:0, left:0, right:0, zIndex:100,
          background:'rgba(255,255,255,0.92)', backdropFilter:'blur(16px)',
          borderTop:'1px solid rgba(0,0,0,0.07)',
          paddingBottom:'env(safe-area-inset-bottom, 12px)',
        }}>
          <div style={{
            display:'grid',
            gridTemplateColumns:`repeat(${tabs.length}, 1fr)`,
          }}>
            {tabs.map((t) => {
              const isActive = tab === t.id;
              const activeColor = isSolo ? '#534AB7' : '#0F6E56';
              return (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  style={{
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    padding:'10px 4px 8px', border:'none', background:'transparent', cursor:'pointer',
                    position:'relative', gap:2,
                  }}
                >
                  <span style={{ display:'flex', alignItems:'center', justifyContent:'center', opacity: isActive ? 1 : 0.45 }}>{TAB_ICONS[t.iconKey]?.(isActive ? activeColor : '#6b6b68')}</span>
                  <span style={{ fontSize:9.5, fontWeight: isActive ? 700 : 400, color: isActive ? activeColor : '#8d8c87', fontFamily:"'DM Sans',sans-serif", letterSpacing:0.1 }}>{t.label}</span>
                  {isActive && (
                    <span style={{ width:4,height:4,borderRadius:'50%',background:activeColor,marginTop:1 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="tb-page-shell" style={S.page}>
        {!activeTrip && (
          tripsLoading
            ? <Spinner variant="trips" />
            : <div key={viewKey} className={`tb-view-enter tb-view-${viewDirection}`}><HomePageFeature
                trips={trips}
                onOpenTrip={handleOpenTrip}
                onCreateTrip={handleCreateTrip}
                onJoinTrip={handleJoinTrip}
                onDeleteTrip={handleDeleteTrip}
                onMarkComplete={handleMarkComplete}
                onMarkActive={handleMarkActive}
                profileName={profile.name}
                homeTab={homeTab}
                setHomeTab={setHomeTab}
              /></div>
        )}

        {activeTrip && (
          tripLoading || !activeTripData
            ? <Spinner variant="trip" />
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
                              _cachedItin:  data.trip.cachedItinerary  ?? prev?._cachedItin  ?? null,
                              _cachedTaste: data.trip.cachedTaste      ?? prev?._cachedTaste ?? null,
                            }));
                            setTrips(ts => ts.map(t => (t.id === data.trip.id
                              ? {
                                  ...data.trip,
                                  _cachedItin:  data.trip.cachedItinerary  ?? t._cachedItin  ?? null,
                                  _cachedTaste: data.trip.cachedTaste      ?? t._cachedTaste ?? null,
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
                    {/* tab === 'contacts' && <div className="tb-section-flow"><ContactsPageFeature trip={activeTripData} myNickname={myNickname} isSolo={false} /></div> */}
                    {tab === 'itinerary' && <div className="tb-section-flow"><ItineraryPageFeature trip={activeTripData} onCacheUpdate={(update) => handleItineraryCache(activeTripData.id, update)} /></div>}
                    {tab === 'photos' && (
                      <div className="tb-section-flow" style={{ marginLeft: '-1.25rem', marginRight: '-1.25rem', marginTop: 0, marginBottom: '-6rem' }}>
                        <PhotosPageFeature trip={activeTripData} myNickname={myNickname} myAvatar={profile.avatar || null} />
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
                              _cachedItin:  data.trip.cachedItinerary  ?? prev?._cachedItin  ?? null,
                              _cachedTaste: data.trip.cachedTaste      ?? prev?._cachedTaste ?? null,
                            }));
                            setTrips(ts => ts.map(t => (t.id === data.trip.id
                              ? {
                                  ...data.trip,
                                  _cachedItin:  data.trip.cachedItinerary  ?? t._cachedItin  ?? null,
                                  _cachedTaste: data.trip.cachedTaste      ?? t._cachedTaste ?? null,
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
          userProfile={userProfile}
          onUpdateProfile={(up) => setUserProfile(up)}
          onOpenOnboarding={() => { setProfileOpen(false); setShowOnboarding(true); }}
          onMarkActive={handleMarkActive}
          onDeleteTrip={handleDeleteTrip}
        />
      )}
    </div>
  );
}

