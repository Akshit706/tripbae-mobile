import { useState, useRef, useEffect } from 'react';
import { tripDuration, normalizeMembers } from '../shared/constants';
import { S } from '../shared/styles';
const BADGE_DEFS = [
  { id: 'early_bird',     name: 'Early Bird',      emoji: '🌅', desc: 'Joined the TravelBae crew',           check: () => true },
  { id: 'first_flight',   name: 'First Flight',    emoji: '✈️', desc: 'Created your very first trip',         check: s => s.tripCount >= 1 },
  { id: 'group_leader',   name: 'Group Leader',    emoji: '👥', desc: 'Set off on a group adventure',         check: s => s.groupCount >= 1 },
  { id: 'solo_voyager',   name: 'Solo Voyager',    emoji: '🎒', desc: 'Embraced a solo journey',              check: s => s.soloCount >= 1 },
  { id: 'globe_trotter',  name: 'Globe Trotter',   emoji: '🌍', desc: 'Visited 3+ different destinations',    check: s => s.uniqueDests >= 3, progress: s => `${Math.min(s.uniqueDests, 3)}/3` },
  { id: 'budget_pro',     name: 'Budget Pro',      emoji: '💰', desc: 'Tracked expenses on 3+ trips',         check: s => s.tripsWithExpenses >= 3, progress: s => `${Math.min(s.tripsWithExpenses, 3)}/3` },
  { id: 'photographer',   name: 'Photographer',    emoji: '📸', desc: 'Uploaded 10+ trip photos',             check: s => s.photoCount >= 10, progress: s => `${Math.min(s.photoCount, 10)}/10` },
  { id: 'trail_blazer',   name: 'Trail Blazer',    emoji: '🔥', desc: 'Completed 5+ trips',                   check: s => s.completedCount >= 5, progress: s => `${Math.min(s.completedCount, 5)}/5` },
  { id: 'social_butterfly', name: 'Social Butterfly', emoji: '🦋', desc: 'Saved 5+ trip contacts',           check: s => s.contactCount >= 5, progress: s => `${Math.min(s.contactCount, 5)}/5` },
  { id: 'master_planner', name: 'Master Planner',  emoji: '🗺️', desc: 'Built itineraries for 3+ trips',       check: s => s.itineraryCount >= 3, progress: s => `${Math.min(s.itineraryCount, 3)}/3` },
  { id: 'globe_elite',    name: 'Globe Elite',     emoji: '🌟', desc: 'Visited 7+ destinations',              check: s => s.uniqueDests >= 7, progress: s => `${Math.min(s.uniqueDests, 7)}/7` },
  { id: 'shutterbug',     name: 'Shutterbug',      emoji: '🎞️', desc: 'Uploaded 50+ trip photos',             check: s => s.photoCount >= 50, progress: s => `${Math.min(s.photoCount, 50)}/50` },
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

function ProfilePage({ profile, onSave, onClose, onLogout, onDeleteAccount, trips }) {
  const [view, setView] = useState('hub'); // 'hub' | 'badges' | 'stats' | 'history' | 'notifications' | 'currency' | 'privacy' | 'help' | 'about'
  const [spanFilter, setSpanFilter] = useState('all'); 
  const [name, setName] = useState(profile.name || '');
  const [avatar, setAvatar] = useState(profile.avatar || null);
  const [editingName, setEditingName] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState('');
  const [rateModal, setRateModal] = useState(false);
  const [rateStars, setRateStars] = useState(() => {
    const saved = parseInt(localStorage.getItem('travelbae_rating') || '0', 10);
    return Number.isFinite(saved) ? saved : 0;
  });
  const [rateHover, setRateHover] = useState(0);
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
      img.onload = () => {
        const MAX = 240;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL('image/jpeg', 0.85);
        setAvatar(dataUrl);
        persist({ name, avatar: dataUrl });
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
      1: 'Thanks — we’ll do better. 💚',
      2: 'Got it. We’ll keep improving. 💚',
      3: 'Thanks for the feedback! 💚',
      4: 'Glad you’re enjoying it! 💚',
      5: 'You just made our day! 💚',
    };
    showToast(msgs[stars] || 'Thanks for rating! 💚');
  };

  const handleFeedback = () => {
    window.location.href = 'mailto:feedback@travelbae.app?subject=TravelBae%20feedback';
  };

  const titleByView = {
    hub: 'My Profile',
    badges: 'Travel Badges',
    stats: 'Travel Stats',
    history: 'Trip History',
    notifications: 'Notifications',
    currency: 'Default Currency',
    privacy: 'Privacy & Safety',
    help: 'Help & Support',
    policy: 'Privacy Policy',
    terms: 'Terms of Service',
    about: 'About TravelBae',
  };

  // Menu rendered in grouped sections
  const MENU_SECTIONS = [
    {
      title: 'Your travels',
      items: [
        { id: 'badges',  icon: '🏆', label: 'Badges',       sub: `${earned.length}/${BADGE_DEFS.length} earned · ${earnedPct}%`,                          accent: '#1D9E75', action: 'view' },
        { id: 'stats',   icon: '📊', label: 'Travel Stats', sub: `${stats.uniqueDests} places · ${totalTravelDays} days`,                                  accent: '#7F77DD', action: 'view' },
        { id: 'history', icon: '🧳', label: 'Trip History', sub: `${stats.completedCount} completed · ${Math.max(0, stats.tripCount - stats.completedCount)} active`, accent: '#FF6B35', action: 'view' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { id: 'notifications', icon: '🔔', label: 'Notifications',    sub: 'Trip reminders & updates',                          accent: '#FF6B35', action: 'view' },
        { id: 'currency',      icon: '💱', label: 'Default Currency', sub: `${currencyMeta.code} — ${currencyMeta.name}`,       accent: '#0F6E56', action: 'view' },
        { id: 'help',          icon: '❓', label: 'Help & Support',   sub: 'FAQs and contact us',                              accent: '#1D9E75', action: 'view' },
      ],
    },
    {
      title: 'Support TravelBae',
      items: [
        { id: 'feedback', icon: '💌', label: 'Send feedback',   sub: 'Tell us what you love or hate',     accent: '#D85A30', action: 'feedback' },
        { id: 'rate',     icon: '⭐', label: 'Rate TravelBae',  sub: 'Love the app? Let us know!',        accent: '#BA7517', action: 'rate' },
        { id: 'share',    icon: '📤', label: 'Share TravelBae', sub: 'Invite friends to plan together',   accent: '#7F77DD', action: 'share' },
      ],
    },
    {
      title: 'Legal',
      items: [
        { id: 'policy', icon: '📄', label: 'Privacy policy',    sub: 'What we do and don\'t collect', accent: '#534AB7', action: 'view' },
        { id: 'terms',  icon: '📖', label: 'Terms of service',  sub: 'How we keep things fair',       accent: '#6b6b68', action: 'view' },
        { id: 'about',  icon: 'ℹ️', label: 'About TravelBae',   sub: 'Our story & version info',      accent: '#1D9E75', action: 'view' },
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
    <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(circle at 14% 8%, #ffffff 0%, #f8f7f2 34%, #f3f2ed 100%)', zIndex: 620, overflowY: 'auto', fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @keyframes pfFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pfBadgePop { from { opacity: 0; transform: scale(.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes pfSlideIn { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pfBgFloat { from { transform: scale(1.15) translateY(0px); } to { transform: scale(1.22) translateY(-8px); } }
        .pf-badge:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(29,158,117,0.18); }
        .pf-badge-locked:hover { transform: translateY(-2px); }
        .pf-avatar-edit:hover { background: #0F6E56 !important; }
        .pf-row:hover { background: #faf9f5 !important; }
        .pf-row:active { transform: scale(0.995); }
      `}</style>

      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', borderBottom: '0.5px solid rgba(0,0,0,0.08)', padding: '13px 1.25rem', paddingTop: 'calc(13px + env(safe-area-inset-top, 0px))', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 10px 24px rgba(0,0,0,0.05)' }}>
        <button style={{ ...S.btn, padding: '5px 8px', fontSize: 16 }} onClick={goBack}>←</button>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700 }}>{headerTitle}</div>
        {saved && <div style={{ marginLeft: 'auto', fontSize: 11, color: '#0F6E56', background: '#E1F5EE', border: '0.5px solid #9FE1CB', borderRadius: 10, padding: '4px 10px', fontWeight: 600, animation: 'pfFadeIn .2s' }}>✓ Saved</div>}
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
            <div style={{ fontSize: 38, marginBottom: 8 }}>✨</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 700, color: '#1a1a18', marginBottom: 6 }}>
              Enjoying TravelBae?
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
                : (rateStars ? `You rated ${rateStars}★` : 'Pick a rating')}
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
              borderRadius: 22, padding: '1.75rem 1.25rem', textAlign: 'center', color: '#fff',
              position: 'relative', overflow: 'hidden',
              background: avatar ? 'transparent' : 'linear-gradient(135deg,#1D9E75,#0F6E56)',
              boxShadow: avatar ? '0 10px 40px rgba(0,0,0,0.28)' : '0 10px 30px rgba(29,158,117,0.25)',
              minHeight: 220,
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
                  width: 110, height: 110, borderRadius: '50%',
                  background: avatar ? `url(${avatar}) center/cover` : 'rgba(255,255,255,0.18)',
                  border: avatar ? '3px solid rgba(255,255,255,0.6)' : '3px solid rgba(255,255,255,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 38, fontWeight: 700, fontFamily: "'Sora',sans-serif", color: '#fff',
                  boxShadow: avatar ? '0 8px 32px rgba(0,0,0,0.35), 0 0 0 5px rgba(255,255,255,0.12)' : '0 8px 24px rgba(0,0,0,0.15)',
                }}>
                  {!avatar && initials}
                </div>
                <button
                  type="button"
                  className="pf-avatar-edit"
                  onClick={() => fileRef.current?.click()}
                  style={{ position: 'absolute', bottom: 2, right: 2, width: 34, height: 34, borderRadius: '50%', background: '#1D9E75', border: '2.5px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: '#fff', transition: 'all .15s', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                  title="Upload photo"
                >
                  📷
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarPick} />
              </div>

              {avatar && (
                <div style={{ marginBottom: 10, position: 'relative', zIndex: 2 }}>
                  <button onClick={removeAvatar} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 12, border: '0.5px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>Remove photo</button>
                </div>
              )}

              <div style={{ position: 'relative', zIndex: 2 }}>
                {editingName ? (
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', maxWidth: 260, margin: '0 auto' }}>
                    <input
                      autoFocus
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setName(profile.name || ''); setEditingName(false); } }}
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: 'none', fontSize: 15, fontWeight: 600, textAlign: 'center', fontFamily: "'Sora',sans-serif", outline: 'none', background: 'rgba(255,255,255,0.95)', color: '#0F6E56' }}
                      placeholder="Your name"
                      maxLength={30}
                    />
                    <button onClick={saveName} style={{ padding: '8px 12px', borderRadius: 10, border: 'none', background: '#fff', color: '#0F6E56', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}>✓</button>
                  </div>
                ) : (
                  <div onClick={() => setEditingName(true)} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px', textShadow: avatar ? '0 1px 8px rgba(0,0,0,0.5)' : 'none' }}>
                      {name || 'Tap to add name'}
                    </div>
                    <span style={{ fontSize: 13, opacity: 0.75 }}>✎</span>
                  </div>
                )}
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>
                  {stats.tripCount} trip{stats.tripCount === 1 ? '' : 's'} · {stats.uniqueDests} destination{stats.uniqueDests === 1 ? '' : 's'}
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

          {/* ── Achievements strip ── */}
          {earned.length > 0 && (
            <div style={{ padding: '1.25rem 1.25rem 0' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: '#6b6b68', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', paddingLeft: 2 }}>🏆 Achievements</div>
                <div style={{ fontSize: 11, color: '#1D9E75', fontWeight: 600 }}>{earned.length}/{BADGE_DEFS.length} earned</div>
              </div>
              <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, scrollbarWidth: 'none' }}>
                {earned.map((b, i) => (
                  <div key={b.id} style={{
                    flexShrink: 0,
                    width: 90,
                    background: 'linear-gradient(160deg,#fff 0%,#F0FAF5 100%)',
                    border: '0.5px solid #9FE1CB',
                    borderRadius: 16,
                    padding: '12px 8px 10px',
                    textAlign: 'center',
                    boxShadow: '0 3px 12px rgba(29,158,117,0.10)',
                    animation: `pfBadgePop .3s ease-out ${i * 0.04}s both`,
                    position: 'relative',
                  }}>
                    <div style={{ position: 'absolute', top: 5, right: 5, fontSize: 8, fontWeight: 700, color: '#0F6E56', background: '#E1F5EE', padding: '1px 5px', borderRadius: 6 }}>✓</div>
                    <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 6 }}>{b.emoji}</div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 10, fontWeight: 700, color: '#0F6E56', lineHeight: 1.3 }}>{b.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Menu list — grouped sections */}
          {MENU_SECTIONS.map(section => (
            <div key={section.title} style={{ padding: '1.25rem 1.25rem 0' }}>
              <div style={{ fontSize: 11, color: '#6b6b68', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>
                {section.title}
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
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${m.accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      {m.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>{m.label}</div>
                      <div style={{ fontSize: 11.5, color: '#6b6b68', marginTop: 2 }}>{m.sub}</div>
                    </div>
                    <div style={{ fontSize: 18, color: '#c8c6c0', flexShrink: 0 }}>
                      {m.action === 'view' ? '›' : (m.action === 'share' ? '↗' : '★')}
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
                    border: '0.5px solid #F5C4B3', background: '#fff', color: '#993C1D',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  🚪 Log out
                </button>
              )}
              {onDeleteAccount && (
                <button
                  onClick={onDeleteAccount}
                  style={{
                    width: '100%', padding: '13px', borderRadius: 14,
                    border: '0.5px solid #C44545', background: '#C44545', color: '#fff',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    fontFamily: "'DM Sans',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  🗑️ Delete account
                </button>
              )}
              <div style={{ fontSize: 11, color: '#9a9a96', textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>
                Deleting your account permanently wipes your profile and any trips where you're the only member.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════ BADGES VIEW ════════ */}
      {view === 'badges' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out' }}>
          <div style={{ padding: '1.25rem 1.25rem 0.5rem', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700 }}>🏆 Travel Badges</div>
            <div style={{ fontSize: 12, color: '#6b6b68' }}>{earned.length}/{BADGE_DEFS.length} · {earnedPct}%</div>
          </div>
          <div style={{ padding: '0 1.25rem' }}>
            <div style={{ height: 6, background: '#E8E6DE', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${earnedPct}%`, height: '100%', background: 'linear-gradient(90deg,#1D9E75,#0F6E56)', transition: 'width .4s' }} />
            </div>
          </div>

          {earned.length > 0 && (
            <>
              <div style={{ padding: '1.25rem 1.25rem 0.5rem', fontSize: 11, color: '#0F6E56', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Earned</div>
              <div style={{ padding: '0 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10 }}>
                {earned.map((b, i) => (
                  <div key={b.id} className="pf-badge" style={{
                    background: 'linear-gradient(135deg,#fff,#F0FAF5)',
                    border: '0.5px solid #9FE1CB',
                    borderRadius: 14, padding: '14px 10px', textAlign: 'center',
                    cursor: 'default', transition: 'all .18s',
                    animation: `pfBadgePop .3s ease-out ${i * 0.04}s both`,
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', top: 6, right: 6, fontSize: 9, fontWeight: 700, color: '#0F6E56', background: '#E1F5EE', padding: '2px 6px', borderRadius: 6 }}>✓</div>
                    <div style={{ fontSize: 32, marginBottom: 6, lineHeight: 1 }}>{b.emoji}</div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: '#0F6E56', marginBottom: 3 }}>{b.name}</div>
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
                    background: '#fff', border: '0.5px dashed rgba(0,0,0,0.15)',
                    borderRadius: 14, padding: '14px 10px', textAlign: 'center',
                    transition: 'all .18s', opacity: 0.78, position: 'relative',
                  }}>
                    <div style={{ fontSize: 32, marginBottom: 6, lineHeight: 1, filter: 'grayscale(0.7)', opacity: 0.55 }}>{b.emoji}</div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: '#6b6b68', marginBottom: 3 }}>{b.name}</div>
                    <div style={{ fontSize: 10.5, color: '#9a9a96', lineHeight: 1.4 }}>{b.desc}</div>
                    {b.progress && (
                      <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: '#1D9E75', background: '#F1EFE8', borderRadius: 8, padding: '2px 8px', display: 'inline-block' }}>
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
                    background: active ? '#1D9E75' : 'transparent',
                    color: active ? '#fff' : '#6b6b68',
                    fontSize: 12, fontWeight: active ? 700 : 500,
                    cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                    transition: 'all .18s',
                    boxShadow: active ? '0 3px 10px rgba(29,158,117,0.25)' : 'none',
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
              { emoji: '🧳', label: 'Trips',        val: spanStats.tripCount },
              { emoji: '📍', label: 'Destinations', val: spanStats.uniqueDests },
              { emoji: '📅', label: 'Travel Days',  val: spanTravelDays },
              { emoji: '💰', label: 'Total Spent',  val: fmtMoney(spanTotalSpend) },
              { emoji: '🤝', label: 'Group Trips',  val: spanStats.groupCount },
              { emoji: '🎒', label: 'Solo Trips',   val: spanStats.soloCount },
            ].map(s => (
              <div key={s.label} style={{
                background: 'linear-gradient(160deg,#ffffff,#fafaf7)',
                border: '0.5px solid rgba(0,0,0,0.08)',
                borderRadius: 14, padding: '14px 16px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.emoji}</div>
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
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: '#1a1a18', marginBottom: 12 }}>
                📍 Top Destinations
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
                        background: 'linear-gradient(90deg,#1D9E75,#0F6E56)',
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
              <div style={{ fontSize: 36, marginBottom: 10 }}>🗺️</div>
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

      {/* ════════ TRIP HISTORY VIEW ════════ */}
      {view === 'history' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem' }}>
          {tripList.length === 0 ? (
            <div style={{ background: '#fff', border: '0.5px dashed rgba(0,0,0,0.15)', borderRadius: 14, padding: '2rem 1rem', textAlign: 'center', color: '#6b6b68' }}>
              <div style={{ fontSize: 38, marginBottom: 6 }}>🗺️</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>No trips yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Create one from your home screen to start your travel log.</div>
            </div>
          ) : (
            tripList.map(t => {
              const spend = (t.expenses || []).reduce((a, e) => a + (e.amount || 0), 0);
              return (
                <div key={t.id} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, padding: '12px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: t.isSolo ? 'linear-gradient(135deg,#EEEDFE,#E6F1FB)' : '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {t.emoji || (t.isSolo ? '🎒' : '✈️')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 600, color: '#1a1a18', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.groupName || 'Untitled trip'}</div>
                      {t.completed && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#E1F5EE', color: '#0F6E56' }}>DONE</span>}
                      {t.isSolo && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#EEEDFE', color: '#534AB7' }}>SOLO</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#6b6b68', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      📍 {t.destination || '—'}
                      {spend > 0 && <> · ₹{Math.round(spend).toLocaleString('en-IN')}</>}
                      {(t.photos || []).length > 0 && <> · {(t.photos || []).length} 📸</>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
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
                style={{ width: 44, height: 26, borderRadius: 14, border: 'none', cursor: 'pointer', background: prefs.notifications ? '#1D9E75' : '#d1cfc8', position: 'relative', transition: 'background .2s', flexShrink: 0 }}
              >
                <div style={{ position: 'absolute', top: 3, left: prefs.notifications ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left .2s' }} />
              </button>
            </div>
          </div>

          <div style={{ fontSize: 11, color: '#6b6b68', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', margin: '4px 0 8px 4px' }}>Categories</div>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, overflow: 'hidden', opacity: prefs.notifications ? 1 : 0.45, pointerEvents: prefs.notifications ? 'auto' : 'none', transition: 'opacity .2s' }}>
            {[
              { key: 'notifTripReminders', icon: '📅', label: 'Trip reminders',     sub: 'Upcoming arrivals, departures & itinerary' },
              { key: 'notifGroupUpdates',  icon: '👥', label: 'Group updates',      sub: 'Expenses, contacts & photos added by mates' },
              { key: 'notifTips',          icon: '💡', label: 'Tips & inspiration', sub: 'Occasional travel ideas — never spammy' },
            ].map((row, idx) => (
              <div key={row.key} style={{ padding: '14px 16px', borderTop: idx === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 18, width: 22, textAlign: 'center' }}>{row.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a18' }}>{row.label}</div>
                  <div style={{ fontSize: 11, color: '#6b6b68', marginTop: 1 }}>{row.sub}</div>
                </div>
                <button
                  onClick={() => savePrefs({ ...prefs, [row.key]: !prefs[row.key] })}
                  style={{ width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: prefs[row.key] ? '#1D9E75' : '#d1cfc8', position: 'relative', transition: 'background .2s', flexShrink: 0 }}
                >
                  <div style={{ position: 'absolute', top: 3, left: prefs[row.key] ? 19 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', transition: 'left .2s' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════ CURRENCY VIEW ════════ */}
      {view === 'currency' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem' }}>
          <div style={{ background: 'linear-gradient(135deg,#E1F5EE,#F0FAF5)', border: '0.5px solid #9FE1CB', borderRadius: 14, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff', border: '0.5px solid #9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontFamily: "'Sora',sans-serif", fontWeight: 700, color: '#0F6E56' }}>{currencyMeta.symbol}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: '#0F6E56' }}>Currently using {currencyMeta.code}</div>
              <div style={{ fontSize: 11.5, color: '#0F6E56', opacity: 0.85, marginTop: 2 }}>{currencyMeta.name}</div>
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
                    width: '100%', background: active ? '#F0FAF5' : '#fff', border: 'none',
                    borderTop: idx === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.06)',
                    padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer', textAlign: 'left', fontFamily: "'DM Sans',sans-serif",
                    transition: 'background .15s',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? '#1D9E75' : '#F1EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, fontFamily: "'Sora',sans-serif", color: active ? '#fff' : '#1a1a18', flexShrink: 0 }}>
                    {c.symbol}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 600, color: '#1a1a18' }}>{c.code}</div>
                    <div style={{ fontSize: 11.5, color: '#6b6b68', marginTop: 1 }}>{c.name}</div>
                  </div>
                  {active && <div style={{ fontSize: 14, color: '#1D9E75', fontWeight: 700 }}>✓</div>}
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
                  <span style={{ color: '#1D9E75', fontWeight: 700 }}>›</span> {it.q}
                </summary>
                <div style={{ fontSize: 12, color: '#6b6b68', lineHeight: 1.55, marginTop: 8, paddingLeft: 16 }}>{it.a}</div>
              </details>
            ))}
          </div>

          <div style={{ fontSize: 11, color: '#6b6b68', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', margin: '0 0 8px 4px' }}>Contact us</div>
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, overflow: 'hidden' }}>
            <a href="mailto:support@travelbae.app" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', textDecoration: 'none', color: 'inherit' }}>
              <div style={{ fontSize: 18, width: 22, textAlign: 'center' }}>✉️</div>
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
          <div style={{ background: 'linear-gradient(135deg,#E1F5EE,#F0FAF5)', border: '0.5px solid #9FE1CB', borderRadius: 14, padding: '14px 16px', marginBottom: 12, display: 'flex', gap: 10 }}>
            <div style={{ fontSize: 22, lineHeight: 1 }}>🔒</div>
            <div style={{ fontSize: 12.5, color: '#0F6E56', lineHeight: 1.5 }}>
              Your photos, expenses and trip data are <strong>end-to-end encrypted</strong> and visible only to you and your trip mates. We never share, sell, or use your content to train any models.
            </div>
          </div>
          {[
            { icon: '📸', title: 'Photos', body: 'Stored encrypted in your private trip bucket. Only your trip mates can view them.' },
            { icon: '💰', title: 'Expenses & contacts', body: 'Synced privately to your account. Visible only inside the specific trip.' },
            { icon: '📍', title: 'Location', body: 'We never track your real-time location. Destinations come from what you type.' },
            { icon: '🗑️', title: 'Right to delete', body: 'Delete a trip and all its photos, expenses and contacts disappear permanently.' },
          ].map(it => (
            <div key={it.title} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, padding: '12px 14px', marginBottom: 10, display: 'flex', gap: 12 }}>
              <div style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{it.icon}</div>
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
          <div style={{ textAlign: 'center', fontSize: 11, color: '#9a9a96', marginTop: '1.25rem' }}>© 2026 TravelBae</div>
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
              <div style={{ fontSize: 12.5, color: '#6b6b68', lineHeight: 1.6 }}>{s.p}</div>
            </div>
          ))}
          <div style={{ textAlign: 'center', fontSize: 11, color: '#9a9a96', marginTop: '1.25rem' }}>© 2026 TravelBae</div>
        </div>
      )}

      {/* ════════ ABOUT VIEW — informational only ════════ */}
      {view === 'about' && (
        <div style={{ animation: 'pfSlideIn .2s ease-out', padding: '1.25rem', maxWidth: 680 }}>
          {/* Hero */}
          <div style={{ textAlign: 'center', padding: '1rem 1rem 1.5rem' }}>
            <div style={{ width: 78, height: 78, background: 'linear-gradient(135deg,#1D9E75,#0F6E56)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 14px', boxShadow: '0 10px 28px rgba(29,158,117,0.35)' }}>✈️</div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: '-0.4px' }}>
              Travel<span style={{ color: '#1D9E75' }}>Bae</span>
            </div>
            <div style={{ fontSize: 13, color: '#6b6b68', marginTop: 4, fontStyle: 'italic' }}>Plan, split, explore — together.</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '4px 12px', borderRadius: 12, background: '#E1F5EE', border: '0.5px solid #9FE1CB', fontSize: 11, color: '#0F6E56', fontWeight: 600 }}>
              <span>v1.0.0</span> · <span>Build 2026.05</span>
            </div>
          </div>

          {/* What is TravelBae */}
          <div style={{ background: 'linear-gradient(135deg,#fff,#F0FAF5)', border: '0.5px solid #9FE1CB', borderRadius: 16, padding: '18px 18px', marginBottom: 12 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#0F6E56', marginBottom: 8 }}>What is TravelBae?</div>
            <div style={{ fontSize: 13, color: '#1a1a18', lineHeight: 1.65 }}>
              TravelBae is a calm, all-in-one companion for travellers who'd rather spend their energy on the journey than the logistics. From the first spark of an idea to the photos you scroll through years later, every part of a trip — planning, money, people, memories — lives in one place. No spreadsheets, no scattered group chats, no awkward "who owes whom" maths.
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
              { icon: '🗺️', title: 'Plan',    body: 'Generate AI itineraries, pin must-see places, and shape each day around your pace.' },
              { icon: '💳', title: 'Split',   body: 'Add expenses on the go. Balances and settle-up suggestions appear instantly.' },
              { icon: '🎒', title: 'Solo or together', body: 'Spin up a solo journey or a group trip — TravelBae adapts to either mode.' },
              { icon: '📸', title: 'Remember', body: 'Private photo folders per traveller, encrypted and visible only to your trip mates.' },
            ].map((f, idx) => (
              <div key={f.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingTop: idx === 0 ? 0 : 10, paddingBottom: 10, borderTop: idx === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.05)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: '#F0FAF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{f.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 700, color: '#1a1a18', marginBottom: 2 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: '#6b6b68', lineHeight: 1.55 }}>{f.body}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Values */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 16, padding: '18px 18px', marginBottom: 12 }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#1a1a18', marginBottom: 10 }}>What we stand for</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
              {[
                { icon: '🔒', t: 'Privacy first',    s: 'Your data is yours. Encrypted, never sold.' },
                { icon: '🧘', t: 'Calm by design',    s: 'No dark patterns. No noise. Just clarity.' },
                { icon: '🤝', t: 'Built for groups',  s: 'Travelling together should feel easy.' },
                { icon: '🌱', t: 'Made by travellers', s: 'Crafted by people who love going places.' },
              ].map(v => (
                <div key={v.t} style={{ padding: '10px 12px', background: '#fafaf6', borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.05)' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{v.icon}</div>
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
            Made with <span style={{ color: '#1D9E75' }}>💚</span> for travellers, everywhere.
          </div>
          <div style={{ textAlign: 'center', fontSize: 11, color: '#9a9a96', paddingBottom: '1rem' }}>
            © 2026 TravelBae · All rights reserved
          </div>
        </div>
      )}

      <div style={{ height: '2rem' }} />
    </div>
  );
}

export default ProfilePage;
