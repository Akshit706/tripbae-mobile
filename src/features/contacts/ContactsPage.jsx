import { useState, useRef, useEffect } from 'react';
import { addContact, deleteContact } from '../../api';
import { CONTACT_CATS, normalizeMembers } from '../shared/constants';
import { S } from '../shared/styles';
import lumi12Img from '../../assets/lumi12.png';

/* ── Category SVG icons ─────────────────────────────── */
function CatIcon({ id, size = 15, color = 'currentColor' }) {
  const s = { width: size, height: size, flexShrink: 0 };
  const p = { fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (id) {
    case 'guardian': return (
      <svg style={s} viewBox="0 0 24 24" {...p}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    );
    case 'driver': return (
      <svg style={s} viewBox="0 0 24 24" {...p}>
        <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2h-2"/>
        <circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>
      </svg>
    );
    case 'hotel': return (
      <svg style={s} viewBox="0 0 24 24" {...p}>
        <path d="M3 21h18M3 7v14M21 7v14M6 3h12v4H6z"/>
        <path d="M9 21v-5h6v5M9 11h.01M15 11h.01"/>
      </svg>
    );
    case 'guide': return (
      <svg style={s} viewBox="0 0 24 24" {...p}>
        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    );
    case 'medical': return (
      <svg style={s} viewBox="0 0 24 24" {...p}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
      </svg>
    );
    case 'emergency': return (
      <svg style={s} viewBox="0 0 24 24" {...p}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    );
    default: return (
      <svg style={s} viewBox="0 0 24 24" {...p}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    );
  }
}

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
  const CONTACTS_WELCOME_KEY = `travelbae_contacts_welcome_${trip.id}`;
  const [showWelcome, setShowWelcome] = useState(
    () => { try { return !localStorage.getItem(`travelbae_contacts_welcome_${trip.id}`); } catch { return false; } }
  );
  const dismissWelcome = () => {
    try { localStorage.setItem(CONTACTS_WELCOME_KEY, '1'); } catch {}
    setShowWelcome(false);
  };

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
    <div style={{ position:'fixed', inset:0, background:'#FAF8F4', zIndex:400, display:'flex', flexDirection:'column', animation:'slideUp .25s ease-out' }}>
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'1rem 1.25rem', background:'#fff', borderBottom:'0.5px solid rgba(0,0,0,0.08)', flexShrink:0 }}>
        <button onClick={() => { setShowForm(false); setForm({ name:'', role:'', cat:'driver', phone:'', note:'' }); }}
          style={{ width:36, height:36, borderRadius:'50%', border:'0.5px solid rgba(0,0,0,0.12)', background:'#f7f6f2', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1C1410" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div style={{ fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:700, flex:1 }}>
          {form._editId ? 'Edit Contact' : 'Add Contact'}
        </div>
        <button onClick={handleAdd} disabled={saving || !form.name.trim() || !form.phone.trim()}
          style={{ ...S.btn, ...(isSolo ? S.btnSolo : { background:'linear-gradient(135deg,#D97706,#B45309)', color:'#fff', border:'0.5px solid rgba(180,83,9,0.6)', boxShadow:'0 8px 20px rgba(180,83,9,0.2)' }), padding:'8px 22px', fontSize:14, fontWeight:600, borderRadius:12, opacity:(saving || !form.name.trim() || !form.phone.trim()) ? 0.4 : 1 }}>
          {saving ? 'Saving…' : form._editId ? 'Update' : 'Save'}
        </button>
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>
        {/* Category header band */}
        <div style={{ background: isSolo ? 'linear-gradient(135deg,#4C1D95,#6D28D9,#7C3AED)' : 'linear-gradient(135deg,#92400E,#B45309,#D97706)', padding:'1.5rem 1.25rem 2rem' }}>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)', fontWeight:600, letterSpacing:.5, textTransform:'uppercase', marginBottom:12 }}>Category</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {CONTACT_CATS.map(c => (
              <button key={c.id} onClick={() => setForm(f => ({ ...f, cat: c.id }))}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:20, fontSize:13,
                  border:`1.5px solid ${form.cat === c.id ? '#fff' : 'rgba(255,255,255,0.25)'}`,
                  background: form.cat === c.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                  color:'#fff', cursor:'pointer', fontFamily:"'DM Sans',sans-serif",
                  fontWeight: form.cat === c.id ? 700 : 400, transition:'all .12s' }}>
                <CatIcon id={c.id} size={13} color="#fff" />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* White card body */}
        <div style={{ background:'#fff', borderRadius:'20px 20px 0 0', marginTop:-16, padding:'1.5rem 1.25rem 3rem' }}>

          {(form.cat === 'guardian' || form.cat === 'emergency') && (
            <div style={{ marginBottom:'1rem' }}>
              <button
                onClick={importFromPhoneContacts}
                type="button"
                style={{
                  ...S.btn,
                  ...(isSolo ? S.btnSolo : { background:'linear-gradient(135deg,#D97706,#B45309)', color:'#fff', border:'0.5px solid rgba(180,83,9,0.6)' }),
                  width:'100%',
                  padding:'10px 14px',
                  borderRadius:12,
                  display:'flex',
                  alignItems:'center',
                  justifyContent:'center',
                  gap:8,
                  opacity: contactPickerSupported ? 1 : 0.55,
                  cursor: contactPickerSupported ? 'pointer' : 'not-allowed'
                }}
                disabled={!contactPickerSupported}
                title={contactPickerSupported ? 'Pick from your phone contacts' : 'Not supported on this browser'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Import from phone contacts
              </button>
              <div style={{ marginTop:6, fontSize:11, color:'#6b6b68' }}>
                {contactPickerSupported
                  ? 'Quickly fill guardian/emergency contact from your phone address book.'
                  : 'Contact import is unavailable here. You can still enter details manually.'}
              </div>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:'1.25rem' }}>
            <div>
              <label style={S.label}>Full Name *</label>
              <input style={{ ...S.input, marginTop:6 }} value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Ramesh Kumar" autoFocus />
            </div>
            <div>
              <label style={S.label}>Role</label>
              <input style={{ ...S.input, marginTop:6 }} value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                placeholder="e.g. Hotel Manager" />
            </div>
          </div>

          <div style={{ marginBottom:'1.25rem' }}>
            <label style={S.label}>Phone *</label>
            <input style={{ ...S.input, fontSize:16, padding:'12px 14px', marginTop:6, letterSpacing:.5 }}
              value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+91 98765 43210" type="tel" />
          </div>

          <div style={{ marginBottom:'1.25rem' }}>
            <label style={S.label}>Note <span style={{ color:'#a8a8a5', fontWeight:400, textTransform:'none', letterSpacing:0 }}>(optional)</span></label>
            <textarea style={{ ...S.input, resize:'none', minHeight:72, marginTop:6, lineHeight:1.5 }}
              value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Any useful info — language spoken, hours, etc." />
          </div>

        </div>
      </div>
    </div>
  );

  return (
    <div style={{ paddingBottom:'5rem' }}>

      {/* Welcome popup */}
      {showWelcome && (
        <div style={{ position:'fixed', inset:0, background:'rgba(28,20,16,0.55)', backdropFilter:'blur(6px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'1.25rem' }}
          onClick={dismissWelcome}>
          <style>{`@keyframes lumiContPop{from{opacity:0;transform:scale(0.88) translateY(20px)}60%{transform:scale(1.02) translateY(-2px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
          <div style={{ background:'#fff', borderRadius:24, overflow:'hidden', width:'100%', maxWidth:400, boxShadow:'0 28px 80px rgba(28,20,16,0.28)', animation:'lumiContPop .45s cubic-bezier(0.34,1.3,0.64,1) both', position:'relative' }}
            onClick={e => e.stopPropagation()}>
            {/* Orange top strip */}
            <div style={{ height:4, background:'linear-gradient(90deg,#FF6A00,#FF8C3B,#FF6A00)' }} />
            {/* X close */}
            <button onClick={dismissWelcome} style={{ position:'absolute', top:14, right:14, width:28, height:28, borderRadius:'50%', border:'none', background:'#F3F4F6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, zIndex:1 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            {/* Side-by-side: Lumi + text */}
            <div style={{ display:'flex', alignItems:'center', padding:'1.25rem 1.25rem 1rem', gap:14 }}>
              <div style={{ width:92, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <img src={lumi12Img} alt="Lumi" style={{ width:86, height:116, objectFit:'contain', display:'block' }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'#FFF3EB', borderRadius:999, padding:'3px 9px', marginBottom:8 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:'#FF6A00' }} />
                  <span style={{ fontSize:9.5, fontWeight:700, color:'#FF6A00', letterSpacing:.8, textTransform:'uppercase', fontFamily:"'DM Sans',sans-serif" }}>Lumi says</span>
                </div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, color:'#1C1410', lineHeight:1.25, marginBottom:7 }}>
                  Your safety net, one tap away
                </div>
                <div style={{ fontSize:12, color:'#5C504A', lineHeight:1.62, marginBottom:10 }}>
                  Before you wander too far — save the people who matter. Your driver, that local guide, the nearest hospital. You hope you never need them. But they're here.
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[
                    'Guardian: someone back home who can always help',
                    'Emergency: doctor, hospital, police, helpline',
                    'On-Trip: driver, hotel, guide — anyone en-route',
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
            {/* CTA */}
            <div style={{ padding:'0 1.25rem 1.25rem' }}>
              <button onClick={dismissWelcome} style={{ width:'100%', padding:'13px', fontSize:14, fontWeight:700, borderRadius:14, border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", background:'linear-gradient(135deg,#FF6A00,#FF8C3B)', color:'#fff', boxShadow:'0 4px 16px rgba(255,106,0,0.3)' }}>
                Got it, staying safe 🛡️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero card */}
      <div style={{
        background: isSolo
          ? 'linear-gradient(135deg,#4C1D95,#6D28D9,#7C3AED)'
          : 'linear-gradient(135deg,#92400E,#B45309,#D97706)',
        borderRadius:20, padding:'1.5rem 1.35rem', marginBottom:'1.25rem',
        position:'relative', overflow:'hidden'
      }}>
        <div style={{ position:'absolute', right:-30, top:-36, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', left:-40, bottom:-48, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,0.08)', pointerEvents:'none' }} />
        {/* ⓘ Lumi info button */}
        <button onClick={() => setShowWelcome(true)} title="About Contacts" style={{ position:'absolute', top:10, right:10, width:26, height:26, borderRadius:'50%', border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:5, padding:0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </button>

        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', position:'relative', gap:10 }}>
          <div style={{ width:50, height:50, borderRadius:16, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily:"'Sora',sans-serif", fontSize:20, fontWeight:800, color:'#fff', letterSpacing:-0.4, lineHeight:1.2 }}>
              {isSolo ? 'My Contacts' : 'Trip Contacts'}
            </div>
            <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.65)', marginTop:4 }}>
              {isSolo ? 'Personal contacts for this trip' : 'Shared by the group · always in reach'}
            </div>
          </div>
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
          <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.07)', borderRadius:16, overflow:'hidden', marginBottom:'1.1rem', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', position:'relative' }}>
            <div style={{ height:3, background:'linear-gradient(90deg,#E53E3E,#F97316)' }} />
            <div style={{ padding:'14px 14px 14px', display:'flex', alignItems:'flex-start', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'#FFF1F2', border:'1px solid #FED7D7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E53E3E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div style={{ flex:1, minWidth:0, paddingRight:18 }}>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:13.5, fontWeight:700, color:'#1C1410', marginBottom:3 }}>
                Add a safety contact
              </div>
              <div style={{ fontSize:12, color:'#6b6b68', lineHeight:1.55 }}>
                {isSolo
                  ? 'Save a trusted guardian or emergency contact for your trip.'
                  : `Each traveller should add one. Still pending: ${membersMissing.slice(0, 3).join(', ')}${membersMissing.length > 3 ? ` +${membersMissing.length - 3} more` : ''}.`}
              </div>
              <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
                <button
                  onClick={() => { setForm({ name:'', role:'', cat:'guardian', phone:'', note:'' }); setShowForm(true); }}
                  style={{ background:'#1C1410', color:'#fff', border:'none', borderRadius:10, padding:'7px 14px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}
                >
                  + Add guardian
                </button>
                <button
                  onClick={() => { setForm({ name:'', role:'', cat:'emergency', phone:'', note:'' }); setShowForm(true); }}
                  style={{ background:'#FFF1F2', color:'#E53E3E', border:'1px solid #FED7D7', borderRadius:10, padding:'7px 14px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}
                >
                  + Emergency
                </button>
              </div>
            </div>
            <button
              onClick={() => { localStorage.setItem(dismissKey, '1'); setEmergencyBannerDismissed(true); }}
              aria-label="Dismiss"
              style={{ position:'absolute', top:10, right:10, width:22, height:22, border:'none', background:'transparent', cursor:'pointer', lineHeight:1, opacity:0.45, display:'flex', alignItems:'center', justifyContent:'center' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1C1410" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            </div>
          </div>
        );
      })()}

      {/* Search */}
      <div style={{ marginBottom:'0.75rem' }}>
        <input style={{ ...S.input, background:'#fff' }} placeholder="Search by name or role…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Category filter pills */}
      <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:'1rem' }}>
        <button onClick={() => setFilterCat('all')}
          style={{ ...S.btn, fontSize:11, padding:'4px 12px', borderRadius:20, ...(filterCat === 'all' ? (isSolo ? S.btnSolo : { background:'linear-gradient(135deg,#D97706,#B45309)', color:'#fff', border:'0.5px solid rgba(180,83,9,0.6)', boxShadow:'0 6px 16px rgba(180,83,9,0.18)' }) : {}) }}>
          All · {contacts.length}
        </button>
        {CONTACT_CATS.filter(c => catCounts[c.id] > 0).map(c => (
          <button key={c.id} onClick={() => setFilterCat(filterCat === c.id ? 'all' : c.id)}
            style={{ ...S.btn, fontSize:11, padding:'4px 10px', borderRadius:20, display:'flex', alignItems:'center', gap:5,
              background: filterCat === c.id ? c.color : '#fff',
              color: filterCat === c.id ? '#fff' : c.color,
              border:`0.5px solid ${c.color}55` }}>
            <CatIcon id={c.id} size={12} color={filterCat === c.id ? '#fff' : c.color} />
            {c.label} · {catCounts[c.id]}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'4rem 1rem', color:'#6b6b68' }}>
          <div style={{ width:64, height:64, borderRadius:20, background: isSolo ? '#EDE9FE' : '#FEF3C7', margin:'0 auto 18px', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={isSolo ? '#6D28D9' : '#B45309'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              <line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/>
            </svg>
          </div>
          <p style={{ fontSize:15, fontWeight:700, marginBottom:6, fontFamily:"'Sora',sans-serif", color:'#1C1410' }}>No contacts yet</p>
          <p style={{ fontSize:13 }}>Tap + to add your first one</p>
        </div>
      )}

      {/* Contact cards */}
      {filtered.map(c => {
        const cm = getCat(c.cat);
        return (
          <div key={c.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.07)', borderRadius:16, marginBottom:10, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ height:3, background:cm.color }} />
            <div style={{ padding:'14px 16px' }}>

              {/* Row 1: icon + name + tag + actions */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ width:40, height:40, borderRadius:11, background:cm.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <CatIcon id={c.cat} size={18} color={cm.color} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
                    <span style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:700 }}>{c.name}</span>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:10, background:cm.bg, color:cm.color }}>{cm.label}</span>
                  </div>
                </div>
                <button
                  onClick={() => { setForm({ name:c.name, role:c.role||'', cat:c.cat, phone:c.phone, note:c.note||'', _editId:c.id }); setShowForm(true); }}
                  style={{ width:28, height:28, borderRadius:'50%', border:'0.5px solid rgba(0,0,0,0.1)', background:'#f7f6f2', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5C504A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button onClick={() => handleDelete(c.id)}
                  style={{ width:28, height:28, borderRadius:'50%', border:'0.5px solid rgba(0,0,0,0.1)', background:'#f7f6f2', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a8a8a5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                </button>
              </div>

              {/* Detail rows */}
              <div style={{ display:'flex', flexDirection:'column', gap:7, paddingLeft:2 }}>

                {c.role && (
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontSize:11, fontWeight:600, color:'#a8a8a5', textTransform:'uppercase', letterSpacing:.4, width:52, flexShrink:0 }}>Role</span>
                    <span style={{ fontSize:13, color:'#1a1a18', fontWeight:500 }}>{c.role}</span>
                  </div>
                )}

                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:11, fontWeight:600, color:'#a8a8a5', textTransform:'uppercase', letterSpacing:.4, width:52, flexShrink:0 }}>Contact</span>
                  <a href={`tel:${c.phone}`}
                    style={{ display:'inline-flex', alignItems:'center', gap:6, background: isSolo ? '#EDE9FE' : '#FEF3C7', border:`0.5px solid ${isSolo ? '#C4B5FD' : '#FCD34D'}`, borderRadius:8, padding:'5px 12px', fontSize:13, fontWeight:600, color: isSolo ? '#6D28D9' : '#92400E', textDecoration:'none' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.37 2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.85a16 16 0 0 0 6.29 6.29l1.17-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    {c.phone}
                  </a>
                </div>

                {c.note && (
                  <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                    <span style={{ fontSize:11, fontWeight:600, color:'#a8a8a5', textTransform:'uppercase', letterSpacing:.4, width:52, flexShrink:0, paddingTop:1 }}>Note</span>
                    <span style={{ fontSize:13, color:'#6b6b68', lineHeight:1.55 }}>{c.note}</span>
                  </div>
                )}

                {!isSolo && c.addedBy && (
                  <div style={{ display:'flex', alignItems:'center', gap:10, paddingTop:6, marginTop:2, borderTop:'0.5px solid rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize:11, fontWeight:600, color:'#a8a8a5', textTransform:'uppercase', letterSpacing:.4, width:52, flexShrink:0 }}>By</span>
                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:18, height:18, borderRadius:'50%', background: isSolo ? '#EDE9FE' : '#FEF3C7', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color: isSolo ? '#6D28D9' : '#92400E', flexShrink:0 }}>
                        {(c.addedBy||'?').slice(0,1).toUpperCase()}
                      </div>
                      <span style={{ fontSize:12, color:'#a8a8a5' }}>{c.addedBy}</span>
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
        <div style={{ background:'linear-gradient(135deg,#FFF3CD,#fff8e7)', border:'0.5px solid #ffc107', borderRadius:14, padding:'1rem 1.25rem', marginTop:'0.5rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#856404" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span style={{ fontSize:11, fontWeight:700, color:'#856404', textTransform:'uppercase', letterSpacing:.4 }}>Quick-dial emergency</span>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {contacts.filter(c => c.cat === 'emergency' || c.cat === 'medical').map(c => (
              <a key={c.id} href={`tel:${c.phone}`}
                style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#fff', border:'0.5px solid #ffc107', borderRadius:10, padding:'8px 14px', fontSize:13, fontWeight:600, color:'#1a1a18', textDecoration:'none' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#856404" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.37 2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.85a16 16 0 0 0 6.29 6.29l1.17-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                </svg>
                {c.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Floating add button */}
      <button
        onClick={() => setShowForm(true)}
        style={{ position:'fixed', bottom:24, right:20, width:58, height:58, borderRadius:'50%',
          background: isSolo ? 'linear-gradient(135deg,#7C3AED,#6D28D9)' : 'linear-gradient(135deg,#D97706,#B45309)',
          border:'none',
          boxShadow: isSolo ? '0 6px 24px rgba(109,40,217,0.45), 0 2px 8px rgba(0,0,0,0.15)' : '0 6px 24px rgba(180,83,9,0.45), 0 2px 8px rgba(0,0,0,0.15)',
          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:28, color:'#fff', zIndex:300, transition:'transform .15s' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
        +
      </button>
    </div>
  );
}

export default ContactsPage;
