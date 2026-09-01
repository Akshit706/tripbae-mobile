import { useState } from 'react';
import { updateTrip } from '../../api';
import { S } from '../shared/styles';
import { ConfirmDialog } from '../shared/ui';

const AC    = '#FF6A00';
const AC_BG = '#FFF3EB';
const AC_BR = '#FFCBA4';
const SOLO_AC    = '#7F77DD';
const SOLO_AC_BG = '#EEEDFE';
const SOLO_AC_BR = '#C5C2F8';

const BUDGET_CURRENCIES = [
  'INR','USD','EUR','GBP','AED','AUD','CAD','CHF','CNY','JPY',
  'SGD','THB','MYR','IDR','VND','KRW','NPR','LKR','BDT','PKR',
];

const LockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function LockedField({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#bbb', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px', borderRadius: 12, background: '#EFEFED', border: '1.5px solid rgba(0,0,0,0.06)' }}>
        <span style={{ flex: 1, fontSize: 13.5, color: '#777', fontFamily: "'DM Sans',sans-serif", lineHeight: 1.4 }}>{value}</span>
        <span style={{ color: '#bbb', flexShrink: 0, display: 'flex' }}><LockIcon /></span>
      </div>
    </div>
  );
}


function TripActionMenu({ trip, onMarkComplete, onDelete, onEditTrip }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const isSolo = trip?.isSolo;

  const acColor  = isSolo ? SOLO_AC    : AC;
  const acBg     = isSolo ? SOLO_AC_BG : AC_BG;
  const acBorder = isSolo ? SOLO_AC_BR : AC_BR;

  const [editForm, setEditForm] = useState({
    groupName:      trip?.groupName || '',
    budget:         trip?.budget ? String(trip.budget) : '',
    budgetCurrency: trip?.budgetCurrency || 'INR',
  });
  const [saving, setSaving] = useState(false);

  const handleSaveEdit = async () => {
    if (!editForm.groupName) return;
    setSaving(true);
    try {
      const updates = {
        groupName:      editForm.groupName,
        budget:         editForm.budget ? parseFloat(editForm.budget) : null,
        budgetCurrency: editForm.budgetCurrency || null,
      };
      await updateTrip(trip.id, updates);
      onEditTrip?.(updates);
      setShowEdit(false);
    } catch (err) {
      alert('Could not save: ' + err.message);
    }
    setSaving(false);
  };

  const inputStyle = (filled) => ({
    width: '100%', boxSizing: 'border-box',
    padding: '12px 14px', fontSize: 14, borderRadius: 12,
    border: `1.5px solid ${filled ? acBorder : 'rgba(15,23,42,0.1)'}`,
    background: filled ? acBg : '#fff',
    color: '#111', outline: 'none',
    fontFamily: "'DM Sans','Inter',sans-serif",
    transition: 'all .15s', marginBottom: 14,
  });

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

      {/* Edit Trip Popup */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '0 16px' }}>
          <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 420, maxHeight: '80svh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.28)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.08)', flexShrink: 0 }}>
              <button onClick={() => setShowEdit(false)}
                style={{ width: 34, height: 34, borderRadius: '50%', border: '0.5px solid rgba(0,0,0,0.12)', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, cursor: 'pointer', flexShrink: 0 }}>←</button>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, flex: 1 }}>Edit Trip Details</div>
              <button onClick={handleSaveEdit} disabled={saving || !editForm.groupName}
                style={{ ...S.btn, ...(isSolo ? S.btnSolo : S.btnP), padding: '8px 20px', fontSize: 13, fontWeight: 600, borderRadius: 12, opacity: (saving || !editForm.groupName) ? 0.4 : 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '1.25rem' }}>

              {/* Editable: Trip Name */}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 6 }}>
                {isSolo ? 'Adventure Name' : 'Group Name'} *
              </div>
              <input style={inputStyle(!!editForm.groupName)} value={editForm.groupName}
                onChange={e => setEditForm(f => ({ ...f, groupName: e.target.value }))}
                placeholder={isSolo ? 'e.g. My Jaipur Chapter' : 'e.g. Goa Gang 2025'} />

              {/* Locked read-only fields */}
              <LockedField label="Destination" value={trip?.destination} />
              <LockedField label="Arrival" value={fmtDate(trip?.arrival)} />
              <LockedField label="Departure" value={fmtDate(trip?.departure)} />
              <LockedField label="Arriving From" value={trip?.arrivalCity} />
              <LockedField label="Departing From" value={trip?.departureCity} />
              <LockedField label="Travel Notes" value={trip?.travelNotes} />

              {/* Editable: Budget + currency */}
              <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 6 }}>
                Budget <span style={{ fontWeight: 500, fontSize: 10, color: '#ccc', textTransform: 'none' }}>(optional)</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <select value={editForm.budgetCurrency} onChange={e => setEditForm(f => ({ ...f, budgetCurrency: e.target.value }))}
                  style={{ padding: '12px 10px', fontSize: 13, fontFamily: "'DM Sans',sans-serif", border: `1.5px solid ${acBorder}`, borderRadius: 12, background: acBg, color: acColor, outline: 'none', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>
                  {BUDGET_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input style={{ flex: 1, padding: '12px 14px', fontSize: 14, borderRadius: 12, border: `1.5px solid ${editForm.budget ? acBorder : 'rgba(15,23,42,0.1)'}`, background: editForm.budget ? acBg : '#fff', color: '#111', outline: 'none', fontFamily: "'DM Sans',sans-serif" }}
                  type="number" value={editForm.budget}
                  onChange={e => setEditForm(f => ({ ...f, budget: e.target.value }))} placeholder="e.g. 50000" />
              </div>

            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(v => !v)}
          title="Trip options"
          style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.65 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a1a18" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
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
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 16px', border: 'none', background: 'none', fontSize: 13, cursor: 'pointer', color: '#C44400', fontFamily: "'DM Sans',sans-serif", borderBottom: '0.5px solid rgba(0,0,0,0.07)', textAlign: 'left' }}>
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











