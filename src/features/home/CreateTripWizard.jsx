import { useState, useRef, useEffect, useCallback } from 'react';
import lumiImg from '../../assets/lumi7.png';
import lumi8Img from '../../assets/lumi8.png';
import { getCurrencyForCountry } from './HomePage';

/* ── Brand colors ─────────────────────────────────── */
const AC    = '#FF6A00';
const AC_BG = '#FFF3EB';
const AC_BR = '#FFCBA4';
const AC_L  = '#FF8C3A';

/* ── Lumi step header ─────────────────────────────── */
function LumiStep({ question, subtitle, img }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:11 }}>
        <img src={img || lumiImg} alt="Lumi" style={{ width:40, height:40, objectFit:'contain', flexShrink:0, filter:'drop-shadow(0 2px 6px rgba(255,106,0,0.28))' }} />
        <span style={{ fontSize:11, fontWeight:800, color:AC, letterSpacing:1.4, textTransform:'uppercase' }}>Lumi</span>
      </div>
      <div style={{ fontFamily:"'Sora',sans-serif", fontSize:21, fontWeight:800, color:'#111', lineHeight:1.25, marginBottom:5 }}>
        {question}
      </div>
      <div style={{ fontSize:13, color:'#9a9a96' }}>{subtitle}</div>
    </div>
  );
}

/* ── Inline SVG helpers ─────────────────────────────── */
const Ic = {
  close:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  back:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
  fwd:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  pin:    (c='currentColor') => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a9a96" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  info:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF8C3A" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  moon:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  sunrise:() => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v2M4.93 4.93l1.41 1.41M2 12h2M20 12h2M19.07 4.93l-1.41 1.41"/><circle cx="12" cy="12" r="4"/><path d="M3 20h18"/></svg>,
  sun:    () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  sunset: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><path d="M3 22h18"/></svg>,
  group:  () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  solo:   () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  edit:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  cal:    () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  money:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  type:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
  check:  () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  sparkle:() => <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2L14 9.5H22L15.5 14L17.5 21.5L12 17L6.5 21.5L8.5 14L2 9.5H10Z" fill={AC}/></svg>,
};

const TIME_SLOTS = [
  { id:'night',     label:'Night',     sub:'12AM\u20136AM',  Icon:Ic.moon },
  { id:'morning',   label:'Morning',   sub:'6AM\u201312PM',  Icon:Ic.sunrise },
  { id:'afternoon', label:'Afternoon', sub:'12PM\u20136PM',  Icon:Ic.sun },
  { id:'evening',   label:'Evening',   sub:'6PM\u201312AM',  Icon:Ic.sunset },
];

/* ── Slot grid (orange theme always) ─────────────── */
function SlotGrid({ field, form, setForm, autoAdvance }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
      {TIME_SLOTS.map(({ id, label, sub, Icon }) => {
        const sel = form[field] === id;
        return (
          <button key={id} type="button"
            onClick={() => { setForm(f => ({ ...f, [field]:id })); if (field === 'arrivalSlot') autoAdvance(); }}
            style={{
              padding:'13px 12px', borderRadius:14,
              border:`1.5px solid ${sel ? AC_BR : 'rgba(15,23,42,0.09)'}`,
              background: sel ? AC_BG : '#fff',
              cursor:'pointer', display:'flex', alignItems:'center', gap:10,
              transition:'all .15s', textAlign:'left',
              boxShadow: sel ? `0 2px 10px ${AC}22` : 'none',
            }}>
            <span style={{ color: sel ? AC : '#bbb', flexShrink:0, display:'flex' }}><Icon /></span>
            <span>
              <div style={{ fontSize:13, fontWeight:700, color: sel ? AC : '#1a1a18', lineHeight:1.2 }}>{label}</div>
              <div style={{ fontSize:10.5, color: sel ? AC_L : '#aaa', fontWeight:500, marginTop:1 }}>{sub}</div>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────── */
function slotLabel(slot) {
  return { night:'Night', morning:'Morning', afternoon:'Afternoon', evening:'Evening' }[slot] || '';
}
function fmtDateDisplay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

export default function CreateTripWizard({
  isSoloMode, setIsSoloMode, form, setForm,
  createStep, setCreateStep, totalCreateSteps,
  nextCreateStep, prevCreateStep, autoAdvance, canAdvanceCurrentStep,
  today, maxDate, fxRate, fxLoading, fxError, convertedBudget,
  BUDGET_CURRENCIES, creating, onClose, onSubmit,
}) {
  /* ── Destination picker state ─────────────── */
  const [showDestPicker, setShowDestPicker] = useState(false);
  const [destQuery, setDestQuery] = useState('');
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [destLoading, setDestLoading] = useState(false);
  const destDebounce = useRef(null);

  // Tell TravelBae to hide the fixed topbar/bottom nav while this overlay is open
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('tb:overlay', { detail: { open: true } }));
    return () => window.dispatchEvent(new CustomEvent('tb:overlay', { detail: { open: false } }));
  }, []);

  // Body scroll lock is managed by HomePage — do not duplicate it here

  const searchDest = useCallback(async (text) => {
    if (text.length < 2) { setDestSuggestions([]); return; }
    setDestLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=8&accept-language=en`,
        { headers: { 'User-Agent':'TravelBae/1.0', 'Accept-Language':'en' } }
      );
      const data = await res.json();
      const TYPES = ['city','town','village','suburb','county','state','district','region'];
      const seen = new Set();
      const filtered = data.filter(p => {
        const ok = TYPES.includes(p.type) || TYPES.includes(p.addresstype);
        const key = fmtDest(p);
        if (!ok || seen.has(key)) return false;
        seen.add(key); return true;
      });
      setDestSuggestions(filtered);
    } catch { setDestSuggestions([]); }
    setDestLoading(false);
  }, []);

  const fmtDest = (item) => {
    const a = item.address || {};
    const city = a.city || a.town || a.village || a.county || a.state_district || a.suburb || '';
    const state = a.state || '';
    const country = a.country || '';
    if (city && state && country) return `${city}, ${state}, ${country}`;
    if (city && country) return `${city}, ${country}`;
    if (state && country) return `${state}, ${country}`;
    return item.display_name.split(',').slice(0, 2).join(',').trim();
  };

  const stepW = `${100 / totalCreateSteps}%`;

  /* ── Render ──────────────────────────────── */
  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:1200, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(8px)', display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'calc(env(safe-area-inset-top, 0px) + 8svh) 0 0' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes lumiPop { from{opacity:0;transform:scale(0.94) translateY(18px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>

      <div
        className="tb-modal-pop"
        style={{ width:'100%', maxWidth:460, height:'min(640px, 92svh)', background:'#fff', borderRadius:'28px 28px 0 0', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 28px 80px rgba(0,0,0,0.22)', animation:'lumiPop .32s cubic-bezier(.16,.84,.24,1.04) both' }}
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── HEADER ── */}
        <div style={{ background:'#fff', padding:'1rem 1.15rem 0.85rem', borderBottom:'1px solid rgba(0,0,0,0.06)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', marginBottom:12 }}>
            <button onClick={onClose}
              style={{ width:34, height:34, borderRadius:'50%', border:'1.5px solid rgba(0,0,0,0.1)', background:'transparent', color:'#555', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
              <Ic.close />
            </button>
            <div style={{ flex:1, textAlign:'center' }}>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:16, fontWeight:700, color:'#111', lineHeight:1.2 }}>Create New Trip</div>
              <div style={{ fontSize:12, fontWeight:700, color:AC, marginTop:2 }}>Step {createStep + 1} of {totalCreateSteps}</div>
            </div>
            <div style={{ width:34, flexShrink:0 }} />
          </div>

          {/* Progress dots + line */}
          <div style={{ display:'flex', alignItems:'center' }}>
            {Array.from({ length: totalCreateSteps }, (_, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', flex: i < totalCreateSteps - 1 ? 1 : 'none' }}>
                <div
                  onClick={() => i < createStep && setCreateStep(i)}
                  style={{
                    width: i === createStep ? 12 : 9,
                    height: i === createStep ? 12 : 9,
                    borderRadius:'50%',
                    background: i <= createStep ? AC : '#E5E5E5',
                    transition:'all .25s',
                    cursor: i < createStep ? 'pointer' : 'default',
                    flexShrink:0,
                    boxShadow: i === createStep ? `0 0 0 3px ${AC}33` : 'none',
                  }}
                />
                {i < totalCreateSteps - 1 && (
                  <div style={{ flex:1, height:2, background: i < createStep ? AC : '#E5E5E5', transition:'background .25s', margin:'0 3px' }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── SLIDES ── */}
        <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
          <div style={{ display:'flex', height:'100%', width:`${totalCreateSteps * 100}%`, transform:`translateX(calc(${-createStep} * ${100 / totalCreateSteps}%))`, transition:'transform .38s cubic-bezier(.16,.84,.24,1.04)' }}>

            {/* ── STEP 0: Who are you traveling with? ── */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.5rem 1.25rem' }}>
              <LumiStep
                question="Squad trip or flying solo?"
                subtitle="I'll pack my advice accordingly"
              />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:22 }}>
                {[
                  { val:false, label:'Group', sub:'Travel together', Icon:Ic.group },
                  { val:true,  label:'Solo',  sub:'Just me',         Icon:Ic.solo },
                ].map(({ val, label, sub, Icon }) => {
                  const sel = isSoloMode === val;
                  return (
                    <button key={String(val)} type="button" onClick={() => setIsSoloMode(val)}
                      style={{ padding:'16px 14px', borderRadius:16, border:`1.5px solid ${sel ? AC_BR : 'rgba(15,23,42,0.09)'}`, background: sel ? AC_BG : '#fff', cursor:'pointer', textAlign:'left', transition:'all .15s', boxShadow: sel ? `0 2px 12px ${AC}28` : '0 1px 4px rgba(0,0,0,0.04)' }}>
                      <div style={{ color: sel ? AC : '#ccc', marginBottom:10, display:'flex' }}><Icon /></div>
                      <div style={{ fontSize:15, fontWeight:700, color: sel ? AC : '#1a1a18', marginBottom:3 }}>{label}</div>
                      <div style={{ fontSize:12, color: sel ? AC_L : '#aaa' }}>{sub}</div>
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize:12, fontWeight:600, color:'#555', marginBottom:8 }}>Trip name</div>
              <input
                style={{ width:'100%', boxSizing:'border-box', padding:'13px 16px', fontSize:15, borderRadius:14, border:`1.5px solid ${form.groupName.trim() ? AC_BR : 'rgba(15,23,42,0.12)'}`, background: form.groupName.trim() ? AC_BG : '#fff', color:'#111', outline:'none', fontFamily:"'DM Sans','Inter',sans-serif", transition:'all .15s' }}
                value={form.groupName}
                onChange={(e) => setForm(f => ({ ...f, groupName:e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter' && form.groupName.trim()) nextCreateStep(); }}
                placeholder={isSoloMode ? 'e.g. My Jaipur Chapter' : 'e.g. Goa Gang 2025'}
              />
            </div>

            {/* ── STEP 1: Where are you going? ── */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.5rem 1.25rem' }}>
              <LumiStep
                question="Where are we off to?"
                subtitle="Drop a city and I'll do my homework"
              />
              <div
                onClick={() => { setShowDestPicker(true); setDestQuery(form.destination); setDestSuggestions([]); }}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderRadius:14, border:`1.5px solid ${form.destination ? AC_BR : 'rgba(15,23,42,0.12)'}`, background: form.destination ? AC_BG : '#fff', cursor:'pointer', transition:'all .15s', userSelect:'none', marginBottom: form.destination ? 0 : 4, boxShadow: form.destination ? `0 2px 10px ${AC}20` : '0 1px 4px rgba(0,0,0,0.04)' }}>
                <Ic.pin c={form.destination ? AC : '#bbb'} />
                <span style={{ flex:1, fontSize:15, fontWeight: form.destination ? 600 : 400, color: form.destination ? AC : '#aaa' }}>
                  {form.destination || 'Enter destination'}
                </span>
                {form.destination
                  ? <span onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, destination:'', destinationCountry:'', destinationCurrency:'' })); }} style={{ display:'flex', color:'#aaa', cursor:'pointer' }}><Ic.close /></span>
                  : <Ic.fwd />}
              </div>
              {!form.destination && (
                <div style={{ fontSize:12, color:'#ccc', marginBottom:18, paddingLeft:2 }}>e.g. Goa, India</div>
              )}
              {!!form.destinationCurrency && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:12, padding:'9px 13px', borderRadius:12, background:AC_BG, border:`1px solid ${AC_BR}` }}>
                  <Ic.sparkle />
                  <span style={{ fontSize:12, color:AC, fontWeight:600 }}>Local currency: <strong>{form.destinationCurrency}</strong>{form.destinationCountry ? ` · ${form.destinationCountry}` : ''}</span>
                </div>
              )}
            </div>

            {/* ── STEP 2: When are you arriving? ── */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.5rem 1.25rem' }}>
              <LumiStep
                question="When do you land?"
                subtitle="I need to know so I don't plan brunch at 3 AM"
              />
              <div style={{ fontSize:12, fontWeight:600, color:'#555', marginBottom:8 }}>Arrival date</div>
              <div style={{ position:'relative', marginBottom:22 }}>
                <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#bbb', display:'flex', pointerEvents:'none' }}><Ic.cal /></span>
                <input
                  style={{ width:'100%', boxSizing:'border-box', padding:'13px 16px 13px 40px', fontSize:15, borderRadius:14, border:`1.5px solid ${form.arrival ? AC_BR : 'rgba(15,23,42,0.12)'}`, background: form.arrival ? AC_BG : '#fff', color:'#111', outline:'none', fontFamily:"'DM Sans','Inter',sans-serif", transition:'all .15s' }}
                  type="date" value={form.arrival} min={today} max={maxDate}
                  onChange={e => { const v = e.target.value; setForm(f => ({ ...f, arrival:v, departure: f.departure && f.departure < v ? '' : f.departure })); }}
                  onBlur={e => { if (e.target.value && e.target.value < today) setForm(f => ({ ...f, arrival:today })); }}
                />
              </div>
              <div style={{ fontSize:12, fontWeight:600, color:'#555', marginBottom:10 }}>Arrival time</div>
              <SlotGrid field="arrivalSlot" form={form} setForm={setForm} autoAdvance={autoAdvance} />
            </div>

            {/* ── STEP 3: When are you leaving? ── */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.5rem 1.25rem' }}>
              <LumiStep
                question="When do you have to go home?"
                subtitle="I'll squeeze every last adventure in before then"
              />
              <div style={{ fontSize:12, fontWeight:600, color:'#555', marginBottom:8 }}>Departure date</div>
              <div style={{ position:'relative', marginBottom:22 }}>
                <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#bbb', display:'flex', pointerEvents:'none' }}><Ic.cal /></span>
                <input
                  style={{ width:'100%', boxSizing:'border-box', padding:'13px 16px 13px 40px', fontSize:15, borderRadius:14, border:`1.5px solid ${form.departure ? AC_BR : 'rgba(15,23,42,0.12)'}`, background: form.departure ? AC_BG : '#fff', color:'#111', outline:'none', fontFamily:"'DM Sans','Inter',sans-serif", transition:'all .15s' }}
                  type="date" value={form.departure} min={form.arrival || today} max={maxDate}
                  onChange={e => setForm(f => ({ ...f, departure:e.target.value }))}
                  onBlur={e => { const v=e.target.value; const m=form.arrival||today; if (v && v < m) setForm(f => ({ ...f, departure:m })); }}
                />
              </div>
              <div style={{ fontSize:12, fontWeight:600, color:'#555', marginBottom:10 }}>Departure time</div>
              <SlotGrid field="departureSlot" form={form} setForm={setForm} autoAdvance={autoAdvance} />
            </div>

            {/* ── STEP 4: What's your budget? ── */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.5rem 1.25rem' }}>
              <LumiStep
                question="What's the spend limit?"
                subtitle="Champagne dreams or backpacker vibes — I got you"
              />
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#555' }}>Budget</div>
                <span style={{ fontSize:10.5, color:'#aaa', background:'rgba(0,0,0,0.05)', borderRadius:6, padding:'2px 8px', fontStyle:'italic', fontWeight:500 }}>Optional</span>
              </div>
              <div style={{ background:'#fff', borderRadius:18, border:'1.5px solid rgba(15,23,42,0.08)', overflow:'hidden', marginBottom:12 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr' }}>
                  <div style={{ padding:'14px 14px 16px' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#aaa', letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>Your currency</div>
                    <select style={{ width:'100%', padding:'8px 10px', fontSize:13, fontFamily:"'DM Sans',sans-serif", border:'1.5px solid rgba(15,23,42,0.1)', borderRadius:10, background:'#F9F8F6', color:'#111', outline:'none', marginBottom:10, cursor:'pointer' }}
                      value={form.budgetCurrency} onChange={(e) => setForm(f => ({ ...f, budgetCurrency:e.target.value }))}>
                      {BUDGET_CURRENCIES.map(code => <option key={code} value={code}>{code}</option>)}
                    </select>
                    <input
                      style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', fontSize:22, fontWeight:800, fontFamily:"'Sora',sans-serif", border:`1.5px solid ${form.budget ? AC_BR : 'rgba(15,23,42,0.1)'}`, borderRadius:10, background: form.budget ? AC_BG : '#F9F8F6', color:'#111', outline:'none', letterSpacing:'-0.5px', transition:'all .15s' }}
                      type="number" min="0" value={form.budget}
                      onChange={(e) => setForm(f => ({ ...f, budget:e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'0 6px', background:'#F7F6F2', color:'#ccc' }}>
                    <Ic.fwd />
                  </div>
                  <div style={{ padding:'14px 14px 16px', background: form.destinationCurrency ? `${AC_BG}88` : '#FAFAF8' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:'#aaa', letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>At destination</div>
                    <div style={{ padding:'8px 10px', fontSize:13, fontWeight:700, color: form.destinationCurrency ? AC : '#ccc', background: form.destinationCurrency ? AC_BG : '#F0F0EC', borderRadius:10, marginBottom:10, textAlign:'center', border:`1.5px solid ${form.destinationCurrency ? AC_BR : 'transparent'}` }}>
                      {form.destinationCurrency || '—'}
                    </div>
                    <div style={{ padding:'10px 12px', fontSize:22, fontWeight:800, fontFamily:"'Sora',sans-serif", color: form.budget && form.destinationCurrency ? AC : '#ccc', background: form.budget && form.destinationCurrency ? AC_BG : '#F0F0EC', borderRadius:10, textAlign:'center', transition:'all .2s', letterSpacing:'-0.5px' }}>
                      {form.budget && form.destinationCurrency ? Number(convertedBudget).toLocaleString(undefined, { maximumFractionDigits:0 }) : '—'}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize:12, color: fxError ? '#cc4415' : '#9a9a96', display:'flex', alignItems:'center', gap:6 }}>
                {fxLoading
                  ? <><div style={{ width:10, height:10, border:`1.5px solid ${AC_BG}`, borderTopColor:AC_L, borderRadius:'50%', animation:'spin .6s linear infinite', flexShrink:0 }} />Fetching live rate…</>
                  : fxError ? fxError
                  : form.destinationCurrency && form.budgetCurrency !== form.destinationCurrency
                    ? `1 ${form.budgetCurrency} = ${fxRate.toFixed(4)} ${form.destinationCurrency} · refreshed daily`
                  : form.destinationCurrency ? 'Same currency — no conversion needed'
                  : 'Select destination first to see conversion'
                }
              </div>
            </div>

            {/* ── STEP 5: Any special plans? ── */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.5rem 1.25rem' }}>
              <LumiStep
                question="Anything I should know?"
                subtitle="Dietary needs, pace, allergies — spill it, I'm all ears"
              />
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'#555' }}>Travel notes</div>
                <span style={{ fontSize:10.5, color:'#aaa', background:'rgba(0,0,0,0.05)', borderRadius:6, padding:'2px 8px', fontStyle:'italic', fontWeight:500 }}>optional</span>
              </div>
              <textarea
                style={{ width:'100%', boxSizing:'border-box', padding:'12px 14px', fontSize:13.5, borderRadius:14, border:'1.5px solid rgba(15,23,42,0.1)', background:'#fff', color:'#111', outline:'none', resize:'none', minHeight:130, lineHeight:1.6, fontFamily:"'DM Sans','Inter',sans-serif", transition:'border-color .15s' }}
                onFocus={e => e.target.style.borderColor = AC_BR}
                onBlur={e => e.target.style.borderColor = 'rgba(15,23,42,0.1)'}
                value={form.travelNotes}
                onChange={e => setForm(f => ({ ...f, travelNotes:e.target.value }))}
                placeholder={isSoloMode ? 'e.g. Prefer slow travel, street food, avoid strenuous hikes…' : 'e.g. Family of 6 with kids, vegetarian food, elderly included…'}
              />
              <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:6 }}>
                <Ic.sparkle />
                <span style={{ fontSize:12, color:'#aaa' }}>The juicier the detail, the better I cook up your itinerary — mention pace, food, mobility.</span>
              </div>
            </div>

            {/* ── STEP 6: Review your trip ── */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.5rem 1.25rem' }}>
              <LumiStep
                img={lumi8Img}
                question="Looks like a banger trip!"
                subtitle="One last look before I start planning the magic"
              />
              <div style={{ background:'#fff', borderRadius:18, border:'1.5px solid rgba(15,23,42,0.07)', overflow:'hidden', marginBottom:14, boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
                {[
                  { icon:<Ic.edit />,  label:'Trip name',   value: form.groupName || '—',   editable:true, step:0 },
                  { icon:<Ic.type />,  label:'Travel type', value: isSoloMode ? 'Solo trip' : 'Group trip' },
                  { icon:<Ic.pin />,   label:'Destination', value: form.destination || '—' },
                  { icon:<Ic.cal />,   label:'Dates',       value: form.arrival && form.departure ? `${fmtDateDisplay(form.arrival)} → ${fmtDateDisplay(form.departure)}` : form.arrival ? fmtDateDisplay(form.arrival) : '—' },
                  { icon:<Ic.money />, label:'Budget',      value: form.budget ? `${form.budgetCurrency} ${Number(form.budget).toLocaleString()}${form.destinationCurrency && form.destinationCurrency !== form.budgetCurrency ? ` ≈ ${form.destinationCurrency} ${Number(convertedBudget).toLocaleString(undefined,{maximumFractionDigits:0})}` : ''}` : 'Not set' },
                ].map(({ icon, label, value, editable, step }, i, arr) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:0, padding:'14px 16px', borderBottom: i < arr.length-1 ? '1px solid rgba(15,23,42,0.05)' : 'none' }}>
                    <span style={{ color:'#ccc', flexShrink:0, display:'flex', width:20 }}>{icon}</span>
                    <div style={{ flex:1, textAlign:'center', padding:'0 8px' }}>
                      <div style={{ fontSize:10, fontWeight:700, color:'#bbb', letterSpacing:1.2, textTransform:'uppercase', marginBottom:4 }}>{label}</div>
                      <div style={{ fontSize:15, fontWeight:600, color:'#111', lineHeight:1.4, wordBreak:'break-word' }}>{value}</div>
                    </div>
                    <span style={{ width:20, flexShrink:0, display:'flex', justifyContent:'flex-end' }}>
                      {editable && (
                        <button type="button" onClick={() => setCreateStep(step)}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', display:'flex', padding:0 }}>
                          <Ic.edit />
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ padding:'0.875rem 1.1rem calc(0.875rem + env(safe-area-inset-bottom,0px))', borderTop:'1px solid rgba(0,0,0,0.06)', display:'flex', gap:10, background:'#fff', flexShrink:0 }}>
          {createStep > 0 && (
            <button onClick={prevCreateStep}
              style={{ width:46, height:46, borderRadius:'50%', border:'1.5px solid rgba(0,0,0,0.12)', background:'#fff', color:'#555', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, transition:'border-color .15s' }}>
              <Ic.back />
            </button>
          )}
          {createStep < totalCreateSteps - 1 ? (
            <button onClick={nextCreateStep} disabled={!canAdvanceCurrentStep()}
              style={{ flex:1, height:46, borderRadius:14, background: canAdvanceCurrentStep() ? `linear-gradient(135deg,${AC_L},${AC})` : '#EBEBEB', color: canAdvanceCurrentStep() ? '#fff' : '#bbb', border:'none', cursor: canAdvanceCurrentStep() ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:15, fontWeight:700, fontFamily:"'Sora',sans-serif", transition:'all .2s', boxShadow: canAdvanceCurrentStep() ? `0 4px 16px ${AC}44` : 'none' }}>
              Continue
              <Ic.fwd />
            </button>
          ) : (
            <button onClick={onSubmit}
              disabled={creating || !form.groupName || !form.destination || !form.arrival}
              style={{ flex:1, height:46, borderRadius:14, background: (!creating && form.groupName && form.destination && form.arrival) ? `linear-gradient(135deg,${AC_L},${AC})` : '#EBEBEB', color: (!creating && form.groupName && form.destination && form.arrival) ? '#fff' : '#bbb', border:'none', cursor: (!creating && form.groupName && form.destination && form.arrival) ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:15, fontWeight:700, fontFamily:"'Sora',sans-serif", transition:'all .2s', boxShadow: (!creating && form.groupName && form.destination && form.arrival) ? `0 4px 16px ${AC}44` : 'none' }}>
              {creating ? 'Creating…' : 'Create Trip'}
              {!creating && <Ic.check />}
            </button>
          )}
        </div>
      </div>

      {/* ── DESTINATION SEARCH OVERLAY ── */}
      {showDestPicker && (
        <div className="tb-sheet-overlay" style={{ position:'fixed', inset:0, zIndex:1010 }}>
          <div className="tb-sheet-panel" style={{ background:'#fff', display:'flex', flexDirection:'column', position:'absolute', inset:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'1rem 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.08)', background:'#fff', flexShrink:0 }}>
              <button onClick={() => { setShowDestPicker(false); setDestSuggestions([]); }}
                style={{ width:36, height:36, borderRadius:'50%', border:'1px solid rgba(0,0,0,0.1)', background:'#F7F6F2', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <Ic.back />
              </button>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:700, flex:1 }}>Destination</div>
            </div>
            <div style={{ padding:'12px 14px', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'#F5F5F3', borderRadius:12, padding:'0 12px', border:'1px solid #E8E8E5' }}>
                <Ic.search />
                <input autoFocus
                  style={{ border:'none', background:'transparent', flex:1, padding:'11px 0', fontSize:15, outline:'none', fontFamily:"'DM Sans',sans-serif", color:'#111' }}
                  value={destQuery}
                  onChange={e => { setDestQuery(e.target.value); clearTimeout(destDebounce.current); destDebounce.current = setTimeout(() => searchDest(e.target.value), 350); }}
                  placeholder="Search city or place…"
                />
                {destLoading && <div style={{ width:18, height:18, border:`2px solid ${AC_BG}`, borderTopColor:AC, borderRadius:'50%', animation:'spin .75s linear infinite', flexShrink:0 }} />}
                {destQuery && !destLoading && <span onClick={() => { setDestQuery(''); setDestSuggestions([]); }} style={{ color:'#aaa', cursor:'pointer', display:'flex', flexShrink:0 }}><Ic.close /></span>}
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              {destSuggestions.map((item) => {
                const a = item.address || {};
                const mainText = a.city || a.town || a.village || a.state_district || a.county || a.state || item.display_name.split(',')[0];
                const subText = [a.state, a.country].filter(Boolean).join(', ');
                return (
                  <div key={item.osm_id + item.osm_type}
                    onClick={async () => {
                      const country = a.country || '';
                      const destCur = await getCurrencyForCountry(country);
                      setForm(f => ({ ...f, destination:fmtDest(item), destinationCountry:country, destinationCurrency:destCur || f.destinationCurrency }));
                      setShowDestPicker(false);
                      setDestSuggestions([]);
                      setDestQuery('');
                      if (createStep === 1) autoAdvance();
                    }}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom:'0.5px solid #F0F0F0', cursor:'pointer', background:'#fff', transition:'background .1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F9F8F5'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <div style={{ width:38, height:38, borderRadius:11, background:'#F3F2EE', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Ic.pin c="#999" />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:15, fontWeight:600, color:'#111', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{mainText}</div>
                      {subText && <div style={{ fontSize:12, color:'#999', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{subText}</div>}
                    </div>
                    <span style={{ color:'#ccc' }}><Ic.fwd /></span>
                  </div>
                );
              })}
              {destQuery.length >= 2 && !destLoading && destSuggestions.length === 0 && (
                <div style={{ textAlign:'center', padding:'4rem 1.5rem', color:'#aaa' }}>
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display:'block', margin:'0 auto 12px' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <div style={{ fontSize:15, fontWeight:600, color:'#555', marginBottom:6 }}>No results for "{destQuery}"</div>
                  <div style={{ fontSize:13 }}>Try a different spelling or nearby city</div>
                </div>
              )}
              {destQuery.length < 2 && <div style={{ textAlign:'center', paddingTop:40, color:'#ccc', fontSize:13 }}>Start typing to search destinations…</div>}
            </div>
            <div style={{ padding:'10px', textAlign:'center', borderTop:'0.5px solid #F0F0F0', fontSize:11, color:'#ccc', flexShrink:0 }}>© OpenStreetMap contributors</div>
          </div>
        </div>
      )}
    </div>
  );
}
