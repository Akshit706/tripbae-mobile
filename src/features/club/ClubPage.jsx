import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getClubHub, upsertClubProfile, updateClubStatus, sendClubRequest, respondClubRequest, sendClubChatMessage, createClubChatSplitExpense } from '../../api';
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

function ClubPage({ trip }) {
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
  const [chatTool, setChatTool] = useState('split');
  const [splitDraft, setSplitDraft] = useState({ desc: '', amount: '', paidBy: '', splitWith: [] });

  const [requestFor, setRequestFor] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');

  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [locationEnabled, setLocationEnabled] = useState(false);
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedRadius(radius), 260);
    return () => clearTimeout(t);
  }, [radius]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported on this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationError('');
        setLocationEnabled(true);
        setFiltersOpen(true);
      },
      () => {
        setLocationError('Location permission denied. You can still use manual filters.');
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

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
  }, [hub.discover, filters]);

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

  const handleToggleSplitMember = (memberId) => {
    setSplitDraft((draft) => {
      const exists = draft.splitWith.includes(memberId);
      return {
        ...draft,
        splitWith: exists ? draft.splitWith.filter(id => id !== memberId) : [...draft.splitWith, memberId],
      };
    });
  };

  const handleAddSplitEntry = () => {
    if (!activeChat) return;
    const amount = Number(splitDraft.amount);
    if (!splitDraft.desc.trim() || !Number.isFinite(amount) || amount <= 0 || splitDraft.splitWith.length === 0 || !splitDraft.paidBy) {
      alert('Add a valid split with description, amount, payer, and at least one participant.');
      return;
    }
    setClubBusy(true);
    createClubChatSplitExpense(trip.id, activeChat.id, {
      desc: splitDraft.desc.trim(),
      amount,
      paidByKey: splitDraft.paidBy,
      splitWithKeys: splitDraft.splitWith,
    })
      .then(async () => {
        await loadHub();
        setSplitDraft((draft) => ({
          ...draft,
          desc: '',
          amount: '',
          splitWith: combinedMembers.map(member => member.id),
        }));
      })
      .catch((err) => {
        alert('Could not add split expense: ' + err.message);
      })
      .finally(() => {
        setClubBusy(false);
      });
  };

  const applyFilters = () => {
    setFilters(filterDraft);
    setFiltersOpen(false);
  };

  const selectedAlreadySent = selectedCard
    ? hub.outgoingRequests.some(r => r.targetTripId === selectedCard.tripId && r.status === 'pending')
    : false;

  const activeChat = useMemo(
    () => (hub.chats || []).find(chat => chat.id === selectedChatId) || (hub.chats || [])[0] || null,
    [hub.chats, selectedChatId]
  );

  const combinedMembers = useMemo(() => buildCombinedMembers(activeChat), [activeChat]);
  const combinedPhotos = useMemo(() => buildCombinedPhotos(activeChat), [activeChat]);
  const splitEntries = useMemo(() => activeChat?.splitExpenses || [], [activeChat]);
  const splitBalances = useMemo(
    () => computeSplitBalances(combinedMembers, splitEntries),
    [combinedMembers, splitEntries]
  );

  const selectedGallery = useMemo(() => buildCardGallery(selectedCard), [selectedCard]);

  useEffect(() => {
    setSelectedMediaIndex(0);
  }, [selectedCard?.id]);

  useEffect(() => {
    if (!hub.chats?.length) {
      setSelectedChatId(null);
      return;
    }
    if (!selectedChatId || !hub.chats.some(chat => chat.id === selectedChatId)) {
      setSelectedChatId(hub.chats[0].id);
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

      <div style={{ background: trip.isSolo ? 'linear-gradient(130deg,#6D4DF5,#4430B7)' : 'linear-gradient(130deg,#0E8D6A,#0B5E48)', borderRadius: 16, padding: '1.1rem 1rem', marginBottom: '1rem', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800 }}>TravelBae Club</div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>{listed ? 'Your group is visible to nearby travelers.' : 'You are snoozed right now.'}</div>
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

        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {['discover', 'profile', 'requests', 'chats'].map(tab => (
            <button
              key={tab}
              onClick={() => setClubView(tab)}
              style={{ ...S.btn, marginTop: 0, border: 'none', fontSize: 12, background: clubView === tab ? '#fff' : 'rgba(255,255,255,0.16)', color: clubView === tab ? '#0C5B47' : '#fff', fontWeight: 700 }}
            >
              {tab === 'requests' ? `Requests (${hub.incomingRequests.length})` : tab === 'profile' ? 'Edit Profile' : tab === 'chats' ? `Chats (${hub.chats?.length || 0})` : 'Discover'}
            </button>
          ))}
        </div>
      </div>

      {clubView === 'profile' && (
        <div style={{ ...S.card, animation: 'clubPop .25s ease-out both' }}>
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

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ ...S.btn, ...S.btnP }} disabled={clubBusy} onClick={handleSaveProfile}>Save Card</button>
            <button style={S.btn} disabled={clubBusy} onClick={() => setClubView('discover')}>Back</button>
          </div>
        </div>
      )}

      {clubView === 'requests' && (
        <div style={{ ...S.card, animation: 'clubPop .25s ease-out both' }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Incoming Requests</div>
          {hub.incomingRequests.length === 0 && <div style={{ fontSize: 12, color: '#6b6b68' }}>No pending requests right now.</div>}
          {hub.incomingRequests.map(req => (
            <div key={req.id} style={{ border: '1px solid rgba(0,0,0,0.09)', borderRadius: 12, padding: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{req.requesterTrip.groupName}</div>
              <div style={{ fontSize: 12, color: '#60636D', marginTop: 2 }}>{req.message}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button style={{ ...S.btn, ...S.btnP, marginTop: 0 }} onClick={() => handleRequestAction(req.id, 'accepted')} disabled={clubBusy}>Accept</button>
                <button style={{ ...S.btn, marginTop: 0 }} onClick={() => handleRequestAction(req.id, 'declined')} disabled={clubBusy}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {clubView === 'chats' && (
        <div style={{ ...S.card, animation: 'clubPop .25s ease-out both' }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Club Chats</div>

          {(!hub.chats || hub.chats.length === 0) && (
            <div style={{ fontSize: 13, color: '#6b6b68', textAlign: 'center', padding: '18px 0' }}>
              Accept a request to unlock a shared trip chat.
            </div>
          )}

          {hub.chats?.length > 0 && (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {hub.chats.map(chat => {
                  const preview = chat.latestMessage?.text || `Start the ${chat.title} chat.`;
                  const avatar = chat.otherTrip?.clubProfile?.photoUrl || chat.otherTrip?.coverUrl || null;
                  return (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChatId(chat.id)}
                      style={{
                        minWidth: 240,
                        textAlign: 'left',
                        border: selectedChatId === chat.id ? '1px solid rgba(11,122,90,0.28)' : '1px solid rgba(10,18,35,0.08)',
                        background: selectedChatId === chat.id ? '#F2FFF9' : '#fff',
                        borderRadius: 16,
                        padding: 10,
                        cursor: 'pointer',
                        boxShadow: selectedChatId === chat.id ? '0 14px 24px rgba(11,122,90,0.09)' : 'none',
                      }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        {avatar ? (
                          <img src={avatar} alt="chat avatar" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: '#EEF3FB', fontSize: 20 }}>
                            {chat.otherTrip?.emoji || '💬'}
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#101828' }}>{chat.title}</div>
                          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{preview}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {activeChat && (
                <div style={{ border: '1px solid rgba(10,18,35,0.08)', borderRadius: 18, overflow: 'hidden', background: '#FCFDFE' }}>
                  <div style={{ padding: 14, borderBottom: '1px solid rgba(10,18,35,0.06)', background: 'linear-gradient(135deg,#F7FFF9,#F7FAFF)' }}>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: '#111827' }}>{activeChat.title}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Talk, plan, then use tools for this combined group.</div>
                  </div>

                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto', background: 'linear-gradient(180deg,#FFFFFF,#F7FAFD)' }}>
                    {activeChat.messages?.length ? activeChat.messages.map(message => {
                      const mine = message.senderTripId === trip.id;
                      return (
                        <div key={message.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                          <div style={{ maxWidth: '78%', background: mine ? '#0F172A' : '#EAF7F1', color: mine ? '#fff' : '#0B3B2E', borderRadius: 18, padding: '10px 12px', boxShadow: mine ? '0 10px 20px rgba(15,23,42,0.18)' : 'none' }}>
                            <div style={{ fontSize: 10, fontWeight: 800, opacity: mine ? 0.72 : 0.7, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                              {mine ? 'Your group' : message.senderUser?.name || activeChat.otherTrip?.groupName}
                            </div>
                            <div style={{ fontSize: 13, lineHeight: 1.5, marginTop: 4 }}>{message.text}</div>
                            <div style={{ fontSize: 10, opacity: mine ? 0.7 : 0.55, marginTop: 6 }}>{formatChatTime(message.createdAt)}</div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', padding: '18px 0' }}>No messages yet. Break the ice.</div>
                    )}
                  </div>

                  <div style={{ padding: 14, borderTop: '1px solid rgba(10,18,35,0.06)', background: '#fff' }}>
                    <textarea
                      style={{ ...S.input, resize: 'vertical', minHeight: 76, marginBottom: 10 }}
                      value={chatDraft}
                      onChange={e => setChatDraft(e.target.value)}
                      placeholder={`Message ${activeChat.otherTrip?.groupName || 'this group'}...`}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 11, color: '#6B7280', alignSelf: 'center' }}>Chat opens when a request is accepted.</div>
                      <button style={{ ...S.btn, ...S.btnOrange, marginTop: 0 }} disabled={clubBusy || !chatDraft.trim()} onClick={handleSendChat}>Send</button>
                    </div>

                    <div style={{ marginTop: 12, borderTop: '1px dashed rgba(10,18,35,0.14)', paddingTop: 10 }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button style={{ ...S.btn, marginTop: 0, background: chatTool === 'split' ? '#0F172A' : '#F3F6FA', color: chatTool === 'split' ? '#fff' : '#253048' }} onClick={() => setChatTool('split')}>Tools: Split</button>
                        <button style={{ ...S.btn, marginTop: 0, background: chatTool === 'photos' ? '#0F172A' : '#F3F6FA', color: chatTool === 'photos' ? '#fff' : '#253048' }} onClick={() => setChatTool('photos')}>Tools: Photos</button>
                      </div>

                      {chatTool === 'split' && (
                        <div style={{ marginTop: 10, background: '#F8FAFC', border: '1px solid rgba(10,18,35,0.08)', borderRadius: 14, padding: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#121926' }}>Combined Group Split</div>
                          <div style={{ fontSize: 11, color: '#667085', marginTop: 2 }}>{combinedMembers.length} members across both groups</div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr', gap: 8, marginTop: 10 }}>
                            <input style={{ ...S.input, marginBottom: 0 }} placeholder="Expense title" value={splitDraft.desc} onChange={(e) => setSplitDraft((draft) => ({ ...draft, desc: e.target.value }))} />
                            <input style={{ ...S.input, marginBottom: 0 }} placeholder="Amount" type="number" min="0" value={splitDraft.amount} onChange={(e) => setSplitDraft((draft) => ({ ...draft, amount: e.target.value }))} />
                          </div>

                          <div style={{ marginTop: 8 }}>
                            <label style={S.label}>Paid by</label>
                            <select style={{ ...S.input, marginBottom: 0 }} value={splitDraft.paidBy} onChange={(e) => setSplitDraft((draft) => ({ ...draft, paidBy: e.target.value }))}>
                              {combinedMembers.map(member => (
                                <option key={member.id} value={member.id}>{member.nickname} ({member.groupName})</option>
                              ))}
                            </select>
                          </div>

                          <div style={{ marginTop: 8 }}>
                            <label style={S.label}>Split with</label>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {combinedMembers.map(member => {
                                const selected = splitDraft.splitWith.includes(member.id);
                                return (
                                  <button key={member.id} style={{ ...S.btn, marginTop: 0, background: selected ? '#0D7A5A' : '#EEF2F7', color: selected ? '#fff' : '#324155' }} onClick={() => handleToggleSplitMember(member.id)}>
                                    {member.nickname}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                            <div style={{ fontSize: 11, color: '#667085' }}>Per head: {splitDraft.splitWith.length ? `₹${((Number(splitDraft.amount) || 0) / splitDraft.splitWith.length).toFixed(2)}` : '₹0.00'}</div>
                            <button style={{ ...S.btn, ...S.btnOrange, marginTop: 0 }} onClick={handleAddSplitEntry}>Add Split</button>
                          </div>

                          {splitEntries.length > 0 && (
                            <div style={{ marginTop: 10 }}>
                              <div style={{ fontSize: 12, fontWeight: 800, color: '#273043', marginBottom: 6 }}>Balances</div>
                              <div style={{ display: 'grid', gap: 6 }}>
                                {combinedMembers.map(member => {
                                  const balance = splitBalances[member.id] || 0;
                                  return (
                                    <div key={`bal-${member.id}`} style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', borderRadius: 10, border: '1px solid rgba(10,18,35,0.08)', padding: '8px 10px' }}>
                                      <span style={{ fontSize: 12, color: '#344054' }}>{member.nickname} ({member.groupName})</span>
                                      <span style={{ fontSize: 12, fontWeight: 800, color: balance >= 0 ? '#0B7A5A' : '#B42318' }}>{balance >= 0 ? `gets ₹${balance.toFixed(2)}` : `owes ₹${Math.abs(balance).toFixed(2)}`}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {chatTool === 'photos' && (
                        <div style={{ marginTop: 10, background: '#F8FAFC', border: '1px solid rgba(10,18,35,0.08)', borderRadius: 14, padding: 12 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#121926' }}>Combined Group Photos</div>
                          <div style={{ fontSize: 11, color: '#667085', marginTop: 2 }}>{combinedPhotos.length} photos from both trips</div>
                          {combinedPhotos.length === 0 && (
                            <div style={{ fontSize: 12, color: '#667085', marginTop: 8 }}>No photos shared yet in the two trips.</div>
                          )}
                          {combinedPhotos.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))', gap: 8, marginTop: 10 }}>
                              {combinedPhotos.slice(0, 24).map(photo => (
                                <div key={`cp-${photo.id}`} style={{ position: 'relative' }}>
                                  <img src={photo.url} alt="combined trip" style={{ width: '100%', height: 88, borderRadius: 10, objectFit: 'cover' }} />
                                  <div style={{ position: 'absolute', left: 4, bottom: 4, fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(3,10,24,0.55)', padding: '2px 6px', borderRadius: 999 }}>{photo.source}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {clubView === 'discover' && (
        <>
          <div style={{ ...S.card, animation: 'clubPop .25s ease-out both' }}>
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

          <div style={{ ...S.card, animation: 'clubPop .25s ease-out both' }}>
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
                {!locationEnabled && <button style={{ ...S.btn, ...S.btnOrange, marginTop: 0 }} onClick={requestLocation}>Use my location</button>}
                {locationEnabled && <button style={{ ...S.btn, marginTop: 0 }} onClick={() => setLocationEnabled(false)}>Turn location off</button>}
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
