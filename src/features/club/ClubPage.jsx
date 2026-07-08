import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getClubHub, upsertClubProfile, updateClubStatus, sendClubRequest, respondClubRequest, sendClubChatMessage, createClubChatSplitExpense, deleteClubChatSplitExpense, deleteClubChat, addPhoto, deletePhoto, imagekitAuth } from '../../api';
import { supabase } from '../../supabase';
import { S } from '../shared/styles';
import { Spinner } from '../shared/ui';
import bglessLogo from '../../assets/bgless_club.png';
import lumiMood3 from '../../assets/lumi_mood3.png';

const VIBE_OPTIONS = [
  { value: 'any', label: 'Any vibe' },
  { value: 'chill', label: 'Chill' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'foodie', label: 'Foodie' },
  { value: 'party', label: 'Party' },
  { value: 'culture', label: 'Culture' },
  { value: 'mixed', label: 'Mixed' },
];

const GENDER_MIX_OPTIONS = [
  { value: 'any', label: 'Any mix' },
  { value: 'mixed', label: 'Mixed group' },
  { value: 'all-boys', label: 'All boys' },
  { value: 'all-girls', label: 'All girls' },
];

const MEMBER_BAND_OPTIONS = [
  { value: 'any', label: 'Any size' },
  { value: '2plus', label: '2+ members' },
  { value: '4plus', label: '4+ members' },
  { value: '6plus', label: '6+ members' },
];

const initialFilters = {
  search: '',
  memberBand: 'any',
  vibe: 'any',
  genderMix: 'any',
};

function moodGradient(vibe) {
  switch (vibe) {
    case 'party': return 'linear-gradient(135deg,#FF6A3D,#FF2F6E 55%,#7D2AE8)';
    case 'adventure': return 'linear-gradient(135deg,#0DAA8B,#0C7D6A 55%,#0F4B86)';
    case 'foodie': return 'linear-gradient(135deg,#FF7B33,#F04D2F 55%,#A42D3C)';
    case 'culture': return 'linear-gradient(135deg,#7A5AF8,#5E3CE6 55%,#2D2A78)';
    case 'chill': return 'linear-gradient(135deg,#4FB5FF,#2E8DE0 55%,#3762E2)';
    default: return 'linear-gradient(135deg,#2D7C6D,#1E5F53 55%,#234B9B)';
  }
}

function distanceLabel(km) {
  if (km == null) return 'Location unavailable';
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  if (km > 150) return '150+ km away';
  return `${Math.round(km)} km away`;
}

function genderMixLabel(value) {
  if (value === 'all-boys') return 'All boys';
  if (value === 'all-girls') return 'All girls';
  if (value === 'mixed') return 'Mixed group';
  return 'Not specified';
}

function isRecentlyActive(updatedAt) {
  if (!updatedAt) return false;
  return Date.now() - new Date(updatedAt).getTime() <= 3 * 24 * 60 * 60 * 1000;
}

function MatchRing({ score }) {
  const value = Math.max(0, Math.min(100, score || 0));
  return (
    <div
      style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: `conic-gradient(#12B981 0 ${value}%, #E7ECF4 ${value}% 100%)`,
        display: 'grid',
        placeItems: 'center',
        animation: 'clubRingIn .7s cubic-bezier(.2,.7,.2,1) both',
        boxShadow: '0 10px 24px rgba(18,185,129,0.18)',
      }}>
      <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: '#111827' }}>
        {value}%
      </div>
    </div>
  );
}

function buildCardGallery(item) {
  const ownPhotos = Array.isArray(item?.photoUrls) && item.photoUrls.length > 0
    ? item.photoUrls
    : [item?.photoUrl].filter(Boolean);
  return [...ownPhotos, item?.trip?.coverUrl].filter(Boolean);
}

function formatChatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatChatMetaTime(value) {
  if (!value) return 'No activity yet';
  const dt = new Date(value);
  const now = new Date();
  const isToday = dt.toDateString() === now.toDateString();
  if (isToday) return `Today • ${formatChatTime(value)}`;
  return dt.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function buildCombinedMembers(chat) {
  if (!chat) return [];
  const groupA = (chat.tripA?.members || []).map(member => ({
    id: `${chat.tripA?.id || 'x'}:${member.id}`,
    nickname: member.nickname,
    groupName: chat.tripA?.groupName || 'Group A',
  }));
  const groupB = (chat.tripB?.members || []).map(member => ({
    id: `${chat.tripB?.id || 'y'}:${member.id}`,
    nickname: member.nickname,
    groupName: chat.tripB?.groupName || 'Group B',
  }));
  return [...groupA, ...groupB];
}

function buildCombinedPhotos(chat) {
  const photosA = (chat?.tripA?.photos || []).map(photo => ({ ...photo, source: chat?.tripA?.groupName || 'Group A' }));
  const photosB = (chat?.tripB?.photos || []).map(photo => ({ ...photo, source: chat?.tripB?.groupName || 'Group B' }));
  return [...photosA, ...photosB].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function extractStoragePathFromPublicUrl(url) {
  if (!url) return null;
  const marker = '/trip-photos/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

function getErrorMessage(err, fallback) {
  if (err && typeof err === 'object' && 'message' in err && err.message) {
    return String(err.message);
  }
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
}

function computeSplitBalances(members, entries) {
  const balances = {};
  members.forEach(member => {
    balances[member.id] = 0;
  });

  entries.forEach(entry => {
    const amount = Number(entry.amount) || 0;
    const participants = Array.isArray(entry.splitWithKeys)
      ? entry.splitWithKeys
      : Array.isArray(entry.splitWith)
        ? entry.splitWith
        : [];
    const paidBy = entry.paidByKey || entry.paidBy;
    if (!amount || participants.length === 0) return;
    const perHead = amount / participants.length;
    participants.forEach(memberId => {
      if (balances[memberId] == null) balances[memberId] = 0;
      balances[memberId] -= perHead;
    });
    if (balances[paidBy] == null) balances[paidBy] = 0;
    balances[paidBy] += amount;
  });

  return balances;
}

function buildSettlementsFromBalances(balances) {
  const memberIds = Object.keys(balances || {});
  const debtors = memberIds.filter(id => balances[id] < -0.01).sort((a, b) => balances[a] - balances[b]);
  const creditors = memberIds.filter(id => balances[id] > 0.01).sort((a, b) => balances[b] - balances[a]);
  const working = { ...balances };
  const settlements = [];
  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const from = debtors[di];
    const to = creditors[ci];
    const amount = Math.min(-working[from], working[to]);
    settlements.push({ from, to, amount });
    working[from] += amount;
    working[to] -= amount;
    if (Math.abs(working[from]) < 0.01) di += 1;
    if (Math.abs(working[to]) < 0.01) ci += 1;
  }
  return settlements;
}

function formatSplitDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getGroupMoodLine(item) {
  const vibe = item?.vibe || 'mixed';
  if (vibe === 'party') return 'Late plans, loud laughs, zero boring energy.';
  if (vibe === 'foodie') return 'Built around plates, cafes, and the next great bite.';
  if (vibe === 'adventure') return 'Fast-moving crew chasing views and stories.';
  if (vibe === 'culture') return 'Museums, old streets, and meaningful detours.';
  if (vibe === 'chill') return 'Easy pace, soft plans, good conversations.';
  return 'Balanced crew open to a fun, easy connection.';
}

function toTokenSet(value) {
  return new Set(
    String(value || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );
}

function intersectionSize(a, b) {
  let count = 0;
  a.forEach(v => {
    if (b.has(v)) count += 1;
  });
  return count;
}

function buildCompatibility(myProfile, myTrip, item) {
  let score = 30;
  const reasons = [];

  const hasStrongPref = (value) => value && value !== 'mixed' && value !== 'any';

  const myVibe = myProfile?.vibe || 'mixed';
  const otherVibe = item?.vibe || 'mixed';
  const vibeWeight = hasStrongPref(myVibe) ? 1.45 : 1;
  if (myVibe === otherVibe && myVibe !== 'mixed') {
    score += 18 * vibeWeight;
    reasons.push('same vibe');
  } else if (myVibe === 'mixed' || otherVibe === 'mixed') {
    score += 8 * vibeWeight;
    reasons.push('flexible vibe');
  }

  const myGenderMix = myProfile?.genderMix || 'mixed';
  const otherGenderMix = item?.genderMix || 'mixed';
  const genderWeight = hasStrongPref(myGenderMix) ? 1.35 : 1;
  if (myGenderMix === otherGenderMix) {
    score += 12 * genderWeight;
    reasons.push('group mix alignment');
  } else if (myGenderMix === 'mixed' || otherGenderMix === 'mixed') {
    score += 6 * genderWeight;
  }

  const myMembers = myTrip?.members?.length || 0;
  const otherMembers = item?.trip?.members?.length || 0;
  const sizeGap = Math.abs(myMembers - otherMembers);
  if (sizeGap <= 1) {
    score += 10;
    reasons.push('similar group size');
  } else if (sizeGap <= 3) {
    score += 6;
  } else {
    score += 2;
  }

  const myTags = new Set((myProfile?.coverTags || []).map(t => String(t).toLowerCase()));
  const otherTags = new Set((item?.coverTags || []).map(t => String(t).toLowerCase()));
  const sharedTags = intersectionSize(myTags, otherTags);
  const tagsWeight = myTags.size >= 3 ? 1.25 : 1;
  if (sharedTags >= 2) {
    score += 14 * tagsWeight;
    reasons.push(`${sharedTags} shared interests`);
  } else if (sharedTags === 1) {
    score += 8 * tagsWeight;
    reasons.push('1 shared interest');
  }

  const myIntentTokens = toTokenSet(myProfile?.lookingFor);
  const otherIntentTokens = toTokenSet(item?.lookingFor);
  const sharedIntent = intersectionSize(myIntentTokens, otherIntentTokens);
  const intentWeight = myIntentTokens.size >= 3 ? 1.2 : 1;
  if (sharedIntent >= 2) {
    score += 10 * intentWeight;
    reasons.push('matching plans');
  } else if (sharedIntent === 1) {
    score += 5 * intentWeight;
  }

  if (item?.distance != null) {
    if (item.distance <= 10) {
      score += 12;
      reasons.push('nearby');
    } else if (item.distance <= 30) {
      score += 8;
    } else if (item.distance <= 80) {
      score += 4;
    } else {
      score += 1;
    }
  }

  if (isRecentlyActive(item?.updatedAt)) {
    score += 8;
    reasons.push('active now');
  }

  if (item?.photoUrl) score += 3;

  const finalScore = Math.max(40, Math.min(99, Math.round(score)));
  return {
    score: finalScore,
    reasons: reasons.slice(0, 3),
  };
}

function ClubDiscoveryCard({ item, compatibility, alreadySent, distKm, onOpen }) {
  const activeNow = isRecentlyActive(item.updatedAt);
  const photos = Array.isArray(item?.photoUrls) && item.photoUrls.length > 0 ? item.photoUrls : [item?.photoUrl].filter(Boolean);
  const coverPhoto = photos[0] || item?.trip?.coverUrl || null;
  const tags = Array.isArray(item?.coverTags) ? item.coverTags.slice(0, 4) : [];
  const vibeColors = {
    party: { bg: '#FF2D55', glow: 'rgba(255,45,85,0.35)' },
    adventure: { bg: '#00C7A8', glow: 'rgba(0,199,168,0.35)' },
    foodie: { bg: '#FF6B35', glow: 'rgba(255,107,53,0.35)' },
    culture: { bg: '#7C3AED', glow: 'rgba(124,58,237,0.35)' },
    chill: { bg: '#3B82F6', glow: 'rgba(59,130,246,0.35)' },
    mixed: { bg: '#1D9E75', glow: 'rgba(29,158,117,0.35)' },
  };
  const vc = vibeColors[item.vibe || 'mixed'] || vibeColors.mixed;

  return (
    <button
      data-club-card="true"
      onClick={onOpen}
      style={{
        width: '100%', textAlign: 'left', padding: 0,
        marginBottom: 18, borderRadius: 28, overflow: 'hidden',
        position: 'relative', cursor: 'pointer', border: 'none',
        background: '#111',
        boxShadow: `0 2px 8px rgba(0,0,0,0.06), 0 16px 48px rgba(0,0,0,0.14)`,
        animation: 'clubCardIn .45s cubic-bezier(.2,.7,.2,1) both',
        transition: 'transform .2s ease, box-shadow .2s ease',
        display: 'block',
      }}>
      {/* Photo — tall like Hinge */}
      <div style={{ position: 'relative', height: 340, overflow: 'hidden' }}>
        {coverPhoto ? (
          <img src={coverPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={e => { e.target.style.display = 'none'; }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: moodGradient(item.vibe || 'mixed') }} />
        )}
        {/* gradient scrim — bottom heavy */}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.72) 100%)', pointerEvents:'none' }} />
        {/* top-left badges */}
        <div style={{ position:'absolute', top:14, left:14, display:'flex', gap:6, flexWrap:'wrap' }}>
          {activeNow && (
            <span style={{ fontSize:11, fontWeight:700, padding:'5px 10px', borderRadius:99, background:'rgba(0,0,0,0.45)', color:'#4ADE80', backdropFilter:'blur(8px)', border:'1px solid rgba(74,222,128,0.3)', letterSpacing:'0.2px' }}>● Live</span>
          )}
          {compatibility && (
            <span style={{ fontSize:11, fontWeight:700, padding:'5px 10px', borderRadius:99, background:'rgba(0,0,0,0.45)', color:'#fff', backdropFilter:'blur(8px)' }}>{compatibility.score}% match</span>
          )}
        </div>
        {/* top-right distance */}
        {distKm != null && (
          <span style={{ position:'absolute', top:14, right:14, fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.82)', background:'rgba(0,0,0,0.38)', backdropFilter:'blur(8px)', padding:'5px 9px', borderRadius:99 }}>
            📍 {distanceLabel(distKm)}
          </span>
        )}
        {/* bottom text over photo */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'14px 16px 0' }}>
          <div style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:800, color:'#fff', lineHeight:1.15, letterSpacing:'-0.3px', textShadow:'0 1px 16px rgba(0,0,0,0.6)' }}>
            {item.trip?.groupName}
          </div>
          {item.trip?.destination && (
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.72)', marginTop:3, fontWeight:500, textShadow:'0 1px 8px rgba(0,0,0,0.5)' }}>
              📍 {item.trip.destination}
            </div>
          )}
        </div>
      </div>

      {/* White body — Hinge-style info cards */}
      <div style={{ background:'#fff', padding:'14px 16px 16px' }}>
        {/* Vibe + size row */}
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:99, background:vc.bg, color:'#fff', letterSpacing:'0.1px' }}>
            {(item.vibe || 'mixed').charAt(0).toUpperCase() + (item.vibe || 'mixed').slice(1)}
          </span>
          <span style={{ fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:99, background:'#F3F4F6', color:'#374151' }}>
            {item.trip?.members?.length || 0} travelers
          </span>
          {item.genderMix && item.genderMix !== 'mixed' && (
            <span style={{ fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:99, background:'#F3F4F6', color:'#374151' }}>
              {genderMixLabel(item.genderMix)}
            </span>
          )}
        </div>
        {/* About snippet */}
        {(item.about || item.lookingFor) && (
          <div style={{ fontSize:13, color:'#374151', lineHeight:1.6, marginBottom:10, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {item.about || item.lookingFor}
          </div>
        )}
        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
            {tags.map(tag => (
              <span key={tag} style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:99, background:'#F0F4FF', color:'#3B5BDB' }}>#{tag}</span>
            ))}
          </div>
        )}
        {/* CTA row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:12, color:'#9CA3AF' }}>
            {compatibility?.reasons?.[0] ? `✓ ${compatibility.reasons[0]}` : ''}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {alreadySent ? (
              <span style={{ fontSize:12, fontWeight:700, color:'#F97316', background:'#FFF7ED', padding:'7px 14px', borderRadius:99, border:'1px solid #FED7AA' }}>Requested ✓</span>
            ) : (
              <span style={{ fontSize:12, fontWeight:700, color:'#fff', background:vc.bg, padding:'7px 16px', borderRadius:99, boxShadow:`0 4px 14px ${vc.glow}` }}>Connect →</span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function ClubPage({ trip, onTripRefresh }) {
  const [clubLoading, setClubLoading] = useState(false);
  const [hubFetched, setHubFetched] = useState(false);
  const [clubBusy, setClubBusy] = useState(false);
  const [hub, setHub] = useState({ myProfile: null, discover: [], incomingRequests: [], outgoingRequests: [], chats: [] });
  const [clubView, setClubView] = useState('discover');
  const [filters, setFilters] = useState(initialFilters);
  const [filterDraft, setFilterDraft] = useState(initialFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [chatDraft, setChatDraft] = useState('');
  const [chatTool, setChatTool] = useState(null);
  const [toolsChooserOpen, setToolsChooserOpen] = useState(false);
  const [toolScreenOpen, setToolScreenOpen] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const [chatPhotoFolder, setChatPhotoFolder] = useState('all');
  const [chatPhotoLightbox, setChatPhotoLightbox] = useState(null);
  const [chatPhotoUploading, setChatPhotoUploading] = useState(false);
  const [profilePhotoUploading, setProfilePhotoUploading] = useState(false);
  const [chatPhotoProgress, setChatPhotoProgress] = useState(0);
  const [chatPhotoDragging, setChatPhotoDragging] = useState(false);
  const [chatPhotoSelected, setChatPhotoSelected] = useState(new Set());
  const [splitSection, setSplitSection] = useState('expenses');
  const [splitFormOpen, setSplitFormOpen] = useState(false);
  const [splitDraft, setSplitDraft] = useState({ desc: '', amount: '', paidBy: '', splitWith: [] });
  const [splitTouch, setSplitTouch] = useState({ entryId: null, startX: 0, deltaX: 0, startAt: 0 });
  const [splitSwipeOpenId, setSplitSwipeOpenId] = useState(null);

  const [requestFor, setRequestFor] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');

  const clubLocKey = (suffix) => `travelbae_club_${trip.id}_${suffix}`;

  // ── Club T&C / first-time gate ──
  const CLUB_TERMS_KEY = `travelbae_club_terms_accepted`;
  const [showClubTerms, setShowClubTerms] = useState(() => {
    try { return !localStorage.getItem(CLUB_TERMS_KEY); } catch { return true; }
  });
  const [termsChecked, setTermsChecked] = useState(false);
  const acceptClubTerms = () => {
    if (!termsChecked) return;
    try { localStorage.setItem(CLUB_TERMS_KEY, '1'); } catch {}
    setShowClubTerms(false);
  };

  // ── Club Lumi intro ──
  const CLUB_INTRO_KEY = `travelbae_club_intro_${trip.id}`;
  const [showClubIntro, setShowClubIntro] = useState(() => {
    try { return !localStorage.getItem(`travelbae_club_intro_${trip.id}`); } catch { return false; }
  });
  const dismissClubIntro = () => {
    try { localStorage.setItem(CLUB_INTRO_KEY, '1'); } catch {}
    setShowClubIntro(false);
  };

  // ── Location (Nominatim search + optional GPS reverse-geocode) ──
  const [locQuery, setLocQuery] = useState(() => {
    try {
      return localStorage.getItem(clubLocKey('loc_label')) || '';
    } catch {
      return '';
    }
  });
  const [locSuggestions, setLocSuggestions] = useState([]);
  const [locSearching, setLocSearching] = useState(false);
  const [locLabel, setLocLabel] = useState(() => {
    try {
      return localStorage.getItem(clubLocKey('loc_label')) || '';
    } catch {
      return '';
    }
  });
  const [myLat, setMyLat] = useState(() => {
    try {
      const v = localStorage.getItem(clubLocKey('loc_lat'));
      return v ? parseFloat(v) : null;
    } catch {
      return null;
    }
  });
  const [myLng, setMyLng] = useState(() => {
    try {
      const v = localStorage.getItem(clubLocKey('loc_lng'));
      return v ? parseFloat(v) : null;
    } catch {
      return null;
    }
  });
  const [locError, setLocError] = useState('');
  const [locDetecting, setLocDetecting] = useState(false);
  const [radius, setRadius] = useState(() => {
    try {
      const stored = localStorage.getItem(clubLocKey('radius')) || '25';
      return parseInt(stored, 10);
    } catch {
      return 25;
    }
  });
  const [debouncedRadius, setDebouncedRadius] = useState(radius);
  const locDebounce = useRef(null);

  const locationEnabled = myLat !== null && myLng !== null;

  const [profileForm, setProfileForm] = useState({
    title: '',
    about: '',
    lookingFor: '',
    photoUrls: [],
    vibe: 'mixed',
    genderMix: 'mixed',
    boysCount: '',
    girlsCount: '',
    coverTagsInput: '',
  });

  const fileRef = useRef(null);
  const chatThreadRef = useRef(null);
  const chatPhotoInputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedRadius(radius), 260);
    return () => clearTimeout(t);
  }, [radius]);

  // ── Nominatim locality search ──
  const searchLocality = useCallback(async (text) => {
    if (text.length < 2) { setLocSuggestions([]); return; }
    setLocSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=6&accept-language=en`,
        { headers: { 'User-Agent': 'TravelBae/1.0' } }
      );
      const data = await res.json();
      setLocSuggestions(data.slice(0, 6));
    } catch { setLocSuggestions([]); }
    setLocSearching(false);
  }, []);

  const pickLocSuggestion = useCallback((item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const a = item.address || {};
    const label = a.city || a.town || a.village || a.county || a.state_district || a.state || item.display_name.split(',')[0];
    setMyLat(lat); setMyLng(lng); setLocLabel(label); setLocQuery(label); setLocSuggestions([]);
    try {
      localStorage.setItem(clubLocKey('loc_lat'), String(lat));
      localStorage.setItem(clubLocKey('loc_lng'), String(lng));
      localStorage.setItem(clubLocKey('loc_label'), label);
    } catch {}
    setLocError('');
  }, [trip.id]);

  const detectGPS = useCallback(() => {
    if (!navigator.geolocation) { setLocError('Geolocation not supported.'); return; }
    setLocDetecting(true); setLocError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
            { headers: { 'User-Agent': 'TravelBae/1.0' } }
          );
          const data = await res.json();
          const a = data.address || {};
          const label = a.city || a.town || a.village || a.county || a.state_district || a.state || 'Your location';
          setMyLat(latitude); setMyLng(longitude); setLocLabel(label); setLocQuery(label); setLocSuggestions([]);
          try {
            localStorage.setItem(clubLocKey('loc_lat'), String(latitude));
            localStorage.setItem(clubLocKey('loc_lng'), String(longitude));
            localStorage.setItem(clubLocKey('loc_label'), label);
          } catch {}
          setLocError('');
        } catch { setLocError('Could not reverse-geocode your location.'); }
        setLocDetecting(false);
      },
      () => { setLocError('Permission denied. Search a locality manually.'); setLocDetecting(false); },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, [trip.id]);

  // Haversine distance in km
  const haversine = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);



  const loadHub = useCallback(async () => {
    setClubLoading(true);
    try {
      const params = { vibe: filters.vibe };
      const data = await getClubHub(trip.id, params);
      setHub(data);
      setProfileForm({
        title: data.myProfile?.title || trip.groupName,
        about: data.myProfile?.about || '',
        lookingFor: data.myProfile?.lookingFor || '',
        photoUrls: Array.isArray(data.myProfile?.photoUrls) && data.myProfile.photoUrls.length > 0
          ? data.myProfile.photoUrls
          : (data.myProfile?.photoUrl ? [data.myProfile.photoUrl] : []),
        vibe: data.myProfile?.vibe || 'mixed',
        genderMix: data.myProfile?.genderMix || 'mixed',
        boysCount: data.myProfile?.boysCount != null ? String(data.myProfile.boysCount) : '',
        girlsCount: data.myProfile?.girlsCount != null ? String(data.myProfile.girlsCount) : '',
        coverTagsInput: Array.isArray(data.myProfile?.coverTags) ? data.myProfile.coverTags.join(', ') : '',
      });
    } catch (err) {
      alert('Could not load club: ' + err.message);
    }
    setHubFetched(true);
    setClubLoading(false);
  }, [trip.id, trip.groupName, filters.vibe]);

  useEffect(() => { loadHub(); }, [loadHub]);

  const listed = (hub.myProfile?.status || 'snooze') === 'listed';

  const filteredDiscover = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return (hub.discover || []).filter(item => {
      if (item.status !== 'listed') return false;

      const members = item.trip?.members?.length || 0;
      if (filters.memberBand === '2plus' && members < 2) return false;
      if (filters.memberBand === '4plus' && members < 4) return false;
      if (filters.memberBand === '6plus' && members < 6) return false;

      if (filters.genderMix !== 'any' && (item.genderMix || 'mixed') !== filters.genderMix) return false;

      // Client-side Haversine distance filter
      if (locationEnabled && myLat !== null && myLng !== null) {
        const itemLat = item.latitude ?? item.trip?.latitude;
        const itemLng = item.longitude ?? item.trip?.longitude;
        // If the remote group has no coordinates, we can't verify proximity → exclude
        if (itemLat == null || itemLng == null) return false;
        if (haversine(myLat, myLng, itemLat, itemLng) > debouncedRadius) return false;
      }

      if (q) {
        const hay = [
          item.trip?.groupName || '',
          item.trip?.destination || '',
          item.about || '',
          item.lookingFor || '',
          item.vibe || '',
          ...(Array.isArray(item.coverTags) ? item.coverTags : []),
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [hub.discover, filters, locationEnabled, myLat, myLng, debouncedRadius, haversine]);

  const handleToggle = async () => {
    setClubBusy(true);
    try {
      await updateClubStatus(trip.id, listed ? 'snooze' : 'listed');
      await loadHub();
    } catch (err) {
      alert('Could not change status: ' + err.message);
    }
    setClubBusy(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if ((profileForm.photoUrls || []).length >= 3) return;
    if (e.target) e.target.value = '';
    setProfilePhotoUploading(true);
    try {
      const auth = await imagekitAuth();
      const fileName = `club_${trip.id}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const form = new FormData();
      form.append('file', file);
      form.append('fileName', fileName);
      form.append('folder', `/tb-club/${trip.id}`);
      form.append('useUniqueFileName', 'false');
      form.append('publicKey', auth.publicKey);
      form.append('signature', auth.signature);
      form.append('expire', String(auth.expire));
      form.append('token', auth.token);
      const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!data.url) throw new Error('Upload failed');
      setProfileForm((f) => ({ ...f, photoUrls: [...(f.photoUrls || []).slice(0, 2), data.url] }));
    } catch (err) {
      alert('Photo upload failed: ' + err.message);
    }
    setProfilePhotoUploading(false);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.title.trim() || !profileForm.about.trim()) {
      alert('Please fill title and about.');
      return;
    }

    const safeTags = profileForm.coverTagsInput
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 8);

    setClubBusy(true);
    try {
      await upsertClubProfile(trip.id, {
        title: profileForm.title,
        about: profileForm.about,
        lookingFor: profileForm.lookingFor,
        photoUrl: (profileForm.photoUrls || [])[0] || null,
        photoUrls: profileForm.photoUrls || [],
        vibe: profileForm.vibe,
        genderMix: profileForm.genderMix,
        boysCount: profileForm.boysCount === '' ? null : Number(profileForm.boysCount),
        girlsCount: profileForm.girlsCount === '' ? null : Number(profileForm.girlsCount),
        coverTags: safeTags,
        latitude: myLat,
        longitude: myLng,
      });
      await loadHub();
      setClubView('discover');
    } catch (err) {
      alert('Could not save profile: ' + err.message);
    }
    setClubBusy(false);
  };

  const handleSendRequest = async () => {
    if (!requestFor || !requestMessage.trim()) return;
    setClubBusy(true);
    try {
      await sendClubRequest(trip.id, requestFor, requestMessage.trim());
      setRequestFor(null);
      setRequestMessage('');
      await loadHub();
    } catch (err) {
      alert('Could not send request: ' + err.message);
    }
    setClubBusy(false);
  };

  const handleRequestAction = async (requestId, action) => {
    setClubBusy(true);
    try {
      const result = await respondClubRequest(trip.id, requestId, action);
      await loadHub();
      if (action === 'accepted' && result.chat) {
        setSelectedChatId(result.chat.id);
        setClubView('chats');
      }
    } catch (err) {
      alert('Could not update request: ' + err.message);
    }
    setClubBusy(false);
  };

  const handleSendChat = async () => {
    if (!activeChat || !chatDraft.trim()) return;
    setClubBusy(true);
    try {
      await sendClubChatMessage(trip.id, activeChat.id, chatDraft.trim());
      setChatDraft('');
      await loadHub();
      setSelectedChatId(activeChat.id);
      setClubView('chats');
    } catch (err) {
      alert('Could not send chat message: ' + err.message);
    }
    setClubBusy(false);
  };

  const handleChatKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!clubBusy && chatDraft.trim()) handleSendChat();
    }
  };

  const handleDeleteChat = async () => {
    if (!activeChat) return;
    if (!confirm('Delete this chat and all associated messages?')) return;
    setClubBusy(true);
    try {
      await deleteClubChat(trip.id, activeChat.id);
      setSelectedChatId(null);
      await loadHub();
    } catch (err) {
      alert('Could not delete chat: ' + err.message);
    }
    setClubBusy(false);
  };

  const handleToggleSplitMember = (memberId) => {
    setSplitDraft((draft) => {
      const exists = draft.splitWith.includes(memberId);
      return {
        ...draft,
        splitWith: exists ? draft.splitWith.filter(id => id !== memberId) : [...draft.splitWith, memberId],
      };
    });
  };

  const handleAddSplitEntry = async () => {
    if (!activeChat) return;
    const amount = Number(splitDraft.amount);
    if (!splitDraft.desc.trim() || !Number.isFinite(amount) || amount <= 0 || splitDraft.splitWith.length === 0 || !splitDraft.paidBy) {
      alert('Add a valid split with description, amount, payer, and at least one participant.');
      return;
    }
    setClubBusy(true);
    try {
      await createClubChatSplitExpense(trip.id, activeChat.id, {
        desc: splitDraft.desc.trim(),
        amount,
        paidByKey: splitDraft.paidBy,
        splitWithKeys: splitDraft.splitWith,
      });
      await loadHub();
      if (onTripRefresh) {
        await onTripRefresh();
      }
      setSplitDraft((draft) => ({
        ...draft,
        desc: '',
        amount: '',
        splitWith: combinedMembers.map(member => member.id),
      }));
      setSplitFormOpen(false);
      setSplitSection('expenses');
    } catch (err) {
      alert('Could not add split expense: ' + err.message);
    } finally {
      setClubBusy(false);
    }
  };

  const handleDeleteSplitEntry = async (entryId) => {
    if (!activeChat) return;
    if (!confirm('Delete this split expense?')) return;
    setClubBusy(true);
    try {
      await deleteClubChatSplitExpense(trip.id, activeChat.id, entryId);
      await loadHub();
      if (onTripRefresh) {
        await onTripRefresh();
      }
    } catch (err) {
      alert('Could not delete split expense: ' + err.message);
    } finally {
      setClubBusy(false);
    }
  };

  const handleSplitTouchStart = (entryId, event) => {
    const touch = event.touches?.[0];
    if (!touch) return;
    setSplitTouch({ entryId, startX: touch.clientX, deltaX: 0, startAt: Date.now() });
  };

  const handleSplitTouchMove = (entryId, event) => {
    if (splitTouch.entryId !== entryId) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    const delta = Math.max(-86, Math.min(0, touch.clientX - splitTouch.startX));
    setSplitTouch((prev) => ({ ...prev, deltaX: delta }));
  };

  const handleSplitTouchEnd = (entryId) => {
    if (splitTouch.entryId !== entryId) return;
    const elapsed = Math.max(1, Date.now() - (splitTouch.startAt || Date.now()));
    const velocity = splitTouch.deltaX / elapsed; // px/ms, negative when swiping left
    const fastLeftFlick = velocity <= -0.7;
    const hardDeleteFlick = velocity <= -1.1;

    if ((splitSwipeOpenId === entryId && splitTouch.deltaX <= -70) || (splitSwipeOpenId === entryId && hardDeleteFlick)) {
      if (navigator.vibrate) navigator.vibrate(12);
      void handleDeleteSplitEntry(entryId);
      setSplitSwipeOpenId(null);
    } else if (splitTouch.deltaX <= -52 || fastLeftFlick) {
      setSplitSwipeOpenId(entryId);
      if (navigator.vibrate) navigator.vibrate(8);
    } else {
      setSplitSwipeOpenId(null);
    }
    setSplitTouch({ entryId: null, startX: 0, deltaX: 0, startAt: 0 });
  };

  const openToolsChooser = () => {
    if (!activeChat) return;
    setToolsChooserOpen(true);
  };

  const openToolScreen = (tool) => {
    setChatTool(tool);
    setToolsChooserOpen(false);
    setToolScreenOpen(true);
    if (tool === 'split' && combinedMembers.length > 0) {
      setSplitDraft((draft) => ({
        ...draft,
        paidBy: draft.paidBy || combinedMembers[0].id,
        splitWith: draft.splitWith.length ? draft.splitWith : combinedMembers.map(member => member.id),
      }));
    }
  };

  const processChatToolPhotoFiles = async (files) => {
    const imageFiles = (files || []).filter((file) => file.type?.startsWith('image/'));
    if (!imageFiles.length) return;
    setChatPhotoUploading(true);
    setChatPhotoProgress(0);
    try {
      let auth = null;
      try { auth = await imagekitAuth(); } catch (e) {
        console.error('IK auth failed', e);
        setChatPhotoUploading(false);
        return;
      }
      for (let i = 0; i < imageFiles.length; i += 1) {
        try {
          const file = imageFiles[i];
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const fileName = `club_chat_${trip.id}_${Date.now()}_${i}_${safeName}`;

          const form = new FormData();
          form.append('file', file);
          form.append('fileName', fileName);
          form.append('folder', `/tb-club-chat/${trip.id}`);
          form.append('useUniqueFileName', 'false');
          form.append('publicKey', auth.publicKey);
          form.append('signature', auth.signature);
          form.append('expire', String(auth.expire));
          form.append('token', auth.token);

          const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: form });
          const uploadData = await uploadRes.json();

          if (!uploadData.url) {
            console.error('Club chat IK upload error', uploadData);
            continue;
          }

          await addPhoto(trip.id, uploadData.url);
          setChatPhotoProgress(Math.round(((i + 1) / imageFiles.length) * 100));
        } catch (fileErr) {
          console.error('Club chat per-file upload error:', fileErr);
        }
      }

      try {
        await loadHub();
      } catch (refreshErr) {
        console.warn('Could not refresh club hub after upload:', refreshErr);
      }
      // Keep the user in the photo tool screen by avoiding parent-level remount/reset.
      // Club hub refresh is sufficient to show the newly uploaded images here.
    } catch (err) {
      alert('Could not upload photo(s): ' + getErrorMessage(err, 'Unknown upload error'));
    } finally {
      setChatPhotoUploading(false);
      setChatPhotoProgress(0);
      if (chatPhotoInputRef.current) chatPhotoInputRef.current.value = '';
      setChatPhotoDragging(false);
    }
  };

  const handleChatToolPhotoUpload = (event) => {
    const files = Array.from(event.target.files || []);
    void processChatToolPhotoFiles(files);
  };

  const handleChatToolPhotoDrop = (event) => {
    event.preventDefault();
    setChatPhotoDragging(false);
    const files = Array.from(event.dataTransfer?.files || []).filter((file) => file.type?.startsWith('image/'));
    if (!files.length) return;
    void processChatToolPhotoFiles(files);
  };

  const toggleChatPhotoSelection = (photoId) => {
    setChatPhotoSelected((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const clearChatPhotoSelection = () => setChatPhotoSelected(new Set());

  const downloadSelectedChatPhotos = async () => {
    for (const photo of selectedChatPhotos) {
      try {
        const res = await fetch(photo.url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = photo.url.split('/').pop() || `photo-${photo.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } catch {
        window.open(photo.url, '_blank');
      }
    }
  };

  const deleteSelectedChatPhotos = async () => {
    if (!canDeleteSelectedChatPhotos) return;
    if (!confirm('Delete selected photos from your trip album?')) return;
    setClubBusy(true);
    try {
      for (const photo of selectedChatPhotos) {
        const storagePath = extractStoragePathFromPublicUrl(photo.url);
        if (storagePath) await supabase.storage.from('trip-photos').remove([storagePath]);
        await deletePhoto(trip.id, photo.id);
      }
      try {
        await loadHub();
      } catch (refreshErr) {
        console.warn('Could not refresh club hub after delete:', refreshErr);
      }
      clearChatPhotoSelection();
    } catch (err) {
      alert('Could not delete selected photos: ' + getErrorMessage(err, 'Unknown delete error'));
    } finally {
      setClubBusy(false);
    }
  };

  const applyFilters = () => {
    setFilters(filterDraft);
    setFiltersOpen(false);
  };

  const selectedAlreadySent = selectedCard
    ? hub.outgoingRequests.some(r => r.targetTripId === selectedCard.tripId && r.status === 'pending')
    : false;

  const activeChat = useMemo(
    () => (hub.chats || []).find(chat => chat.id === selectedChatId) || null,
    [hub.chats, selectedChatId]
  );

  const combinedMembers = useMemo(() => buildCombinedMembers(activeChat), [activeChat]);
  const combinedPhotos = useMemo(() => buildCombinedPhotos(activeChat), [activeChat]);
  const chatPhotoFolders = useMemo(() => {
    const folderMap = { all: combinedPhotos };
    combinedPhotos.forEach((photo) => {
      const source = photo.source || 'Shared';
      if (!folderMap[source]) folderMap[source] = [];
      folderMap[source].push(photo);
    });
    return folderMap;
  }, [combinedPhotos]);
  const chatFolderPhotos = useMemo(() => {
    if (chatPhotoFolder === 'all') return combinedPhotos;
    return chatPhotoFolders[chatPhotoFolder] || [];
  }, [chatPhotoFolder, chatPhotoFolders, combinedPhotos]);
  const selectedChatPhotos = useMemo(
    () => chatFolderPhotos.filter(photo => chatPhotoSelected.has(photo.id)),
    [chatFolderPhotos, chatPhotoSelected]
  );
  const canDeleteSelectedChatPhotos = useMemo(
    () => selectedChatPhotos.length > 0,
    [selectedChatPhotos]
  );
  const splitEntries = useMemo(() => activeChat?.splitExpenses || [], [activeChat]);
  const splitBalances = useMemo(
    () => computeSplitBalances(combinedMembers, splitEntries),
    [combinedMembers, splitEntries]
  );
  const splitMemberById = useMemo(
    () => Object.fromEntries(combinedMembers.map(member => [member.id, member])),
    [combinedMembers]
  );
  const splitSettlements = useMemo(() => buildSettlementsFromBalances(splitBalances), [splitBalances]);
  const splitPayTotals = useMemo(() => {
    const totals = {};
    combinedMembers.forEach((member) => {
      totals[member.id] = 0;
    });
    splitEntries.forEach((entry) => {
      const payerKey = entry.paidByKey || entry.paidBy;
      if (!payerKey) return;
      totals[payerKey] = (totals[payerKey] || 0) + (Number(entry.amount) || 0);
    });
    return totals;
  }, [combinedMembers, splitEntries]);

  const selectedGallery = useMemo(() => buildCardGallery(selectedCard), [selectedCard]);

  const unreadCountByChat = useMemo(() => {
    const map = {};
    (hub.chats || []).forEach((chat) => {
      const latest = chat.latestMessage;
      map[chat.id] = latest && latest.senderTripId !== trip.id ? 1 : 0;
    });
    return map;
  }, [hub.chats, trip.id]);

  const hasUnreadChats = useMemo(
    () => Object.values(unreadCountByChat).some(Boolean),
    [unreadCountByChat]
  );

  useEffect(() => {
    setSelectedMediaIndex(0);
  }, [selectedCard?.id]);

  useEffect(() => {
    if (!hub.chats?.length) {
      setSelectedChatId(null);
      return;
    }
    if (selectedChatId && !hub.chats.some(chat => chat.id === selectedChatId)) {
      setSelectedChatId(null);
    }
  }, [hub.chats, selectedChatId]);

  useEffect(() => {
    setChatPhotoFolder('all');
    setChatPhotoLightbox(null);
    setChatPhotoSelected(new Set());
  }, [activeChat?.id]);

  useEffect(() => {
    if (!combinedMembers.length) {
      setSplitDraft({ desc: '', amount: '', paidBy: '', splitWith: [] });
      return;
    }
    setSplitDraft((draft) => ({
      desc: draft.desc,
      amount: draft.amount,
      paidBy: draft.paidBy || combinedMembers[0].id,
      splitWith: draft.splitWith.length ? draft.splitWith : combinedMembers.map(member => member.id),
    }));
  }, [combinedMembers]);

  useEffect(() => {
    if (!selectedCard || selectedGallery.length <= 1) return undefined;
    const timer = setInterval(() => {
      setSelectedMediaIndex((current) => (current + 1) % selectedGallery.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [selectedCard, selectedGallery]);

  useEffect(() => {
    if (!activeChat || !chatThreadRef.current) return;
    chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight;
  }, [activeChat?.id, activeChat?.messages?.length]);

  const premiumPanel = {
    background: 'linear-gradient(160deg,rgba(255,255,255,0.72),rgba(243,250,255,0.46))',
    border: '1px solid rgba(255,255,255,0.7)',
    borderRadius: 34,
    padding: '1rem .95rem',
    marginBottom: '0.9rem',
    boxShadow: '0 24px 46px rgba(17,24,39,0.10)',
    backdropFilter: 'blur(14px)',
  };


  return (
    <div>
      <style>{`
        @keyframes clubPop {
          from { opacity: 0; transform: translateY(6px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes clubCardIn {
          from { opacity: 0; transform: translateY(14px) scale(.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes clubSheetIn {
          from { opacity: 0; transform: translateY(28px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes clubFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes clubFloat {
          0% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(-6px,8px,0); }
          100% { transform: translate3d(0,0,0); }
        }
        @keyframes clubPulse {
          0% { box-shadow: 0 0 0 0 rgba(103,255,186,0.25); }
          70% { box-shadow: 0 0 0 10px rgba(103,255,186,0); }
          100% { box-shadow: 0 0 0 0 rgba(103,255,186,0); }
        }
        @keyframes clubRingIn {
          from { opacity: 0; transform: scale(.82) rotate(-90deg); }
          to { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes clubSectionIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes clubShine {
          0% { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
          20% { opacity: .35; }
          60% { transform: translateX(220%) skewX(-18deg); opacity: 0; }
          100% { transform: translateX(220%) skewX(-18deg); opacity: 0; }
        }
        @keyframes clubNeonGlow {
          0%,100% { box-shadow: 0 0 28px rgba(247,37,133,0.28), 0 0 56px rgba(76,201,240,0.12), 0 8px 40px rgba(11,6,25,0.7); }
          35% { box-shadow: 0 0 48px rgba(247,37,133,0.48), 0 0 80px rgba(76,201,240,0.22), 0 16px 60px rgba(11,6,25,0.8); }
          70% { box-shadow: 0 0 36px rgba(114,9,183,0.4), 0 0 64px rgba(247,37,133,0.2), 0 12px 50px rgba(11,6,25,0.75); }
        }
        @keyframes clubHeroShift {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes clubOrb1 {
          0%,100% { transform: translate(0,0) scale(1); opacity:.8; }
          33% { transform: translate(-18px,14px) scale(1.12); opacity:1; }
          66% { transform: translate(12px,-10px) scale(0.92); opacity:.7; }
        }
        @keyframes clubOrb2 {
          0%,100% { transform: translate(0,0) scale(1); opacity:.7; }
          40% { transform: translate(16px,-18px) scale(1.08); opacity:1; }
          75% { transform: translate(-10px,14px) scale(1.04); opacity:.8; }
        }
        @keyframes clubNeonScan {
          0% { transform: translateX(-140%) skewX(-12deg); opacity:0; }
          12% { opacity:1; }
          88% { opacity:1; }
          100% { transform: translateX(280%) skewX(-12deg); opacity:0; }
        }
        @keyframes clubTagPop {
          from { opacity:0; transform:scale(0.8) translateY(6px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @media (hover: hover) {
          button[data-club-card='true']:hover {
            transform: translateY(-4px);
            box-shadow: 0 24px 54px rgba(16,24,40,0.14);
          }
        }
        .club-chat-thread {
          background-image: radial-gradient(rgba(15,110,86,0.05) 1.5px, transparent 1.5px);
          background-size: 20px 20px;
        }
      `}</style>

      {/* ── Lumi intro popup (first-time, shows before T&C) ── */}
      {showClubIntro && (
        <div style={{ position:'fixed', inset:0, background:'rgba(28,20,16,0.55)', backdropFilter:'blur(6px)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.25rem', animation:'clubFadeIn .22s ease both' }}>
          <div style={{ background:'#fff', borderRadius:24, overflow:'hidden', width:'100%', maxWidth:400, boxShadow:'0 28px 80px rgba(28,20,16,0.28)', animation:'clubSheetIn .45s cubic-bezier(0.34,1.3,0.64,1) both', position:'relative' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ height:4, background:'linear-gradient(90deg,#FF6A00,#FF8C3B,#FF6A00)' }} />
            <button onClick={dismissClubIntro} style={{ position:'absolute', top:14, right:14, width:28, height:28, borderRadius:'50%', border:'none', background:'#F3F4F6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, zIndex:1 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div style={{ display:'flex', alignItems:'center', padding:'1.25rem 1.25rem 1rem', gap:14 }}>
              <div style={{ width:92, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <img src={lumiMood3} alt="Lumi" style={{ width:86, height:116, objectFit:'contain', display:'block' }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'#FFF3EB', borderRadius:999, padding:'3px 9px', marginBottom:8 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:'#FF6A00' }} />
                  <span style={{ fontSize:9.5, fontWeight:700, color:'#FF6A00', letterSpacing:.8, textTransform:'uppercase', fontFamily:"'DM Sans',sans-serif" }}>Lumi says</span>
                </div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, color:'#1C1410', lineHeight:1.25, marginBottom:7 }}>
                  Find your travel tribe
                </div>
                <div style={{ fontSize:12, color:'#5C504A', lineHeight:1.62, marginBottom:10 }}>
                  Looking to travel with people you actually like? Club lets you discover groups heading to your destination, check out their vibe, and send a join request. Travel tribe, acquired.
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[
                    'Discover trip groups matching your travel vibe',
                    'See member count, destination & travel style',
                    'Send a join request and chat before you go',
                  ].map((f, i) => (
                    <div key={i} style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
                      <div style={{ width:15, height:15, borderRadius:4, background:'#FFF3EB', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                        <svg width="8" height="8" viewBox="0 0 12 10" fill="none"><polyline points="1,5 4,8 11,1" stroke="#FF6A00" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <span style={{ fontSize:11.5, color:'#5C504A', lineHeight:1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding:'0 1.25rem 1.25rem' }}>
              <button onClick={dismissClubIntro} style={{ width:'100%', padding:'13px', fontSize:14, fontWeight:700, borderRadius:14, border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", background:'linear-gradient(135deg,#FF6A00,#FF8C3B)', color:'#fff', boxShadow:'0 4px 16px rgba(255,106,0,0.3)' }}>
                Find my people 🌍
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── T&C First-time gate ── */}
      {showClubTerms && !showClubIntro && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(12,18,14,0.72)', backdropFilter: 'blur(7px)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', animation: 'clubFadeIn .2s ease both' }}>
          <div style={{ background: '#fff', borderRadius: 24, overflow: 'hidden', width: '100%', maxWidth: 380, boxShadow: '0 28px 80px rgba(12,18,14,0.32)', animation: 'clubSheetIn .35s cubic-bezier(0.34,1.3,0.64,1) both' }}>
            {/* accent bar */}
            <div style={{ height: 4, background: 'linear-gradient(90deg,#1D9E75,#0F6E56)' }} />
            <div style={{ padding: '1.5rem 1.5rem 1.25rem' }}>
              {/* icon */}
              <div style={{ width: 52, height: 52, borderRadius: 17, background: 'linear-gradient(135deg,#1D9E75,#0F6E56)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: '0 6px 20px rgba(29,158,117,0.28)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 800, color: '#1C1410', marginBottom: 8, lineHeight: 1.2 }}>Welcome to Club</div>
              <div style={{ fontSize: 12.5, color: '#5C504A', lineHeight: 1.75, marginBottom: 16 }}>
                By joining Club, you acknowledge that all interactions with other members are <strong style={{ color: '#1C1410' }}>voluntary and at your own discretion</strong>. While we strive to maintain a safe and respectful community, we do not verify the identity, background, intentions, or conduct of users.
                <br /><br />
                Any communication, meetup, or relationship that occurs through or outside the platform is solely between the participating individuals. <strong style={{ color: '#1C1410' }}>You are responsible for exercising appropriate caution and judgment</strong> when interacting with others. To the maximum extent permitted by law, we are not liable for any disputes, damages, or incidents arising from user interactions, whether online or offline.
              </div>
              {/* checkbox */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '12px 14px', borderRadius: 14, background: termsChecked ? '#EBF3EC' : '#F4F2EE', border: `1.5px solid ${termsChecked ? '#1D9E75' : 'rgba(28,20,16,0.1)'}`, marginBottom: 16, transition: 'all .18s' }}>
                <div onClick={() => setTermsChecked(v => !v)} style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${termsChecked ? '#1D9E75' : 'rgba(28,20,16,0.25)'}`, background: termsChecked ? '#1D9E75' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all .15s', cursor: 'pointer' }}>
                  {termsChecked && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1C1410', lineHeight: 1.6 }}>
                  I understand that interactions with other Club members are at my own discretion and risk, and I agree to the <span style={{ color: '#0F6E56', textDecoration: 'underline' }}>Club Terms &amp; Safety Guidelines</span>.
                </span>
              </label>
              <button
                onClick={acceptClubTerms}
                disabled={!termsChecked}
                style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, borderRadius: 14, border: 'none', cursor: termsChecked ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans',sans-serif", background: termsChecked ? 'linear-gradient(135deg,#1D9E75,#0F6E56)' : '#E0E0E0', color: termsChecked ? '#fff' : '#9E9E9E', boxShadow: termsChecked ? '0 4px 16px rgba(29,158,117,0.3)' : 'none', transition: 'all .2s' }}
              >
                I agree — enter Club
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero card ── */}
      {/* outer wrapper holds shadow — inner card clips content with overflow:hidden */}
      <div style={{ margin:'1rem 1rem 1rem', borderRadius:24, boxShadow:'0 8px 36px rgba(123,47,247,0.22), 0 2px 12px rgba(0,0,0,0.10)' }}>
        <div style={{ position:'relative', borderRadius:24, overflow:'hidden', background:'linear-gradient(145deg,#7B2FF7 0%,#C01FAB 40%,#FF416C 72%,#FF9E00 100%)', backgroundSize:'200% 200%', animation:'clubHeroShift 8s ease-in-out infinite' }}>
          {/* orb 1 — top-right warm white */}
          <div style={{ position:'absolute', top:-40, right:-30, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,255,255,0.22) 0%,transparent 65%)', zIndex:1, pointerEvents:'none', animation:'clubOrb1 7s ease-in-out infinite' }} />
          {/* orb 2 — bottom-left gold */}
          <div style={{ position:'absolute', bottom:-45, left:-20, width:155, height:155, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,220,100,0.28) 0%,transparent 65%)', zIndex:1, pointerEvents:'none', animation:'clubOrb2 10s ease-in-out infinite 2s' }} />
          {/* dot grid */}
          <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle,rgba(255,255,255,0.12) 1px,transparent 1px)', backgroundSize:'18px 18px', zIndex:2, pointerEvents:'none' }} />
          {/* very light scrim so text stays crisp */}
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(175deg,rgba(0,0,0,0.18) 0%,rgba(0,0,0,0.06) 50%,rgba(0,0,0,0.22) 100%)', zIndex:3 }} />
          {/* shimmer */}
          <div style={{ position:'absolute', top:0, bottom:0, width:'40%', background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)', zIndex:4, animation:'clubNeonScan 7s ease-in-out infinite 1.5s', pointerEvents:'none' }} />
          {/* content */}
          <div style={{ position:'relative', zIndex:5, padding:'1.3rem 1.2rem 1.2rem', textAlign:'center' }}>
            {/* ⓘ Lumi info button */}
            <button onClick={() => setShowClubIntro(true)} title="About Club" style={{ position:'absolute', top:10, right:10, width:26, height:26, borderRadius:'50%', border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:6, padding:0 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            </button>
            <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'2.8px', marginBottom:10 }}>✦ TRIPBAE CLUB ✦</div>
            <img src={bglessLogo} alt="TripBae" style={{ height:76, width:'auto', objectFit:'contain', display:'block', margin:'0 auto 5px', filter:'brightness(0) invert(1) drop-shadow(0 2px 14px rgba(0,0,0,0.28))', opacity:0.97 }} />
            <div style={{ fontFamily:"'Sora',sans-serif", fontSize:12.5, fontWeight:700, color:'rgba(255,255,255,0.88)', letterSpacing:'0.4px', fontStyle:'italic', marginBottom:16 }}>find your people.</div>
            {/* requests pill only */}
            {hub.incomingRequests.length > 0 && (
              <div style={{ display:'flex', justifyContent:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,220,80,0.3)', border:'1px solid rgba(255,220,80,0.6)', borderRadius:99, padding:'5px 14px', backdropFilter:'blur(8px)', animation:'clubTagPop .4s cubic-bezier(0.34,1.4,0.64,1) both .1s, clubPulse 2.2s ease-in-out infinite 1s' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <span style={{ fontFamily:"'Sora',sans-serif", fontSize:12, fontWeight:800, color:'#fff' }}>{hub.incomingRequests.length} new {hub.incomingRequests.length === 1 ? 'request' : 'requests'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Underline tabs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1.5px solid rgba(15,23,42,0.1)', marginBottom: '0.75rem', marginTop: 0 }}>
        {[
          { id: 'discover', label: 'Discover' },
          { id: 'profile', label: 'Profile' },
          { id: 'requests', label: 'Requests', count: hub.incomingRequests.length },
          { id: 'chats', label: 'Chats', count: hub.chats?.length || 0, unread: hasUnreadChats },
        ].map(({ id: tabId, label, count, unread }) => (
          <button
            key={tabId}
            onClick={() => { setClubView(tabId); if (tabId === 'chats') setSelectedChatId(null); }}
            style={{
              ...S.navTab,
              ...(clubView === tabId ? S.navTabActive : {}),
              position: 'relative',
              padding: '9px 2px 10px',
              fontSize: 11,
              flexDirection: 'column',
              gap: 1,
              borderRadius: 0,
            }}
          >
            <span style={{ fontWeight: clubView === tabId ? 700 : 500, fontSize: 11 }}>
              {label}{count ? ` (${count})` : ''}
            </span>
            {unread && (
              <span style={{ position: 'absolute', top: 9, right: '26%', width: 6, height: 6, borderRadius: '50%', background: '#FFB020' }} />
            )}
            {clubView === tabId && (
              <span style={{ position: 'absolute', bottom: 0, left: '12%', right: '12%', height: 2.5, borderRadius: '99px 99px 0 0', background: '#111827' }} />
            )}
          </button>
        ))}
      </div>

      {clubView === 'profile' && (
        <div style={{ animation: 'clubPop .25s ease-out both', paddingBottom: 32 }}>
          {/* Header */}
          <div style={{ padding: '0 0 18px' }}>
            <div style={{ fontFamily:"'Sora',sans-serif", fontWeight:800, fontSize:20, color:'#111827', marginBottom:4 }}>Your Discovery Card</div>
            <div style={{ fontSize:13, color:'#6B7280' }}>This is how other groups see you. Make it real.</div>
          </div>

          {/* Photo stack — Hinge style */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:10 }}>Group Photos · {(profileForm.photoUrls||[]).length}/3</div>
            <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4 }}>
              {(profileForm.photoUrls||[]).map((url, i) => (
                <div key={url} style={{ position:'relative', flexShrink:0 }}>
                  <img src={url} alt={`photo ${i+1}`} style={{ width:120, height:160, borderRadius:18, objectFit:'cover', display:'block', boxShadow:'0 8px 24px rgba(0,0,0,0.12)' }} />
                  <button type="button" onClick={() => setProfileForm(f => ({ ...f, photoUrls: f.photoUrls.filter((_,j) => j !== i) }))}
                    style={{ position:'absolute', top:-8, right:-8, width:24, height:24, borderRadius:'50%', border:'2px solid #fff', background:'#EF4444', color:'#fff', fontSize:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, boxShadow:'0 2px 8px rgba(0,0,0,0.2)' }}>✕</button>
                  {i === 0 && <div style={{ position:'absolute', bottom:8, left:8, fontSize:9, fontWeight:800, color:'#fff', background:'rgba(0,0,0,0.5)', padding:'2px 7px', borderRadius:99, backdropFilter:'blur(6px)' }}>COVER</div>}
                </div>
              ))}
              {(profileForm.photoUrls||[]).length < 3 && (
                <button type="button" onClick={() => !profilePhotoUploading && fileRef.current?.click()}
                  style={{ width:120, height:160, borderRadius:18, background:profilePhotoUploading?'#FAF7FF':'#F9FAFB', border:profilePhotoUploading?'2px dashed #C4B5FD':'2px dashed #D1D5DB', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, cursor:profilePhotoUploading?'not-allowed':'pointer', flexShrink:0, color:profilePhotoUploading?'#7B2FF7':'#9CA3AF' }}>
                  {profilePhotoUploading
                    ? <div style={{ width:24, height:24, borderRadius:'50%', border:'2.5px solid rgba(123,47,247,0.18)', borderTopColor:'#7B2FF7', animation:'clubSpin .75s linear infinite' }} />
                    : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                  }
                  <span style={{ fontSize:11, fontWeight:600 }}>{profilePhotoUploading?'Uploading…':'Add photo'}</span>
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhotoUpload} />
            <div style={{ fontSize:11, color:'#9CA3AF', marginTop:6 }}>First photo is your cover. Swipeable in your card.</div>
          </div>

          {/* Hinge-style field blocks */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* Title */}
            <div style={{ background:'#fff', border:'1.5px solid #E5E7EB', borderRadius:18, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ padding:'12px 16px 0', fontSize:10, fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.8px' }}>Group Name</div>
              <input style={{ width:'100%', border:'none', outline:'none', padding:'6px 16px 14px', fontSize:15, fontWeight:600, color:'#111827', background:'transparent', fontFamily:"'DM Sans',sans-serif" }}
                value={profileForm.title} onChange={e => setProfileForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. The Goa Gobsmackers" />
            </div>
            {/* About */}
            <div style={{ background:'#fff', border:'1.5px solid #E5E7EB', borderRadius:18, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ padding:'12px 16px 0', fontSize:10, fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.8px' }}>About your group</div>
              <textarea style={{ width:'100%', border:'none', outline:'none', padding:'6px 16px 14px', fontSize:14, color:'#374151', background:'transparent', resize:'vertical', minHeight:90, fontFamily:"'DM Sans',sans-serif", lineHeight:1.6 }}
                value={profileForm.about} onChange={e => setProfileForm(f => ({ ...f, about: e.target.value }))} placeholder="Tell people who you are. Energy, vibe, what makes your group fun…" />
            </div>
            {/* Looking for */}
            <div style={{ background:'#fff', border:'1.5px solid #E5E7EB', borderRadius:18, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ padding:'12px 16px 0', fontSize:10, fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.8px' }}>What you want to do together</div>
              <input style={{ width:'100%', border:'none', outline:'none', padding:'6px 16px 14px', fontSize:14, color:'#374151', background:'transparent', fontFamily:"'DM Sans',sans-serif" }}
                value={profileForm.lookingFor} onChange={e => setProfileForm(f => ({ ...f, lookingFor: e.target.value }))} placeholder="Rooftop bar, street food crawl, night market…" />
            </div>
            {/* Vibe + Mix */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div style={{ background:'#fff', border:'1.5px solid #E5E7EB', borderRadius:18, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ padding:'12px 14px 0', fontSize:10, fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.8px' }}>Vibe</div>
                <select style={{ width:'100%', border:'none', outline:'none', padding:'6px 14px 12px', fontSize:14, color:'#374151', background:'transparent', fontFamily:"'DM Sans',sans-serif", cursor:'pointer' }}
                  value={profileForm.vibe} onChange={e => setProfileForm(f => ({ ...f, vibe: e.target.value }))}>
                  {VIBE_OPTIONS.filter(v => v.value !== 'any').map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              </div>
              <div style={{ background:'#fff', border:'1.5px solid #E5E7EB', borderRadius:18, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ padding:'12px 14px 0', fontSize:10, fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.8px' }}>Group mix</div>
                <select style={{ width:'100%', border:'none', outline:'none', padding:'6px 14px 12px', fontSize:14, color:'#374151', background:'transparent', fontFamily:"'DM Sans',sans-serif", cursor:'pointer' }}
                  value={profileForm.genderMix} onChange={e => setProfileForm(f => ({ ...f, genderMix: e.target.value }))}>
                  {GENDER_MIX_OPTIONS.filter(g => g.value !== 'any').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
            </div>
            {/* Tags */}
            <div style={{ background:'#fff', border:'1.5px solid #E5E7EB', borderRadius:18, overflow:'hidden', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ padding:'12px 16px 0', fontSize:10, fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.8px' }}>Interests (comma separated)</div>
              <input style={{ width:'100%', border:'none', outline:'none', padding:'6px 16px 14px', fontSize:14, color:'#374151', background:'transparent', fontFamily:"'DM Sans',sans-serif" }}
                value={profileForm.coverTagsInput} onChange={e => setProfileForm(f => ({ ...f, coverTagsInput: e.target.value }))} placeholder="late-night, photography, street-food, cycling" />
            </div>
          </div>

          {/* Location picker */}
          <div style={{ marginTop:14, background:'#FAF7FF', border:'1px solid rgba(123,47,247,0.18)', borderRadius:18, padding:'14px 16px' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#7B2FF7', textTransform:'uppercase', letterSpacing:0.4, marginBottom:8 }}>📍 Your Location</div>
            {locLabel ? (
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ flex:1, fontSize:14, fontWeight:600, color:'#0F172A' }}>📍 {locLabel}</div>
                <button type="button" onClick={() => { setLocLabel(''); setLocQuery(''); setMyLat(null); setMyLng(null); try { localStorage.removeItem(clubLocKey('loc_lat')); localStorage.removeItem(clubLocKey('loc_lng')); localStorage.removeItem(clubLocKey('loc_label')); } catch {} }}
                  style={{ fontSize:12, color:'#6B7280', background:'#E5E7EB', border:'none', borderRadius:99, padding:'5px 12px', cursor:'pointer', fontWeight:600 }}>Change</button>
              </div>
            ) : (
              <>
                <div style={{ position:'relative', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fff', borderRadius:12, border:'1px solid rgba(0,0,0,0.12)', padding:'0 10px' }}>
                    <span style={{ fontSize:14 }}>🔍</span>
                    <input style={{ border:'none', background:'transparent', flex:1, padding:'10px 0', fontSize:14, outline:'none' }}
                      placeholder="Type your city…" value={locQuery}
                      onChange={e => { setLocQuery(e.target.value); clearTimeout(locDebounce.current); locDebounce.current = setTimeout(() => searchLocality(e.target.value), 340); }} />
                    {locSearching && <div style={{ width:16, height:16, border:'2px solid rgba(123,47,247,0.15)', borderTopColor:'#7B2FF7', borderRadius:'50%', animation:'clubSpin .75s linear infinite', flexShrink:0 }} />}
                  </div>
                  {locSuggestions.length > 0 && (
                    <div style={{ position:'absolute', left:0, right:0, top:'100%', background:'#fff', border:'1px solid rgba(0,0,0,0.1)', borderRadius:12, boxShadow:'0 8px 24px rgba(0,0,0,0.12)', zIndex:50, overflow:'hidden', marginTop:4 }}>
                      {locSuggestions.map((it, i) => {
                        const a = it.address||{}; const main = a.city||a.town||a.village||a.state_district||a.county||a.state||it.display_name.split(',')[0]; const sub=[a.state,a.country].filter(Boolean).join(', ');
                        return (<div key={it.osm_id+it.osm_type+i} onClick={() => pickLocSuggestion(it)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:i<locSuggestions.length-1?'0.5px solid #f0f0f0':'none', cursor:'pointer' }} onMouseEnter={e=>e.currentTarget.style.background='#f7f6f2'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                          <span style={{ fontSize:18, flexShrink:0 }}>📍</span>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:600, color:'#111', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{main}</div>
                            {sub && <div style={{ fontSize:11, color:'#888' }}>{sub}</div>}
                          </div>
                        </div>);
                      })}
                    </div>
                  )}
                </div>
                <button type="button" onClick={detectGPS} disabled={locDetecting}
                  style={{ width:'100%', fontSize:12, color:'#378ADD', background:'#EEF6FF', border:'1px solid rgba(55,138,221,0.25)', borderRadius:12, padding:'9px', cursor:locDetecting?'not-allowed':'pointer', fontWeight:600, opacity:locDetecting?0.6:1 }}>
                  {locDetecting ? 'Detecting…' : '🎯 Detect my location'}
                </button>
                {locError && <div style={{ marginTop:6, fontSize:11, color:'#B91C1C' }}>{locError}</div>}
              </>
            )}
          </div>

          {/* Save button */}
          <div style={{ display:'flex', gap:10, marginTop:20 }}>
            <button style={{ flex:1, padding:'14px', fontSize:15, fontWeight:800, borderRadius:18, border:'none', cursor:(clubBusy||profilePhotoUploading)?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", background:'linear-gradient(135deg,#7B2FF7 0%,#C01FAB 50%,#FF416C 100%)', color:'#fff', boxShadow:'0 4px 20px rgba(123,47,247,0.35)', opacity:(clubBusy||profilePhotoUploading)?0.7:1 }} disabled={clubBusy||profilePhotoUploading} onClick={handleSaveProfile}>
              {clubBusy ? 'Saving…' : 'Save My Card'}
            </button>
            <button style={{ padding:'14px 20px', fontSize:14, fontWeight:600, borderRadius:18, border:'1.5px solid #E5E7EB', cursor:'pointer', background:'#fff', color:'#374151' }} disabled={clubBusy} onClick={() => setClubView('discover')}>Back</button>
          </div>
        </div>
      )}

      {clubView === 'requests' && (
        <div style={{ animation: 'clubPop .25s ease-out both', paddingBottom: 8 }}>
          {hub.incomingRequests.length === 0 && (
            <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '2.5rem 0' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
              No pending requests right now.
            </div>
          )}
          {hub.incomingRequests.map((req, idx) => (
            <div key={req.id} style={{ paddingBottom: 14, marginBottom: 14, borderBottom: idx < hub.incomingRequests.length - 1 ? '1px solid rgba(15,23,42,0.07)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{req.requesterTrip.groupName}</div>
                  <div style={{ fontSize: 12, color: '#60636D', marginTop: 3, lineHeight: 1.5 }}>{req.message}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{formatChatMetaTime(req.createdAt)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button style={{ ...S.btn, ...S.btnP, marginTop: 0, flex: 1, justifyContent: 'center' }} onClick={() => handleRequestAction(req.id, 'accepted')} disabled={clubBusy}>Accept</button>
                <button style={{ ...S.btn, marginTop: 0, flex: 1, justifyContent: 'center' }} onClick={() => handleRequestAction(req.id, 'declined')} disabled={clubBusy}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {clubView === 'chats' && (
        <div style={{ animation: 'clubPop .25s ease-out both' }}>
          {(!hub.chats || hub.chats.length === 0) && (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <div style={{ width:72, height:72, borderRadius:22, background:'linear-gradient(135deg,#F3F4F6,#E5E7EB)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 6 }}>No conversations yet</div>
              <div style={{ fontSize: 13, color: '#9CA3AF', lineHeight:1.6 }}>Accept a connection request to start chatting with another group.</div>
            </div>
          )}

          {hub.chats?.length > 0 && !activeChat && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {hub.chats.map((chat) => {
                const preview = chat.latestMessage?.text || 'No messages yet.';
                const unread = unreadCountByChat[chat.id] || 0;
                const otherName = chat.otherTrip?.groupName || '';
                const myName = trip.groupName || '';
                const myInitial = (myName.trim()[0] || 'A').toUpperCase();
                const otherInitial = (otherName.trim()[0] || 'J').toUpperCase();
                const displayTitle = [myName.split(' ')[0], otherName.split(' ')[0]].filter(Boolean).join(' × ');
                const timeLabel = chat.latestMessage?.createdAt ? formatChatMetaTime(chat.latestMessage.createdAt) : '';
                return (
                  <button key={chat.id} onClick={() => setSelectedChatId(chat.id)}
                    style={{ width:'100%', textAlign:'left', border:'none', background: unread ? '#FAFFF9' : '#fff',
                      borderRadius:16, padding:'14px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:14,
                      boxShadow:'0 1px 4px rgba(0,0,0,0.05)', marginBottom:6 }}>
                    {/* Avatar stack */}
                    <div style={{ position:'relative', width:52, height:38, flexShrink:0 }}>
                      <div style={{ position:'absolute', left:0, top:3, width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#1D9E75,#0F6E56)', display:'grid', placeItems:'center', fontSize:13, fontWeight:800, color:'#fff', border:'2.5px solid #fff', zIndex:2, boxShadow:'0 2px 8px rgba(29,158,117,0.28)' }}>{myInitial}</div>
                      <div style={{ position:'absolute', left:20, top:3, width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B35,#E04A1F)', display:'grid', placeItems:'center', fontSize:13, fontWeight:800, color:'#fff', border:'2.5px solid #fff', zIndex:1, boxShadow:'0 2px 8px rgba(255,107,53,0.28)' }}>{otherInitial}</div>
                    </div>
                    {/* Text */}
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:8, marginBottom:3 }}>
                        <div style={{ fontSize:14, fontWeight:unread?800:600, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{displayTitle}</div>
                        <div style={{ fontSize:11, color:'#D1D5DB', flexShrink:0, fontWeight:400 }}>{timeLabel}</div>
                      </div>
                      <div style={{ fontSize:13, color:unread?'#374151':'#9CA3AF', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontStyle:preview==='No messages yet.'?'italic':'normal', fontWeight:unread?500:400 }}>{preview}</div>
                    </div>
                    {unread ? <span style={{ width:10, height:10, borderRadius:'50%', background:'#1D9E75', flexShrink:0, display:'block', boxShadow:'0 0 0 3px rgba(29,158,117,0.2)' }} /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {clubView === 'chats' && activeChat && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 545, background: '#F8F9FA', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ position:'sticky', top:0, zIndex:2, padding:'10px 14px', paddingTop:'calc(10px + env(safe-area-inset-top, 0px))', background:'#fff', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, boxShadow:'0 1px 0 rgba(0,0,0,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1 }}>
              <button style={{ width:36, height:36, borderRadius:11, border:'1.5px solid #E5E7EB', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }} onClick={() => setSelectedChatId(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div style={{ position:'relative', width:42, height:32, flexShrink:0 }}>
                <div style={{ position:'absolute', left:0, top:0, width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#1D9E75,#0F6E56)', display:'grid', placeItems:'center', fontSize:11, fontWeight:800, color:'#fff', border:'2.5px solid #fff', zIndex:2 }}>{(trip.groupName?.trim()[0]||'M').toUpperCase()}</div>
                <div style={{ position:'absolute', left:14, top:0, width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg,#FF6B35,#E04A1F)', display:'grid', placeItems:'center', fontSize:11, fontWeight:800, color:'#fff', border:'2.5px solid #fff', zIndex:1 }}>{(activeChat.otherTrip?.groupName?.trim()[0]||'J').toUpperCase()}</div>
              </div>
              <div style={{ minWidth:0 }}>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, color:'#111827', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', lineHeight:1.2 }}>
                  {trip.groupName?.split(' ')[0]} × {activeChat.otherTrip?.groupName?.split(' ')[0]}
                </div>
                <div style={{ fontSize:11, color:'#9CA3AF', marginTop:1 }}>Club connection</div>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              <div style={{ position:'relative' }}>
                <button style={{ width:36, height:36, borderRadius:11, border:'1.5px solid #E5E7EB', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'#6B7280' }} onClick={() => setChatMenuOpen(o=>!o)}>⋯</button>
                {chatMenuOpen && (
                  <div style={{ position:'absolute', top:'110%', right:0, background:'#fff', borderRadius:14, boxShadow:'0 12px 32px rgba(0,0,0,0.16)', border:'1px solid rgba(0,0,0,0.07)', zIndex:10, overflow:'hidden', minWidth:162 }}>
                    <button onClick={() => { setChatMenuOpen(false); handleDeleteChat(); }} disabled={clubBusy} style={{ display:'block', width:'100%', textAlign:'left', padding:'13px 16px', border:'none', background:'none', cursor:'pointer', fontSize:13, color:'#EF4444', fontWeight:600 }}>🗑 Delete Chat</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Messages thread */}
          <div ref={chatThreadRef} style={{ flex:1, overflowY:'auto', padding:'16px 14px 20px', display:'flex', flexDirection:'column', gap:8, background:'#F8F9FA' }}>
            {/* Subtle dot bg */}
            <div style={{ position:'fixed', inset:0, backgroundImage:'radial-gradient(rgba(0,0,0,0.03) 1px,transparent 1px)', backgroundSize:'20px 20px', zIndex:0, pointerEvents:'none' }} />
            {activeChat.messages?.length ? activeChat.messages.map(message => {
              const mine = message.senderTripId === trip.id;
              return (
                <div key={message.id} style={{ display:'flex', justifyContent:mine?'flex-end':'flex-start', position:'relative', zIndex:1 }}>
                  <div style={{ maxWidth:'78%' }}>
                    {!mine && (
                      <div style={{ fontSize:10, fontWeight:700, color:'#9CA3AF', marginBottom:3, marginLeft:4, textTransform:'uppercase', letterSpacing:'0.5px' }}>
                        {message.senderUser?.name || activeChat.otherTrip?.groupName}
                      </div>
                    )}
                    <div style={{ background:mine?'linear-gradient(135deg,#1D9E75,#0F6E56)':'#fff', color:mine?'#fff':'#111827', borderRadius:mine?'20px 20px 4px 20px':'20px 20px 20px 4px', padding:'10px 14px', boxShadow:mine?'0 4px 14px rgba(29,158,117,0.28)':'0 2px 8px rgba(0,0,0,0.08)', border:mine?'none':'1px solid #F3F4F6' }}>
                      <div style={{ fontSize:14, lineHeight:1.55, whiteSpace:'pre-wrap' }}>{message.text}</div>
                      <div style={{ fontSize:10, opacity:0.65, marginTop:5, textAlign:mine?'right':'left' }}>{formatChatTime(message.createdAt)}</div>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'3rem 1.5rem', textAlign:'center', position:'relative', zIndex:1 }}>
                <div style={{ width:64, height:64, borderRadius:20, background:'linear-gradient(135deg,#F0FDF4,#DCFCE7)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:800, color:'#111827', marginBottom:6 }}>You're connected!</div>
                <div style={{ fontSize:13, color:'#9CA3AF', fontStyle:'italic', lineHeight:1.65 }}>Say hi. First message is always the hardest.</div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div style={{ padding:'10px 12px', paddingBottom:'calc(10px + env(safe-area-inset-bottom, 0px))', borderTop:'1px solid #F3F4F6', background:'#fff', boxShadow:'0 -4px 16px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <textarea
                style={{ flex:1, resize:'none', height:44, minHeight:44, maxHeight:120, border:'1.5px solid #E5E7EB', borderRadius:16, padding:'10px 14px', fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', lineHeight:1.4, color:'#111827', background:'#F9FAFB', overflowY:'auto' }}
                value={chatDraft} onChange={e => setChatDraft(e.target.value)} onKeyDown={handleChatKeyDown}
                placeholder={`Message ${activeChat.otherTrip?.groupName || 'this group'}…`}
              />
              <button type="button" onClick={openToolsChooser} disabled={!activeChat}
                style={{ width:44, height:44, borderRadius:14, border:'1.5px solid #E5E7EB', background:'#F9FAFB', display:'grid', placeItems:'center', cursor:activeChat?'pointer':'not-allowed', fontSize:18 }}>🧰</button>
              <button style={{ height:44, borderRadius:14, border:'none', background:'linear-gradient(135deg,#1D9E75,#0F6E56)', color:'#fff', fontSize:13, fontWeight:700, padding:'0 18px', cursor:'pointer', boxShadow:'0 4px 14px rgba(29,158,117,0.3)', opacity:(!chatDraft.trim()||clubBusy)?0.5:1 }} disabled={clubBusy||!chatDraft.trim()} onClick={handleSendChat}>Send</button>
            </div>
          </div>
        </div>
      )}

      {toolsChooserOpen && activeChat && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 560, background: 'rgba(9,12,18,0.52)', display: 'grid', placeItems: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: 400, borderRadius: 26, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.32)', animation: 'clubSheetIn .28s cubic-bezier(.2,.7,.2,1) both' }}>
            {/* Gradient header */}
            <div style={{ background: 'linear-gradient(135deg,#0F4B3E,#1D9E75)', padding: '18px 18px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>Tools</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>Choose what you want to do for this group</div>
              </div>
              <button
                style={{ width: 32, height: 32, borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                onClick={() => setToolsChooserOpen(false)}
              >✕</button>
            </div>
            {/* Tool cards */}
            <div style={{ background: '#fff', padding: '14px 14px 18px', display: 'grid', gap: 12 }}>
              <button
                onClick={() => openToolScreen('split')}
                style={{ textAlign: 'left', border: 'none', borderRadius: 18, padding: 0, background: 'none', cursor: 'pointer' }}
              >
                <div style={{ background: 'linear-gradient(135deg,#E8FFF8,#C9F5E7)', borderRadius: 18, padding: '16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 16px rgba(15,110,86,0.1)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#1D9E75,#0F6E56)', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 6px 16px rgba(15,110,86,0.32)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="18" rx="3"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 15, color: '#0A2A1F' }}>Split Expenses</div>
                    <div style={{ fontSize: 12, color: '#3D8A6E', marginTop: 3, lineHeight: 1.45 }}>Track & split costs across both groups</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => openToolScreen('photos')}
                style={{ textAlign: 'left', border: 'none', borderRadius: 18, padding: 0, background: 'none', cursor: 'pointer' }}
              >
                <div style={{ background: 'linear-gradient(135deg,#FFF5EC,#FFDFBE)', borderRadius: 18, padding: '16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 16px rgba(255,107,53,0.1)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#FF6B35,#E04A1F)', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 6px 16px rgba(255,107,53,0.32)' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 15, color: '#2A1200' }}>Shared Album</div>
                    <div style={{ fontSize: 12, color: '#A04A1F', marginTop: 3, lineHeight: 1.45 }}>Browse & upload photos from both trips</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {toolScreenOpen && activeChat && chatTool === 'split' && (
        <div className="tb-animated-screen" style={{ position: 'fixed', inset: 0, zIndex: 570, background: '#fff', overflowY: 'auto' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 2, padding: 18, paddingTop: 'calc(18px + env(safe-area-inset-top, 0px))', background: 'linear-gradient(135deg,#0F172A,#134E4A)', color: '#fff', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800 }}>Split</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{combinedMembers.length} combined members, one shared wallet view</div>
            </div>
            <button style={{ ...S.btn, marginTop: 0, background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }} onClick={() => setToolScreenOpen(false)}>✕</button>
          </div>

          <div style={{ padding: 16, maxWidth: 1020, margin: '0 auto' }}>
            <div style={{ background: '#FFF8E6', border: '1px solid #F4D79B', color: '#7A4B00', borderRadius: 12, padding: '10px 12px', fontSize: 12, lineHeight: 1.45, marginBottom: 12 }}>
              Note: expenses of your original group members added here will be reflected and adjusted automatically in the main Split tab.
              Keep adding expenses normally, and do not worry about settling twice.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div className="tb-float-card tb-pop-in" style={{ background: '#F4FBF8', border: '1px solid #DAF2E8', borderRadius: 14, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#0F6E56' }}>Total spent</div>
                <div className="tb-amount-pop" style={{ marginTop: 4, fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, color: '#0C3B31' }}>
                  ₹{Math.round(splitEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0)).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="tb-float-card tb-pop-in" style={{ background: '#F8FAFC', border: '1px solid #E3E8EF', borderRadius: 14, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#475467' }}>Per member</div>
                <div className="tb-amount-pop" style={{ marginTop: 4, fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, color: '#0F172A' }}>
                  ₹{combinedMembers.length ? Math.round(splitEntries.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0) / combinedMembers.length).toLocaleString('en-IN') : '0'}
                </div>
              </div>
              <div className="tb-float-card tb-pop-in" style={{ background: '#F8F8FF', border: '1px solid #E7E5FF', borderRadius: 14, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#4C3D9A' }}>Entries</div>
                <div style={{ marginTop: 4, fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, color: '#281D72' }}>{splitEntries.length}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {combinedMembers.map(member => (
                <div key={`pill-${member.id}`} className="tb-soft-fade" style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid rgba(15,23,42,0.1)', borderRadius: 999, padding: '4px 9px 4px 5px', fontSize: 12 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#0F6E56', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800 }}>
                    {member.nickname.slice(0, 2).toUpperCase()}
                  </div>
                  <span>{member.nickname}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 0, background: '#fff', border: '1px solid rgba(10,18,35,0.1)', borderRadius: 12, padding: 3, marginBottom: 12 }}>
              {[
                { id: 'expenses', label: 'Expenses' },
                { id: 'shares', label: 'Shares' },
                { id: 'balances', label: 'Balances' },
              ].map(section => (
                <button
                  key={`split-section-${section.id}`}
                  onClick={() => setSplitSection(section.id)}
                  style={{ flex: 1, border: 'none', background: splitSection === section.id ? '#1D9E75' : 'transparent', color: splitSection === section.id ? '#fff' : '#475467', borderRadius: 9, padding: '8px 6px', fontSize: 12, fontWeight: splitSection === section.id ? 700 : 600, cursor: 'pointer' }}
                >
                  {section.label}
                </button>
              ))}
            </div>

            {splitSection === 'expenses' && (
              <div style={{ display: 'grid', gap: 8, paddingBottom: 86 }}>
                {!!splitEntries.length && <div style={{ fontSize: 11, color: '#667085', margin: '0 2px 2px' }}>Tip: swipe any expense card left to reveal quick delete.</div>}
                {splitEntries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#667085' }}>
                    <div style={{ fontSize: 42 }}>🧾</div>
                    <div style={{ marginTop: 8, fontSize: 14 }}>No split entries yet</div>
                  </div>
                ) : splitEntries.slice().reverse().map(entry => {
                  const payer = splitMemberById[entry.paidByKey || entry.paidBy];
                  const splitWith = Array.isArray(entry.splitWithKeys) ? entry.splitWithKeys : [];
                  const perHead = splitWith.length ? (Number(entry.amount) || 0) / splitWith.length : 0;
                  const dragging = splitTouch.entryId === entry.id;
                  const translateX = dragging ? splitTouch.deltaX : (splitSwipeOpenId === entry.id ? -82 : 0);
                  return (
                    <div key={entry.id} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 82, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#F97316,#EA580C)' }}>
                        <button
                          type="button"
                          onClick={() => handleDeleteSplitEntry(entry.id)}
                          disabled={clubBusy}
                          style={{ border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 10, padding: '7px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                      <div
                        className="tb-float-card tb-fade-up"
                        onTouchStart={(event) => handleSplitTouchStart(entry.id, event)}
                        onTouchMove={(event) => handleSplitTouchMove(entry.id, event)}
                        onTouchEnd={() => handleSplitTouchEnd(entry.id)}
                        onClick={() => {
                          if (splitSwipeOpenId === entry.id) {
                            setSplitSwipeOpenId(null);
                          }
                        }}
                        style={{
                          background: '#fff',
                          borderRadius: 14,
                          border: '1px solid rgba(10,18,35,0.08)',
                          padding: 12,
                          transform: `translateX(${translateX}px)`,
                          transition: dragging ? 'none' : 'transform .22s ease',
                          touchAction: 'pan-y',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <div>
                            <div style={{ fontWeight: 800, color: '#101828' }}>{entry.desc}</div>
                            <div style={{ marginTop: 4, fontSize: 11, color: '#667085' }}>
                              Paid by {payer ? `${payer.nickname} (${payer.groupName})` : (entry.paidByKey || entry.paidBy)}
                            </div>
                            <div style={{ marginTop: 2, fontSize: 11, color: '#98A2B3' }}>{formatSplitDate(entry.createdAt)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800 }}>₹{Math.round(Number(entry.amount) || 0).toLocaleString('en-IN')}</div>
                            <div style={{ marginTop: 3, fontSize: 11, color: '#667085' }}>₹{Math.round(perHead).toLocaleString('en-IN')} each</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {splitSection === 'shares' && (
              <div style={{ display: 'grid', gap: 8 }}>
                {combinedMembers.map(member => {
                  const paid = splitPayTotals[member.id] || 0;
                  const owed = splitEntries.reduce((sum, entry) => {
                    const splitWith = Array.isArray(entry.splitWithKeys) ? entry.splitWithKeys : [];
                    if (!splitWith.includes(member.id) || !splitWith.length) return sum;
                    return sum + (Number(entry.amount) || 0) / splitWith.length;
                  }, 0);
                  const net = paid - owed;
                  return (
                    <div key={`share-${member.id}`} style={{ background: '#fff', border: '1px solid rgba(10,18,35,0.08)', borderRadius: 14, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#101828' }}>{member.nickname}</div>
                        <div style={{ fontSize: 11, color: '#667085', marginTop: 3 }}>Paid ₹{Math.round(paid).toLocaleString('en-IN')} • Share ₹{Math.round(owed).toLocaleString('en-IN')}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 800, color: net >= 0 ? '#0F6E56' : '#B42318' }}>
                        {net >= 0 ? '+' : '-'}₹{Math.round(Math.abs(net)).toLocaleString('en-IN')}
                      </div>
                    </div>
                  );
                })}

                <div style={{ marginTop: 2 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '.04em' }}>Who pays whom</div>
                  {splitSettlements.length === 0 ? (
                    <div style={{ background: '#E1F5EE', border: '1px solid #9FE1CB', borderRadius: 12, padding: 12, color: '#085041', fontSize: 13, fontWeight: 600 }}>Everyone is settled.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {splitSettlements.map((settlement, index) => {
                        const fromMember = splitMemberById[settlement.from];
                        const toMember = splitMemberById[settlement.to];
                        return (
                          <div key={`settlement-${settlement.from}-${settlement.to}`} style={{ background: '#fff', border: '1px solid rgba(10,18,35,0.08)', borderRadius: 12, padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ fontSize: 12, color: '#344054' }}>{fromMember?.nickname || settlement.from} → {toMember?.nickname || settlement.to}</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#0F6E56' }}>₹{Math.round(settlement.amount).toLocaleString('en-IN')}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {splitSection === 'balances' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 10 }}>
                {combinedMembers.map(member => {
                  const balance = splitBalances[member.id] || 0;
                  const positive = balance > 0.5;
                  const negative = balance < -0.5;
                  return (
                    <div key={`balance-card-${member.id}`} style={{ background: '#fff', border: '1px solid rgba(10,18,35,0.08)', borderTop: `3px solid ${positive ? '#1D9E75' : negative ? '#D85A30' : '#D0D5DD'}`, borderRadius: '0 0 14px 14px', padding: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{member.nickname}</div>
                      <div style={{ marginTop: 8, fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 20, color: positive ? '#0F6E56' : negative ? '#B42318' : '#475467' }}>
                        {positive ? '+' : ''}₹{Math.round(Math.abs(balance)).toLocaleString('en-IN')}
                      </div>
                      <div style={{ marginTop: 3, fontSize: 11, color: '#667085' }}>{positive ? 'gets back' : negative ? 'owes' : 'settled'}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {splitSection === 'expenses' && (
            <button
              className="tb-fab-pop"
              onClick={() => setSplitFormOpen(true)}
              style={{ position: 'fixed', right: 18, bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))', width: 58, height: 58, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#1D9E75,#0F6E56)', color: '#fff', fontSize: 29, cursor: 'pointer', boxShadow: '0 10px 28px rgba(15,110,86,0.45)', zIndex: 575 }}
            >
              +
            </button>
          )}

          {splitFormOpen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 580, background: '#F7F6F2', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '1rem 1.15rem', paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#fff' }}>
                <button onClick={() => setSplitFormOpen(false)} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(0,0,0,0.12)', background: '#F7F6F2', cursor: 'pointer' }}>←</button>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, flex: 1 }}>Add Expense</div>
                <button style={{ ...S.btn, ...S.btnP, marginTop: 0, borderRadius: 12, padding: '8px 18px', opacity: clubBusy ? 0.65 : 1 }} disabled={clubBusy} onClick={handleAddSplitEntry}>Save</button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ background: 'linear-gradient(135deg,#0F6E56,#1D9E75)', padding: '2rem 1.2rem 2.4rem', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.68)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 }}>How much?</div>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, color: 'rgba(255,255,255,0.62)' }}>₹</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={splitDraft.amount}
                      onChange={(e) => setSplitDraft((draft) => ({ ...draft, amount: e.target.value }))}
                      autoFocus
                      style={{ fontFamily: "'Sora',sans-serif", fontSize: 52, fontWeight: 700, color: '#fff', border: 'none', background: 'transparent', outline: 'none', width: '64%', textAlign: 'center' }}
                    />
                  </div>
                </div>

                <div style={{ background: '#fff', borderRadius: '22px 22px 0 0', marginTop: -16, padding: '1.4rem 1.1rem 2rem' }}>
                  <label style={S.label}>What was it?</label>
                  <input
                    style={{ ...S.input, marginTop: 6 }}
                    placeholder="e.g. Dinner, cab, activity tickets"
                    value={splitDraft.desc}
                    onChange={(e) => setSplitDraft((draft) => ({ ...draft, desc: e.target.value }))}
                  />

                  <label style={S.label}>Paid by</label>
                  <select style={S.input} value={splitDraft.paidBy} onChange={(e) => setSplitDraft((draft) => ({ ...draft, paidBy: e.target.value }))}>
                    {combinedMembers.map(member => (
                      <option key={`payer-${member.id}`} value={member.id}>{member.nickname} ({member.groupName})</option>
                    ))}
                  </select>

                  <label style={S.label}>Split with</label>
                  <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {combinedMembers.map(member => {
                      const selected = splitDraft.splitWith.includes(member.id);
                      return (
                        <button key={`split-with-${member.id}`} onClick={() => handleToggleSplitMember(member.id)} style={{ ...S.btn, marginTop: 0, padding: '6px 11px', background: selected ? '#E1F5EE' : '#fff', color: selected ? '#0F6E56' : '#475467', border: selected ? '1px solid #9FE1CB' : '1px solid rgba(0,0,0,0.11)' }}>
                          {member.nickname}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, color: '#667085' }}>
                    Per head: {splitDraft.splitWith.length ? `₹${((Number(splitDraft.amount) || 0) / splitDraft.splitWith.length).toFixed(2)}` : '₹0.00'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {toolScreenOpen && activeChat && chatTool === 'photos' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 570, background: '#fff', overflowY: 'auto' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 2, padding: 18, paddingTop: 'calc(18px + env(safe-area-inset-top, 0px))', background: 'linear-gradient(135deg,#1D4ED8,#0F766E)', color: '#fff', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800 }}>Photos</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{combinedPhotos.length} combined group photos</div>
            </div>
            <button style={{ ...S.btn, marginTop: 0, background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }} onClick={() => setToolScreenOpen(false)}>✕</button>
          </div>

          <div style={{ padding: 18, maxWidth: 1240, margin: '0 auto' }}>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setChatPhotoDragging(true);
              }}
              onDragLeave={() => setChatPhotoDragging(false)}
              onDrop={handleChatToolPhotoDrop}
              onClick={() => chatPhotoInputRef.current?.click()}
              style={{
                border: chatPhotoDragging ? '2px dashed #0F766E' : '2px dashed rgba(15,118,110,0.35)',
                background: chatPhotoDragging ? 'rgba(15,118,110,0.08)' : 'linear-gradient(160deg,rgba(255,255,255,0.92),rgba(245,251,255,0.72))',
                borderRadius: 18,
                padding: '18px 14px',
                marginBottom: 12,
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 13, color: '#0F172A', fontWeight: 700 }}>Drop photos here or tap to upload</div>
              <div style={{ fontSize: 12, color: '#667085', marginTop: 4 }}>Your uploads go to Supabase bucket trip-photos and appear for both clubs.</div>
              {chatPhotoUploading && <div style={{ marginTop: 6, fontSize: 11, color: '#0F6E56', fontWeight: 700 }}>Uploading {chatPhotoProgress}%</div>}
              <input
                ref={chatPhotoInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleChatToolPhotoUpload}
              />
            </div>

            {chatPhotoSelected.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10, padding: '8px 10px', borderRadius: 12, background: '#EEF6FF', border: '1px solid #D7E8FF', flexWrap: 'wrap' }}>
                <div style={{ fontSize: 12, color: '#1E3A5F', fontWeight: 700 }}>{chatPhotoSelected.size} selected</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={{ ...S.btn, marginTop: 0, padding: '7px 10px' }} onClick={() => void downloadSelectedChatPhotos()}>Download</button>
                  <button
                    style={{ ...S.btn, marginTop: 0, padding: '7px 10px', background: canDeleteSelectedChatPhotos ? '#F04438' : '#F1F3F5', color: canDeleteSelectedChatPhotos ? '#fff' : '#98A2B3', border: 'none' }}
                    disabled={!canDeleteSelectedChatPhotos}
                    onClick={() => void deleteSelectedChatPhotos()}
                  >
                    Delete
                  </button>
                  <button style={{ ...S.btn, marginTop: 0, padding: '7px 10px' }} onClick={clearChatPhotoSelection}>Clear</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 10 }}>
              {Object.keys(chatPhotoFolders).map((folderKey) => {
                const count = (chatPhotoFolders[folderKey] || []).length;
                const isActive = chatPhotoFolder === folderKey;
                return (
                  <button
                    key={`folder-${folderKey}`}
                    onClick={() => setChatPhotoFolder(folderKey)}
                    style={{
                      ...S.btn,
                      marginTop: 0,
                      borderRadius: 999,
                      padding: '7px 12px',
                      whiteSpace: 'nowrap',
                      background: isActive ? 'linear-gradient(135deg,#1D9E75,#0F6E56)' : '#fff',
                      color: isActive ? '#fff' : '#475467',
                      border: isActive ? '1px solid rgba(15,110,86,0.68)' : '1px solid rgba(10,18,35,0.12)',
                    }}
                  >
                    {folderKey === 'all' ? 'All photos' : folderKey} ({count})
                  </button>
                );
              })}
            </div>

            {chatFolderPhotos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#667085' }}>No photos shared yet in the two trips. Use the upload area above to start the album.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 10 }}>
                {chatFolderPhotos.map((photo, index) => (
                  <div
                    key={`cp-${photo.id}`}
                    onClick={() => setChatPhotoLightbox({ photos: chatFolderPhotos, index })}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setChatPhotoLightbox({ photos: chatFolderPhotos, index });
                    }}
                    style={{ position: 'relative', border: 'none', padding: 0, background: 'transparent', cursor: 'pointer' }}
                  >
                    <img src={photo.url} alt="combined trip" style={{ width: '100%', height: 170, borderRadius: 14, objectFit: 'cover', display: 'block' }} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleChatPhotoSelection(photo.id);
                      }}
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.95)',
                        background: chatPhotoSelected.has(photo.id) ? '#0F766E' : 'rgba(3,10,24,0.52)',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 800,
                        display: 'grid',
                        placeItems: 'center',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                      aria-label={chatPhotoSelected.has(photo.id) ? 'Deselect photo' : 'Select photo'}
                    >
                      {chatPhotoSelected.has(photo.id) ? '✓' : ''}
                    </button>
                    <div style={{ position: 'absolute', left: 8, bottom: 8, fontSize: 10, fontWeight: 800, color: '#fff', background: 'rgba(3,10,24,0.58)', padding: '3px 7px', borderRadius: 999 }}>{photo.source}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {chatPhotoLightbox && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 590, background: 'rgba(6,10,18,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
              <button onClick={() => setChatPhotoLightbox(null)} style={{ position: 'absolute', top: 14, right: 14, ...S.btn, marginTop: 0, background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)' }}>✕</button>
              <button
                onClick={() => setChatPhotoLightbox((curr) => ({ ...curr, index: Math.max(0, curr.index - 1) }))}
                disabled={chatPhotoLightbox.index === 0}
                style={{ position: 'absolute', left: 14, ...S.btn, marginTop: 0, background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)', opacity: chatPhotoLightbox.index === 0 ? 0.4 : 1 }}
              >Prev</button>
              <img
                src={chatPhotoLightbox.photos[chatPhotoLightbox.index]?.url}
                alt="lightbox"
                style={{ maxWidth: '92vw', maxHeight: '82vh', borderRadius: 14, objectFit: 'contain', boxShadow: '0 20px 50px rgba(0,0,0,0.35)' }}
              />
              <button
                onClick={() => setChatPhotoLightbox((curr) => ({ ...curr, index: Math.min(curr.photos.length - 1, curr.index + 1) }))}
                disabled={chatPhotoLightbox.index >= chatPhotoLightbox.photos.length - 1}
                style={{ position: 'absolute', right: 14, ...S.btn, marginTop: 0, background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.22)', opacity: chatPhotoLightbox.index >= chatPhotoLightbox.photos.length - 1 ? 0.4 : 1 }}
              >Next</button>
            </div>
          )}
        </div>
      )}

      {clubView === 'discover' && (
        <>
          <div style={{ padding: '0 0 14px', animation: 'clubPop .25s ease-out both' }}>
            {/* Full-width search bar with inline ✕ */}
            <div style={{ position: 'relative', marginBottom: 8 }}>
              <input
                style={{ ...S.input, marginBottom: 0, background: 'rgba(255,255,255,0.92)', paddingRight: filters.search ? 40 : 14 }}
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="Search group, destination, vibe…"
              />
              {filters.search && (
                <button
                  onClick={() => setFilters(f => ({ ...f, search: '' }))}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.1)', color: '#6b6b68', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                >✕</button>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              {`${VIBE_OPTIONS.find(v => v.value === filters.vibe)?.label || 'Any vibe'} · ${GENDER_MIX_OPTIONS.find(v => v.value === filters.genderMix)?.label || 'Any mix'} · ${MEMBER_BAND_OPTIONS.find(v => v.value === filters.memberBand)?.label || 'Any size'}${locationEnabled ? ` · ${radius} km` : ''}`}
            </div>
          </div>

          <div style={{ paddingBottom: 20, animation: 'clubPop .3s ease-out both' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: !listed ? 0 : 14 }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 13, color: '#6b6b68', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Discover · {filteredDiscover.length} group{filteredDiscover.length !== 1 ? 's' : ''}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Snooze toggle */}
                <button
                  onClick={handleToggle}
                  disabled={clubBusy}
                  title={listed ? 'Snooze — hide your card' : 'Go live — show your card'}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, border: listed ? '1px solid rgba(29,158,117,0.35)' : '1px solid rgba(0,0,0,0.1)', background: listed ? 'rgba(29,158,117,0.1)' : 'rgba(255,255,255,0.9)', cursor: clubBusy ? 'not-allowed' : 'pointer', flexShrink: 0, transition: 'all .2s ease' }}
                >
                  <span style={{ width: 28, height: 16, borderRadius: 999, background: listed ? '#1D9E75' : '#D3D1C7', padding: 2, display: 'block', flexShrink: 0, transition: 'background .2s ease', position: 'relative' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#fff', display: 'block', position: 'absolute', top: 2, left: listed ? 14 : 2, transition: 'left .2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' }} />
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: listed ? '#0F6E56' : '#9ca3af', whiteSpace: 'nowrap' }}>{listed ? 'Live' : 'Snoozed'}</span>
                </button>
                {/* Filter button */}
                <button
                  onClick={() => { setFilterDraft(filters); setFiltersOpen(true); }}
                  style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                  title="Filters"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
            {/* Snooze banner */}
            {!listed && (
              <div style={{ margin: '10px 0 14px', borderRadius: 12, padding: '11px 14px', background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)', display: 'flex', alignItems: 'center', gap: 10, animation: 'clubSectionIn .25s ease-out both' }}>
                <span style={{ fontSize: 16, flexShrink: 0, opacity: 0.7 }}>😴</span>
                <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.55 }}>You're snoozed — not visible to others, and their cards are hidden from you. Toggle <strong style={{ color: '#475569' }}>Live</strong> to start discovering.</div>
              </div>
            )}
            {listed && filteredDiscover.length === 0 && (
              <div style={{ fontSize: 13, color: '#6b6b68', textAlign: 'center', padding: '18px 0' }}>
                No groups found. Try wider radius, different vibe, or remove a filter.
              </div>
            )}

            {listed && !hubFetched && (
              <div style={{ paddingTop: 4 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="tb-shimmer" style={{ height: 140, borderRadius: 18, marginBottom: 12, opacity: 1 - i * 0.15 }} />
                ))}
              </div>
            )}
            {listed && hubFetched && filteredDiscover
              .map(item => ({
                item,
                alreadySent: hub.outgoingRequests.some(r => r.targetTripId === item.tripId && r.status === 'pending'),
                compatibility: buildCompatibility(hub.myProfile, trip, item),
              }))
              .sort((a, b) => b.compatibility.score - a.compatibility.score)
              .map(({ item, alreadySent, compatibility }) => (
                <ClubDiscoveryCard
                  key={item.id}
                  item={item}
                  compatibility={compatibility}
                  alreadySent={alreadySent}
                  distKm={locationEnabled && item.latitude != null && item.longitude != null ? haversine(myLat, myLng, item.latitude, item.longitude) : null}
                  onOpen={() => setSelectedCard(item)}
                />
              ))}
          </div>
        </>
      )}

      {filtersOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,16,24,0.45)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem', animation: 'clubFadeIn .2s ease-out both' }}>
          <div style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: 24, padding: '1rem 1rem 1.1rem', boxShadow: '0 30px 80px rgba(0,0,0,0.22)', animation: 'clubSheetIn .28s cubic-bezier(.2,.7,.2,1) both' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800 }}>Tune Your Match Feed</div>
                <div style={{ fontSize: 12, color: '#6b6b68', marginTop: 2 }}>Pick the energy you want, then save and jump back in.</div>
              </div>
              <button style={{ ...S.btn, marginTop: 0 }} onClick={() => setFiltersOpen(false)}>✕</button>
            </div>

            <label style={S.label}>Vibe</label>
            <select style={S.input} value={filterDraft.vibe} onChange={e => setFilterDraft(f => ({ ...f, vibe: e.target.value }))}>
              {VIBE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>

            <label style={S.label}>Group Mix</label>
            <select style={S.input} value={filterDraft.genderMix} onChange={e => setFilterDraft(f => ({ ...f, genderMix: e.target.value }))}>
              {GENDER_MIX_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>

            <label style={S.label}>Group Size</label>
            <select style={S.input} value={filterDraft.memberBand} onChange={e => setFilterDraft(f => ({ ...f, memberBand: e.target.value }))}>
              {MEMBER_BAND_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>

            <div style={{ marginTop: 10, background: '#F6FFFB', border: '1px solid #D9F5EA', borderRadius: 16, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0F6E56' }}>📍 Radius Filter</div>
                <div style={{ fontSize: 12, color: '#0F6E56', fontWeight: 700 }}>{locationEnabled ? `within ${radius} km of ${locLabel}` : 'Set location in profile first'}</div>
              </div>
              {locationEnabled ? (
                <>
                  <input type="range" min="2" max="150" value={radius}
                    onChange={e => { const v = Number(e.target.value); setRadius(v); try { localStorage.setItem(clubLocKey('radius'), String(v)); } catch {} }}
                    style={{ width: '100%' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b6b68', marginTop: 4 }}>
                    <span>2 km</span><span>{radius} km selected</span><span>150 km</span>
                  </div>
                  <button style={{ ...S.btn, marginTop: 8, fontSize: 11, color: '#6b6b68' }} onClick={() => { setMyLat(null); setMyLng(null); setLocLabel(''); setLocQuery(''); try { localStorage.removeItem(clubLocKey('loc_lat')); localStorage.removeItem(clubLocKey('loc_lng')); localStorage.removeItem(clubLocKey('loc_label')); } catch {}; }}>Clear location</button>
                </>
              ) : (
                <div style={{ fontSize: 12, color: '#6b6b68' }}>Go to <strong>Edit Profile</strong> and set your locality to unlock radius filtering.</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button style={{ ...S.btn, flex: 1, marginTop: 0 }} onClick={() => { setFilterDraft(initialFilters); setRadius(25); try { localStorage.setItem(clubLocKey('radius'), '25'); } catch {} }}>Reset</button>
              <button style={{ ...S.btn, ...S.btnOrange, flex: 1, marginTop: 0 }} onClick={applyFilters}>Save and Go</button>
            </div>
          </div>
        </div>
      )}

      {selectedCard && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:520, display:'flex', alignItems:'flex-end', justifyContent:'center', animation:'clubFadeIn .22s ease-out both' }}>
          <div style={{ width:'100%', maxWidth:560, maxHeight:'94vh', overflowY:'auto', background:'#fff', borderRadius:'28px 28px 0 0', boxShadow:'0 -24px 80px rgba(0,0,0,0.3)', animation:'clubSheetIn .3s cubic-bezier(.2,.7,.2,1) both' }}>
            {/* Photo section — full width, tall */}
            <div style={{ position:'relative', height:380, background:moodGradient(selectedCard.vibe||'mixed'), flexShrink:0 }}>
              {selectedGallery[selectedMediaIndex] && (
                <img src={selectedGallery[selectedMediaIndex]} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
              )}
              {/* Gradient scrim */}
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.78) 100%)' }} />
              {/* Close btn */}
              <button style={{ position:'absolute', top:14, right:14, width:36, height:36, borderRadius:12, background:'rgba(0,0,0,0.35)', backdropFilter:'blur(8px)', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', fontSize:16, cursor:'pointer', display:'grid', placeItems:'center' }} onClick={() => setSelectedCard(null)}>✕</button>
              {/* Gallery dots */}
              {selectedGallery.length > 1 && (
                <div style={{ position:'absolute', top:14, left:0, right:0, display:'flex', justifyContent:'center', gap:5 }}>
                  {selectedGallery.map((_,i) => (
                    <button key={i} onClick={() => setSelectedMediaIndex(i)}
                      style={{ width:i===selectedMediaIndex?24:7, height:7, borderRadius:99, border:'none', background:i===selectedMediaIndex?'#fff':'rgba(255,255,255,0.45)', padding:0, cursor:'pointer', transition:'all .22s' }} />
                  ))}
                </div>
              )}
              {/* Bottom identity */}
              <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'16px 20px' }}>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:99, background:'rgba(255,255,255,0.18)', backdropFilter:'blur(8px)', color:'#fff' }}>{(selectedCard.vibe||'mixed').toUpperCase()}</span>
                  <span style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:99, background:isRecentlyActive(selectedCard.updatedAt)?'rgba(74,222,128,0.25)':'rgba(255,255,255,0.18)', backdropFilter:'blur(8px)', color:isRecentlyActive(selectedCard.updatedAt)?'#4ADE80':'rgba(255,255,255,0.7)' }}>{isRecentlyActive(selectedCard.updatedAt)?'● Live today':'Quiet'}</span>
                  {locationEnabled && selectedCard.latitude!=null && selectedCard.longitude!=null && (
                    <span style={{ fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:99, background:'rgba(255,255,255,0.18)', backdropFilter:'blur(8px)', color:'#fff' }}>📍 {distanceLabel(haversine(myLat,myLng,selectedCard.latitude,selectedCard.longitude))}</span>
                  )}
                </div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:26, fontWeight:800, color:'#fff', lineHeight:1.1, letterSpacing:'-0.3px', textShadow:'0 2px 16px rgba(0,0,0,0.5)' }}>{selectedCard.trip?.groupName}</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.8)', marginTop:4 }}>📍 {selectedCard.trip?.destination} · {selectedCard.trip?.members?.length||0} travelers</div>
              </div>
            </div>

            {/* Drag pill */}
            <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 0' }}>
              <div style={{ width:36, height:4, borderRadius:99, background:'#E5E7EB' }} />
            </div>

            {/* Info body */}
            <div style={{ padding:'12px 18px 100px' }}>
              {/* Match ring */}
              {(() => {
                const compat = buildCompatibility(hub.myProfile, trip, selectedCard);
                return (
                  <div style={{ background:'linear-gradient(135deg,#F0FDF4,#DCFCE7)', border:'1px solid #BBF7D0', borderRadius:18, padding:'14px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:14 }}>
                    <MatchRing score={compat.score} />
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:'#166534', textTransform:'uppercase', letterSpacing:'0.6px' }}>Compatibility</div>
                      <div style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:800, color:'#111827' }}>{compat.score}% match</div>
                      <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:5 }}>
                        {compat.reasons.map((r,i) => <span key={i} style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background:'#D1FAE5', color:'#065F46' }}>{r}</span>)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Hinge-style info cards */}
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                {selectedCard.about && (
                  <div style={{ background:'#F9FAFB', border:'1.5px solid #F3F4F6', borderRadius:16, padding:'14px 16px' }}>
                    <div style={{ fontSize:10, fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>About</div>
                    <div style={{ fontSize:14, color:'#374151', lineHeight:1.65 }}>{selectedCard.about}</div>
                  </div>
                )}
                {selectedCard.lookingFor && (
                  <div style={{ background:'#F9FAFB', border:'1.5px solid #F3F4F6', borderRadius:16, padding:'14px 16px' }}>
                    <div style={{ fontSize:10, fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:6 }}>Looking For</div>
                    <div style={{ fontSize:14, color:'#374151', lineHeight:1.65 }}>{selectedCard.lookingFor}</div>
                  </div>
                )}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div style={{ background:'#F9FAFB', border:'1.5px solid #F3F4F6', borderRadius:16, padding:'12px 14px' }}>
                    <div style={{ fontSize:10, fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:5 }}>Group mix</div>
                    <div style={{ fontSize:14, fontWeight:600, color:'#111827' }}>{genderMixLabel(selectedCard.genderMix)}</div>
                  </div>
                  <div style={{ background:'#F9FAFB', border:'1.5px solid #F3F4F6', borderRadius:16, padding:'12px 14px' }}>
                    <div style={{ fontSize:10, fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:5 }}>Size</div>
                    <div style={{ fontSize:14, fontWeight:600, color:'#111827' }}>{selectedCard.trip?.members?.length||0} travelers</div>
                  </div>
                </div>
                {Array.isArray(selectedCard.coverTags) && selectedCard.coverTags.length > 0 && (
                  <div style={{ background:'#F9FAFB', border:'1.5px solid #F3F4F6', borderRadius:16, padding:'14px 16px' }}>
                    <div style={{ fontSize:10, fontWeight:800, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:8 }}>Interests</div>
                    <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                      {selectedCard.coverTags.map(tag => <span key={tag} style={{ fontSize:12, fontWeight:600, padding:'5px 10px', borderRadius:99, background:'#EEF2FF', color:'#3730A3' }}>#{tag}</span>)}
                    </div>
                  </div>
                )}
              </div>

              {/* Request form or CTA */}
              {requestFor === selectedCard.tripId ? (
                <div style={{ marginBottom:8 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#374151', marginBottom:8 }}>Write a message to introduce your group:</div>
                  <textarea style={{ width:'100%', border:'1.5px solid #E5E7EB', borderRadius:16, padding:'12px 14px', fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:'none', resize:'vertical', minHeight:90, color:'#111827', lineHeight:1.6, background:'#F9FAFB', boxSizing:'border-box' }}
                    value={requestMessage} onChange={e => setRequestMessage(e.target.value)} placeholder="Hey! We're a group of 4 heading to Goa this weekend — want to explore together?" />
                  <div style={{ display:'flex', gap:8, marginTop:10 }}>
                    <button style={{ flex:1, padding:'13px', fontSize:14, fontWeight:800, borderRadius:16, border:'none', cursor:(!requestMessage.trim()||clubBusy)?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", background:'linear-gradient(135deg,#1D9E75,#0F6E56)', color:'#fff', boxShadow:'0 4px 18px rgba(29,158,117,0.32)', opacity:(!requestMessage.trim()||clubBusy)?0.5:1 }}
                      disabled={clubBusy||!requestMessage.trim()} onClick={async () => { await handleSendRequest(); setSelectedCard(null); }}>Send Request</button>
                    <button style={{ padding:'13px 18px', fontSize:14, fontWeight:600, borderRadius:16, border:'1.5px solid #E5E7EB', cursor:'pointer', background:'#fff', color:'#374151' }} onClick={() => { setRequestFor(null); setRequestMessage(''); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button style={{ width:'100%', padding:'15px', fontSize:15, fontWeight:800, borderRadius:18, border:'none', cursor:selectedAlreadySent||clubBusy?'not-allowed':'pointer', fontFamily:"'DM Sans',sans-serif", background:selectedAlreadySent?'#F3F4F6':'linear-gradient(135deg,#1D9E75,#0F6E56)', color:selectedAlreadySent?'#9CA3AF':'#fff', boxShadow:selectedAlreadySent?'none':'0 4px 18px rgba(29,158,117,0.32)', opacity:clubBusy?0.7:1, transition:'all .2s' }}
                  disabled={selectedAlreadySent||clubBusy} onClick={() => setRequestFor(selectedCard.tripId)}>
                  {selectedAlreadySent ? 'Request Sent ✓' : '✦ Send Connection Request'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClubPage;
