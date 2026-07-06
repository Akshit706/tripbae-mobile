import { useState, useRef } from 'react';
import { updateUserProfile } from '../../api';
import lumiImg from '../../assets/Lumi4_bgless.png';

/* ── Brand ──────────────────────────────────────────── */
const AC = '#FF6A00';   // Lumi orange
const GC = '#1D9E75';   // profile green

/* ── Data ───────────────────────────────────────────── */
const GENDER_OPTIONS = [
  { id: 'male',              label: 'Male' },
  { id: 'female',            label: 'Female' },
  { id: 'non-binary',        label: 'Non-binary' },
  { id: 'prefer-not-to-say', label: 'Prefer not to say' },
];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const RELATIONS = ['Parent', 'Sibling', 'Spouse/Partner', 'Friend', 'Child', 'Colleague', 'Other'];
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

const stepMeta = [
  { title: 'Your photo',           sub: 'Add a face to the name' },
  { title: 'About you',            sub: 'The basics that matter' },
  { title: 'Where are you from?',  sub: 'Your home base' },
  { title: 'Emergency contact',    sub: 'Just in case, always' },
  { title: 'Health info',          sub: 'Stays private, helps you' },
  { title: "You're all set!",      sub: 'Your traveller profile is ready' },
];

/* ── SVG Icons ──────────────────────────────────────── */
const SVG = {
  camera: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  user: () => (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  back: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  ),
  fwd: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  pin: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  alert: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  heart: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  ),
  check: () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  cal: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  phone: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.56 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.89-.89a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  sparkle: () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L14 9.5H22L15.5 14L17.5 21.5L12 17L6.5 21.5L8.5 14L2 9.5H10Z" fill={AC}/>
    </svg>
  ),
  arrowRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
};

/* ══════════════════════════════════════════════════════
   LUMI INTRO SCREEN
══════════════════════════════════════════════════════ */
function LumiIntro({ userName, onStart }) {
  const first = (userName || 'Traveller').split(' ')[0];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, fontFamily: "'DM Sans',system-ui,sans-serif" }}>
      <style>{`
        @keyframes lumiFloat  { 0%,100% { transform:translateY(0px) scale(1); } 50% { transform:translateY(-16px) scale(1.01); } }
        @keyframes bgPulse    { 0%,100% { opacity:0.55; transform:scale(1); } 50% { opacity:1; transform:scale(1.1); } }
        @keyframes fadeUp     { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shinePulse {
          0%,100% { box-shadow:0 6px 32px rgba(255,106,0,0.38), 0 0 0 0 rgba(255,106,0,0.28); }
          60%      { box-shadow:0 6px 52px rgba(255,106,0,0.62), 0 0 0 14px rgba(255,106,0,0); }
        }
        @keyframes dotBlink { 0%,100% { opacity:1; } 50% { opacity:0.25; } }

        .li-wrap {
          display:flex; flex-direction:row;
          height:100svh; width:100%;
        }
        .li-left {
          width:42%; flex-shrink:0; height:100%;
          background:linear-gradient(162deg,#0E0B20 0%,#0D1920 48%,#07130E 100%);
          position:relative; display:flex; flex-direction:column;
          align-items:center; justify-content:flex-end; overflow:hidden;
        }
        .li-right {
          flex:1; min-width:0;
          display:flex; flex-direction:column; justify-content:center;
          padding:3.5rem 4rem; background:#FAFAFC; overflow-y:auto;
        }
        .lumi-char {
          width:auto; max-width:95%; height:87%;
          object-fit:contain; object-position:bottom center;
          animation:lumiFloat 5.5s ease-in-out infinite;
          position:relative; z-index:3; display:block;
          filter:drop-shadow(0 28px 52px rgba(255,106,0,0.24));
        }
        .li-cta-btn {
          animation:shinePulse 2.8s ease-in-out infinite;
          transition:transform .15s !important;
        }
        .li-cta-btn:hover  { transform:scale(1.05) translateY(-2px) !important; }
        .li-cta-btn:active { transform:scale(0.97) !important; }

        .li-a1 { animation:fadeUp .5s ease 0.04s both; }
        .li-a2 { animation:fadeUp .5s ease 0.10s both; }
        .li-a3 { animation:fadeUp .5s ease 0.16s both; }
        .li-a4 { animation:fadeUp .5s ease 0.22s both; }
        .li-a5 { animation:fadeUp .5s ease 0.28s both; }
        .li-a6 { animation:fadeUp .5s ease 0.34s both; }
        .li-a7 { animation:fadeUp .5s ease 0.40s both; }

        @media (max-width:680px) {
          .li-wrap  { flex-direction:column; }
          .li-left  { width:100%; height:44svh; justify-content:flex-end; flex-shrink:0; }
          .li-right { padding:1.75rem 1.5rem 2rem; justify-content:flex-start; }
          .lumi-char { height:90%; max-width:70%; margin:0 auto; }
        }
        @media (min-width:681px) and (max-width:960px) {
          .li-right { padding:2.5rem 2.5rem; }
        }
      `}</style>

      <div className="li-wrap">

        {/* ══ LEFT: Lumi image panel ══ */}
        <div className="li-left">

          {/* Warm orange halo behind Lumi */}
          <div style={{
            position: 'absolute', bottom: '4%', left: '50%',
            transform: 'translateX(-50%)',
            width: '88%', paddingBottom: '88%', borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(255,106,0,0.2) 0%,transparent 62%)',
            animation: 'bgPulse 4s ease-in-out infinite',
            pointerEvents: 'none', zIndex: 1,
          }} />

          {/* Teal top-left shimmer */}
          <div style={{
            position: 'absolute', top: '10%', left: '-12%',
            width: '65%', paddingBottom: '65%', borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(29,158,117,0.1) 0%,transparent 65%)',
            pointerEvents: 'none', zIndex: 1,
          }} />

          {/* Purple top-right accent */}
          <div style={{
            position: 'absolute', top: '6%', right: '-10%',
            width: '55%', paddingBottom: '55%', borderRadius: '50%',
            background: 'radial-gradient(circle,rgba(140,80,220,0.07) 0%,transparent 65%)',
            pointerEvents: 'none', zIndex: 1,
          }} />

          {/* Subtle dot-grid overlay */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px,transparent 1px)',
            backgroundSize: '28px 28px',
          }} />

          {/* Lumi character */}
          <img src={lumiImg} alt="Lumi" className="lumi-char" />

          {/* LUMI AI live badge */}
          <div style={{
            position: 'absolute', bottom: 22, left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(18px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 50, padding: '7px 18px',
            zIndex: 4, whiteSpace: 'nowrap',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: AC, boxShadow: `0 0 10px ${AC}`,
              animation: 'dotBlink 2.2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.65)', letterSpacing: 2.2, textTransform: 'uppercase' }}>
              Lumi AI
            </span>
          </div>
        </div>

        {/* ══ RIGHT: Intro content ══ */}
        <div className="li-right">

          {/* Eyebrow pill */}
          <div className="li-a1" style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(255,106,0,0.08)',
            border: '1px solid rgba(255,106,0,0.2)',
            borderRadius: 50, padding: '5px 14px',
            marginBottom: 22, alignSelf: 'flex-start',
          }}>
            <SVG.sparkle />
            <span style={{ fontSize: 11, fontWeight: 800, color: AC, letterSpacing: 1.8, textTransform: 'uppercase' }}>
              AI Travel Companion
            </span>
          </div>

          {/* "Let's get to know each other" */}
          <div className="li-a2" style={{
            fontSize: 13.5, fontWeight: 700, color: '#9a9a96',
            letterSpacing: 0.3, marginBottom: 10,
          }}>
            Let&apos;s get to know each other 💬
          </div>

          {/* Greeting */}
          <div className="li-a3" style={{
            fontFamily: "'Sora',sans-serif",
            fontSize: 'clamp(26px,3vw,42px)',
            fontWeight: 900, color: '#0D0A1A', lineHeight: 1.15, marginBottom: 4,
          }}>
            Hey {first}! 👋
          </div>

          {/* I'm Lumi — gradient text */}
          <div className="li-a4" style={{
            fontFamily: "'Sora',sans-serif",
            fontSize: 'clamp(34px,4.2vw,54px)',
            fontWeight: 900, lineHeight: 1.08, marginBottom: 18,
            background: `linear-gradient(130deg,${AC} 0%,#FF8C3A 55%,#FFAB62 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            I&apos;m Lumi.
          </div>

          {/* Tagline */}
          <div className="li-a5" style={{
            fontSize: 15, color: '#6b6a66', fontStyle: 'italic',
            marginBottom: 18, letterSpacing: 0.2, lineHeight: 1.65,
          }}>
            Your digital bae ✨ — I&apos;ll be by your side through every adventure, every destination, every memory.
          </div>

          {/* Description */}
          <div className="li-a5" style={{
            fontSize: 14, color: '#7a7a76', lineHeight: 1.85,
            maxWidth: 440, marginBottom: 28,
          }}>
            I plan your trips, split expenses, surface hidden gems, and keep the whole squad in sync. From the moment you dream about a destination to when you land back home —{' '}
            <span style={{ color: '#0D0A1A', fontWeight: 700 }}>I&apos;ve got you covered.</span>
          </div>

          {/* Feature chips */}
          <div className="li-a6" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 36 }}>
            {[
              '✈️ Smart trip planning',
              '💰 Expense splitting',
              '🗺️ Local discoveries',
              '📸 Photo memories',
              '🛡️ Safe travel',
            ].map(f => (
              <span key={f} style={{
                fontSize: 12.5, fontWeight: 600, color: '#555552',
                background: '#f0ede6', borderRadius: 50,
                padding: '7px 14px',
                border: '1px solid rgba(0,0,0,0.06)',
              }}>{f}</span>
            ))}
          </div>

          {/* CTA */}
          <button onClick={onStart} className="li-cta-btn li-a6"
            style={{
              padding: '15px 34px', borderRadius: 50, border: 'none',
              background: `linear-gradient(135deg,${AC} 0%,#FF8C3A 100%)`,
              color: '#fff', fontSize: 15, fontWeight: 800,
              cursor: 'pointer', fontFamily: "'DM Sans',system-ui,sans-serif",
              display: 'inline-flex', alignItems: 'center', gap: 10,
              letterSpacing: 0.2, alignSelf: 'flex-start',
            }}>
            Now, let&apos;s get to know you
            <SVG.arrowRight />
          </button>

          {/* Footer note */}
          <div className="li-a7" style={{ marginTop: 16, fontSize: 12, color: '#c0bdb4' }}>
            Takes less than 2 minutes — promise 💛
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   PROFILE WIZARD CARD
══════════════════════════════════════════════════════ */
export default function UserProfileWizard({ userName, onDone }) {
  const [lumiDone, setLumiDone] = useState(false);
  const [step, setStep]         = useState(0);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const fileRef                 = useRef(null);

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

  const set  = (key, val) => setProfile(p => ({ ...p, [key]: val }));
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
    true,
    !!profile.gender,
    !!profile.country,
    true,
    true,
    true,
  ][step];

  const SW = `${100 / TOTAL}%`;

  /* Show Lumi intro first */
  if (!lumiDone) {
    return <LumiIntro userName={userName} onStart={() => setLumiDone(true)} />;
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(5,10,8,0.88)',
      backdropFilter: 'blur(24px) saturate(1.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '0.75rem',
    }}>
      <style>{`
        @keyframes cardIn { from { opacity:0; transform:scale(0.93) translateY(30px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .prof-card { animation:cardIn .45s cubic-bezier(.16,.84,.24,1) both; }

        .wiz-choice { transition:border-color .18s,background .18s,transform .12s,box-shadow .18s; }
        .wiz-choice:hover  { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.1) !important; }
        .wiz-choice:active { transform:scale(0.97); }

        .wiz-field {
          width:100%; box-sizing:border-box;
          background:#fff; border:1.5px solid rgba(15,23,42,0.11);
          border-radius:14px; padding:13px 16px;
          font-size:14px; color:#1a1a18;
          font-family:'DM Sans',system-ui,sans-serif;
          outline:none; transition:border-color .18s,box-shadow .18s;
          -webkit-appearance:none; appearance:none;
        }
        .wiz-field:focus  { border-color:${GC} !important; box-shadow:0 0 0 3px rgba(29,158,117,0.12); }
        .wiz-field::placeholder { color:#c5c2ba; }
        .wiz-field-icon   { padding-left:44px; }
        .wiz-select {
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239a9a96' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat:no-repeat; background-position:right 14px center;
          padding-right:38px; cursor:pointer;
        }
        .wiz-textarea { resize:none; min-height:90px; line-height:1.65; font-size:13px; }
        .wiz-label {
          display:block; font-size:11px; font-weight:700; color:#9a9a96;
          letter-spacing:1.2px; text-transform:uppercase; margin-bottom:8px;
        }
        .prof-next { transition:all .18s; }
        .prof-next:hover:not(:disabled)  { filter:brightness(1.08); transform:translateY(-1px); }
        .prof-next:active:not(:disabled) { transform:scale(0.98); }
      `}</style>

      <div className="prof-card" style={{
        width: '100%', maxWidth: 460,
        height: 'min(660px,93svh)',
        background: '#fff', borderRadius: 30,
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 40px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05)',
      }}>

        {/* ── DARK HEADER ── */}
        <div style={{
          background: 'linear-gradient(150deg,#09100F 0%,#0D1B18 55%,#08120E 100%)',
          padding: '1.4rem 1.4rem 1.6rem',
          flexShrink: 0, position: 'relative', overflow: 'hidden',
        }}>
          {/* Glow orbs */}
          <div style={{ position: 'absolute', top: -55, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,106,0,0.14) 0%,transparent 65%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -65, left: -30, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(29,158,117,0.1) 0%,transparent 65%)', pointerEvents: 'none' }} />

          {/* Back button */}
          {step > 0 && step < TOTAL - 1 && (
            <button onClick={prev} style={{
              position: 'absolute', top: 18, left: 18,
              width: 34, height: 34, borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 2, backdropFilter: 'blur(4px)',
              transition: 'background .15s',
            }}>
              <SVG.back />
            </button>
          )}

          <div style={{ paddingLeft: step > 0 && step < TOTAL - 1 ? 50 : 0, position: 'relative', zIndex: 1 }}>
            {/* Lumi badge + step counter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,106,0,0.14)',
                border: '1px solid rgba(255,106,0,0.24)',
                borderRadius: 50, padding: '3px 11px 3px 7px',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: `linear-gradient(135deg,${AC},#FF8C3A)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <SVG.sparkle />
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#FF8C3A', letterSpacing: 1.5, textTransform: 'uppercase' }}>Lumi</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                Step {step + 1} of {TOTAL}
              </span>
            </div>

            <div style={{ fontFamily: "'Sora',system-ui,sans-serif", fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 4 }}>
              {stepMeta[step].title}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.45 }}>
              {stepMeta[step].sub}
            </div>
          </div>

          {/* Progress bars */}
          <div style={{ display: 'flex', gap: 3, marginTop: 18, position: 'relative', zIndex: 1 }}>
            {Array.from({ length: TOTAL }, (_, i) => (
              <div key={i} style={{
                flex: 1, height: 2.5, borderRadius: 99,
                background: i <= step ? GC : 'rgba(255,255,255,0.09)',
                transition: 'background .3s ease',
              }} />
            ))}
          </div>
        </div>

        {/* ── STEP SLIDES ── */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            display: 'flex', height: '100%',
            width: `${TOTAL * 100}%`,
            transform: `translateX(calc(${-step} * ${SW}))`,
            transition: 'transform .38s cubic-bezier(.16,.84,.24,1.04)',
          }}>

            {/* ── STEP 0: Photo ── */}
            <div style={{
              width: SW, flex: `0 0 ${SW}`, height: '100%',
              overflowY: 'auto', boxSizing: 'border-box',
              padding: '2rem 1.5rem 1.5rem', background: '#fafaf8',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
              <div style={{ position: 'relative', marginBottom: 24, cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                <div style={{
                  width: 120, height: 120, borderRadius: '50%',
                  background: profile.photoUrl ? 'transparent' : 'linear-gradient(135deg,#e8f5ef,#d4ede3)',
                  border: profile.photoUrl ? 'none' : '2.5px dashed rgba(29,158,117,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                  boxShadow: profile.photoUrl ? '0 14px 40px rgba(0,0,0,0.16)' : 'none',
                }}>
                  {profile.photoUrl
                    ? <img src={profile.photoUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <SVG.user />}
                </div>
                <div style={{
                  position: 'absolute', bottom: 4, right: 4,
                  width: 36, height: 36, borderRadius: '50%',
                  background: `linear-gradient(135deg,${GC},#0d6647)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', boxShadow: '0 4px 14px rgba(29,158,117,0.45)',
                }}>
                  <SVG.camera />
                </div>
              </div>
              <div style={{ fontFamily: "'Sora',system-ui,sans-serif", fontSize: 21, fontWeight: 800, color: '#0f1a12', marginBottom: 8, textAlign: 'center' }}>
                Hey, {(userName || 'Traveller').split(' ')[0]}!
              </div>
              <div style={{ fontSize: 13.5, color: '#7a7a76', textAlign: 'center', lineHeight: 1.7, maxWidth: 300, marginBottom: 28 }}>
                Let&apos;s build your traveller profile — keeps your crew in the loop and you safe on the go.
              </div>
              <button onClick={() => fileRef.current?.click()} style={{
                padding: '12px 28px', borderRadius: 50, border: 'none',
                background: `linear-gradient(135deg,${GC},#0d6647)`,
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'DM Sans',system-ui,sans-serif",
                boxShadow: '0 6px 20px rgba(29,158,117,0.28)',
                transition: 'transform .15s, box-shadow .15s',
              }}>
                {profile.photoUrl ? 'Change photo' : 'Add a photo'}
              </button>
              <div style={{ marginTop: 10, fontSize: 12, color: '#c5c2ba' }}>or skip — you can add one later</div>
            </div>

            {/* ── STEP 1: About ── */}
            <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '1.5rem', background: '#fafaf8' }}>
              <div style={{ marginBottom: 22 }}>
                <label className="wiz-label">Date of birth</label>
                <div style={{ position: 'relative' }}>
                  <input className="wiz-field wiz-field-icon" type="date" value={profile.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} max={new Date().toISOString().split('T')[0]} />
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#c5c2ba', display: 'flex', pointerEvents: 'none' }}><SVG.cal /></span>
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
                        style={{
                          padding: '16px 12px', borderRadius: 16,
                          border: `2px solid ${sel ? GC : 'rgba(15,23,42,0.09)'}`,
                          background: sel ? 'linear-gradient(135deg,#e6f8f2,#f0fcf7)' : '#fff',
                          cursor: 'pointer', display: 'flex', flexDirection: 'column',
                          alignItems: 'center', gap: 7,
                          boxShadow: sel ? '0 4px 16px rgba(29,158,117,0.12)' : 'none',
                        }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: sel ? GC : '#ddd', transition: 'background .15s' }} />
                        <span style={{ fontSize: 13.5, fontWeight: sel ? 700 : 500, color: sel ? '#0F6E56' : '#5a5a56', lineHeight: 1.3 }}>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── STEP 2: Location ── */}
            <div style={{ width: SW, flex: `0 0 ${SW}`, height: '100%', overflowY: 'auto', boxSizing: 'border-box', padding: '1.5rem', background: '#fafaf8' }}>
              <div style={{ marginBottom: 22 }}>
                <label className="wiz-label">Hometown</label>
                <div style={{ position: 'relative' }}>
                  <input className="wiz-field wiz-field-icon" value={profile.hometown} onChange={e => set('hometown', e.target.value)} placeholder="e.g. Bengaluru, Mumbai, Pune" />
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#c5c2ba', display: 'flex', pointerEvents: 'none' }}><SVG.pin /></span>
                </div>
              </div>
              <div>
                <label className="wiz-label">Country</label>
                <select className="wiz-field wiz-select" value={profile.country} onChange={e => set('country', e.target.value)}>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* ── STEP 3: Emergency contact ── */}
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
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#c5c2ba', display: 'flex', pointerEvents: 'none' }}><SVG.phone /></span>
                </div>
              </div>
            </div>

            {/* ── STEP 4: Health ── */}
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
                        style={{
                          padding: '9px 18px', borderRadius: 50,
                          border: `2px solid ${sel ? GC : 'rgba(15,23,42,0.1)'}`,
                          background: sel ? '#E1F5EE' : '#fff',
                          fontSize: 13, fontWeight: sel ? 700 : 500,
                          color: sel ? '#0F6E56' : '#5a5a56',
                          cursor: 'pointer',
                          boxShadow: sel ? '0 2px 10px rgba(29,158,117,0.15)' : 'none',
                        }}>
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

            {/* ── STEP 5: Done ── */}
            <div style={{
              width: SW, flex: `0 0 ${SW}`, height: '100%',
              overflowY: 'auto', boxSizing: 'border-box',
              padding: '2rem 1.5rem 1.5rem', background: '#fafaf8',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <div style={{
                width: 88, height: 88, borderRadius: '50%',
                background: `linear-gradient(135deg,${GC},#0d6647)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', marginBottom: 20,
                boxShadow: '0 16px 40px rgba(15,110,86,0.35)',
              }}>
                <SVG.check />
              </div>
              <div style={{ fontFamily: "'Sora',system-ui,sans-serif", fontSize: 23, fontWeight: 800, color: '#0f1a12', marginBottom: 8, textAlign: 'center' }}>
                You&apos;re all set!
              </div>
              <div style={{ fontSize: 13.5, color: '#7a7a76', textAlign: 'center', lineHeight: 1.65, marginBottom: 24, maxWidth: 300 }}>
                Your traveller profile is ready. Update it anytime from your profile page.
              </div>
              <div style={{ background: '#fff', borderRadius: 18, border: '0.5px solid rgba(0,0,0,0.07)', width: '100%', marginBottom: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                {[
                  { label: 'Name',       value: userName || '—' },
                  { label: 'Gender',     value: profile.gender || '—' },
                  { label: 'From',       value: [profile.hometown, profile.country].filter(Boolean).join(', ') || '—' },
                  { label: 'Emergency',  value: profile.emergencyName ? `${profile.emergencyName}${profile.emergencyRelation ? ` · ${profile.emergencyRelation}` : ''}` : '—' },
                  { label: 'Blood group',value: profile.bloodGroup || '—' },
                ].map(({ label, value }, idx, arr) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: idx < arr.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none' }}>
                    <span style={{ fontSize: 13, color: '#9a9a96', fontWeight: 600 }}>{label}</span>
                    <span style={{ fontSize: 13.5, color: '#1a1a18', fontWeight: 600, maxWidth: 200, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
                  </div>
                ))}
              </div>
              {error && (
                <div style={{ fontSize: 12.5, color: '#993C1D', marginBottom: 12, padding: '10px 14px', background: '#FAECE7', borderRadius: 12, width: '100%', textAlign: 'center' }}>
                  {error}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          padding: '0.875rem 1.25rem calc(0.875rem + env(safe-area-inset-bottom,0px))',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex', gap: 8, background: '#fff', flexShrink: 0,
        }}>
          {step < TOTAL - 1 ? (
            <>
              {step > 0 && (
                <button onClick={prev} style={{
                  padding: '12px 14px', borderRadius: 14,
                  border: '1.5px solid rgba(0,0,0,0.1)', background: '#fff',
                  color: '#5a5a56', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'DM Sans',sans-serif", transition: 'border-color .15s',
                }}>
                  <SVG.back />
                </button>
              )}
              <button onClick={next} disabled={!canNext} className="prof-next"
                style={{
                  flex: 1, padding: '13px', borderRadius: 14, border: 'none',
                  background: canNext ? `linear-gradient(135deg,${GC},#0d6647)` : '#e8e6de',
                  color: canNext ? '#fff' : '#aaa',
                  fontSize: 14, fontWeight: 700,
                  cursor: canNext ? 'pointer' : 'default',
                  fontFamily: "'DM Sans',system-ui,sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: canNext ? '0 4px 16px rgba(29,158,117,0.28)' : 'none',
                }}>
                {step === 0 ? 'Get started' : 'Continue'} <SVG.fwd />
              </button>
            </>
          ) : (
            <button onClick={handleFinish} disabled={saving} className="prof-next"
              style={{
                flex: 1, padding: '13px', borderRadius: 14, border: 'none',
                background: saving ? '#c8c6be' : `linear-gradient(135deg,${GC},#0d6647)`,
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: saving ? 'default' : 'pointer',
                fontFamily: "'DM Sans',system-ui,sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: saving ? 'none' : '0 4px 16px rgba(29,158,117,0.28)',
              }}>
              {saving ? 'Saving…' : 'Start exploring ✈️'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
