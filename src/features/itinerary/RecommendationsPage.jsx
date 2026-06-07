// src/features/itinerary/RecommendationsPage.jsx
// Premium "Nearby" tab — Stays · Healthcare · Rentals
// Full fetch-from-DB, ImageKit images, rich filters, motion UX
import { useState, useEffect, useRef } from 'react';
import { PlacePhoto } from '../media/PlaceMedia';

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
    @keyframes rSheetIn  { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
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
};
const PRICE_CFG = {
  budget: { label:'Budget', icon:'₹',   bg:'#ECFDF5', color:'#065F46' },
  mid:    { label:'Mid',    icon:'₹₹',  bg:D.goldTint, color:'#92400E' },
  luxury: { label:'Luxury', icon:'₹₹₹', bg:'#FFF0F6',  color:'#9B2260' },
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
};const RATINGS = [{v:0,l:'Any'},{v:3,l:'3+'},{v:3.5,l:'3.5+'},{v:4,l:'4+'},{v:4.5,l:'4.5+'}];
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
  const availStayTypes = ['hotel','hostel','guesthouse','resort'].filter(t => hotels.some(h => h.stayType === t));
  const availHospCats  = ['hospital','emergency','clinic','pharmacy'].filter(c => hospitals.some(h => h.category === c));
  const availRentTypes = ['car','bike','scooter','cycle'].filter(t => rentals.some(r => r.type === t));
  const titles = { stays: '🛏️  Stay Filters', healthcare: '🏥  Healthcare Filters', rentals: '🚗  Rental Filters' };
  return (
    <div
      style={{ position:'fixed',inset:0,background:'rgba(14,16,24,0.45)',zIndex:600,display:'flex',alignItems:'flex-end',justifyContent:'center',animation:'rFadeIn .2s ease-out both' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="r-sheet-in" style={{ width:'100%',maxWidth:560,background:'#fff',borderRadius:'24px 24px 0 0',padding:'1.1rem 1.1rem 2rem',boxShadow:'0 -8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <div style={{ fontFamily:"'Sora',sans-serif",fontSize:16,fontWeight:800 }}>{titles[section]}</div>
          <button onClick={onClose} style={{ width:30,height:30,borderRadius:'50%',border:'1px solid rgba(0,0,0,0.1)',background:'rgba(0,0,0,0.04)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,color:'#6b6b68',padding:0 }}>✕</button>
        </div>
        {section === 'stays' && (
          <div style={{ background:'#FDFCFA',borderRadius:16,padding:'13px 14px',marginBottom:16,border:'1px solid rgba(28,20,16,0.07)' }}>
            <div style={{ fontSize:11,color:D.muted,marginBottom:6,fontWeight:600 }}>Stay type</div>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:12 }}>
              <ModalChip label="All Stays" active={draft.stayType==='all'} onClick={()=>setDraft(f=>({...f,stayType:'all'}))} bg={D.goldTint} color={D.gold} />
              {availStayTypes.map(t => { const c=STAY_CFG[t]||STAY_CFG.hotel; return <ModalChip key={t} label={c.icon+' '+c.label+'s'} active={draft.stayType===t} onClick={()=>setDraft(f=>({...f,stayType:t}))} bg={c.bg} color={c.color} />; })}
            </div>
            <div style={{ fontSize:11,color:D.muted,marginBottom:6,fontWeight:600 }}>Price range</div>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap',marginBottom:12 }}>
              <ModalChip label="Any price" active={draft.priceLevel==='all'} onClick={()=>setDraft(f=>({...f,priceLevel:'all'}))} bg={D.neutral} color={D.muted} />
              {['budget','mid','luxury'].map(p => { const c=PRICE_CFG[p]; return <ModalChip key={p} label={c.icon+' '+c.label} active={draft.priceLevel===p} onClick={()=>setDraft(f=>({...f,priceLevel:p}))} bg={c.bg} color={c.color} />; })}
            </div>
            <div style={{ fontSize:11,color:D.muted,marginBottom:6,fontWeight:600 }}>Minimum rating</div>
            <div style={{ display:'flex',gap:6,flexWrap:'wrap' }}>
              {RATINGS.map(f => <ModalChip key={f.v} label={f.v===0?'Any':'★ '+f.l} active={draft.minRating===f.v} onClick={()=>setDraft(p=>({...p,minRating:f.v}))} bg='#FEF9EE' color='#92400E' />)}
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
      <div style={{ width:44,height:44,borderRadius:14,background:abg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:23,flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14.5,fontWeight:800,color:D.espresso,fontFamily:"'Sora',sans-serif",lineHeight:1.1 }}>{title}</div>
        {subtitle && <div style={{ fontSize:11,color:D.muted,marginTop:2,lineHeight:1.3 }}>{subtitle}</div>}
      </div>
      <div className="r-stat-num" style={{ flexShrink:0, textAlign:'right', marginRight: onFilter ? 6 : 0 }}>
        <div style={{ fontSize:22,fontWeight:900,color:ac,fontFamily:"'Sora',sans-serif",lineHeight:1 }}>{count}</div>
        <div style={{ fontSize:9,color:D.muted,textTransform:'uppercase',letterSpacing:.5 }}>found</div>
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
   STAYS SECTION
════════════════════════════════════════ */
function StaysSection({ hotels, destination, filtered, onOpenFilter, filterCount }) {
  const [imgErrors, setImgErrors] = useState(new Set());
  if (!hotels.length) return null;

  return (
    <div style={{ marginBottom:'1.5rem' }}>
      <SecHeader icon="🛏️" title="Where to Stay" subtitle="Every option — from dorms to palaces"
        count={filtered.length} ac={D.gold} abg={D.goldTint} onFilter={onOpenFilter} filterCount={filterCount} />

      {!filtered.length && (
        <div style={{ textAlign:'center', padding:'2.5rem 1rem', color:D.muted, fontSize:13 }}>
          <div style={{ fontSize:36,marginBottom:10 }}>🔍</div>
          No stays match these filters. Try broadening your search.
        </div>
      )}

      {/* Cards — full-width list for better mobile readability */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {filtered.map((h, i) => {
          const stCfg = STAY_CFG[h.stayType] || STAY_CFG.hotel;
          const prCfg = PRICE_CFG[h.priceLevel] || PRICE_CFG.mid;
          const hasImg = h.imageUrl && !imgErrors.has(h.id||h.name);
          return (
            <a
              key={h.id||i}
              className="r-card r-hotel-card"
              href={h.lat&&h.lng
                ? `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name+' '+destination)}`}
              target="_blank" rel="noreferrer"
              style={{ textDecoration:'none', background:D.surface, borderRadius:18, overflow:'hidden',
                boxShadow:D.shadow, border:`0.5px solid ${D.border}`, display:'block',
                animationDelay:`${Math.min(i,8)*45}ms` }}
            >
              {/* Photo */}
              <div style={{ position:'relative', height:160, overflow:'hidden', background:D.neutral }}>
                {hasImg ? (
                  <img src={h.imageUrl} alt={h.name}
                    style={{ width:'100%',height:'100%',objectFit:'cover',display:'block' }}
                    onError={()=>setImgErrors(p=>{const n=new Set(p);n.add(h.id||h.name);return n;})} />
                ) : (
                  <PlacePhoto
                    query={`${h.name} ${destination} ${stCfg.label} exterior`}
                    style={{ height:160, borderRadius:0 }}
                    delay={i * 250}
                  />
                )}
                {/* gradient overlay */}
                <div style={{ position:'absolute',inset:0,background:'linear-gradient(to bottom,transparent 30%,rgba(10,8,6,0.78) 100%)',pointerEvents:'none' }} />
                {/* stay type badge top-left */}
                <div style={{ position:'absolute',top:10,left:10,background:'rgba(255,255,255,0.92)',borderRadius:10,padding:'3px 9px',display:'flex',alignItems:'center',gap:4,backdropFilter:'blur(6px)',boxShadow:'0 2px 8px rgba(0,0,0,0.10)' }}>
                  <span style={{ fontSize:12 }}>{stCfg.icon}</span>
                  <span style={{ fontSize:10,fontWeight:700,color:stCfg.color,fontFamily:"'DM Sans',sans-serif",textTransform:'uppercase',letterSpacing:.5 }}>{stCfg.label}</span>
                </div>
                {/* price badge top-right */}
                <div style={{ position:'absolute',top:10,right:10,background:prCfg.bg,borderRadius:999,padding:'3px 10px' }}>
                  <span style={{ fontSize:10,fontWeight:800,color:prCfg.color }}>{prCfg.icon}</span>
                </div>
                {/* name overlaid bottom */}
                <div style={{ position:'absolute',bottom:10,left:13,right:13,pointerEvents:'none' }}>
                  <div style={{ fontSize:15.5,fontWeight:800,color:'#fff',lineHeight:1.2,fontFamily:"'Sora',sans-serif",textShadow:'0 1px 6px rgba(0,0,0,0.5)',letterSpacing:-0.2 }}>{h.name}</div>
                  {h.pricePerNight && (
                    <div style={{ fontSize:11,color:'rgba(255,255,255,0.8)',marginTop:2 }}>{h.pricePerNight}</div>
                  )}
                </div>
              </div>
              {/* Card body */}
              <div style={{ padding:'10px 13px 13px', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  {h.rating && <Stars rating={h.rating} />}
                  {h.address && (
                    <div style={{ fontSize:11,color:D.muted,marginTop:4,lineHeight:1.4,display:'flex',gap:4,alignItems:'flex-start' }}>
                      <span style={{ flexShrink:0 }}>📍</span>
                      <span>{h.address.length>65 ? h.address.slice(0,65)+'…' : h.address}</span>
                    </div>
                  )}
                </div>
                <div style={{ flexShrink:0, width:32, height:32, borderRadius:'50%', background:D.blueTint, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563AB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
              </div>
            </a>
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

  return (
    <div style={{ marginBottom:'1.5rem' }}>
      <SecHeader icon="🏥" title="Healthcare" subtitle="Hospitals · Clinics · Pharmacies · Emergency"
        count={shown.length} ac="#B91C1C" abg="#FEE2E2" onFilter={onOpenFilter} filterCount={filterCount} />

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

  return (
    <div style={{ marginBottom:'1.5rem' }}>
      <SecHeader icon="🚗" title="Rentals" subtitle="Cars · Bikes · Scooters to explore freely"
        count={shown.length} ac="#1D4ED8" abg={D.blueTint} onFilter={onOpenFilter} filterCount={filterCount} />

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
const INIT_FILTERS = { stayType:'all', priceLevel:'all', minRating:0, hospCat:'all', rentalType:'all' };
const NEARBY_TABS  = [
  { id:'stays',      icon:'🛏️', label:'Stays' },
  { id:'healthcare', icon:'🏥', label:'Healthcare' },
  { id:'rentals',    icon:'🚗', label:'Rentals' },
];

export default function RecommendationsPage({ destination, isSolo }) {
  const [step, setStep]             = useState('loading');
  const [data, setData]             = useState(null);
  const [nTab, setNTab]             = useState('stays');
  const [filters,     setFilters]   = useState(INIT_FILTERS);
  const [filterDraft, setFilterDraft] = useState(INIT_FILTERS);
  const [filterSection, setFilterSection] = useState(null); // 'stays'|'healthcare'|'rentals'|null
  const fetchedFor = useRef(null);
  const ac = isSolo ? '#7F77DD' : D.gold;

  useEffect(() => {
    if (!destination || fetchedFor.current === destination) return;
    fetchedFor.current = destination;
    let cancelled = false;
    setStep('loading'); setData(null);
    (async () => {
      try {
        const { fetchRecommendations } = await import('../../api');
        const result = await fetchRecommendations(destination);
        if (!cancelled) { setData(result); setStep('result'); }
      } catch (err) {
        if (!cancelled) { console.error('[RECS]', err); setStep('error'); }
      }
    })();
    return () => { cancelled = true; };
  }, [destination]);

  const retry = () => { fetchedFor.current = null; setStep('loading'); setData(null); };

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
    if (filters.stayType   !== 'all' && h.stayType  !== filters.stayType)    return false;
    if (filters.priceLevel !== 'all' && h.priceLevel !== filters.priceLevel)  return false;
    if (filters.minRating  > 0 && (!h.rating || h.rating < filters.minRating)) return false;
    return true;
  });
  const filteredHospitals = filters.hospCat    === 'all' ? hospitals : hospitals.filter(h => h.category === filters.hospCat);
  const filteredRentals   = filters.rentalType === 'all' ? rentals   : rentals.filter(r => r.type === filters.rentalType);

  // Filter active counts per section (for badge on filter button)
  const stayFilterCount    = [filters.stayType!=='all', filters.priceLevel!=='all', filters.minRating>0].filter(Boolean).length;
  const hospFilterCount    = filters.hospCat    !== 'all' ? 1 : 0;
  const rentalFilterCount  = filters.rentalType !== 'all' ? 1 : 0;

  const openFilter = (section) => { setFilterDraft(filters); setFilterSection(section); };
  const applyFilters = () => { setFilters(filterDraft); setFilterSection(null); };
  const resetFilters = () => setFilterDraft(INIT_FILTERS);

  // Tab counts for badge dots
  const tabCounts = { stays: hotels.length, healthcare: hospitals.length, rentals: rentals.length };

  return (
    <div style={{ background:D.bg, paddingBottom:'2.5rem' }}>

      {/* ── Hero ── */}
      <div style={{
        position:'relative', borderRadius:20, overflow:'hidden',
        background:'linear-gradient(135deg,#0D1B2A 0%,#1A3A5C 55%,#2563AB 100%)',
        marginBottom:'1rem', padding:'1.2rem 1.4rem 1.1rem',
        boxShadow:'0 6px 28px rgba(13,27,42,0.25)',
      }}>
        <div style={{ position:'absolute',top:-30,right:-30,fontSize:160,opacity:0.05,lineHeight:1 }}>🗺️</div>
        <div style={{ position:'relative', zIndex:1 }}>
          <div style={{ fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:1.8,marginBottom:6,fontFamily:"'DM Sans',sans-serif" }}>NEARBY IN {disp.toUpperCase()}</div>
          <div style={{ fontSize:20,fontWeight:900,color:'#fff',lineHeight:1.2,letterSpacing:-0.4,fontFamily:"'Sora',sans-serif" }}>
            Your complete <span style={{ color:'#93C5FD' }}>city guide</span>
          </div>
          <div style={{ fontSize:12,color:'rgba(255,255,255,0.58)',lineHeight:1.6,marginTop:5 }}>
            Stays · Healthcare · Rentals — cached in Supabase, shared across all users
          </div>
        </div>
      </div>

      {/* ── Sub-tab bar (Stays / Healthcare / Rentals) ── */}
      <div style={{
        display:'grid', gridTemplateColumns:'repeat(3,1fr)',
        background:D.surface, borderBottom:`1.5px solid ${D.border}`,
        borderRadius:'14px 14px 0 0', marginBottom:'1.2rem',
        boxShadow:'0 2px 8px rgba(28,20,16,0.05)',
        overflow:'hidden',
      }}>
        {NEARBY_TABS.map((t, idx) => {
          const isActive = nTab === t.id;
          const tabAc = t.id==='stays' ? D.gold : t.id==='healthcare' ? '#B91C1C' : '#1D4ED8';
          const cnt   = tabCounts[t.id] || 0;
          const hasFilt = t.id==='stays' ? stayFilterCount>0 : t.id==='healthcare' ? hospFilterCount>0 : rentalFilterCount>0;
          return (
            <button key={t.id} onClick={()=>setNTab(t.id)}
              style={{
                position:'relative', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                padding:'10px 4px 10px', border:'none', background:'transparent', cursor:'pointer',
                borderLeft: idx > 0 ? `1px solid ${D.border}` : 'none',
                transition:'background .15s ease',
              }}
            >
              <span style={{ fontSize:16, lineHeight:1, filter: isActive ? 'none' : 'grayscale(80%) opacity(0.55)', marginBottom:3, position:'relative' }}>
                {t.icon}
                {hasFilt && <span style={{ position:'absolute',top:-3,right:-5,width:7,height:7,borderRadius:'50%',background:tabAc,border:'1.5px solid #fff' }} />}
              </span>
              <span style={{ fontSize:10.5, fontWeight: isActive ? 800 : 500, color: isActive ? tabAc : D.muted, fontFamily:"'DM Sans',sans-serif", letterSpacing:0.1 }}>
                {t.label}
                {cnt > 0 && <span style={{ marginLeft:4, fontSize:9, color: isActive ? tabAc : D.muted, fontWeight:700, opacity:0.75 }}>({cnt})</span>}
              </span>
              {isActive && <span style={{ position:'absolute',bottom:0,left:'14%',right:'14%',height:2.5,borderRadius:'99px 99px 0 0',background:tabAc }} />}
            </button>
          );
        })}
      </div>

      {/* ── Active section ── */}
      {nTab === 'stays' && (
        <StaysSection hotels={hotels} destination={destination} filtered={filteredHotels}
          onOpenFilter={()=>openFilter('stays')} filterCount={stayFilterCount} />
      )}
      {nTab === 'healthcare' && (
        <HealthcareSection hospitals={hospitals} shown={filteredHospitals}
          onOpenFilter={()=>openFilter('healthcare')} filterCount={hospFilterCount} />
      )}
      {nTab === 'rentals' && (
        <RentalsSection rentals={rentals} shown={filteredRentals}
          onOpenFilter={()=>openFilter('rentals')} filterCount={rentalFilterCount} />
      )}

      {!data?.fromCache && (
        <div style={{ display:'flex',gap:9,alignItems:'flex-start',background:D.surface,border:`0.5px solid ${D.border}`,borderLeft:`3px solid ${ac}`,borderRadius:12,padding:'11px 13px',fontSize:11.5,color:D.muted,lineHeight:1.6,marginTop:12 }}>
          <span style={{ fontSize:16,flexShrink:0 }}>✅</span>
          <span>Fresh data fetched and saved to Supabase for {disp}. Every user opening this destination loads instantly.</span>
        </div>
      )}

      <FilterModal
        open={filterSection !== null} onClose={()=>setFilterSection(null)}
        section={filterSection}
        hotels={hotels} hospitals={hospitals} rentals={rentals}
        draft={filterDraft} setDraft={setFilterDraft}
        onApply={applyFilters} onReset={resetFilters}
      />
    </div>
  );
}

