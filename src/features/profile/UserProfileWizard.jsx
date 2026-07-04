import { useState, useRef } from 'react';
import { updateUserProfile } from '../../api';

const GENDER_OPTIONS = [
  { id:'male',           label:'Male' },
  { id:'female',         label:'Female' },
  { id:'non-binary',     label:'Non-binary' },
  { id:'prefer-not-to-say', label:'Prefer not to say' },
];

const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];

const RELATIONS = ['Parent','Sibling','Spouse/Partner','Friend','Child','Colleague','Other'];

const COUNTRIES = [
  'India','United States','United Kingdom','Canada','Australia','UAE','Singapore',
  'Germany','France','Japan','Thailand','Indonesia','Malaysia','Philippines',
  'Bangladesh','Pakistan','Nepal','Sri Lanka','Bhutan','Maldives',
  'Italy','Spain','Portugal','Netherlands','Belgium','Switzerland','Austria',
  'Sweden','Norway','Denmark','Finland','New Zealand','South Africa','Nigeria',
  'Kenya','Brazil','Mexico','Argentina','Turkey','Egypt','Saudi Arabia','Qatar',
  'Kuwait','Bahrain','Oman','Jordan','Israel','South Korea','China','Vietnam',
  'Cambodia','Myanmar','Laos','Sri Lanka','Other',
];

const TOTAL = 6;

const Dot = () => <div style={{ width:6, height:6, borderRadius:'50%', background:'rgba(255,255,255,0.7)', flexShrink:0 }} />;

const SVG = {
  camera: () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  edit:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  pin:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  alert:  () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  heart:  () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  check:  () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  user:   () => <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  back:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
  fwd:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  close:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  cal:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  phone:  () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.89-.89a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
};

const stepMeta = [
  { title:'Your photo',       sub:'Add a face to the name' },
  { title:'About you',        sub:'The basics that matter' },
  { title:'Where are you from?', sub:'Your home base' },
  { title:'Emergency contact', sub:'Just in case, always' },
  { title:'Health info',       sub:'Stays private, helps you' },
  { title:'All set!',          sub:'Your traveller profile is ready' },
];

export default function UserProfileWizard({ userName, onDone }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const [profile, setProfile] = useState({
    photoUrl: '',
    dateOfBirth: '',
    gender: '',
    hometown: '',
    country: 'India',
    phone: '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
    bloodGroup: '',
    medicalNotes: '',
  });

  const set = (key, val) => setProfile(p => ({ ...p, [key]: val }));

  const next = () => setStep(s => Math.min(TOTAL - 1, s + 1));
  const prev = () => setStep(s => Math.max(0, s - 1));

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => set('photoUrl', ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleFinish = async () => {
    setSaving(true); setError('');
    try {
      await updateUserProfile({ ...profile, onboardingDone: true });
      onDone(profile);
    } catch (err) {
      setError(err.message || 'Could not save profile.');
    }
    setSaving(false);
  };

  const canNext = [
    true, // photo is optional
    !!profile.gender, // need gender
    !!profile.country, // need country
    true, // emergency optional
    true, // health optional
    true,
  ][step] !== false;

  const SW = `${100 / TOTAL}%`;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(5,12,9,0.82)', backdropFilter: 'blur(20px) saturate(1.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem' }}>
      <style>{`
        @keyframes wizIn { from { opacity:0; transform:scale(0.95) translateY(22px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .wiz-card { animation: wizIn .38s cubic-bezier(.16,.84,.24,1) both; }
        .wiz-choice { transition: border-color .18s, background .18s, transform .12s, box-shadow .18s; }
        .wiz-choice:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important; }
        .wiz-choice:active { transform: scale(0.97); }
        .wiz-field { width:100%; box-sizing:border-box; background:#fff; border:1.5px solid rgba(15,23,42,0.1); border-radius:14px; padding:13px 16px; font-size:14px; color:#1a1a18; font-family:'DM Sans',system-ui,sans-serif; outline:none; transition:border-color .18s, box-shadow .18s; -webkit-appearance:none; appearance:none; }
        .wiz-field:focus { border-color:#1D9E75 !important; box-shadow:0 0 0 3px rgba(29,158,117,0.12); }
        .wiz-field::placeholder { color:#b8b5ae; }
        .wiz-field-icon { padding-left:44px; }
        .wiz-select { background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a9a96' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 14px center; padding-right:38px; cursor:pointer; }
        .wiz-textarea { resize:none; min-height:90px; line-height:1.65; font-size:13px; }
        .wiz-label { display:block; font-size:11px; font-weight:700; color:#9a9a96; letter-spacing:1.2px; text-transform:uppercase; margin-bottom:8px; }
      `}</style>

      <div className="wiz-card" style={{ width: '100%', maxWidth: 420, height: 'min(640px,93svh)', background: '#fff', borderRadius: 28, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)' }}>

        {/* ── DARK HEADER ── */}
        <div style={{ background: 'linear-gradient(150deg,#0b1810 0%,#112018 55%,#0d1c14 100%)', padding: '1.25rem 1.25rem 1.4rem', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
          {/* Radial glow blobs */}
          <div style={{ position: 'absolute', top: -60, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle,rgba(29,158,117,0.2) 0%,transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -70, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(29,158,117,0.1) 0%,transparent 65%)', pointerEvents: 'none' }} />

          {step > 0 && step < TOTAL - 1 && (
            <button onClick={prev} style={{ position: 'absolute', top: 16, left: 16, width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2, backdropFilter: 'blur(4px)', transition: 'background .15s' }}>
              <SVG.back />
            </button>
          )}

          <div style={{ paddingLeft: step > 0 && step < TOTAL - 1 ? 48 : 0, position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(29,158,117,0.18)', border: '1px solid rgba(29,158,117,0.28)', borderRadius: 20, padding: '3px 10px', marginBottom: 12 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4EC99A', flexShrink: 0 }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#4EC99A', letterSpacing: 1.4, textTransform: 'uppercase' }}>{step + 1} of {TOTAL}</span>
            </div>
            <div style={{ fontFamily: "'Sora',system-ui,sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 4 }}>
              {stepMeta[step].title}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', lineHeight: 1.4 }}>
              {stepMeta[step].sub}
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ display: 'flex', gap: 3, marginTop: 18, position: 'relative', zIndex: 1 }}>
            {Array.from({ length: TOTAL }, (_, i) => (
              <div key={i} style={{ flex: 1, height: 2.5, borderRadius: 99, background: i <= step ? '#1D9E75' : 'rgba(255,255,255,0.1)', transition: 'background .3s ease' }} />
            ))}
          </div>
        </div>

        {/* ── SLIDES ── */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div style={{ display: 'flex', height: '100%', width: `${TOTAL * 100}%`, transform: `translateX(calc(${-step} * ${SW}))`, transition: 'transform .38s cubic-bezier(.16,.84,.24,1.04)' }}>

            {/* STEP 0 — Photo */}
            <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '2rem 1.5rem 1.5rem', background: '#fafaf8', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
              <div style={{ position: 'relative', marginBottom: 22, cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                <div style={{ width: 118, height: 118, borderRadius: '50%', background: profile.photoUrl ? 'transparent' : 'linear-gradient(135deg,#e2f5ef,#cceee3)', border: profile.photoUrl ? 'none' : '2.5px dashed rgba(29,158,117,0.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: profile.photoUrl ? '0 14px 40px rgba(0,0,0,0.18)' : 'none' }}>
                  {profile.photoUrl
                    ? <img src={profile.photoUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <SVG.user />}
                </div>
                <div style={{ position: 'absolute', bottom: 4, right: 4, width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#1D9E75,#158f68)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(29,158,117,0.45)' }}>
                  <SVG.camera />
                </div>
              </div>
              <div style={{ fontFamily: "'Sora',system-ui,sans-serif", fontSize: 22, fontWeight: 700, color: '#0f1a12', marginBottom: 8, textAlign: 'center' }}>
                Hey, {(userName || 'Traveller').split(' ')[0]}!
              </div>
              <div style={{ fontSize: 13.5, color: '#7a7a76', textAlign: 'center', lineHeight: 1.65, maxWidth: 300, marginBottom: 28 }}>
                Let&apos;s build your traveller profile — keeps your crew in the loop and you safe on the go.
              </div>
              <button onClick={() => fileRef.current?.click()} style={{ padding: '12px 30px', borderRadius: 50, border: 'none', background: 'linear-gradient(135deg,#1D9E75,#158f68)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans',system-ui,sans-serif", boxShadow: '0 6px 20px rgba(29,158,117,0.3)', transition: 'transform .15s, box-shadow .15s' }}>
                {profile.photoUrl ? 'Change photo' : 'Add a photo'}
              </button>
              <div style={{ marginTop: 10, fontSize: 12, color: '#bbb9b2' }}>or skip — you can add one later</div>
            </div>

            {/* STEP 1 — About (DOB + gender) */}
            <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '1.5rem', background: '#fafaf8' }}>
              <div style={{ marginBottom: 22 }}>
                <label className="wiz-label">Date of birth</label>
                <div style={{ position: 'relative' }}>
                  <input className="wiz-field wiz-field-icon" type="date" value={profile.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} max={new Date().toISOString().split('T')[0]} />
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#b0b0aa', display: 'flex', pointerEvents: 'none' }}><SVG.cal /></span>
                </div>
              </div>
              <div>
                <label className="wiz-label">Gender</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {GENDER_OPTIONS.map(({ id, label }) => {
                    const sel = profile.gender === id;
                    return (
                      <button key={id} type="button" className="wiz-choice"
                        onClick={() => { set('gender', id); if (step === 1 && id) setTimeout(next, 220); }}
                        style={{ padding: '16px 12px', borderRadius: 16, border: `2px solid ${sel ? '#1D9E75' : 'rgba(15,23,42,0.09)'}`, background: sel ? 'linear-gradient(135deg,#e6f8f2,#f0fcf7)' : '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, boxShadow: sel ? '0 4px 16px rgba(29,158,117,0.12)' : 'none' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: sel ? '#1D9E75' : '#ddd', transition: 'background .15s' }} />
                        <span style={{ fontSize: 13.5, fontWeight: sel ? 700 : 500, color: sel ? '#0F6E56' : '#5a5a56', lineHeight: 1.3 }}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* STEP 2 — Location */}
            <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '1.5rem', background: '#fafaf8' }}>
              <div style={{ marginBottom: 22 }}>
                <label className="wiz-label">Hometown</label>
                <div style={{ position: 'relative' }}>
                  <input className="wiz-field wiz-field-icon" value={profile.hometown} onChange={e => set('hometown', e.target.value)} placeholder="e.g. Bengaluru, Mumbai, Pune" />
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#b0b0aa', display: 'flex', pointerEvents: 'none' }}><SVG.pin /></span>
                </div>
              </div>
              <div>
                <label className="wiz-label">Country</label>
                <select className="wiz-field wiz-select" value={profile.country} onChange={e => set('country', e.target.value)}>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* STEP 3 — Emergency contact */}
            <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '1.5rem', background: '#fafaf8' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '11px 14px', background: 'rgba(255,107,53,0.06)', borderRadius: 12, border: '1px solid rgba(255,107,53,0.15)', marginBottom: 20 }}>
                <span style={{ color: '#D85A30', display: 'flex', flexShrink: 0, marginTop: 1 }}><SVG.alert /></span>
                <span style={{ fontSize: 12.5, color: '#5c3020', lineHeight: 1.55 }}>Only visible to you — used if you ever need help on the road.</span>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label className="wiz-label">Contact name</label>
                <input className="wiz-field" value={profile.emergencyName} onChange={e => set('emergencyName', e.target.value)} placeholder="e.g. Priya Sharma" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                <div>
                  <label className="wiz-label">Phone</label>
                  <input className="wiz-field" type="tel" value={profile.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} placeholder="+91 98765…" />
                </div>
                <div>
                  <label className="wiz-label">Relation</label>
                  <select className="wiz-field wiz-select" value={profile.emergencyRelation} onChange={e => set('emergencyRelation', e.target.value)}>
                    <option value="">Select</option>
                    {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="wiz-label">Your phone <span style={{ fontSize: 10, color: '#b0b0aa', textTransform: 'none', fontWeight: 500, letterSpacing: 0 }}>(optional)</span></label>
                <div style={{ position: 'relative' }}>
                  <input className="wiz-field wiz-field-icon" type="tel" value={profile.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765…" />
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#b0b0aa', display: 'flex', pointerEvents: 'none' }}><SVG.phone /></span>
                </div>
              </div>
            </div>

            {/* STEP 4 — Health info */}
            <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '1.5rem', background: '#fafaf8' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '11px 14px', background: 'rgba(127,119,221,0.06)', borderRadius: 12, border: '1px solid rgba(127,119,221,0.15)', marginBottom: 20 }}>
                <span style={{ color: '#534AB7', display: 'flex', flexShrink: 0, marginTop: 1 }}><SVG.heart /></span>
                <span style={{ fontSize: 12.5, color: '#2e2860', lineHeight: 1.55 }}>All fields optional — this info is only for your safety.</span>
              </div>
              <div style={{ marginBottom: 22 }}>
                <label className="wiz-label">Blood group</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {BLOOD_GROUPS.map(bg => {
                    const sel = profile.bloodGroup === bg;
                    return (
                      <button key={bg} type="button" className="wiz-choice"
                        onClick={() => set('bloodGroup', sel ? '' : bg)}
                        style={{ padding: '9px 18px', borderRadius: 50, border: `2px solid ${sel ? '#1D9E75' : 'rgba(15,23,42,0.1)'}`, background: sel ? '#E1F5EE' : '#fff', fontSize: 13, fontWeight: sel ? 700 : 500, color: sel ? '#0F6E56' : '#5a5a56', cursor: 'pointer', boxShadow: sel ? '0 2px 10px rgba(29,158,117,0.15)' : 'none' }}>
                        {bg}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="wiz-label">Medical notes <span style={{ fontSize: 10, color: '#b0b0aa', textTransform: 'none', fontWeight: 500, letterSpacing: 0 }}>(optional)</span></label>
                <textarea className="wiz-field wiz-textarea" value={profile.medicalNotes} onChange={e => set('medicalNotes', e.target.value)} placeholder="e.g. Allergic to penicillin, asthma, diabetic…" />
              </div>
            </div>

            {/* STEP 5 — Done */}
            <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '2rem 1.5rem 1.5rem', background: '#fafaf8', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'linear-gradient(135deg,#1D9E75,#0d6647)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', marginBottom: 20, boxShadow: '0 16px 40px rgba(15,110,86,0.35)' }}>
                <SVG.check />
              </div>
              <div style={{ fontFamily: "'Sora',system-ui,sans-serif", fontSize: 23, fontWeight: 800, color: '#0f1a12', marginBottom: 8, textAlign: 'center' }}>You&apos;re all set!</div>
              <div style={{ fontSize: 13.5, color: '#7a7a76', textAlign: 'center', lineHeight: 1.65, marginBottom: 24, maxWidth: 300 }}>
                Your traveller profile is ready. Update it anytime from your profile page.
              </div>
              <div style={{ background: '#fff', borderRadius: 18, border: '0.5px solid rgba(0,0,0,0.07)', width: '100%', marginBottom: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                {[
                  { label: 'Name', value: userName || '—' },
                  { label: 'Gender', value: profile.gender || '—' },
                  { label: 'From', value: [profile.hometown, profile.country].filter(Boolean).join(', ') || '—' },
                  { label: 'Emergency', value: profile.emergencyName ? `${profile.emergencyName}${profile.emergencyRelation ? ` · ${profile.emergencyRelation}` : ''}` : '—' },
                  { label: 'Blood group', value: profile.bloodGroup || '—' },
                ].map(({ label, value }, idx, arr) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: idx < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                    <span style={{ fontSize: 13, color: '#9a9a96', fontWeight: 600 }}>{label}</span>
                    <span style={{ fontSize: 13.5, color: '#1a1a18', fontWeight: 600, maxWidth: 200, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                  </div>
                ))}
              </div>
              {error && <div style={{ fontSize: 12.5, color: '#993C1D', marginBottom: 12, padding: '10px 14px', background: '#FAECE7', borderRadius: 12, width: '100%', textAlign: 'center' }}>{error}</div>}
            </div>

          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ padding: '0.875rem 1.25rem calc(0.875rem + env(safe-area-inset-bottom,0px))', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: 8, background: '#fff', flexShrink: 0 }}>
          {step < TOTAL - 1 ? (
            <>
              {step > 0 && (
                <button onClick={prev} style={{ padding: '12px 14px', borderRadius: 14, border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff', color: '#5a5a56', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans',sans-serif", transition: 'border-color .15s' }}>
                  <SVG.back />
                </button>
              )}
              <button onClick={next} disabled={!canNext}
                style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', background: canNext ? 'linear-gradient(135deg,#1D9E75,#0d6647)' : '#e8e6de', color: canNext ? '#fff' : '#aaa', fontSize: 14, fontWeight: 700, cursor: canNext ? 'pointer' : 'default', fontFamily: "'DM Sans',system-ui,sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: canNext ? '0 4px 16px rgba(29,158,117,0.28)' : 'none', transition: 'all .18s' }}>
                {step === 0 ? 'Get started' : 'Continue'} <SVG.fwd />
              </button>
            </>
          ) : (
            <button onClick={handleFinish} disabled={saving}
              style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', background: saving ? '#c8c6be' : 'linear-gradient(135deg,#1D9E75,#0d6647)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', fontFamily: "'DM Sans',system-ui,sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: saving ? 'none' : '0 4px 16px rgba(29,158,117,0.28)', transition: 'all .18s' }}>
              {saving ? 'Saving…' : 'Start exploring ✈️'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
