import { useState, useRef, useEffect, useCallback } from 'react';
import {
  formatDateRange,
  normalizeMembers,
  tripDuration,
  tripStatusInfo,
} from '../shared/constants';
import { S } from '../shared/styles';
import { Avatar, SoloAvatar, ConfirmDialog } from '../shared/ui';

function HomePage({ trips, onOpenTrip, onCreateTrip, onJoinTrip, onDeleteTrip, onMarkComplete, onMarkActive, profileName }) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(null);
  const [copied, setCopied] = useState(null);
  const [isSoloMode, setIsSoloMode] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmComplete, setConfirmComplete] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  const [showDestPicker, setShowDestPicker] = useState(false);
  const [destQuery, setDestQuery] = useState('');
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [destLoading, setDestLoading] = useState(false);
  const destDebounce = useRef(null);

  const searchDest = useCallback(async (text) => {
    if (text.length < 2) { setDestSuggestions([]); return; }
    setDestLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=7&accept-language=en`,
        { headers: { 'User-Agent': 'TravelBae/1.0', 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const TYPES = ['city','town','village','suburb','county','state','district','region'];
      const seen = new Set();
      const filtered = data.filter(p => {
        const ok = TYPES.includes(p.type) || TYPES.includes(p.addresstype);
        const key = formatDestName(p);
        if (!ok || seen.has(key)) return false;
        seen.add(key); return true;
      });
      setDestSuggestions(filtered);
    } catch { setDestSuggestions([]); }
    setDestLoading(false);
  }, []);

  const formatDestName = (item) => {
    const a = item.address || {};
    const city = a.city || a.town || a.village || a.county || a.state_district || a.suburb || '';
    const state = a.state || '';
    const country = a.country || '';
    if (city && state && country) return `${city}, ${state}, ${country}`;
    if (city && country) return `${city}, ${country}`;
    if (state && country) return `${state}, ${country}`;
    return item.display_name.split(',').slice(0, 2).join(',').trim();
  };

  const getDestIcon = (item) => {
    const t = item.type || item.addresstype || '';
    if (['city','town'].includes(t)) return '🏙️';
    if (['village','suburb','district'].includes(t)) return '🏘️';
    if (['state','region','county'].includes(t)) return '🗺️';
    if (t === 'country') return '🌏';
    return '📍';
  };

  const today = new Date().toISOString().split('T')[0];
  const maxDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  })();

  const [form, setForm] = useState({
    groupName: '', destination: '', emoji: '✈️', arrival: today, departure: '',
    arrivalSlot: 'morning', departureSlot: 'morning',
    people: 2, createdBy: profileName || '', budget: '',
  });

  useEffect(() => {
    setForm(f => ({ ...f, createdBy: profileName || '' }));
  }, [profileName]);

  const openTripWithMotion = (tripId, event) => {
    const rect = event?.currentTarget?.getBoundingClientRect?.();
    if (rect) {
      onOpenTrip(tripId, {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
      return;
    }
    onOpenTrip(tripId);
  };

  const EMOJI_OPTIONS_GROUP = ['✈️','🏖️','🏔️','🏰','🌴','🗺️','🎡','🛕','🌅','🌿','🎭','🏛️'];
  const EMOJI_OPTIONS_SOLO  = ['🎒','🧳','🛺','🚂','🏍️','🌏','🪂','🧗','🌄','☕','📖','🦋'];

  const activeTrips = trips.filter(t => !t.completed);
  const pastTrips   = trips.filter(t =>  t.completed);

  const handleCreate = async () => {
    if (!form.groupName || !form.destination || !form.arrival || !form.departure) return;
    setCreating(true);
    try {
      await onCreateTrip({
        groupName: form.groupName,
        destination: form.destination,
        emoji: form.emoji,
        arrival: form.arrival,
        departure: form.departure,
        arrivalSlot: form.arrivalSlot,
        departureSlot: form.departureSlot,
        isSolo: isSoloMode,
        people: isSoloMode ? 1 : parseInt(form.people),
        budget: form.budget ? parseFloat(form.budget) : null,
        nickname: (profileName || form.createdBy || 'Me').trim(),
      });
      setShowCreate(false);
      setForm({ groupName: '', destination: '', emoji: '✈️', arrival: today, departure: '', people: 2, createdBy: profileName || '', budget: '' });
    } catch (err) {
      alert('Could not create trip: ' + err.message);
    }
    setCreating(false);
  };

  const handleJoin = async () => {
    setJoinError('');
    if (!joinCode.trim()) { setJoinError('Please enter a share code.'); return; }
    if (!joinName.trim()) { setJoinError('Please enter your name.'); return; }
    setJoining(true);
    try {
      const result = await onJoinTrip(joinCode.trim().toUpperCase(), joinName.trim());
      setJoinSuccess(result);
      setJoinCode(''); setJoinName('');
    } catch (err) {
      setJoinError(err.message || 'Invalid code. Please check and try again.');
    }
    setJoining(false);
  };

  const copyCode = (code, id) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  };

  if (showPast) {
    return (
      <div>
        {confirmDelete && (
          <ConfirmDialog
            title="Delete Trip"
            message={`Are you sure you want to delete "${confirmDelete.groupName}"? This cannot be undone.`}
            confirmLabel="🗑️ Delete"
            confirmStyle="danger"
            onConfirm={() => { onDeleteTrip(confirmDelete.id); setConfirmDelete(null); }}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
          <button style={S.btn} onClick={() => setShowPast(false)}>← Back</button>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700 }}>Past Trips</div>
          <span style={{ fontSize: 12, color: '#6b6b68', background: '#F1EFE8', border: '0.5px solid #D3D1C7', borderRadius: 10, padding: '3px 10px' }}>
            {pastTrips.length} trip{pastTrips.length !== 1 ? 's' : ''}
          </span>
        </div>
        {pastTrips.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b6b68' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗂️</div>
            <p>No completed trips yet.</p>
          </div>
        )}
        {pastTrips.map((trip, idx) => {
          const days = tripDuration(trip.arrival, trip.departure);
          const totalSpend = (trip.expenses || []).reduce((s, e) => s + e.amount, 0);
          return (
            <div
              key={trip.id}
              className="tb-trip-card"
              style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 14, animationDelay: `${idx * 50}ms` }}
            >
              <div style={{ position: 'relative', height: 90, overflow: 'hidden', borderRadius: '14px 14px 0 0', cursor: 'pointer' }}
                onClick={(event) => { setShowPast(false); openTripWithMotion(trip.id, event); }}>
                {trip.coverUrl && <img src={trip.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(30%)' }} onError={e => e.target.style.display = 'none'} />}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.55) 100%)' }} />
                <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 24 }}>{trip.emoji}</div>
                <div style={{ position: 'absolute', top: 9, right: 11, display: 'flex', gap: 6 }}>
                  {trip.isSolo && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 10, background: '#EEEDFE', color: '#534AB7', border: '0.5px solid #AFA9EC' }}>Solo</span>}
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 10, background: '#F1EFE8', color: '#6b6b68', border: '0.5px solid #D3D1C7' }}>Completed</span>
                </div>
                <div style={{ position: 'absolute', bottom: 10, left: 12 }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: '#fff' }}>{trip.groupName}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>📍 {trip.destination}</div>
                </div>
              </div>
              <div style={{ padding: '10px 14px', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                {[['📅', formatDateRange(trip.arrival, trip.departure)], ['🌙', `${days} nights`], ['💰', `₹${Math.round(totalSpend).toLocaleString('en-IN')}`]].map(([icon, val]) => (
                  <div key={val} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6b6b68' }}>
                    <span>{icon}</span><span>{val}</span>
                  </div>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => onMarkActive(trip.id)}
                    style={{ ...S.btn, fontSize: 11, padding: '4px 10px', color: '#0F6E56', borderColor: '#9FE1CB', background: '#E1F5EE' }}>
                    ↩ Restore
                  </button>
                  <button
                    onClick={() => setConfirmDelete(trip)}
                    style={{ ...S.btn, fontSize: 11, padding: '4px 10px', color: '#993C1D', borderColor: '#F5C4B3', background: '#FAECE7' }}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (joinSuccess) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>{joinSuccess.emoji}</div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>You're in! 🎉</div>
        <div style={{ fontSize: 14, color: '#6b6b68', marginBottom: 24 }}>
          You've joined <strong>{joinSuccess.groupName}</strong> → {joinSuccess.destination}
        </div>
        <button style={{ ...S.btn, ...S.btnP, padding: '10px 24px', fontSize: 14 }}
          onClick={() => { setJoinSuccess(null); onOpenTrip(joinSuccess.id); }}>
          Open Trip →
        </button>
      </div>
    );
  }

  const emojiOptions = isSoloMode ? EMOJI_OPTIONS_SOLO : EMOJI_OPTIONS_GROUP;

  return (
    <div>
      <style>{`
        .tb-premium-card {
          transition: transform .2s ease, box-shadow .2s ease;
        }
        @media (hover: hover) {
          .tb-premium-card:hover {
            transform: translateY(-3px) scale(1.008);
            box-shadow: 0 14px 40px rgba(0,0,0,0.2) !important;
          }
        }
      `}</style>
      {/* Confirm dialogs */}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Trip"
          message={`Are you sure you want to delete "${confirmDelete.groupName}"? All expenses, contacts and photos will be lost. This cannot be undone.`}
          confirmLabel="🗑️ Delete"
          confirmStyle="danger"
          onConfirm={() => { onDeleteTrip(confirmDelete.id); setConfirmDelete(null); setMenuOpen(null); }}
          onCancel={() => { setConfirmDelete(null); setMenuOpen(null); }}
        />
      )}
      {confirmComplete && (
        <ConfirmDialog
          title="Mark as Completed?"
          message={`"${confirmComplete.groupName}" will be moved to Past Trips. You can restore it anytime.`}
          confirmLabel="✅ Mark Complete"
          confirmStyle="primary"
          onConfirm={() => { onMarkComplete(confirmComplete.id); setConfirmComplete(null); setMenuOpen(null); }}
          onCancel={() => { setConfirmComplete(null); setMenuOpen(null); }}
        />
      )}

      <div style={{ background: 'linear-gradient(135deg,#0D2B2E,#134E4A)', borderRadius: 24, padding: '1.8rem 1.35rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden', boxShadow: '0 18px 44px rgba(9,19,28,0.28)' }}>
        <div style={{ position: 'absolute', top: -20, right: -14, fontSize: 94, opacity: 0.12, transform: 'rotate(12deg)' }}>✈️</div>
        <div style={{ position: 'absolute', left: -42, bottom: -62, width: 150, height: 150, borderRadius: '50%', background: 'rgba(246,201,122,0.12)' }} />
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 800, color: '#fff', marginBottom: 8, lineHeight: 1.15 }}>Where to next?</div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.78)', marginBottom: 20, lineHeight: 1.5, fontStyle: 'italic' }}>Plan less. Experience more.</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 15 }}>
          <div style={{ background: 'rgba(125,183,176,0.18)', border: '1px solid rgba(125,183,176,0.4)', borderRadius: 999, padding: '5px 12px', fontSize: 11, color: '#DDF1EE', fontWeight: 700 }}>{activeTrips.length} active</div>
          <div style={{ background: 'rgba(125,183,176,0.14)', border: '1px solid rgba(125,183,176,0.35)', borderRadius: 999, padding: '5px 12px', fontSize: 11, color: '#DDF1EE', fontWeight: 700 }}>{pastTrips.length} archived</div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button style={{ ...S.btn, background: '#FF6B35', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, padding: '10px 18px', borderRadius: 999, boxShadow: '0 8px 20px rgba(255,107,53,0.36)' }}
            onClick={() => { setShowCreate(true); setShowJoin(false); }}>
            + New Trip
          </button>
          <button style={{ ...S.btn, background: 'rgba(255,255,255,0.04)', color: '#fff', border: '1px solid rgba(255,255,255,0.45)', fontSize: 13, padding: '10px 18px', borderRadius: 999 }}
            onClick={() => { setShowJoin(true); setShowCreate(false); }}>
            Join with Code
          </button>
        </div>
      </div>

      {showJoin && (
        <div style={{ ...S.card, border: '0.5px solid #9FE1CB', background: '#f9fffe', marginBottom: '1.25rem' }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: '#0F6E56', marginBottom: 12 }}>🔗 Join a Trip</div>
          <label style={S.label}>Share Code</label>
          <input style={{ ...S.input, letterSpacing: 2, fontFamily: "'Sora',sans-serif", fontWeight: 600, textTransform: 'uppercase' }}
            value={joinCode} onChange={e => { setJoinCode(e.target.value); setJoinError(''); }}
            placeholder="e.g. JAI-4820" maxLength={10} />
          <label style={S.label}>Your Name</label>
          <input style={S.input} value={joinName} onChange={e => { setJoinName(e.target.value); setJoinError(''); }} placeholder="e.g. Rahul" />
          {joinError && <div style={{ fontSize: 12, color: '#993C1D', marginTop: 8, padding: '7px 10px', background: '#FAECE7', borderRadius: 8 }}>⚠️ {joinError}</div>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ ...S.btn, ...S.btnP, flex: 1, justifyContent: 'center', padding: '10px', opacity: joining ? 0.6 : 1 }}
              onClick={handleJoin} disabled={!joinCode.trim() || !joinName.trim() || joining}>
              {joining ? 'Joining…' : '✓ Join Trip'}
            </button>
            <button style={S.btn} onClick={() => { setShowJoin(false); setJoinError(''); }}>✕</button>
          </div>
        </div>
      )}

      {showCreate && (
        <div style={{ ...S.card, border: `0.5px solid ${isSoloMode ? '#AFA9EC' : '#9FE1CB'}`, background: isSoloMode ? '#fdfcff' : '#f9fffe', marginBottom: '1.25rem' }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: isSoloMode ? '#534AB7' : '#0F6E56', marginBottom: 14 }}>
            {isSoloMode ? '🎒 New Solo Adventure' : '✈️ Create New Group Trip'}
          </div>
          <div style={{ display: 'flex', gap: 0, background: '#F1EFE8', borderRadius: 12, padding: 3, marginBottom: 16 }}>
            {[{ val: false, label: '👥 Group', desc: 'Travel with friends' }, { val: true, label: '🎒 Solo', desc: 'Just me, myself & I' }].map(opt => (
              <button key={String(opt.val)} onClick={() => { setIsSoloMode(opt.val); setForm(f => ({ ...f, emoji: opt.val ? '🎒' : '✈️', people: opt.val ? 1 : 2 })); }}
                style={{ flex: 1, padding: '9px 10px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                  background: isSoloMode === opt.val ? (opt.val ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : '#1D9E75') : 'transparent',
                  color: isSoloMode === opt.val ? '#fff' : '#6b6b68', fontWeight: 500, fontSize: 13, transition: 'all .2s' }}>
                {opt.label}
                <div style={{ fontSize: 10, opacity: 0.75, marginTop: 1 }}>{opt.desc}</div>
              </button>
            ))}
          </div>
          <label style={S.label}>Trip Emoji</label>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', margin: '6px 0 10px' }}>
            {emojiOptions.map(e => (
              <div key={e} onClick={() => setForm(f => ({ ...f, emoji: e }))}
                style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer',
                  border: form.emoji === e ? `2px solid ${isSoloMode ? '#7F77DD' : '#1D9E75'}` : '0.5px solid rgba(0,0,0,0.12)',
                  background: form.emoji === e ? (isSoloMode ? '#EEEDFE' : '#E1F5EE') : '#fff', transition: 'all .12s' }}>
                {e}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={S.label}>{isSoloMode ? 'Adventure Name *' : 'Group Name *'}</label>
              <input style={S.input} value={form.groupName} onChange={e => setForm(f => ({ ...f, groupName: e.target.value }))}
                placeholder={isSoloMode ? 'e.g. My Jaipur Chapter' : 'e.g. Pink City Explorers'} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={S.label}>Destination *</label>

              {/* Tappable field — opens picker */}
              <div
                onClick={() => { setShowDestPicker(true); setDestQuery(form.destination); setDestSuggestions([]); }}
                style={{ ...S.input, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: form.destination ? '#111' : '#aaa', userSelect: 'none' }}
              >
                <span>📍</span>
                <span style={{ flex: 1 }}>{form.destination || 'Search city or place…'}</span>
                {form.destination && (
                  <span
                    onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, destination: '' })); }}
                    style={{ fontSize: 13, color: '#aaa', padding: '0 2px', cursor: 'pointer' }}>✕</span>
                )}
              </div>

              {/* Inline fullscreen picker overlay */}
              {showDestPicker && (
                <div className="tb-sheet-overlay" style={{ position: 'fixed', inset: 0 }}>
                  <div className="tb-sheet-panel" style={{ background: '#fff', display: 'flex', flexDirection: 'column', position: 'absolute', inset: 0 }}>

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', background: '#fff', flexShrink: 0 }}>
                    <button
                      onClick={() => { setShowDestPicker(false); setDestSuggestions([]); }}
                      style={{ width: 36, height: 36, borderRadius: '50%', border: '0.5px solid rgba(0,0,0,0.12)', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}>
                      ←
                    </button>
                    <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, flex: 1 }}>Destination</div>
                  </div>

                  {/* Search box */}
                  <div style={{ padding: '12px 14px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F5F5F3', borderRadius: 12, padding: '0 12px', border: '0.5px solid #e0e0e0' }}>
                      <span style={{ fontSize: 15 }}>🔍</span>
                      <input
                        autoFocus
                        style={{ ...S.input, border: 'none', background: 'transparent', flex: 1, padding: '10px 0', fontSize: 15, outline: 'none' }}
                        value={destQuery}
                        onChange={e => {
                          setDestQuery(e.target.value);
                          clearTimeout(destDebounce.current);
                          destDebounce.current = setTimeout(() => searchDest(e.target.value), 350);
                        }}
                        placeholder="Search city or place…"
                      />
                      {destLoading && <div style={{ width: 18, height: 18, border: '2px solid #E1F5EE', borderTopColor: '#1D9E75', borderRadius: '50%', animation: 'spin .75s linear infinite', flexShrink: 0 }} />}
                      {destQuery && !destLoading && (
                        <span onClick={() => { setDestQuery(''); setDestSuggestions([]); }} style={{ fontSize: 16, color: '#aaa', cursor: 'pointer', flexShrink: 0 }}>✕</span>
                      )}
                    </div>
                  </div>

                  {/* Suggestions */}
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {destSuggestions.length > 0 && destSuggestions.map((item, i) => {
                      const a = item.address || {};
                      const mainText = a.city || a.town || a.village || a.state_district || a.county || a.state || item.display_name.split(',')[0];
                      const subText = [a.state, a.country].filter(Boolean).join(', ');
                      return (
                        <div key={item.osm_id + item.osm_type}
                          onClick={() => {
                            const name = formatDestName(item);
                            setForm(f => ({ ...f, destination: name }));
                            setShowDestPicker(false);
                            setDestSuggestions([]);
                            setDestQuery('');
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderBottom: '0.5px solid #f0f0f0', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f7f6f2'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                        >
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F1EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                            {getDestIcon(item)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mainText}</div>
                            {subText && <div style={{ fontSize: 12, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subText}</div>}
                          </div>
                          <span style={{ fontSize: 18, color: '#ccc' }}>›</span>
                        </div>
                      );
                    })}

                    {/* No results */}
                    {destQuery.length >= 2 && !destLoading && destSuggestions.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: '#6b6b68' }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🗺️</div>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No results for "{destQuery}"</div>
                        <div style={{ fontSize: 13 }}>Try a different spelling or nearby city</div>
                      </div>
                    )}

                    {/* Hint */}
                    {destQuery.length < 2 && (
                      <div style={{ textAlign: 'center', paddingTop: 40, color: '#bbb', fontSize: 13 }}>
                        Start typing to search destinations…
                      </div>
                    )}
                  </div>

                  {/* OSM attribution — required */}
                  <div style={{ padding: '10px', textAlign: 'center', borderTop: '0.5px solid #f0f0f0', fontSize: 11, color: '#bbb', flexShrink: 0 }}>
                    © OpenStreetMap contributors
                  </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label style={S.label}>Date of Arrival *</label>
              <input
                style={S.input}
                type="date"
                value={form.arrival}
                min={today}
                max={maxDate}
                onChange={e => setForm(f => ({
                  ...f,
                  arrival: e.target.value,
                  departure: f.departure && f.departure < e.target.value ? '' : f.departure,
                }))}
                onBlur={e => {
                  const v = e.target.value;
                  if (v && v < today) setForm(f => ({ ...f, arrival: today }));
                }}
              />
              <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                {[
                  { id: 'night', label: '🌙 12AM–6AM' },
                  { id: 'morning', label: '🌅 6AM–12PM' },
                  { id: 'afternoon', label: '☀️ 12–6PM' },
                  { id: 'evening', label: '🌆 6PM–12AM' },
                ].map(slot => (
                  <button key={slot.id} type="button"
                    onClick={() => setForm(f => ({ ...f, arrivalSlot: slot.id }))}
                    style={{ flex: 1, padding: '5px 4px', borderRadius: 8, border: `1.5px solid ${form.arrivalSlot === slot.id ? (isSoloMode ? '#7F77DD' : '#1D9E75') : 'rgba(0,0,0,0.12)'}`, background: form.arrivalSlot === slot.id ? (isSoloMode ? '#EEEDFE' : '#E1F5EE') : '#fff', color: form.arrivalSlot === slot.id ? (isSoloMode ? '#534AB7' : '#0F6E56') : '#6b6b68', fontSize: 10, fontWeight: form.arrivalSlot === slot.id ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .12s', whiteSpace: 'nowrap' }}>
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={S.label}>Date of Departure *</label>
              <input
                style={S.input}
                type="date"
                value={form.departure}
                min={form.arrival || today}
                max={maxDate}
                onChange={e => setForm(f => ({ ...f, departure: e.target.value }))}
                onBlur={e => {
                  const v = e.target.value;
                  const minDep = form.arrival || today;
                  if (v && v < minDep) setForm(f => ({ ...f, departure: minDep }));
                }}
              />
              <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                {[
                  { id: 'night', label: '🌙 12AM–6AM' },
                  { id: 'morning', label: '🌅 6AM–12PM' },
                  { id: 'afternoon', label: '☀️ 12–6PM' },
                  { id: 'evening', label: '🌆 6PM–12AM' },
                ].map(slot => (
                  <button key={slot.id} type="button"
                    onClick={() => setForm(f => ({ ...f, departureSlot: slot.id }))}
                    style={{ flex: 1, padding: '5px 4px', borderRadius: 8, border: `1.5px solid ${form.departureSlot === slot.id ? (isSoloMode ? '#7F77DD' : '#1D9E75') : 'rgba(0,0,0,0.12)'}`, background: form.departureSlot === slot.id ? (isSoloMode ? '#EEEDFE' : '#E1F5EE') : '#fff', color: form.departureSlot === slot.id ? (isSoloMode ? '#534AB7' : '#0F6E56') : '#6b6b68', fontSize: 10, fontWeight: form.departureSlot === slot.id ? 600 : 400, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", transition: 'all .12s', whiteSpace: 'nowrap' }}>
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
            {!isSoloMode && (
              <div>
                <label style={S.label}>Number of People</label>
                <input style={S.input} type="number" min={1} max={50} value={form.people} onChange={e => setForm(f => ({ ...f, people: e.target.value }))} />
              </div>
            )}
            <div style={{ gridColumn: isSoloMode ? '1/-1' : 'auto' }}>
              <label style={S.label}>Budget ₹ (optional)</label>
              <input style={S.input} type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="e.g. 50000" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              style={{ ...S.btn, ...(isSoloMode ? S.btnSolo : S.btnP), flex: 1, justifyContent: 'center', padding: '11px', fontSize: 14, borderRadius: 12, opacity: creating ? 0.6 : 1 }}
              onClick={handleCreate}
              disabled={!form.groupName || !form.destination || !form.arrival || !form.departure || creating}>
              {creating ? 'Creating…' : isSoloMode ? '🎒 Start Solo Adventure' : '🚀 Create & Get Share Code'}
            </button>
            <button style={S.btn} onClick={() => setShowCreate(false)}>✕</button>
          </div>
        </div>
      )}

      {activeTrips.length === 0 && !showCreate && !showJoin && (
        <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🗺️</div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No upcoming trips!</div>
          <div style={{ fontSize: 13, color: '#6b6b68', marginBottom: 24 }}>Create your first trip or join one with a code.</div>
          <button style={{ ...S.btn, ...S.btnP, padding: '10px 24px', fontSize: 14 }} onClick={() => setShowCreate(true)}>+ New Trip</button>
        </div>
      )}

      {activeTrips.map((trip, idx) => {
        const status = tripStatusInfo(trip.arrival, trip.departure, trip.completed);
        const days = tripDuration(trip.arrival, trip.departure);
        const totalSpend = (trip.expenses || []).reduce((s, e) => s + e.amount, 0);
        const memberNames = normalizeMembers(trip.members);
        const budgetPct = trip.budget ? Math.min(100, Math.round(totalSpend / trip.budget * 100)) : null;
        const isMenuOpen = menuOpen === trip.id;
        const mainGrad = trip.isSolo
          ? 'linear-gradient(135deg,#2D1B69,#4A2C8A)'
          : 'linear-gradient(135deg,#0D2B2E,#1A4A3A)';
        const isPast = status.label === 'Past' || status.label === 'Completed';
        const statusLabel = isPast ? 'Past' : status.label === 'Ongoing' ? 'Ongoing' : status.label;
        const statusBg = isPast ? 'rgba(148,163,184,0.22)' : '#FF6B35';
        const statusColor = isPast ? '#E2E8F0' : '#fff';

        return (
          <div
            key={trip.id}
            className="tb-trip-card tb-premium-card"
            style={{ padding: 0, overflow: 'hidden', marginBottom: 16, position: 'relative', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', animationDelay: `${idx * 50}ms`, borderRadius: 20, background: mainGrad }}
          >
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.05, backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '6px 6px' }} />
            <div style={{ position: 'relative', cursor: 'pointer', padding: '16px 16px 13px' }} onClick={(event) => openTripWithMotion(trip.id, event)}>
              {trip.coverUrl && <img src={trip.coverUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.16, pointerEvents: 'none' }} onError={e => e.target.style.display = 'none'} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, position: 'relative' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(145deg,rgba(255,255,255,0.26),rgba(255,255,255,0.06))', border: '1px solid rgba(255,255,255,0.3)', display: 'grid', placeItems: 'center', fontSize: 29, flexShrink: 0 }}>
                  {trip.emoji}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {trip.isSolo && <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: '#F6C97A', color: '#3A2A13' }}>Solo</span>}
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 999, background: statusBg, color: statusColor }}>{statusLabel}</span>
                </div>
              </div>
              <div style={{ marginTop: 12, position: 'relative' }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{trip.destination}</div>
                <div style={{ fontSize: 13, color: 'rgba(226,232,240,0.9)', marginTop: 4, fontWeight: 600 }}>{trip.groupName}</div>
              </div>
            </div>

            <div style={{ padding: '0 16px 13px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, cursor: 'pointer' }} onClick={(event) => openTripWithMotion(trip.id, event)}>
              {[
                ['📅', formatDateRange(trip.arrival, trip.departure)],
                ['🌙', `${days} nights`],
                trip.isSolo ? ['💰', `₹${Math.round(totalSpend).toLocaleString('en-IN')} spent`] : ['👥', `${memberNames.length} members`],
                ...(totalSpend > 0 && !trip.isSolo ? [['💰', `₹${Math.round(totalSpend).toLocaleString('en-IN')}`]] : []),
              ].map(([icon, val]) => (
                <div key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'rgba(226,232,240,0.9)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '6px 9px' }}>
                  <span>{icon}</span><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} className={String(val).includes('₹') ? 'tb-amount-pop' : ''}>{val}</span>
                </div>
              ))}
            </div>

            {trip.budget && (
              <div style={{ padding: '0 16px 12px', cursor: 'pointer' }} onClick={(event) => openTripWithMotion(trip.id, event)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(226,232,240,0.85)', marginBottom: 6 }}>
                  <span>Budget progress</span>
                  <span className="tb-amount-pop" style={{ fontWeight: 700, color: '#F6C97A' }}>
                    {budgetPct}% · ₹{Math.round(Math.max(0, trip.budget - totalSpend)).toLocaleString('en-IN')} left
                  </span>
                </div>
                <div style={{ height: 6, background: 'rgba(242,244,245,0.26)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${budgetPct}%`, borderRadius: 999, background: '#FF6B35', transition: 'width .5s' }} />
                </div>
              </div>
            )}

            <div style={{ padding: '12px 16px 14px', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
              {trip.isSolo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }} onClick={(event) => openTripWithMotion(trip.id, event)}>
                  <SoloAvatar initials={(memberNames[0] || 'ME').slice(0, 2)} size={28} />
                  <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.88)', fontWeight: 500 }}>Solo adventure by {memberNames[0] || 'You'}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', cursor: 'pointer', flex: 1 }} onClick={(event) => openTripWithMotion(trip.id, event)}>
                  {memberNames.slice(0, 5).map((m, i) => (
                    <div key={m + i} style={{ marginLeft: i > 0 ? -8 : 0, border: '2px solid #fff', borderRadius: '50%', zIndex: 5 - i }}>
                      <Avatar name={m} size={28} />
                    </div>
                  ))}
                  {memberNames.length > 5 && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F1EFE8', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#6b6b68', marginLeft: -8 }}>
                      +{memberNames.length - 5}
                    </div>
                  )}
                </div>
              )}

              {!trip.isSolo && (
                <div onClick={e => { e.stopPropagation(); copyCode(trip.shareCode, trip.id); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(242,244,245,0.12)', border: '1px solid rgba(242,244,245,0.28)', borderRadius: 999, padding: '5px 12px', cursor: 'pointer', flexShrink: 0 }}>
                  <span style={{ fontFamily: "'DM Sans',monospace", fontSize: 12, fontWeight: 700, color: '#F6C97A', letterSpacing: 1 }}>{trip.shareCode}</span>
                  <span style={{ fontSize: 11, color: copied === trip.id ? '#7DB7B0' : '#D8E6E4' }}>{copied === trip.id ? '✓' : '📋'}</span>
                </div>
              )}

              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(isMenuOpen ? null : trip.id); }}
                  style={{ ...S.btn, padding: '6px 10px', fontSize: 16, color: '#D9E9E7', borderColor: 'rgba(242,244,245,0.25)', background: 'rgba(242,244,245,0.08)', lineHeight: 1 }}>
                  ⋯
                </button>
                {isMenuOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 420 }} onClick={() => setMenuOpen(null)} />
                    <div style={{ position: 'absolute', bottom: '110%', right: 0, background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', zIndex: 421, minWidth: 180, overflow: 'hidden' }}>
                      <button
                        onClick={e => { e.stopPropagation(); setMenuOpen(null); setConfirmComplete(trip); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: '#0F6E56', fontFamily: "'DM Sans',sans-serif", borderBottom: '0.5px solid rgba(0,0,0,0.07)' }}>
                        ✅ Mark as Completed
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setMenuOpen(null); setConfirmDelete(trip); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: '#993C1D', fontFamily: "'DM Sans',sans-serif" }}>
                        🗑️ Delete Trip
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {pastTrips.length > 0 && (
        <div onClick={() => setShowPast(true)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 14, padding: '14px 18px', cursor: 'pointer', marginTop: 8, marginBottom: 4 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: '#F1EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🗂️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Past Trips</div>
            <div style={{ fontSize: 12, color: '#6b6b68' }}>{pastTrips.length} completed trip{pastTrips.length !== 1 ? 's' : ''} · tap to view memories</div>
          </div>
          <div style={{ fontSize: 16, color: '#a8a8a5' }}>›</div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
