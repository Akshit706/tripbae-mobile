import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { supabase } from './supabase';
import { App as CapacitorApp } from '@capacitor/app';
import bglessClubLogo from './assets/bgless_club.png';
import orangeLogo from './assets/logo_orange.png';
import clubComingSoon from './assets/club-coming-soon.png';
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
import { signInWithGoogle, signInWithEmail, signUpWithEmail, sendVerificationEmail, firebaseAuthMessage } from './auth';

const HomePageFeature = lazy(() => import('./features/home/HomePage'));
const ShareCodeModalFeature = lazy(() => import('./features/home/ShareCodeModal'));
const TripActionMenuFeature = lazy(() => import('./features/trips/TripActionMenu'));
const SoloExpensesPageFeature = lazy(() => import('./features/solo/SoloExpensesPage'));
const SplitPageFeature = lazy(() => import('./features/split/SplitPage'));
const PhotosPageFeature = lazy(() => import('./features/photos/PhotosPage'));
const ItineraryPageFeature = lazy(() => import('./features/itinerary/ItineraryPage'));
const ProfilePageFeature = lazy(() => import('./features/profile/ProfilePage'));
const ClubPageFeature = lazy(() => import('./features/club/ClubPage'));
const UserProfileWizard = lazy(() => import('./features/profile/UserProfileWizard'));

const FeatureFallback = () => <Spinner text="Loading…" />;

/* ─── CONSTANTS ─────────────────────────────────────── */
const MCOLORS = ['#FF6A00','#D85A30','#BA7517','#7F77DD','#378ADD','#D4537E','#FF8C3A','#993C1D'];
const API_BASE = 'https://travelbae-backend-sg.onrender.com';
const CATS = [
  {id:'food',icon:'🍽️',label:'Food',bg:'#FAEEDA'},
  {id:'transport',icon:'🚗',label:'Transport',bg:'#FFF3EB'},
  {id:'stay',icon:'🏠',label:'Stay',bg:'#E6F1FB'},
  {id:'activity',icon:'🎟️',label:'Activity',bg:'#EEEDFE'},
  {id:'shopping',icon:'🛍️',label:'Shopping',bg:'#FAECE7'},
  // {id:'other',icon:'•••',label:'Other',bg:'#F1EFE8'},
];
const CONTACT_CATS = [
  {id:'guardian',icon:'🛡️',label:'Guardian',bg:'#EEEDFE',color:'#534AB7'},
  {id:'driver',icon:'🚗',label:'Driver',bg:'#FFF3EB',color:'#FF8C3A'},
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
      background: 'linear-gradient(135deg,#FF6A00,#FF8C3A)',
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
    return { label: `In ${daysLeft}d`, color: '#FF8C3A', bg: '#FFF3EB', border: 'rgba(255,106,0,0.3)', isPast: false };
  } else if (now <= d) {
    return { label: 'Ongoing', color: '#854F0B', bg: '#FAEEDA', border: '#FAC775', isPast: false };
  }
  return { label: 'Past', color: '#6b6b68', bg: '#F1EFE8', border: '#D3D1C7', isPast: false };
}

const AI_CACHE_KEY = 'travelbae_trip_ai_cache_v1';

async function readAiCache() {
  try {
    const raw = localStorage.getItem(AI_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeAiCache(map) {
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

/* ─── STYLES ─────────────────────────────────────────── */
const S = {
  root: { fontFamily: "'DM Sans',sans-serif", background: '#FAF8F4', color: '#1a1a18' },
  topBar: { position: 'fixed', top: 0, left: 0, right: 0, background: '#fff', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: 'calc(12px + env(safe-area-inset-top, 0px)) max(1.25rem, env(safe-area-inset-left, 0px)) 12px max(1.25rem, env(safe-area-inset-right, 0px))', display: 'flex', alignItems: 'center', gap: 12, zIndex: 300, boxShadow: '0 1px 0 rgba(0,0,0,0.04)' },
  logoText: { fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 800, letterSpacing: '-0.45px', color: '#0D2B2E' },
  tripPill: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 999, padding: '6px 13px', fontSize: 12, color: '#F2F4F5', fontWeight: 700, cursor: 'pointer' },
  soloPill: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 999, padding: '6px 13px', fontSize: 12, color: '#F2F4F5', fontWeight: 700, cursor: 'pointer' },
  navTabs: { background: '#fff', borderBottom: 'none', display: 'flex', padding: '8px 1rem 10px', overflowX: 'auto', gap: 8 },
  navTab: { display: 'flex', alignItems: 'center', gap: 5, padding: '9px 12px', fontSize: 12, fontWeight: 500, color: '#5D6A7B', cursor: 'pointer', background: 'rgba(255,255,255,0.56)', border: '1px solid rgba(23,37,84,0.08)', borderRadius: 999, fontFamily: "'DM Sans',sans-serif", whiteSpace: 'nowrap', boxShadow: '0 8px 20px rgba(15,23,42,0.06)' },
  navTabActive: { color: '#FF8C3A', background: 'linear-gradient(135deg,#FFF3EB,#F2FFFA)', border: '1px solid rgba(255,106,0,0.32)', fontWeight: 700 },
  soloNavTabActive: { color: '#FF6A00', background: 'linear-gradient(135deg,#FFF3EB,#FFF0E6)', border: '1px solid rgba(255,106,0,0.3)', fontWeight: 700 },
  /* Header is ~94px (12 + 70 logo + 12) + safe-area; small extra gap — trip pages only */
  page: { padding: 'calc(80px + env(safe-area-inset-top, 0px)) max(0.95rem, env(safe-area-inset-left, 0px)) 1rem', paddingBottom: 'calc(8rem + env(safe-area-inset-bottom, 0px))', scrollPaddingTop: 'calc(96px + env(safe-area-inset-top, 0px))' },
  /* Home: no extra inset so the hero flags sit flush under the header */
  pageHome: { padding: 'calc(52px + env(safe-area-inset-top, 0px)) 0 0', paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))', scrollPaddingTop: 'calc(52px + env(safe-area-inset-top, 0px))' },
  btn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 999, fontSize: 13, fontWeight: 600, border: '1px solid rgba(25,37,67,0.12)', background: '#fff', color: '#1a1a18', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", boxShadow: '0 8px 18px rgba(0,0,0,0.06)' },
  btnP: { background: 'linear-gradient(135deg,#FF6A00,#FF8C3A)', color: '#fff', border: '0.5px solid rgba(255,106,0,0.68)', boxShadow: '0 10px 22px rgba(255,106,0,0.24)' },
  btnSolo: { background: 'linear-gradient(135deg,#FF6A00,#FF8C3A)', color: '#fff', border: 'none' },
  btnOrange: { background: '#FF6B35', color: '#fff', border: '0.5px solid #FF6B35' },
  btnDanger: { background: '#fff', color: '#993C1D', border: '0.5px solid #F5C4B3' },
  card: { background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 30, padding: '1rem 1.05rem', marginBottom: 12, boxShadow: '0 20px 40px rgba(8,16,35,0.10)' },
  input: { fontFamily: "'DM Sans',sans-serif", padding: '11px 13px', border: '1px solid rgba(11,27,50,0.13)', borderRadius: 16, fontSize: 14, background: '#fff', color: '#1a1a18', width: '100%', outline: 'none', boxSizing: 'border-box', boxShadow: '0 6px 16px rgba(15,23,42,0.05)' },
  label: { fontSize: 11, color: '#6b6b68', fontWeight: 600, letterSpacing: .3, textTransform: 'uppercase', display: 'block', marginBottom: 5, marginTop: 10 },
  spinner: { width: 36, height: 36, border: '3px solid #FFF3EB', borderTopColor: '#FF6A00', borderRadius: '50%', animation: 'spin .75s linear infinite', margin: '0 auto 12px' },
  soloSpinner: { width: 36, height: 36, border: '3px solid #FFF3EB', borderTopColor: '#FF6A00', borderRadius: '50%', animation: 'spin .75s linear infinite', margin: '0 auto 12px' },
};

const TAB_ICONS = {
  split:    (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
  contacts: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  explore:  (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
  photos:   (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  club:     (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  expenses: (c) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M22 10H2"/><circle cx="12" cy="15" r="1.5" fill={c} stroke="none"/></svg>,
};
const GROUP_TABS = [
  { id: 'main',      iconKey: 'split',    label: 'Split' },
  { id: 'itinerary', iconKey: 'explore',  label: 'Explore' },
  { id: 'photos',    iconKey: 'photos',   label: 'Photos' },
  { id: 'club',      iconKey: 'club',     label: 'Club' },
];
const SOLO_TABS = [
  { id: 'main',      iconKey: 'expenses', label: 'Expenses' },
  { id: 'itinerary', iconKey: 'explore',  label: 'Explore' },
  { id: 'club',      iconKey: 'club',     label: 'Club' },
];

export default function App() {
  const [authToken, setAuthToken] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [lgMode, setLgMode] = useState('login'); // 'login' | 'signup'
  const [lgName, setLgName] = useState('');
  const [lgEmail, setLgEmail] = useState('');
  const [lgPassword, setLgPassword] = useState('');
  const [lgShowPw, setLgShowPw] = useState(false);
  const [lgResetReady, setLgResetReady] = useState(false);
  const [lgForgotMode, setLgForgotMode] = useState(false);
  const [lgForgotSent, setLgForgotSent] = useState(false);
  const [lgVerifyEmail, setLgVerifyEmail] = useState(''); // non-empty => show "check your inbox" screen
  const [lgVerifyResent, setLgVerifyResent] = useState(false);
  const [lgPendingUser, setLgPendingUser] = useState(null);
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
  // Any full-screen overlay (wizard, club gate, info modal) can broadcast that it's open;
  // when true, we hide the fixed topbar + bottom nav so they never peek over the overlay.
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [showClubComingSoon, setShowClubComingSoon] = useState(false);

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
  // ── Load persisted data on mount ──
  useEffect(() => {
    const token = localStorage.getItem('travelbae_token');
    setAuthToken(token);
    setAuthReady(true);
  }, []);

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

  // Persist active trip + tab across refreshes
  useEffect(() => {
    if (activeTrip) sessionStorage.setItem('tb_active_trip', activeTrip);
    else sessionStorage.removeItem('tb_active_trip');
  }, [activeTrip]);

  useEffect(() => {
    sessionStorage.setItem('tb_active_tab', tab);
  }, [tab]);

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
            _cachedItin:   t.cachedItinerary  ?? c._cachedItin  ?? null,
            _cachedTaste:  t.cachedTaste      ?? c._cachedTaste ?? null,
          };
        });
        setTrips(merged);
        const savedTripId = sessionStorage.getItem('tb_active_trip');
        if (savedTripId && !merged.find(t => t.id === savedTripId)) {
          setActiveTrip(null);
          sessionStorage.removeItem('tb_active_trip');
        }
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
        const up = d?.userProfile;
        if (!up || up.onboardingDone === false) {
          setShowOnboarding(true);
        } else {
          setUserProfile(up);
          if (up.photoUrl) {
            setProfile(prev => {
              if (prev?.avatar === up.photoUrl) return prev;
              const next = { ...prev, avatar: up.photoUrl };
              try { localStorage.setItem('travelbae_profile', JSON.stringify(next)); } catch (_) {}
              return next;
            });
          }
        }
      })
      .catch(() => {});
  }, [authToken]);

  useEffect(() => {
  if (!lgVerifyEmail || !lgPendingUser) return;
  let active = true;
  const poll = setInterval(async () => {
  try {
    await lgPendingUser.reload();
    if (!active) return;
    if (lgPendingUser.emailVerified) {
      clearInterval(poll);
      // These two can overlap — getIdToken after reload is fine
      setAuthLoading(true); // or a custom "signingIn" state
      const idToken = await lgPendingUser.getIdToken(true);
      await exchangeFirebaseToken(idToken);
      if (active) { setLgVerifyEmail(''); setLgPendingUser(null); }
    }
  } catch { clearInterval(poll); }
}, 1000); // tightened interval
  return () => { active = false; clearInterval(poll); };
}, [lgVerifyEmail, lgPendingUser]);

  useEffect(() => {
    if (!activeTrip) { setActiveTripData(null); setMyNickname(null); return; }
    setTripLoading(true);
    import('./api').then(({ getTrip }) => {
      getTrip(activeTrip)
        .then(d => {
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
  }, [activeTrip, trips]);

  const isSolo = activeTripData?.isSolo || false;
  const tabs = isSolo ? SOLO_TABS : GROUP_TABS;

  const finishAuth = (data) => {
    localStorage.setItem('travelbae_token', data.token);
    setAuthToken(data.token);
    const accountName = (data?.user?.name || data?.name || '').trim();
    if (accountName) {
      const nextProfile = { ...profile, name: accountName };
      setProfile(nextProfile);
      try { localStorage.setItem('travelbae_profile', JSON.stringify(nextProfile)); } catch (_) {}
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(''); setAuthLoading(true);
    try {
      const userCredential = await signInWithGoogle();
      const idToken = await userCredential.user.getIdToken();
      const res = await fetch(`${API_BASE}/auth/firebase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Google sign-in failed');
      await finishAuth(data);
    } catch (err) {
      setAuthError(err.message);
    }
    setAuthLoading(false);
  };

  const exchangeFirebaseToken = async (idToken) => {
    const res = await fetch(`${API_BASE}/auth/firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Sign-in failed');
    await finishAuth(data);
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const name = lgName.trim();
    const email = lgEmail.trim();
    const password = lgPassword;
    if (!email || !password) return setAuthError('Please fill in all fields.');
    if (lgMode === 'signup') {
      if (!name) return setAuthError('Please enter your name.');
      if (password.length < 6) return setAuthError('Password must be at least 6 characters.');
    }
    setAuthError('');
    setAuthLoading(true);
    try {
      if (lgMode === 'signup') {
        // Firebase creates the account and emails a verification link to this
        // address. We deliberately DO NOT log them in — access is gated until
        // they confirm the email, so nobody can sign up with someone else's
        // address and impersonate them.
        await signUpWithEmail(email, password, name);
        const { auth: fAuth } = await import('./firebase');
        setLgPendingUser(fAuth.currentUser);
        setLgVerifyEmail(email);
        setLgVerifyResent(false);
      } else {
        // Signing in with correct credentials succeeds in Firebase even when
        // the email is unverified — we must block app access ourselves.
        const cred = await signInWithEmail(email, password);
        const user = cred.user;
        if (!user.emailVerified) {
          setLgVerifyEmail(user.email || email);
          setLgVerifyResent(false);
          return;
        }
        await exchangeFirebaseToken(await user.getIdToken());
      }
    } catch (err) {
      setAuthError(firebaseAuthMessage(err));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setAuthError('');
    setLgVerifyResent(false);
    setAuthLoading(true);
    try {
      const { auth: fAuth } = await import('./firebase');
      const current = fAuth.currentUser;
      let target = current;
      if (!target) {
        const cred = await signInWithEmail(lgVerifyEmail, lgPassword || 'x');
        target = cred.user;
      }
      await sendVerificationEmail(target);
setLgPendingUser(target);   // keeps polling alive after resend
setLgVerifyResent(true);
    } catch (err) {
      setAuthError(err.message || 'Could not resend the verification email. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
  const email = lgEmail.trim();
  if (!email) return setAuthError('Enter your email above first.');
  setAuthError('');
  setAuthLoading(true);
  try {
    const { sendPasswordResetEmail } = await import('firebase/auth');
    const { auth: fAuth } = await import('./firebase');
    await sendPasswordResetEmail(fAuth, email);
    setLgForgotSent(true);
  } catch (err) {
    setAuthError(firebaseAuthMessage(err));
  } finally {
    setAuthLoading(false);
  }
};

  const switchLgMode = (mode) => {
  setLgMode(mode);
  setLgVerifyEmail('');
  setLgVerifyResent(false);
  setLgPendingUser(null);
  setLgForgotSent(false);
  setAuthError('');
  setLgResetReady(false);
};

  const handleLogout = () => {
    localStorage.removeItem('travelbae_token');
    localStorage.removeItem(AI_CACHE_KEY);
    sessionStorage.removeItem('tb_active_trip');
    sessionStorage.removeItem('tb_active_tab');
    setAuthToken(null);
    setTrips([]);
    setActiveTrip(null);
    setLgForgotSent(false);
    setLgResetReady(false);
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
      sessionStorage.removeItem('tb_active_trip');
      sessionStorage.removeItem('tb_active_tab');
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
    if (trip.destination) {
      import('./api').then(async ({ generateLocalTaste }) => {
        try {
          const tasteResult = await generateLocalTaste({ destination: trip.destination });
          setTrips(ts => ts.map(t => t.id === trip.id
            ? { ...t, _cachedTaste: tasteResult }
            : t
          ));
          const cache = readAiCache();
          cache[trip.id] = { ...(cache[trip.id] || {}), _cachedTaste: tasteResult };
          writeAiCache(cache);
          saveAiCache(trip.id, { cachedTaste: tasteResult })
            .catch(e => console.warn('Taste cache DB save failed:', e.message));
        } catch (e) {
          console.warn('Background taste generation failed:', e);
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

  const handleOpenTrip = (tripId) => {
    setActiveTrip(tripId);
    setTab('main');
  };

  const closeClubComingSoon = () => setShowClubComingSoon(false);

  const leaveClubToHome = () => {
    setShowClubComingSoon(false);
    setTab('main');
    setHomeTab('trips');
    setActiveTrip(null);
    setActiveTripData(null);
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
      const { deleteTrip } = await import('./api');
      await deleteTrip(tripId);
    } catch (err) {
      console.warn('Delete API error (removing locally):', err.message);
    }
    setTrips(ts => ts.filter(t => t.id !== tripId));
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

  const handleTabChange = (nextTab) => {
    if (nextTab === 'club') {
      setShowClubComingSoon(true);
      return;
    }
    if (nextTab === tab) return;
    setTab(nextTab);
  };

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [tab, activeTrip]);

  // ── Android hardware back button ──
  useEffect(() => {
    const setupBackButton = async () => {
      try {
        let listener;
        listener = await CapacitorApp.addListener('backButton', () => {
          if (showClubComingSoon) { closeClubComingSoon(); return; }
          // Priority 1: Close profile if open
          if (profileOpen) { setProfileOpen(false); return; }
          // Priority 2: Close notification popover
          if (showNotifPopover) { setShowNotifPopover(false); return; }
          // Priority 3: Go back from trip to home
          if (activeTrip) { setActiveTrip(null); setActiveTripData(null); return; }
          // Priority 4: Exit app if on home screen
          CapacitorApp.exitApp();
        });
        return () => { listener?.remove(); };
      } catch (e) {
        // Not on native platform — ignore
      }
    };
    const cleanup = setupBackButton();
    return () => { cleanup.then(fn => fn?.()); };
  }, [profileOpen, showNotifPopover, activeTrip, showClubComingSoon]);

  // ── HIDE topbar/bottom nav while a full-screen overlay is open ──
  // Overlays (CreateTripWizard, ClubPage gate/info) dispatch 'tb:overlay' events.
  useLayoutEffect(() => {
    const onChange = (e) => setOverlayOpen(!!e.detail?.open);
    window.addEventListener('tb:overlay', onChange);
    return () => window.removeEventListener('tb:overlay', onChange);
  }, []);

  // ── AUTH LOADING ──
  if (!authReady) {
    return (
      <div style={{ minHeight: '100vh', background: '#FAF8F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #FFF3EB', borderTopColor: '#FF6A00', borderRadius: '50%', animation: 'spin .75s linear infinite' }} />
      </div>
    );
  }

  // ── AUTH SCREEN — Google-only login ──
  // ── AUTH SCREEN — Replace the entire `if (!authToken) return (...)` block ──

if (!authToken) return (
  <div className="lg-root">
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
    <style>{`
      *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color: transparent;}
      @keyframes lgSpin       { to{transform:rotate(360deg)} }
      @keyframes lgLogoIn     { from{opacity:0;transform:scale(.87)} to{opacity:1;transform:scale(1)} }
      @keyframes lgTagIn      { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
      @keyframes lgCardSlide  { from{opacity:0;transform:translateY(26px) scale(.99)} to{opacity:1;transform:translateY(0) scale(1)} }
      @keyframes lgBtnIn      { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
      @keyframes lgStampFloat { 0%,100%{transform:rotate(-14deg) translateY(0)} 50%{transform:rotate(-14deg) translateY(-5px)} }
      @keyframes lgTagFloat   { 0%,100%{transform:rotate(8deg) translateY(0)} 50%{transform:rotate(8deg) translateY(-4px)} }
      @keyframes lgShimmerSweep { 0%{left:-80%} 100%{left:150%} }
      @keyframes lgLogoSweep    { 0%{left:-80%} 100%{left:180%} }
      @keyframes lgShimmerText  { 0%{background-position:200% center} 100%{background-position:-200% center} }
      @keyframes lgShake        { 0%,100%{transform:translateX(0)} 15%,45%,75%{transform:translateX(-4px)} 30%,60%,90%{transform:translateX(4px)} }
      @keyframes lgOrb1         { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(20px,-18px) scale(1.07)} }
      @keyframes lgOrb2         { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-16px,14px) scale(1.05)} }
      @keyframes lgDot          { 0%,100%{opacity:0.18;transform:translateY(0)} 50%{opacity:0.45;transform:translateY(-7px)} }
      @keyframes lgFieldIn      { from{opacity:0;transform:translateY(9px)} to{opacity:1;transform:translateY(0)} }
      @keyframes lgCardGlow     { 0%,100%{box-shadow:0 20px 60px rgba(0,0,0,0.08),0 4px 18px rgba(0,0,0,0.05),0 0 0 1px rgba(0,0,0,0.04)} 50%{box-shadow:0 24px 70px rgba(255,106,0,0.11),0 4px 24px rgba(255,106,0,0.08),0 0 0 1.5px rgba(255,106,0,0.14)} }
      @keyframes lgTopLine      { from{opacity:0;transform:scaleX(0)} to{opacity:1;transform:scaleX(1)} }
      .lg-root {
        min-height:100vh; min-height:100dvh; width:100%;
        background:#FFFFFF;
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        font-family:'DM Sans',sans-serif;
        position:relative; overflow-x:hidden; overflow-y:auto;
        -webkit-overflow-scrolling:touch; overscroll-behavior:none;
        padding: 2rem 1.25rem;
      }

      .lg-bg { position:absolute; inset:0; pointer-events:none; z-index:0; overflow:hidden; }
      .lg-bg-stamp {
        position:absolute; bottom:16%; right:4%;
        width:74px; height:74px;
        opacity:0.072;
        animation:lgStampFloat 7s ease-in-out infinite;
      }
      .lg-bg-tag {
        position:absolute; bottom:12%; left:4%;
        opacity:0.065;
        animation:lgTagFloat 9s ease-in-out infinite;
      }
      

      /* ── Center block ── */
      .lg-center {
        position: relative; z-index: 1;
        width: 100%; max-width: 400px;
        display: flex; flex-direction: column; align-items: center;
        gap: 0;
      }

      /* ── Logo ── */
      .lg-logo-img {
        width: 180px; height: auto; object-fit: contain;
        animation: lgLogoIn .55s cubic-bezier(.22,.68,0,1.2) both;
        margin-bottom: 6px;
      }

      /* ── Tagline ── */
      .lg-tagline {
  font-family: 'Sora', sans-serif;
  font-size: 15px; font-weight: 800; font-style: italic;
  color: #1A1A1A;
  text-align: center;
  letter-spacing: -0.2px;
  margin-bottom: 4px;
  animation: lgTagIn .4s .15s ease both;
}
      .lg-sub {
        font-size: 12.5px; color: #9CA3AF; font-weight: 400;
        text-align: center;
        margin-bottom: 22px;
        animation: lgTagIn .4s .22s ease both;
      }

      /* ── Card ── */
      .lg-card {
  width: 100%;
  background: rgba(255,255,255,0.97);
  border-radius: 24px;
  padding: 1.75rem 1.5rem;
  box-shadow: 0 20px 60px rgba(0,0,0,0.08), 0 4px 18px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04);
  animation: lgCardSlide .5s .05s cubic-bezier(.22,.68,0,1.15) both, lgCardGlow 4.5s ease-in-out infinite 2s;
  position: relative; overflow: hidden;
}
.lg-card::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(255,106,0,0.55) 40%, rgba(255,140,58,0.7) 60%, transparent 100%);
  border-radius: 24px 24px 0 0;
  animation: lgTopLine .9s .6s cubic-bezier(.22,.68,0,1.2) both;
  transform-origin: center;
  pointer-events: none;
}

      .lg-error {
  font-size: 13px;
  color: #C2410C;                   /* orange-700 */
  background: #FFFFFF;              /* white */
  border: none;
  border-left: 3px solid #F97316;   /* orange-500 */
  border-radius: 12px;
  padding: 11px 14px;
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 9px;
  line-height: 1.5;
  font-weight: 500;
  box-shadow: 0 2px 10px rgba(249, 115, 22, 0.10);
  animation: lgShake .45s cubic-bezier(.36,.07,.19,.97) both;
}

.lg-error::before {
  content: '⚠';
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 1px;
  opacity: 0.85;
}

      .lg-form { text-align: left; }

      /* ── Field ── */
      .lg-field { margin-bottom: 14px; animation: lgFieldIn .38s ease both; }
.lg-field:nth-child(1) { animation-delay: .2s; }
.lg-field:nth-child(2) { animation-delay: .3s; }
.lg-field:nth-child(3) { animation-delay: .4s; }
      .lg-field-label {
        display: block; font-size: 12.5px; font-weight: 600;
        color: #374151; margin-bottom: 7px;
        letter-spacing: 0;
      }
      .lg-input-wrap {
        position: relative;
        display: flex; align-items: center;
        border: 1.5px solid #E5E7EB;
        border-radius: 14px;
        background: #fff;
        transition: border-color .15s, box-shadow .15s;
        overflow: hidden;
      }
      .lg-input-wrap:focus-within {
        border-color: #FF6A00;
        box-shadow: 0 0 0 3px rgba(255,106,0,0.13);
      }
      .lg-input-icon {
        flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
        padding: 0 4px 0 14px;
        color: #9CA3AF;
      }
      .lg-input {
        flex: 1;
        padding: 13px 12px;
        font-size: 14.5px; font-family: 'DM Sans', sans-serif;
        border: none; outline: none;
        color: #111827; background: transparent;
      }
      .lg-input::placeholder { color: #B0B7C3; }
      .lg-show-pw {
        flex-shrink: 0;
        background: none; border: none; cursor: pointer;
        padding: 0 14px;
        color: #9CA3AF;
        display: flex; align-items: center; justify-content: center;
        height: 100%;
      }
      .lg-show-pw:hover { color: #6B7280; }



      /* ── Submit ── */
      .lg-submit-btn {
  width: 100%; padding: 14.5px;
  margin-top: 10px;
  background: linear-gradient(135deg, #FF6A00, #F04E23);
  border: none; border-radius: 14px;
  color: #fff; font-size: 15px; font-weight: 700;
  font-family: 'DM Sans', sans-serif; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: 0 8px 20px rgba(255,106,0,0.28);
  transition: transform .15s, box-shadow .15s, opacity .18s;
  animation: lgBtnIn .38s .3s ease both;
  letter-spacing: 0.1px;
  position: relative; overflow: hidden;
}
.lg-submit-btn::after {
  content: '';
  position: absolute; top: 0; bottom: 0; left: -80%;
  width: 45%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transform: skewX(-18deg);
  animation: lgShimmerSweep 2.8s ease-in-out infinite 2s;
  pointer-events: none;
}
.lg-submit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 12px 28px rgba(255,106,0,0.42); }
.lg-submit-btn:active:not(:disabled) { transform: scale(0.975); }
.lg-submit-btn:disabled { opacity: 0.65; cursor: not-allowed; }
.lg-btn-arrow { font-size: 18px; line-height: 1; }

      /* ── Switch (below button) ── */
      .lg-switch {
        text-align: center; margin-top: 14px;
        font-size: 13px; color: #6B7280;
      }
      .lg-switch button {
        background: none; border: none; color: #FF6A00;
        font-weight: 700; cursor: pointer;
        font-size: 13px; font-family: 'DM Sans', sans-serif;
      }
      .lg-switch button:hover { text-decoration: underline; }

      /* ── Divider ── */
      .lg-divider {
        display: flex; align-items: center; gap: 12px;
        margin: 18px 0 16px;
        color: #B0B7C3; font-size: 12px; font-weight: 500;
      }
      .lg-divider::before, .lg-divider::after {
        content: ''; flex: 1; height: 1px; background: #F0EDE8;
      }

      /* ── Google ── */
      .lg-google-btn {
  width: 100%; padding: 13.5px;
  background: #fff; border: 1.5px solid #E5E7EB; border-radius: 14px;
  font-size: 14.5px; font-weight: 600;
  font-family: 'DM Sans', sans-serif; color: #1a1a18;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  transition: transform .15s, box-shadow .15s, background .18s;
  animation: lgBtnIn .38s .4s ease both;
  position: relative; overflow: hidden;
}
.lg-google-btn::after {
  content: '';
  position: absolute; top: 0; bottom: 0; left: -80%;
  width: 45%;
  background: linear-gradient(90deg, transparent, rgba(0,0,0,0.04), transparent);
  transform: skewX(-18deg);
  opacity: 0; transition: opacity .2s;
  pointer-events: none;
}
.lg-google-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 20px rgba(0,0,0,0.11); background: #FAFAFA; }
.lg-google-btn:hover:not(:disabled)::after { opacity: 1; animation: lgShimmerSweep .9s ease-out; }
.lg-google-btn:active:not(:disabled) { transform: scale(0.98); }
.lg-google-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      .lg-spinner {
        width: 20px; height: 20px;
        border: 2.5px solid rgba(255,255,255,0.38); border-top-color: #fff;
        border-radius: 50%; animation: lgSpin .6s linear infinite; display: inline-block;
      }
      .lg-spinner-dark {
        width: 20px; height: 20px;
        border: 2.5px solid rgba(0,0,0,0.12); border-top-color: #FF6A00;
        border-radius: 50%; animation: lgSpin .6s linear infinite; display: inline-block;
      }

      /* ── Terms ── */
      .lg-terms {
        text-align: center; margin-top: 16px;
        font-size: 11px; color: #B0B7C3; line-height: 1.6;
        position: relative; z-index: 2;
        width: 100%; max-width: 400px;
      }
      .lg-terms a { color: #9CA3AF; text-decoration: underline; cursor: pointer; }
      .lg-terms a:hover { color: #374151; }

      /* ── Verify screen ── */
      .lg-verify { text-align: center; }
      .lg-verify-icon { font-size: 34px; margin-bottom: 6px; }
      .lg-verify-title { font-family: 'Sora', sans-serif; font-size: 18px; font-weight: 800; color: #1A1A1A; margin-bottom: 8px; }
      .lg-verify-sub { font-size: 13.5px; color: #6B7280; line-height: 1.55; margin-bottom: 18px; }
      .lg-verify-sub strong { color: #1A1A1A; }
      .lg-verify-resend {
        width: 100%; padding: 14px; border: none; border-radius: 14px;
        background: linear-gradient(135deg, #FF6A00, #F04E23); color: #fff;
        font-size: 15px; font-weight: 700; font-family: 'DM Sans', sans-serif; cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 8px;
        box-shadow: 0 8px 20px rgba(255,106,0,0.28);
      }
      .lg-verify-resend:disabled { opacity: 0.65; cursor: not-allowed; }
      .lg-verify-back { margin-top: 14px; }
      .lg-verify-back button {
        background: none; border: none; color: #FF6A00; font-weight: 700; cursor: pointer;
        font-size: 13.5px; font-family: 'DM Sans', sans-serif;
      }
      .lg-verify-back button:hover { text-decoration: underline; }

      /* signup extra field */
      .lg-name-field { margin-bottom: 14px; }
    `}</style>

    {/* ── Decorative background ── */}
    <div className="lg-bg" aria-hidden="true">
  {/* Gradient orbs */}
  <div style={{position:'absolute',top:'-10%',right:'-14%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(255,106,0,0.13) 0%,transparent 70%)',animation:'lgOrb1 14s ease-in-out infinite',pointerEvents:'none'}} />
  <div style={{position:'absolute',bottom:'-8%',left:'-12%',width:260,height:260,borderRadius:'50%',background:'radial-gradient(circle,rgba(255,106,0,0.09) 0%,transparent 70%)',animation:'lgOrb2 17s ease-in-out infinite 2.5s',pointerEvents:'none'}} />
  {/* Floating dots */}
  {[{x:'12%',y:'20%',d:0},{x:'80%',y:'35%',d:1.8},{x:'55%',y:'68%',d:3.2},{x:'70%',y:'14%',d:2.1},{x:'25%',y:'55%',d:4.4}].map((dot,i)=>(
    <div key={i} style={{position:'absolute',left:dot.x,top:dot.y,width:4,height:4,borderRadius:'50%',background:'rgba(255,106,0,0.3)',animation:`lgDot ${5+i*0.8}s ease-in-out infinite ${dot.d}s`,pointerEvents:'none'}} />
  ))}
      
      
      
      <svg className="lg-bg-stamp" viewBox="0 0 74 74" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="37" cy="37" r="33" stroke="#FF6A00" strokeWidth="2" strokeDasharray="3.5 3"/>
        <circle cx="37" cy="37" r="26" stroke="#FF6A00" strokeWidth="1"/>
        <text x="37" y="31" textAnchor="middle" fontFamily="'DM Sans',sans-serif" fontWeight="700" fontSize="7" fill="#FF6A00" letterSpacing="1.8">BOARDING</text>
        <line x1="22" y1="36" x2="52" y2="36" stroke="#FF6A00" strokeWidth="0.8"/>
        <text x="37" y="44" textAnchor="middle" fontFamily="'DM Sans',sans-serif" fontWeight="700" fontSize="7" fill="#FF6A00" letterSpacing="1.8">PASS</text>
        <text x="37" y="55" textAnchor="middle" fontFamily="'DM Sans',sans-serif" fontSize="5.5" fill="#FF6A00" letterSpacing="0.8">TRIPBAE · 2026</text>
      </svg>
      <svg className="lg-bg-tag" width="38" height="56" viewBox="0 0 38 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="14" width="34" height="40" rx="6" stroke="#FF6A00" strokeWidth="1.5"/>
        <path d="M19 14 L19 8" stroke="#FF6A00" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="19" cy="5.5" r="3" stroke="#FF6A00" strokeWidth="1.5"/>
        <line x1="9" y1="27" x2="29" y2="27" stroke="#FF6A00" strokeWidth="1" strokeLinecap="round" opacity="0.7"/>
        <line x1="9" y1="33" x2="24" y2="33" stroke="#FF6A00" strokeWidth="1" strokeLinecap="round" opacity="0.5"/>
        <line x1="9" y1="39" x2="21" y2="39" stroke="#FF6A00" strokeWidth="1" strokeLinecap="round" opacity="0.4"/>
      </svg>
    </div>

    {/* ── Center block: logo + tagline + card + terms ── */}
    <div className="lg-center">

      {/* Logo */}
      <div style={{position:'relative',display:'inline-block',overflow:'hidden',borderRadius:10,marginBottom:6}}>
  <img src={orangeLogo} alt="TripBae" className="lg-logo-img" style={{marginBottom:0,display:'block'}} />
  <div style={{position:'absolute',top:0,bottom:0,left:'-80%',width:'40%',background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent)',transform:'skewX(-18deg)',animation:'lgLogoSweep 3.2s ease-in-out infinite 1.5s',pointerEvents:'none'}} />
</div>

      {/* Tagline */}
      <div className="lg-tagline">One app for every part of the trip</div>
      <div className="lg-sub">Sign in to get started</div>

      {/* Card */}
      <div className="lg-card">
        {authError && <div className="lg-error">{authError}</div>}

        {lgVerifyEmail ? (
          <div className="lg-verify">
            <div className="lg-verify-icon">✉️</div>
            <div className="lg-verify-title">
              {lgMode === 'signup' ? 'Confirm your email' : 'Verify your email'}
            </div>
            <div className="lg-verify-sub">
  We sent a confirmation link to <strong>{lgVerifyEmail}</strong>.
  
</div>

{/* Waiting indicator — shows while polling */}
{lgPendingUser && (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,margin:'4px 0 16px',color:'#9CA3AF',fontSize:12.5}}>
    <div style={{width:13,height:13,border:'2px solid #FFF3EB',borderTopColor:'#FF6A00',borderRadius:'50%',animation:'lgSpin .8s linear infinite',flexShrink:0}} />
    Waiting for you to click the link…
  </div>
)}

<button
  className="lg-verify-resend"
  onClick={handleResendVerification}
  disabled={authLoading}
>
  {authLoading
    ? <span className="lg-spinner" />
    : (lgVerifyResent ? 'Verification email sent ✓' : 'Resend email')}
</button>
<div className="lg-verify-back">
  <button type="button" onClick={() => { setLgVerifyEmail(''); setLgVerifyResent(false); setLgPendingUser(null); setAuthError(''); }}>← Back to sign in</button>
</div>
          </div>
        ) : (
          <form className="lg-form" onSubmit={handleEmailSubmit} noValidate>

            {/* Name — signup only */}
            {lgMode === 'signup' && (
              <div className="lg-field">
                <label className="lg-field-label" htmlFor="lg-name">Name</label>
                <div className="lg-input-wrap">
                  <span className="lg-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <input
                    id="lg-name"
                    className="lg-input"
                    type="text"
                    placeholder="Your name"
                    autoComplete="name"
                    value={lgName}
                    onChange={e => setLgName(e.target.value)}
                    disabled={authLoading}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="lg-field">
              <label className="lg-field-label" htmlFor="lg-email">Email</label>
              <div className="lg-input-wrap">
                <span className="lg-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </span>
                <input
                  id="lg-email"
                  className="lg-input"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={lgEmail}
                  onChange={e => setLgEmail(e.target.value)}
                  disabled={authLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="lg-field">
              <label className="lg-field-label" htmlFor="lg-password">Password</label>
              <div className="lg-input-wrap">
                <span className="lg-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="lg-password"
                  className="lg-input"
                  type={lgShowPw ? 'text' : 'password'}
                  placeholder={lgMode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                  autoComplete={lgMode === 'signup' ? 'new-password' : 'current-password'}
                  value={lgPassword}
                  onChange={e => setLgPassword(e.target.value)}
                  disabled={authLoading}
                />
                <button
                  type="button"
                  className="lg-show-pw"
                  onClick={() => setLgShowPw(v => !v)}
                  disabled={authLoading}
                  aria-label={lgShowPw ? 'Hide password' : 'Show password'}
                >
                  {lgShowPw ? (
                    /* eye-off */
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    /* eye */
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>

              {lgMode === 'login' && !lgForgotSent && (
  <div style={{ textAlign: 'right', marginTop: 6 }}>
    <button
      type="button"
      onClick={handleForgotPassword}
      disabled={authLoading}
      style={{ background: 'none', border: 'none', color: '#FF6A00', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", padding: 0 }}
    >
      Forgot password?
    </button>
  </div>
)}
{lgMode === 'login' && lgForgotSent && !lgResetReady && (
  <div style={{ marginTop: 8 }}>
    <div style={{ fontSize: 12.5, color: '#6B7280', background: '#F9F9F9', border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
      <span>✉️</span> Reset link sent to <strong style={{ marginLeft: 3, color: '#111827' }}>{lgEmail}</strong>
    </div>
    <button
      type="button"
      onClick={() => setLgResetReady(true)}
      style={{ width: '100%', padding: '12px', background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 14, fontSize: 14, fontWeight: 600, color: '#111827', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
    >
      Sign in with new password →
    </button>
  </div>
)}


            </div>

            {/* Submit */}
            <button type="submit" className="lg-submit-btn" disabled={authLoading}>
              {authLoading ? (
                <span className="lg-spinner" />
              ) : (
                <>
                  {lgMode === 'signup' ? 'Create account' : 'Sign in'}
                  <span className="lg-btn-arrow">→</span>
                </>
              )}
            </button>

            {/* Switch mode */}
            <div className="lg-switch">
              {lgMode === 'signup' ? (
                <>Already have an account? <button type="button" onClick={() => switchLgMode('login')}>Sign in</button></>
              ) : (
                <>New to Tripbae? <button type="button" onClick={() => switchLgMode('signup')}>Create an account</button></>
              )}
            </div>

            {/* Divider */}
            <div className="lg-divider">or continue with</div>

            {/* Google */}
            <button
              type="button"
              className="lg-google-btn"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
            >
              {authLoading ? (
                <span className="lg-spinner-dark" />
              ) : (
                <>
                  <svg width="19" height="19" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                    <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

          </form>
        )}
      </div>

      {/* Terms */}
      <div className="lg-terms">
        By continuing you agree to our <a>Terms of Service</a> and <a>Privacy Policy</a>
      </div>

    </div>
  </div>
);

  return (
    <div className="tb-app-shell" style={S.root}>
      <div style={{ position: 'fixed', top: -180, right: -120, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,106,0,0.13) 0%, rgba(255,106,0,0) 72%)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -190, left: -110, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,106,0,0.07) 0%, rgba(255,106,0,0) 72%)', zIndex: 0, pointerEvents: 'none' }} />
      {showOnboarding && (
        <Suspense fallback={null}>
          <UserProfileWizard
            userName={profile?.name || ''}
            onDone={(savedProfile) => {
              setShowOnboarding(false);
              const up = { ...savedProfile, onboardingDone: true };
              setUserProfile(up);
              if (savedProfile.photoUrl) {
                saveProfile({ ...profile, avatar: savedProfile.photoUrl });
              }
            }}
          />
        </Suspense>
      )}

      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes tbShimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
        .tb-shimmer{background:linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%);background-size:1200px 100%;animation:tbShimmer 1.4s ease-in-out infinite;border-radius:8px}
        html,body{scroll-behavior:smooth;-webkit-overflow-scrolling:touch}
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        a{color:inherit;text-decoration:none}
        ::selection{background:rgba(255,106,0,0.2);color:#7A2E00}
        input[type=range]{-webkit-appearance:none;height:4px;border-radius:4px;background:#FFF3EB;outline:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#FF6A00;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.2)}
        input:focus, select:focus, textarea:focus { border-color:#FF6A00 !important; box-shadow:0 0 0 3px rgba(255,106,0,0.14) !important; }

        /* ── Safe area top padding to avoid status bar overlap ── */
        .tb-topbar-glass {
          padding-top: max(12px, env(safe-area-inset-top, 0px));
        }
      `}</style>


      {newTripModal && <Suspense fallback={null}><ShareCodeModalFeature trip={newTripModal} onDismiss={handleShareCodeDismiss} /></Suspense>}

      {showClubComingSoon && (
        <div
          onClick={closeClubComingSoon}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'max(6px, env(safe-area-inset-top, 0px)) 8px max(6px, env(safe-area-inset-bottom, 0px))', backdropFilter: 'blur(4px)' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: 640, width: '100%', maxHeight: '100%', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <img src={clubComingSoon} alt="Tripbae Club Coming Soon" style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 'calc(100dvh - 12px)', objectFit: 'contain', objectPosition: 'center top' }} />
            <button
              onClick={closeClubComingSoon}
              style={{ position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
            >✕</button>
          </div>
        </div>
      )}

      {/* Top Bar */}
      {!overlayOpen && <div className="tb-topbar-glass" style={S.topBar}>
        <button
          onClick={() => setProfileOpen(true)}
          title="My profile"
          style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: profile.avatar ? `url(${profile.avatar}) center/cover` : (isSolo ? 'linear-gradient(135deg,#FF6A00,#FF8C3A)' : 'linear-gradient(135deg,#FF6A00,#FF8C3A)'),
            color: '#fff', fontWeight: 700, fontSize: 12, fontFamily: "'Sora',sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0,
            boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
            border: '2.5px solid #fff',
            outline: '1.5px solid rgba(0,0,0,0.08)',
          }}
        >
          {!profile.avatar && (profile.name ? profile.name.trim().slice(0, 2).toUpperCase() : '👤')}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', position: 'absolute', left: '50%', transform: 'translate(-50%, 4px)' }}>
          <img src={orangeLogo} alt="Tripbae" style={{ height: 80, width: 'auto', objectFit: 'contain', display: 'block' }} />
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
            <button
              onClick={() => { window.scrollTo(0, 0); document.documentElement.scrollTop = 0; document.body.scrollTop = 0; setActiveTrip(null); setActiveTripData(null); }}
              title="Home"
              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.65 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1a18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z"/>
                <path d="M9 21V12h6v9"/>
              </svg>
            </button>
            <Suspense fallback={null}><TripActionMenuFeature
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
             /></Suspense>
          </div>
        ) : null}
      </div>}

      {/* Notification popover */}
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
      {activeTrip && !overlayOpen && (
        <div style={{
          position:'fixed', bottom:0, left:0, right:0, zIndex:350,
          background:'transparent',
          paddingBottom:'env(safe-area-inset-bottom,12px)',
        }}>
          <div style={{ display:'flex', alignItems:'center', height:66, padding:'0 0 0 10px', gap:8, overflow:'hidden' }}>

            {/* ── White capsule pill: all non-club tabs ── */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              background: '#ffffff',
              borderRadius: 50,
              height: 52,
              padding: '3px 4px',
              gap: 0,
              boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
            }}>
              {tabs.filter(t => t.id !== 'club').map(t => {
                const isActive = tab === t.id;
                const activeColor = '#FF6A00';
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTabChange(t.id)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6px 4px',
                      border: 'none',
                      cursor: 'pointer',
                      gap: 2,
                      borderRadius: 44,
                      background: 'transparent',
                      transition: 'background .18s',
                      height: '100%',
                    }}
                  >
                    <span style={{ display:'flex', alignItems:'center', justifyContent:'center', opacity: isActive ? 1 : 0.38 }}>
                      {TAB_ICONS[t.iconKey]?.(isActive ? activeColor : '#6b6b68')}
                    </span>
                    <span style={{ fontSize: 9.5, fontWeight: isActive ? 700 : 400, color: isActive ? activeColor : '#8d8c87', fontFamily:"'DM Sans',sans-serif", letterSpacing: 0.1, whiteSpace:'nowrap' }}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* ── Club pill: always gradient, right side cut by overflow:hidden ── */}
            <button
              onClick={() => setShowClubComingSoon(true)}
              style={{
                flex: '0 0 auto',
                alignSelf: 'stretch',
                display: 'flex',
                alignItems: 'stretch',
                padding: '7px 0 7px 0',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: tab === 'club'
                  ? 'linear-gradient(135deg,#7B2FF7 0%,#C01FAB 50%,#FF416C 100%)'
                  : 'linear-gradient(135deg,#6920D4 0%,#A81A96 50%,#D93560 100%)',
                borderRadius: '22px 0 0 22px',
                padding: '0 22px 0 16px',
                minWidth: 96,
                boxShadow: tab === 'club'
                  ? '-4px 0 28px rgba(123,47,247,0.6), inset 0 0 0 2px rgba(255,255,255,0.28)'
                  : '-3px 0 14px rgba(123,47,247,0.28)',
                transition: 'box-shadow .2s',
              }}>
                <img
                  src={bglessClubLogo}
                  alt="Club"
                  style={{ height: 36, width: 'auto', objectFit: 'contain', filter: 'brightness(0) invert(1)', flexShrink: 0 }}
                />
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.82)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <line x1="7" y1="17" x2="17" y2="7"/>
                  <polyline points="7 7 17 7 17 17"/>
                </svg>
              </div>
            </button>

          </div>
        </div>
      )}

      <div
        className={`tb-page-shell${!activeTrip ? ' tb-page-shell--home' : ''}`}
        style={activeTrip ? S.page : S.pageHome}
      >
        {!activeTrip && (
          tripsLoading
            ? <Spinner variant="trips" />
            : <div><Suspense fallback={<Spinner variant="trips" />}><HomePageFeature
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
              /></Suspense></div>
        )}

        {activeTrip && (
          tripLoading || !activeTripData
            ? <Spinner variant="trip" />
            : (
              <div>
                <Suspense fallback={<Spinner variant="trip" />}>
                {isSolo ? (
                  <>
                    {tab === 'main' && <SoloExpensesPageFeature trip={activeTripData} myNickname={myNickname} onTripUpdate={(update) => handleItineraryCache(activeTripData.id, update)} />}
                    {tab === 'itinerary' && <ItineraryPageFeature trip={activeTripData} onCacheUpdate={(update) => handleItineraryCache(activeTripData.id, update)} />}
                    {tab === 'club' && (
                      <ClubPageFeature
                        trip={activeTripData}
                        onLeaveClub={leaveClubToHome}
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
                        <SplitPageFeature trip={activeTripData} myNickname={myNickname} myAvatar={profile.avatar || null} onTripUpdate={(update) => handleItineraryCache(activeTripData.id, update)} />
                      </div>
                    )}
                    {tab === 'itinerary' && <div className="tb-section-flow"><ItineraryPageFeature trip={activeTripData} onCacheUpdate={(update) => handleItineraryCache(activeTripData.id, update)} /></div>}
                    {tab === 'photos' && (
                      <div className="tb-section-flow" style={{ marginLeft: '-1.25rem', marginRight: '-1.25rem', marginTop: 0, marginBottom: '-6rem' }}>
                        <PhotosPageFeature trip={activeTripData} myNickname={myNickname} myAvatar={profile.avatar || null} />
                      </div>
                    )}
                    {tab === 'club' && (
                      <div className="tb-section-flow"><ClubPageFeature
                        trip={activeTripData}
                        onLeaveClub={leaveClubToHome}
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
                </Suspense>
              </div>
            )
        )}
      </div>

      {profileOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
    </div>
  );
}