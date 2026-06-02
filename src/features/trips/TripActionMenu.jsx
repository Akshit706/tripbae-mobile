import { useState } from 'react';
import { normalizeMembers } from '../shared/constants';
import { S } from '../shared/styles';
import { ConfirmDialog } from '../shared/ui';

function TripActionMenu({ trip, onMarkComplete, onDelete, onEditTrip }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const isSolo = trip?.isSolo;

  const today = new Date().toISOString().split('T')[0];
  const maxDate = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().split('T')[0]; })();
  const EMOJI_OPTIONS = isSolo
    ? ['🎒','🧳','🛺','🚂','🏍️','🌏','🪂','🧗','🌄','☕','📖','🦋']
    : ['✈️','🏖️','🏔️','🏰','🌴','🗺️','🎡','🛕','🌅','🌿','🎭','🏛️'];

  const [editForm, setEditForm] = useState({
    groupName: trip?.groupName || '',
    destination: trip?.destination || '',
    emoji: trip?.emoji || '✈️',
    arrival: trip?.arrival ? new Date(trip.arrival).toISOString().split('T')[0] : today,
    departure: trip?.departure ? new Date(trip.departure).toISOString().split('T')[0] : '',
    budget: trip?.budget ? String(trip.budget) : '',
    people: String(normalizeMembers(trip?.members || []).length || 2),
  });
  const [saving, setSaving] = useState(false);

  const handleSaveEdit = async () => {
    if (!editForm.groupName || !editForm.destination || !editForm.arrival || !editForm.departure) return;
    setSaving(true);
    try {
      const { updateTrip } = await import('../../api');
      const updates = {
        groupName: editForm.groupName,
        destination: editForm.destination,
        emoji: editForm.emoji,
        arrival: editForm.arrival,
        departure: editForm.departure,
        budget: editForm.budget ? parseFloat(editForm.budget) : null,
      };
      await updateTrip(trip.id, updates);
      onEditTrip?.(updates);
      setShowEdit(false);
    } catch (err) {
      alert('Could not save: ' + err.message);
    }
    setSaving(false);
  };

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Trip"
          message={`Delete "${trip.groupName}"? All expenses, contacts and photos will be lost. This cannot be undone.`}
          confirmLabel="🗑️ Delete"
          confirmStyle="danger"
          onConfirm={() => { setConfirmDelete(false); onDelete(); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {confirmComplete && (
        <ConfirmDialog
          title="Mark as Completed?"
          message={`"${trip.groupName}" will be moved to Past Trips. You can restore it anytime.`}
          confirmLabel="✅ Mark Complete"
          confirmStyle="primary"
          onConfirm={() => { setConfirmComplete(false); onMarkComplete(); }}
          onCancel={() => setConfirmComplete(false)}
        />
      )}

      {/* Edit Trip Modal */}
      {showEdit && (
        <div className="tb-sheet-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div className="tb-sheet-panel" style={{ background: '#f7f6f2', borderRadius: '20px 20px 0 0', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 1, borderRadius: '20px 20px 0 0' }}>
              <button onClick={() => setShowEdit(false)}
                style={{ width: 36, height: 36, borderRadius: '50%', border: '0.5px solid rgba(0,0,0,0.12)', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}>←</button>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, flex: 1 }}>Edit Trip Details</div>
              <button onClick={handleSaveEdit} disabled={saving || !editForm.groupName || !editForm.destination || !editForm.arrival || !editForm.departure}
                style={{ ...S.btn, ...(isSolo ? S.btnSolo : S.btnP), padding: '8px 22px', fontSize: 14, fontWeight: 600, borderRadius: 12, opacity: (saving || !editForm.groupName || !editForm.destination) ? 0.4 : 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            <div style={{ padding: '1.25rem' }}>
              {/* Emoji */}
              <label style={S.label}>Trip Emoji</label>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', margin: '6px 0 14px' }}>
                {EMOJI_OPTIONS.map(e => (
                  <div key={e} onClick={() => setEditForm(f => ({ ...f, emoji: e }))}
                    style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, cursor: 'pointer',
                      border: editForm.emoji === e ? `2px solid ${isSolo ? '#7F77DD' : '#1D9E75'}` : '0.5px solid rgba(0,0,0,0.12)',
                      background: editForm.emoji === e ? (isSolo ? '#EEEDFE' : '#E1F5EE') : '#fff' }}>
                    {e}
                  </div>
                ))}
              </div>

              {/* Name */}
              <label style={S.label}>{isSolo ? 'Adventure Name *' : 'Group Name *'}</label>
              <input style={{ ...S.input, marginBottom: 14 }} value={editForm.groupName}
                onChange={e => setEditForm(f => ({ ...f, groupName: e.target.value }))} />

              {/* Destination */}
              <label style={S.label}>Destination *</label>
              <input style={{ ...S.input, marginBottom: 14 }} value={editForm.destination}
                onChange={e => setEditForm(f => ({ ...f, destination: e.target.value }))}
                placeholder="e.g. Jaipur, Rajasthan" />

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={S.label}>Arrival *</label>
                  <input style={S.input} type="date" value={editForm.arrival} min={today} max={maxDate}
                    onChange={e => setEditForm(f => ({ ...f, arrival: e.target.value, departure: f.departure && f.departure < e.target.value ? '' : f.departure }))} />
                </div>
                <div>
                  <label style={S.label}>Departure *</label>
                  <input style={S.input} type="date" value={editForm.departure} min={editForm.arrival || today} max={maxDate}
                    onChange={e => setEditForm(f => ({ ...f, departure: e.target.value }))} />
                </div>
              </div>

              {/* Budget */}
              <label style={S.label}>Budget ₹ (optional)</label>
              <input style={{ ...S.input, marginBottom: 14 }} type="number" value={editForm.budget}
                onChange={e => setEditForm(f => ({ ...f, budget: e.target.value }))} placeholder="e.g. 50000" />
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{ ...S.btn, padding: '5px 9px', fontSize: 15, color: '#6b6b68', borderColor: 'rgba(0,0,0,0.12)' }}>
          ⋯
        </button>
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 420 }} onClick={() => setOpen(false)} />
            <div style={{ position: 'absolute', top: '110%', right: 0, background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', zIndex: 421, minWidth: 190, overflow: 'hidden' }}>
              <button
                onClick={() => { setOpen(false); setShowEdit(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: '#378ADD', fontFamily: "'DM Sans',sans-serif", borderBottom: '0.5px solid rgba(0,0,0,0.07)', textAlign: 'left' }}>
                ✏️ Edit Trip Details
              </button>
              {!trip.completed && (
                <button
                  onClick={() => { setOpen(false); setConfirmComplete(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: '#0F6E56', fontFamily: "'DM Sans',sans-serif", borderBottom: '0.5px solid rgba(0,0,0,0.07)', textAlign: 'left' }}>
                  ✅ Mark as Completed
                </button>
              )}
              <button
                onClick={() => { setOpen(false); setConfirmDelete(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: '#993C1D', fontFamily: "'DM Sans',sans-serif", textAlign: 'left' }}>
                🗑️ Delete Trip
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default TripActionMenu;











