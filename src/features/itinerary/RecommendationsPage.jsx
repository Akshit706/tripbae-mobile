// src/features/itinerary/RecommendationsPage.jsx
// Premium "Nearby" tab — Stays · Healthcare · Rentals
import { useState, useEffect, useRef } from 'react';
import { PlacePhoto } from '../media/PlaceMedia';
import { fetchRecommendations, fetchPlacePhotos } from '../../api';

/* ── Design tokens ── */
const D = {
  bg:'#FAF8F4', surface:'#FFFFFF', espresso:'#1C1410',
  gold:'#C9913A', goldTint:'#FDF3E3', sage:'#7A9E7E', sageTint:'#EBF3EC',
  coral:'#E8715A', coralTint:'#FDF0EE', blueTint:'#E6F1FB',
  neutral:'#F4F2EE', muted:'#8A7E76', secondary:'#5C504A',
  divider:'rgba(28,20,16,0.06)', border:'rgba(28,20,16,0.09)',
  shadow:'0 2px 10px rgba(28,20,16,0.07)', shadowMd:'0 4px 20px rgba(28,20,16,0.11)',
};

/* ── Inject CSS ── */
if (typeof document !== 'undefined' && !document.getElementById('recs-v2-styles')) {
  const el = document.createElement('style');
  el.id = 'recs-v2-styles';
  el.textContent = `
    @keyframes rSlideUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes rFadeIn   { from{opacity:0} to{opacity:1} }
    @keyframes rShimmer  { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
    @keyframes rPulse24  { 0%,100%{box-shadow:0 0 0 0 rgba(185,28,28,0.4)} 50%{box-shadow:0 0 0 6px rgba(185,28,28,0)} }
    @keyframes rBounce   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
    @keyframes rCountUp  { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
    @keyframes rSheetIn   { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
    @keyframes rSlideRight { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:translateX(0)} }
    @keyframes rSlideLeft  { from{opacity:0;transform:translateX(-28px)} to{opacity:1;transform:translateX(0)} }
    .r-card { animation: rSlideUp 0.38s cubic-bezier(0.34,1.2,0.64,1) both; }
    .r-card:nth-child(2) { animation-delay:50ms }
    .r-card:nth-child(3) { animation-delay:100ms }
    .r-card:nth-child(4) { animation-delay:150ms }
    .r-card:nth-child(5) { animation-delay:200ms }
    .r-card:nth-child(n+6) { animation-delay:250ms }
    .r-hotel-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
    .r-hotel-card:active { transform: scale(0.97); }
    .r-chip { transition: all 0.18s cubic-bezier(0.34,1.3,0.64,1); }
    .r-chip:active { transform: scale(0.95); }
    .r-shimmer {
      background: linear-gradient(90deg,#f0ede8 25%,#e8e4dc 50%,#f0ede8 75%);
      background-size: 1200px 100%;
      animation: rShimmer 1.5s ease-in-out infinite;
    }
    .r-pulse-24 { animation: rPulse24 1.8s ease-in-out infinite; }
    .r-stat-num { animation: rCountUp 0.5s cubic-bezier(0.34,1.3,0.64,1) both; }
    .r-hosp-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
    .r-hosp-card:active { transform: scale(0.98); }
    .r-bounce { animation: rBounce 2s ease-in-out infinite; }
    .r-fade { animation: rFadeIn 0.4s ease both; }
    .r-sheet-in { animation: rSheetIn 0.28s cubic-bezier(0.2,0.7,0.2,1) both; }
    input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;border-radius:50%;background:#C9913A;cursor:pointer;box-shadow:0 2px 6px rgba(201,145,58,0.38)}
    input[type=range]::-moz-range-thumb{width:20px;height:20px;border-radius:50%;background:#C9913A;cursor:pointer;border:none;box-shadow:0 2px 6px rgba(201,145,58,0.38)}
    input[type=range]:focus{outline:none}
  `;
  document.head.appendChild(el);
}

/* ── Skeleton loader ── */
function Skeleton({ h = 16, w = '100%', radius = 8, style = {} }) {
  return <div className="r-shimmer" style={{ height: h, width: w, borderRadius: radius, ...style }} />;
}
function HotelSkeleton() {
  return (
    <div style={{ background: D.surface, borderRadius: 18, overflow: 'hidden', boxShadow: D.shadow, border: `0.5px solid ${D.border}` }}>
      <Skeleton h={160} radius={0} />
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton h={14} w="70%" />
        <Skeleton h={10} w="40%" />
        <Skeleton h={10} w="85%" />
      </div>
    </div>
  );
}
function HospSkeleton() {
  return (
    <div style={{ background: D.surface, borderRadius: 14, padding: '14px', boxShadow: D.shadow, border: `0.5px solid ${D.border}`, display: 'flex', gap: 12 }}>
      <Skeleton h={44} w={44} radius={12} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton h={14} w="60%" />
        <Skeleton h={10} w="35%" />
        <Skeleton h={10} w="80%" />
      </div>
    </div>
  );
}

/* ── Stars ── */
function Stars({ rating }) {
  if (!rating) return null;
  const r = parseFloat(rating); if (isNaN(r)) return null;
  const full = Math.floor(r), half = r - full >= 0.3;
  const stars = Array.from({length:5},(_,i)=> i<full?'★': i===full&&half?'½':'☆');
  return (
    <span style={{ fontSize: 11.5, letterSpacing: 0.3, display:'inline-flex', alignItems:'center', gap: 1 }}>
      <span style={{ color:'#F59E0B' }}>{stars.slice(0,full+(half?1:0)).join('')}</span>
      <span style={{ color:'#D4D0C4' }}>{stars.slice(full+(half?1:0)).join('')}</span>
      <span style={{ fontSize:10, color:D.muted, marginLeft:4, fontFamily:"'DM Sans',sans-serif" }}>{r.toFixed(1)}</span>
    </span>
  );
}

/* ── Stay type config ── */
const STAY_CFG = {
  hotel:      { icon:'🏨', label:'Hotel',      bg:'#EBF3FB', color:'#1E5FA3' },
  hostel:     { icon:'🛏️', label:'Hostel',     bg:D.sageTint, color:'#166534' },
  guesthouse: { icon:'🏡', label:'Guesthouse', bg:D.goldTint, color:'#92400E' },
  resort:     { icon:'🌴', label:'Resort',     bg:'#FDF0EE',  color:'#9D2A0F' },
  homestay:   { icon:'🏠', label:'Homestay',   bg:'#F0FDF4',  color:'#15803D' },
  apartment:  { icon:'🏢', label:'Apartment',  bg:'#F0F9FF',  color:'#0369A1' },
  villa:      { icon:'🏛️', label:'Villa',      bg:'#FFF7ED',  color:'#C2410C' },
  bnb:        { icon:'☕', label:'B&B',        bg:'#FFFBEB',  color:'#A16207' },
};
const PRICE_CFG = {
  budget: { label:'Budget', icon:'₹',   bg:'#ECFDF5', color:'#065F46' },
  mid:    { label:'Mid',    icon:'₹₹',  bg:D.goldTint, color:'#92400E' },
  luxury: { label:'Luxury', icon:'₹₹₹', bg:'#FFF0F6',  color:'#9B2260' },
};
const PRICE_RANGES = [
  { v:'all',    l:'Any',         sub:'' },
  { v:'budget', l:'Budget',      sub:'Under ₹2,000/night' },
  { v:'mid',    l:'Mid-range',   sub:'₹2,000 – ₹6,000/night' },
  { v:'luxury', l:'Luxury',      sub:'₹6,000+/night' },
];
const PRICE_DISPLAY = {
  budget: '< ₹2,000 / night',
  mid:    '₹2,000 – ₹6,000 / night',
  luxury: '₹6,000+ / night',
};
const CAT_CFG = {
  hospital:  { icon:'🏥', label:'Hospital',  bg:'#FEE2E2', color:'#B91C1C' },
  clinic:    { icon:'🩺', label:'Clinic',    bg:D.blueTint, color:'#1D4ED8' },
  pharmacy:  { icon:'💊', label:'Pharmacy',  bg:D.sageTint, color:'#166534' },
  emergency: { icon:'🚨', label:'Emergency', bg:'#FEF3C7', color:'#92400E' },
};
const RENTAL_CFG = {
  car:     { icon:'🚗', label:'Car',     bg:D.blueTint,  color:'#1D4ED8' },
  bike:    { icon:'🏍️', label:'Bike',    bg:D.sageTint,  color:'#166534' },
  scooter: { icon:'🛵', label:'Scooter', bg:D.goldTint,  color:'#92400E' },
  cycle:   { icon:'🚲', label:'Cycle',   bg:'#F4F3FF',   color:'#534AB7' },
};const RATINGS = [
  {v:0,   l:'Any'},
  {v:3.0, l:'Pleasant'},
  {v:3.5, l:'Good'},
  {v:4.0, l:'Very Good'},
  {v:4.5, l:'Excellent'},
  {v:4.7, l:'Exceptional'},
];
const HOTEL_STARS = [
  {v:0, l:'Any'},
  {v:1, l:'1 ★'},
  {v:2, l:'2 ★★'},
  {v:3, l:'3 ★★★'},
  {v:4, l:'4 ★★★★'},
  {v:5, l:'5 ★★★★★'},
];
/* ── FilterChip ── */
function FilterChip({ label, active, onClick, bg, color }) {
  const defaultBg    = active ? (bg || D.goldTint) : D.surface;
  const defaultColor = active ? (color || D.gold) : D.muted;
  return (
    <button
      onClick={onClick}
      className="r-chip"
      style={{
        flexShrink:0, fontSize:11.5, fontWeight:700, padding:'6px 13px', borderRadius:999,
        border:`1.5px solid ${active ? (color||D.gold) : D.border}`,
        background: defaultBg, color: defaultColor,
        cursor:'pointer', fontFamily:"'DM Sans',sans-serif",
        whiteSpace:'nowrap',
      }}
    >{label}</button>
  );
}

/* ── ModalChip ── */
function ModalChip({ label, active, onClick, bg, color }) {
  return (
    <button onClick={onClick} className="r-chip"
      style={{
        fontSize:12, fontWeight:700, padding:'7px 14px', borderRadius:999,
        border:`1.5px solid ${active ? (color||D.gold) : 'rgba(28,20,16,0.13)'}`,
        background: active ? (bg || D.goldTint) : '#FAFAF8',
        color: active ? (color || D.gold) : '#7A7470',
        cursor:'pointer', fontFamily:"'DM Sans',sans-serif", whiteSpace:'nowrap',
      }}
    >{label}</button>
  );
}

/* ── Filter section label ── */
function FilterLabel({ children }) {
  return (
    <div style={{ fontSize:10,fontWeight:800,color:'#6B6B68',textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8 }}>
      {children}
    </div>
  );
}

/* ── Filter Modal — section-scoped ── */
function FilterModal({ open, onClose, hotels, hospitals, rentals, draft, setDraft, onApply, onReset, section }) {
  if (!open || !section) return null;
  const availStayTypes = ['hotel','hostel','guesthouse','resort','homestay','apartment','villa','bnb'].filter(t => hotels.some(h => h.stayType === t));
  const availHospCats  = ['hospital','emergency','clinic','pharmacy'].filter(c => hospitals.some(h => h.category === c));
  const availRentTypes = ['car','bike','scooter','cycle'].filter(t => rentals.some(r => r.type === t));
  const titles = { stays: '🛏️  Stay Filters', healthcare: '🏥  Healthcare Filters', rentals: '🚗  Rental Filters' };
  return (
    <div
      style={{ position:'fixed',inset:0,background:'rgba(14,16,24,0.45)',zIndex:600,display:'flex',alignItems:'flex-end',justifyContent:'center',animation:'rFadeIn .2s ease-out both' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="r-sheet-in" style={{ width:'100%',maxWidth:560,background:'#fff',borderRadius:'24px 24px 0 0',padding:'1.1rem 1.1rem 2rem',boxShadow:'0 -8px 40px rgba(0,0,0,0.18)',maxHeight:'82vh',overflowY:'auto' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <div style={{ fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:800 }}>{titles[section]}</div>
          <button onClick={onClose} style={{ width:30,height:30,borderRadius:'50%',border:'1px solid rgba(0,0,0,0.1)',background:'rgba(0,0,0,0.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#6b6b68',padding:0 }}>✕</button>
        </div>
        {section === 'stays' && (
          <div style={{ display:'flex',flexDirection:'column',gap:11,marginBottom:16 }}>
            {/* Accommodation Type */}
            <div style={{ background:'#FDFCFA',borderRadius:14,padding:'12px 13px',border:'1px solid rgba(28,20,16,0.07)' }}>
              <FilterLabel>Accommodation Type</FilterLabel>
              <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                <ModalChip label="All" active={draft.stayType==='all'} onClick={()=>setDraft(f=>({...f,stayType:'all'}))} bg={D.goldTint} color={D.gold} />
                {availStayTypes.map(t => { const c=STAY_CFG[t]||STAY_CFG.hotel; return <ModalChip key={t} label={c.label} active={draft.stayType===t} onClick={()=>setDraft(f=>({...f,stayType:t}))} bg={c.bg} color={c.color} />; })}
              </div>
            </div>
            {/* Price Range */}
            <div style={{ background:'#FDFCFA',borderRadius:14,padding:'12px 13px',border:'1px solid rgba(28,20,16,0.07)' }}>
              <FilterLabel>Price Range</FilterLabel>
              <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                {PRICE_RANGES.map(p => (
                  <button key={p.v} onClick={()=>setDraft(f=>({...f,priceLevel:p.v}))}
                    style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
                      padding:'9px 13px',borderRadius:11,textAlign:'left',
                      border:`1.5px solid ${draft.priceLevel===p.v ? D.gold : 'rgba(28,20,16,0.10)'}`,
                      background: draft.priceLevel===p.v ? D.goldTint : '#FAFAF8',
                      cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }}>
                    <span style={{ fontSize:13,fontWeight:700,color:draft.priceLevel===p.v ? D.gold : D.espresso }}>{p.l}</span>
                    {p.sub && <span style={{ fontSize:11,color:draft.priceLevel===p.v ? '#A8731E' : D.muted }}>{p.sub}</span>}
                    {draft.priceLevel===p.v && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={D.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
            {/* Guest Rating */}
            <div style={{ background:'#FDFCFA',borderRadius:14,padding:'12px 13px',border:'1px solid rgba(28,20,16,0.07)' }}>
              <FilterLabel>Guest Rating</FilterLabel>
              <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                {RATINGS.map(r => <ModalChip key={r.v} label={r.l} active={draft.minRating===r.v} onClick={()=>setDraft(p=>({...p,minRating:r.v}))} bg='#FEF9EE' color='#92400E' />)}
              </div>
            </div>
            {/* Hotel Stars */}
            <div style={{ background:'#FDFCFA',borderRadius:14,padding:'12px 13px',border:'1px solid rgba(28,20,16,0.07)' }}>
              <FilterLabel>Hotel Stars</FilterLabel>
              <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
                {HOTEL_STARS.map(s => <ModalChip key={s.v} label={s.l} active={draft.starMin===s.v} onClick={()=>setDraft(p=>({...p,starMin:s.v}))} bg='#FFFBEB' color='#A16207' />)}
              </div>
            </div>
          </div>
        )}
        {section === 'healthcare' && (
          <div style={{ background:'#FDFCFA',borderRadius:16,padding:'13px 14px',marginBottom:16,border:'1px solid rgba(28,20,16,0.07)' }}>
            <div style={{ fontSize:11,color:D.muted,marginBottom:6,fontWeight:600 }}>Category</div>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              <ModalChip label="All" active={draft.hospCat==='all'} onClick={()=>setDraft(f=>({...f,hospCat:'all'}))} bg="#FEE2E2" color="#B91C1C" />
              {availHospCats.map(c => { const cfg=CAT_CFG[c]||CAT_CFG.clinic; return <ModalChip key={c} label={cfg.icon+' '+cfg.label} active={draft.hospCat===c} onClick={()=>setDraft(f=>({...f,hospCat:c}))} bg={cfg.bg} color={cfg.color} />; })}
            </div>
          </div>
        )}
        {section === 'rentals' && (
          <div style={{ background:'#FDFCFA',borderRadius:16,padding:'13px 14px',marginBottom:16,border:'1px solid rgba(28,20,16,0.07)' }}>
            <div style={{ fontSize:11,color:D.muted,marginBottom:6,fontWeight:600 }}>Vehicle type</div>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              <ModalChip label="All" active={draft.rentalType==='all'} onClick={()=>setDraft(f=>({...f,rentalType:'all'}))} bg={D.blueTint} color="#1D4ED8" />
              {availRentTypes.map(t => { const c=RENTAL_CFG[t]||RENTAL_CFG.car; return <ModalChip key={t} label={c.icon+' '+c.label+'s'} active={draft.rentalType===t} onClick={()=>setDraft(f=>({...f,rentalType:t}))} bg={c.bg} color={c.color} />; })}
            </div>
          </div>
        )}
        <div style={{ display:'flex',gap:8 }}>
          <button onClick={onReset} style={{ flex:1,padding:'12px',fontSize:13,fontWeight:700,borderRadius:14,border:'1px solid rgba(0,0,0,0.1)',background:'rgba(0,0,0,0.04)',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",color:'#444' }}>Reset</button>
          <button onClick={onApply} style={{ flex:2,padding:'12px',fontSize:13,fontWeight:700,borderRadius:14,border:'none',background:'linear-gradient(135deg,#C9913A,#A8731E)',cursor:'pointer',fontFamily:"'DM Sans',sans-serif",color:'#fff' }}>Apply</button>
        </div>
      </div>
    </div>
  );
}

/* ── Section header with animated count ── */
function SecHeader({ icon, title, subtitle, count, ac, abg, onFilter, filterCount }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10, marginBottom:14,
      background:D.surface, borderRadius:18, padding:'13px 15px',
      boxShadow:D.shadowMd, border:`0.5px solid ${D.border}`,
      borderLeft:`4px solid ${ac}`,
    }}>
      <div style={{ width:40,height:40,borderRadius:12,background:abg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={ac} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14.5,fontWeight:800,color:D.espresso,fontFamily:"'Sora',sans-serif",lineHeight:1.1 }}>{title}</div>
        {subtitle && <div style={{ fontSize:11,color:D.muted,marginTop:2,lineHeight:1.3 }}>{subtitle}</div>}
      </div>
      {onFilter && (
        <button onClick={onFilter} style={{ position:'relative',flexShrink:0,width:34,height:34,borderRadius:11,border:`1.5px solid ${filterCount>0 ? ac : 'rgba(28,20,16,0.12)'}`,background:filterCount>0 ? abg : '#FAFAF8',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={filterCount>0 ? ac : '#888'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
          </svg>
          {filterCount > 0 && (
            <span style={{ position:'absolute',top:-5,right:-5,width:15,height:15,borderRadius:'50%',background:ac,color:'#fff',fontSize:8,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #fff' }}>{filterCount}</span>
          )}
        </button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   HOTEL PHOTO SLIDESHOW (5 images)
════════════════════════════════════════ */
function HotelPhotoSlideshow({ hotel, destination, stCfg }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [photos, setPhotos] = useState(hotel.imageUrl ? [hotel.imageUrl] : []);
  const [loadedSet, setLoadedSet] = useState(new Set());
  const [imgErr, setImgErr] = useState(new Set());

  useEffect(() => {
    // Prefer the cached images array (filled by backend Serper Images on first fetch)
    const cachedImgs = Array.isArray(hotel.images) && hotel.images.length > 0 ? hotel.images : [];
    const base = cachedImgs.length > 0
      ? cachedImgs
      : (hotel.imageUrl ? [hotel.imageUrl] : []);
    setPhotos(base);
    setPhotoIdx(0);
    setImgErr(new Set());

    // If we already have 5+ photos from cache, skip external fetch entirely
    if (base.length >= 5) return;

    // Fallback: fetch more photos via Serper Images API (used only when cache is cold)
    const queries = [
      `${hotel.name} ${destination} exterior`,
      `${hotel.name} ${destination} room`,
    ];

    let mounted = true;
    (async () => {
      const results = await Promise.allSettled(queries.map(q => fetchPlacePhotos(q)));
      if (!mounted) return;
      const fetched = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => (r.value?.urls || []).slice(0, 3));
      const all = [...base, ...fetched].filter(Boolean);
      const unique = [...new Set(all)].slice(0, 5);
      if (unique.length > base.length) setPhotos(unique);
    })();

    return () => { mounted = false; };
  }, [hotel.name, hotel.images, destination]);

  const gradients = [
    'linear-gradient(135deg,#0F2027,#203A43,#2C5364)',
    'linear-gradient(135deg,#1A1A2E,#16213E,#0F3460)',
    'linear-gradient(135deg,#1B2A1B,#2D4A2D,#1A3A1A)',
    'linear-gradient(135deg,#2C1810,#4A2512,#7A3B1E)',
    'linear-gradient(135deg,#16213E,#0F3460,#533483)',
  ];
  const fallbackGrad = gradients[(hotel.name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % gradients.length];

  // Active photo (skip errored ones)
  const activePhotos = photos.filter((_, i) => !imgErr.has(i));
  const curUrl = activePhotos[photoIdx % Math.max(1, activePhotos.length)];
  const showSlider = activePhotos.length > 1;

  return (
    <div style={{ position: 'relative', height: 200, overflow: 'hidden', background: fallbackGrad }}>
      {curUrl ? (
        <img
          src={curUrl}
          alt={hotel.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'opacity .2s' }}
          onError={() => setImgErr(p => { const n = new Set(p); n.add(photoIdx % Math.max(1, activePhotos.length)); return n; })}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: fallbackGrad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
      )}

      {/* Gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(10,8,6,0.78) 100%)', pointerEvents: 'none' }} />

      {/* Arrows */}
      {showSlider && (
        <>
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); setPhotoIdx(i => (i - 1 + activePhotos.length) % activePhotos.length); }}
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', display: photoIdx === 0 ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)', zIndex: 2 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); setPhotoIdx(i => (i + 1) % activePhotos.length); }}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', display: photoIdx >= activePhotos.length - 1 ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)', zIndex: 2 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          {/* Dot indicators */}
          <div style={{ position: 'absolute', bottom: 44, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4, pointerEvents: 'none', zIndex: 2 }}>
            {activePhotos.map((_, i) => (
              <div key={i} style={{ width: i === photoIdx ? 16 : 5, height: 5, borderRadius: 99, background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all .2s' }} />
            ))}
          </div>

          {/* Counter */}
          <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.45)', borderRadius: 99, padding: '2px 8px', backdropFilter: 'blur(4px)', zIndex: 2 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{photoIdx + 1}/{activePhotos.length}</span>
          </div>
        </>
      )}

      {/* Stay type badge */}
      <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: '3px 9px', backdropFilter: 'blur(6px)', boxShadow: '0 2px 8px rgba(0,0,0,0.10)', zIndex: 2 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: stCfg.color, fontFamily: "'DM Sans',sans-serif", textTransform: 'uppercase', letterSpacing: .5 }}>{stCfg.label}</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   STAYS SECTION
════════════════════════════════════════ */
function StaysSection({ hotels, destination, filtered, onOpenFilter, filterCount }) {
  if (!hotels.length) return null;
  const STAYS_ICON = <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <SecHeader icon={STAYS_ICON} title="Where to Stay" subtitle="Hotels · Hostels · Guesthouses · Resorts"
        ac={D.gold} abg={D.goldTint} onFilter={onOpenFilter} filterCount={filterCount} />

      {!filtered.length && (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: D.muted, fontSize: 13 }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={D.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 10, display: 'block', margin: '0 auto 10px' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          No stays match these filters. Try broadening your search.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filtered.map((h, i) => {
          const stCfg = STAY_CFG[h.stayType] || STAY_CFG.hotel;
          const prCfg = PRICE_CFG[h.priceLevel] || PRICE_CFG.mid;
          const priceDisplay = (() => {
            if (h.pricePerNight) return h.pricePerNight;
            const p = (h.priceLevel || '').toLowerCase();
            if (p.includes('budget') || p === 'cheap' || p === 'low') return '< ₹2,000 / night';
            if (p.includes('luxury') || p === 'expensive' || p === 'premium') return '₹6,000+ / night';
            if (p.includes('mid') || p.includes('moderate') || p === 'standard' || p === 'average') return '₹2,000–₹6,000 / night';
            return PRICE_DISPLAY[h.priceLevel] || null;
          })();
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + ' ' + destination)}`;

          return (
            <div key={h.id || i} className="r-card r-hotel-card"
              style={{ background: D.surface, borderRadius: 18, overflow: 'hidden', boxShadow: D.shadowMd, border: `0.5px solid ${D.border}`, animationDelay: `${Math.min(i, 8) * 45}ms` }}>

              {/* 5-photo slideshow */}
              <HotelPhotoSlideshow hotel={h} destination={destination} stCfg={stCfg} />

              {/* Card body — name + (price · map · call) */}
              <div style={{ padding: '11px 13px 13px' }}>
                {/* Line 1: Hotel name */}
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14.5, fontWeight: 800, color: D.espresso, lineHeight: 1.25, letterSpacing: -0.2, marginBottom: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>

                {/* Line 2: map icon · price (centred) · call icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Map icon button */}
                  <a href={mapsUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                    style={{ width: 34, height: 34, borderRadius: 10, background: D.neutral, border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={D.secondary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </a>

                  {/* Price — centred, clean */}
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: D.secondary }}>{priceDisplay || prCfg.label}</span>
                  </div>

                  {/* Call icon button */}
                  {h.phone ? (
                    <a href={`tel:${h.phone}`} onClick={e => e.stopPropagation()}
                      style={{ width: 34, height: 34, borderRadius: 10, background: D.neutral, border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={D.secondary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.37 2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.85a16 16 0 0 0 6.29 6.29l1.17-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </a>
                  ) : (
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: D.neutral, border: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.35 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={D.muted} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.37 2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.85a16 16 0 0 0 6.29 6.29l1.17-.94a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ════════════════════════════════════════
   HOSPITALS SECTION
════════════════════════════════════════ */
function HealthcareSection({ hospitals, shown, onOpenFilter, filterCount }) {
  if (!hospitals.length) return null;
  const HOSP_ICON = <><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></>;

  return (
    <div style={{ marginBottom:'1.5rem' }}>
      <SecHeader icon={HOSP_ICON} title="Healthcare" subtitle="Hospitals · Clinics · Pharmacies · Emergency"
        ac="#B91C1C" abg="#FEE2E2" onFilter={onOpenFilter} filterCount={filterCount} />

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {shown.map((h, i) => {
          const cfg = CAT_CFG[h.category] || CAT_CFG.clinic;
          return (
            <a
              key={h.id||i}
              className="r-card r-hosp-card"
              href={h.lat&&h.lng
                ? `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name)}`}
              target="_blank" rel="noreferrer"
              style={{
                textDecoration:'none', background:D.surface, borderRadius:14,
                padding:'13px 14px', boxShadow:D.shadow, display:'flex', alignItems:'flex-start', gap:12,
                border:`0.5px solid ${h.is24h ? 'rgba(185,28,28,0.25)' : D.border}`,
                borderLeft:h.is24h ? '3.5px solid #B91C1C' : `0.5px solid ${D.border}`,
                animationDelay:`${Math.min(i,8)*40}ms`,
              }}
            >
              {/* Icon with pulse for emergency 24h */}
              <div style={{ position:'relative', flexShrink:0 }}>
                <div className={h.is24h ? 'r-pulse-24' : ''} style={{ width:42,height:42,borderRadius:13,background:cfg.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:21 }}>
                  {cfg.icon}
                </div>
                {h.is24h && (
                  <div style={{ position:'absolute',top:-3,right:-3,width:14,height:14,borderRadius:'50%',background:'#B91C1C',border:'2px solid #fff',display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <div style={{ width:5,height:5,borderRadius:'50%',background:'#fff' }} />
                  </div>
                )}
              </div>
              {/* Details */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap', marginBottom:5 }}>
                  <span style={{ fontSize:13.5,fontWeight:800,color:D.espresso,fontFamily:"'Sora',sans-serif",lineHeight:1.2 }}>{h.name}</span>
                  {h.is24h && (
                    <span style={{ fontSize:9,fontWeight:800,background:'#B91C1C',color:'#fff',borderRadius:5,padding:'2px 7px',letterSpacing:.6,flexShrink:0 }}>24H OPEN</span>
                  )}
                </div>
                <div style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, background:cfg.bg, color:cfg.color, borderRadius:6, padding:'2px 8px', marginBottom:5 }}>
                  {cfg.icon} {cfg.label}
                </div>
                {h.address && (
                  <div style={{ fontSize:11, color:D.muted, lineHeight:1.4, marginBottom:h.phone?4:0, display:'flex', gap:4, alignItems:'flex-start' }}>
                    <span style={{ flexShrink:0 }}>📍</span>
                    <span>{h.address.length>72 ? h.address.slice(0,72)+'…' : h.address}</span>
                  </div>
                )}
                {h.phone && (
                  <a href={`tel:${h.phone}`} onClick={e=>e.stopPropagation()}
                    style={{ fontSize:11.5,color:'#1D4ED8',fontWeight:700,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:4 }}>
                    📞 {h.phone}
                  </a>
                )}
              </div>
              {/* Maps arrow */}
              <div style={{ flexShrink:0,alignSelf:'center',width:28,height:28,borderRadius:'50%',background:D.blueTint,display:'flex',alignItems:'center',justifyContent:'center' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2563AB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   RENTALS SECTION
════════════════════════════════════════ */
function RentalsSection({ rentals, shown, onOpenFilter, filterCount }) {
  if (!rentals.length) return null;
  const RENTAL_ICON = <><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></>;

  return (
    <div style={{ marginBottom:'1.5rem' }}>
      <SecHeader icon={RENTAL_ICON} title="Rentals" subtitle="Cars · Bikes · Scooters to explore freely"
        ac="#1D4ED8" abg={D.blueTint} onFilter={onOpenFilter} filterCount={filterCount} />

      <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
        {shown.map((r, i) => {
          const cfg = RENTAL_CFG[r.type] || RENTAL_CFG.car;
          return (
            <div key={r.id||i} className="r-card r-fade"
              style={{ background:D.surface,borderRadius:14,padding:'12px 14px',
                boxShadow:D.shadow,border:`0.5px solid ${D.border}`,
                display:'flex',alignItems:'flex-start',gap:11,
                animationDelay:`${Math.min(i,8)*45}ms` }}>
              <div style={{ width:42,height:42,borderRadius:13,background:cfg.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:21,flexShrink:0 }}>
                {cfg.icon}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13.5,fontWeight:800,color:D.espresso,lineHeight:1.2,marginBottom:4,fontFamily:"'Sora',sans-serif" }}>{r.name}</div>
                <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', marginBottom:4 }}>
                  <span style={{ fontSize:10,fontWeight:700,background:cfg.bg,color:cfg.color,borderRadius:6,padding:'2px 8px' }}>{cfg.icon} {cfg.label}</span>
                  {r.rating && <Stars rating={r.rating} />}
                </div>
                {r.address && (
                  <div style={{ fontSize:11,color:D.muted,lineHeight:1.4,marginBottom:r.phone?4:0,display:'flex',gap:4 }}>
                    <span>📍</span><span>{r.address.length>62?r.address.slice(0,62)+'…':r.address}</span>
                  </div>
                )}
                {r.phone && (
                  <a href={`tel:${r.phone}`} style={{ fontSize:11.5,color:'#1D4ED8',fontWeight:700,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:4,marginBottom:4 }}>
                    📞 {r.phone}
                  </a>
                )}
                {r.mapsUrl && (
                  <a href={r.mapsUrl} target="_blank" rel="noreferrer"
                    style={{ display:'inline-flex',alignItems:'center',gap:5,fontSize:11.5,color:'#2563AB',background:D.blueTint,borderRadius:999,padding:'5px 12px',textDecoration:'none',fontWeight:700,marginTop:2 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    View on Maps
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   LOADING SKELETON
════════════════════════════════════════ */
function LoadingSkeleton() {
  return (
    <div style={{ background:D.bg, paddingBottom:'2rem' }}>
      <div className="r-shimmer" style={{ borderRadius:18, height:140, marginBottom:'1.5rem' }} />
      <div className="r-shimmer" style={{ borderRadius:16,height:20,width:'55%',marginBottom:12 }} />
      <div style={{ display:'flex',gap:8,marginBottom:10,overflowX:'hidden' }}>
        {[1,2,3].map(i=><div key={i} className="r-shimmer" style={{ borderRadius:999,height:30,width:80,flexShrink:0 }} />)}
      </div>
      {[1,2,3].map(i=><HotelSkeleton key={i} />)}
      <div style={{ height:20 }} />
      <div className="r-shimmer" style={{ borderRadius:16,height:20,width:'45%',marginBottom:12,marginTop:24 }} />
      {[1,2].map(i=><HospSkeleton key={i} />)}
    </div>
  );
}

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
const INIT_FILTERS = { stayType:'all', priceLevel:'all', minRating:0, hospCat:'all', rentalType:'all', starMin:0 };

export default function RecommendationsPage({ destination, isSolo, autoData, autoStep, onRetry }) {
  const [step, setStep]               = useState(autoStep || 'loading');
  const [data, setData]               = useState(autoData || null);
  const [filters,     setFilters]     = useState(INIT_FILTERS);
  const [filterDraft, setFilterDraft] = useState(INIT_FILTERS);
  const [filterSection, setFilterSection] = useState(null);
  const [activeTab, setActiveTab]     = useState('stays');
  const [tabDir, setTabDir]           = useState('right');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const fetchedFor = useRef(null);
  const ac = isSolo ? '#7F77DD' : D.gold;
  const TAB_ORDER = ['stays', 'healthcare', 'rentals'];
  const switchTab = (key) => {
    const dir = TAB_ORDER.indexOf(key) > TAB_ORDER.indexOf(activeTab) ? 'right' : 'left';
    setTabDir(dir);
    setActiveTab(key);
  };

  useEffect(() => {
    const handler = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Sync with pre-fetched data from parent (ItineraryPage)
  useEffect(() => {
    if (autoStep !== undefined && autoStep !== step) setStep(autoStep);
    if (autoData && !data) setData(autoData);
  }, [autoStep, autoData]);

  // Internal fetch fallback when parent doesn't pass autoStep
  useEffect(() => {
    if (autoStep !== undefined) return;
    if (!destination || fetchedFor.current === destination) return;
    fetchedFor.current = destination;
    let cancelled = false;
    setStep('loading'); setData(null);
    fetchRecommendations(destination)
      .then(result => { if (!cancelled) { setData(result); setStep('result'); } })
      .catch(err => { if (!cancelled) { console.error('[RECS]', err); setStep('error'); } });
    return () => { cancelled = true; };
  }, [destination, autoStep]);

  const retry = () => {
    if (onRetry) { onRetry(); return; }
    fetchedFor.current = null; setStep('loading'); setData(null);
  };

  if (step === 'loading') return <LoadingSkeleton />;

  if (step === 'error') return (
    <div style={{ textAlign:'center', padding:'4rem 1.5rem' }}>
      <div className="r-bounce" style={{ fontSize:44, marginBottom:12 }}>😕</div>
      <div style={{ fontSize:16,fontWeight:700,color:D.espresso,marginBottom:6,fontFamily:"'Sora',sans-serif" }}>Couldn't load recommendations</div>
      <div style={{ fontSize:12,color:D.muted,marginBottom:22,lineHeight:1.6 }}>Data fetch failed — check your connection.</div>
      <button onClick={retry} style={{ padding:'11px 26px',fontSize:13,fontWeight:700,borderRadius:12,border:'none',
        background:isSolo?'linear-gradient(135deg,#7F77DD,#534AB7)':`linear-gradient(135deg,${D.gold},#A8731E)`,
        color:'#fff',cursor:'pointer',fontFamily:"'DM Sans',sans-serif" }}>Try Again</button>
    </div>
  );

  const { hotels=[], hospitals=[], rentals=[] } = data||{};
  const disp = destination.charAt(0).toUpperCase() + destination.slice(1);

  // Filtered arrays per section
  const filteredHotels = hotels.filter(h => {
    if (filters.stayType  !== 'all' && h.stayType   !== filters.stayType)   return false;
    if (filters.priceLevel !== 'all' && h.priceLevel !== filters.priceLevel) return false;
    if (filters.minRating  > 0 && (!h.rating || parseFloat(h.rating) < filters.minRating)) return false;
    if (filters.starMin    > 0 && (!h.stars || h.stars < filters.starMin))  return false;
    return true;
  });
  const filteredHospitals = filters.hospCat    === 'all' ? hospitals : hospitals.filter(h => h.category === filters.hospCat);
  const filteredRentals   = filters.rentalType === 'all' ? rentals   : rentals.filter(r => r.type === filters.rentalType);

  const stayFilterCount   = [filters.stayType!=='all', filters.priceLevel!=='all', filters.minRating>0, filters.starMin>0].filter(Boolean).length;
  const hospFilterCount   = filters.hospCat    !== 'all' ? 1 : 0;
  const rentalFilterCount = filters.rentalType !== 'all' ? 1 : 0;

  const openFilter   = (section) => { setFilterDraft(filters); setFilterSection(section); };
  const applyFilters = () => { setFilters(filterDraft); setFilterSection(null); };
  const resetFilters = () => setFilterDraft(INIT_FILTERS);

  return (
    <div style={{ background:D.bg, paddingBottom:'2.5rem', position:'relative' }}>

      {/* ── Hero banner ── */}
      <div style={{
        position:'relative', minHeight:140, borderRadius:16, overflow:'hidden',
        background:'linear-gradient(135deg,#0D1B2A 0%,#1A3A5C 55%,#2563AB 100%)',
        marginBottom:'1.25rem', boxShadow:'0 4px 20px rgba(13,27,42,0.18)',
      }}>
        <div style={{ position:'absolute',top:-20,right:-20,fontSize:130,opacity:0.06,lineHeight:1 }}>🗺️</div>
        <div style={{ position:'relative', zIndex:1, padding:'1.25rem 1.25rem 1rem' }}>
          <div style={{ fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:1.8,marginBottom:6,fontFamily:"'DM Sans',sans-serif" }}>
            NEARBY IN {disp.toUpperCase()}
          </div>
          <div style={{ fontSize:20,fontWeight:800,color:'#fff',lineHeight:1.2,letterSpacing:-0.3,marginBottom:5,fontFamily:"'Sora',sans-serif" }}>
            Your complete <span style={{ color:'#93C5FD' }}>city guide</span>
          </div>
          <div style={{ fontSize:12,color:'rgba(255,255,255,0.58)',lineHeight:1.6 }}>
            Stays · Healthcare · Rentals — all in one place
          </div>
          {/* Stat buttons — full width, click to scroll to section */}
          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            {[
              { n: hotels.length,    label:'stays',      key:'stays' },
              { n: hospitals.length, label:'healthcare', key:'healthcare' },
              { n: rentals.length,   label:'rentals',    key:'rentals' },
            ].map(({ n, label, key }) => n > 0 && (
              <button
                key={key}
                onClick={() => switchTab(key)}
                style={{ flex:1, background: activeTab === key ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.13)', border: activeTab === key ? '1.5px solid rgba(255,255,255,0.65)' : '0.5px solid rgba(255,255,255,0.22)', backdropFilter:'blur(6px)', borderRadius:999, padding:'5px 8px', display:'flex', gap:5, alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.2s ease' }}
              >
                <span style={{ fontSize:13, fontWeight:800, color:'#fff' }}>{n}</span>
                <span style={{ fontSize:11, color: activeTab === key ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)' }}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Active section (tab-switched with slide animation) ── */}
      <div key={activeTab} style={{ animation: `${tabDir === 'right' ? 'rSlideRight' : 'rSlideLeft'} 0.25s cubic-bezier(0.2,0.7,0.2,1) both` }}>
        {activeTab === 'stays' && <StaysSection hotels={hotels} destination={destination} filtered={filteredHotels}
          onOpenFilter={()=>openFilter('stays')} filterCount={stayFilterCount} />}
        {activeTab === 'healthcare' && <HealthcareSection hospitals={hospitals} shown={filteredHospitals}
          onOpenFilter={()=>openFilter('healthcare')} filterCount={hospFilterCount} />}
        {activeTab === 'rentals' && <RentalsSection rentals={rentals} shown={filteredRentals}
          onOpenFilter={()=>openFilter('rentals')} filterCount={rentalFilterCount} />}
      </div>

      {!data?.fromCache && (
        <div style={{ display:'flex',gap:9,alignItems:'flex-start',background:D.surface,border:`0.5px solid ${D.border}`,borderLeft:`3px solid ${ac}`,borderRadius:12,padding:'11px 13px',fontSize:11.5,color:D.muted,lineHeight:1.6,marginTop:12 }}>
          <span style={{ fontSize:16,flexShrink:0 }}>✅</span>
          <span>Fresh data for {disp} saved to Supabase — every user loads this instantly.</span>
        </div>
      )}

      <FilterModal
        open={filterSection !== null} onClose={()=>setFilterSection(null)}
        section={filterSection}
        hotels={hotels} hospitals={hospitals} rentals={rentals}
        draft={filterDraft} setDraft={setFilterDraft}
        onApply={applyFilters} onReset={resetFilters}
      />

      {/* Scroll-to-top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position: 'fixed', bottom: '5.8rem', right: '1rem', zIndex: 90,
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0, animation: 'rFadeIn 0.25s ease both',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
      )}
    </div>
  );
}

