import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getClubHub, upsertClubProfile, updateClubStatus, sendClubRequest, respondClubRequest } from '../../api';
import { S } from '../shared/styles';
import { Spinner } from '../shared/ui';

function ClubPage({ trip }){
  const [clubLoading, setClubLoading] = useState(true);
  const [clubBusy, setClubBusy] = useState(false);
  const [hub, setHub] = useState({ myProfile: null, discover: [], incomingRequests: [], outgoingRequests: [] });
  const [profileForm, setProfileForm] = useState({ title: '', about: '', lookingFor: '', photoUrl: null });
  const [requestFor, setRequestFor] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [clubView, setClubView] = useState('discover');
  const [filterText, setFilterText] = useState('');
  const [filterMemberBand, setFilterMemberBand] = useState('any');
  const [filterHideRequested, setFilterHideRequested] = useState(false);
  
  // Location & radius filtering
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [radius, setRadius] = useState(50); // km, default 50km
  const [useLocationFilter, setUseLocationFilter] = useState(false);
  const fileRef = useRef(null);

  // Request geolocation permission on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationError('');
        },
        (error) => {
          setLocationError('Location access denied. Enable location to see nearby groups.');
          console.log('Geolocation error:', error);
        }
      );
    }
  }, []);

  const loadHub = useCallback(async () => {
    setClubLoading(true);
    try {
      let params;
      if (useLocationFilter && userLocation && radius) {
        params = {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          radius,
        };
      }
      const data = await getClubHub(trip.id, params);
      setHub(data);
      setProfileForm({
        title: data.myProfile?.title || trip.groupName,
        about: data.myProfile?.about || '',
        lookingFor: data.myProfile?.lookingFor || '',
        photoUrl: data.myProfile?.photoUrl || null,
      });
    } catch (err) {
      alert('Could not load club: ' + err.message);
    }
    setClubLoading(false);
  }, [trip.id, trip.groupName, useLocationFilter, userLocation, radius]);

  useEffect(() => { loadHub(); }, [loadHub]);

  const listed = (hub.myProfile?.status || 'snooze') === 'listed';

  const filteredDiscover = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return (hub.discover || []).filter(item => {
      if (item.status !== 'listed') return false;

      const alreadySent = hub.outgoingRequests.some(r => r.targetTripId === item.tripId && r.status === 'pending');
      if (filterHideRequested && alreadySent) return false;

      const members = item.trip?.members?.length || 0;
      if (filterMemberBand === '2plus' && members < 2) return false;
      if (filterMemberBand === '4plus' && members < 4) return false;

      if (q) {
        const hay = [
          item.trip?.groupName || '',
          item.trip?.destination || '',
          item.about || '',
          item.lookingFor || '',
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [hub.discover, hub.outgoingRequests, filterText, filterMemberBand, filterHideRequested]);

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
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = c.toDataURL('image/jpeg', 0.85);
        setProfileForm(f => ({ ...f, photoUrl: dataUrl }));
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
    setClubBusy(true);
    try {
      await upsertClubProfile(trip.id, {
        ...profileForm,
        latitude: userLocation?.latitude,
        longitude: userLocation?.longitude,
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

  // Format distance
  const formatDistance = (dist) => {
    if (dist < 1) return `${Math.round(dist * 1000)}m`;
    if (dist > 1000) return `${(dist / 1000).toFixed(0)}k+ km`;
    return `${Math.round(dist)} km`;
  };

  if (clubLoading) return <Spinner text="Loading Club..." solo={trip.isSolo} />;

  return (
    <div>
      {/* Header */}
      <div style={{ background: trip.isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : 'linear-gradient(135deg,#1D9E75,#0F6E56)', borderRadius: 14, padding: '1.25rem', marginBottom: '1rem', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>🌍 TravelBae Club</div>
            <div style={{ fontSize: 12, opacity: 0.88 }}>
              {listed ? 'Your group is visible.' : 'Your group is hidden.'} {userLocation && useLocationFilter ? `(${formatDistance((radius))} radius)` : ''}
            </div>
          </div>
          <button
            onClick={handleToggle}
            disabled={clubBusy}
            aria-label="Toggle listed mode"
            style={{
              width: 50,
              height: 30,
              borderRadius: 999,
              border: 'none',
              background: listed ? '#34C759' : 'rgba(255,255,255,0.35)',
              padding: 3,
              cursor: clubBusy ? 'not-allowed' : 'pointer',
              transition: 'background .2s ease',
            }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: '#fff',
                display: 'block',
                transform: listed ? 'translateX(20px)' : 'translateX(0)',
                transition: 'transform .2s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              }}
            />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setClubView('discover')}
            style={{ ...S.btn, background: clubView === 'discover' ? '#fff' : 'rgba(255,255,255,0.16)', color: clubView === 'discover' ? '#085041' : '#fff', border: 'none', fontWeight: 600, fontSize: 12 }}>
            Discover
          </button>
          <button
            onClick={() => setClubView('profile')}
            style={{ ...S.btn, background: clubView === 'profile' ? '#fff' : 'rgba(255,255,255,0.16)', color: clubView === 'profile' ? '#085041' : '#fff', border: 'none', fontWeight: 600, fontSize: 12 }}>
            Edit Profile
          </button>
          <button
            onClick={() => setClubView('requests')}
            style={{ ...S.btn, background: clubView === 'requests' ? '#fff' : 'rgba(255,255,255,0.16)', color: clubView === 'requests' ? '#085041' : '#fff', border: 'none', fontWeight: 600, fontSize: 12 }}>
            Requests ({hub.incomingRequests.length})
          </button>
        </div>
      </div>

      {/* Edit Profile View */}
      {clubView === 'profile' && (
        <div style={S.card}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            📸 Edit Group Profile
          </div>
          <div style={{ fontSize: 12, color: '#6b6b68', marginBottom: 12 }}>
            Upload a photo and share your travel vibe so others can get to know your group before connecting.
          </div>

          {/* Photo Upload */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ ...S.label, marginBottom: 8 }}>Group Photo</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {profileForm.photoUrl && (
                <div style={{ position: 'relative' }}>
                  <img
                    src={profileForm.photoUrl}
                    alt="profile"
                    style={{ width: 100, height: 100, borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(0,0,0,0.1)' }}
                  />
                  <button
                    onClick={() => setProfileForm(f => ({ ...f, photoUrl: null }))}
                    style={{ position: 'absolute', top: -8, right: -8, width: 28, height: 28, borderRadius: '50%', background: '#FF6B6B', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                    ✕
                  </button>
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                style={{ ...S.btn, ...S.btnOrange, width: '100%', marginTop: 0 }}>
                {profileForm.photoUrl ? 'Change photo' : 'Upload photo'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            </div>
          </div>

          <label style={S.label}>Profile title</label>
          <input
            style={S.input}
            value={profileForm.title}
            onChange={e => setProfileForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Delhi Foodie Squad"
          />
          <label style={S.label}>About</label>
          <textarea
            style={{ ...S.input, resize: 'vertical', minHeight: 100 }}
            value={profileForm.about}
            onChange={e => setProfileForm(f => ({ ...f, about: e.target.value }))}
            placeholder="Tell other groups about your travel vibe, interests, and energy."
          />
          <label style={S.label}>Looking for (optional)</label>
          <input
            style={S.input}
            value={profileForm.lookingFor}
            onChange={e => setProfileForm(f => ({ ...f, lookingFor: e.target.value }))}
            placeholder="e.g. Cafe hopping + local walks"
          />

          {userLocation && (
            <div style={{ background: '#E8F5F2', borderRadius: 10, padding: 10, marginTop: 12, fontSize: 12, color: '#0F6E56', fontWeight: 500 }}>
              📍 Your location is saved with this profile for discovery.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button style={{ ...S.btn, ...S.btnP }} onClick={handleSaveProfile} disabled={clubBusy}>Save Update</button>
            <button style={S.btn} onClick={() => setClubView('discover')} disabled={clubBusy}>Cancel</button>
          </div>
        </div>
      )}

      {/* Requests View */}
      {clubView === 'requests' && (
        <div style={S.card}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            💬 Incoming Connection Requests
          </div>
          {hub.incomingRequests.length === 0 && (
            <div style={{ fontSize: 12, color: '#6b6b68', textAlign: 'center', padding: '2rem 0' }}>
              No pending requests. Start discovering to connect with other groups!
            </div>
          )}
          {hub.incomingRequests.map(req => (
            <div key={req.id} style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 12, marginBottom: 10, background: '#fafaf8', transition: 'all .2s ease' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {req.requesterTrip.clubProfile?.photoUrl && (
                  <img
                    src={req.requesterTrip.clubProfile.photoUrl}
                    alt="group"
                    style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'cover' }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    {req.requesterTrip.emoji} {req.requesterTrip.groupName}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b6b68', marginBottom: 4 }}>
                    📍 {req.requesterTrip.destination} · 👥 {req.requesterTrip.members.length} members
                  </div>
                  {req.requesterTrip.clubProfile?.about && (
                    <div style={{ fontSize: 11, color: '#6b6b68', marginTop: 4, fontStyle: 'italic', paddingLeft: 8, borderLeft: '2px solid #ccc' }}>
                      "{req.requesterTrip.clubProfile.about}"
                    </div>
                  )}
                  <div style={{ fontSize: 12, marginTop: 6, color: '#333' }}>{req.message}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button style={{ ...S.btn, ...S.btnP, fontSize: 12, flex: 1 }} onClick={() => handleRequestAction(req.id, 'accepted')} disabled={clubBusy}>Accept</button>
                <button style={{ ...S.btn, fontSize: 12, flex: 1 }} onClick={() => handleRequestAction(req.id, 'declined')} disabled={clubBusy}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Discover View */}
      {clubView === 'discover' && (
        <>
          {/* Location & Filters */}
          <div style={S.card}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              📍 Location & Filters
            </div>

            {locationError && (
              <div style={{ background: '#FFF3E0', border: '1px solid #FFD9B3', borderRadius: 10, padding: 10, marginBottom: 12, fontSize: 12, color: '#D87F2C' }}>
                ⚠️ {locationError}
              </div>
            )}

            {userLocation && !useLocationFilter && (
              <button
                onClick={() => setUseLocationFilter(true)}
                style={{ ...S.btn, ...S.btnOrange, marginBottom: 12, width: '100%' }}>
                🎯 Show Groups Near Me ({formatDistance(radius)})
              </button>
            )}

            {useLocationFilter && userLocation && (
              <div style={{ background: 'linear-gradient(135deg,#E8F5F2,#F1FFFA)', borderRadius: 12, padding: 14, marginBottom: 12, border: '1px solid #B5E8E0' }}>
                <div style={{ fontSize: 12, color: '#0F6E56', fontWeight: 600, marginBottom: 8 }}>Search Radius</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="range"
                    min="2"
                    max="150"
                    value={radius}
                    onChange={(e) => setRadius(parseFloat(e.target.value))}
                    style={{ flex: 1, cursor: 'pointer' }}
                  />
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1D9E75', minWidth: 60, textAlign: 'right' }}>
                    {formatDistance(radius)}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#0F6E56', marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>2 km</span>
                  <span>150 km+</span>
                </div>
                <button
                  onClick={() => setUseLocationFilter(false)}
                  style={{ ...S.btn, marginTop: 12, width: '100%', fontSize: 12 }}>
                  Clear Location Filter
                </button>
              </div>
            )}

            <label style={S.label}>Search groups</label>
            <input
              style={S.input}
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Search by name, destination, vibe..."
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
              <div>
                <label style={S.label}>Members</label>
                <select style={S.input} value={filterMemberBand} onChange={e => setFilterMemberBand(e.target.value)}>
                  <option value="any">Any size</option>
                  <option value="2plus">2+ members</option>
                  <option value="4plus">4+ members</option>
                </select>
              </div>
              <div>
                <button
                  style={{ ...S.btn, width: '100%', justifyContent: 'center', marginTop: 27, height: 42, fontSize: 12 }}
                  onClick={() => setFilterHideRequested(v => !v)}>
                  {filterHideRequested ? '✓ Hide Requested' : 'Hide Requested'}
                </button>
              </div>
            </div>
          </div>

          {/* Discover List */}
          <div style={S.card}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>🎒 Discover Groups ({filteredDiscover.length})</span>
            </div>

            {filteredDiscover.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#6b6b68' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>No groups match your filters yet.</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Try adjusting your search or enabling location.</div>
              </div>
            )}

            {filteredDiscover.map(item => {
              const alreadySent = hub.outgoingRequests.some(r => r.targetTripId === item.tripId && r.status === 'pending');
              return (
                <div key={item.id} style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 14, marginBottom: 12, background: '#fafaf8', transition: 'all .2s ease' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                    {item.photoUrl && (
                      <img
                        src={item.photoUrl}
                        alt="group"
                        style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', border: '2px solid rgba(0,0,0,0.06)' }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 18 }}>{item.trip.emoji}</span>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{item.trip.groupName}</span>
                        {item.distance && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#E3F2FD', color: '#1976D2' }}>
                            {formatDistance(item.distance)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b6b68', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span>📍 {item.trip.destination}</span>
                        <span>•</span>
                        <span>👥 {item.trip.members.length} members</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: 10, padding: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: '#333', marginBottom: 4 }}>{item.about}</div>
                    {item.lookingFor && (
                      <div style={{ fontSize: 11, color: '#6b6b68', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        <strong>Looking for:</strong> {item.lookingFor}
                      </div>
                    )}
                  </div>

                  {requestFor === item.tripId ? (
                    <div style={{ marginBottom: 10 }}>
                      <textarea
                        style={{ ...S.input, resize: 'vertical', minHeight: 70, fontSize: 12 }}
                        value={requestMessage}
                        onChange={e => setRequestMessage(e.target.value)}
                        placeholder="Write a message to introduce your group..."
                      />
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button style={{ ...S.btn, ...S.btnOrange, fontSize: 12, flex: 1 }} onClick={handleSendRequest} disabled={clubBusy || !requestMessage.trim()}>Send Connection Request</button>
                        <button style={{ ...S.btn, fontSize: 12, flex: 0.5 }} onClick={() => { setRequestFor(null); setRequestMessage(''); }}>✕</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      style={{ ...S.btn, ...S.btnOrange, fontSize: 12, width: '100%', opacity: alreadySent ? 0.5 : 1 }}
                      disabled={alreadySent || clubBusy}
                      onClick={() => setRequestFor(item.tripId)}>
                      {alreadySent ? '✓ Request Sent' : '💬 Send Connection Request'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default ClubPage;
