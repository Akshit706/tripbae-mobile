import { useState, useRef, useEffect } from 'react';
import { tripDuration, normalizeMembers, formatDateRange } from '../shared/constants';
import { S } from '../shared/styles';
import { imagekitAuth, updateUserProfile } from '../../api';
import bglessLogo from '../../assets/bgless.png';

// ── Logo helpers ────────────────────────────────────────────────────────────
const TBLogo = ({ h = 15 }) => (
  <img src={bglessLogo} alt="TravelBae" style={{ height: h, width: 'auto', verticalAlign: 'middle', display: 'inline-block', position: 'relative', top: '-1px' }} />
);
const AC = '#FF6A00';
const AC_SOFT = '#FFF3EA';

const DrawerIcon = ({ id, size = 18, color = AC }) => {
  const p = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: '1.9',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  if (id === 'badge') return <svg {...p}><circle cx="12" cy="8" r="4"/><path d="M8 13h8"/><path d="M10 13l-2 8 4-2 4 2-2-8"/></svg>;
  if (id === 'stats') return <svg {...p}><path d="M4 19h16"/><rect x="6" y="11" width="3" height="6" rx="1"/><rect x="11" y="8" width="3" height="9" rx="1"/><rect x="16" y="5" width="3" height="12" rx="1"/></svg>;
  if (id === 'history') return <svg {...p}><path d="M3 7h18"/><path d="M7 3v4"/><path d="M17 3v4"/><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>;
  if (id === 'notifications') return <svg {...p}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 6-3 8h18c0-2-3-1-3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>;
  if (id === 'help') return <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 5.6 1.4c-.5.7-1.3 1.2-1.9 1.8-.6.5-.8.9-.8 1.8"/><path d="M12 17h.01"/></svg>;
  if (id === 'policy') return <svg {...p}><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>;
  if (id === 'terms') return <svg {...p}><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3z"/><path d="M8 20V7a3 3 0 0 1 3-3"/></svg>;
  if (id === 'about') return <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M12 10v6"/><path d="M12 7h.01"/></svg>;
  if (id === 'club') return <svg {...p}><path d="M12 17.5 5.8 21l1.2-6.9L2 9.3l7-1L12 2l3 6.3 7 1-5 4.8 1.2 6.9z"/></svg>;
  if (id === 'share') return <svg {...p}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.7 10.8 15.4 6.9"/><path d="M8.7 13.2 15.4 17.1"/></svg>;
  if (id === 'camera') return <svg {...p}><path d="M4 7h4l2-2h4l2 2h4v12H4z"/><circle cx="12" cy="13" r="3.5"/></svg>;
  if (id === 'logout') return <svg {...p}><path d="M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/><path d="M15 12H7"/><path d="m12 9 3 3-3 3"/><path d="M15 12h5"/></svg>;
  if (id === 'trash') return <svg {...p}><path d="M3 6h18"/><path d="M8 6V4h8v2"/><rect x="6" y="6" width="12" height="14" rx="2"/><path d="M10 10v6"/><path d="M14 10v6"/></svg>;
  if (id === 'mail') return <svg {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>;
  if (id === 'lock') return <svg {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
  if (id === 'wallet') return <svg {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 13a1 1 0 1 0 2 0 1 1 0 0 0-2 0"/></svg>;
  if (id === 'pin') return <svg {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
  if (id === 'users') return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if (id === 'plane') return <svg {...p}><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>;
  if (id === 'backpack') return <svg {...p}><path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M9 6V5a3 3 0 0 1 6 0v1"/><line x1="8" y1="14" x2="16" y2="14"/></svg>;
  if (id === 'flame') return <svg {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
  if (id === 'map') return <svg {...p}><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/></svg>;
  if (id === 'star') return <svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
  if (id === 'film') return <svg {...p}><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>;
  if (id === 'globe') return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
  if (id === 'leaf') return <svg {...p}><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>;
  if (id === 'suitcase') return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>;
  return <svg {...p}><circle cx="12" cy="12" r="9"/></svg>;
};

const GENDER_OPTIONS = [
  { id: 'male',              label: 'Male' },
  { id: 'female',            label: 'Female' },
  { id: 'non-binary',        label: 'Non-binary' },
  { id: 'prefer-not-to-say', label: 'Prefer not to say' },
];
const PROFILE_COUNTRIES = [
  'India','United States','United Kingdom','Canada','Australia','UAE','Singapore',
  'Germany','France','Japan','Thailand','Indonesia','Malaysia','Philippines',
  'Bangladesh','Nepal','Sri Lanka','Italy','Spain','Netherlands','Switzerland',
  'Sweden','Norway','New Zealand','South Africa','Brazil','Mexico','Turkey',
  'Egypt','Saudi Arabia','Qatar','South Korea','China','Vietnam','Other',
];

const withLogo = (text, h = 15) => {
  if (typeof text !== 'string' || !/TravelBae|TripBae/i.test(text)) return text;
  return text.split(/(TravelBae|TripBae)/gi).map((p, i) =>
    /^(TravelBae|TripBae)$/i.test(p) ? <TBLogo key={i} h={h} /> : p
  );
};
const BADGE_DEFS = [
  { id: 'early_bird',       name: 'Early Bird',       iconId: 'star',     desc: 'Joined the TravelBae crew',           check: () => true },
  { id: 'first_flight',     name: 'First Flight',     iconId: 'plane',    desc: 'Created your very first trip',         check: s => s.tripCount >= 1 },
  { id: 'group_leader',     name: 'Group Leader',     iconId: 'users',    desc: 'Set off on a group adventure',         check: s => s.groupCount >= 1 },
  { id: 'solo_voyager',     name: 'Solo Voyager',     iconId: 'backpack', desc: 'Embraced a solo journey',              check: s => s.soloCount >= 1 },
  { id: 'globe_trotter',    name: 'Globe Trotter',    iconId: 'globe',    desc: 'Visited 3+ different destinations',    check: s => s.uniqueDests >= 3, progress: s => `${Math.min(s.uniqueDests, 3)}/3` },
  { id: 'budget_pro',       name: 'Budget Pro',       iconId: 'wallet',   desc: 'Tracked expenses on 3+ trips',         check: s => s.tripsWithExpenses >= 3, progress: s => `${Math.min(s.tripsWithExpenses, 3)}/3` },
  { id: 'photographer',     name: 'Photographer',     iconId: 'camera',   desc: 'Uploaded 10+ trip photos',             check: s => s.photoCount >= 10, progress: s => `${Math.min(s.photoCount, 10)}/10` },
  { id: 'trail_blazer',     name: 'Trail Blazer',     iconId: 'flame',    desc: 'Completed 5+ trips',                   check: s => s.completedCount >= 5, progress: s => `${Math.min(s.completedCount, 5)}/5` },
  { id: 'social_butterfly', name: 'Social Butterfly', iconId: 'share',    desc: 'Saved 5+ trip contacts',               check: s => s.contactCount >= 5, progress: s => `${Math.min(s.contactCount, 5)}/5` },
  { id: 'master_planner',   name: 'Master Planner',   iconId: 'map',      desc: 'Built itineraries for 3+ trips',       check: s => s.itineraryCount >= 3, progress: s => `${Math.min(s.itineraryCount, 3)}/3` },
  { id: 'globe_elite',      name: 'Globe Elite',      iconId: 'globe',    desc: 'Visited 7+ destinations',              check: s => s.uniqueDests >= 7, progress: s => `${Math.min(s.uniqueDests, 7)}/7` },
  { id: 'shutterbug',       name: 'Shutterbug',       iconId: 'film',     desc: 'Uploaded 50+ trip photos',             check: s => s.photoCount >= 50, progress: s => `${Math.min(s.photoCount, 50)}/50` },
];

function computeProfileStats(trips) {
  const ts = trips || [];
  const dests = new Set();
  let photoCount = 0, contactCount = 0, soloCount = 0, groupCount = 0;
  let completedCount = 0, tripsWithExpenses = 0, itineraryCount = 0;
  ts.forEach(t => {
    if (t.destination) dests.add(t.destination.trim().toLowerCase());
    photoCount   += (t.photos   || []).length;
    contactCount += (t.contacts || []).length;
    if (t.isSolo) soloCount++; else groupCount++;
    if (t.completed) completedCount++;
    if ((t.expenses || []).length > 0) tripsWithExpenses++;
    if (t._cachedItin) itineraryCount++;
  });
  return {
    tripCount: ts.length,
    uniqueDests: dests.size,
    photoCount, contactCount,
    soloCount, groupCount,
    completedCount, tripsWithExpenses, itineraryCount,
  };
}

function ProfilePage({ profile, onSave, onClose, onLogout, onDeleteAccount, trips, userProfile, onUpdateProfile, onOpenOnboarding, onMarkActive, onDeleteTrip }) {
  const [view, setView] = useState('hub'); // 'hub' | 'badges' | 'stats' | 'history' | 'notifications' | 'support' | 'privacy' | 'help' | 'about'
  const [spanFilter, setSpanFilter] = useState('all'); 
  const [name, setName] = useState(profile.name || '');
  const [avatar, setAvatar] = useState(userProfile?.photoUrl || profile.avatar || null);
  const [editingName, setEditingName] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState('');
  const [rateModal, setRateModal] = useState(false);
  const [rateStars, setRateStars] = useState(() => {
    const saved = parseInt(localStorage.getItem('travelbae_rating') || '0', 10);
    return Number.isFinite(saved) ? saved : 0;
  });
  const [rateHover, setRateHover] = useState(0);
  const [editingProfile, setEditingProfile] = useState(false);
  const [editData, setEditData] = useState({});
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [prefs, setPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem('travelbae_prefs');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return {
      currency: 'INR',
      units: 'metric',
      notifications: true,
      notifTripReminders: true,
      notifGroupUpdates: true,
      notifTips: false,
    };
  });
  const fileRef = useRef(null);

  // Full currency list — code, symbol, name
  const CURRENCIES = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
    { code: 'LKR', symbol: 'Rs', name: 'Sri Lankan Rupee' },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
    { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee' },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
    { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
    { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  ];

  // Migrate legacy currency strings like "₹ INR" → "INR"
  useEffect(() => {
    if (prefs.currency && prefs.currency.length > 4) {
      const match = CURRENCIES.find(c => prefs.currency.includes(c.code));
      if (match) setPrefs(p => ({ ...p, currency: match.code }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currencyMeta = CURRENCIES.find(c => c.code === prefs.currency) || CURRENCIES[0];

  const stats = computeProfileStats(trips);
  const earned = BADGE_DEFS.filter(b => b.check(stats));
  const locked = BADGE_DEFS.filter(b => !b.check(stats));
  const earnedPct = Math.round((earned.length / BADGE_DEFS.length) * 100);

  const persist = (next) => {
    onSave(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  const savePrefs = (next) => {
    setPrefs(next);
    try { localStorage.setItem('travelbae_prefs', JSON.stringify(next)); } catch { /* ignore */ }
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  };

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        // Resize to canvas (used as fallback / preview)
        const MAX = 240;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL('image/jpeg', 0.85);
        // Optimistically show the base64 preview right away
        setAvatar(dataUrl);
        persist({ name, avatar: dataUrl });
        // Attempt ImageKit upload in background
        try {
          const auth = await imagekitAuth();
          const blob = await (await fetch(dataUrl)).blob();
          const safeFile = (file.name || 'avatar.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
          const fileName = `avatar_${Date.now()}_${safeFile}`;
          const form = new FormData();
          form.append('file', blob, fileName);
          form.append('fileName', fileName);
          form.append('folder', '/tb-avatars');
          form.append('useUniqueFileName', 'false');
          form.append('publicKey',  auth.publicKey);
          form.append('signature',  auth.signature);
          form.append('expire',     String(auth.expire));
          form.append('token',      auth.token);
          const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: form });
          const data = await res.json();
          if (data.url) {
            const ikUrl = data.url + '?tr=w-240,h-240,fo-face,q-85';
            setAvatar(ikUrl);
            persist({ name, avatar: ikUrl });
            // Persist to backend
            updateUserProfile({ photoUrl: ikUrl }).then(r => {
              if (onUpdateProfile && r?.userProfile) onUpdateProfile(r.userProfile);
            }).catch(() => {});
          }
        } catch {
          // IK upload failed — base64 preview stays, no issue
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const saveName = () => {
    const n = name.trim();
    if (!n) return;
    setEditingName(false);
    persist({ name: n, avatar });
  };

  const removeAvatar = () => {
    setAvatar(null);
    persist({ name, avatar: null });
    // Persist removal to backend
    updateUserProfile({ photoUrl: null }).then(r => {
      if (onUpdateProfile && r?.userProfile) onUpdateProfile(r.userProfile);
    }).catch(() => {});
  };

  const initials = (name || '?').trim().slice(0, 2).toUpperCase();

  // ── Derived stats for Travel Stats view ──
  const tripList = trips || [];
  const totalSpend = tripList.reduce((s, t) => s + (t.expenses || []).reduce((a, e) => a + (e.amount || 0), 0), 0);

  const destFreq = {};
  tripList.forEach(t => {
    if (t.destination) {
      const k = t.destination.trim();
      destFreq[k] = (destFreq[k] || 0) + 1;
    }
  });
  const topDests = Object.entries(destFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const totalTravelDays = tripList.reduce((sum, t) => {
    if (!t.arrival || !t.departure) return sum;
    try { return sum + tripDuration(t.arrival, t.departure); } catch { return sum; }
  }, 0);

  // Unique travel companions across all trips (excluding self)
  const selfKey = (name || '').trim().toLowerCase();
  const companionSet = new Set();
  tripList.forEach(t => {
    if (t.isSolo) return;
    (normalizeMembers(t.members) || []).forEach(m => {
      const key = (m || '').trim().toLowerCase();
      if (key && key !== selfKey) companionSet.add(key);
    });
  });
  const companionCount = companionSet.size;

  const fmtMoney = (n) => `${currencyMeta.symbol}${Math.round(n).toLocaleString('en-IN')}`;

  // ── Span-filtered trip list for Travel Stats ──
  const spanFilteredTrips = (() => {
    if (spanFilter === 'all') return tripList;
    const now = new Date();
    const cutoff = new Date(now);
    if (spanFilter === 'month')   cutoff.setMonth(now.getMonth() - 1);
    if (spanFilter === '6months') cutoff.setMonth(now.getMonth() - 6);
    if (spanFilter === 'year')    cutoff.setFullYear(now.getFullYear() - 1);
    return tripList.filter(t => {
      const d = t.arrival || t.departure || t.createdAt;
      if (!d) return false;
      return new Date(d) >= cutoff;
    });
  })();

  const spanStats       = computeProfileStats(spanFilteredTrips);
  const spanTotalSpend  = spanFilteredTrips.reduce((s, t) =>
    s + (t.expenses || []).reduce((a, e) => a + (e.amount || 0), 0), 0);
  const spanTravelDays  = spanFilteredTrips.reduce((sum, t) => {
    if (!t.arrival || !t.departure) return sum;
    try { return sum + tripDuration(t.arrival, t.departure); } catch { return sum; }
  }, 0);
  const spanDestFreq    = {};
  spanFilteredTrips.forEach(t => {
    if (t.destination) {
      const k = t.destination.trim();
      spanDestFreq[k] = (spanDestFreq[k] || 0) + 1;
    }
  });
  const spanTopDests = Object.entries(spanDestFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const handleShare = async () => {
    const shareData = {
      title: 'TravelBae',
      text: 'Plan trips, split expenses & explore together — try TravelBae with me!',
      url: window.location.origin,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        showToast('Link copied to clipboard');
      } else {
        showToast(shareData.url);
      }
    } catch { /* user cancelled */ }
  };

  const handleRate = () => {
    setRateHover(0);
    setRateModal(true);
  };

  const submitRating = (stars) => {
    if (!stars) return;
    setRateStars(stars);
    localStorage.setItem('travelbae_rating', String(stars));
    setRateModal(false);
    const msgs = {
      1: 'Thanks. We will improve this.',
      2: 'Feedback received. We are on it.',
      3: 'Thanks for rating TravelBae.',
      4: 'Great to hear you are enjoying it.',
      5: 'Amazing. Thanks for the support.',
    };
    showToast(msgs[stars] || 'Thanks for rating TravelBae.');
  };

  const handleFeedback = () => {
    window.location.href = 'mailto:feedback@travelbae.app?subject=TravelBae%20feedback';
  };

  const handleProfileSave = async () => {
    setProfileSaving(true); setProfileError('');
    try {
      await updateUserProfile({ ...editData, onboardingDone: true });
      if (onUpdateProfile) onUpdateProfile({ ...editData });
      setEditingProfile(false);
      showToast('Profile updated');
    } catch (err) {
      setProfileError(err.message || 'Could not save profile.');
    }
    setProfileSaving(false);
  };

  const titleByView = {
    hub: 'My Profile',
    profile: 'My Details',
    badges: 'Travel Badges',
    stats: 'Travel Stats',
    history: 'Past Trips',
    notifications: 'Notifications',
    support: 'TravelBae Club',
    privacy: 'Privacy & Safety',
    help: 'Help & Support',
    policy: 'Privacy Policy',
    terms: 'Terms of Service',
    about: 'About',
  };

  // Menu rendered in grouped sections
  const MENU_SECTIONS = [
    {
      title: 'Your travels',
      items: [
        { id: 'badges',  iconId: 'badge',   label: 'Badges',       sub: `${earned.length}/${BADGE_DEFS.length} earned · ${earnedPct}%`,                  accent: '#FF6A00', action: 'view' },
        { id: 'stats',   iconId: 'stats',   label: 'Travel Stats', sub: `${stats.uniqueDests} places · ${totalTravelDays} days`,                          accent: '#D85B00', action: 'view' },
        { id: 'history', iconId: 'history', label: 'Past Trips',   sub: `${stats.completedCount} completed trip${stats.completedCount === 1 ? '' : 's'}`, accent: '#B64C00', action: 'view' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { id: 'notifications', iconId: 'notifications', label: 'Notifications', sub: 'Trip reminders and updates', accent: '#FF7A1A', action: 'view' },
      ],
    },
    {
      title: 'Support',
      items: [
        { id: 'help',    iconId: 'help',  label: 'Help & Support',  sub: 'FAQs and contact the team',       accent: '#CC5600', action: 'view' },
        { id: 'support', iconId: 'club',  label: 'Rate & Feedback', sub: 'Share your rating and thoughts',  accent: '#FF6A00', action: 'view' },
        { id: 'share',   iconId: 'share', label: 'Share',           sub: 'Invite friends to plan together', accent: '#C05000', action: 'share' },
      ],
    },
    {
      title: 'Legal',
      items: [
        { id: 'policy', iconId: 'policy', label: 'Privacy policy',   sub: 'What we do and do not collect', accent: '#CC5600', action: 'view' },
        { id: 'terms',  iconId: 'terms',  label: 'Terms of service', sub: 'How we keep things fair',       accent: '#A74400', action: 'view' },
        { id: 'about',  iconId: 'about',  label: 'About',            sub: 'Our story and version info',    accent: '#E3670D', action: 'view' },
      ],
    },
  ];

  const handleMenuClick = (item) => {
    if (item.action === 'view')     setView(item.id);
    if (item.action === 'rate')     handleRate();
    if (item.action === 'share')    handleShare();
    if (item.action === 'feedback') handleFeedback();
  };

  const headerTitle = titleByView[view] || 'My Profile';
  const goBack = () => (view === 'hub' ? onClose() : setView('hub'));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at 14% 8%, #ffffff 0%, #fff9f3 34%, #fff4ea 100%)', zIndex: 620, overflowY: 'auto', fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @keyframes pfFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pfBadgePop { from { opacity: 0; transform: scale(.82); } to { opacity: 1; transform: scale(1); } }
        @keyframes pfSlideIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pfBgFloat { from { transform: scale(1.15) translateY(0px); } to { transform: scale(1.22) translateY(-8px); } }
        @keyframes pfItemIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .pf-badge { transition: transform .18s ease, box-shadow .18s ease; }
        .pf-badge:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(255,106,0,0.25); }
        .pf-badge-locked:hover { transform: translateY(-2px); }
        .pf-avatar-edit:hover { background: #D85B00 !important; }
        .pf-row { transition: background .12s ease, transform .1s ease; }
        .pf-row:hover { background: #FFF8F2 !important; }
        .pf-row:active { transform: scale(0.995); }
        .pf-section { animation: pfItemIn .28s ease-out both; }
        details summary::-webkit-details-marker { display: none; }
        details[open] summary .pf-faq-chevron { transform: rotate(90deg); }
      `}</style>

      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,106,0,0.14)', padding: '13px 1.25rem', paddingTop: 'calc(13px + env(safe-area-inset-top, 0px))', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
        <button style={{ ...S.btn, padding: '5px 8px', fontSize: 16 }} onClick={goBack}>←</button>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700 }}>{headerTitle}</div>
        {saved && <div style={{ marginLeft: 'auto', fontSize: 11, color: '#A74400', background: '#FFF0E4', border: '0.5px solid #FFC08F', borderRadius: 10, padding: '4px 10px', fontWeight: 600, animation: 'pfFadeIn .2s' }}>Saved</div>}
      </div>

      {/* Floating toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', left: '50%', transform: 'translateX(-50%)', background: '#1a1a18', color: '#fff', padding: '10px 16px', borderRadius: 22, fontSize: 13, fontWeight: 500, zIndex: 760, boxShadow: '0 8px 24px rgba(0,0,0,0.25)', animation: 'pfFadeIn .2s' }}>
          {toast}
        </div>
      )}

      {/* Rate TravelBae modal */}
      {rateModal && (
        <div
          onClick={() => setRateModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,18,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 700, padding: '1rem', animation: 'pfFadeIn .15s' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 22, padding: '1.75rem 1.5rem 1.5rem', width: '100%', maxWidth: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center', animation: 'pfSlideIn .2s ease-out', position: 'relative' }}
          >
            <button
              onClick={() => setRateModal(false)}
              aria-label="Close"
              style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, border: 'none', background: 'transparent', fontSize: 20, color: '#9a9a96', cursor: 'pointer', lineHeight: 1 }}
            >
              ×
            </button>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 700, color: '#1a1a18', marginBottom: 6 }}>
              Enjoying <TBLogo h={18} />?
            </div>
            <div style={{ fontSize: 13, color: '#6b6b68', marginBottom: 18, lineHeight: 1.5 }}>
              Tap a star to rate your experience.
            </div>
            <div
              onMouseLeave={() => setRateHover(0)}
              style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 18 }}
            >
              {[1, 2, 3, 4, 5].map(n => {
                const active = (rateHover || rateStars) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setRateHover(n)}
                    onFocus={() => setRateHover(n)}
                    onClick={() => submitRating(n)}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    style={{
                      width: 46, height: 46, border: 'none', background: 'transparent',
                      fontSize: 34, lineHeight: 1, cursor: 'pointer',
                      color: active ? '#F5B301' : '#E4E2D9',
                      transform: active ? 'scale(1.08)' : 'scale(1)',
                      transition: 'transform .12s, color .12s',
                      padding: 0,
                    }}
                  >
                    ★
                  </button>
                );
              })}
            </div>
            <div style={{ fontSize: 12, color: '#9a9a96', minHeight: 16, marginBottom: 16 }}>
              {(rateHover || rateStars)
                ? ['', 'Not great', 'Could be better', 'It’s okay', 'Pretty good!', 'Loved it!'][rateHover || rateStars]
                : (rateStars ? `You rated ${rateStars} stars` : 'Pick a rating')}
            </div>
            <button
              onClick={() => setRateModal(false)}
              style={{ width: '100%', padding: '11px', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.08)', background: '#fafaf6', color: '#6b6b68', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* ════════ HUB VIEW ════════ */}
      {view === 'hub' && (
        <div style={{ animation: 'pfFadeIn .25s ease-out' }}>
          {/* Identity card */}
          <div style={{ padding: '1.5rem 1.25rem 0' }}>
            <div style={{
              borderRadius: 22, padding: '1rem 1.25rem', textAlign: 'center', color: '#fff',
              position: 'relative', overflow: 'hidden',
              background: avatar ? 'transparent' : 'linear-gradient(135deg,#FF6A00,#E35E00)',
              boxShadow: avatar ? '0 10px 40px rgba(0,0,0,0.28)' : '0 10px 30px rgba(227,94,0,0.25)',
              minHeight: 158,
            }}>
              {/* Blurred avatar background */}
              {avatar && (
                <>
                  <img
                    src={avatar}
                    alt=""
                    style={{
                      position: 'absolute', inset: 0, width: '100%', height: '100%',
                      objectFit: 'cover', filter: 'blur(22px) brightness(0.55) saturate(1.3)',
                      transform: 'scale(1.15)',
                      zIndex: 0, pointerEvents: 'none',
                      animation: 'pfBgFloat 8s ease-in-out infinite alternate',
                    }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg,rgba(0,0,0,0.18) 0%,rgba(0,0,0,0.45) 100%)', zIndex: 0, pointerEvents: 'none', borderRadius: 22 }} />
                </>
              )}
              {!avatar && (
                <>
                  <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                  <div style={{ position: 'absolute', bottom: -50, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                </>
              )}

              {/* Avatar ring */}
              <div style={{ position: 'relative', zIndex: 2, display: 'inline-block', marginBottom: 14 }}>
                <div style={{
                  width: 84, height: 84, borderRadius: '50%',
                  background: avatar ? `url(${avatar}) center/cover` : 'rgba(255,255,255,0.18)',
                  border: avatar ? '3px solid rgba(255,255,255,0.6)' : '3px solid rgba(255,255,255,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 700, fontFamily: "'Sora',sans-serif", color: '#fff',
                  boxShadow: avatar ? '0 8px 32px rgba(0,0,0,0.35), 0 0 0 5px rgba(255,255,255,0.12)' : '0 8px 24px rgba(0,0,0,0.15)',
                }}>
                  {!avatar && initials}
                </div>
                <button
                  type="button"
                  className="pf-avatar-edit"
                  onClick={() => fileRef.current?.click()}
                  style={{ position: 'absolute', bottom: 2, right: 2, width: 34, height: 34, borderRadius: '50%', background: AC, border: '2.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: '#fff', transition: 'all .15s', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                  title="Upload photo"
                >
                  <DrawerIcon id="camera" size={14} color="#fff" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarPick} />
              </div>

              {avatar && (
                <div style={{ marginBottom: 10, position: 'relative', zIndex: 2 }}>
                  <button onClick={removeAvatar} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, border: '0.5px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Remove photo</button>
                </div>
              )}

              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px', textShadow: avatar ? '0 1px 8px rgba(0,0,0,0.5)' : 'none' }}>
                  {name || 'Traveller'}
                </div>
                <div style={{ fontSize: 11.5, opacity: 0.82, marginTop: 4 }}>
                  {stats.tripCount} trip{stats.tripCount === 1 ? '' : 's'} · {stats.uniqueDests} destination{stats.uniqueDests === 1 ? '' : 's'}
                </div>
                <div style={{ marginTop: 10 }}>
                  <button
                    onClick={() => setView('profile')}
                    style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.92)', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 20, padding: '5px 20px', cursor: 'pointer', letterSpacing: 0.3, backdropFilter: 'blur(8px)', transition: 'background .15s' }}
                  >
                    View profile
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick stats strip */}
          <div style={{ padding: '1rem 1.25rem 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'Trips',  val: stats.tripCount },
              { label: 'Places', val: stats.uniqueDests },
              { label: 'Photos', val: stats.photoCount },
              { label: 'Badges', val: earned.length },
            ].map(s => (
              <div key={s.label} style={{ background: 'linear-gradient(180deg,#ffffff,#fafaf7)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 13, padding: '10px 6px', textAlign: 'center', boxShadow: '0 4px 14px rgba(0,0,0,0.035)' }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, color: '#1a1a18' }}>{s.val}</div>
                <div style={{ fontSize: 10, color: '#6b6b68', textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Menu list — grouped sections */}
          {MENU_SECTIONS.map(section => (
            <div key={section.title} style={{ padding: '1.25rem 1.25rem 0' }}>
              <div style={{ fontSize: 11, color: '#6b6b68', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>
                {withLogo(section.title, 11)}
              </div>
              <div style={{ background: 'linear-gradient(180deg,#ffffff,#fbfbf8)', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.045)' }}>
                {section.items.map((m, idx) => (
                  <button
                    key={m.id}
                    className="pf-row"
                    onClick={() => handleMenuClick(m)}
                    style={{
                      width: '100%', background: '#fff', border: 'none',
                      borderTop: idx === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.06)',
                      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
                      cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans',sans-serif",
                      transition: 'background .15s, transform .1s',
                    }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: AC_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <DrawerIcon id={m.iconId} size={18} color={m.accent} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>{withLogo(m.label)}</div>
                      <div style={{ fontSize: 11.5, color: '#6b6b68', marginTop: 2 }}>{m.sub}</div>
                    </div>
                    <div style={{ fontSize: 18, color: '#c8c6c0', flexShrink: 0 }}>
                      {m.action === 'share' ? '↗' : '›'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Log out + Delete account */}
          {(onLogout || onDeleteAccount) && (
            <div style={{ padding: '1rem 1.25rem 0.5rem', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {onLogout && (
                <button
                  onClick={onLogout}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 14,
                    border: '1px solid rgba(255,106,0,0.28)', background: '#fff', color: AC,
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'background .15s',
                  }}
                >
                  <DrawerIcon id="logout" size={14} color={AC} />
                  <span>Log out</span>
                </button>
              )}
              {onDeleteAccount && (
                <button
                  onClick={onDeleteAccount}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 14,
                    border: '1px solid rgba(255,106,0,0.38)', background: AC, color: '#fff',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'opacity .15s',
                  }}
                >
                  <DrawerIcon id="trash" size={14} color="#fff" />
                  <span>Delete account</span>
                </button>
              )}
              <div style={{ fontSize: 11, color: '#9a9a96', textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>
                Deleting your account permanently wipes your profile and any trips where you're the only member.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ PROFILE DETAILS VIEW ════════ */}
      {view === 'profile' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem', paddingBottom: '2.5rem' }}>

          {/* Mini hero */}
          <div style={{
            borderRadius: 22, padding: '1.25rem 1.25rem 1.25rem', color: '#fff',
            textAlign: 'center', marginBottom: '1.25rem',
            position: 'relative', overflow: 'hidden',
            background: avatar ? 'transparent' : `linear-gradient(135deg,${AC} 0%,#D85B00 100%)`,
            boxShadow: `0 12px 36px rgba(255,106,0,0.2)`,
            minHeight: 140,
          }}>
            {avatar && (
              <>
                <img src={avatar} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(22px) brightness(0.48) saturate(1.4)', transform: 'scale(1.15)', zIndex: 0, pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg,rgba(0,0,0,0.12) 0%,rgba(0,0,0,0.48) 100%)', zIndex: 0, borderRadius: 22 }} />
              </>
            )}
            {!avatar && (
              <>
                <div style={{ position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: -30, left: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
              </>
            )}
            <div style={{ position: 'relative', zIndex: 1 }}>
              {avatar
                ? <div style={{ width: 76, height: 76, borderRadius: '50%', background: `url(${avatar}) center/cover`, margin: '0 auto 14px', border: '3px solid rgba(255,255,255,0.55)', boxShadow: '0 6px 22px rgba(0,0,0,0.28)' }} />
                : <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 700, color: '#fff', border: '3px solid rgba(255,255,255,0.3)' }}>{initials}</div>
              }
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 21, fontWeight: 700, letterSpacing: '-0.3px' }}>{name || 'Traveller'}</div>
              <div style={{ fontSize: 12, opacity: 0.68, marginTop: 5 }}>
                {stats.tripCount} trip{stats.tripCount !== 1 ? 's' : ''} · {stats.uniqueDests} destination{stats.uniqueDests !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <style>{`
            .pf-edit-input { width:100%; box-sizing:border-box; border:1.5px solid #EBE8E2; border-radius:12px; padding:11px 14px; font-size:14px; color:#1a1a18; font-family:'DM Sans',sans-serif; background:#fff; outline:none; transition:border-color .18s,box-shadow .18s; -webkit-appearance:none; appearance:none; }
            .pf-edit-input:focus { border-color:${AC}; box-shadow:0 0 0 3px rgba(255,106,0,0.1); }
            .pf-edit-input::placeholder { color:#C8C5BC; }
          `}</style>

          {editingProfile ? (
            <div style={{ animation: 'pfFadeIn .2s' }}>
              {/* Personal */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>Personal</div>
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
                  {[
                    { field: 'displayName', label: 'Full name', placeholder: 'Your name', type: 'text' },
                    { field: 'dateOfBirth', label: 'Date of birth', placeholder: '', type: 'date' },
                  ].map((f, idx) => (
                    <div key={f.field} style={{ padding: '12px 16px', borderBottom: idx === 0 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{f.label}</div>
                      <input className="pf-edit-input" type={f.type} value={editData[f.field] || ''} onChange={e => setEditData(d => ({ ...d, [f.field]: e.target.value }))} placeholder={f.placeholder} max={f.type === 'date' ? new Date().toISOString().split('T')[0] : undefined} />
                    </div>
                  ))}
                  <div style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Gender</div>
                    <select className="pf-edit-input" value={editData.gender || ''} onChange={e => setEditData(d => ({ ...d, gender: e.target.value }))}>
                      <option value="">Select gender</option>
                      {GENDER_OPTIONS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>Location</div>
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Hometown</div>
                    <input className="pf-edit-input" value={editData.hometown || ''} onChange={e => setEditData(d => ({ ...d, hometown: e.target.value }))} placeholder="Your city" />
                  </div>
                  <div style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Country</div>
                    <select className="pf-edit-input" value={editData.country || ''} onChange={e => setEditData(d => ({ ...d, country: e.target.value }))}>
                      <option value="">Select country</option>
                      {PROFILE_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Emergency */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>Emergency contact</div>
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
                  {[
                    { field: 'emergencyName',     label: 'Contact name', placeholder: 'Full name', type: 'text' },
                    { field: 'emergencyRelation',  label: 'Relation',     placeholder: 'e.g. Parent, Spouse', type: 'text' },
                    { field: 'emergencyPhone',     label: 'Emergency phone', placeholder: '+91 …', type: 'tel' },
                    { field: 'phone',              label: 'Your phone',   placeholder: '+91 …', type: 'tel' },
                  ].map((f, idx, arr) => (
                    <div key={f.field} style={{ padding: '12px 16px', borderBottom: idx < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{f.label}</div>
                      <input className="pf-edit-input" type={f.type} value={editData[f.field] || ''} onChange={e => setEditData(d => ({ ...d, [f.field]: e.target.value }))} placeholder={f.placeholder} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Health */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>Health</div>
                <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Blood group</div>
                    <input className="pf-edit-input" value={editData.bloodGroup || ''} onChange={e => setEditData(d => ({ ...d, bloodGroup: e.target.value }))} placeholder="e.g. A+, O−" />
                  </div>
                  <div style={{ padding: '12px 16px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Medical notes</div>
                    <textarea className="pf-edit-input" rows={3} value={editData.medicalNotes || ''} onChange={e => setEditData(d => ({ ...d, medicalNotes: e.target.value }))} placeholder="Allergies, conditions, medications…" style={{ resize: 'vertical', lineHeight: 1.5 }} />
                  </div>
                </div>
              </div>

              {profileError && <div style={{ fontSize: 12, color: '#993C1D', textAlign: 'center', marginBottom: 12 }}>{profileError}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setEditingProfile(false); setProfileError(''); }} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '0.5px solid rgba(0,0,0,0.12)', background: '#fff', color: '#6b6b68', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Cancel</button>
                <button onClick={handleProfileSave} disabled={profileSaving} style={{ flex: 2, padding: '13px', borderRadius: 14, border: 'none', background: profileSaving ? '#EBE8E2' : `linear-gradient(135deg,${AC},#D85B00)`, color: profileSaving ? '#bbb' : '#fff', fontSize: 14, fontWeight: 700, cursor: profileSaving ? 'default' : 'pointer', fontFamily: "'DM Sans',sans-serif", boxShadow: profileSaving ? 'none' : '0 4px 16px rgba(255,106,0,0.28)', transition: 'all .18s' }}>
                  {profileSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {userProfile ? (
                <>
                  {/* Personal */}
                  {(userProfile.dateOfBirth || userProfile.gender) && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>Personal</div>
                      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
                        {[
                          userProfile.dateOfBirth ? { iconId: 'history', label: 'Date of birth', value: (() => { try { const d = new Date(userProfile.dateOfBirth); const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000)); return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · ${age} yrs`; } catch { return userProfile.dateOfBirth; } })() } : null,
                          userProfile.gender ? { iconId: 'about', label: 'Gender', value: userProfile.gender.charAt(0).toUpperCase() + userProfile.gender.slice(1).replace(/-/g, ' ') } : null,
                        ].filter(Boolean).map((row, i, arr) => (
                          <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: AC_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><DrawerIcon id={row.iconId} size={16} color={AC} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>{row.label}</div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>{row.value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Location */}
                  {(userProfile.hometown || userProfile.country) && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>Location</div>
                      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px' }}>
                          <div style={{ width: 34, height: 34, borderRadius: 10, background: AC_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><DrawerIcon id="pin" size={16} color={AC} /></div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>From</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>{[userProfile.hometown, userProfile.country].filter(Boolean).join(', ')}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Emergency */}
                  {(userProfile.emergencyName || userProfile.phone) && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>Emergency</div>
                      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
                        {[
                          userProfile.emergencyName ? { iconId: 'users', label: 'Contact', value: `${userProfile.emergencyName}${userProfile.emergencyRelation ? ` · ${userProfile.emergencyRelation}` : ''}` } : null,
                          userProfile.emergencyPhone ? { iconId: 'notifications', label: 'Emergency phone', value: userProfile.emergencyPhone } : null,
                          userProfile.phone ? { iconId: 'mail', label: 'Your phone', value: userProfile.phone } : null,
                        ].filter(Boolean).map((row, i, arr) => (
                          <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: AC_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><DrawerIcon id={row.iconId} size={16} color={AC} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>{row.label}</div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>{row.value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Health */}
                  {(userProfile.bloodGroup || userProfile.medicalNotes) && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 2 }}>Health</div>
                      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.04)' }}>
                        {[
                          userProfile.bloodGroup ? { iconId: 'flame', label: 'Blood group', value: userProfile.bloodGroup } : null,
                          userProfile.medicalNotes ? { iconId: 'help', label: 'Medical notes', value: userProfile.medicalNotes } : null,
                        ].filter(Boolean).map((row, i, arr) => (
                          <div key={row.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: AC_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><DrawerIcon id={row.iconId} size={16} color={AC} /></div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9a96', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>{row.label}</div>
                              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18', lineHeight: 1.5 }}>{row.value}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Empty state */}
                  {!userProfile.dateOfBirth && !userProfile.gender && !userProfile.hometown && !userProfile.country && !userProfile.emergencyName && !userProfile.bloodGroup && (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem 1.25rem', color: '#9a9a96' }}>
                      <div style={{ width: 52, height: 52, background: AC_SOFT, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <DrawerIcon id="about" size={26} color={AC} />
                      </div>
                      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 600, color: '#1a1a18', marginBottom: 4 }}>Nothing filled in yet</div>
                      <div style={{ fontSize: 13, lineHeight: 1.55 }}>Tap Edit profile to add your details.</div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem 1.25rem' }}>
                  <div style={{ width: 56, height: 56, background: AC_SOFT, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <DrawerIcon id="star" size={28} color={AC} />
                  </div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, color: '#1a1a18', marginBottom: 6 }}>Set up your profile</div>
                  <div style={{ fontSize: 13, color: '#6b6b68', lineHeight: 1.6, maxWidth: 260, margin: '0 auto 6px' }}>
                    Add personal details, emergency contacts and health info.
                  </div>
                </div>
              )}
              {/* Edit button — always shown in read mode */}
              <button
                onClick={() => { setEditingProfile(true); setEditData({ ...(userProfile || {}) }); setProfileError(''); }}
                style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg,${AC},#D85B00)`, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", boxShadow: '0 6px 20px rgba(255,106,0,0.3)', transition: 'opacity .15s', marginTop: 4 }}
              >
                {userProfile ? 'Edit profile' : 'Get started'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ════════ BADGES VIEW ════════ */}
      {view === 'badges' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out' }}>
          <div style={{ padding: '1.25rem 1.25rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: AC_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DrawerIcon id="badge" size={17} color={AC} />
              </div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, color: '#1a1a18' }}>Travel Badges</div>
            </div>
            <div style={{ fontSize: 12, color: '#6b6b68' }}>{earned.length}/{BADGE_DEFS.length} · {earnedPct}%</div>
          </div>
          <div style={{ padding: '0 1.25rem' }}>
            <div style={{ height: 5, background: '#EDE9E0', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${earnedPct}%`, height: '100%', background: `linear-gradient(90deg,${AC},#D85B00)`, transition: 'width .5s ease' }} />
            </div>
          </div>

          {earned.length > 0 && (
            <>
              <div style={{ padding: '1.25rem 1.25rem 0.5rem', fontSize: 11, color: AC, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Earned</div>
              <div style={{ padding: '0 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                {earned.map((b, i) => (
                  <div key={b.id} className="pf-badge" style={{
                    background: 'linear-gradient(145deg,#fff,#FFF4EA)',
                    border: '0.5px solid rgba(255,106,0,0.22)',
                    borderRadius: 14, padding: '14px 10px', textAlign: 'center',
                    cursor: 'default',
                    animation: `pfBadgePop .3s ease-out ${i * 0.04}s both`,
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 9, fontWeight: 700, color: AC, background: AC_SOFT, padding: '2px 6px', borderRadius: 6, letterSpacing: 0.3 }}>earned</div>
                    <div style={{ width: 44, height: 44, background: AC_SOFT, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                      <DrawerIcon id={b.iconId} size={22} color={AC} />
                    </div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: '#1a1a18', marginBottom: 3 }}>{b.name}</div>
                    <div style={{ fontSize: 10.5, color: '#6b6b68', lineHeight: 1.4 }}>{b.desc}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {locked.length > 0 && (
            <>
              <div style={{ padding: '1.5rem 1.25rem 0.5rem', fontSize: 11, color: '#6b6b68', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>In progress</div>
              <div style={{ padding: '0 1.25rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                {locked.map(b => (
                  <div key={b.id} className="pf-badge-locked" style={{
                    background: '#fff', border: '0.5px dashed rgba(0,0,0,0.12)',
                    borderRadius: 14, padding: '14px 10px', textAlign: 'center',
                    transition: 'all .18s', opacity: 0.7, position: 'relative',
                  }}>
                    <div style={{ width: 44, height: 44, background: '#F5F3F0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                      <DrawerIcon id={b.iconId} size={22} color="#C0B8AF" />
                    </div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: '#6b6b68', marginBottom: 3 }}>{b.name}</div>
                    <div style={{ fontSize: 10.5, color: '#9a9a96', lineHeight: 1.4 }}>{b.desc}</div>
                    {b.progress && (
                      <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: AC, background: AC_SOFT, borderRadius: 8, padding: '2px 8px', display: 'inline-block' }}>
                        {b.progress(stats)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════ TRAVEL STATS VIEW ════════ */}
      {view === 'stats' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem' }}>

          {/* ── Span filter pills ── */}
          <div style={{
            display: 'flex', gap: 8, marginBottom: '1.25rem',
            background: 'rgba(0,0,0,0.04)', borderRadius: 14, padding: 4,
          }}>
            {[
              { id: 'month',   label: '1 Month' },
              { id: '6months', label: '6 Months' },
              { id: 'year',    label: '1 Year' },
              { id: 'all',     label: 'All Time' },
            ].map(opt => {
              const active = spanFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setSpanFilter(opt.id)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none',
                    background: active ? AC : 'transparent',
                    color: active ? '#fff' : '#6b6b68',
                    fontSize: 12, fontWeight: active ? 700 : 500,
                    cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                    transition: 'all .18s',
                    boxShadow: active ? '0 3px 10px rgba(255,106,0,0.25)' : 'none',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* ── Summary cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {[
              { iconId: 'suitcase', label: 'Trips',        val: spanStats.tripCount },
              { iconId: 'pin',      label: 'Destinations', val: spanStats.uniqueDests },
              { iconId: 'history',  label: 'Travel Days',  val: spanTravelDays },
              { iconId: 'wallet',   label: 'Total Spent',  val: fmtMoney(spanTotalSpend) },
              { iconId: 'users',    label: 'Group Trips',  val: spanStats.groupCount },
              { iconId: 'backpack', label: 'Solo Trips',   val: spanStats.soloCount },
            ].map(s => (
              <div key={s.label} style={{
                background: '#fff',
                border: '0.5px solid rgba(0,0,0,0.08)',
                borderRadius: 14, padding: '14px 16px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              }}>
                <div style={{ width: 32, height: 32, background: AC_SOFT, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <DrawerIcon id={s.iconId} size={16} color={AC} />
                </div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, color: '#1a1a18' }}>{s.val}</div>
                <div style={{ fontSize: 11, color: '#6b6b68', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Top destinations ── */}
          {spanTopDests.length > 0 && (
            <div style={{
              background: 'linear-gradient(160deg,#ffffff,#fafaf7)',
              border: '0.5px solid rgba(0,0,0,0.08)',
              borderRadius: 14, padding: '14px 16px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: '#1a1a18', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <DrawerIcon id="pin" size={14} color={AC} />
                Top Destinations
              </div>
              {spanTopDests.map(([dest, count], i) => {
                const pct = Math.round((count / spanFilteredTrips.length) * 100);
                return (
                  <div key={dest} style={{ marginBottom: i < spanTopDests.length - 1 ? 10 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>{dest}</div>
                      <div style={{ fontSize: 12, color: '#6b6b68' }}>{count} trip{count > 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 99,
                        width: `${pct}%`,
                        background: `linear-gradient(90deg,${AC},#D85B00)`,
                        transition: 'width .4s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {spanFilteredTrips.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#9a9a96' }}>
              <div style={{ width: 48, height: 48, background: AC_SOFT, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <DrawerIcon id="map" size={24} color={AC} />
              </div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 600, color: '#1a1a18', marginBottom: 6 }}>
                No trips in this period
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                Try a wider time range or start planning your next adventure!
              </div>
            </div>
          )}
        
        </div>
      )}

      {/* ════════ PAST TRIPS VIEW ════════ */}
      {view === 'history' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem' }}>
          {(() => {
            const pastList = tripList.filter(t => t.completed);
            return pastList.length === 0 ? (
              <div style={{ background: '#fff', border: '0.5px dashed rgba(255,106,0,0.2)', borderRadius: 14, padding: '2rem 1rem', textAlign: 'center', color: '#6b6b68' }}>
                <div style={{ width: 52, height: 52, background: AC_SOFT, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <DrawerIcon id="suitcase" size={26} color={AC} />
                </div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>No past trips yet</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Mark a trip as completed and it will appear here.</div>
              </div>
            ) : (
              pastList.map(t => {
                const spend = (t.expenses || []).reduce((a, e) => a + (e.amount || 0), 0);
                const dateRange = (t.arrival && t.departure) ? formatDateRange(t.arrival, t.departure) : null;
                return (
                  <div key={t.id} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, padding: '12px 14px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.groupName || 'Untitled trip'}</div>
                          {t.isSolo && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#EEEDFE', color: '#534AB7', flexShrink: 0 }}>SOLO</span>}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#6b6b68', marginTop: 3 }}>
                          {t.destination && <span>{t.destination}</span>}
                          {dateRange && <span style={{ color: '#9a9a96' }}> · {dateRange}</span>}
                          {spend > 0 && <span> · {currencyMeta.symbol}{Math.round(spend).toLocaleString('en-IN')}</span>}
                          {(t.photos || []).length > 0 && <span> · {(t.photos || []).length} photos</span>}
                        </div>
                      </div>
                    </div>
                    {(onMarkActive || onDeleteTrip) && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                        {onMarkActive && (
                          <button
                            onClick={() => onMarkActive(t.id)}
                            style={{ fontSize: 11, padding: '5px 12px', borderRadius: 10, border: `1px solid rgba(255,106,0,0.28)`, background: AC_SOFT, color: AC, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>
                            Restore
                          </button>
                        )}
                        {onDeleteTrip && (
                          <button
                            onClick={() => onDeleteTrip(t.id)}
                            style={{ fontSize: 11, padding: '5px 12px', borderRadius: 10, border: '1px solid #F5C4B3', background: '#FAECE7', color: '#993C1D', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            );
          })()}
        </div>
      )}

      {/* ════════ NOTIFICATIONS VIEW ════════ */}
      {view === 'notifications' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem' }}>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>All notifications</div>
                <div style={{ fontSize: 11.5, color: '#6b6b68', marginTop: 2 }}>Master switch for all alerts</div>
              </div>
              <button
                onClick={() => savePrefs({ ...prefs, notifications: !prefs.notifications })}
                style={{ width: 44, height: 26, borderRadius: 14, border: 'none', cursor: 'pointer', background: prefs.notifications ? AC : '#d1cfc8', position: 'relative', transition: 'background .2s', flexShrink: 0 }}
              >
                <div style={{ position: 'absolute', top: 3, left: prefs.notifications ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left .2s' }} />
              </button>
            </div>
          </div>

          <div style={{ fontSize: 11, color: '#6b6b68', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', margin: '4px 0 8px 4px' }}>Categories</div>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, overflow: 'hidden', opacity: prefs.notifications ? 1 : 0.45, pointerEvents: prefs.notifications ? 'auto' : 'none', transition: 'opacity .2s' }}>
            {[
              { key: 'notifTripReminders', iconId: 'history', label: 'Trip reminders',     sub: 'Upcoming arrivals, departures and itinerary' },
              { key: 'notifGroupUpdates',  iconId: 'club',    label: 'Group updates',      sub: 'Expenses, contacts and photos added by mates' },
              { key: 'notifTips',          iconId: 'help',    label: 'Tips & inspiration', sub: 'Occasional travel ideas, never spammy' },
            ].map((row, idx) => (
              <div key={row.key} style={{ padding: '14px 16px', borderTop: idx === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 22, display: 'flex', justifyContent: 'center' }}><DrawerIcon id={row.iconId} size={16} color={AC} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>{row.label}</div>
                  <div style={{ fontSize: 11, color: '#6b6b68', marginTop: 1 }}>{row.sub}</div>
                </div>
                <button
                  onClick={() => savePrefs({ ...prefs, [row.key]: !prefs[row.key] })}
                  style={{ width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: prefs[row.key] ? AC : '#d1cfc8', position: 'relative', transition: 'background .2s', flexShrink: 0 }}
                >
                  <div style={{ position: 'absolute', top: 3, left: prefs[row.key] ? 19 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left .2s' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════ SUPPORT VIEW ════════ */}
      {view === 'support' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem' }}>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
            <button onClick={handleRate} className="pf-row" style={{ width: '100%', background: '#fff', border: 'none', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans',sans-serif" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: AC_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DrawerIcon id="club" size={18} color={AC} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>Rate TravelBae</div>
                <div style={{ fontSize: 11.5, color: '#6b6b68', marginTop: 2 }}>{rateStars ? `Current rating: ${rateStars}/5` : 'Tap to add your rating'}</div>
              </div>
              <div style={{ fontSize: 18, color: '#c8c6c0' }}>›</div>
            </button>

            <button onClick={handleFeedback} className="pf-row" style={{ width: '100%', background: '#fff', border: 'none', borderTop: '0.5px solid rgba(0,0,0,0.06)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans',sans-serif" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: AC_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DrawerIcon id="mail" size={18} color={AC} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>Send feedback</div>
                <div style={{ fontSize: 11.5, color: '#6b6b68', marginTop: 2 }}>Tell us what to improve next</div>
              </div>
              <div style={{ fontSize: 18, color: '#c8c6c0' }}>›</div>
            </button>
          </div>
        </div>
      )}

      {/* ════════ CURRENCY VIEW ════════ */}
      {view === 'currency' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem' }}>
          <div style={{ background: 'linear-gradient(135deg,#FFF3EB,#FFF7F0)', border: '0.5px solid rgba(255,106,0,0.3)', borderRadius: 14, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', border: '0.5px solid rgba(255,106,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontFamily: "'Sora',sans-serif", fontWeight: 700, color: '#FF8C3A' }}>{currencyMeta.symbol}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: '#FF8C3A' }}>Currently using {currencyMeta.code}</div>
              <div style={{ fontSize: 11.5, color: '#FF8C3A', opacity: 0.85, marginTop: 2 }}>{currencyMeta.name}</div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, overflow: 'hidden' }}>
            {CURRENCIES.map((c, idx) => {
              const active = prefs.currency === c.code;
              return (
                <button
                  key={c.code}
                  className="pf-row"
                  onClick={() => savePrefs({ ...prefs, currency: c.code })}
                  style={{
                    width: '100%', background: active ? '#FFF7F0' : '#fff', border: 'none',
                    borderTop: idx === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.06)',
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans',sans-serif",
                    transition: 'background .15s',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? '#FF6A00' : '#F1EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, fontFamily: "'Sora',sans-serif", color: active ? '#fff' : '#1a1a18', flexShrink: 0 }}>
                    {c.symbol}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 600, color: '#1a1a18' }}>{c.code}</div>
                    <div style={{ fontSize: 11.5, color: '#6b6b68', marginTop: 1 }}>{c.name}</div>
                  </div>
                  {active && <div style={{ fontSize: 14, color: '#FF6A00', fontWeight: 700 }}>✓</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════ HELP VIEW ════════ */}
      {view === 'help' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem' }}>
          <div style={{ fontSize: 11, color: '#6b6b68', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', margin: '0 0 8px 4px' }}>Frequently asked</div>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
            {[
              { q: 'How does expense splitting work?',     a: 'Add an expense, pick who paid and how to split. We crunch the balances and show who owes whom — settle anytime.' },
              { q: 'Are my photos private?',                a: 'Yes. Photos are end-to-end encrypted and only visible to you and your trip mates. We never share or train on them.' },
              { q: 'Can I edit a trip after creating it?',  a: 'Tap the menu inside any trip → Edit Trip. You can change dates, budget, destination, or members.' },
              { q: 'How do I invite friends to a trip?',    a: 'Open a group trip → tap the share code at the top → send it to friends. They join with that code + a nickname.' },
              { q: 'What happens if I delete a trip?',      a: 'Everything tied to the trip — expenses, contacts, photos, itinerary — is permanently removed. This cannot be undone.' },
            ].map((it, idx) => (
              <details key={it.q} style={{ padding: '12px 16px', borderTop: idx === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.06)' }}>
                <summary style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="pf-faq-chevron" style={{ color: AC, fontWeight: 700, display: 'inline-block', transition: 'transform .2s' }}>›</span> {it.q}
                </summary>
                <div style={{ fontSize: 12, color: '#6b6b68', lineHeight: 1.55, marginTop: 8, paddingLeft: 16 }}>{it.a}</div>
              </details>
            ))}
          </div>

          <div style={{ fontSize: 11, color: '#6b6b68', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', margin: '0 0 8px 4px' }}>Contact us</div>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, overflow: 'hidden' }}>
            <a href="mailto:support@travelbae.app" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ width: 34, height: 34, background: AC_SOFT, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DrawerIcon id="mail" size={16} color={AC} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>Email support</div>
                <div style={{ fontSize: 11, color: '#6b6b68', marginTop: 1 }}>support@travelbae.app — usually replies within a day</div>
              </div>
              <div style={{ fontSize: 14, color: '#c8c6c0' }}>↗</div>
            </a>
          </div>
        </div>
      )}

      {/* ════════ PRIVACY VIEW ════════ */}
      {view === 'privacy' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem' }}>
          <div style={{ background: 'linear-gradient(135deg,#FFF4EA,#fff)', border: '0.5px solid rgba(255,106,0,0.22)', borderRadius: 14, padding: '14px 16px', marginBottom: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 34, height: 34, background: AC_SOFT, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DrawerIcon id="lock" size={16} color={AC} />
            </div>
            <div style={{ fontSize: 12.5, color: '#1a1a18', lineHeight: 1.55 }}>
              Your photos, expenses and trip data are <strong>end-to-end encrypted</strong> and visible only to you and your trip mates. We never share, sell, or use your content to train any models.
            </div>
          </div>
          {[
            { iconId: 'camera',  title: 'Photos',              body: 'Stored encrypted in your private trip bucket. Only your trip mates can view them.' },
            { iconId: 'wallet',  title: 'Expenses & contacts', body: 'Synced privately to your account. Visible only inside the specific trip.' },
            { iconId: 'pin',     title: 'Location',            body: 'We never track your real-time location. Destinations come from what you type.' },
            { iconId: 'trash',   title: 'Right to delete',     body: 'Delete a trip and all its photos, expenses and contacts disappear permanently.' },
          ].map(it => (
            <div key={it.title} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '12px 14px', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 34, height: 34, background: AC_SOFT, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <DrawerIcon id={it.iconId} size={16} color={AC} />
              </div>
              <div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 600, color: '#1a1a18', marginBottom: 3 }}>{it.title}</div>
                <div style={{ fontSize: 11.5, color: '#6b6b68', lineHeight: 1.5 }}>{it.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════ PRIVACY POLICY VIEW ════════ */}
      {view === 'policy' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem', maxWidth: 680 }}>
          <div style={{ fontSize: 11, color: '#6b6b68', marginBottom: 14 }}>Last updated · May 2026</div>
          {[
            { h: 'What we collect',  p: 'Only what you give us: your name, email, trip details, expenses, contacts, photos and itinerary notes. Nothing else.' },
            { h: 'How we use it',    p: 'Strictly to make TravelBae work — render your trips, sync them across devices, and let your trip mates see shared data. We do not run analytics on your trip content.' },
            { h: 'What we never do', p: 'We never sell your data, share it with advertisers, or use your photos, expenses, or messages to train any AI model — ours or anyone else\'s.' },
            { h: 'Encryption',       p: 'All trip data is encrypted in transit. Photos sit in your private storage bucket, accessible only to you and the trip mates you invited.' },
            { h: 'Your rights',      p: 'Edit or delete anything anytime. Deleting a trip permanently removes its expenses, contacts, photos and itinerary. Deleting your account wipes everything we have on you.' },
            { h: 'Cookies',          p: 'We use a single auth token in localStorage to keep you signed in. No third-party tracking cookies.' },
            { h: 'Contact',          p: 'Privacy questions? Email privacy@travelbae.app and a real human will reply.' },
          ].map(s => (
            <div key={s.h} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: '#1a1a18', marginBottom: 6 }}>{s.h}</div>
              <div style={{ fontSize: 12.5, color: '#6b6b68', lineHeight: 1.6 }}>{s.p}</div>
            </div>
          ))}
          <div style={{ textAlign: 'center', fontSize: 11, color: '#9a9a96', marginTop: '1.25rem' }}>© 2026 <TBLogo h={11} /></div>
        </div>
      )}

      {/* ════════ TERMS OF SERVICE VIEW ════════ */}
      {view === 'terms' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem', maxWidth: 680 }}>
          <div style={{ fontSize: 11, color: '#6b6b68', marginBottom: 14 }}>Last updated · May 2026</div>
          {[
            { h: 'The deal',          p: 'TravelBae is a tool to help you plan trips, split expenses and share memories with people you travel with. By using it, you agree to keep things friendly and lawful.' },
            { h: 'Your account',      p: 'You\'re responsible for what happens under your account. Keep your password secret. One human, one account.' },
            { h: 'Your content',      p: 'Your trips, photos and notes belong to you. You grant us only the minimum permission needed to store and display them inside your trips.' },
            { h: 'Acceptable use',    p: 'Don\'t upload anything illegal, hateful, or that isn\'t yours to share. Don\'t try to reverse-engineer, scrape, or break TravelBae.' },
            { h: 'Group trips',       p: 'When you join a group trip, the other members can see the trip\'s expenses, contacts and photos. Only share share-codes with people you trust.' },
            { h: 'No warranty',       p: 'TravelBae is provided "as is" — we try hard, but life and code happen. We aren\'t liable for indirect damages from app downtime or data loss.' },
            { h: 'Changes',           p: 'We may tweak these terms occasionally. We\'ll surface changes inside the app. Continuing to use TravelBae means you accept the latest version.' },
          ].map(s => (
            <div key={s.h} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: '#1a1a18', marginBottom: 6 }}>{s.h}</div>
              <div style={{ fontSize: 12.5, color: '#6b6b68', lineHeight: 1.6 }}>{withLogo(s.p, 12)}</div>
            </div>
          ))}
          <div style={{ textAlign: 'center', fontSize: 11, color: '#9a9a96', marginTop: '1.25rem' }}>© 2026 <TBLogo h={11} /></div>
        </div>
      )}

      {/* ════════ ABOUT VIEW — informational only ════════ */}
      {view === 'about' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem', maxWidth: 680 }}>
          {/* Hero */}
          <div style={{ textAlign: 'center', padding: '1rem 1rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '0 auto' }}>
              <img src={bglessLogo} alt="TravelBae" style={{ height: 72, width: 'auto', objectFit: 'contain' }} />
            </div>
            <div style={{ fontSize: 13, color: '#6b6b68', marginTop: 4, fontStyle: 'italic' }}>Plan, split, explore — together.</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '4px 12px', borderRadius: 12, background: AC_SOFT, border: `0.5px solid rgba(255,106,0,0.28)`, fontSize: 11, color: AC, fontWeight: 600 }}>
              <span>v1.0.0</span> · <span>Build 2026.05</span>
            </div>
          </div>

          {/* What is TravelBae */}
          <div style={{ background: 'linear-gradient(145deg,#fff,#FFF4EA)', border: '0.5px solid rgba(255,106,0,0.18)', borderRadius: 16, padding: '18px 18px', marginBottom: 12 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: AC, marginBottom: 8 }}>What is <TBLogo h={15} />?</div>
            <div style={{ fontSize: 13, color: '#1a1a18', lineHeight: 1.65 }}>
              <TBLogo h={13} /> is a calm, all-in-one companion for travellers who'd rather spend their energy on the journey than the logistics. From the first spark of an idea to the photos you scroll through years later, every part of a trip — planning, money, people, memories — lives in one place. No spreadsheets, no scattered group chats, no awkward "who owes whom" maths.
            </div>
          </div>

          {/* Why we built it */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 16, padding: '18px 18px', marginBottom: 12 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#1a1a18', marginBottom: 8 }}>Why we built it</div>
            <div style={{ fontSize: 13, color: '#6b6b68', lineHeight: 1.65 }}>
              Every group trip we'd taken ended the same way — endless screenshots of bills, a forgotten itinerary buried in someone's notes app, photos drifting across five different cloud folders. We wanted one quiet home for it all. So we built one, designed around the people we actually travel with.
            </div>
          </div>

          {/* What you can do */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 16, padding: '18px 18px 14px', marginBottom: 12 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#1a1a18', marginBottom: 12 }}>What you can do</div>
            {[
              { iconId: 'map',     title: 'Plan',             body: 'Generate AI itineraries, pin must-see places, and shape each day around your pace.' },
              { iconId: 'wallet',  title: 'Split',            body: 'Add expenses on the go. Balances and settle-up suggestions appear instantly.' },
              { iconId: 'users',   title: 'Solo or together', body: 'Spin up a solo journey or a group trip — TravelBae adapts to either mode.' },
              { iconId: 'camera',  title: 'Remember',         body: 'Private photo folders per traveller, encrypted and visible only to your trip mates.' },
            ].map((f, idx) => (
              <div key={f.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingTop: idx === 0 ? 0 : 10, paddingBottom: 10, borderTop: idx === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.05)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: AC_SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <DrawerIcon id={f.iconId} size={16} color={AC} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 700, color: '#1a1a18', marginBottom: 2 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: '#6b6b68', lineHeight: 1.55 }}>{withLogo(f.body, 12)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Values */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 16, padding: '18px 18px', marginBottom: 12 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#1a1a18', marginBottom: 10 }}>What we stand for</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {[
                { iconId: 'lock',    t: 'Privacy first',     s: 'Your data is yours. Encrypted, never sold.' },
                { iconId: 'leaf',    t: 'Calm by design',    s: 'No dark patterns. No noise. Just clarity.' },
                { iconId: 'users',   t: 'Built for groups',  s: 'Travelling together should feel easy.' },
                { iconId: 'plane',   t: 'Made by travellers', s: 'Crafted by people who love going places.' },
              ].map(v => (
                <div key={v.t} style={{ padding: '10px 12px', background: '#FAFAF8', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ width: 30, height: 30, background: AC_SOFT, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <DrawerIcon id={v.iconId} size={15} color={AC} />
                  </div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 12.5, fontWeight: 700, color: '#1a1a18' }}>{v.t}</div>
                  <div style={{ fontSize: 11, color: '#6b6b68', marginTop: 2, lineHeight: 1.45 }}>{v.s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Built with */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 16, padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: '#1a1a18', marginBottom: 8 }}>Built with</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['React', 'Vite', 'Node.js', 'Prisma', 'Supabase', 'Gemini AI'].map(t => (
                <span key={t} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 10, background: '#F1EFE8', color: '#1a1a18', fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'center', fontSize: 12, color: '#6b6b68', marginTop: '1.25rem', paddingBottom: '0.5rem', lineHeight: 1.6 }}>
            Made for travellers, everywhere.
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#9a9a96', paddingBottom: '1rem' }}>
            © 2026 <TBLogo h={11} /> · All rights reserved
          </div>
        </div>
      )}

      <div style={{ height: '2rem' }} />
    </div>
  );
}

export default ProfilePage;
