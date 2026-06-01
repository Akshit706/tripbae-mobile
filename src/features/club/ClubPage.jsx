import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getClubHub, upsertClubProfile, updateClubStatus, sendClubRequest, respondClubRequest, sendClubChatMessage, createClubChatSplitExpense, deleteClubChatSplitExpense, deleteClubChat } from '../../api';
import { S } from '../shared/styles';
import { Spinner } from '../shared/ui';

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
  return [item?.photoUrl, item?.trip?.coverUrl].filter(Boolean);
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

function ClubDiscoveryCard({ item, compatibility, alreadySent, onOpen }) {
  const activeNow = isRecentlyActive(item.updatedAt);
  const avatar = item.photoUrl || item.trip?.coverUrl || null;
  const moodLine = getGroupMoodLine(item);

  return (
    <button
      data-club-card="true"
      onClick={onOpen}
      style={{ width: '100%', textAlign: 'left', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(10,18,35,0.07)', marginBottom: 16, background: '#fff', boxShadow: '0 18px 44px rgba(16,24,40,0.10)', padding: 0, cursor: 'pointer', animation: 'clubCardIn .45s cubic-bezier(.2,.7,.2,1) both', transition: 'transform .25s ease, box-shadow .25s ease' }}>
      <div style={{ background: moodGradient(item.vibe || 'mixed'), padding: 14, color: '#fff', position: 'relative' }}>
        <div style={{ position: 'absolute', right: -24, top: -24, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', animation: 'clubFloat 4.8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', right: 12, top: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 800, padding: '5px 10px', borderRadius: 999, background: activeNow ? 'rgba(103,255,186,0.26)' : 'rgba(255,255,255,0.22)', color: '#fff', backdropFilter: 'blur(8px)', animation: activeNow ? 'clubPulse 1.9s ease-in-out infinite' : 'none' }}>
            {activeNow ? 'Active Today' : 'Quiet Today'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {avatar ? (
            <img src={avatar} alt="group" style={{ width: 76, height: 76, borderRadius: 14, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.38)' }} />
          ) : (
            <div style={{ width: 76, height: 76, borderRadius: 14, background: 'rgba(255,255,255,0.22)', display: 'grid', placeItems: 'center', fontSize: 28 }}>
              {item.trip?.emoji || '🧭'}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>{item.trip?.groupName}</div>
            <div style={{ fontSize: 12, opacity: 0.93, marginTop: 4 }}>
              {item.trip?.destination}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {compatibility && (
                <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.26)' }}>
                  {compatibility.score}% match
                </span>
              )}
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.22)' }}>{distanceLabel(item.distance)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 14, color: '#242424', lineHeight: 1.55, fontWeight: 600 }}>{moodLine}</div>
        {alreadySent && <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: '#8C6B28' }}>Request already sent</div>}
      </div>
    </button>
  );
}

function ClubPage({ trip, onTripRefresh }) {
  const [clubLoading, setClubLoading] = useState(true);
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
  const [splitSection, setSplitSection] = useState('expenses');
  const [splitFormOpen, setSplitFormOpen] = useState(false);
  const [splitDraft, setSplitDraft] = useState({ desc: '', amount: '', paidBy: '', splitWith: [] });
  const [splitTouch, setSplitTouch] = useState({ entryId: null, startX: 0, deltaX: 0, startAt: 0 });
  const [splitSwipeOpenId, setSplitSwipeOpenId] = useState(null);

  const [requestFor, setRequestFor] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');

  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [locationEnabled, setLocationEnabled] = useState(() => {
    try {
      return localStorage.getItem('travelbae_club_location_enabled') === 'true';
    } catch {
      return false;
    }
  });
  const [radius, setRadius] = useState(25);
  const [debouncedRadius, setDebouncedRadius] = useState(radius);

  const [profileForm, setProfileForm] = useState({
    title: '',
    about: '',
    lookingFor: '',
    photoUrl: null,
    vibe: 'mixed',
    genderMix: 'mixed',
    boysCount: '',
    girlsCount: '',
    coverTagsInput: '',
  });

  const fileRef = useRef(null);
  const chatThreadRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedRadius(radius), 260);
    return () => clearTimeout(t);
  }, [radius]);

  const requestLocation = useCallback(({ silent = false, openFilters = true } = {}) => {
    if (!navigator.geolocation) {
      if (!silent) setLocationError('Geolocation is not supported on this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationError('');
        setLocationEnabled(true);
        try {
          localStorage.setItem('travelbae_club_location_enabled', 'true');
        } catch {}
        if (openFilters) setFiltersOpen(true);
      },
      () => {
        if (!silent) {
          setLocationError('Location permission denied. You can still use manual filters.');
        }
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (locationEnabled) {
      requestLocation({ silent: true, openFilters: false });
    }
  }, []);



  const loadHub = useCallback(async () => {
    setClubLoading(true);
    try {
      const params = {
        vibe: filters.vibe,
      };
      if (locationEnabled && userLocation) {
        params.latitude = userLocation.latitude;
        params.longitude = userLocation.longitude;
        params.radius = debouncedRadius;
      }
      const data = await getClubHub(trip.id, params);
      setHub(data);
      setProfileForm({
        title: data.myProfile?.title || trip.groupName,
        about: data.myProfile?.about || '',
        lookingFor: data.myProfile?.lookingFor || '',
        photoUrl: data.myProfile?.photoUrl || null,
        vibe: data.myProfile?.vibe || 'mixed',
        genderMix: data.myProfile?.genderMix || 'mixed',
        boysCount: data.myProfile?.boysCount != null ? String(data.myProfile.boysCount) : '',
        girlsCount: data.myProfile?.girlsCount != null ? String(data.myProfile.girlsCount) : '',
        coverTagsInput: Array.isArray(data.myProfile?.coverTags) ? data.myProfile.coverTags.join(', ') : '',
      });
    } catch (err) {
      alert('Could not load club: ' + err.message);
    }
    setClubLoading(false);
  }, [trip.id, trip.groupName, locationEnabled, userLocation, debouncedRadius, filters.vibe]);

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

      // Client-side distance guard (backend already filters, but double-check)
      if (locationEnabled && item.distance != null && item.distance > debouncedRadius) return false;

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
  }, [hub.discover, filters, locationEnabled, debouncedRadius]);

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

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 300;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL('image/jpeg', 0.86);
        setProfileForm((f) => ({ ...f, photoUrl: dataUrl }));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
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
        photoUrl: profileForm.photoUrl,
        vibe: profileForm.vibe,
        genderMix: profileForm.genderMix,
        boysCount: profileForm.boysCount === '' ? null : Number(profileForm.boysCount),
        girlsCount: profileForm.girlsCount === '' ? null : Number(profileForm.girlsCount),
        coverTags: safeTags,
        latitude: locationEnabled && userLocation ? userLocation.latitude : null,
        longitude: locationEnabled && userLocation ? userLocation.longitude : null,
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

  if (clubLoading) return <Spinner text="Loading Club..." solo={trip.isSolo} />;

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
        @media (hover: hover) {
          button[data-club-card='true']:hover {
            transform: translateY(-4px);
            box-shadow: 0 24px 54px rgba(16,24,40,0.14);
          }
        }
      `}</style>

      <div style={{ position: 'relative', background: trip.isSolo ? 'linear-gradient(132deg,#5E46E7,#3F2CA1 52%,#281D72)' : 'linear-gradient(132deg,#0A7A61,#0A4F40 52%,#123D72)', borderRadius: 26, padding: '1.15rem 1rem 1rem', marginBottom: '1rem', color: '#fff', overflow: 'hidden', boxShadow: '0 24px 60px rgba(8,18,35,0.25)' }}>
        <div style={{ position: 'absolute', top: -44, right: -50, width: 170, height: 170, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.22), rgba(255,255,255,0))' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -35, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.16), rgba(255,255,255,0))' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>TravelBae Club</div>
            <div style={{ fontSize: 12, opacity: 0.88, marginTop: 3 }}>{listed ? 'Your group is visible to nearby travelers.' : 'You are snoozed right now.'}</div>
          </div>
          <button
            onClick={handleToggle}
            disabled={clubBusy}
            style={{ width: 52, height: 30, borderRadius: 999, border: 'none', background: listed ? '#35D38E' : 'rgba(255,255,255,0.3)', padding: 3, cursor: clubBusy ? 'not-allowed' : 'pointer' }}
            aria-label="Toggle listed"
          >
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff', display: 'block', transform: listed ? 'translateX(21px)' : 'translateX(0)', transition: 'transform .2s ease' }} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 7, marginTop: 12, flexWrap: 'wrap' }}>
          {['discover', 'profile', 'requests', 'chats'].map(tab => (
            <button
              key={tab}
              onClick={() => {
                setClubView(tab);
                if (tab === 'chats') {
                  setSelectedChatId(null);
                }
              }}
              style={{ ...S.btn, marginTop: 0, border: 'none', fontSize: 12, background: clubView === tab ? '#fff' : 'rgba(255,255,255,0.14)', color: clubView === tab ? '#0B4D3D' : '#fff', fontWeight: 700, borderRadius: 999, padding: '8px 14px', boxShadow: clubView === tab ? '0 8px 24px rgba(12,22,45,0.2)' : 'none' }}
            >
              {tab === 'requests' ? `Requests (${hub.incomingRequests.length})` : tab === 'profile' ? 'Edit Profile' : tab === 'chats' ? `Chats (${hub.chats?.length || 0})` : 'Discover'}
              {tab === 'chats' && hasUnreadChats ? (
                <span style={{ marginLeft: 6, width: 8, height: 8, borderRadius: '50%', background: '#FFB020', display: 'inline-block' }} />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {clubView === 'profile' && (
        <div style={{ ...premiumPanel, animation: 'clubPop .25s ease-out both' }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Build Your Discovery Card</div>

          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Group Photo</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {profileForm.photoUrl ? (
                <img src={profileForm.photoUrl} alt="preview" style={{ width: 84, height: 84, borderRadius: 12, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 84, height: 84, borderRadius: 12, background: '#ECEFF8', display: 'grid', placeItems: 'center', fontSize: 24 }}>🖼️</div>
              )}
              <div style={{ flex: 1 }}>
                <button style={{ ...S.btn, ...S.btnOrange, width: '100%', marginTop: 0 }} onClick={() => fileRef.current?.click()}>{profileForm.photoUrl ? 'Change photo' : 'Upload photo'}</button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
                {profileForm.photoUrl && <button style={{ ...S.btn, width: '100%', marginTop: 6 }} onClick={() => setProfileForm(f => ({ ...f, photoUrl: null }))}>Remove photo</button>}
              </div>
            </div>
          </div>

          <label style={S.label}>Title</label>
          <input style={S.input} value={profileForm.title} onChange={e => setProfileForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Mumbai sunset squad" />

          <label style={S.label}>About your group</label>
          <textarea style={{ ...S.input, resize: 'vertical', minHeight: 90 }} value={profileForm.about} onChange={e => setProfileForm(f => ({ ...f, about: e.target.value }))} placeholder="Tell people your group's personality in one punchy paragraph." />

          <label style={S.label}>What you want to do together</label>
          <input style={S.input} value={profileForm.lookingFor} onChange={e => setProfileForm(f => ({ ...f, lookingFor: e.target.value }))} placeholder="Street food crawl, beach walk, club night..." />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={S.label}>Vibe</label>
              <select style={S.input} value={profileForm.vibe} onChange={e => setProfileForm(f => ({ ...f, vibe: e.target.value }))}>
                {VIBE_OPTIONS.filter(v => v.value !== 'any').map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Group mix</label>
              <select style={S.input} value={profileForm.genderMix} onChange={e => setProfileForm(f => ({ ...f, genderMix: e.target.value }))}>
                {GENDER_MIX_OPTIONS.filter(g => g.value !== 'any').map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>

          <label style={S.label}>Tags (comma separated)</label>
          <input
            style={S.input}
            value={profileForm.coverTagsInput}
            onChange={e => setProfileForm(f => ({ ...f, coverTagsInput: e.target.value }))}
            placeholder="late-night, photography, budget-friendly, bike-rides"
          />

          {!locationEnabled && (
            <div style={{ background: '#FFF8EC', border: '1px solid #F5C4B3', borderRadius: 12, padding: 10, marginTop: 12, marginBottom: 10, fontSize: 12, color: '#5D4037' }}>
              <div style={{ marginBottom: 8 }}>📍 Enable location so other groups can see how far you are.</div>
              <button 
                type="button"
                style={{ ...S.btn, ...S.btnOrange, marginTop: 0, width: '100%' }}
                onClick={() => requestLocation({ silent: false, openFilters: false })}
              >
                Use my location
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ ...S.btn, ...S.btnP }} disabled={clubBusy} onClick={handleSaveProfile}>Save Card</button>
            <button style={S.btn} disabled={clubBusy} onClick={() => setClubView('discover')}>Back</button>
          </div>
        </div>
      )}

      {clubView === 'requests' && (
        <div style={{ ...premiumPanel, animation: 'clubPop .25s ease-out both' }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Incoming Requests</div>
          {hub.incomingRequests.length === 0 && <div style={{ fontSize: 12, color: '#6b6b68' }}>No pending requests right now.</div>}
          {hub.incomingRequests.map(req => (
            <div key={req.id} style={{ border: '1px solid rgba(13,24,48,0.1)', borderRadius: 14, padding: 12, marginBottom: 8, background: 'linear-gradient(180deg,#FFFFFF,#F8FBFF)' }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{req.requesterTrip.groupName}</div>
              <div style={{ fontSize: 12, color: '#60636D', marginTop: 2 }}>{req.message}</div>
              <div style={{ fontSize: 11, color: '#77839A', marginTop: 4 }}>Received {formatChatMetaTime(req.createdAt)}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button style={{ ...S.btn, ...S.btnP, marginTop: 0 }} onClick={() => handleRequestAction(req.id, 'accepted')} disabled={clubBusy}>Accept</button>
                <button style={{ ...S.btn, marginTop: 0 }} onClick={() => handleRequestAction(req.id, 'declined')} disabled={clubBusy}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {clubView === 'chats' && (
        <div style={{ ...premiumPanel, animation: 'clubPop .25s ease-out both' }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Club Chats</div>
          <div style={{ fontSize: 12, color: '#667085', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span>Single-window chat experience.</span>
            <span>{hasUnreadChats ? 'New messages waiting' : 'All caught up'}</span>
          </div>

          {(!hub.chats || hub.chats.length === 0) && (
            <div style={{ fontSize: 13, color: '#6b6b68', textAlign: 'center', padding: '18px 0' }}>
              Accept a request to unlock a shared trip chat.
            </div>
          )}

          {hub.chats?.length > 0 && (
            <div>
              {!activeChat && (
                <div style={{ display: 'grid', gap: 8 }}>
                  {hub.chats.map(chat => {
                    const preview = chat.latestMessage?.text || `Start the ${chat.title} chat.`;
                    const avatar = chat.otherTrip?.clubProfile?.photoUrl || chat.otherTrip?.coverUrl || null;
                    const unread = unreadCountByChat[chat.id] || 0;
                    return (
                      <button
                        key={chat.id}
                        onClick={() => setSelectedChatId(chat.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          border: unread ? '1px solid rgba(23,127,94,0.28)' : '1px solid rgba(10,18,35,0.07)',
                          background: unread ? 'linear-gradient(180deg,#F2FFF8,#FFFFFF)' : 'linear-gradient(180deg,#FFFFFF,#F8FBFF)',
                          borderRadius: 18,
                          padding: 12,
                          cursor: 'pointer',
                          boxShadow: unread ? '0 12px 24px rgba(23,127,94,0.12)' : '0 8px 20px rgba(15,23,42,0.05)',
                        }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          {avatar ? (
                            <img src={avatar} alt="chat avatar" style={{ width: 46, height: 46, borderRadius: 13, objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: 46, height: 46, borderRadius: 13, display: 'grid', placeItems: 'center', background: '#EEF3FB', fontSize: 20 }}>
                              {chat.otherTrip?.emoji || '💬'}
                            </div>
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#101828', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.title}</div>
                              <div style={{ fontSize: 10, color: '#8A94A6', flexShrink: 0 }}>{formatChatMetaTime(chat.latestMessage?.createdAt)}</div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                              <div style={{ fontSize: 11, color: unread ? '#1E7B5E' : '#6B7280', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: unread ? 700 : 500 }}>{preview}</div>
                              {unread ? <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: '#1D9E75', color: '#fff', fontSize: 10, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>1</span> : null}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {clubView === 'chats' && activeChat && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 545, background: 'linear-gradient(180deg,#ECF6F4,#F4F9FF 68%,#FFFFFF)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 2, padding: '10px 12px', borderBottom: '1px solid rgba(10,18,35,0.08)', background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <button style={{ ...S.btn, marginTop: 0, padding: '8px 11px', borderRadius: 12 }} onClick={() => setSelectedChatId(null)}>←</button>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeChat.title}</div>
                <div style={{ fontSize: 11, color: '#627089', marginTop: 2 }}>Last seen {formatChatMetaTime(activeChat.latestMessage?.createdAt)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button style={{ ...S.btn, ...S.btnOrange, marginTop: 0, padding: '8px 12px', borderRadius: 12, fontSize: 12 }} onClick={handleDeleteChat} disabled={clubBusy}>Delete</button>
              <button style={{ ...S.btn, marginTop: 0, padding: '8px 12px', borderRadius: 12 }} onClick={() => setSelectedChatId(null)}>Close</button>
            </div>
          </div>

          <div ref={chatThreadRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeChat.messages?.length ? activeChat.messages.map(message => {
              const mine = message.senderTripId === trip.id;
              return (
                <div key={message.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '82%', background: mine ? 'linear-gradient(150deg,#0F172A,#1E293B)' : 'linear-gradient(150deg,#FFFFFF,#EEF7F3)', color: mine ? '#fff' : '#0B3B2E', borderRadius: 20, padding: '10px 12px', boxShadow: mine ? '0 14px 24px rgba(15,23,42,0.2)' : '0 8px 18px rgba(11,59,46,0.08)' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, opacity: mine ? 0.76 : 0.7, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                      {mine ? 'Your group' : message.senderUser?.name || activeChat.otherTrip?.groupName}
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.55, marginTop: 4, whiteSpace: 'pre-wrap' }}>{message.text}</div>
                    <div style={{ fontSize: 10, opacity: mine ? 0.72 : 0.58, marginTop: 7 }}>{formatChatTime(message.createdAt)}</div>
                  </div>
                </div>
              );
            }) : (
              <div style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', padding: '18px 0' }}>No messages yet. Break the ice.</div>
            )}
          </div>

          <div style={{ padding: 12, borderTop: '1px solid rgba(10,18,35,0.08)', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                style={{ ...S.input, resize: 'none', minHeight: 46, maxHeight: 122, marginBottom: 0, flex: 1, borderRadius: 15, border: '1px solid rgba(15,23,42,0.1)', boxShadow: '0 8px 18px rgba(15,23,42,0.06)' }}
                value={chatDraft}
                onChange={e => setChatDraft(e.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder={`Message ${activeChat.otherTrip?.groupName || 'this group'}...`}
              />
              <button
                type="button"
                onClick={openToolsChooser}
                disabled={!activeChat}
                aria-label="Open tools"
                title="Open tools"
                style={{ width: 46, height: 46, borderRadius: 14, border: '1px solid rgba(10,18,35,0.12)', background: 'linear-gradient(180deg,#FFFFFF,#EFF4FA)', display: 'grid', placeItems: 'center', cursor: activeChat ? 'pointer' : 'not-allowed', boxShadow: '0 8px 18px rgba(15,23,42,0.08)' }}
              >
                🧰
              </button>
              <button style={{ ...S.btn, ...S.btnOrange, marginTop: 0, height: 46, borderRadius: 14, padding: '0 16px' }} disabled={clubBusy || !chatDraft.trim()} onClick={handleSendChat}>Send</button>
            </div>
            <div style={{ fontSize: 10, color: '#8A94A6', marginTop: 6 }}>Press Enter to send, Shift+Enter for next line.</div>
          </div>
        </div>
      )}

      {toolsChooserOpen && activeChat && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 560, background: 'rgba(9,12,18,0.52)', display: 'grid', placeItems: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: 440, background: 'linear-gradient(180deg,#FFFFFF,#F5F9FF)', borderRadius: 26, padding: 16, boxShadow: '0 28px 80px rgba(0,0,0,0.28)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800 }}>Tools</div>
                <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>Choose what you want to do for this group</div>
              </div>
              <button style={{ ...S.btn, marginTop: 0 }} onClick={() => setToolsChooserOpen(false)}>Close</button>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <button
                onClick={() => openToolScreen('split')}
                style={{ textAlign: 'left', border: '1px solid rgba(10,18,35,0.10)', borderRadius: 18, padding: 14, background: '#F8FAFC' }}
              >
                <div style={{ fontSize: 20 }}>🧾</div>
                <div style={{ fontWeight: 800, marginTop: 6 }}>Split</div>
                <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>Add expenses and see balances for every member in both groups.</div>
              </button>
              <button
                onClick={() => openToolScreen('photos')}
                style={{ textAlign: 'left', border: '1px solid rgba(10,18,35,0.10)', borderRadius: 18, padding: 14, background: '#F8FAFC' }}
              >
                <div style={{ fontSize: 20 }}>🖼️</div>
                <div style={{ fontWeight: 800, marginTop: 6 }}>Photos</div>
                <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>Open a full-screen gallery of the combined group photos.</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {toolScreenOpen && activeChat && chatTool === 'split' && (
        <div className="tb-animated-screen" style={{ position: 'fixed', inset: 0, zIndex: 570, background: '#fff', overflowY: 'auto' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 2, padding: 18, background: 'linear-gradient(135deg,#0F172A,#134E4A)', color: '#fff', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800 }}>Split</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{combinedMembers.length} combined members, one shared wallet view</div>
            </div>
            <button style={{ ...S.btn, marginTop: 0, background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }} onClick={() => setToolScreenOpen(false)}>Close</button>
          </div>

          <div style={{ padding: 16, maxWidth: 1020, margin: '0 auto' }}>
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
                          <div key={`settlement-${index}`} style={{ background: '#fff', border: '1px solid rgba(10,18,35,0.08)', borderRadius: 12, padding: 10, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
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
              style={{ position: 'fixed', right: 18, bottom: 18, width: 58, height: 58, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#1D9E75,#0F6E56)', color: '#fff', fontSize: 29, cursor: 'pointer', boxShadow: '0 10px 28px rgba(15,110,86,0.45)', zIndex: 575 }}
            >
              +
            </button>
          )}

          {splitFormOpen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 580, background: '#F7F6F2', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '1rem 1.15rem', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#fff' }}>
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
          <div style={{ position: 'sticky', top: 0, zIndex: 2, padding: 18, background: 'linear-gradient(135deg,#1D4ED8,#0F766E)', color: '#fff', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800 }}>Photos</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>{combinedPhotos.length} combined group photos</div>
            </div>
            <button style={{ ...S.btn, marginTop: 0, background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.18)' }} onClick={() => setToolScreenOpen(false)}>Close</button>
          </div>

          <div style={{ padding: 18, maxWidth: 1240, margin: '0 auto' }}>
            {combinedPhotos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#667085' }}>No photos shared yet in the two trips.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12 }}>
                {combinedPhotos.map(photo => (
                  <div key={`cp-${photo.id}`} style={{ position: 'relative' }}>
                    <img src={photo.url} alt="combined trip" style={{ width: '100%', height: 190, borderRadius: 16, objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', left: 8, bottom: 8, fontSize: 10, fontWeight: 800, color: '#fff', background: 'rgba(3,10,24,0.55)', padding: '3px 7px', borderRadius: 999 }}>{photo.source}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {clubView === 'discover' && (
        <>
          <div style={{ ...premiumPanel, animation: 'clubPop .25s ease-out both' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 16 }}>Find Your Crowd</div>
                <div style={{ fontSize: 12, color: '#6b6b68', marginTop: 2 }}>Clean filters, premium cards, one-tap deep dive.</div>
              </div>
              <button style={{ ...S.btn, ...S.btnOrange, marginTop: 0 }} onClick={() => { setFilterDraft(filters); setFiltersOpen(true); }}>Filters</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <input
                style={{ ...S.input, marginBottom: 0 }}
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="Search group, destination, vibe, tags"
              />
              <button style={{ ...S.btn, marginTop: 0 }} onClick={() => setFilters(initialFilters)}>Reset</button>
            </div>

            <div style={{ marginTop: 9, fontSize: 12, color: '#5B6370' }}>
              {`Filters: ${VIBE_OPTIONS.find(v => v.value === filters.vibe)?.label || 'Any vibe'} • ${GENDER_MIX_OPTIONS.find(v => v.value === filters.genderMix)?.label || 'Any mix'} • ${MEMBER_BAND_OPTIONS.find(v => v.value === filters.memberBand)?.label || 'Any size'}${locationEnabled ? ` • ${radius} km` : ''}`}
            </div>

            {locationError && <div style={{ marginTop: 8, fontSize: 12, color: '#C3582D' }}>{locationError}</div>}
          </div>

          <div style={{ ...premiumPanel, animation: 'clubPop .25s ease-out both' }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Discover ({filteredDiscover.length})</div>
            {filteredDiscover.length === 0 && (
              <div style={{ fontSize: 13, color: '#6b6b68', textAlign: 'center', padding: '18px 0' }}>
                No groups found. Try wider radius, different vibe, or remove a filter.
              </div>
            )}

            {filteredDiscover
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
              <button style={{ ...S.btn, marginTop: 0 }} onClick={() => setFiltersOpen(false)}>Close</button>
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
                <div style={{ fontSize: 12, fontWeight: 800, color: '#0F6E56' }}>Distance Range</div>
                <div style={{ fontSize: 12, color: '#0F6E56', fontWeight: 700 }}>{locationEnabled ? `${radius} km` : 'Location off'}</div>
              </div>
              <input type="range" min="2" max="150" value={radius} onChange={(e) => setRadius(Number(e.target.value))} style={{ width: '100%' }} />
              <div style={{ fontSize: 11, color: '#6b6b68', marginTop: 4 }}>2 km to 150 km+</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {!locationEnabled && <button style={{ ...S.btn, ...S.btnOrange, marginTop: 0 }} onClick={() => requestLocation({ silent: false, openFilters: true })}>Use my location</button>}
                {locationEnabled && <button style={{ ...S.btn, marginTop: 0 }} onClick={() => { setLocationEnabled(false); try { localStorage.setItem('travelbae_club_location_enabled', 'false'); } catch {} }}>Turn location off</button>}
              </div>
            </div>

            {locationError && <div style={{ marginTop: 8, fontSize: 12, color: '#C3582D' }}>{locationError}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button style={{ ...S.btn, flex: 1, marginTop: 0 }} onClick={() => { setFilterDraft(initialFilters); setRadius(25); }}>Reset</button>
              <button style={{ ...S.btn, ...S.btnOrange, flex: 1, marginTop: 0 }} onClick={applyFilters}>Save and Go</button>
            </div>
          </div>
        </div>
      )}

      {selectedCard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,12,18,0.55)', zIndex: 520, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'clubFadeIn .22s ease-out both' }}>
          <div style={{ width: '100%', maxWidth: 620, maxHeight: '88vh', overflowY: 'auto', background: '#fff', borderRadius: 26, boxShadow: '0 34px 90px rgba(0,0,0,0.26)', overflow: 'hidden', animation: 'clubSheetIn .3s cubic-bezier(.2,.7,.2,1) both' }}>
            <div style={{ background: moodGradient(selectedCard.vibe || 'mixed'), color: '#fff', position: 'relative', minHeight: 280, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: selectedGallery[selectedMediaIndex] ? `linear-gradient(180deg, rgba(10,16,28,0.18), rgba(10,16,28,0.6)), url(${selectedGallery[selectedMediaIndex]}) center/cover` : moodGradient(selectedCard.vibe || 'mixed') }} />
              <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', animation: 'clubFloat 5.5s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(4,7,16,0.68))' }} />
              <div style={{ position: 'relative', padding: 18, minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: '75%' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '6px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)' }}>{distanceLabel(selectedCard.distance)}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '6px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)' }}>{(selectedCard.vibe || 'mixed').toUpperCase()} vibe</span>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '6px 10px', borderRadius: 999, background: isRecentlyActive(selectedCard.updatedAt) ? 'rgba(103,255,186,0.25)' : 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)' }}>{isRecentlyActive(selectedCard.updatedAt) ? 'Active Today' : 'Quiet Today'}</span>
                  </div>
                  <button style={{ ...S.btn, marginTop: 0, alignSelf: 'flex-start', background: 'rgba(255,255,255,0.16)', color: '#fff', border: '1px solid rgba(255,255,255,0.24)', backdropFilter: 'blur(10px)' }} onClick={() => setSelectedCard(null)}>Close</button>
                </div>

                <div>
                  <div style={{ position: 'relative', display: 'inline-flex', overflow: 'hidden', borderRadius: 999, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '7px 11px', background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                      travelbae club profile
                    </span>
                    <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.36) 45%, transparent 80%)', animation: 'clubShine 3.4s ease-in-out infinite' }} />
                  </div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 800, lineHeight: 1.08 }}>{selectedCard.trip?.groupName}</div>
                  <div style={{ fontSize: 14, opacity: 0.95, marginTop: 6 }}>{selectedCard.trip?.destination} • {selectedCard.trip?.members?.length || 0} travelers • {genderMixLabel(selectedCard.genderMix)}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, maxWidth: 420, marginTop: 10, color: 'rgba(255,255,255,0.92)' }}>{selectedCard.about || getGroupMoodLine(selectedCard)}</div>
                </div>

                {selectedGallery.length > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14 }}>
                    <div style={{ display: 'flex', gap: 7 }}>
                      {selectedGallery.map((_, index) => (
                        <button
                          key={`gallery-dot-${index}`}
                          onClick={() => setSelectedMediaIndex(index)}
                          style={{ width: index === selectedMediaIndex ? 24 : 8, height: 8, borderRadius: 999, border: 'none', background: index === selectedMediaIndex ? '#fff' : 'rgba(255,255,255,0.42)', padding: 0, transition: 'all .22s ease', cursor: 'pointer' }}
                          aria-label={`Show image ${index + 1}`}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button style={{ ...S.btn, marginTop: 0, background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => setSelectedMediaIndex((current) => (current - 1 + selectedGallery.length) % selectedGallery.length)}>Prev</button>
                      <button style={{ ...S.btn, marginTop: 0, background: 'rgba(255,255,255,0.14)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => setSelectedMediaIndex((current) => (current + 1) % selectedGallery.length)}>Next</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: 18 }}>
              {(() => {
                const compatibility = buildCompatibility(hub.myProfile, trip, selectedCard);
                return (
                  <div style={{ background: '#F7F8FC', borderRadius: 16, padding: 14, marginBottom: 14, animation: 'clubSectionIn .35s ease-out both' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <MatchRing score={compatibility.score} />
                        <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#6b6f7b', textTransform: 'uppercase', letterSpacing: '.04em' }}>Compatibility</div>
                        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, color: '#111827' }}>{compatibility.score}% match</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {compatibility.reasons.map((reason, idx) => (
                          <span key={`modal-reason-${idx}`} style={{ fontSize: 11, fontWeight: 800, padding: '6px 10px', borderRadius: 999, background: '#E8FFF6', color: '#0B7A5A' }}>{reason}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginBottom: 12 }}>
                <div style={{ background: '#FAFBFE', borderRadius: 14, padding: 12, animation: 'clubSectionIn .4s ease-out both' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#6b6f7b', textTransform: 'uppercase' }}>About</div>
                  <div style={{ fontSize: 13, color: '#20222a', lineHeight: 1.6, marginTop: 6 }}>{selectedCard.about || getGroupMoodLine(selectedCard)}</div>
                </div>
                <div style={{ background: '#FAFBFE', borderRadius: 14, padding: 12, animation: 'clubSectionIn .45s ease-out both' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#6b6f7b', textTransform: 'uppercase' }}>Looking For</div>
                  <div style={{ fontSize: 13, color: '#20222a', lineHeight: 1.6, marginTop: 6 }}>{selectedCard.lookingFor || 'Open to great plans and a smooth connection.'}</div>
                </div>
                <div style={{ background: '#FAFBFE', borderRadius: 14, padding: 12, animation: 'clubSectionIn .5s ease-out both' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#6b6f7b', textTransform: 'uppercase' }}>Group Mix</div>
                  <div style={{ fontSize: 13, color: '#20222a', lineHeight: 1.6, marginTop: 6 }}>{genderMixLabel(selectedCard.genderMix)}</div>
                </div>
                <div style={{ background: '#FAFBFE', borderRadius: 14, padding: 12, animation: 'clubSectionIn .55s ease-out both' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#6b6f7b', textTransform: 'uppercase' }}>Group Size</div>
                  <div style={{ fontSize: 13, color: '#20222a', lineHeight: 1.6, marginTop: 6 }}>{selectedCard.trip?.members?.length || 0} travelers</div>
                </div>
              </div>

              {Array.isArray(selectedCard.coverTags) && selectedCard.coverTags.length > 0 && (
                <div style={{ marginBottom: 14, animation: 'clubSectionIn .6s ease-out both' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#6b6f7b', textTransform: 'uppercase', marginBottom: 8 }}>Interests</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selectedCard.coverTags.map(tag => (
                      <span key={`modal-tag-${tag}`} style={{ fontSize: 11, fontWeight: 800, padding: '7px 10px', borderRadius: 999, background: '#EEF1FF', color: '#3946C6' }}>#{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {requestFor === selectedCard.tripId ? (
                <div style={{ marginTop: 12, animation: 'clubSectionIn .65s ease-out both' }}>
                  <textarea
                    style={{ ...S.input, resize: 'vertical', minHeight: 88, fontSize: 13 }}
                    value={requestMessage}
                    onChange={e => setRequestMessage(e.target.value)}
                    placeholder="Say hi, mention your vibe, and suggest a plan..."
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button style={{ ...S.btn, ...S.btnOrange, flex: 1, marginTop: 0 }} disabled={clubBusy || !requestMessage.trim()} onClick={async () => { await handleSendRequest(); setSelectedCard(null); }}>Send Request</button>
                    <button style={{ ...S.btn, marginTop: 0 }} onClick={() => { setRequestFor(null); setRequestMessage(''); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, animation: 'clubSectionIn .65s ease-out both' }}>
                  <button style={{ ...S.btn, ...S.btnOrange, flex: 1, marginTop: 0, opacity: selectedAlreadySent ? 0.6 : 1 }} disabled={selectedAlreadySent || clubBusy} onClick={() => setRequestFor(selectedCard.tripId)}>
                    {selectedAlreadySent ? 'Request Sent' : 'Send Connection Request'}
                  </button>
                  <button style={{ ...S.btn, marginTop: 0 }} onClick={() => setSelectedCard(null)}>Back</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClubPage;
