import { useState, useRef, useEffect, useCallback } from 'react';
import lumiImg from '../../assets/lumi7.png';
import lumi8Img from '../../assets/lumi8.png';
import route3dImg from '../../assets/route3d.png';
import globe3dImg from '../../assets/globe3d.png';
import { getCurrencyForCountry } from './HomePage';
import { fetchDestinationHints } from '../../api';

/* ── Brand colors ─────────────────────────────────── */
const AC    = '#FF6A00';
const AC_BG = '#FFF3EB';
const AC_BR = '#FFCBA4';
const AC_L  = '#FF8C3A';

/* ── Countries that trigger the "vast region" Layer 3 warning ── */
const VAST_COUNTRIES = new Set([
  'united states','usa','us','united states of america',
  'australia','canada','brazil','russia','china','india',
  'argentina','mexico','kazakhstan','algeria','democratic republic of the congo',
  'saudi arabia','indonesia','sudan','libya','iran','mongolia',
  'peru','niger','angola','mali','south africa','colombia',
  'ethiopia','bolivia','mauritania','egypt','tanzania',
  'nigeria','venezuela','pakistan','turkey','chile',
  'zambia','myanmar','france','ukraine',
]);
function isVastCountry(name) {
  return VAST_COUNTRIES.has((name || '').toLowerCase().trim());
}

/* ── All country names — used to block free-text country entry ── */
const COUNTRY_NAMES = new Set([
  'afghanistan','albania','algeria','andorra','angola','antigua and barbuda',
  'argentina','armenia','australia','austria','azerbaijan','bahamas','bahrain',
  'bangladesh','barbados','belarus','belgium','belize','benin','bhutan','bolivia',
  'bosnia and herzegovina','botswana','brazil','brunei','bulgaria','burkina faso',
  'burundi','cabo verde','cambodia','cameroon','canada','central african republic',
  'chad','chile','china','colombia','comoros','costa rica','croatia','cuba',
  'cyprus','czech republic','czechia','democratic republic of the congo',
  'denmark','djibouti','dominica','dominican republic','ecuador','egypt',
  'el salvador','equatorial guinea','eritrea','estonia','eswatini','ethiopia',
  'fiji','finland','france','gabon','gambia','georgia','germany','ghana',
  'greece','grenada','guatemala','guinea','guinea-bissau','guyana','haiti',
  'honduras','hungary','iceland','india','indonesia','iran','iraq','ireland',
  'israel','italy',"ivory coast","cote d'ivoire",'jamaica','japan','jordan',
  'kazakhstan','kenya','kiribati','north korea','south korea','korea','kuwait',
  'kyrgyzstan','laos','latvia','lebanon','lesotho','liberia','libya',
  'liechtenstein','lithuania','luxembourg','madagascar','malawi','malaysia',
  'maldives','mali','malta','marshall islands','mauritania','mauritius','mexico',
  'micronesia','moldova','monaco','mongolia','montenegro','morocco','mozambique',
  'myanmar','namibia','nauru','nepal','netherlands','new zealand','nicaragua',
  'niger','nigeria','north macedonia','norway','oman','pakistan','palau',
  'palestine','panama','papua new guinea','paraguay','peru','philippines',
  'poland','portugal','qatar','republic of the congo','romania','russia','rwanda',
  'samoa','san marino','saudi arabia','senegal','serbia','seychelles',
  'sierra leone','singapore','slovakia','slovenia','solomon islands','somalia',
  'south africa','south sudan','spain','sri lanka','sudan','suriname','sweden',
  'switzerland','syria','taiwan','tajikistan','tanzania','thailand','timor-leste',
  'togo','tonga','trinidad and tobago','tunisia','turkey','turkmenistan','tuvalu',
  'uganda','ukraine','united arab emirates','uae','united kingdom','uk','england',
  'scotland','wales','united states','usa','us','united states of america',
  'uruguay','uzbekistan','vanuatu','venezuela','vietnam','viet nam','yemen',
  'zambia','zimbabwe',
]);
function isCountryName(name) {
  return COUNTRY_NAMES.has((name || '').toLowerCase().trim());
}

/* ── Lumi step header ─────────────────────────────── */
function LumiStep({ question, subtitle, img }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, marginBottom:11 }}>
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

/* Normalizes accented chars so "Hanoi" matches "Hà Nội", "Koln" matches "Köln", etc. */
function stripDiacritics(s) { return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); }

/* Blocks pure consonant spam — short abbreviations (NYC, KL) still pass */
function looksLikeMeaningfulQuery(q) {
  const letters = q.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (letters.length < 4) return true;
  return /[aeiou]/.test(letters);
}

/* ── Inline SVG helpers ─────────────────────────────── */
const Ic = {
  close:   () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  back:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>,
  fwd:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
  pin:    ({c='currentColor'} = {}) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
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
  route:  () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7H5.5a3.5 3.5 0 0 1 0-7H17"/><circle cx="18" cy="5" r="3"/></svg>,
  magic:  () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8L19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2L19 5"/><path d="M3 21l9-9"/><path d="M12.2 6.2L11 5"/></svg>,
  city:   () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M9 8h1"/><path d="M9 12h1"/><path d="M9 16h1"/><path d="M14 8h1"/><path d="M14 12h1"/><path d="M14 16h1"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/></svg>,
};

const TIME_SLOTS = [
  { id:'night',     label:'Night',     sub:'12AM\u20136AM',  Icon:Ic.moon },
  { id:'morning',   label:'Morning',   sub:'6AM\u201312PM',  Icon:Ic.sunrise },
  { id:'afternoon', label:'Afternoon', sub:'12PM\u20136PM',  Icon:Ic.sun },
  { id:'evening',   label:'Evening',   sub:'6PM\u201312AM',  Icon:Ic.sunset },
];

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

function slotLabel(slot) {
  return { night:'Night', morning:'Morning', afternoon:'Afternoon', evening:'Evening' }[slot] || '';
}
function fmtDateDisplay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function Spinner() {
  return <div style={{ width:16, height:16, border:`2px solid ${AC_BG}`, borderTopColor:AC, borderRadius:'50%', animation:'spin .7s linear infinite', flexShrink:0 }} />;
}

/* ── City row with days counter (Layer 1) ─────────── */
function CityRow({ city, onRemove, onAdjust, isLast, isActive, onActivate, showCounter }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom: isLast ? 10 : 0 }}>
      {/* Timeline */}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', width:14, flexShrink:0, paddingTop:14 }}>
        <div style={{ width:9, height:9, borderRadius:'50%', background: isActive ? AC : `${AC}88`, flexShrink:0, transition:'background .15s' }} />
        {!isLast && <div style={{ width:1.5, flex:1, background:`${AC}28`, marginTop:3, minHeight:22 }} />}
      </div>
      {/* Card — whole card is clickable to expand */}
      <div onClick={onActivate} style={{ flex:1, borderRadius:14, border: isActive ? `1.5px solid ${AC_BR}` : '1px solid rgba(15,23,42,0.07)', background: '#fff', boxShadow: isActive ? `0 2px 10px ${AC}18` : '0 1px 5px rgba(0,0,0,0.05)', marginBottom: isLast ? 0 : 7, cursor:'pointer', overflow:'hidden', transition:'all .15s' }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 11px' }}>
          <div style={{ width:34, height:34, borderRadius:10, background: AC_BG, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:AC, transition:'background .15s' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <span style={{ flex:1, fontSize:14, fontWeight:700, color:'#111', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontFamily:"'DM Sans',sans-serif" }}>{city.name}</span>
          {showCounter && (
          <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }} onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => onAdjust(-1)}
              style={{ width:26, height:26, borderRadius:8, border:'1px solid rgba(15,23,42,0.12)', background:'#fff', color:'#555', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:16, fontWeight:700, lineHeight:1 }}>−</button>
            <span style={{ minWidth:26, textAlign:'center', fontSize:12, fontWeight:800, color:AC }}>{city.days}d</span>
            <button type="button" onClick={() => onAdjust(1)}
              style={{ width:26, height:26, borderRadius:8, border:'none', background:AC, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:16, fontWeight:700, lineHeight:1 }}>+</button>
          </div>
          )}
          <button type="button" onClick={e => { e.stopPropagation(); onRemove(); }}
            style={{ width:24, height:24, borderRadius:7, border:'1px solid rgba(0,0,0,0.08)', background:'#F7F6F2', color:'#bbb', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
            <Ic.close />
          </button>
        </div>
        {/* Highlights row */}
        {city.highlights && city.highlights.length > 0 && (
          <div style={{ padding:'0 11px 9px', display:'flex', gap:6, flexWrap:'wrap' }}>
            {city.highlights.map(h => (
              <div key={h} style={{ fontSize:11, fontWeight:600, color:AC, background:`${AC}18`, borderRadius:20, padding:'3px 9px', border:`1px solid ${AC_BR}` }}>{h}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Hint chip (Serper suggestion, tap to toggle) ──────── */
function HintChip({ label, selected, onAdd }) {
  return (
    <button type="button" onClick={onAdd}
      style={{ padding:'6px 13px', borderRadius:20, border:`1.5px solid ${selected ? AC_BR : 'rgba(15,23,42,0.1)'}`, background: selected ? AC_BG : '#fff', color: selected ? AC : '#555', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5, flexShrink:0, transition:'all .15s' }}>
      {selected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={AC} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
      {label}
    </button>
  );
}

/* ── Skeleton shimmer chips ──────────────────────────── */
function ShimmerChips() {
  return (
    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
      {[88,110,72,96,104,80].map(w => (
        <div key={w} style={{ height:32, width:w, borderRadius:20, background:'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s ease infinite' }} />
      ))}
    </div>
  );
}

export default function CreateTripWizard({
  isSoloMode: isSoloModeA, setIsSoloMode: setIsSoloModeA,
  isSoloMode: isSoloModeB, setIsSoloMode: setIsSoloModeB,
  form: formProp, setForm,
  createStep, setCreateStep,
  today, maxDate, fxRate, fxLoading, fxError, convertedBudget,
  BUDGET_CURRENCIES, creating,
  onClose: onCloseA, onSubmit: onSubmitA,
  onClose: onCloseB, onSubmit: onSubmitB,
}) {
  const isSoloMode = isSoloModeA ?? isSoloModeB;
  const setIsSoloMode = setIsSoloModeA ?? setIsSoloModeB;
  const onClose = onCloseA ?? onCloseB;
  const onSubmit = onSubmitA ?? onSubmitB;

  /* HomePage may omit extra destination fields — keep the wizard self-contained */
  const form = {
    destinationMode: null,
    selectedCities: [],
    lumiHighlights: [],
    arrivalCity: '',
    departureCity: '',
    groupName: formProp?.groupName ?? formProp?.groupName ?? '',
    ...formProp,
    selectedCities: formProp?.selectedCities || [],
    lumiHighlights: formProp?.lumiHighlights || [],
    arrivalCity: formProp?.arrivalCity || '',
    departureCity: formProp?.departureCity || '',
  };
  if (!form.groupName && formProp?.groupName) form.groupName = formProp.groupName;

  /* Origin is 8 steps; ignore a stale 7-step cap from HomePage */
  const totalCreateSteps = 8;
  const nextCreateStep = () => setCreateStep((s) => Math.min(totalCreateSteps - 1, s + 1));
  const prevCreateStep = () => setCreateStep((s) => Math.max(0, s - 1));
  const autoAdvance = () => { setTimeout(() => nextCreateStep(), 180); };
  const canAdvanceCurrentStep = () => {
    if (createStep === 0) return !!(form.groupName || form.groupName || '').trim();
    if (createStep === 1) return !!form.destinationMode;
    if (createStep === 2) return !!(form.destination || '').trim();
    if (createStep === 3) return !!form.arrival && !!form.arrivalCity;
    if (createStep === 4) return !!form.departure && !!form.departureCity;
    return true;
  };

  /* ── Destination overlay state ───────────────── */
  const [showDestPicker, setShowDestPicker] = useState(false);
  const [destPickerFor,  setDestPickerFor]  = useState('region'); // which field opened the picker
  const [destQuery,      setDestQuery]      = useState('');
  const [destSugg,       setDestSugg]       = useState([]);
  const [destLoading,    setDestLoading]    = useState(false);
  const destDebounce = useRef(null);

  const openPicker = (forContext) => {
    setDestPickerFor(forContext);
    setDestQuery('');
    setDestSugg([]);
    setShowDestPicker(true);
  };
  const closePicker = () => { setShowDestPicker(false); setDestSugg([]); setDestQuery(''); };

  /* ── Serper hints ────────────────────────────── */
  const [hints,        setHints]        = useState([]);
  const [hintsLoading, setHintsLoading] = useState(false);
  const [hintsFor,     setHintsFor]     = useState('');

  /* ── Layer 3 vast-country banner ─────────────── */
  const [vastBanner, setVastBanner] = useState(null); // {name, country, cur, formatted}

  /* ── Active city for highlights picker ───────── */
  const [activeCityName, setActiveCityName] = useState(null);

  // Tell TravelBae to hide the fixed topbar/bottom nav while this overlay is open
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('tb:overlay', { detail: { open: true } }));
    return () => window.dispatchEvent(new CustomEvent('tb:overlay', { detail: { open: false } }));
  }, []);

  // Body scroll lock is managed by HomePage — do not duplicate it here

  /* ── Nominatim search ────────────────────────── */
  function fmtPlace(item) {
    const a = item.address || {};
    const city    = a.city || a.town || a.village || a.county || a.state_district || a.suburb || '';
    const state   = a.state || '';
    const country = a.country || '';
    if (city && state && country) return `${city}, ${state}, ${country}`;
    if (city && country)          return `${city}, ${country}`;
    if (state && country)         return `${state}, ${country}`;
    return item.display_name.split(',').slice(0, 2).join(',').trim();
  }

  function placeType(item) {
    const t = item.type || item.addresstype || '';
    if (['city','town','village','suburb'].includes(t)) return 'city';
    if (t === 'country') return 'country';
    if (['state','region','district','county','administrative'].includes(t) || item.class === 'boundary') return 'region';
    return 'place';
  }

  function placeName(item) {
    const a = item.address || {};
    return a.city || a.town || a.village || a.state_district || a.county || a.state || item.display_name.split(',')[0];
  }

  async function searchNominatim(text, setter, loadSetter) {
    if (text.length < 2) { setter([]); return; }
    loadSetter(true);
    try {
      const res  = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=7&accept-language=en`,
        { headers: { 'User-Agent':'TravelBae/1.0', 'Accept-Language':'en' } }
      );
      const data = await res.json();
      const TYPES  = ['city','town','village','suburb','county','state','district','region','country','administrative'];
      const seen   = new Set();
      const qLow   = text.toLowerCase().trim();
      setter(data.filter(p => {
        const ok      = TYPES.includes(p.type) || TYPES.includes(p.addresstype) || p.class === 'place' || p.class === 'boundary';
        const a       = p.address || {};
        // strip diacritics AND spaces: "Hà Nội"→"hanoi" matches query "hanoi"
        const flat  = s => stripDiacritics(s).replace(/\s+/g, '');
        const main  = flat((a.city || a.town || a.village || a.state_district || a.county || a.state || p.display_name.split(',')[0]).toLowerCase());
        const qFlat = flat(qLow);
        const rel   = qLow.length <= 2 || main.includes(qFlat) || flat(p.display_name.toLowerCase()).includes(qFlat);
        const key     = fmtPlace(p);
        if (!ok || !rel || seen.has(key)) return false;
        seen.add(key); return true;
      }));
    } catch { setter([]); }
    loadSetter(false);
  }

  /* ── Load Serper hints (in-memory cache prevents repeat API calls) */
  const hintsCacheRef = useRef(new Map());
  const loadHints = useCallback(async (q) => {
    if (!q) return;
    // Serve from session cache — no network call needed
    if (hintsCacheRef.current.has(q)) {
      setHints(hintsCacheRef.current.get(q));
      setHintsFor(q);
      return;
    }
    if (q === hintsFor) return;
    setHintsLoading(true);
    setHintsFor(q);
    try {
      const { hints: h } = await fetchDestinationHints(q);
      const result = h || [];
      hintsCacheRef.current.set(q, result);
      setHints(result);
    } catch { setHints([]); }
    setHintsLoading(false);
  }, [hintsFor]);

  /* ── Handle picking a place from the overlay ─── */
  const handlePickPlace = useCallback(async (item, pickerContext) => {
    const type    = placeType(item);
    const name    = placeName(item);
    const a       = item.address || {};
    const country = a.country || '';
    const destCur = await getCurrencyForCountry(country);
    const formatted = fmtPlace(item);

    if (pickerContext === 'region') {
      // Layer 2: set as single destination, fetch Serper top-spots
      setForm(f => ({ ...f, destination: formatted, destinationCountry: country, destinationCurrency: destCur || f.destinationCurrency }));
      closePicker(); loadHints(name || formatted);
      return;
    }

    if (pickerContext === 'arrivalCity') {
      setForm(f => ({ ...f, arrivalCity: name }));
      closePicker(); return;
    }
    if (pickerContext === 'departureCity') {
      setForm(f => ({ ...f, departureCity: name }));
      closePicker(); return;
    }

    // pickerContext === 'cities' (Layer 1)
    if (type === 'country' || isVastCountry(name)) {
      // Layer 3: show vast warning
      setVastBanner({ name, country, cur: destCur || '', formatted });
      setShowDestPicker(false); setDestSugg([]); setDestQuery('');
      return;
    }

    // Load hints for region picks as a side-effect but still add to route
    if (type === 'region') loadHints(formatted);

    // Add any non-country non-vast place to route (city, town, or administrative region)
    setForm(f => {
      if (f.selectedCities.some(c => c.name === name)) return f;
      const updated = [...f.selectedCities, { name, days: 1 }];
      const dest    = updated.map(c => c.name).join(', ') + (country ? `, ${country}` : '');
      return {
        ...f,
        selectedCities: updated,
        destination: dest,
        destinationMode: 'cities',
        destinationCountry: country || f.destinationCountry,
        destinationCurrency: destCur || f.destinationCurrency,
      };
    });
    setActiveCityName(name);
    loadHints(name);
    setShowDestPicker(false); setDestSugg([]); setDestQuery('');
  }, [createStep, setForm, loadHints]);

  /* ── Free-text destination for region/Lumi mode ── */
  const handleFreeTextRegion = useCallback((text) => {
    const trimmed = text.trim();
    if (trimmed.length < 2 || !looksLikeMeaningfulQuery(trimmed)) return;
    setForm(f => ({ ...f, destination: trimmed, destinationMode: 'region' }));
    setShowDestPicker(false); setDestSugg([]); setDestQuery('');
  }, [setForm]);

  /* ── Add city from Serper hint chip ─────────── */
  const addHint = useCallback(async (name) => {
    if (form.selectedCities.some(c => c.name === name)) return;
    const updated = [...form.selectedCities, { name, days: 1 }];
    const dest    = updated.map(c => c.name).join(', ') + (form.destinationCountry ? `, ${form.destinationCountry}` : '');
    setForm(f => ({ ...f, selectedCities: updated, destination: dest, destinationMode: 'cities' }));
    setActiveCityName(name);
    loadHints(name);
  }, [form.selectedCities, form.destinationCountry, setForm, loadHints]);

  /* ── Remove city ─────────────────────────────── */
  const removeCity = useCallback((name) => {    setActiveCityName(prev => prev === name ? null : prev);    setForm(f => {
      const updated = f.selectedCities.filter(c => c.name !== name);
      const dest    = updated.length > 0 ? updated.map(c => c.name).join(', ') + (f.destinationCountry ? `, ${f.destinationCountry}` : '') : '';
      return { ...f, selectedCities: updated, destination: dest };
    });
  }, [setForm]);

  /* ── Adjust days ─────────────────────────────── */
  const adjustDays = useCallback((name, delta) => {
    setForm(f => ({
      ...f,
      selectedCities: f.selectedCities.map(c => c.name === name ? { ...c, days: Math.max(1, c.days + delta) } : c),
    }));
  }, [setForm]);
  /* ── Toggle highlight for a city ──────────────── */
  const toggleCityHighlight = useCallback((cityName, highlight) => {
    setForm(f => ({
      ...f,
      selectedCities: f.selectedCities.map(c => {
        if (c.name !== cityName) return c;
        const hl = c.highlights || [];
        return { ...c, highlights: hl.includes(highlight) ? hl.filter(h => h !== highlight) : [...hl, highlight] };
      }),
    }));
  }, [setForm]);

  /* ── Toggle Lumi mode highlight preference ──────── */
  const toggleLumiHighlight = useCallback((name) => {
    setForm(f => {
      const h = f.lumiHighlights || [];
      return { ...f, lumiHighlights: h.includes(name) ? h.filter(x => x !== name) : [...h, name] };
    });
  }, [setForm]);
  /* ── Layer 3: pick cities ────────────────────── */
  const vastPickCities = async () => {
    if (!vastBanner) return;
    setForm(f => ({ ...f, destinationMode: 'cities', destinationCountry: vastBanner.country, destinationCurrency: vastBanner.cur || f.destinationCurrency }));
    loadHints(vastBanner.name);
    setVastBanner(null);
  };

  /* ── Layer 3: let Lumi plan (region mode) ────── */
  const vastGoRegion = async () => {
    if (!vastBanner) return;
    setForm(f => ({ ...f, destinationMode: 'region', destination: vastBanner.formatted || vastBanner.name, destinationCountry: vastBanner.country, destinationCurrency: vastBanner.cur || f.destinationCurrency, selectedCities: [] }));
    loadHints(vastBanner.name);
    setVastBanner(null);
  };

  const totalDays = form.selectedCities.reduce((s, c) => s + (c.days || 1), 0);
  const stepW     = `${100 / totalCreateSteps}%`;

  /* ── Smart auto-fill: departure date = arrival + totalDays ─── */
  useEffect(() => {
    if (form.destinationMode !== 'cities' || form.selectedCities.length === 0 || !form.arrival) return;
    const [y, m, d] = form.arrival.split('-').map(Number);
    const dep = new Date(y, m - 1, d + totalDays);
    const iso = `${dep.getFullYear()}-${String(dep.getMonth()+1).padStart(2,'0')}-${String(dep.getDate()).padStart(2,'0')}`;
    setForm(f => f.departure === iso ? f : { ...f, departure: iso });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.arrival, totalDays, form.destinationMode]);

  /* ── Smart auto-fill: departure city = last city in route ─── */
  useEffect(() => {
    if (form.destinationMode !== 'cities' || form.selectedCities.length === 0) return;
    const lastCity = form.selectedCities[form.selectedCities.length - 1].name;
    setForm(f => {
      // only auto-fill if empty or currently set to a city in the route (not a custom value)
      const isRouteCity = f.selectedCities.some(c => c.name === f.departureCity);
      if (!f.departureCity || isRouteCity) return { ...f, departureCity: lastCity };
      return f;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.selectedCities, form.destinationMode]);

  /* ── Dest picker overlay (used by all modes) ─── */
  const DestOverlay = ({ pickerContext }) => {
    const isCityCtx = ['cities', 'arrivalCity', 'departureCity'].includes(pickerContext);
    // cities / arrival / departure: only city-level results
    const visibleSugg = isCityCtx
      ? destSugg.filter(item => {
          const t   = (item.type        || '').toLowerCase();
          const at  = (item.addresstype || '').toLowerCase();
          const a   = item.address || {};
          const NON_CITY = ['country', 'continent', 'state', 'state_district', 'province', 'region', 'district', 'county'];
          const CITY_TYPES = ['city', 'town', 'village', 'suburb', 'hamlet', 'quarter', 'municipality', 'borough'];
          if (NON_CITY.includes(t) || NON_CITY.includes(at)) return false;
          // addresstype is the most reliable signal (e.g. Hanoi: type="administrative", addresstype="city")
          if (CITY_TYPES.includes(at)) return true;
          if (CITY_TYPES.includes(t))  return true;
          if (a.city || a.town || a.village || a.suburb) return true;
          return false;
        })
      : destSugg;
    const TITLES = { cities:'Add a City', region:'Where to?', arrivalCity:'Arriving from', departureCity:'Departing from' };
    const PLACEHOLDERS = { cities:'Search a city…', region:'City, region or country…', arrivalCity:'Search departure city…', departureCity:'Search last city before home…' };
    return (
    <div style={{ position:'absolute', inset:0, zIndex:20, background:'#fff', display:'flex', flexDirection:'column', borderRadius:'inherit' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'1rem 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.08)', flexShrink:0 }}>
        <button onClick={closePicker}
          style={{ width:36, height:36, borderRadius:'50%', border:'1px solid rgba(0,0,0,0.15)', background:'#F0EFE9', color:'#222', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
          <Ic.back />
        </button>
        <div style={{ fontFamily:"'Sora',sans-serif", fontSize:17, fontWeight:700, flex:1 }}>
          {TITLES[pickerContext] || 'Where to?'}
        </div>
      </div>
      <div style={{ padding:'12px 14px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:'#F5F5F3', borderRadius:12, padding:'0 12px', border:'1px solid #E8E8E5' }}>
          <Ic.search />
          <input autoFocus
            style={{ border:'none', background:'transparent', flex:1, padding:'11px 0', fontSize:15, outline:'none', fontFamily:"'DM Sans',sans-serif", color:'#111' }}
            value={destQuery}
            onChange={e => {
              const val = e.target.value;
              setDestQuery(val);
              clearTimeout(destDebounce.current);
              if (!looksLikeMeaningfulQuery(val)) {
                setDestSugg([]);
                return;
              }
              // Show spinner immediately so "Plan X" stays hidden during debounce
              if (val.trim().length >= 2) setDestLoading(true);
              destDebounce.current = setTimeout(() => searchNominatim(val, setDestSugg, setDestLoading), 350);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && pickerContext === 'region') handleFreeTextRegion(destQuery);
            }}
            placeholder={PLACEHOLDERS[pickerContext] || 'Search…'}
          />
          {destLoading && <Spinner />}
          {destQuery && !destLoading && (
            <span onClick={() => { setDestQuery(''); setDestSugg([]); }} style={{ color:'#aaa', cursor:'pointer', display:'flex', flexShrink:0 }}><Ic.close /></span>
          )}
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        {visibleSugg.map((item) => {
          const a = item.address || {};
          const mainText = a.city || a.town || a.village || a.state_district || a.county || a.state || item.display_name.split(',')[0];
          const subText  = [a.state, a.country].filter(Boolean).join(', ');
          return (
            <div key={item.osm_id + item.osm_type}
              onClick={() => handlePickPlace(item, pickerContext)}
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
        {destQuery.length >= 2 && !destLoading && visibleSugg.length === 0 && (
          <div style={{ textAlign:'center', padding: pickerContext === 'cities' ? '2rem 1.5rem 0.5rem' : '4rem 1.5rem', color:'#aaa' }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display:'block', margin:'0 auto 12px' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <div style={{ fontSize:15, fontWeight:600, color:'#555', marginBottom:6 }}>No results for "{destQuery}"</div>
            <div style={{ fontSize:13 }}>{pickerContext === 'cities' ? 'Try a different spelling or nearby city' : 'Try a different name, or press Enter to use it as-is'}</div>
          </div>
        )}
        {/* "Plan X" row: only when search finished and Nominatim found nothing */}
        {pickerContext === 'region' && destQuery.trim().length >= 2 && !destLoading && visibleSugg.length === 0 && (
          <div
            onClick={() => handleFreeTextRegion(destQuery)}
            style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom:'0.5px solid #F0F0F0', cursor:'pointer', background:'#fff', transition:'background .1s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F9F8F5'}
            onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
            <div style={{ width:38, height:38, borderRadius:11, background:AC_BG, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:AC }}>
              <Ic.magic />
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:600, color:'#111', marginBottom:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Plan "{destQuery.trim()}"</div>
              <div style={{ fontSize:12, color:'#999' }}>Let Lumi plan this for you</div>
            </div>
            <span style={{ color:'#ccc' }}><Ic.fwd /></span>
          </div>
        )}
        {destQuery.length >= 4 && !looksLikeMeaningfulQuery(destQuery) && (
          <div style={{ textAlign:'center', padding:'3rem 1.5rem', color:'#aaa' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display:'block', margin:'0 auto 12px' }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div style={{ fontSize:15, fontWeight:600, color:'#555', marginBottom:5 }}>That doesn't look like a place</div>
            <div style={{ fontSize:13 }}>Try a real city, region, or country name</div>
          </div>
        )}
        {destQuery.length < 2 && <div style={{ textAlign:'center', paddingTop:40, color:'#ccc', fontSize:13 }}>Start typing to search…</div>}
      </div>
    </div>
    );
  };

  /* ══════════════════════════════════════════════ */
  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:1200, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(8px)', display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'calc(env(safe-area-inset-top, 0px) + 8svh) 0 0' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes lumiPop  { from{opacity:0;transform:scale(0.94) translateY(18px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes slideUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.45} }
      `}</style>

      <div
        className="tb-modal-pop"
        style={{ width:'100%', maxWidth:460, height:'min(680px, 92svh)', background:'#fff', borderRadius:'28px 28px 0 0', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 28px 80px rgba(0,0,0,0.22)', animation:'lumiPop .32s cubic-bezier(.16,.84,.24,1.04) both', position:'relative' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dest picker — modal-level so it overlays header+slides+footer from any step */}
        {showDestPicker && <div style={{ position:'absolute', inset:0, zIndex:30, borderRadius:'inherit' }}>{DestOverlay({ pickerContext: destPickerFor })}</div>}

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
          <div style={{ display:'flex', alignItems:'center' }}>
            {Array.from({ length: totalCreateSteps }, (_, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', flex: i < totalCreateSteps - 1 ? 1 : 'none' }}>
                <div onClick={() => i < createStep && setCreateStep(i)}
                  style={{ width: i === createStep ? 12 : 9, height: i === createStep ? 12 : 9, borderRadius:'50%', background: i <= createStep ? AC : '#E5E5E5', transition:'all .25s', cursor: i < createStep ? 'pointer' : 'default', flexShrink:0, boxShadow: i === createStep ? `0 0 0 3px ${AC}33` : 'none' }}
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

            {/* ══ STEP 0: Solo/Group + Trip name ══ */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.5rem 1.25rem' }}>
              <LumiStep question="Squad trip or flying solo?" subtitle="I'll pack my advice accordingly" />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:22 }}>
                {[
                  {
                    val: false, label:'Group', sub:'Travel together',
                    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                    silhouette: (
                      <svg width="80" height="54" viewBox="0 0 80 54" fill="none" style={{ position:'absolute', bottom:0, right:0, opacity:0.13 }}>
                        <ellipse cx="40" cy="53" rx="36" ry="6" fill="#FF6A00"/>
                        <circle cx="19" cy="18" r="7" fill="#FF6A00"/>
                        <rect x="12" y="26" width="14" height="20" rx="4" fill="#FF6A00"/>
                        <circle cx="40" cy="14" r="8" fill="#FF6A00"/>
                        <rect x="32" y="23" width="16" height="23" rx="5" fill="#FF6A00"/>
                        <circle cx="61" cy="18" r="7" fill="#FF6A00"/>
                        <rect x="54" y="26" width="14" height="20" rx="4" fill="#FF6A00"/>
                      </svg>
                    ),
                  },
                  {
                    val: true, label:'Solo', sub:'Just me',
                    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
                    silhouette: (
                      <svg width="56" height="58" viewBox="0 0 56 58" fill="none" style={{ position:'absolute', bottom:0, right:0, opacity:0.13 }}>
                        <ellipse cx="28" cy="57" rx="22" ry="5" fill="#555"/>
                        <circle cx="28" cy="12" r="8" fill="#555"/>
                        <rect x="21" y="22" width="14" height="26" rx="5" fill="#555"/>
                        {/* backpack */}
                        <rect x="30" y="24" width="9" height="14" rx="3" fill="#555"/>
                      </svg>
                    ),
                  },
                ].map(({ val, label, sub, icon, silhouette }) => {
                  const sel = isSoloMode === val;
                  return (
                    <button key={String(val)} type="button" onClick={() => setIsSoloMode(val)}
                      style={{ position:'relative', padding:'16px 14px 14px', borderRadius:18, border:`1.5px solid ${sel ? AC_BR : 'rgba(15,23,42,0.09)'}`, background: sel ? AC_BG : '#fff', cursor:'pointer', textAlign:'left', transition:'all .2s', overflow:'hidden', minHeight:110, boxShadow: sel ? `0 2px 16px ${AC}28` : '0 1px 4px rgba(0,0,0,0.04)' }}>
                      {/* Icon circle */}
                      <div style={{ width:42, height:42, borderRadius:'50%', background: sel ? `${AC}22` : '#F3F3F1', display:'flex', alignItems:'center', justifyContent:'center', color: sel ? AC : '#aaa', marginBottom:12, transition:'all .2s' }}>
                        {icon}
                      </div>
                      {/* Labels */}
                      <div style={{ fontSize:16, fontWeight:800, color: sel ? AC : '#1a1a18', marginBottom:2, fontFamily:"'Sora',sans-serif", lineHeight:1.2 }}>{label}</div>
                      <div style={{ fontSize:12, color: sel ? `${AC}bb` : '#aaa', fontWeight:500 }}>{sub}</div>
                      {/* Checkmark badge */}
                      {sel && (
                        <div style={{ position:'absolute', top:12, right:12, width:24, height:24, borderRadius:'50%', background:AC, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 2px 8px ${AC}55` }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      )}
                      {/* Silhouette illustration */}
                      {silhouette}
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

            {/* ══ STEP 1: Pick travel type ══ */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.5rem 1.25rem' }}>
              <LumiStep question="How do you want to explore?" subtitle="This helps me tailor the planning for you" />
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {[
                  {
                    mode:'cities',
                    label:'City or Multiple Cities',
                    sub:'Plan a trip with a city or multiple cities or stops',
                    example:'Ex: Mumbai → Pune → Bangalore',
                    img: route3dImg,
                  },
                  {
                    mode:'region',
                    label:'Anywhere in the World',
                    sub:'Plan anywhere in a region, state or country',
                    example:'Ex: Vietnam, Bali, California',
                    img: globe3dImg,
                  },
                ].map(({ mode, label, sub, example, img }) => (
                  <button key={mode} type="button"
                    onClick={() => {
                      setForm(f => ({ ...f, destinationMode: mode, selectedCities: mode === 'region' ? [] : f.selectedCities, destination: mode === 'region' ? '' : f.destination }));
                      setHints([]);
                      setHintsFor('');
                      nextCreateStep();
                    }}
                    style={{ position:'relative', padding:'14px 16px', borderRadius:18, border:`2px solid ${AC_BR}`, background:'#fff', cursor:'pointer', textAlign:'left', transition:'all .18s', boxShadow:'0 2px 10px rgba(255,106,0,0.08)', overflow:'hidden', display:'flex', flexDirection:'row', alignItems:'center', gap:16 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = AC; e.currentTarget.style.boxShadow = `0 4px 20px ${AC}30`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = AC_BR; e.currentTarget.style.boxShadow = '0 2px 10px rgba(255,106,0,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    <img src={img} alt={label} style={{ width:100, height:90, objectFit:'contain', flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:15, fontWeight:800, color:AC, marginBottom:4, fontFamily:"'Sora',sans-serif", lineHeight:1.2 }}>{label}</div>
                      <div style={{ fontSize:12, color:'#666', lineHeight:1.45, marginBottom:10 }}>{sub}</div>
                      <div style={{ fontSize:10.5, color:AC, fontWeight:600, background:AC_BG, borderRadius:6, padding:'4px 8px', border:`1px solid ${AC_BR}`, display:'inline-block' }}>{example}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ══ STEP 2: Destination search ══ */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.5rem 1.25rem', position:'relative' }}>

              {/* ── Layer 3: Vast country banner ── */}
              {vastBanner && (
                <div style={{ position:'absolute', inset:0, zIndex:15, background:'rgba(255,255,255,0.97)', backdropFilter:'blur(4px)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'2rem 1.5rem', animation:'slideUp .22s ease both', borderRadius:'inherit' }}>
                  <div style={{ fontSize:52, marginBottom:14 }}>🌍</div>
                  <div style={{ fontFamily:"'Sora',sans-serif", fontSize:20, fontWeight:800, color:'#111', textAlign:'center', marginBottom:10, lineHeight:1.3 }}>
                    {vastBanner.name} is a vast destination!
                  </div>
                  <div style={{ fontSize:13.5, color:'#777', textAlign:'center', marginBottom:28, lineHeight:1.65, maxWidth:300 }}>
                    It covers a lot of ground. Want to pick specific cities, or let Lumi plan the best highlights for you?
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, width:'100%', maxWidth:310 }}>
                    <button type="button" onClick={vastPickCities}
                      style={{ padding:'14px 10px', borderRadius:16, background:`linear-gradient(135deg,${AC_L},${AC})`, border:'none', color:'#fff', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, boxShadow:`0 4px 18px ${AC}44` }}>
                      <span style={{ display:'flex' }}><Ic.city /></span>
                      <span style={{ fontSize:13.5, fontWeight:700 }}>Pick Cities</span>
                      <span style={{ fontSize:11, opacity:0.9, textAlign:'center' }}>I'll plan the route</span>
                    </button>
                    <button type="button" onClick={vastGoRegion}
                      style={{ padding:'14px 10px', borderRadius:16, background:'#fff', border:`1.5px solid ${AC_BR}`, color:AC, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                      <span style={{ display:'flex' }}><Ic.magic /></span>
                      <span style={{ fontSize:13.5, fontWeight:700 }}>Lumi Explores</span>
                      <span style={{ fontSize:11, color:'#aaa', textAlign:'center' }}>AI-planned route</span>
                    </button>
                  </div>
                  <button type="button" onClick={() => setVastBanner(null)}
                    style={{ marginTop:20, fontSize:12, color:'#aaa', background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>
                    Go back
                  </button>
                </div>
              )}

              <LumiStep
                question={form.destinationMode === 'cities' ? 'Which cities are you visiting?' : 'Where in the world?'}
                subtitle={form.destinationMode === 'cities' ? "Add your visiting city or cities" : "Drop a country, region or state — I'll plan the route"}
              />


              {/* ═══ LAYER 1: Cities mode ═══ */}
              {form.destinationMode === 'cities' && (
                <div style={{ position:'relative' }}>
                  <div
                    onClick={() => openPicker('cities')}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 14px', borderRadius:50, border:`1.5px solid ${AC_BR}`, background:AC_BG, cursor:'pointer', marginBottom:14, userSelect:'none' }}>
                    <Ic.search />
                    <span style={{ flex:1, fontSize:13, color:AC_L, fontWeight:600 }}>+ Add a city to your route</span>
                    <Ic.fwd />
                  </div>

                  {/* Selected cities */}
                  {form.selectedCities.length > 0 ? (
                    <>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                        <div style={{ fontSize:11, fontWeight:700, color:'#bbb', letterSpacing:1.1, textTransform:'uppercase' }}>Your Route</div>
                        <div style={{ fontSize:12, color:'#aaa', fontWeight:500 }}>{form.selectedCities.length > 1 ? `${totalDays} day${totalDays !== 1 ? 's' : ''} total` : ''}</div>
                      </div>
                      {form.selectedCities.map((city, i) => (
                        <CityRow key={city.name} city={city} isLast={i === form.selectedCities.length - 1}
                          showCounter={form.selectedCities.length > 1}
                          isActive={activeCityName === city.name}
                          onActivate={() => {
                            if (activeCityName === city.name) { setActiveCityName(null); }
                            else { setActiveCityName(city.name); loadHints(city.name); }
                          }}
                          onRemove={() => removeCity(city.name)} onAdjust={(d) => adjustDays(city.name, d)} />
                      ))}
                      {/* Per-city hints — shown when a city is active */}
                      {activeCityName && (
                        <div style={{ marginBottom:10 }}>
                          {hintsLoading
                            ? <ShimmerChips />
                            : hints.length > 0 ? (
                              <>
                                <div style={{ fontSize:11, fontWeight:700, color:'#bbb', letterSpacing:1.1, textTransform:'uppercase', marginBottom:8 }}>Must-see in {activeCityName}</div>
                                <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                                  {hints.map(n => (
                                    <HintChip key={n} label={n}
                                      selected={(form.selectedCities.find(c => c.name === activeCityName)?.highlights || []).includes(n)}
                                      onAdd={() => toggleCityHighlight(activeCityName, n)} />
                                  ))}
                                </div>
                              </>
                            ) : null
                          }
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign:'center', padding:'18px 0 10px', color:'#ccc' }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'#bbb' }}>No cities added yet</div>
                    </div>
                  )}



                </div>
              )}

              {/* ═══ LAYER 2: Region / Let Lumi Plan mode ═══ */}
              {form.destinationMode === 'region' && (
                <div style={{ position:'relative' }}>
                  {!form.destination ? (
                    <div
                      onClick={() => openPicker('region')}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderRadius:14, border:'1.5px solid rgba(15,23,42,0.12)', background:'#fff', cursor:'pointer', marginBottom:14, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                      <Ic.pin c="#bbb" />
                      <span style={{ flex:1, fontSize:15, color:'#aaa' }}>Search destination (city, region, country)…</span>
                      <Ic.fwd />
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderRadius:14, border:`1.5px solid ${AC_BR}`, background:AC_BG, marginBottom:14 }}>
                      <Ic.pin c={AC} />
                      <span style={{ flex:1, fontSize:15, fontWeight:700, color:AC }}>{form.destination}</span>
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, destination:'', destinationCountry:'', destinationCurrency:'' }))}
                        style={{ width:26, height:26, borderRadius:8, border:'1px solid rgba(0,0,0,0.08)', background:'#fff', color:'#aaa', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                        <Ic.close />
                      </button>
                    </div>
                  )}

                  {form.destination && (
                    looksLikeMeaningfulQuery(form.destination)
                    ? (
                    <div style={{ background:`linear-gradient(135deg,${AC_BG},#FFF8F2)`, borderRadius:16, padding:'14px 16px', border:`1px solid ${AC_BR}`, marginBottom:14 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                        <img src={lumiImg} alt="Lumi" style={{ width:26, height:26, objectFit:'contain' }} />
                        <div style={{ fontSize:13, fontWeight:800, color:AC }}>Lumi will craft your route!</div>
                      </div>
                      <div style={{ fontSize:12.5, color:'#888', lineHeight:1.6 }}>
                        I'll research the best places in <strong style={{ color:'#555' }}>{form.destination}</strong>, plan the cities, cover intercity travel (trains/flights), and tailor it to your trip duration.
                      </div>
                      {/* Selected highlights shown as removable pills */}
                      {form.lumiHighlights && form.lumiHighlights.length > 0 && (
                        <div style={{ marginTop:10, display:'flex', gap:6, flexWrap:'wrap' }}>
                          {form.lumiHighlights.map(h => (
                            <div key={h} onClick={() => toggleLumiHighlight(h)}
                              style={{ fontSize:11, fontWeight:600, color:AC, background:`${AC}18`, borderRadius:20, padding:'3px 9px', border:`1px solid ${AC_BR}`, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
                              {h}
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    ) : (
                    <div style={{ background:'#FFF8F2', borderRadius:16, padding:'14px 16px', border:'1px solid #FFD4B2', marginBottom:14, display:'flex', gap:10, alignItems:'flex-start' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF8C3A" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, marginTop:1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:'#d97a18', marginBottom:3 }}>That doesn't look like a real place</div>
                        <div style={{ fontSize:12, color:'#aaa', lineHeight:1.5 }}>Please search and select a meaningful destination so Lumi can plan your trip.</div>
                      </div>
                      <button type="button" onClick={() => setForm(f => ({ ...f, destination:'', destinationCountry:'', destinationCurrency:'' }))}
                        style={{ width:24, height:24, borderRadius:7, border:'1px solid rgba(0,0,0,0.08)', background:'#fff', color:'#bbb', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, marginLeft:'auto' }}>
                        <Ic.close />
                      </button>
                    </div>
                    )
                  )}

                  {/* Serper suggestions as tappable chips */}
                  {(hintsLoading || hints.length > 0) && (
                    <div style={{ marginTop: form.destination ? 0 : 10 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#bbb', letterSpacing:1.2, textTransform:'uppercase', marginBottom:10 }}>
                        {hintsLoading ? 'Discovering top spots…' : `Popular Picks · ${hintsFor}`}
                      </div>
                      {hintsLoading ? <ShimmerChips /> : (
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                          {hints.map(n => (
                            <HintChip key={n} label={n}
                              selected={(form.lumiHighlights || []).includes(n)}
                              onAdd={() => toggleLumiHighlight(n)} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* ══ STEP 3: Arrival date, time & origin city ══ */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.5rem 1.25rem' }}>
              <LumiStep question="When do you land?" subtitle="I need to know so I don't plan brunch at 3 AM" />
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
              <div style={{ fontSize:12, fontWeight:600, color:'#555', marginTop:22, marginBottom:8 }}>Arriving from</div>
              {form.arrivalCity ? (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:14, border:`1.5px solid ${AC_BR}`, background:AC_BG, marginBottom:4 }}>
                  <Ic.pin c={AC} />
                  <span style={{ flex:1, fontSize:14, fontWeight:600, color:AC }}>{form.arrivalCity}</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, arrivalCity:'' }))}
                    style={{ width:24, height:24, borderRadius:7, border:'1px solid rgba(0,0,0,0.08)', background:'#fff', color:'#bbb', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}><Ic.close /></button>
                </div>
              ) : (
                <div onClick={() => openPicker('arrivalCity')}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:14, border:'1.5px solid rgba(15,23,42,0.1)', background:'#F9F8F5', cursor:'pointer', userSelect:'none' }}>
                  <Ic.search />
                  <span style={{ flex:1, fontSize:14, color:'#aaa' }}>Search departure city…</span>
                  <Ic.fwd />
                </div>
              )}
            </div>

            {/* ══ STEP 4: Departure date, time & destination city ══ */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.5rem 1.25rem' }}>
              <LumiStep question="When do you have to go home?" subtitle="I'll squeeze every last adventure in before then" />
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
              <div style={{ fontSize:12, fontWeight:600, color:'#555', marginTop:22, marginBottom:8 }}>Departing from</div>
              {form.departureCity ? (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:14, border:`1.5px solid ${AC_BR}`, background:AC_BG, marginBottom:4 }}>
                  <Ic.pin c={AC} />
                  <span style={{ flex:1, fontSize:14, fontWeight:600, color:AC }}>{form.departureCity}</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, departureCity:'' }))}
                    style={{ width:24, height:24, borderRadius:7, border:'1px solid rgba(0,0,0,0.08)', background:'#fff', color:'#bbb', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}><Ic.close /></button>
                </div>
              ) : (
                <div onClick={() => openPicker('departureCity')}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:14, border:'1.5px solid rgba(15,23,42,0.1)', background:'#F9F8F5', cursor:'pointer', userSelect:'none' }}>
                  <Ic.search />
                  <span style={{ flex:1, fontSize:14, color:'#aaa' }}>Search last city before home…</span>
                  <Ic.fwd />
                </div>
              )}
            </div>

            {/* ══ STEP 5: Budget ══ */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.5rem 1.25rem' }}>
              <LumiStep question="What's the spend limit?" subtitle="Champagne dreams or backpacker vibes — I got you" />
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
                  ? <><Spinner />Fetching live rate…</>
                  : fxError ? fxError
                  : form.destinationCurrency && form.budgetCurrency !== form.destinationCurrency
                    ? `1 ${form.budgetCurrency} = ${fxRate.toFixed(4)} ${form.destinationCurrency} · refreshed daily`
                  : form.destinationCurrency ? 'Same currency — no conversion needed'
                  : 'Select destination first to see conversion'
                }
              </div>
            </div>

            {/* ══ STEP 5: Travel notes ══ */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.5rem 1.25rem' }}>
              <LumiStep question="Anything I should know?" subtitle="Dietary needs, pace, allergies — spill it, I'm all ears" />
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

            {/* ══ STEP 6: Review ══ */}
            <div style={{ width:stepW, flex:`0 0 ${stepW}`, height:'100%', overflowY:'auto', boxSizing:'border-box', padding:'1.5rem 1.25rem' }}>
              <LumiStep img={lumi8Img} question="Looks like a banger trip!" subtitle="One last look before I start planning the magic" />
              <div style={{ background:'#fff', borderRadius:18, border:'1.5px solid rgba(15,23,42,0.07)', overflow:'hidden', marginBottom:14, boxShadow:'0 2px 12px rgba(0,0,0,0.04)' }}>
                {[
                  { icon:<Ic.edit />,  label:'Trip name',    value: form.groupName || '—', editable:true, step:0 },
                  { icon:<Ic.type />,  label:'Travel type',  value: isSoloMode ? 'Solo trip' : 'Group trip' },
                  { icon:<Ic.pin />,   label:'Destination',  value: form.destinationMode === 'cities' && form.selectedCities.length > 0 ? `${form.selectedCities.length} cit${form.selectedCities.length > 1 ? 'ies' : 'y'} · ${totalDays}d total` : (form.destination || '—') },
                  { icon:<Ic.cal />,   label:'Dates',        value: form.arrival && form.departure ? `${fmtDateDisplay(form.arrival)} → ${fmtDateDisplay(form.departure)}` : form.arrival ? fmtDateDisplay(form.arrival) : '—' },
                  { icon:<Ic.money />, label:'Budget',       value: form.budget ? `${form.budgetCurrency} ${Number(form.budget).toLocaleString()}${form.destinationCurrency && form.destinationCurrency !== form.budgetCurrency ? ` ≈ ${form.destinationCurrency} ${Number(convertedBudget).toLocaleString(undefined,{maximumFractionDigits:0})}` : ''}` : 'Not set' },
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

              {/* Multi-city route summary */}
              {form.destinationMode === 'cities' && form.selectedCities.length > 0 && (
                <div style={{ background:AC_BG, borderRadius:14, padding:'12px 16px', border:`1px solid ${AC_BR}`, marginBottom:10 }}>
                  <div style={{ fontSize:10.5, fontWeight:700, color:AC, letterSpacing:1.2, textTransform:'uppercase', marginBottom:10 }}>Multi-City Route</div>
                  {form.selectedCities.map((c, i) => (
                    <div key={c.name} style={{ display:'flex', alignItems:'center', gap:8, marginBottom: i < form.selectedCities.length-1 ? 7 : 0 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:AC, flexShrink:0 }} />
                      <span style={{ flex:1, fontSize:13, fontWeight:600, color:'#333' }}>{c.name}</span>
                      <span style={{ fontSize:12, fontWeight:800, color:AC }}>{c.days} day{c.days > 1 ? 's' : ''}</span>
                    </div>
                  ))}
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:10, paddingTop:10, borderTop:`1px solid ${AC_BR}` }}>
                    <Ic.info />
                    <span style={{ fontSize:11.5, color:'#888' }}>Lumi will add transit days between cities in your itinerary</span>
                  </div>
                </div>
              )}

              {/* AI region plan info */}
              {form.destinationMode === 'region' && form.destination && (
                <div style={{ background:'#F7F6F2', borderRadius:14, padding:'11px 14px', border:'1px solid #E8E8E5' }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'#bbb', letterSpacing:1, textTransform:'uppercase', marginBottom:6 }}>AI-Planned Route</div>
                  <div style={{ fontSize:13, color:'#555', lineHeight:1.5 }}>Lumi will research and plan the best route through <strong>{form.destination}</strong>, including cities, travel days, and intercity connections.</div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ padding:'0.875rem 1.1rem calc(0.875rem + env(safe-area-inset-bottom,0px))', borderTop:'1px solid rgba(0,0,0,0.06)', display:'flex', gap:10, background:'#fff', flexShrink:0 }}>
          {createStep > 0 && (
            <button onClick={prevCreateStep}
              style={{ width:46, height:46, borderRadius:'50%', border:'1.5px solid rgba(0,0,0,0.12)', background:'#fff', color:'#555', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
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
    </div>
  );
}
