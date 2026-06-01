import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getClubHub, upsertClubProfile, updateClubStatus, sendClubRequest, respondClubRequest } from '../../api';
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
  hideRequested: false,
  withPhoto: false,
  activeOnly: false,
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
  if (km == null) return 'Distance unknown';
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

function ClubDiscoveryCard({ item, compatibility, alreadySent, onStartRequest, requestFor, requestMessage, setRequestMessage, onSendRequest, onCancelRequest, busy }) {
  const tags = Array.isArray(item.coverTags) ? item.coverTags : [];
  const members = item.trip?.members?.length || 0;
  const activeNow = isRecentlyActive(item.updatedAt);
  const avatar = item.photoUrl || item.trip?.coverUrl || null;

  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)', marginBottom: 14, background: '#fff', boxShadow: '0 12px 32px rgba(24,24,24,0.08)' }}>
      <div style={{ background: moodGradient(item.vibe || 'mixed'), padding: 14, color: '#fff', position: 'relative' }}>
        <div style={{ position: 'absolute', right: -24, top: -24, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
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
              {item.trip?.destination} • {members} members
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.22)' }}>{distanceLabel(item.distance)}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.22)' }}>{(item.vibe || 'mixed').toUpperCase()} vibe</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: activeNow ? 'rgba(103,255,186,0.25)' : 'rgba(255,255,255,0.22)' }}>
                {activeNow ? 'Active now' : 'Recently seen'}
              </span>
              {compatibility && (
                <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.26)' }}>
                  {compatibility.score}% match
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 13, color: '#242424', lineHeight: 1.5 }}>{item.about}</div>

        {compatibility?.reasons?.length > 0 && (
          <div style={{ marginTop: 9, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {compatibility.reasons.map((reason, idx) => (
              <span key={`${item.id}-reason-${idx}`} style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 999, background: '#E9FFF6', color: '#0B7A5A' }}>
                {reason}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8, marginTop: 10 }}>
          <div style={{ background: '#F6F7FA', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: '#70727A', textTransform: 'uppercase', fontWeight: 700 }}>Gender Mix</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{genderMixLabel(item.genderMix)}</div>
            {(item.boysCount != null || item.girlsCount != null) && (
              <div style={{ fontSize: 11, color: '#575B66', marginTop: 2 }}>Boys {item.boysCount ?? 0} • Girls {item.girlsCount ?? 0}</div>
            )}
          </div>
          <div style={{ background: '#F6F7FA', borderRadius: 10, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: '#70727A', textTransform: 'uppercase', fontWeight: 700 }}>Looking For</div>
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, lineHeight: 1.35 }}>{item.lookingFor || 'Open to meeting great people'}</div>
          </div>
        </div>

        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            {tags.slice(0, 8).map(tag => (
              <span key={`${item.id}-${tag}`} style={{ fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 999, background: '#EEF1FF', color: '#3946C6' }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {requestFor === item.tripId ? (
          <div style={{ marginTop: 12 }}>
            <textarea
              style={{ ...S.input, resize: 'vertical', minHeight: 70, fontSize: 12 }}
              value={requestMessage}
              onChange={e => setRequestMessage(e.target.value)}
              placeholder="Say hi and tell them what you want to do together..."
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button style={{ ...S.btn, ...S.btnOrange, flex: 1, marginTop: 0 }} disabled={busy || !requestMessage.trim()} onClick={onSendRequest}>Send Request</button>
              <button style={{ ...S.btn, marginTop: 0 }} onClick={onCancelRequest}>Cancel</button>
            </div>
          </div>
        ) : (
          <button
            style={{ ...S.btn, ...S.btnOrange, width: '100%', marginTop: 12, opacity: alreadySent ? 0.55 : 1 }}
            disabled={alreadySent || busy}
            onClick={onStartRequest}
          >
            {alreadySent ? 'Request sent' : 'Connect with this group'}
          </button>
        )}
      </div>
    </div>
  );
}

function ClubPage({ trip }) {
  const [clubLoading, setClubLoading] = useState(true);
  const [clubBusy, setClubBusy] = useState(false);
  const [hub, setHub] = useState({ myProfile: null, discover: [], incomingRequests: [], outgoingRequests: [] });
  const [clubView, setClubView] = useState('discover');
  const [filters, setFilters] = useState(initialFilters);

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
        activeOnly: filters.activeOnly,
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
  }, [trip.id, trip.groupName, locationEnabled, userLocation, debouncedRadius, filters.vibe, filters.activeOnly]);

  useEffect(() => { loadHub(); }, [loadHub]);

  const listed = (hub.myProfile?.status || 'snooze') === 'listed';

  const filteredDiscover = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return (hub.discover || []).filter(item => {
      if (item.status !== 'listed') return false;

      const alreadySent = hub.outgoingRequests.some(r => r.targetTripId === item.tripId && r.status === 'pending');
      if (filters.hideRequested && alreadySent) return false;

      const members = item.trip?.members?.length || 0;
      if (filters.memberBand === '2plus' && members < 2) return false;
      if (filters.memberBand === '4plus' && members < 4) return false;
      if (filters.memberBand === '6plus' && members < 6) return false;

      if (filters.genderMix !== 'any' && (item.genderMix || 'mixed') !== filters.genderMix) return false;
      if (filters.withPhoto && !item.photoUrl) return false;
      if (filters.activeOnly && !isRecentlyActive(item.updatedAt)) return false;

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
  }, [hub.discover, hub.outgoingRequests, filters]);

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
      await respondClubRequest(trip.id, requestId, action);
      await loadHub();
    } catch (err) {
      alert('Could not update request: ' + err.message);
    }
    setClubBusy(false);
  };

  if (clubLoading) return <Spinner text="Loading Club..." solo={trip.isSolo} />;

  return (
    <div>
      <style>{`
        @keyframes clubPop {
          from { opacity: 0; transform: translateY(6px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
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
          {['discover', 'profile', 'requests'].map(tab => (
            <button
              key={tab}
              onClick={() => setClubView(tab)}
              style={{ ...S.btn, marginTop: 0, border: 'none', fontSize: 12, background: clubView === tab ? '#fff' : 'rgba(255,255,255,0.16)', color: clubView === tab ? '#0C5B47' : '#fff', fontWeight: 700 }}
            >
              {tab === 'requests' ? `Requests (${hub.incomingRequests.length})` : tab === 'profile' ? 'Edit Profile' : 'Discover'}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={S.label}>No. of boys</label>
              <input type="number" min="0" max="99" style={S.input} value={profileForm.boysCount} onChange={e => setProfileForm(f => ({ ...f, boysCount: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label style={S.label}>No. of girls</label>
              <input type="number" min="0" max="99" style={S.input} value={profileForm.girlsCount} onChange={e => setProfileForm(f => ({ ...f, girlsCount: e.target.value }))} placeholder="0" />
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

      {clubView === 'discover' && (
        <>
          <div style={{ ...S.card, animation: 'clubPop .25s ease-out both' }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 800, fontSize: 16, marginBottom: 10 }}>Find Your Crowd</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
              <input
                style={{ ...S.input, marginBottom: 0 }}
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="Search group, destination, vibe, tags"
              />
              <button style={{ ...S.btn, marginTop: 0 }} onClick={() => setFilters(initialFilters)}>Reset</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              <select style={S.input} value={filters.memberBand} onChange={e => setFilters(f => ({ ...f, memberBand: e.target.value }))}>
                {MEMBER_BAND_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <select style={S.input} value={filters.vibe} onChange={e => setFilters(f => ({ ...f, vibe: e.target.value }))}>
                {VIBE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <select style={S.input} value={filters.genderMix} onChange={e => setFilters(f => ({ ...f, genderMix: e.target.value }))}>
                {GENDER_MIX_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
              <button style={{ ...S.btn, marginTop: 0 }} onClick={() => setFilters(f => ({ ...f, hideRequested: !f.hideRequested }))}>
                {filters.hideRequested ? 'Hide requested: ON' : 'Hide requested: OFF'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <button style={{ ...S.btn, marginTop: 0 }} onClick={() => setFilters(f => ({ ...f, withPhoto: !f.withPhoto }))}>{filters.withPhoto ? 'Photo only: ON' : 'Photo only: OFF'}</button>
              <button style={{ ...S.btn, marginTop: 0 }} onClick={() => setFilters(f => ({ ...f, activeOnly: !f.activeOnly }))}>{filters.activeOnly ? 'Active only: ON' : 'Active only: OFF'}</button>
              {!locationEnabled && <button style={{ ...S.btn, ...S.btnOrange, marginTop: 0 }} onClick={requestLocation}>Use my location</button>}
              {locationEnabled && <button style={{ ...S.btn, marginTop: 0 }} onClick={() => setLocationEnabled(false)}>Disable location</button>}
            </div>

            {locationError && <div style={{ marginTop: 8, fontSize: 12, color: '#C3582D' }}>{locationError}</div>}

            {locationEnabled && (
              <div style={{ marginTop: 10, background: '#EEF9F6', borderRadius: 12, padding: 10, border: '1px solid #CBEADF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: '#0F6E56', fontWeight: 700 }}>
                  <span>Radius</span>
                  <span>{radius <= 150 ? `${radius} km` : '150+ km'}</span>
                </div>
                <input type="range" min="2" max="150" value={radius} onChange={(e) => setRadius(Number(e.target.value))} style={{ width: '100%' }} />
                <div style={{ fontSize: 11, color: '#518A7C', marginTop: 4 }}>2 km to 150 km+</div>
              </div>
            )}
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
                  onStartRequest={() => setRequestFor(item.tripId)}
                  requestFor={requestFor}
                  requestMessage={requestMessage}
                  setRequestMessage={setRequestMessage}
                  onSendRequest={handleSendRequest}
                  onCancelRequest={() => { setRequestFor(null); setRequestMessage(''); }}
                  busy={clubBusy}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ClubPage;
