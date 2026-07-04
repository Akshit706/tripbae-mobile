import { useState, useRef } from 'react';
import { updateUserProfile } from '../../api';
import { S } from '../shared/styles';

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

const GRADS = [
  'linear-gradient(135deg,#1D9E75,#0F6E56)',
  'linear-gradient(135deg,#378ADD,#1A5FA8)',
  'linear-gradient(135deg,#BA7517,#7A4D0F)',
  'linear-gradient(135deg,#D4537E,#8B2455)',
  'linear-gradient(135deg,#7F77DD,#534AB7)',
  'linear-gradient(135deg,#1D9E75,#0F6E56)',
];

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

  const grad = GRADS[step];
  const stepW = `${100 / TOTAL}%`;
  const canNext = [
    true, // photo is optional
    !!profile.gender, // need gender
    !!profile.country, // need country
    true, // emergency optional
    true, // health optional
    true,
  ][step] !== false;

  return (
    <div style={{ position:'fixed', inset:0, zIndex:1100, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(12px) saturate(1.6)', display:'flex', alignItems:'center', justifyContent:'center', padding:'0.75rem' }}>
      <style>{`
        @keyframes wizIn { from { opacity:0; transform:scale(0.94) translateY(16px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .up-modal { animation: wizIn .32s cubic-bezier(.2,.8,.2,1) both; }
        .up-choice { transition: all .15s ease; }
        .up-choice:hover { transform: translateY(-1px); }
      `}</style>
      <div className="up-modal" style={{ width:'100%', maxWidth:440, height:'min(620px, 92svh)', background:'#fff', borderRadius:28, overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 40px 100px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08)' }}>

        {/* HEADER */}
        <div style={{ background:grad, padding:'1rem 1.2rem 1.1rem', flexShrink:0, position:'relative' }}>
          {step > 0 && step < TOTAL - 1 && (
            <button onClick={prev} style={{ position:'absolute', top:16, left:16, width:30, height:30, borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.18)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:2 }}>
              <SVG.back />
            </button>
          )}
          <div style={{ paddingLeft: step > 0 ? 40 : 0 }}>
            <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.55)', letterSpacing:1.6, textTransform:'uppercase', marginBottom:3 }}>
              Your profile &nbsp;&middot;&nbsp; {step + 1} of {TOTAL}
            </div>
            <div style={{ fontFamily:"'Sora',sans-serif", fontSize:18, fontWeight:800, color:'#fff', lineHeight:1.2, marginBottom:1 }}>
              {stepMeta[step].title}
            </div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)' }}>{stepMeta[step].sub}</div>
          </div>
          <div style={{ display:'flex', gap:3, marginTop:14 }}>
            {Array.from({ length:TOTAL }, (_, i) => (
              <div key={i} style={{ flex:1, height:3, borderRadius:99, background: i <= step ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.2)', transition:'background .25s' }} />
            ))}
          </div>
        </div>

        {/* SLIDES */}
        <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
          <div style={{ display:'flex', height:'100%', width:`${TOTAL * 100}%`, transform:`translateX(calc(${-step} * ${100 / TOTAL}%))`, transition:'transform .38s cubic-bezier(.16,.84,.24,1.04)' }}>

            {/* STEP 0 — Photo */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.75rem 1.25rem', background:'#fafaf8', display:'flex', flexDirection:'column', alignItems:'center' }}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhoto} />
              <div style={{ position:'relative', marginBottom:20, cursor:'pointer' }} onClick={() => fileRef.current?.click()}>
                <div style={{ width:110, height:110, borderRadius:'50%', background: profile.photoUrl ? 'transparent' : 'linear-gradient(135deg,rgba(29,158,117,0.18),rgba(29,158,117,0.08))', border:'2.5px dashed rgba(29,158,117,0.35)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', position:'relative' }}>
                  {profile.photoUrl
                    ? <img src={profile.photoUrl} alt="profile" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <SVG.user />
                  }
                </div>
                <div style={{ position:'absolute', bottom:4, right:4, width:30, height:30, borderRadius:'50%', background:'#1D9E75', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', boxShadow:'0 2px 8px rgba(29,158,117,0.5)' }}>
                  <SVG.camera />
                </div>
              </div>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:20, fontWeight:700, color:'#0f1a12', marginBottom:6, textAlign:'center' }}>
                Welcome, {(userName || 'Traveller').split(' ')[0]}!
              </div>
              <div style={{ fontSize:13, color:'#6b6b68', textAlign:'center', lineHeight:1.6, maxWidth:300, marginBottom:24 }}>
                Let&rsquo;s set up your traveller profile. It helps your group and keeps you safe on the road.
              </div>
              <button onClick={() => fileRef.current?.click()}
                style={{ ...S.btn, ...S.btnP, padding:'10px 24px', fontSize:13 }}>
                {profile.photoUrl ? 'Change photo' : 'Add a photo'}
              </button>
              <div style={{ marginTop:8, fontSize:11, color:'#b0b0aa' }}>Tap to upload from your device</div>
            </div>

            {/* STEP 1 — About you (DOB + gender) */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.4rem 1.25rem', background:'#fafaf8' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Date of birth</div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
                <span style={{ color:'#9a9a96', display:'flex' }}><SVG.cal /></span>
                <input style={{ ...S.input, flex:1, fontSize:14, padding:'12px 14px', borderRadius:14 }}
                  type="date" value={profile.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} max={new Date().toISOString().split('T')[0]} />
              </div>

              <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase', marginBottom:10 }}>Gender</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {GENDER_OPTIONS.map(({ id, label }) => {
                  const sel = profile.gender === id;
                  return (
                    <button key={id} type="button" className="up-choice"
                      onClick={() => { set('gender', id); if (step === 1 && id) setTimeout(next, 220); }}
                      style={{ padding:'13px 12px', borderRadius:14, border:`1.5px solid ${sel ? '#9FE1CB' : 'rgba(15,23,42,0.1)'}`, background:sel ? '#E1F5EE' : '#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, transition:'all .15s' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background: sel ? '#1D9E75' : 'rgba(15,23,42,0.2)', transition:'all .15s', flexShrink:0 }} />
                      <span style={{ fontSize:13, fontWeight: sel ? 700 : 500, color: sel ? '#0F6E56' : '#4a4a48' }}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* STEP 2 — Location (hometown + country) */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.4rem 1.25rem', background:'#fafaf8' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ color:'#9a9a96', display:'flex' }}><SVG.pin /></span>
                <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase' }}>Hometown</div>
              </div>
              <input style={{ ...S.input, fontSize:15, padding:'13px 16px', borderRadius:16, marginBottom:18 }}
                value={profile.hometown} onChange={e => set('hometown', e.target.value)}
                placeholder="e.g. Bengaluru, Chennai, Mumbai" />

              <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Country</div>
              <select style={{ ...S.input, fontSize:14, padding:'12px 14px', borderRadius:14, cursor:'pointer' }}
                value={profile.country} onChange={e => set('country', e.target.value)}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* STEP 3 — Emergency contact */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.4rem 1.25rem', background:'#fafaf8' }}>
              <div style={{ display:'flex', gap:7, alignItems:'flex-start', padding:'10px 12px', background:'rgba(255,107,53,0.06)', borderRadius:12, border:'1px solid rgba(255,107,53,0.18)', marginBottom:18 }}>
                <span style={{ color:'#D85A30', display:'flex', flexShrink:0, marginTop:1 }}><SVG.alert /></span>
                <span style={{ fontSize:12, color:'#5c3020', lineHeight:1.5 }}>Only visible to you. Used when you need help on the road.</span>
              </div>

              <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Contact name</div>
              <input style={{ ...S.input, fontSize:14, padding:'12px 14px', borderRadius:14, marginBottom:12 }}
                value={profile.emergencyName} onChange={e => set('emergencyName', e.target.value)} placeholder="e.g. Priya Sharma" />

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase', marginBottom:6 }}>Phone</div>
                  <input style={{ ...S.input, fontSize:14, padding:'11px 12px', borderRadius:12 }}
                    type="tel" value={profile.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} placeholder="+91 98765..." />
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase', marginBottom:6 }}>Relation</div>
                  <select style={{ ...S.input, fontSize:13, padding:'11px 10px', borderRadius:12, cursor:'pointer' }}
                    value={profile.emergencyRelation} onChange={e => set('emergencyRelation', e.target.value)}>
                    <option value="">Select</option>
                    {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Your phone (optional)</div>
              <input style={{ ...S.input, fontSize:14, padding:'12px 14px', borderRadius:14 }}
                type="tel" value={profile.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765..." />
            </div>

            {/* STEP 4 — Health info */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.4rem 1.25rem', background:'#fafaf8' }}>
              <div style={{ display:'flex', gap:7, alignItems:'flex-start', padding:'10px 12px', background:'rgba(127,119,221,0.06)', borderRadius:12, border:'1px solid rgba(127,119,221,0.18)', marginBottom:18 }}>
                <span style={{ color:'#534AB7', display:'flex', flexShrink:0, marginTop:1 }}><SVG.heart /></span>
                <span style={{ fontSize:12, color:'#2e2860', lineHeight:1.5 }}>All fields are optional. This info is only for your safety.</span>
              </div>

              <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase', marginBottom:10 }}>Blood group</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
                {BLOOD_GROUPS.map(bg => {
                  const sel = profile.bloodGroup === bg;
                  return (
                    <button key={bg} type="button" className="up-choice"
                      onClick={() => set('bloodGroup', sel ? '' : bg)}
                      style={{ padding:'9px 16px', borderRadius:20, border:`1.5px solid ${sel ? '#AFA9EC' : 'rgba(15,23,42,0.1)'}`, background:sel ? '#EEEDFE' : '#fff', fontSize:13, fontWeight: sel ? 700 : 500, color: sel ? '#534AB7' : '#4a4a48', cursor:'pointer', transition:'all .15s' }}>
                      {bg}
                    </button>
                  );
                })}
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase' }}>Medical notes</div>
                <span style={{ fontSize:10, color:'#b0b0aa', background:'rgba(0,0,0,0.05)', borderRadius:6, padding:'2px 7px', fontStyle:'italic' }}>optional</span>
              </div>
              <textarea style={{ ...S.input, fontSize:13, padding:'12px 14px', borderRadius:14, resize:'none', minHeight:90, lineHeight:1.6, fontFamily:'inherit' }}
                value={profile.medicalNotes} onChange={e => set('medicalNotes', e.target.value)}
                placeholder="e.g. Allergic to penicillin, asthma, diabetic\u2026" />
            </div>

            {/* STEP 5 — Done */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.75rem 1.25rem', background:'#fafaf8', display:'flex', flexDirection:'column', alignItems:'center' }}>
              <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#1D9E75,#0F6E56)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', marginBottom:18, boxShadow:'0 16px 32px rgba(15,110,86,0.35)' }}>
                <SVG.check />
              </div>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:22, fontWeight:800, color:'#0f1a12', marginBottom:8, textAlign:'center' }}>Profile complete!</div>
              <div style={{ fontSize:13, color:'#6b6b68', textAlign:'center', lineHeight:1.65, marginBottom:24, maxWidth:300 }}>
                Your traveller profile is set up. You can always update it from the profile drawer.
              </div>
              <div style={{ background:'#fff', borderRadius:18, border:'1px solid rgba(15,23,42,0.08)', padding:16, width:'100%', display:'grid', gap:8, marginBottom:16 }}>
                {[
                  { label:'Name', value: userName || '\u2014' },
                  { label:'Gender', value: profile.gender || '\u2014' },
                  { label:'From', value: [profile.hometown, profile.country].filter(Boolean).join(', ') || '\u2014' },
                  { label:'Emergency', value: profile.emergencyName ? `${profile.emergencyName} (${profile.emergencyRelation || 'Contact'})` : '\u2014' },
                  { label:'Blood group', value: profile.bloodGroup || '\u2014' },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:13 }}>
                    <span style={{ color:'#9a9a96', fontWeight:600 }}>{label}</span>
                    <span style={{ color:'#1a1a18', fontWeight:600, maxWidth:200, textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{value}</span>
                  </div>
                ))}
              </div>
              {error && <div style={{ fontSize:12, color:'#993C1D', marginBottom:10, padding:'8px 12px', background:'#FAECE7', borderRadius:10, width:'100%', textAlign:'center' }}>{error}</div>}
            </div>

          </div>
        </div>

        {/* FOOTER */}
        <div style={{ padding:'0.875rem 1.1rem calc(0.875rem + env(safe-area-inset-bottom,0px))', borderTop:'1px solid rgba(0,0,0,0.06)', display:'flex', gap:8, background:'#fff', flexShrink:0 }}>
          {step < TOTAL - 1 ? (
            <>
              {step > 0 && (
                <button onClick={prev} style={{ ...S.btn, padding:'11px 16px' }}>
                  <SVG.back />
                </button>
              )}
              <button onClick={next} disabled={!canNext}
                style={{ ...S.btn, ...S.btnP, flex:1, justifyContent:'center', padding:'11px', fontSize:14, fontWeight:700, gap:6, opacity:canNext?1:0.45 }}>
                {step === 0 ? 'Get started' : 'Continue'} <SVG.fwd />
              </button>
            </>
          ) : (
            <button onClick={handleFinish} disabled={saving}
              style={{ ...S.btn, ...S.btnP, flex:1, justifyContent:'center', padding:'12px', fontSize:14, fontWeight:700, opacity:saving?0.6:1 }}>
              {saving ? 'Saving\u2026' : 'Start exploring'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
