import { useState, useRef, useEffect, useCallback } from 'react';
import { S } from '../shared/styles';
import { getCurrencyForCountry, getFxRate } from './HomePage';

/* ── Inline SVG helpers ─────────────────────────────── */
const Ic = {
  close:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  back:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
  fwd:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  pin:    (c='currentColor') => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  search: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9a9a96" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  info:   () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
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
};

const TIME_SLOTS = [
  { id:'night',     label:'Night',     sub:'12AM\u20136AM',  Icon:Ic.moon },
  { id:'morning',   label:'Morning',   sub:'6AM\u201312PM',  Icon:Ic.sunrise },
  { id:'afternoon', label:'Afternoon', sub:'12PM\u20136PM',  Icon:Ic.sun },
  { id:'evening',   label:'Evening',   sub:'6PM\u201312AM',  Icon:Ic.sunset },
];

function SlotGrid({ field, form, setForm, autoAdvance, ac, acBg, acBr }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
      {TIME_SLOTS.map(({ id, label, sub, Icon }) => {
        const sel = form[field] === id;
        return (
          <button key={id} type="button"
            onClick={() => { setForm(f => ({ ...f, [field]:id })); autoAdvance(); }}
            style={{ padding:'11px 10px', borderRadius:14, border:`1.5px solid ${sel ? acBr : 'rgba(15,23,42,0.09)'}`, background:sel ? acBg : '#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:8, transition:'all .15s', textAlign:'left' }}>
            <span style={{ color:sel ? ac : '#9a9a96', flexShrink:0, display:'flex' }}><Icon /></span>
            <span>
              <div style={{ fontSize:13, fontWeight:700, color:sel ? ac : '#1a1a18', lineHeight:1.2 }}>{label}</div>
              <div style={{ fontSize:10, color:sel ? ac : '#9a9a96', fontWeight:500 }}>{sub}</div>
            </span>
          </button>
        );
      })}
    </div>
  );
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

  /* ── Lock body scroll while open ─────────── */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

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

  /* ── Theme ───────────────────────────────── */
  const ac   = isSoloMode ? '#534AB7' : '#0F6E56';
  const acL  = isSoloMode ? '#7F77DD' : '#1D9E75';
  const acBg = isSoloMode ? '#EEEDFE' : '#E1F5EE';
  const acBr = isSoloMode ? '#AFA9EC' : '#9FE1CB';
  const grad = isSoloMode
    ? 'linear-gradient(135deg,#7F77DD,#534AB7)'
    : 'linear-gradient(135deg,#1D9E75,#0F6E56)';
  const stepW = `${100 / totalCreateSteps}%`;
  const stepLabels = ['Name', 'Destination', 'Arrival', 'Departure', 'Budget', 'Notes', 'Review'];

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.52)', backdropFilter:'blur(10px) saturate(1.4)', display:'flex', alignItems:'center', justifyContent:'center', padding:'0.75rem' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="tb-modal-pop"
        style={{ width:'100%', maxWidth:480, height:'min(640px, 92svh)', background:'#fff', borderRadius:26, overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 32px 80px rgba(0,0,0,0.28)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div style={{ background:grad, padding:'0.9rem 1.15rem 1rem', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:11 }}>
            <button onClick={onClose}
              style={{ width:32, height:32, borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.18)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
              <Ic.close />
            </button>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.58)', letterSpacing:1.5, textTransform:'uppercase', marginBottom:2 }}>
                New trip &middot; {createStep + 1}/{totalCreateSteps}
              </div>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:16, fontWeight:700, color:'#fff', lineHeight:1.2 }}>
                {stepLabels[createStep]}
              </div>
            </div>
          </div>
          <div style={{ display:'flex', gap:3 }}>
            {Array.from({ length:totalCreateSteps }, (_, i) => (
              <div key={i}
                onClick={() => i < createStep && setCreateStep(i)}
                style={{ flex:1, height:3, borderRadius:99, background: i <= createStep ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.22)', transition:'background .25s', cursor: i < createStep ? 'pointer' : 'default' }} />
            ))}
          </div>
        </div>

        {/* ── HORIZONTAL SLIDES ── */}
        <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
          <div style={{ display:'flex', height:'100%', width:`${totalCreateSteps * 100}%`, transform:`translateX(calc(${-createStep} * ${100 / totalCreateSteps}%))`, transition:'transform .38s cubic-bezier(.16,.84,.24,1.04)' }}>

            {/* STEP 0 — Trip type + Name */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.4rem 1.25rem', background:'#fafaf8' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase', marginBottom:10 }}>Trip type</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
                {[
                  { val:false, label:'Group', sub:'Travel together', Icon:Ic.group },
                  { val:true,  label:'Solo',  sub:'Just you',        Icon:Ic.solo },
                ].map(({ val, label, sub, Icon }) => {
                  const sel = isSoloMode === val;
                  const oAc = val ? '#534AB7' : '#0F6E56';
                  const oAcBg = val ? '#EEEDFE' : '#E1F5EE';
                  const oAcBr = val ? '#AFA9EC' : '#9FE1CB';
                  return (
                    <button key={String(val)} type="button" onClick={() => setIsSoloMode(val)}
                      style={{ padding:'15px 12px', borderRadius:16, border:`1.5px solid ${sel ? oAcBr : 'rgba(15,23,42,0.1)'}`, background:sel ? oAcBg : '#fff', cursor:'pointer', textAlign:'left', transition:'all .15s' }}>
                      <div style={{ color:sel ? oAc : '#9a9a96', marginBottom:9, display:'flex' }}><Icon /></div>
                      <div style={{ fontSize:14, fontWeight:700, color:sel ? oAc : '#1a1a18', marginBottom:2 }}>{label}</div>
                      <div style={{ fontSize:11, color:sel ? oAc : '#9a9a96' }}>{sub}</div>
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>
                {isSoloMode ? 'Adventure name' : 'Trip name'}
              </div>
              <input
                style={{ ...S.input, fontSize:15, padding:'13px 16px', borderRadius:16 }}
                value={form.groupName}
                onChange={(e) => setForm(f => ({ ...f, groupName:e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter' && form.groupName.trim()) nextCreateStep(); }}
                placeholder={isSoloMode ? 'e.g. My Jaipur Chapter' : 'e.g. Goa Gang 2025'}
              />
            </div>

            {/* STEP 1 — Destination */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.4rem 1.25rem', background:'#fafaf8' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Destination</div>
              <div
                onClick={() => { setShowDestPicker(true); setDestQuery(form.destination); setDestSuggestions([]); }}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:16, border:`1.5px solid ${form.destination ? acBr : 'rgba(15,23,42,0.12)'}`, background:form.destination ? acBg : '#fff', cursor:'pointer', transition:'all .15s', userSelect:'none' }}>
                <Ic.pin c={form.destination ? ac : '#9a9a96'} />
                <span style={{ flex:1, fontSize:15, fontWeight:form.destination ? 600 : 400, color:form.destination ? ac : '#9a9a96' }}>
                  {form.destination || 'Search a city or place\u2026'}
                </span>
                {form.destination
                  ? <span onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, destination:'', destinationCountry:'', destinationCurrency:'' })); }} style={{ display:'flex', color:'#9a9a96', cursor:'pointer' }}><Ic.close /></span>
                  : <Ic.fwd />}
              </div>
              {!!form.destinationCurrency && (
                <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:10, padding:'9px 13px', borderRadius:12, background:acBg, border:`1px solid ${acBr}` }}>
                  <Ic.info />
                  <span style={{ fontSize:12, color:ac, fontWeight:600 }}>Local currency: <strong>{form.destinationCurrency}</strong>{form.destinationCountry ? ` \u00b7 ${form.destinationCountry}` : ''}</span>
                </div>
              )}
            </div>

            {/* STEP 2 — Arrival */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.4rem 1.25rem', background:'#fafaf8' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Arrival date</div>
              <input style={{ ...S.input, fontSize:15, padding:'13px 16px', borderRadius:16, marginBottom:20 }} type="date"
                value={form.arrival} min={today} max={maxDate}
                onChange={e => { const v=e.target.value; setForm(f => ({ ...f, arrival:v, departure: f.departure && f.departure < v ? '' : f.departure })); }}
                onBlur={e => { if (e.target.value && e.target.value < today) setForm(f => ({ ...f, arrival:today })); }} />
              <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase', marginBottom:10 }}>Arrival time</div>
              <SlotGrid field="arrivalSlot" form={form} setForm={setForm} autoAdvance={autoAdvance} ac={ac} acBg={acBg} acBr={acBr} />
            </div>

            {/* STEP 3 — Departure */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.4rem 1.25rem', background:'#fafaf8' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase', marginBottom:8 }}>Departure date</div>
              <input style={{ ...S.input, fontSize:15, padding:'13px 16px', borderRadius:16, marginBottom:20 }} type="date"
                value={form.departure} min={form.arrival || today} max={maxDate}
                onChange={e => setForm(f => ({ ...f, departure:e.target.value }))}
                onBlur={e => { const v=e.target.value; const m=form.arrival||today; if (v && v < m) setForm(f => ({ ...f, departure:m })); }} />
              <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase', marginBottom:10 }}>Departure time</div>
              <SlotGrid field="departureSlot" form={form} setForm={setForm} autoAdvance={autoAdvance} ac={ac} acBg={acBg} acBr={acBr} />
            </div>

            {/* STEP 4 — Budget (dual-currency calculator) */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.4rem 1.25rem', background:'#fafaf8' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase' }}>Budget</div>
                <span style={{ fontSize:10, color:'#b0b0aa', background:'rgba(0,0,0,0.05)', borderRadius:6, padding:'2px 7px', fontStyle:'italic' }}>optional</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', background:'#fff', borderRadius:18, border:'1px solid rgba(15,23,42,0.09)', overflow:'hidden', marginBottom:12 }}>
                <div style={{ padding:'14px 14px 16px' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#9a9a96', letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>Your currency</div>
                  <select style={{ width:'100%', padding:'8px 10px', fontSize:13, fontFamily:"'DM Sans',sans-serif", border:'1px solid rgba(15,23,42,0.1)', borderRadius:10, background:'#f9f8f4', color:'#111', outline:'none', marginBottom:8, cursor:'pointer' }}
                    value={form.budgetCurrency} onChange={(e) => setForm(f => ({ ...f, budgetCurrency:e.target.value }))}>
                    {BUDGET_CURRENCIES.map(code => <option key={code} value={code}>{code}</option>)}
                  </select>
                  <input style={{ width:'100%', boxSizing:'border-box', padding:'10px 12px', fontSize:20, fontWeight:700, fontFamily:"'Sora',sans-serif", border:'1px solid rgba(15,23,42,0.1)', borderRadius:10, background:'#f9f8f4', color:'#111', outline:'none', letterSpacing:'-0.5px' }}
                    type="number" min="0" value={form.budget} onChange={(e) => setForm(f => ({ ...f, budget:e.target.value }))} placeholder="0" />
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'0 6px', background:'#f7f6f2' }}>
                  <Ic.fwd />
                </div>
                <div style={{ padding:'14px 14px 16px', background: form.destinationCurrency ? (isSoloMode ? 'rgba(127,119,221,0.04)' : 'rgba(29,158,117,0.04)') : '#fafaf8' }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#9a9a96', letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>At destination</div>
                  <div style={{ padding:'8px 10px', fontSize:13, fontWeight:700, color:form.destinationCurrency ? ac : '#c0c0bc', background:form.destinationCurrency ? acBg : '#f0f0ec', borderRadius:10, marginBottom:8, textAlign:'center' }}>
                    {form.destinationCurrency || '\u2014'}
                  </div>
                  <div style={{ padding:'10px 12px', fontSize:20, fontWeight:700, fontFamily:"'Sora',sans-serif", color: form.budget && form.destinationCurrency ? ac : '#c0c0bc', background: form.budget && form.destinationCurrency ? acBg : '#f0f0ec', borderRadius:10, textAlign:'center', transition:'all .2s' }}>
                    {form.budget && form.destinationCurrency ? convertedBudget.toLocaleString(undefined, { maximumFractionDigits:0 }) : '\u2014'}
                  </div>
                </div>
              </div>
              <div style={{ fontSize:12, color: fxError ? '#993C1D' : '#7c7c77', display:'flex', alignItems:'center', gap:5 }}>
                {fxLoading
                  ? <><div style={{ width:10, height:10, border:`1.5px solid ${acBg}`, borderTopColor:acL, borderRadius:'50%', animation:'spin .6s linear infinite', flexShrink:0 }} />Fetching live rate\u2026</>
                  : fxError ? fxError
                  : form.destinationCurrency && form.budgetCurrency !== form.destinationCurrency
                    ? `1 ${form.budgetCurrency} = ${fxRate.toFixed(4)} ${form.destinationCurrency} \u00b7 refreshed daily`
                  : form.destinationCurrency ? 'Same currency \u2014 no conversion needed'
                  : 'Select a destination to see converted amount'
                }
              </div>
            </div>

            {/* STEP 5 — Notes */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.4rem 1.25rem', background:'#fafaf8' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase' }}>Trip notes</div>
                <span style={{ fontSize:10, color:'#b0b0aa', background:'rgba(0,0,0,0.05)', borderRadius:6, padding:'2px 7px', fontStyle:'italic' }}>optional</span>
              </div>
              <textarea style={{ ...S.input, fontSize:14, padding:'13px 16px', borderRadius:16, resize:'none', minHeight:140, lineHeight:1.6, fontFamily:'inherit' }}
                value={form.travelNotes} onChange={e => setForm(f => ({ ...f, travelNotes:e.target.value }))}
                placeholder={isSoloMode ? 'e.g. Prefer slow travel, street food, avoid strenuous hikes\u2026' : 'e.g. Family of 6 with kids, vegetarian food, elderly included\u2026'} />
              <div style={{ marginTop:10, padding:'9px 12px', background:'rgba(29,158,117,0.06)', borderRadius:10, border:'1px solid rgba(29,158,117,0.14)', display:'flex', gap:7, alignItems:'flex-start' }}>
                <Ic.info />
                <span style={{ fontSize:11, color:'#3d8a6e', lineHeight:1.5 }}>AI reads this to personalise your itinerary \u2014 mention ages, dietary needs, paces, mobility.</span>
              </div>
            </div>

            {/* STEP 6 — Review */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.4rem 1.25rem', background:'#fafaf8' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#9a9a96', letterSpacing:1.2, textTransform:'uppercase', marginBottom:12 }}>Summary</div>
              <div style={{ background:'#fff', borderRadius:18, border:'1px solid rgba(15,23,42,0.08)', overflow:'hidden' }}>
                {[
                  { Icon:Ic.edit,  label:'Name',        value:form.groupName || '\u2014' },
                  { Icon:Ic.pin,   label:'Destination', value:form.destination || '\u2014' },
                  { Icon:Ic.cal,   label:'Dates',       value: form.arrival && form.departure ? `${form.arrival} \u2192 ${form.departure}` : '\u2014' },
                  { Icon:Ic.money, label:'Budget',      value: form.budget ? `${form.budgetCurrency} ${Number(form.budget).toLocaleString()}${form.destinationCurrency && form.destinationCurrency !== form.budgetCurrency ? ` \u2248 ${form.destinationCurrency} ${convertedBudget.toLocaleString(undefined,{maximumFractionDigits:0})}` : ''}` : 'Not set' },
                  { Icon:Ic.type,  label:'Type',        value: isSoloMode ? 'Solo adventure' : 'Group trip' },
                ].map(({ Icon, label, value }, i, arr) => (
                  <div key={label} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'11px 16px', borderBottom: i < arr.length-1 ? '1px solid rgba(15,23,42,0.05)' : 'none' }}>
                    <span style={{ color:'#9a9a96', marginTop:2, flexShrink:0, display:'flex' }}><Icon /></span>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:'#b0b0aa', letterSpacing:0.8, textTransform:'uppercase', marginBottom:1 }}>{label}</div>
                      <div style={{ fontSize:14, fontWeight:600, color:'#111', lineHeight:1.4 }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ padding:'0.875rem 1.1rem calc(0.875rem + env(safe-area-inset-bottom,0px))', borderTop:'1px solid rgba(0,0,0,0.06)', display:'flex', gap:8, background:'#fff', flexShrink:0 }}>
          <button onClick={prevCreateStep} disabled={createStep === 0}
            style={{ ...S.btn, padding:'11px 16px', opacity:createStep===0?0.3:1 }}>
            <Ic.back />
          </button>
          {createStep < totalCreateSteps - 1 ? (
            <button onClick={nextCreateStep} disabled={!canAdvanceCurrentStep()}
              style={{ ...S.btn, ...(isSoloMode ? S.btnSolo : S.btnP), flex:1, justifyContent:'center', padding:'11px', fontSize:14, fontWeight:700, gap:6, opacity:canAdvanceCurrentStep()?1:0.42 }}>
              Continue <Ic.fwd />
            </button>
          ) : (
            <button onClick={onSubmit} disabled={creating || !form.groupName || !form.destination || !form.arrival || !form.departure}
              style={{ ...S.btn, ...(isSoloMode ? S.btnSolo : S.btnP), flex:1, justifyContent:'center', padding:'11px', fontSize:14, fontWeight:700, opacity:(creating||!form.groupName||!form.destination||!form.arrival||!form.departure)?0.42:1 }}>
              {creating ? 'Creating\u2026' : (isSoloMode ? 'Start Adventure' : 'Create Trip')}
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
                style={{ width:36, height:36, borderRadius:'50%', border:'0.5px solid rgba(0,0,0,0.12)', background:'#f7f6f2', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <Ic.back />
              </button>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:700, flex:1 }}>Destination</div>
            </div>
            <div style={{ padding:'12px 14px', flexShrink:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'#F5F5F3', borderRadius:12, padding:'0 12px', border:'0.5px solid #e0e0e0' }}>
                <Ic.search />
                <input autoFocus
                  style={{ ...S.input, border:'none', background:'transparent', flex:1, padding:'10px 0', fontSize:15, outline:'none' }}
                  value={destQuery}
                  onChange={e => { setDestQuery(e.target.value); clearTimeout(destDebounce.current); destDebounce.current = setTimeout(() => searchDest(e.target.value), 350); }}
                  placeholder="Search city or place\u2026" />
                {destLoading && <div style={{ width:18, height:18, border:'2px solid #E1F5EE', borderTopColor:'#1D9E75', borderRadius:'50%', animation:'spin .75s linear infinite', flexShrink:0 }} />}
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
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom:'0.5px solid #f0f0f0', cursor:'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f7f6f2'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <div style={{ width:36, height:36, borderRadius:10, background:'#F1EFE8', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Ic.pin c="#6b6b68" />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:15, fontWeight:600, color:'#111', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{mainText}</div>
                      {subText && <div style={{ fontSize:12, color:'#888', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{subText}</div>}
                    </div>
                    <Ic.fwd />
                  </div>
                );
              })}
              {destQuery.length >= 2 && !destLoading && destSuggestions.length === 0 && (
                <div style={{ textAlign:'center', padding:'4rem 1.5rem', color:'#6b6b68' }}>
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#c0c0bc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:12, display:'block', margin:'0 auto 12px' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <div style={{ fontSize:15, fontWeight:600, marginBottom:6 }}>No results for &ldquo;{destQuery}&rdquo;</div>
                  <div style={{ fontSize:13 }}>Try a different spelling or nearby city</div>
                </div>
              )}
              {destQuery.length < 2 && <div style={{ textAlign:'center', paddingTop:40, color:'#bbb', fontSize:13 }}>Start typing to search destinations\u2026</div>}
            </div>
            <div style={{ padding:'10px', textAlign:'center', borderTop:'0.5px solid #f0f0f0', fontSize:11, color:'#bbb', flexShrink:0 }}>&copy; OpenStreetMap contributors</div>
          </div>
        </div>
      )}
    </div>
  );
}
