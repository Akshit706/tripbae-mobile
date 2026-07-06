import { useState, useRef, Fragment } from 'react';
import { updateUserProfile } from '../../api';
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

const TOTAL   = 6; // steps 0‑5
const DOTS    = TOTAL; // one dot per step

const stepMeta = [
  { title: "Let's get to know you!",  sub: 'Help us personalise your travel experience and recommend the best adventures for you.' },
  { title: 'Add your photo',          sub: 'A picture helps your travel crew recognise you.' },
  { title: 'Basic details',           sub: 'These basics help us tailor your experience.' },
  { title: 'Where do you call home?', sub: 'This helps us suggest trips that are closer to you.' },
  { title: 'How can we reach you?',   sub: 'So we can keep you updated about your trips and exciting offers.' },
  { title: "You're all set! 🎉",      sub: "Here's what we've got. You can edit anytime later." },
];

/* ── Helpers ─────────────────────────────────────────── */
function fmtDOB(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

/* ── Inline SVGs ─────────────────────────────────────── */
const IC = {
  back:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
  close:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  fwd:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  user:    (c = '#aaa') => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  userLg:  (c = 'rgba(255,106,0,0.45)') => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  camera:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  cal:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  calFill: (c) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  pin:     (c = '#ccc') => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  globe:   (c = '#ccc') => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  mail:    (c = '#ccc') => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  phone:   (c = '#ccc') => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.89-.89a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  lock:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  edit:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={AC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  check:   (c) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  star:    () => <svg width="10" height="10" viewBox="0 0 24 24" fill={AC}><path d="M12 2L14 9.5H22L15.5 14L17.5 21.5L12 17L6.5 21.5L8.5 14L2 9.5H10Z"/></svg>,
  chevron: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
  plane:   () => (
    <svg width="44" height="44" viewBox="0 0 60 60" fill="none">
      <path d="M52 8L28 32" stroke={AC} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M52 8L36 52L28 32L8 24L52 8Z" stroke={AC} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

/* ── Step Progress Dots ───────────────────────────────── */
function StepDots({ step }) {
  // step 0 (welcome) → 1 dot filled; step 4 (contact) → 4 dots; done → 4
  const filled = Math.min(step + 1, DOTS);
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {Array.from({ length: DOTS }, (_, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <div style={{ width: 14, height: 2.5, background: i < filled ? AC : '#E5E2DC', borderRadius: 2, transition: 'background .3s' }} />
          )}
          <div style={{
            width:  i === filled - 1 ? 11 : 9,
            height: i === filled - 1 ? 11 : 9,
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

/* ── Orange Button ───────────────────────────────────── */
function OrangeBtn({ onClick, disabled, children, style = {} }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        width: '100%', padding: '16px', borderRadius: 50, border: 'none',
        background: disabled ? '#E8E5DE' : `linear-gradient(135deg,${AC} 0%,#FF8C3A 100%)`,
        color: disabled ? '#bbb' : '#fff',
        fontSize: 15, fontWeight: 800,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: "'DM Sans',system-ui,sans-serif",
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: disabled ? 'none' : '0 4px 20px rgba(255,106,0,0.32)',
        transition: 'all .18s',
        letterSpacing: 0.2,
        ...style,
      }}>
      {children}
    </button>
  );
}

/* ── Field label ─────────────────────────────────────── */
const Label = ({ children }) => (
  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#555', marginBottom: 7, letterSpacing: 0.1 }}>{children}</div>
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
          border: '1.5px solid #E8E5DE',
          borderRadius: 14, padding: '13px 16px 13px 42px',
          fontSize: 14, color: '#1a1a18',
          fontFamily: "'DM Sans',system-ui,sans-serif",
          background: '#fff', outline: 'none',
          transition: 'border-color .18s, box-shadow .18s',
          ...(props.style || {}),
        }}
        onFocus={e => { e.target.style.borderColor = AC; e.target.style.boxShadow = `0 0 0 3px rgba(255,106,0,0.12)`; }}
        onBlur={e  => { e.target.style.borderColor = '#E8E5DE'; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

/* ── Select wrapper with left icon ───────────────────── */
function IconSelect({ icon, children, value, onChange }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none', zIndex: 1 }}>{icon}</span>
      <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}><IC.chevron /></span>
      <select value={value} onChange={onChange}
        style={{
          width: '100%', boxSizing: 'border-box',
          border: '1.5px solid #E8E5DE',
          borderRadius: 14, padding: '13px 42px 13px 42px',
          fontSize: 14, color: '#1a1a18',
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

/* ── Radio row ───────────────────────────────────────── */
function RadioRow({ label, checked, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px', borderRadius: 14,
        border: `1.5px solid ${checked ? AC : '#E8E5DE'}`,
        background: checked ? '#FFF5EE' : '#fff',
        cursor: 'pointer', textAlign: 'left',
        transition: 'border-color .18s, background .18s',
      }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${checked ? AC : '#D0CEC8'}`,
        background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color .18s',
      }}>
        {checked && <div style={{ width: 10, height: 10, borderRadius: '50%', background: AC }} />}
      </div>
      <span style={{ fontSize: 14.5, fontWeight: checked ? 700 : 500, color: checked ? '#1a1a18' : '#555' }}>{label}</span>
    </button>
  );
}

/* ══════════════════════════════════════════════════════
   LUMI INTRO CARD  (reference.png style)
══════════════════════════════════════════════════════ */
function LumiIntro({ userName, onStart }) {
  const first = (userName || 'Traveller').split(' ')[0];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(15,15,15,0.55)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <style>{`
        @keyframes liIn  { from { opacity:0; transform:scale(0.94) translateY(18px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes liFlt { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
        @keyframes liFadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
        .li-card   { animation:liIn .4s cubic-bezier(.16,.84,.24,1) both; }
        .li-lumi   { animation:liFlt 5s ease-in-out infinite; }
        .li-a1 { animation:liFadeUp .4s ease 0.05s both; }
        .li-a2 { animation:liFadeUp .4s ease 0.10s both; }
        .li-a3 { animation:liFadeUp .4s ease 0.15s both; }
        .li-a4 { animation:liFadeUp .4s ease 0.20s both; }
        .li-a5 { animation:liFadeUp .4s ease 0.26s both; }
        .li-a6 { animation:liFadeUp .4s ease 0.32s both; }
        .li-btn-or { transition:transform .15s,box-shadow .15s; }
        .li-btn-or:hover  { transform:translateY(-2px); box-shadow:0 8px 28px rgba(255,106,0,0.4) !important; }
        .li-btn-or:active { transform:scale(0.97); }
      `}</style>

      <div className="li-card" style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 26, overflow: 'hidden', boxShadow: '0 28px 80px rgba(0,0,0,0.22)', position: 'relative' }}>

        {/* Close / skip */}
        <button onClick={onStart} style={{ position: 'absolute', top: 14, right: 14, width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.06)', color: '#777', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5, transition: 'background .15s' }}>
          <IC.close />
        </button>

        {/* Main row */}
        <div style={{ display: 'flex', minHeight: 320 }}>

          {/* LEFT – Lumi character */}
          <div style={{ width: '40%', flexShrink: 0, background: 'linear-gradient(170deg,#FFF8F3 0%,#FFF0E6 100%)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden', position: 'relative', padding: '0 4px 0 0' }}>
            {/* paper-plane accent */}
            <div style={{ position: 'absolute', bottom: 52, left: 14, opacity: 0.4, transform: 'rotate(-18deg)' }}>
              <IC.plane />
            </div>
            {/* subtle arc */}
            <div style={{ position: 'absolute', top: '30%', right: -30, width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,106,0,0.1) 0%,transparent 70%)', pointerEvents: 'none' }} />
            <img src={lumiImg} alt="Lumi" className="li-lumi" style={{ width: '100%', maxHeight: 310, objectFit: 'contain', objectPosition: 'bottom center', position: 'relative', zIndex: 1, filter: 'drop-shadow(0 8px 18px rgba(255,106,0,0.18))' }} />
          </div>

          {/* RIGHT – content */}
          <div style={{ flex: 1, padding: '1.6rem 1.6rem 1.2rem 0.8rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

            {/* Badge */}
            <div className="li-a1" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#FFF2E8', border: '1px solid rgba(255,106,0,0.22)', borderRadius: 50, padding: '4px 11px', marginBottom: 14, alignSelf: 'flex-start' }}>
              <IC.star />
              <span style={{ fontSize: 9.5, fontWeight: 800, color: AC, letterSpacing: 1.6, textTransform: 'uppercase' }}>AI Travel Companion</span>
            </div>

            {/* Greeting */}
            <div className="li-a2" style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color: '#111', lineHeight: 1.25, marginBottom: 2 }}>
              Hey {first}! 👋
            </div>
            {/* I'm Lumi */}
            <div className="li-a3" style={{ fontFamily: "'Sora',sans-serif", fontSize: 30, fontWeight: 900, color: AC, lineHeight: 1.1, marginBottom: 12 }}>
              I&apos;m Lumi.
            </div>

            {/* Description */}
            <div className="li-a4" style={{ fontSize: 13, color: '#777', lineHeight: 1.75, marginBottom: 16 }}>
              Your digital bae ✨ — I&apos;ll be by your side through every adventure, every destination, every memory.
            </div>

            {/* 2×2 chips */}
            <div className="li-a5" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                { icon: '✈️', label: 'Smart trip planning' },
                { icon: '💰', label: 'Expense splitting' },
                { icon: '🗺️', label: 'Local discoveries' },
                { icon: '📸', label: 'Photo memories' },
              ].map(({ icon, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F7F5F2', borderRadius: 9, padding: '6px 9px', fontSize: 11.5, fontWeight: 600, color: '#444' }}>
                  <span style={{ flexShrink: 0 }}>{icon}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom – full-width CTA */}
        <div className="li-a6" style={{ padding: '1rem 1.5rem 1.5rem' }}>
          <button onClick={onStart} className="li-btn-or"
            style={{ width: '100%', padding: '15px', borderRadius: 50, border: 'none', background: `linear-gradient(135deg,${AC} 0%,#FF8C3A 100%)`, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: "'DM Sans',system-ui,sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: 0.2, boxShadow: '0 4px 22px rgba(255,106,0,0.35)' }}>
            Let&apos;s Get Started <IC.fwd />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   PROFILE WIZARD  (intro.png style – full screen, orange/white)
══════════════════════════════════════════════════════ */
export default function UserProfileWizard({ userName, onDone }) {
  const [step, setStep]         = useState(0);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const fileRef                 = useRef(null);

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
    const reader = new FileReader();
    reader.onload = ev => set('photoUrl', ev.target.result);
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
    true,             // welcome
    true,             // photo (optional)
    !!profile.gender, // basic (need gender)
    !!profile.country,// location (need country)
    true,             // contact (optional)
    true,             // done
  ][step];

  const btnLabel = step === 0 ? <>Let&apos;s Go &nbsp;<IC.fwd /></> :
                   step === 5 ? <>Start Exploring ✈️</> :
                                <>Continue &nbsp;<IC.fwd /></>;

  /* Summary items for done screen */
  const summaryRows = [
    { icon: IC.user('#888'),    value: profile.displayName || userName || '—' },
    { icon: IC.calFill('#888'), value: fmtDOB(profile.dateOfBirth) || '—' },
    { icon: IC.user('#888'),    value: profile.gender || '—' },
    { icon: IC.pin('#888'),     value: profile.hometown || '—' },
    { icon: IC.globe('#888'),   value: profile.country || '—' },
    { icon: IC.mail('#888'),    value: profile.email || '—' },
    { icon: IC.phone('#888'),   value: profile.phone ? `+91 ${profile.phone}` : '—' },
  ];

  const SW = `${100 / TOTAL}%`;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 490, height: 'min(640px,92svh)', background: '#fff', borderRadius: 26, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.06)' }}>
      <style>{`
        @keyframes wzIn { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
        .wz-screen { animation:wzIn .35s ease both; }
        .wz-field-base {
          width:100%; box-sizing:border-box;
          border:1.5px solid #E8E5DE; border-radius:14px;
          padding:13px 16px; font-size:14px; color:#1a1a18;
          font-family:'DM Sans',system-ui,sans-serif;
          background:#fff; outline:none;
          transition:border-color .18s,box-shadow .18s;
          -webkit-appearance:none; appearance:none;
        }
        .wz-field-base:focus { border-color:${AC}; box-shadow:0 0 0 3px rgba(255,106,0,0.12); }
        .wz-field-base::placeholder { color:#C8C5BC; }
        .wz-radio { transition:border-color .18s,background .18s; }
        .wz-radio:hover { border-color:${AC}; }
        .or-btn-hover { transition:transform .15s,box-shadow .15s,filter .15s; }
        .or-btn-hover:hover:not(:disabled)  { transform:translateY(-1px); box-shadow:0 8px 28px rgba(255,106,0,0.38) !important; }
        .or-btn-hover:active:not(:disabled) { transform:scale(0.98); }
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{ height: 58, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px', position: 'relative', borderBottom: step === 0 ? 'none' : '1px solid #F2F0EC' }}>
        {/* Back */}
        {step > 0 && step < TOTAL - 1 && (
          <button onClick={prev} style={{ position: 'absolute', left: 18, width: 36, height: 36, borderRadius: 12, border: '1.5px solid #E8E5DE', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#444', transition: 'border-color .15s' }}>
            <IC.back />
          </button>
        )}
        {/* Step dots */}
        {step < TOTAL && <StepDots step={step} />}
      </div>

      {/* ── SLIDE RAIL ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: 'flex', height: '100%', width: `${TOTAL * 100}%`, transform: `translateX(calc(${-step} * ${SW}))`, transition: 'transform .38s cubic-bezier(.16,.84,.24,1.04)' }}>

          {/* ── STEP 0: Combined Lumi intro + welcome ── */}
          <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', display: 'flex', overflow: 'hidden' }}>
            {/* Left: Lumi – white bg, static */}
            <div style={{ width: '40%', flexShrink: 0, background: '#fff', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
              <img src={lumiImg} alt="Lumi" style={{ width: '100%', objectFit: 'contain', objectPosition: 'bottom center', display: 'block', userSelect: 'none', pointerEvents: 'none' }} />
            </div>
            {/* Right: intro content */}
            <div style={{ flex: 1, padding: '1.5rem 1.25rem 1.5rem 0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflowY: 'auto' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#FFF2E8', border: '1px solid rgba(255,106,0,0.2)', borderRadius: 50, padding: '4px 10px', marginBottom: 13, alignSelf: 'flex-start' }}>
                <IC.star />
                <span style={{ fontSize: 9, fontWeight: 800, color: AC, letterSpacing: 1.5, textTransform: 'uppercase' }}>AI Travel Companion</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#aaa', marginBottom: 6 }}>Let&apos;s get to know each other 💬</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 900, color: '#111', lineHeight: 1.2, marginBottom: 2 }}>
                Hey {(userName || 'Traveller').split(' ')[0]}! 👋
              </div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 27, fontWeight: 900, color: AC, lineHeight: 1.1, marginBottom: 11 }}>
                I&apos;m Lumi.
              </div>
              <div style={{ fontSize: 12.5, color: '#777', lineHeight: 1.72, marginBottom: 14 }}>
                Your digital bae ✨ — by your side through every adventure, every destination, every memory.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[{icon:'✈️',label:'Smart trips'},{icon:'💰',label:'Expense split'},{icon:'🗺️',label:'Discoveries'},{icon:'📸',label:'Memories'}].map(({icon,label})=>(
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:5, background:'#F7F5F2', borderRadius:8, padding:'6px 8px', fontSize:11, fontWeight:600, color:'#444' }}>
                    <span>{icon}</span><span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── STEP 1: Photo ── */}
          <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '2rem 1.75rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ alignSelf: 'flex-start', width: '100%', marginBottom: 28 }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(24px,5vw,30px)', fontWeight: 900, color: '#111', lineHeight: 1.2, marginBottom: 8 }}>{stepMeta[1].title}</div>
              <div style={{ fontSize: 14, color: '#888', lineHeight: 1.65 }}>{stepMeta[1].sub}</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            {/* Dashed circle */}
            <div style={{ position: 'relative', marginBottom: 10 }} onClick={() => fileRef.current?.click()}>
              <div style={{ width: 148, height: 148, borderRadius: '50%', border: `2.5px dashed ${AC}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: 'pointer', background: '#FFF8F4' }}>
                {profile.photoUrl
                  ? <img src={profile.photoUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : IC.userLg()}
              </div>
              {/* Camera badge */}
              <div style={{ position: 'absolute', bottom: 8, right: 8, width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg,${AC},#FF8C3A)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 12px rgba(255,106,0,0.4)', cursor: 'pointer' }}>
                <IC.camera />
              </div>
            </div>
          </div>

          {/* ── STEP 2: Basic details ── */}
          <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '2rem 1.75rem 1.5rem' }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(22px,5vw,28px)', fontWeight: 900, color: '#111', lineHeight: 1.2, marginBottom: 6 }}>{stepMeta[2].title}</div>
            <div style={{ fontSize: 13.5, color: '#888', marginBottom: 24, lineHeight: 1.6 }}>{stepMeta[2].sub}</div>

            <div style={{ marginBottom: 18 }}>
              <Label>Full Name</Label>
              <IconInput icon={IC.user('#ccc')} value={profile.displayName} onChange={e => set('displayName', e.target.value)} placeholder="Enter your name" />
            </div>

            <div style={{ marginBottom: 18 }}>
              <Label>Date of Birth</Label>
              <IconInput icon={IC.cal()} type="date" value={profile.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} max={new Date().toISOString().split('T')[0]} />
            </div>

            <div>
              <Label>Gender</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {GENDER_OPTIONS.map(({ id, label }) => (
                  <RadioRow key={id} label={label} checked={profile.gender === id} onClick={() => set('gender', id)} />
                ))}
              </div>
            </div>
          </div>

          {/* ── STEP 3: Location ── */}
          <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '2rem 1.75rem 1.5rem' }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(22px,5vw,28px)', fontWeight: 900, color: '#111', lineHeight: 1.2, marginBottom: 6 }}>{stepMeta[3].title}</div>
            <div style={{ fontSize: 13.5, color: '#888', marginBottom: 28, lineHeight: 1.6 }}>{stepMeta[3].sub}</div>

            <div style={{ marginBottom: 18 }}>
              <Label>Hometown</Label>
              <IconInput icon={IC.pin('#ccc')} value={profile.hometown} onChange={e => set('hometown', e.target.value)} placeholder="Enter your hometown" />
            </div>

            <div>
              <Label>Country</Label>
              <IconSelect icon={IC.globe('#ccc')} value={profile.country} onChange={e => set('country', e.target.value)}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </IconSelect>
            </div>
          </div>

          {/* ── STEP 4: Contact ── */}
          <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '2rem 1.75rem 1.5rem' }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(22px,5vw,28px)', fontWeight: 900, color: '#111', lineHeight: 1.2, marginBottom: 6 }}>{stepMeta[4].title}</div>
            <div style={{ fontSize: 13.5, color: '#888', marginBottom: 28, lineHeight: 1.6 }}>{stepMeta[4].sub}</div>

            <div style={{ marginBottom: 18 }}>
              <Label>Email <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></Label>
              <IconInput icon={IC.mail('#ccc')} type="email" value={profile.email} onChange={e => set('email', e.target.value)} placeholder="Enter your email" />
            </div>

            <div style={{ marginBottom: 20 }}>
              <Label>Phone Number <span style={{ color: '#bbb', fontWeight: 400 }}>(optional)</span></Label>
              <div style={{ display: 'flex', gap: 8 }}>
                {/* +91 prefix */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #E8E5DE', borderRadius: 14, padding: '13px 12px', background: '#fff', flexShrink: 0, cursor: 'default' }}>
                  <IC.chevron />
                  <span style={{ fontSize: 14, color: '#444', fontWeight: 600 }}>+91</span>
                </div>
                <input
                  type="tel" value={profile.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="Enter phone number"
                  className="wz-field-base"
                  style={{ flex: 1 }}
                />
              </div>
            </div>

            {/* Privacy note */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '11px 14px', background: '#F9F8F6', borderRadius: 12, border: '1px solid #ECEAE5' }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>{IC.lock()}</span>
              <span style={{ fontSize: 12, color: '#999', lineHeight: 1.55 }}>We respect your privacy. Your details are safe with us.</span>
            </div>
          </div>

          {/* ── STEP 5: Done ── */}
          <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '2rem 1.75rem 1.5rem' }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(22px,5vw,28px)', fontWeight: 900, color: '#111', lineHeight: 1.2, marginBottom: 6 }}>{stepMeta[5].title}</div>
            <div style={{ fontSize: 13.5, color: '#888', marginBottom: 22, lineHeight: 1.6 }}>{stepMeta[5].sub}</div>

            {/* Profile summary card */}
            <div style={{ background: '#fff', border: '1.5px solid #E8E5DE', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 18px rgba(0,0,0,0.06)' }}>
              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #F0EDE8' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>Profile Summary</span>
                <button onClick={() => setStep(2)} style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: AC, fontSize: 13, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                  Edit <IC.edit />
                </button>
              </div>
              {/* Rows */}
              {summaryRows.map(({ icon, value }, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: idx < summaryRows.length - 1 ? '1px solid #F5F3EF' : 'none' }}>
                  <span style={{ flexShrink: 0, display: 'flex' }}>{icon}</span>
                  <span style={{ fontSize: 13.5, color: value === '—' ? '#bbb' : '#333', fontWeight: value === '—' ? 400 : 500 }}>{value}</span>
                </div>
              ))}
            </div>

            {error && <div style={{ fontSize: 12.5, color: '#993C1D', marginTop: 14, padding: '10px 14px', background: '#FAECE7', borderRadius: 12, textAlign: 'center' }}>{error}</div>}
          </div>

        </div>
      </div>

      {/* ── BOTTOM BUTTON AREA ── */}
      <div style={{ flexShrink: 0, padding: `1.25rem 1.5rem calc(1.25rem + env(safe-area-inset-bottom,0px))`, background: '#fff', borderTop: '1px solid #F2F0EC' }}>
        {/* Photo step: Upload + Skip layout */}
        {step === 1 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <OrangeBtn onClick={() => { if (profile.photoUrl) { next(); } else { fileRef.current?.click(); } }}>
              {profile.photoUrl ? <>Continue &nbsp;<IC.fwd /></> : 'Upload Photo'}
            </OrangeBtn>
            <button onClick={next} style={{ border: 'none', background: 'none', color: AC, fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '4px 0', fontFamily: "'DM Sans',sans-serif" }}>
              Skip for now
            </button>
          </div>
        ) : step === 5 ? (
          <OrangeBtn onClick={handleFinish} disabled={saving} style={{ boxShadow: saving ? 'none' : '0 4px 22px rgba(255,106,0,0.35)' }}>
            {saving ? 'Saving…' : <>{btnLabel}</>}
          </OrangeBtn>
        ) : (
          <OrangeBtn onClick={next} disabled={!canNext}>
            {canNext ? btnLabel : <>Continue &nbsp;<IC.fwd /></>}
          </OrangeBtn>
        )}
      </div>
      </div>
    </div>
  );
}
