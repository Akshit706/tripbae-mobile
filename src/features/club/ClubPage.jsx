import { useState, useEffect, useMemo, useCallback } from 'react';
import { getClubHub, upsertClubProfile, updateClubStatus, sendClubRequest, respondClubRequest } from '../../api';
import { S } from '../shared/styles';
import { Spinner } from '../shared/ui';
function ClubPage({ trip }){
  const [clubLoading, setClubLoading] = useState(true);
  const [clubBusy, setClubBusy] = useState(false);
  const [hub, setHub] = useState({ myProfile: null, discover: [], incomingRequests: [], outgoingRequests: [] });
  const [profileForm, setProfileForm] = useState({ title: '', about: '', lookingFor: '' });
  const [requestFor, setRequestFor] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [clubView, setClubView] = useState('discover');
  const [filterText, setFilterText] = useState('');
  const [filterMemberBand, setFilterMemberBand] = useState('any');
  const [filterHideRequested, setFilterHideRequested] = useState(false);

  const loadHub = useCallback(async () => {
    setClubLoading(true);
    try {
      const data = await getClubHub(trip.id);
      setHub(data);
      setProfileForm({
        title: data.myProfile?.title || trip.groupName,
        about: data.myProfile?.about || '',
        lookingFor: data.myProfile?.lookingFor || '',
      });
    } catch (err) {
      alert('Could not load club: ' + err.message);
    }
    setClubLoading(false);
  }, [trip.id, trip.groupName]);

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

  const handleSaveProfile = async () => {
    if (!profileForm.title.trim() || !profileForm.about.trim()) {
      alert('Please fill title and about.');
      return;
    }
    setClubBusy(true);
    try {
      await upsertClubProfile(trip.id, profileForm);
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
      <div style={{ background: trip.isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : 'linear-gradient(135deg,#1D9E75,#0F6E56)', borderRadius: 14, padding: '1.25rem', marginBottom: '1rem', color: '#fff' }}>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>TravelBae Club</div>
        <div style={{ fontSize: 12, opacity: 0.88, marginBottom: 12 }}>
          {listed ? 'Your group is visible in Discover.' : 'Your group is hidden in Snooze mode.'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{listed ? 'Listed' : 'Snoozed'}</div>
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

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={() => setClubView('discover')}
            style={{ ...S.btn, background: clubView === 'discover' ? '#fff' : 'rgba(255,255,255,0.16)', color: clubView === 'discover' ? '#085041' : '#fff', border: 'none', fontWeight: 600 }}>
            Discover
          </button>
          <button
            onClick={() => setClubView('profile')}
            style={{ ...S.btn, background: clubView === 'profile' ? '#fff' : 'rgba(255,255,255,0.16)', color: clubView === 'profile' ? '#085041' : '#fff', border: 'none', fontWeight: 600 }}>
            Edit Profile
          </button>
          <button
            onClick={() => setClubView('requests')}
            style={{ ...S.btn, background: clubView === 'requests' ? '#fff' : 'rgba(255,255,255,0.16)', color: clubView === 'requests' ? '#085041' : '#fff', border: 'none', fontWeight: 600 }}>
            Requests ({hub.incomingRequests.length})
          </button>
        </div>
      </div>

      {clubView === 'profile' && (
        <div style={S.card}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Edit Group Profile</div>
          <div style={{ fontSize: 12, color: '#6b6b68', marginBottom: 10 }}>This profile is visible when you are Listed.</div>
          <label style={S.label}>Profile title</label>
          <input
            style={S.input}
            value={profileForm.title}
            onChange={e => setProfileForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Delhi Foodie Squad"
          />
          <label style={S.label}>About</label>
          <textarea
            style={{ ...S.input, resize: 'vertical', minHeight: 84 }}
            value={profileForm.about}
            onChange={e => setProfileForm(f => ({ ...f, about: e.target.value }))}
            placeholder="Tell other groups about your travel vibe."
          />
          <label style={S.label}>Looking for (optional)</label>
          <input
            style={S.input}
            value={profileForm.lookingFor}
            onChange={e => setProfileForm(f => ({ ...f, lookingFor: e.target.value }))}
            placeholder="e.g. Cafe hopping + local walks"
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ ...S.btn, ...S.btnP }} onClick={handleSaveProfile} disabled={clubBusy}>Save update</button>
            <button style={S.btn} onClick={() => setClubView('discover')} disabled={clubBusy}>Cancel</button>
          </div>
        </div>
      )}

      {clubView === 'requests' && (
        <div style={S.card}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Incoming Requests</div>
          {hub.incomingRequests.length === 0 && <div style={{ fontSize: 12, color: '#6b6b68' }}>No pending requests right now.</div>}
          {hub.incomingRequests.map(req => (
            <div key={req.id} style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{req.requesterTrip.groupName}</div>
              <div style={{ fontSize: 11, color: '#6b6b68', marginTop: 2 }}>Destination: {req.requesterTrip.destination} | {req.requesterTrip.members.length} members</div>
              {req.requesterTrip.clubProfile?.about && <div style={{ fontSize: 12, color: '#6b6b68', marginTop: 5, fontStyle: 'italic' }}>"{req.requesterTrip.clubProfile.about}"</div>}
              <div style={{ fontSize: 12, marginTop: 6 }}>{req.message}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button style={{ ...S.btn, ...S.btnP, fontSize: 12 }} onClick={() => handleRequestAction(req.id, 'accepted')} disabled={clubBusy}>Accept</button>
                <button style={{ ...S.btn, fontSize: 12 }} onClick={() => handleRequestAction(req.id, 'declined')} disabled={clubBusy}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {clubView === 'discover' && (
        <>
          <div style={S.card}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Filters</div>
            <label style={S.label}>Search groups</label>
            <input
              style={S.input}
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Search by group name, destination, vibe"
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
                <label style={S.label}>Request state</label>
                <button
                  style={{ ...S.btn, width: '100%', justifyContent: 'center', marginTop: 0, height: 42 }}
                  onClick={() => setFilterHideRequested(v => !v)}>
                  {filterHideRequested ? 'Hide requested: ON' : 'Hide requested: OFF'}
                </button>
              </div>
            </div>
          </div>

          <div style={S.card}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
              Discover Listed Groups ({filteredDiscover.length})
            </div>
            {filteredDiscover.length === 0 && <div style={{ fontSize: 12, color: '#6b6b68' }}>No listed groups match your filters.</div>}
            {filteredDiscover.map(item => {
              const alreadySent = hub.outgoingRequests.some(r => r.targetTripId === item.tripId && r.status === 'pending');
              return (
                <div key={item.id} style={{ border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 12, padding: 10, marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 22 }}>{item.trip.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{item.trip.groupName}</div>
                      <div style={{ fontSize: 11, color: '#6b6b68' }}>Destination: {item.trip.destination} | {item.trip.members.length} members</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: '#E1F5EE', color: '#085041' }}>Listed</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b6b68', marginTop: 7 }}>{item.about}</div>
                  {item.lookingFor && <div style={{ fontSize: 12, marginTop: 5 }}>Looking for: {item.lookingFor}</div>}
                  {requestFor === item.tripId ? (
                    <div style={{ marginTop: 10 }}>
                      <textarea
                        style={{ ...S.input, resize: 'vertical', minHeight: 70 }}
                        value={requestMessage}
                        onChange={e => setRequestMessage(e.target.value)}
                        placeholder="Write a short request for this group"
                      />
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button style={{ ...S.btn, ...S.btnOrange, fontSize: 12 }} onClick={handleSendRequest} disabled={clubBusy || !requestMessage.trim()}>Send request</button>
                        <button style={{ ...S.btn, fontSize: 12 }} onClick={() => { setRequestFor(null); setRequestMessage(''); }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      style={{ ...S.btn, ...S.btnOrange, fontSize: 12, marginTop: 10, opacity: alreadySent ? 0.65 : 1 }}
                      disabled={alreadySent || clubBusy}
                      onClick={() => setRequestFor(item.tripId)}>
                      {alreadySent ? 'Request sent' : 'Send request'}
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

/* ═══════════════════════════════════════════════════════
   APP SHELL
═══════════════════════════════════════════════════════ */
export default ClubPage;
