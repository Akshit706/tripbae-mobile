import { useState, useRef, Fragment } from 'react';
import { updateUserProfile, imagekitAuth } from '../../api';
import lumiImg from '../../assets/Lumi4_bgless.png';

/* ── Brand ─────────────────────────────────────────── */
const AC = '#FF6A00';

/* ── Data ───────────────────────────────────────────── */
const GENDER_OPTIONS = [
  { id: 'male',              label: 'Male' },
  { id: 'female',            label: 'Female' },
  { id: 'non-binary',        label: 'Non-binary' },
  { id: 'prefer-not-to-say', label: 'Prefer not to say' },
];
const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'UAE', 'Singapore',
  'Germany', 'France', 'Japan', 'Thailand', 'Indonesia', 'Malaysia', 'Philippines',
  'Bangladesh', 'Pakistan', 'Nepal', 'Sri Lanka', 'Bhutan', 'Maldives',
  'Italy', 'Spain', 'Portugal', 'Netherlands', 'Belgium', 'Switzerland', 'Austria',
  'Sweden', 'Norway', 'Denmark', 'Finland', 'New Zealand', 'South Africa', 'Nigeria',
  'Kenya', 'Brazil', 'Mexico', 'Argentina', 'Turkey', 'Egypt', 'Saudi Arabia', 'Qatar',
  'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Israel', 'South Korea', 'China', 'Vietnam',
  'Cambodia', 'Myanmar', 'Laos', 'Other',
];

const TOTAL = 6;
const DOTS  = TOTAL;

/* ── Step metadata ───────────────────────────────────── */
const stepMeta = [
  {
    title: "Let's get to know you!",
    sub:   '',
  },
  {
    title: 'Show me your best face',
    sub:   "Don't be shy — even a passport photo works. Your travel crew needs to know who's arriving.",
  },
  {
    title: 'Tell me about you',
    sub:   "I promise this isn't for an alien database. It just helps me plan the perfect trip.",
  },
  {
    title: 'Where do you call home?',
    sub:   "Home is where you recharge before the next adventure. Let's log yours.",
  },
  {
    title: 'How can I reach you?',
    sub:   "Last step of the boring stuff, I promise. Then we get to the fun part.",
  },
  {
    title: "You're all set",
    sub:   "Told you it'd be quick. Now let's go plan something incredible.",
  },
];

/* ── Helpers ─────────────────────────────────────────── */
function fmtDOB(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

function getAgeQuip(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const age   = Math.floor((Date.now() - birth) / (365.25 * 24 * 3600 * 1000));
  if (age < 22)  return `${age} years old — a Gen Z globetrotter. The world had better watch out.`;
  if (age < 30)  return `${age} — your prime travel years are happening RIGHT NOW. Let's not waste them.`;
  if (age < 40)  return `Millennial confirmed. Bet you have a 37-destination bucket list on your phone.`;
  if (age < 50)  return `Gen X energy — you found travel before Instagram made it a personality type.`;
  return `Experience and wanderlust. The best combination in the business.`;
}

/* ── Inline SVGs ─────────────────────────────────────── */
const IC = {
  back:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
  fwd:     () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  user:    (c = '#ccc') => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  userLg:  (c = 'rgba(255,106,0,0.4)') => <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  camera:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  cal:     (c = '#ccc') => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  pin:     (c = '#ccc') => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  globe:   (c = '#ccc') => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  mail:    (c = '#ccc') => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  phone:   (c = '#ccc') => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.89-.89a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  lock:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  edit:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={AC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  sparkle: () => <svg width="10" height="10" viewBox="0 0 24 24" fill={AC}><path d="M12 2L14 9.5H22L15.5 14L17.5 21.5L12 17L6.5 21.5L8.5 14L2 9.5H10Z"/></svg>,
  chevron: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
  check:   (c = '#fff') => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  plane:   (c = AC) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>,
  dollar:  (c = AC) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  compass: (c = AC) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
  images:  (c = AC) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
};

/* ── Feature cards (step 0) ───────────────────────────── */
const FEATURES = [
  {
    title: 'Smart Day Planner',
    desc: 'Personalized itineraries, built hour by hour.',
    Icon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={AC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9 16 11 18 15 14"/></svg>,
  },
  {
    title: 'Nearby Essentials',
    desc: 'Hotels, hospitals & rentals found in seconds.',
    Icon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={AC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    title: 'Hidden Gems',
    desc: "Spots most travellers walk right past.",
    Icon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={AC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
  },
  {
    title: 'Budget & Support',
    desc: "Track every expense. I'm here 24/7.",
    Icon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={AC} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
];

/* ── Step Progress Dots ───────────────────────────────── */
function StepDots({ step }) {
  const filled = Math.min(step + 1, DOTS);
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {Array.from({ length: DOTS }, (_, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <div style={{ width: 12, height: 2, background: i < filled ? AC : '#E5E2DC', borderRadius: 2, transition: 'background .3s' }} />
          )}
          <div style={{
            width:  i === filled - 1 ? 10 : 8,
            height: i === filled - 1 ? 10 : 8,
            borderRadius: '50%',
            background: i < filled ? AC : '#E5E2DC',
            transition: 'all .3s ease',
            flexShrink: 0,
          }} />
        </Fragment>
      ))}
    </div>
  );
}

/* ── Orange CTA Button ───────────────────────────────── */
function OrangeBtn({ onClick, disabled, children, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        width: '100%', padding: '15px 20px', borderRadius: 50, border: 'none',
        background: disabled ? '#EDEBE5' : `linear-gradient(135deg,${AC} 0%,#FF8C3A 100%)`,
        color: disabled ? '#bbb' : '#fff',
        fontSize: 14.5, fontWeight: 800,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: "'DM Sans',system-ui,sans-serif",
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: disabled ? 'none' : '0 4px 20px rgba(255,106,0,0.3)',
        transition: 'all .18s', letterSpacing: 0.2,
        ...style,
      }}>
      {children}
    </button>
  );
}

/* ── Field label ─────────────────────────────────────── */
const Label = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 700, color: '#888', marginBottom: 7, letterSpacing: 0.8, textTransform: 'uppercase' }}>{children}</div>
);

/* ── Input wrapper with left icon ────────────────────── */
function IconInput({ icon, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}>{icon}</span>
      <input
        {...props}
        style={{
          width: '100%', boxSizing: 'border-box',
          border: '1.5px solid #EBE8E2', borderRadius: 14,
          padding: '13px 16px 13px 42px',
          fontSize: 14, color: '#1a1a18',
          fontFamily: "'DM Sans',system-ui,sans-serif",
          background: '#fff', outline: 'none',
          transition: 'border-color .18s, box-shadow .18s',
          ...(props.style || {}),
        }}
        onFocus={e => { e.target.style.borderColor = AC; e.target.style.boxShadow = `0 0 0 3px rgba(255,106,0,0.1)`; }}
        onBlur={e  => { e.target.style.borderColor = '#EBE8E2'; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

/* ── Select with left icon ───────────────────────────── */
function IconSelect({ icon, children, value, onChange }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none', zIndex: 1 }}>{icon}</span>
      <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}><IC.chevron /></span>
      <select value={value} onChange={onChange}
        style={{
          width: '100%', boxSizing: 'border-box',
          border: '1.5px solid #EBE8E2', borderRadius: 14,
          padding: '13px 42px 13px 42px',
          fontSize: 14, color: value ? '#1a1a18' : '#C8C5BC',
          fontFamily: "'DM Sans',system-ui,sans-serif",
          background: '#fff', outline: 'none', cursor: 'pointer',
          WebkitAppearance: 'none', appearance: 'none',
          transition: 'border-color .18s, box-shadow .18s',
        }}>
        {children}
      </select>
    </div>
  );
}

/* ── Lumi quote — plain text, no box ───────────────── */
function LumiQuote({ text }) {
  if (!text) return null;
  return (
    <p style={{ margin: '0 0 22px', fontSize: 13, color: '#999', lineHeight: 1.7, fontStyle: 'italic' }}>{text}</p>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN WIZARD
══════════════════════════════════════════════════════ */
export default function UserProfileWizard({ userName, onDone }) {
  const [step, setStep]       = useState(0);
  const [saving, setSaving]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState('');
  const fileRef               = useRef(null);

  const [profile, setProfile] = useState({
    photoUrl:          '',
    displayName:       userName || '',
    dateOfBirth:       '',
    gender:            '',
    hometown:          '',
    country:           'India',
    email:             '',
    phone:             '',
    emergencyName:     '',
    emergencyPhone:    '',
    emergencyRelation: '',
    bloodGroup:        '',
    medicalNotes:      '',
  });

  const set  = (key, val) => setProfile(p => ({ ...p, [key]: val }));
  const next = () => setStep(s => Math.min(TOTAL - 1, s + 1));
  const prev = () => setStep(s => Math.max(0, s - 1));

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      // Show preview immediately
      set('photoUrl', dataUrl);
      // Upload to ImageKit
      try {
        const auth = await imagekitAuth();
        const blob = await (await fetch(dataUrl)).blob();
        const safeFile = (file.name || 'avatar.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `avatar_${Date.now()}_${safeFile}`;
        const form = new FormData();
        form.append('file', blob, fileName);
        form.append('fileName', fileName);
        form.append('folder', '/tb-avatars');
        form.append('useUniqueFileName', 'false');
        form.append('publicKey',  auth.publicKey);
        form.append('signature',  auth.signature);
        form.append('expire',     String(auth.expire));
        form.append('token',      auth.token);
        const res  = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: form });
        const data = await res.json();
        if (data.url) {
          set('photoUrl', data.url + '?tr=w-300,h-300,fo-face,q-85');
        }
      } catch {
        // IK upload failed — base64 preview stays, which is fine
      }
      setUploading(false);
    };
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

  const canNext = [true, !!profile.photoUrl && !uploading, !!profile.gender, !!profile.country, true, true][step];

  const ageQuip = getAgeQuip(profile.dateOfBirth);

  const summaryRows = [
    { Icon: () => IC.user('#888'),    value: profile.displayName || userName || '—' },
    { Icon: () => IC.cal('#888'),     value: fmtDOB(profile.dateOfBirth) || '—' },
    { Icon: () => IC.user('#888'),    value: profile.gender ? GENDER_OPTIONS.find(g => g.id === profile.gender)?.label : '—' },
    { Icon: () => IC.pin('#888'),     value: profile.hometown || '—' },
    { Icon: () => IC.globe('#888'),   value: profile.country || '—' },
    { Icon: () => IC.mail('#888'),    value: profile.email || '—' },
    { Icon: () => IC.phone('#888'),   value: profile.phone ? `+91 ${profile.phone}` : '—' },
  ];

  const SW = `${100 / TOTAL}%`;
  const first = (userName || 'Traveller').split(' ')[0];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 490, height: 'min(640px,92svh)', background: '#fff', borderRadius: 26, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)' }}>
        <style>{`
          @keyframes lumiGlow { 0%,100% { opacity:0.5; transform:scale(1); } 50% { opacity:1; transform:scale(1.07); } }
          @keyframes lumiFlt1 { 0%,100% { opacity:0.6; transform:translateY(0) scale(1); } 50% { opacity:1; transform:translateY(-5px) scale(1.15); } }
          @keyframes lumiFlt2 { 0%,100% { opacity:0.3; transform:translateY(0); } 50% { opacity:0.65; transform:translateY(-4px); } }
          @keyframes lumiFlt3 { 0%,100% { opacity:0.4; transform:translateY(0); } 50% { opacity:0.8; transform:translateY(-3px); } }
          .lumi-glow { animation:lumiGlow 4s ease-in-out infinite; }
          .lumi-sp1  { animation:lumiFlt1 2.8s ease-in-out infinite; }
          .lumi-sp2  { animation:lumiFlt2 2.8s ease-in-out 0.9s infinite; }
          .lumi-sp3  { animation:lumiFlt3 2.8s ease-in-out 1.7s infinite; }
          .wz-field {
            width:100%; box-sizing:border-box;
            border:1.5px solid #EBE8E2; border-radius:14px;
            padding:13px 16px; font-size:14px; color:#1a1a18;
            font-family:'DM Sans',system-ui,sans-serif;
            background:#fff; outline:none;
            transition:border-color .18s,box-shadow .18s;
            -webkit-appearance:none; appearance:none;
          }
          .wz-field:focus  { border-color:${AC}; box-shadow:0 0 0 3px rgba(255,106,0,0.1); }
          .wz-field::placeholder { color:#C8C5BC; }
          .or-btn { transition:transform .15s,box-shadow .15s; }
          .or-btn:hover:not(:disabled)  { transform:translateY(-1px); box-shadow:0 8px 28px rgba(255,106,0,0.38) !important; }
          .or-btn:active:not(:disabled) { transform:scale(0.98); }
        `}</style>

        {/* ── TOP BAR ── */}
        <div style={{ height: 54, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 18px', position: 'relative', borderBottom: step === 0 ? 'none' : '1px solid #F0EDE8' }}>
          {step > 0 && step < TOTAL - 1 && (
            <button onClick={prev} style={{ position: 'absolute', left: 16, width: 34, height: 34, borderRadius: 11, border: '1.5px solid #EBE8E2', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#444', transition: 'border-color .15s, background .15s' }}>
              <IC.back />
            </button>
          )}
          <StepDots step={step} />
        </div>

        {/* ── SLIDE RAIL ── */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div style={{ display: 'flex', height: '100%', width: `${TOTAL * 100}%`, transform: `translateX(calc(${-step} * ${SW}))`, transition: 'transform .38s cubic-bezier(.16,.84,.24,1.04)' }}>

            {/* ━━ STEP 0: Lumi intro ━━ */}
            <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', background: '#fff' }}>

              {/* Hero: Lumi + text side by side */}
              <div style={{ display: 'flex', padding: '1rem 1.25rem 0.75rem', gap: 4, alignItems: 'flex-end' }}>

                {/* Lumi with warm glow + animated sparkles */}
                <div style={{ flexShrink: 0, width: 148, position: 'relative' }}>
                  <div className="lumi-glow" style={{ position: 'absolute', top: '10%', left: '5%', width: '90%', height: '82%', background: 'radial-gradient(ellipse at 50% 55%, rgba(255,200,140,0.28) 0%, transparent 65%)', borderRadius: '50%', zIndex: 0 }} />
                  <svg className="lumi-sp1" style={{ position: 'absolute', top: '10%', right: '6%', zIndex: 2 }} width="12" height="12" viewBox="0 0 24 24" fill={AC}><path d="M12 2L13.5 10.5H22L15 15L17 22.5L12 18.5L7 22.5L9 15L2 10.5H10.5Z"/></svg>
                  <svg className="lumi-sp2" style={{ position: 'absolute', top: '38%', left: '0%', zIndex: 2 }} width="8" height="8" viewBox="0 0 24 24" fill={AC}><path d="M12 2L13.5 10.5H22L15 15L17 22.5L12 18.5L7 22.5L9 15L2 10.5H10.5Z"/></svg>
                  <svg className="lumi-sp3" style={{ position: 'absolute', bottom: '22%', right: '10%', zIndex: 2 }} width="9" height="9" viewBox="0 0 24 24" fill={AC}><path d="M12 2L13.5 10.5H22L15 15L17 22.5L12 18.5L7 22.5L9 15L2 10.5H10.5Z"/></svg>
                  <svg style={{ position: 'absolute', top: '4%', left: '-4%', opacity: 0.22, transform: 'rotate(-25deg)', zIndex: 2 }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={AC} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
                  <svg style={{ position: 'absolute', bottom: '8%', left: '2%', opacity: 0.2, zIndex: 2 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={AC} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <img src={lumiImg} alt="Lumi" style={{ width: '100%', position: 'relative', zIndex: 1, display: 'block' }} />
                </div>

                {/* Intro text */}
                <div style={{ flex: 1, paddingBottom: '0.5rem' }}>
                  <div style={{ fontSize: 11, color: '#ccc', fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>Let&apos;s get to know each other</div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 900, color: '#111', lineHeight: 1.2, marginBottom: 2 }}>Hey {first}!</div>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 900, color: AC, lineHeight: 1.05, marginBottom: 8 }}>I&apos;m Lumi.</div>
                  <div style={{ fontSize: 12, color: '#888', lineHeight: 1.65, marginBottom: 5 }}>Your digital travel companion, planner, and memory keeper.</div>
                  <div style={{ fontSize: 12, color: '#555', lineHeight: 1.65 }}>From your very first idea to when you get back home — <strong style={{ color: '#1a1a18', fontWeight: 800 }}>I&apos;ve got you.</strong></div>
                </div>
              </div>

              {/* Feature cards 2×2 */}
              <div style={{ padding: '0 1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {FEATURES.map(({ Icon, title, desc }) => (
                  <div key={title} style={{ background: '#FAFAF8', borderRadius: 14, padding: '11px 10px', border: '1px solid #EEEBE5', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <div style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 9, background: '#FFF2E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#222', lineHeight: 1.25, marginBottom: 3 }}>{title}</div>
                      <div style={{ fontSize: 10.5, color: '#999', lineHeight: 1.5 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ height: '0.9rem' }} />
            </div>

            {/* ━━ STEP 1: Photo ━━ */}
            <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '1.75rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

              <div style={{ alignSelf: 'flex-start', width: '100%', marginBottom: 6 }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 900, color: '#111', lineHeight: 1.2, marginBottom: 18 }}>
                  {stepMeta[1].title}
                </div>
                <LumiQuote text={stepMeta[1].sub} />
              </div>

              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />

              <div style={{ position: 'relative', marginBottom: 8, cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                <div style={{ width: 140, height: 140, borderRadius: '50%', border: `2px dashed ${AC}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', background: '#FFF8F5' }}>
                  {profile.photoUrl
                    ? <img src={profile.photoUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : IC.userLg()}
                </div>
                <div style={{ position: 'absolute', bottom: 6, right: 6, width: 34, height: 34, borderRadius: '50%', background: `linear-gradient(135deg,${AC},#FF8C3A)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(255,106,0,0.38)' }}>
                  <IC.camera />
                </div>
              </div>

              {uploading && (
                <div style={{ fontSize: 13, color: AC, fontWeight: 600, marginTop: 4 }}>Uploading photo…</div>
              )}
              {!profile.photoUrl && !uploading && (
                <div style={{ fontSize: 12, color: '#999', marginTop: 6, textAlign: 'center' }}>
                  A profile photo is required to continue
                </div>
              )}
              {profile.photoUrl && !uploading && (
                <div style={{ fontSize: 12, color: '#0F6E56', marginTop: 6, fontWeight: 600 }}>✓ Photo uploaded</div>
              )}
            </div>

            {/* ━━ STEP 2: Basic details ━━ */}
            <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '1.75rem 1.5rem 1.5rem' }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 900, color: '#111', lineHeight: 1.2, marginBottom: 18 }}>
                {stepMeta[2].title}
              </div>

              {/* Dynamic age quip or default Lumi quote */}
              <LumiQuote text={ageQuip || stepMeta[2].sub} />

              <div style={{ marginBottom: 16 }}>
                <Label>Full Name</Label>
                <IconInput icon={IC.user()} value={profile.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Enter your name" />
              </div>

              <div style={{ marginBottom: 16 }}>
                <Label>Date of Birth</Label>
                <IconInput icon={IC.cal()} type="date" value={profile.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} max={new Date().toISOString().split('T')[0]} />
              </div>

              <div>
                <Label>Gender</Label>
                <IconSelect icon={IC.user()} value={profile.gender} onChange={e => set('gender', e.target.value)}>
                  <option value="">Select gender</option>
                  {GENDER_OPTIONS.map(({ id, label }) => (
                    <option key={id} value={id}>{label}</option>
                  ))}
                </IconSelect>
              </div>
            </div>

            {/* ━━ STEP 3: Location ━━ */}
            <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '1.75rem 1.5rem 1.5rem' }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 900, color: '#111', lineHeight: 1.2, marginBottom: 18 }}>
                {stepMeta[3].title}
              </div>
              <LumiQuote text={stepMeta[3].sub} />

              <div style={{ marginBottom: 16 }}>
                <Label>Hometown</Label>
                <IconInput icon={IC.pin()} value={profile.hometown} onChange={e => set('hometown', e.target.value)} placeholder="e.g. Mumbai, Bengaluru, Delhi" />
              </div>

              <div>
                <Label>Country</Label>
                <IconSelect icon={IC.globe()} value={profile.country} onChange={e => set('country', e.target.value)}>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </IconSelect>
              </div>
            </div>

            {/* ━━ STEP 4: Contact ━━ */}
            <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '1.75rem 1.5rem 1.5rem' }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 900, color: '#111', lineHeight: 1.2, marginBottom: 18 }}>
                {stepMeta[4].title}
              </div>
              <LumiQuote text={stepMeta[4].sub} />

              <div style={{ marginBottom: 16 }}>
                <Label>Email <span style={{ color: '#ccc', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></Label>
                <IconInput icon={IC.mail()} type="email" value={profile.email} onChange={e => set('email', e.target.value)} placeholder="hello@you.com" />
              </div>

              <div style={{ marginBottom: 18 }}>
                <Label>Phone <span style={{ color: '#ccc', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></Label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, border: '1.5px solid #EBE8E2', borderRadius: 14, padding: '13px 12px', background: '#FAFAF8', flexShrink: 0 }}>
                    <IC.chevron />
                    <span style={{ fontSize: 14, color: '#555', fontWeight: 700 }}>+91</span>
                  </div>
                  <input type="tel" value={profile.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone number" className="wz-field" style={{ flex: 1 }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '11px 14px', background: '#FAFAF8', borderRadius: 12, border: '1px solid #EDEBE6' }}>
                {IC.lock()}
                <span style={{ fontSize: 12, color: '#aaa', lineHeight: 1.55 }}>Your details are private and encrypted. We never share them.</span>
              </div>
            </div>

            {/* ━━ STEP 5: Done ━━ */}
            <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '1.75rem 1.5rem 1.5rem' }}>

              {/* Done icon */}
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg,${AC},#FF8C3A)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: '0 8px 24px rgba(255,106,0,0.28)' }}>
                {IC.check()}
              </div>

              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 900, color: '#111', lineHeight: 1.2, marginBottom: 18 }}>
                {stepMeta[5].title}
              </div>
              <LumiQuote text={stepMeta[5].sub} />

              {/* Profile summary card */}
              <div style={{ background: '#fff', border: '1.5px solid #EBE8E2', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #F0EDE8' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#222', letterSpacing: 0.2 }}>Profile Summary</span>
                  <button onClick={() => setStep(2)} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: AC, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                    Edit <IC.edit />
                  </button>
                </div>
                {summaryRows.map(({ Icon, value }, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px', borderBottom: idx < summaryRows.length - 1 ? '1px solid #F5F3EF' : 'none' }}>
                    <span style={{ flexShrink: 0, display: 'flex', opacity: 0.7 }}><Icon /></span>
                    <span style={{ fontSize: 13, color: value === '—' ? '#ccc' : '#333', fontWeight: value === '—' ? 400 : 500 }}>{value}</span>
                  </div>
                ))}
              </div>

              {error && <div style={{ fontSize: 12, color: '#993C1D', marginTop: 14, padding: '10px 14px', background: '#FAECE7', borderRadius: 10, textAlign: 'center' }}>{error}</div>}
            </div>

          </div>
        </div>

        {/* ── BOTTOM CTA ── */}
        <div style={{ flexShrink: 0, padding: `1rem 1.25rem calc(1rem + env(safe-area-inset-bottom,0px))`, background: '#fff', borderTop: '1px solid #F0EDE8' }}>
          {step === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, alignItems: 'center' }}>
              <OrangeBtn className="or-btn" onClick={() => profile.photoUrl && !uploading ? next() : fileRef.current?.click()} disabled={uploading}>
                {uploading
                  ? 'Uploading…'
                  : profile.photoUrl
                    ? <><span>Continue</span><IC.fwd /></>
                    : 'Upload Photo'}
              </OrangeBtn>
            </div>
          ) : step === 5 ? (
            <OrangeBtn className="or-btn" onClick={handleFinish} disabled={saving}>
              {saving ? 'Saving…' : <><span>Start Exploring</span>{IC.plane('#fff')}</>}
            </OrangeBtn>
          ) : (
            <OrangeBtn className="or-btn" onClick={next} disabled={!canNext}>
              {step === 0 ? <><span>Let&apos;s Go</span><IC.fwd /></> : <><span>Continue</span><IC.fwd /></>}
            </OrangeBtn>
          )}
        </div>

      </div>
    </div>
  );
}
