import { useState, useRef, useEffect } from 'react';
import { addContact, deleteContact } from '../../api';
import { CONTACT_CATS, normalizeMembers } from '../shared/constants';
import { S } from '../shared/styles';
function ContactsPage({ trip, myNickname, isSolo }) {
  const memberNames = normalizeMembers(trip.members);
  const [contacts, setContacts] = useState(trip.contacts || []);
  const [filterCat, setFilterCat] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', role: '', cat: 'driver', phone: '', note: '' });
  const contactPickerSupported =
    typeof navigator !== 'undefined' &&
    navigator.contacts &&
    typeof navigator.contacts.select === 'function';
  const [emergencyBannerDismissed, setEmergencyBannerDismissed] = useState(
    () => localStorage.getItem(`travelbae_contacts_emg_dismissed_${trip.id}`) === '1'
  );

  const importFromPhoneContacts = async () => {
    if (!contactPickerSupported) {
      alert('Import from contacts is not supported on this device/browser yet.');
      return;
    }
    try {
      const selected = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (!selected || selected.length === 0) return;
      const picked = selected[0];
      const pickedName = Array.isArray(picked.name) ? picked.name.find(Boolean) : '';
      const pickedPhone = Array.isArray(picked.tel) ? picked.tel.find(Boolean) : '';
      if (!pickedPhone) {
        alert('Selected contact has no phone number.');
        return;
      }
      setForm(f => ({
        ...f,
        name: (f.name || '').trim() ? f.name : (pickedName || ''),
        phone: pickedPhone,
      }));
    } catch (err) {
      if (err?.name === 'NotAllowedError') {
        alert('Permission denied. Please allow contact access and try again.');
        return;
      }
      if (err?.name === 'InvalidStateError') {
        alert('Please use the import button directly to pick a contact.');
        return;
      }
      alert('Could not import contact right now.');
    }
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    try {
      if (form._editId) {
        // Edit existing
        setContacts(cs => cs.map(c => c.id === form._editId
          ? { ...c, name: form.name, role: form.role, cat: form.cat, phone: form.phone, note: form.note }
          : c
        ));
      } else {
        const data = await addContact(trip.id, { ...form, addedBy: myNickname || 'Me' });
        setContacts(cs => [...cs, data.contact]);
      }
      setForm({ name: '', role: '', cat: 'driver', phone: '', note: '' });
      setShowForm(false);
    } catch (err) {
      alert('Could not save contact: ' + err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (cid) => {
    try {
      await deleteContact(trip.id, cid);
      setContacts(cs => cs.filter(x => x.id !== cid));
    } catch (err) {
      alert('Could not delete: ' + err.message);
    }
  };

  const catCounts = {};
  contacts.forEach(c => { catCounts[c.cat] = (catCounts[c.cat] || 0) + 1; });
  const getCat = id => CONTACT_CATS.find(c => c.id === id) || CONTACT_CATS[CONTACT_CATS.length - 1];
  const filtered = contacts.filter(c => {
    const mc = filterCat === 'all' || c.cat === filterCat;
    const ms = !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.role || '').toLowerCase().includes(search.toLowerCase());
    return mc && ms;
  });

  /* ── Fullscreen add form ── */
  if (showForm) return (
    <div style={{ position: 'fixed', inset: 0, background: '#f7f6f2', zIndex: 400, display: 'flex', flexDirection: 'column', animation: 'slideUp .25s ease-out' }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '1rem 1.25rem', background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,0.08)', flexShrink: 0 }}>
        <button onClick={() => { setShowForm(false); setForm({ name: '', role: '', cat: 'driver', phone: '', note: '' }); }}
          style={{ width: 36, height: 36, borderRadius: '50%', border: '0.5px solid rgba(0,0,0,0.12)', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}>←</button>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, flex: 1 }}>
          {form._editId ? 'Edit Contact' : 'Add Contact'}
        </div>
        <button onClick={handleAdd} disabled={saving || !form.name.trim() || !form.phone.trim()}
          style={{ ...S.btn, ...(isSolo ? S.btnSolo : S.btnP), padding: '8px 22px', fontSize: 14, fontWeight: 600, borderRadius: 12, opacity: (saving || !form.name.trim() || !form.phone.trim()) ? 0.4 : 1 }}>
          {saving ? 'Saving…' : form._editId ? 'Update' : 'Save'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Category header band */}
        <div style={{ background: isSolo ? 'linear-gradient(135deg,#26215C,#534AB7)' : 'linear-gradient(135deg,#0F6E56,#1D9E75)', padding: '1.5rem 1.25rem 2rem' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: .5, textTransform: 'uppercase', marginBottom: 12 }}>Category</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CONTACT_CATS.map(c => (
              <button key={c.id} onClick={() => setForm(f => ({ ...f, cat: c.id }))}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 20, fontSize: 13, border: `1.5px solid ${form.cat === c.id ? '#fff' : 'rgba(255,255,255,0.25)'}`, background: form.cat === c.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontWeight: form.cat === c.id ? 700 : 400, transition: 'all .12s' }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* White card body */}
        <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', marginTop: -16, padding: '1.5rem 1.25rem 3rem' }}>

          {/* Name + Role */}
          {(form.cat === 'guardian' || form.cat === 'emergency') && (
            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={importFromPhoneContacts}
                type="button"
                style={{
                  ...S.btn,
                  ...(isSolo ? S.btnSolo : S.btnP),
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: contactPickerSupported ? 1 : 0.55,
                  cursor: contactPickerSupported ? 'pointer' : 'not-allowed'
                }}
                disabled={!contactPickerSupported}
                title={contactPickerSupported ? 'Pick from your phone contacts' : 'Not supported on this browser'}
              >
                📲 Import from phone contacts
              </button>
              <div style={{ marginTop: 6, fontSize: 11, color: '#6b6b68' }}>
                {contactPickerSupported
                  ? 'Quickly fill guardian/emergency contact from your phone address book.'
                  : 'Contact import is unavailable here. You can still enter details manually.'}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1.25rem' }}>
            <div>
              <label style={S.label}>Full Name *</label>
              <input style={{ ...S.input, marginTop: 6 }} value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Ramesh Kumar" autoFocus />
            </div>
            <div>
              <label style={S.label}>Role</label>
              <input style={{ ...S.input, marginTop: 6 }} value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                placeholder="e.g. Hotel Manager" />
            </div>
          </div>

          {/* Phone */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={S.label}>Phone *</label>
            <input style={{ ...S.input, fontSize: 16, padding: '12px 14px', marginTop: 6, letterSpacing: .5 }}
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+91 98765 43210" type="tel" />
          </div>

          {/* Note */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={S.label}>Note <span style={{ color: '#a8a8a5', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <textarea style={{ ...S.input, resize: 'none', minHeight: 72, marginTop: 6, lineHeight: 1.5 }}
              value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Any useful info — language spoken, hours, etc." />
          </div>

        </div>
      </div>
    </div>
  );

  return (
    <div style={{ paddingBottom: '5rem' }}>

      {/* Header summary */}
      <div style={{ background: isSolo ? 'linear-gradient(135deg,#EEEDFE,#E6F1FB)' : 'linear-gradient(135deg,#E1F5EE,#E6F1FB)', border: `0.5px solid ${isSolo ? '#AFA9EC' : '#9FE1CB'}`, borderRadius: 16, padding: '1rem 1.25rem', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 34 }}>📒</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 2 }}>
            {isSolo ? 'My Contacts' : 'Trip Contacts'}
          </div>
          <div style={{ fontSize: 12, color: '#6b6b68', lineHeight: 1.5 }}>
            {isSolo ? 'Personal contacts for this trip.' : 'Shared by the group — drivers, hotel, guides & emergency.'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 24, fontWeight: 700, color: isSolo ? '#534AB7' : '#0F6E56' }}>{contacts.length}</div>
          <div style={{ fontSize: 11, color: '#6b6b68' }}>saved</div>
        </div>
      </div>

      {/* Emergency / guardian contact reminder */}
      {(() => {
        if (isSolo) return null;
        const dismissKey = `travelbae_contacts_emg_dismissed_${trip.id}`;
        if (emergencyBannerDismissed) return null;
        const isEmg = c => c.cat === 'guardian' || c.cat === 'emergency';
        const membersMissing = isSolo
          ? (contacts.some(isEmg) ? [] : [myNickname || 'You'])
          : memberNames.filter(m => {
              const ml = (m || '').toLowerCase();
              return !contacts.some(c => isEmg(c) && (c.addedBy || '').toLowerCase() === ml);
            });
        if (membersMissing.length === 0) return null;
        return (
          <div style={{ background: 'linear-gradient(135deg,#FFF6E0,#FFEAD6)', border: '0.5px solid #F2C679', borderRadius: 16, padding: '12px 14px', marginBottom: '1.1rem', display: 'flex', alignItems: 'flex-start', gap: 12, position: 'relative' }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: '#FFE0A8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>🚨</div>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 18 }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 13.5, fontWeight: 700, color: '#7A4A0B', marginBottom: 2 }}>
                Add a guardian or emergency contact
              </div>
              <div style={{ fontSize: 12, color: '#7A4A0B', lineHeight: 1.5, opacity: 0.85 }}>
                {isSolo
                  ? 'Save at least one trusted contact we can reach in an emergency.'
                  : `Each traveller should add at least one. Still pending: ${membersMissing.slice(0, 3).join(', ')}${membersMissing.length > 3 ? ` +${membersMissing.length - 3} more` : ''}.`}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setForm({ name: '', role: '', cat: 'guardian', phone: '', note: '' }); setShowForm(true); }}
                  style={{ background: '#7A4A0B', color: '#fff', border: 'none', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
                >
                  + Add guardian
                </button>
                <button
                  onClick={() => { setForm({ name: '', role: '', cat: 'emergency', phone: '', note: '' }); setShowForm(true); }}
                  style={{ background: '#fff', color: '#7A4A0B', border: '0.5px solid #F2C679', borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
                >
                  🚨 Add emergency
                </button>
              </div>
            </div>
            <button
              onClick={() => { localStorage.setItem(dismissKey, '1'); setEmergencyBannerDismissed(true); }}
              aria-label="Dismiss"
              style={{ position: 'absolute', top: 8, right: 10, width: 22, height: 22, border: 'none', background: 'transparent', fontSize: 16, color: '#7A4A0B', cursor: 'pointer', lineHeight: 1, opacity: 0.6 }}
            >
              ×
            </button>
          </div>
        );
      })()}

      {/* Search */}
      <div style={{ marginBottom: '0.75rem' }}>
        <input style={{ ...S.input, background: '#fff' }} placeholder="🔍  Search by name or role…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button onClick={() => setFilterCat('all')}
          style={{ ...S.btn, fontSize: 11, padding: '4px 12px', borderRadius: 20, ...(filterCat === 'all' ? (isSolo ? S.btnSolo : S.btnP) : {}) }}>
          All · {contacts.length}
        </button>
        {CONTACT_CATS.filter(c => catCounts[c.id] > 0).map(c => (
          <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? 'all' : c.id)}
            style={{ ...S.btn, fontSize: 11, padding: '4px 12px', borderRadius: 20, background: filterCat === c.id ? c.color : '#fff', color: filterCat === c.id ? '#fff' : c.color, border: `0.5px solid ${c.color}55` }}>
            {c.icon} {c.label} · {catCounts[c.id]}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#6b6b68' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>📭</div>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>No contacts yet</p>
          <p style={{ fontSize: 13 }}>Tap + to add your first one</p>
        </div>
      )}

      {/* Contact cards */}
      {filtered.map(c => {
        const cm = getCat(c.cat);
        return (
          <div key={c.id} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 16, marginBottom: 10, overflow: 'hidden' }}>
            <div style={{ height: 3, background: cm.color }} />
            <div style={{ padding: '14px 16px' }}>

              {/* Row 1: icon + name + tag + actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: cm.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>👤</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700 }}>{c.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: cm.bg, color: cm.color }}>{cm.label}</span>
                  </div>
                </div>
                <button
                  onClick={() => { setForm({ name: c.name, role: c.role || '', cat: c.cat, phone: c.phone, note: c.note || '', _editId: c.id }); setShowForm(true); }}
                  style={{ width: 28, height: 28, borderRadius: '50%', border: '0.5px solid rgba(0,0,0,0.1)', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>✏️</button>
                <button onClick={() => handleDelete(c.id)}
                  style={{ width: 28, height: 28, borderRadius: '50%', border: '0.5px solid rgba(0,0,0,0.1)', background: '#f7f6f2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12, color: '#a8a8a5', flexShrink: 0 }}>✕</button>
              </div>

              {/* Detail rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingLeft: 2 }}>

                {c.role && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#a8a8a5', textTransform: 'uppercase', letterSpacing: .4, width: 52, flexShrink: 0 }}>Role</span>
                    <span style={{ fontSize: 13, color: '#1a1a18', fontWeight: 500 }}>{c.role}</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#a8a8a5', textTransform: 'uppercase', letterSpacing: .4, width: 52, flexShrink: 0 }}>Contact</span>
                  <a href={`tel:${c.phone}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: isSolo ? '#EEEDFE' : '#E1F5EE', border: `0.5px solid ${isSolo ? '#AFA9EC' : '#9FE1CB'}`, borderRadius: 8, padding: '5px 12px', fontSize: 13, fontWeight: 600, color: isSolo ? '#534AB7' : '#0F6E56', textDecoration: 'none' }}>
                    📞 {c.phone}
                  </a>
                </div>

                {c.note && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#a8a8a5', textTransform: 'uppercase', letterSpacing: .4, width: 52, flexShrink: 0, paddingTop: 1 }}>Note</span>
                    <span style={{ fontSize: 13, color: '#6b6b68', lineHeight: 1.55 }}>{c.note}</span>
                  </div>
                )}

                {!isSolo && c.addedBy && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 6, marginTop: 2, borderTop: '0.5px solid rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#a8a8a5', textTransform: 'uppercase', letterSpacing: .4, width: 52, flexShrink: 0 }}>By</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Avatar name={c.addedBy} size={16} />
                      <span style={{ fontSize: 12, color: '#a8a8a5' }}>{c.addedBy}</span>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        );
      })}

      {/* Emergency quick-dial */}
      {contacts.filter(c => c.cat === 'emergency' || c.cat === 'medical').length > 0 && (
        <div style={{ background: 'linear-gradient(135deg,#FFF3CD,#fff8e7)', border: '0.5px solid #ffc107', borderRadius: 14, padding: '1rem 1.25rem', marginTop: '0.5rem' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#856404', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .4 }}>🚨 Quick-dial emergency</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {contacts.filter(c => c.cat === 'emergency' || c.cat === 'medical').map(c => (
              <a key={c.id} href={`tel:${c.phone}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '0.5px solid #ffc107', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: '#1a1a18', textDecoration: 'none' }}>
                📞 {c.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Floating add button */}
      <button
        onClick={() => setShowForm(true)}
        style={{ position: 'fixed', bottom: 24, right: 20, width: 58, height: 58, borderRadius: '50%', background: isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : 'linear-gradient(135deg,#1D9E75,#0F6E56)', border: 'none', boxShadow: `0 4px 20px ${isSolo ? 'rgba(127,119,221,0.45)' : 'rgba(15,110,86,0.45)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#fff', zIndex: 300, transition: 'transform .15s' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
        +
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LOCAL TASTE PAGE
═══════════════════════════════════════════════════════ */
export default ContactsPage;
