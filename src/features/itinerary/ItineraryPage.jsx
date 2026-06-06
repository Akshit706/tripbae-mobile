import { useState, useRef, useEffect } from 'react';
import { normalizeMembers } from '../shared/constants';
import { S } from '../shared/styles';
import { Spinner } from '../shared/ui';
import { PlacePhoto, PlacePhotosStrip } from '../media/PlaceMedia';

/* ── Premium design tokens ─────────────────────────────────── */
const D = {
  bg:        '#FAF8F4',
  surface:   '#FFFFFF',
  espresso:  '#1C1410',
  gold:      '#C9913A',
  goldTint:  '#FDF3E3',
  sage:      '#7A9E7E',
  sageTint:  '#EBF3EC',
  coral:     '#E8715A',
  coralTint: '#FDF0EE',
  blueTint:  '#E6F1FB',
  neutral:   '#F4F2EE',
  muted:     '#8A7E76',
  secondary: '#5C504A',
  divider:   'rgba(28,20,16,0.06)',
  border:    'rgba(28,20,16,0.08)',
  cardShadow:'0 2px 8px rgba(28,20,16,0.06)',
};

/* Determine if an activity time slot is currently active */
function isActiveSlot(time, endTime) {
  if (!time || !endTime) return false;
  const parse = t => {
    const [tp, period] = t.trim().split(' ');
    const [h, m] = tp.split(':').map(Number);
    let hrs = h;
    if (period === 'PM' && h !== 12) hrs += 12;
    if (period === 'AM' && h === 12) hrs = 0;
    return hrs * 60 + (m || 0);
  };
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= parse(time) && cur <= parse(endTime);
}

/* ── CSS keyframe injection (pulse dot + card entry + shimmer) ── */
if (typeof document !== 'undefined' && !document.getElementById('itinerary-styles')) {
  const el = document.createElement('style');
  el.id = 'itinerary-styles';
  el.textContent = `
    @keyframes dotPulse {
      0%,100% { transform: scale(1);   opacity: 1; }
      50%      { transform: scale(1.6); opacity: 0.8; }
    }
    @keyframes glowPulse {
      0%,100% { transform: scale(1);   opacity: 0.25; }
      50%      { transform: scale(1.9); opacity: 0; }
    }
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    @keyframes floatBadge {
      0%,100% { transform: translateY(0px); }
      50%      { transform: translateY(-3px); }
    }
    @keyframes fadeSlideUp {
      from { opacity:0; transform:translateY(10px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .itin-card-enter { animation: cardIn 0.38s cubic-bezier(0.34,1.3,0.64,1) both; }
    .itin-dot-active  { animation: dotPulse 1.4s ease-in-out infinite; }
    .itin-dot-glow    { animation: glowPulse 1.4s ease-in-out infinite; }
    .itin-float       { animation: floatBadge 3s ease-in-out infinite; }
    .itin-shimmer     {
      background: linear-gradient(90deg,#f0ede8 25%,#e8e4dc 50%,#f0ede8 75%);
      background-size: 800px 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }
    @keyframes checkPop {
      0%   { transform: scale(0.4); opacity: 0; }
      60%  { transform: scale(1.3); opacity: 1; }
      100% { transform: scale(1);   opacity: 1; }
    }
    @keyframes sectionIn {
      from { opacity: 0; transform: translateX(-10px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .itin-photo-card:hover { transform: translateY(-2px) scale(1.008); box-shadow: 0 10px 36px rgba(28,20,16,0.14) !important; }
    .itin-photo-card { transition: transform 0.22s cubic-bezier(0.34,1.3,0.64,1), box-shadow 0.22s ease; }
    .itin-action-pill:hover { transform: scale(1.05); filter: brightness(0.96); }
    .itin-action-pill { transition: transform 0.15s ease, filter 0.15s ease; }
    .itin-done-btn { transition: all 0.18s cubic-bezier(0.34,1.56,0.64,1); }
    .itin-done-btn.checked { animation: checkPop 0.28s cubic-bezier(0.34,1.56,0.64,1) both; }
    .itin-sec-header { animation: sectionIn 0.32s ease both; }
    .itin-taste-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(28,20,16,0.12) !important; }
    .itin-taste-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
  `;
  document.head.appendChild(el);
}

/* ── Lightbox ─────────────────────────────────────────────── */
function Lightbox({ url, onClose }) {
  if (!url) return null;
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, cursor: 'zoom-out' }}
    >
      <img
        src={url}
        alt=""
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 14, objectFit: 'contain', boxShadow: '0 8px 48px rgba(0,0,0,0.6)' }}
      />
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
      >✕</button>
    </div>
  );
}

/* Tag colour resolver */
function tagStyle(tag, mustDo) {
  if (mustDo || ['must do','must-do','must-try','iconic'].includes(tag.toLowerCase()))
    return { bg: D.goldTint, color: D.gold };
  const t = tag.toLowerCase();
  if (['heritage','cultural','culture','historic','offbeat'].some(k => t.includes(k)))
    return { bg: D.blueTint, color: '#2563AB' };
  if (['scenic','nature','park','beach','lake'].some(k => t.includes(k)))
    return { bg: D.sageTint, color: '#3A7A42' };
  if (['easy'].includes(t))  return { bg: D.sageTint,  color: '#3A7A42' };
  if (['moderate'].includes(t)) return { bg: '#FFF8E6', color: '#A0761C' };
  if (['strenuous','hard'].some(k => t.includes(k))) return { bg: D.coralTint, color: D.coral };
  return { bg: D.neutral, color: D.muted };
}
function LocalTastePage({ destination, isSolo, autoData, autoStep, onRetry }) {
  const [step, setStep] = useState(autoStep || 'idle');
  const [data, setData] = useState(autoData || null);
  const [dest, setDest] = useState(destination || '');
  const [doneItems, setDoneItems] = useState(new Set());
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const secRefs = { dishes: useRef(null), places: useRef(null), exp: useRef(null) };
  const scrollTo = (key) => secRefs[key]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  useEffect(() => {
    if (autoStep && autoStep !== step) setStep(autoStep);
    if (autoData && !data) setData(autoData);
  }, [autoStep, autoData]);

  const generate = async () => {
    if (!dest.trim()) return;
    if (onRetry && dest === destination) { onRetry(); return; }
    setStep('loading');
    setDoneItems(new Set());
    try {
      const { generateLocalTaste } = await import('../../api');
      const r = await generateLocalTaste({ destination: dest });
      setData(r);
      setStep('result');
    } catch {
      setData({ headline: `${dest} — Local Flavours`, tagline: 'Curated picks', dishes: [], places: [], experiences: [], tip: '' });
      setStep('result');
    }
  };

  const toggleDone = key => setDoneItems(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleExpand = key => setExpandedItems(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const renderStars = (rating) => {
    if (!rating) return null;
    const r = parseFloat(rating);
    if (isNaN(r)) return null;
    const full = Math.floor(r);
    const half = r - full >= 0.3;
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < full) stars.push('★');
      else if (i === full && half) stars.push('½');
      else stars.push('☆');
    }
    return (
      <span style={{ fontSize: 12, letterSpacing: 1 }}>
        <span style={{ color: '#E6A817' }}>{stars.slice(0, full + (half ? 1 : 0)).join('')}</span>
        <span style={{ color: '#D3D1C7' }}>{stars.slice(full + (half ? 1 : 0)).join('')}</span>
        <span style={{ fontFamily: "'DM Sans',sans-serif", color: D.muted, marginLeft: 4, fontSize: 11 }}>{r.toFixed(1)}</span>
      </span>
    );
  };

  const tastTagBg = t => {
    const tl = t.toLowerCase();
    if (['must-try','must-do','iconic','legendary','signature'].includes(tl)) return { bg: D.goldTint, color: D.gold };
    if (['heritage','traditional','authentic','artisan'].includes(tl)) return { bg: D.blueTint, color: '#2563AB' };
    if (['street food','casual','quick bite'].includes(tl)) return { bg: D.coralTint, color: D.coral };
    if (['vegetarian','vegan'].includes(tl)) return { bg: D.sageTint, color: '#3A7A42' };
    return { bg: D.neutral, color: D.muted };
  };

  const accentColor = isSolo ? '#7F77DD' : '#1D9E75';

  /* ── Veg / Non-veg dot ── */
  const VegDot = ({ item }) => {
    const str = ((item.tags || []).join(' ') + ' ' + (item.desc || '') + ' ' + (item.name || '')).toLowerCase();
    const isVeg    = /\bveg\b|vegetarian|paneer|sabzi|dal |aloo|gobi|palak|chole|rajma|dosa|idli|pongal|dhokla|poha|chaat|lassi/.test(str);
    const isNonVeg = /non.?veg|chicken|mutton|lamb|fish|prawn|seafood|\begg\b|keema|rogan|kebab|tandoori chicken|crab|lobster/.test(str);
    if (!isVeg && !isNonVeg) return null;
    const veg = isVeg && !isNonVeg;
    return (
      <div title={veg ? 'Vegetarian' : 'Non-vegetarian'} style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${veg ? '#2E7D32' : '#C62828'}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 4 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: veg ? '#2E7D32' : '#C62828' }} />
      </div>
    );
  };

  /* ── Premium item card ── */
  const TasteCard = ({ item, secKey, index, photoSuffix, startIndex }) => {
    const key = `${secKey}-${index}`;
    const isDone = doneItems.has(key);
    const isExpanded = expandedItems.has(key);
    const descLong = (item.desc || '').length > 130;

    return (
      <div
        className="itin-card-enter itin-taste-card"
        style={{
          background: D.surface,
          borderRadius: 16,
          overflow: 'hidden',
          marginBottom: 12,
          boxShadow: '0 2px 8px rgba(28,20,16,0.06)',
          border: `0.5px solid ${D.border}`,
          opacity: isDone ? 0.5 : 1,
          filter: isDone ? 'grayscale(0.5) blur(0.4px)' : 'none',
          transition: 'opacity 0.3s ease, filter 0.3s ease',
          animationDelay: `${index * 70}ms`,
        }}
      >
        {/* Photo at top — full width, clickable */}
        <div
          style={{ position: 'relative', height: 160, cursor: 'zoom-in', overflow: 'hidden', background: D.neutral }}
          onClick={e => { const img = e.currentTarget.querySelector('img'); if (img?.src) setLightboxUrl(img.src); }}
        >
          <PlacePhoto
            query={`${item.name} ${dest} ${photoSuffix}`}
            style={{ height: 160, borderRadius: 0 }}
            delay={(startIndex + index) * 500}
          />
          {/* bottom gradient on photo */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 35%, rgba(28,20,16,0.72) 100%)', pointerEvents: 'none' }} />
          {/* done overlay tick */}
          {isDone && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,20,16,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(1px)' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <polyline points="4,12 9,17 20,7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          )}
          {/* name + veg dot overlaid on photo gradient */}
          <div style={{ position: 'absolute', bottom: 10, left: 12, right: 52, pointerEvents: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2, textShadow: '0 1px 6px rgba(0,0,0,0.55)', fontFamily: "'Sora',sans-serif", textDecoration: isDone ? 'line-through' : 'none', flex: 1 }}>
                {item.name}
              </span>
              {secKey === 'dishes' && (() => {
                const str = ((item.tags||[]).join(' ')+' '+(item.desc||'')+' '+(item.name||'')).toLowerCase();
                const veg = /\bveg\b|vegetarian|paneer|sabzi|dal |aloo|gobi|palak|chole|rajma|dosa|idli|dhokla|poha|chaat|lassi/.test(str) && !/non.?veg|chicken|mutton|lamb|fish|prawn|seafood|\begg\b|keema|kebab|crab|lobster/.test(str);
                const nonVeg = /non.?veg|chicken|mutton|lamb|fish|prawn|seafood|\begg\b|keema|rogan|kebab|crab|lobster/.test(str);
                if (!veg && !nonVeg) return null;
                return (
                  <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${veg ? '#4CAF50' : '#EF5350'}`, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: veg ? '#2E7D32' : '#C62828' }} />
                  </div>
                );
              })()}
            </div>
          </div>
          {/* done button over photo */}
          <button
            onClick={e => { e.stopPropagation(); toggleDone(key); }}
            style={{
              position: 'absolute', bottom: 10, right: 10,
              display: 'flex', alignItems: 'center', gap: 5,
              padding: isDone ? '5px 11px 5px 8px' : '5px 10px',
              borderRadius: 999,
              border: isDone ? 'none' : '1.5px solid rgba(255,255,255,0.6)',
              background: isDone ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: isDone ? '0 2px 10px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            {isDone ? (
              <>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="6.5" fill={accentColor}/>
                  <polyline points="3.5,6.5 5.5,8.5 9.5,4.5" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, fontFamily: "'DM Sans',sans-serif" }}>Done</span>
              </>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/>
              </svg>
            )}
          </button>
        </div>

        {/* Card body */}
        <div style={{ padding: '12px 14px 13px' }}>
          {/* Rating + price + best time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 7 }}>
            {item.rating && renderStars(item.rating)}
            {item.priceRange && (
              <span style={{ fontSize: 11, fontWeight: 700, color: D.gold, background: D.goldTint, borderRadius: 999, padding: '2px 8px' }}>{item.priceRange}</span>
            )}
            {item.bestTime && (
              <span style={{ fontSize: 11, fontWeight: 600, color: '#0F6E56', background: D.sageTint, borderRadius: 999, padding: '2px 8px' }}>🕐 {item.bestTime}</span>
            )}
          </div>

          {/* Description with expand */}
          <div style={{ fontSize: 12.5, color: D.secondary, lineHeight: 1.65, marginBottom: 8 }}>
            {isExpanded || !descLong ? item.desc : `${item.desc.slice(0, 130)}…`}
            {descLong && (
              <span
                onClick={() => toggleExpand(key)}
                style={{ color: D.gold, fontWeight: 600, cursor: 'pointer', marginLeft: 4, fontSize: 12 }}
              >
                {isExpanded ? ' less' : ' more'}
              </span>
            )}
          </div>

          {/* Tags */}
          {(item.tags || []).length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 2 }}>
              {item.tags.map(t => {
                const c = tastTagBg(t);
                return (
                  <span key={t} style={{ fontSize: 10, fontWeight: 700, letterSpacing: .6, padding: '2px 8px', borderRadius: 999, textTransform: 'uppercase', background: isDone ? D.neutral : c.bg, color: isDone ? D.muted : c.color }}>
                    {t}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Section block with editorial header ── */
  const Sec = ({ icon, title, subtitle, items, secKey, startIndex = 0, photoSuffix = 'photo', accentBg, accentColor: ac, sectionRef }) => {
    const doneCount = items.filter((_, i) => doneItems.has(`${secKey}-${i}`)).length;
    const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;
    if (!items.length) return null;
    return (
      <div ref={sectionRef} style={{ marginBottom: '1.9rem', scrollMarginTop: 12 }}>
        {/* Section header card */}
        <div className="itin-sec-header" style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
          background: D.surface, borderRadius: 16, padding: '12px 14px',
          boxShadow: '0 2px 12px rgba(28,20,16,0.07)', border: `0.5px solid ${D.border}`,
          borderLeft: `4px solid ${ac}`,
        }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0, boxShadow: `0 3px 10px ${accentBg}` }}>{icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: D.espresso, letterSpacing: -0.2, fontFamily: "'Sora',sans-serif", lineHeight: 1.1 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: D.muted, marginTop: 2, lineHeight: 1.3 }}>{subtitle}</div>}
            {/* Progress bar */}
            {items.length > 0 && (
              <div style={{ marginTop: 7, height: 3, borderRadius: 99, background: D.neutral, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: ac, borderRadius: 99, transition: 'width 0.4s ease' }} />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: ac, fontFamily: "'Sora',sans-serif", lineHeight: 1 }}>{items.length}</span>
            <span style={{ fontSize: 10, color: D.muted, textTransform: 'uppercase', letterSpacing: .5 }}>picks</span>
            {doneCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, background: isSolo ? '#EEEDFE' : D.sageTint, color: isSolo ? '#534AB7' : D.sage, borderRadius: 999, padding: '2px 7px', marginTop: 2 }}>
                ✓ {doneCount}
              </span>
            )}
          </div>
        </div>
        {/* Cards */}
        {items.map((item, i) => (
          <TasteCard key={i} item={item} secKey={secKey} index={i} photoSuffix={photoSuffix} startIndex={startIndex} />
        ))}
      </div>
    );
  };

  if (step === 'loading') return <Spinner text={`Discovering local flavours of ${dest}…`} solo={isSolo} />;

  if (step === 'result' && data) return (
    <div style={{ background: D.bg, paddingBottom: '1.5rem' }}>
      <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      {/* ── Hero banner ── */}
      <div style={{
        position: 'relative', minHeight: 140, borderRadius: 16, overflow: 'hidden',
        background: 'linear-gradient(135deg, #2C1810 0%, #8B5E3C 50%, #C9913A 100%)',
        marginBottom: '1.25rem', boxShadow: '0 4px 20px rgba(28,20,16,0.18)',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 130, opacity: 0.06, lineHeight: 1 }}>🍜</div>
        <div style={{ position: 'relative', zIndex: 1, padding: '1.25rem 1.25rem 1rem' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, fontFamily: "'DM Sans',sans-serif" }}>
            LOCAL TASTE GUIDE
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: -0.3, marginBottom: 5, fontFamily: "'Sora',sans-serif" }}>
            {data.headline}
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6 }}>{data.tagline}</div>
          {/* Stats row — clickable scroll anchors */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {[
              { n: (data.dishes||[]).length, label: 'dishes', key: 'dishes' },
              { n: (data.places||[]).length, label: 'places', key: 'places' },
              { n: (data.experiences||[]).length, label: 'experiences', key: 'exp' },
            ].map(({ n, label, key }) => n > 0 && (
              <button
                key={key}
                onClick={() => scrollTo(key)}
                style={{ background: 'rgba(255,255,255,0.13)', border: '0.5px solid rgba(255,255,255,0.22)', backdropFilter: 'blur(6px)', borderRadius: 999, padding: '4px 12px', display: 'flex', gap: 5, alignItems: 'center', cursor: 'pointer', transition: 'background 0.15s ease' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
              >
                <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{n}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{label}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.6 }}>
                  <path d="M5 2L5 8M5 8L2.5 5.5M5 8L7.5 5.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sections ── */}
      <Sec
        icon="🍴" title="Must-Eat Dishes" subtitle="Iconic plates you can't leave without trying"
        items={data.dishes || []} secKey="dishes" startIndex={0} photoSuffix="food dish restaurant"
        accentBg="#FAEEDA" accentColor={D.gold} sectionRef={secRefs.dishes}
      />
      <Sec
        icon="📍" title="Unmissable Places" subtitle="The landmarks and streets that define this city"
        items={data.places || []} secKey="places" startIndex={5} photoSuffix="tourist attraction landmark"
        accentBg={D.blueTint} accentColor="#2563AB" sectionRef={secRefs.places}
      />
      <Sec
        icon="✨" title="Local Experiences" subtitle="Things to do that no guidebook will tell you"
        items={data.experiences || []} secKey="exp" startIndex={10} photoSuffix="travel experience"
        accentBg="#EEEDFE" accentColor="#534AB7" sectionRef={secRefs.exp}
      />

      {/* ── Insider tip ── */}
      {data.tip && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: D.surface, border: `0.5px solid ${D.border}`, borderLeft: `3px solid ${D.gold}`, borderRadius: 12, padding: '12px 14px', boxShadow: '0 2px 8px rgba(28,20,16,0.06)' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: D.gold, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 4, fontFamily: "'DM Sans',sans-serif" }}>Insider Tip</div>
            <div style={{ fontSize: 13, color: D.secondary, lineHeight: 1.65 }}>{data.tip}</div>
          </div>
        </div>
      )}
    </div>
  );

  /* ── Idle / entry state ── */
  return (
    <div style={{ background: D.bg }}>
      {/* Hero entry card */}
      <div style={{
        position: 'relative', borderRadius: 18, overflow: 'hidden', marginBottom: '1.25rem',
        background: 'linear-gradient(135deg, #1C1410 0%, #8B5E3C 60%, #C9913A 100%)',
        padding: '2rem 1.5rem', textAlign: 'center', boxShadow: '0 4px 20px rgba(28,20,16,0.18)',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, fontSize: 150, opacity: 0.05, lineHeight: 1 }}>🍜</div>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🍽️</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6, fontFamily: "'Sora',sans-serif", letterSpacing: -0.3 }}>Local Taste Guide</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.68)', lineHeight: 1.65, maxWidth: 280, margin: '0 auto 0' }}>
          Iconic dishes, legendary spots, and local secrets — curated by AI, verified by taste.
        </div>
      </div>

      {/* Input card */}
      <div style={{ background: D.surface, borderRadius: 16, padding: '1.1rem 1.25rem', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(28,20,16,0.06)', border: `0.5px solid ${D.border}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Where are you headed?</div>
        <input
          style={{ width: '100%', border: `1.5px solid ${D.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: "'DM Sans',sans-serif", color: D.espresso, background: D.bg, outline: 'none', boxSizing: 'border-box' }}
          value={dest}
          onChange={e => setDest(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && generate()}
          placeholder="e.g. Jaipur, Rajasthan"
        />
        <button
          style={{ width: '100%', marginTop: 10, padding: '12px', fontSize: 14, fontWeight: 700, borderRadius: 12, border: 'none', cursor: dest.trim() ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans',sans-serif", background: dest.trim() ? (isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : `linear-gradient(135deg,${D.gold},#A8731E)`) : D.neutral, color: dest.trim() ? '#fff' : D.muted, transition: 'all .2s', opacity: dest.trim() ? 1 : 0.6 }}
          onClick={generate}
          disabled={!dest.trim()}
        >
          ✨ Discover local flavours
        </button>
      </div>

      {/* Quick-pick chips */}
      <div style={{ fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Popular destinations</div>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {['Jaipur', 'Udaipur', 'Goa', 'Varanasi', 'Mumbai', 'Coorg', 'Hampi'].map(c => (
          <button
            key={c}
            onClick={() => setDest(c)}
            style={{ fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 999, border: `0.5px solid ${D.border}`, background: D.surface, color: D.secondary, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", boxShadow: '0 1px 4px rgba(28,20,16,0.05)' }}
          >{c}</button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ITINERARY PAGE
═══════════════════════════════════════════════════════ */
const SLOT_LABELS = {
  night: '12AM–6AM',
  morning: '6AM–12PM',
  afternoon: '12PM–6PM',
  evening: '6PM–12AM',
};

const SLOT_ORDER = ['morning', 'afternoon', 'evening'];

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatTripDate(arrivalStr, dayIndex) {
  // dayIndex: 0 = arrival day
  const base = new Date(arrivalStr);
  base.setDate(base.getDate() + dayIndex);
  return `${base.getDate()} ${MONTH_NAMES[base.getMonth()]}`;
}

function ItineraryPage({ trip, onCacheUpdate }) {
  const isSolo = trip.isSolo;
  const [iTab, setITab] = useState('planner');

  const [form] = useState({
    dest: trip.destination || '',
    arrival: trip.arrival ? new Date(trip.arrival).toISOString().split('T')[0] : '',
    departure: trip.departure ? new Date(trip.departure).toISOString().split('T')[0] : '',
    arrivalSlot: trip.arrivalSlot || 'morning',
    departureSlot: trip.departureSlot || 'morning',
    budget: trip.budget ? String(trip.budget) : '',
    people: String(normalizeMembers(trip.members).length || 1),
    travelNotes: trip.travelNotes || '',
  });

  const [heroPhotoUrl, setHeroPhotoUrl] = useState(null);

  useEffect(() => {
    if (!form.dest) return;
    import('../../api').then(({ fetchPlacePhotos }) => {
      fetchPlacePhotos(`${form.dest} city landscape aerial skyline travel`)
        .then(data => { if (data.urls?.[0]) setHeroPhotoUrl(data.urls[0]); })
        .catch(() => {});
    });
  }, [form.dest]);

  const days = form.arrival && form.departure
    ? Math.max(1, Math.round((new Date(form.departure) - new Date(form.arrival)) / 86400000))
    : 1;

  const [step, setStep] = useState(trip._cachedItin ? 'result' : 'loading');
  const [itin, setItin] = useState(trip._cachedItin?.itinerary || null);
  const [sources, setSources] = useState(trip._cachedItin?.sources || []);
  const [localTasteData, setLocalTasteData] = useState(trip._cachedTaste || null);
  const [localTasteStep, setLocalTasteStep] = useState(trip._cachedTaste ? 'result' : 'loading');
  const hasGenerated = useRef(false);
  const [doneActivities, setDoneActivities] = useState(new Set());
  const toggleActivity = (key) => setDoneActivities(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  const accentStyle = isSolo ? S.btnSolo : S.btnP;
  const accentColor = isSolo ? '#7F77DD' : '#1D9E75';
  const headerBg = isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : 'linear-gradient(135deg,#1D9E75,#0F6E56)';

  const TYPE_ICONS = {
    attraction: '🏛️', food: '🍽️', experience: '✨',
    transport: '🚗', hotel: '🏨', shopping: '🛍️',
  };

  const ENERGY_CONFIG = {
    high:   { label: 'Active',   symbol: '▲▲', bg: '#FAECE7', color: '#993C1D' },
    medium: { label: 'Moderate', symbol: '▲',  bg: '#E6F1FB', color: '#1A6BAD' },
    low:    { label: 'Easy',     symbol: '–',  bg: '#E8F8EE', color: '#1A7A4A' },
    rest:   { label: 'Rest',     symbol: '○',  bg: '#F4F3FF', color: '#534AB7' },
  };

  const firstActivitySlot = () => {
    const idx = SLOT_ORDER.indexOf(form.arrivalSlot);
    return SLOT_ORDER[Math.min(idx + 1, SLOT_ORDER.length - 1)];
  };

  useEffect(() => {
    // If we already have cached data from the trip prop, show it immediately
    if (trip._cachedItin) {
      setItin(trip._cachedItin.itinerary);
      setSources(trip._cachedItin.sources || []);
      setStep('result');
    }
    if (trip._cachedTaste) {
      setLocalTasteData(trip._cachedTaste);
      setLocalTasteStep('result');
    }

    // Only generate what's missing
    if (!hasGenerated.current) {
      hasGenerated.current = true;
      if (!trip._cachedItin) runGenerateItinerary();
      if (!trip._cachedTaste) runGenerateLocalTaste();
    }
  }, [trip._cachedItin, trip._cachedTaste]);

  const runGenerateItinerary = async () => {
    setStep('loading');
    try {
      const { generateItinerary } = await import('../../api');
      const result = await generateItinerary({
        destination: form.dest,
        days,
        budget: form.budget ? parseFloat(form.budget) : null,
        people: parseInt(form.people) || 1,
        interests: ['🛕 Temples', '🍽️ Food', '🛍️ Shopping'],
        arrivalSlot: form.arrivalSlot,
        departureSlot: form.departureSlot,
        firstActivitySlot: firstActivitySlot(),
        arrival: form.arrival,
        travelNotes: form.travelNotes || '',
      });
      setItin(result.itinerary);
      setSources(result.sources || []);
      setStep('result');
      // ── Save back to parent trips state so it persists across tab switches ──
      onCacheUpdate?.({ _cachedItin: result });
    } catch {
      setStep('error');
    }
  };

  const runGenerateLocalTaste = async () => {
    setLocalTasteStep('loading');
    try {
      const { generateLocalTaste } = await import('../../api');
      const r = await generateLocalTaste({ destination: form.dest });
      setLocalTasteData(r);
      setLocalTasteStep('result');
      // ── Save back to parent ──
      onCacheUpdate?.({ _cachedTaste: r });
    } catch {
      setLocalTasteStep('error');
    }
  };

  const handleRedo = () => {
    onCacheUpdate?.({ _cachedItin: null });
    setShowDescBox(true);
  };

  const SlotBadge = ({ slot, label }) => (
    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#fff' }}>
      {label} {SLOT_LABELS[slot]}
    </div>
  );

  const ITABS = [{ id: 'planner', label: '🗺️ Day Planner' }, { id: 'taste', label: '🍜 Local Taste' }];
  const [lightboxUrl, setLightboxUrl] = useState(null);

  return (
    <div>
      <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />

      {/* ── Underline tab switcher (Club-style) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', borderBottom: '1.5px solid rgba(28,20,16,0.1)', marginBottom: '1rem' }}>
        {ITABS.map(t => (
          <button key={t.id} onClick={() => setITab(t.id)}
            style={{ ...S.navTab, ...(iTab === t.id ? S.navTabActive : {}), position: 'relative', padding: '9px 2px 10px', fontSize: 12, borderRadius: 0 }}>
            <span style={{ fontWeight: iTab === t.id ? 700 : 500, fontSize: 12 }}>{t.label}</span>
            {iTab === t.id && (
              <span style={{ position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 2.5, borderRadius: '99px 99px 0 0', background: isSolo ? '#7F77DD' : D.gold }} />
            )}
          </button>
        ))}
      </div>

      {iTab === 'planner' && (
        <div>
          {step === 'loading' && (
            <div style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
              <div style={isSolo ? S.soloSpinner : S.spinner} />
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                Building your itinerary…
              </div>
              <div style={{ fontSize: 13, color: '#6b6b68', lineHeight: 1.7 }}>
                🔍 Scanning TripAdvisor, Lonely Planet & travel blogs<br />
                📊 Ranking attractions by ratings & reviews<br />
                🗓️ Scheduling from your {SLOT_LABELS[firstActivitySlot()]} arrival slot
              </div>
            </div>
          )}

          {step === 'error' && (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Couldn't generate itinerary</div>
              <button style={{ ...S.btn, ...accentStyle, padding: '10px 24px' }} onClick={runGenerateItinerary}>Try Again</button>
            </div>
          )}

          {step === 'result' && itin && (
            <div style={{ background: D.bg, paddingBottom: '2.5rem' }}>

              {/* ── Hero: destination photo + gradient overlay ─── */}
              <div style={{
                position: 'relative',
                minHeight: 220,
                borderRadius: 18,
                overflow: 'hidden',
                marginBottom: '1.25rem',
                boxShadow: '0 4px 24px rgba(28,20,16,0.18)',
              }}>
                {/* photo layer */}
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: heroPhotoUrl ? `url(${heroPhotoUrl})` : 'linear-gradient(135deg, #1C1410 0%, #4A2E1A 50%, #C9913A 100%)',
                  backgroundSize: 'cover', backgroundPosition: 'center',
                  filter: 'brightness(0.9)',
                  transition: 'background-image 0.5s ease',
                }} />
                {/* gradient overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to bottom, transparent 0%, rgba(10,8,6,0.2) 40%, rgba(10,8,6,0.88) 100%)',
                }} />
                {/* content sits above layers */}
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 220, padding: '1.25rem 1.25rem 1.25rem' }}>
                  {/* arrival / departure pills — top of content area */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 'auto', paddingTop: 14 }}>
                    <span style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.30)', borderRadius: 999, padding: '4px 11px', fontSize: 11, color: '#fff', fontWeight: 500, backdropFilter: 'blur(6px)' }}>
                      ✈️ {SLOT_LABELS[form.arrivalSlot]}
                    </span>
                    <span style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.30)', borderRadius: 999, padding: '4px 11px', fontSize: 11, color: '#fff', fontWeight: 500, backdropFilter: 'blur(6px)' }}>
                      🛬 {SLOT_LABELS[form.departureSlot]}
                    </span>
                  </div>
                  {/* title */}
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: -0.4, lineHeight: 1.25, marginBottom: 5, fontFamily: "'Sora',sans-serif", textShadow: '0 1px 8px rgba(0,0,0,0.4)', marginTop: 40 }}>
                    {itin.headline || `${days}-Day ${form.dest} Itinerary`}
                  </div>
                  {itin.summary && (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: 12 }}>{itin.summary}</div>
                  )}
                  {/* budget + best time */}
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {itin.totalEstimatedCost && (
                      <span style={{ background: 'rgba(255,255,255,0.15)', border: '0.5px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(6px)', borderRadius: 999, padding: '4px 12px', fontSize: 12, color: '#F5D9A8', fontWeight: 700 }}>
                        🔥 {itin.totalEstimatedCost}
                      </span>
                    )}
                    {itin.bestTimeToVisit && (
                      <span style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)', borderRadius: 999, padding: '4px 12px', fontSize: 11, color: 'rgba(255,255,255,0.70)' }}>
                        🗓 {itin.bestTimeToVisit}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Quick tips: labelled horizontal scroll ───────── */}
              {itin.quickTips?.length > 0 && (
                <div style={{ marginBottom: '1.25rem', marginTop: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8, paddingLeft: 2, fontFamily: "'DM Sans',sans-serif" }}>QUICK TIPS</div>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, paddingLeft: 0 }}>
                    {itin.quickTips.map((tip, i) => (
                      <div key={i} style={{ flexShrink: 0, background: '#FDF0EE', border: '0.5px solid #F5C4B3', borderRadius: 20, padding: '8px 14px', maxWidth: 230, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 13, flexShrink: 0, lineHeight: 1.4 }}>💡</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#C9533A', lineHeight: 1.5, fontFamily: "'DM Sans',sans-serif" }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Disclaimer ───────────────────────────────────── */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: D.surface, border: `0.5px solid ${D.border}`, borderRadius: 10, padding: '9px 12px', marginBottom: '1.25rem', fontSize: 11, color: D.muted, lineHeight: 1.6, boxShadow: D.cardShadow }}>
                <span style={{ flexShrink: 0 }}>ℹ️</span>
                <span>Hours marked <strong style={{ color: D.sage }}>✓ verified</strong> come from sourced publications; <strong style={{ color: '#7A6FCF' }}>est.</strong> are safe estimates — always confirm. Prices are approximate.</span>
              </div>

              {/* ── Day sections ─────────────────────────────────── */}
              {(() => {
                let photoIndex = 0;
                return (itin.days || []).map((d, dayIndex) => {
                  const dateLabel = form.arrival ? formatTripDate(form.arrival, dayIndex) : `Day ${d.day}`;
                  const isArrivalDay   = dayIndex === 0;
                  const isDepartureDay = dayIndex === (itin.days.length - 1);
                  const dayTotalCount  = (d.activities || []).length;
                  const dayDoneCount   = (d.activities || []).filter((_, ai) => doneActivities.has(`day-${d.day}-act-${ai}`)).length;
                  const weatherIcon    = d.weather?.high > 30 ? '☀️' : d.weather?.high > 18 ? '⛅' : '🌨';

                  return (
                    <div key={d.day} style={{ marginBottom: '1.5rem' }}>

                      {/* ── Day header: left gold bar + italic serif theme ── */}
                      <div style={{ display: 'flex', alignItems: 'stretch', background: D.surface, borderRadius: 12, marginBottom: 10, overflow: 'hidden', boxShadow: '0 2px 8px rgba(28,20,16,0.06)' }}>
                        {/* 3px gold left accent */}
                        <div style={{ width: 3, background: D.gold, flexShrink: 0 }} />
                        <div style={{ flex: 1, padding: '10px 12px' }}>
                          {/* top row: date label left, temp + badges right */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 500, color: D.muted, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: "'DM Sans',sans-serif" }}>{dateLabel}</span>
                            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                              {d.weather && <span style={{ fontSize: 11, color: D.muted, fontFamily: "'DM Sans',sans-serif" }}>{weatherIcon} <span style={{ color: D.coral }}>{d.weather.high}°</span>/{d.weather.low}°</span>}
                              {d.estimatedCost && <span style={{ fontSize: 10, fontWeight: 600, background: D.goldTint, color: D.gold, borderRadius: 999, padding: '1px 7px' }}>{d.estimatedCost}</span>}
                            </div>
                          </div>
                          {/* theme in italic serif */}
                          <div style={{ fontSize: 16, fontStyle: 'italic', color: D.espresso, fontFamily: "'Georgia',serif", lineHeight: 1.3, marginBottom: 5 }}>{d.title || d.theme}</div>
                          {/* badge row */}
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                            {isArrivalDay && <span style={{ fontSize: 9, fontWeight: 700, background: D.blueTint, color: '#2563AB', borderRadius: 999, padding: '1px 6px' }}>✈ Arrives</span>}
                            {isDepartureDay && <span style={{ fontSize: 9, fontWeight: 700, background: D.coralTint, color: D.coral, borderRadius: 999, padding: '1px 6px' }}>🛫 Departs</span>}
                            {dayDoneCount > 0 && <span style={{ fontSize: 9, fontWeight: 700, background: D.sageTint, color: D.sage, borderRadius: 999, padding: '1px 7px' }}>✓ {dayDoneCount}/{dayTotalCount} done</span>}
                          </div>
                        </div>
                        {/* Day number badge on right */}
                        <div style={{ width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: isSolo ? 'linear-gradient(160deg,#7F77DD,#534AB7)' : `linear-gradient(160deg,${D.gold},#A8731E)`, flexShrink: 0 }}>
                          <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: .5, lineHeight: 1 }}>Day</span>
                          <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>{d.day}</span>
                        </div>
                      </div>

                      {/* weather + proTip slim bars */}
                      {d.weather?.tip && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: isSolo ? '#F4F3FF' : '#F0FAF6', borderRadius: 8, padding: '7px 12px', marginBottom: 8, fontSize: 11.5, color: isSolo ? '#534AB7' : '#0F6E56', lineHeight: 1.5 }}>
                          💡 {d.weather.tip}
                        </div>
                      )}
                      {d.proTip && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#FFFBF5', border: `2px solid ${D.gold}`, borderLeft: `3px solid ${D.gold}`, borderRadius: 8, padding: '7px 12px', marginBottom: 10, fontSize: 12, color: '#5a3a0a', lineHeight: 1.55 }}>
                          <span style={{ flexShrink: 0 }}>🎯</span>
                          <span><strong>Local tip:</strong> {d.proTip}</span>
                        </div>
                      )}

                      {/* Activities */}
                      {(d.activities || []).map((a, i) => {
                        const showPhoto  = a.type !== 'hotel' && a.type !== 'transport' && a.type !== 'travel';
                        const currentDelay = showPhoto ? photoIndex++ * 600 : 0;
                        const isLast   = i === d.activities.length - 1;
                        const doneKey  = `day-${d.day}-act-${i}`;
                        const isDone   = doneActivities.has(doneKey);
                        const isActive = isActiveSlot(a.time, a.endTime);
                        const dotColor = isActive ? D.gold : (a.mustDo ? D.gold : '#D3CFC8');
                        const allTags  = [
                          ...(a.mustDo ? ['MUST DO'] : []),
                          ...(a.energyLevel && ENERGY_CONFIG[a.energyLevel] ? [ENERGY_CONFIG[a.energyLevel].label] : []),
                        ];
                        const typeAccent = a.type === 'food' ? D.coral : a.type === 'experience' ? '#7F77DD' : a.type === 'shopping' ? D.sage : a.mustDo ? D.gold : D.border;

                        return (
                          <div key={i}>
                            {/* Timeline row */}
                            <div style={{ display: 'flex', gap: 0, opacity: isDone ? 0.42 : 1, transition: 'opacity .3s' }}>

                              {/* Time + dot column */}
                              <div style={{ width: 52, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 10, paddingTop: 5 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: D.espresso, lineHeight: 1, fontFamily: "'DM Sans',sans-serif" }}>{a.time}</span>
                                {a.endTime && <span style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>{a.endTime}</span>}
                              </div>

                              {/* Connector */}
                              <div style={{ width: 20, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 7 }}>
                                <div style={{ position: 'relative', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {isActive && <div className="itin-dot-glow" style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: 'rgba(201,145,58,0.22)' }} />}
                                  <div className={isActive ? 'itin-dot-active' : ''} style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, zIndex: 1, boxShadow: (isActive || a.mustDo) ? `0 0 0 3px ${D.goldTint}` : 'none' }} />
                                </div>
                                {!isLast && <div style={{ width: 1.5, flex: 1, background: D.divider, marginTop: 1 }} />}
                              </div>

                              {/* ── PHOTO-FIRST activity card ── */}
                              <div
                                className="itin-card-enter itin-photo-card"
                                style={{ flex: 1, marginLeft: 10, marginBottom: 10, background: D.surface, borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(28,20,16,0.06)', border: `0.5px solid ${D.border}`, borderLeft: showPhoto ? `0.5px solid ${D.border}` : `3px solid ${typeAccent}`, minWidth: 0, animationDelay: `${i * 60}ms` }}
                              >
                                {/* Photo at top (non-hotel/transport only) */}
                                {showPhoto && (
                                  <div
                                    style={{ position: 'relative', height: 150, overflow: 'hidden', cursor: 'zoom-in', background: D.neutral }}
                                    onClick={e => { const img = e.currentTarget.querySelector('img'); if (img?.src) setLightboxUrl(img.src); }}
                                  >
                                    <PlacePhoto
                                      query={`${a.name} ${form.dest} ${a.type === 'food' ? 'restaurant dish food' : a.type === 'experience' ? 'travel experience' : a.type === 'shopping' ? 'market shopping' : 'tourist attraction landmark'}`}
                                      style={{ height: 150, borderRadius: 0 }}
                                      delay={currentDelay}
                                    />
                                    {/* gradient on photo */}
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(28,20,16,0.62) 100%)', pointerEvents: 'none' }} />
                                    {/* activity type badge top-left */}
                                    <div className="itin-float" style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(255,255,255,0.92)', borderRadius: 10, padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 4, backdropFilter: 'blur(4px)', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
                                      <span style={{ fontSize: 14 }}>{a.icon || TYPE_ICONS[a.type] || '📍'}</span>
                                      <span style={{ fontSize: 10, fontWeight: 700, color: D.espresso, textTransform: 'uppercase', letterSpacing: .5, fontFamily: "'DM Sans',sans-serif" }}>{a.type}</span>
                                    </div>
                                    {/* mustDo gold badge top-right */}
                                    {a.mustDo && (
                                      <div style={{ position: 'absolute', top: 10, right: 10, background: D.gold, borderRadius: 999, padding: '3px 9px', fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: .6, textTransform: 'uppercase', fontFamily: "'DM Sans',sans-serif", boxShadow: '0 2px 8px rgba(201,145,58,0.45)' }}>★ Must Do</div>
                                    )}
                                    {/* name + time overlaid */}
                                    <div style={{ position: 'absolute', bottom: 10, left: 12, right: 12, pointerEvents: 'none' }}>
                                      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2, textShadow: '0 1px 6px rgba(0,0,0,0.5)', fontFamily: "'Sora',sans-serif", textDecoration: isDone ? 'line-through' : 'none' }}>{a.name}</div>
                                    </div>
                                    {/* done overlay */}
                                    {isDone && (
                                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,20,16,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(1px)' }}>
                                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                            <polyline points="4,12 9,17 20,7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Card body */}
                                <div style={{ padding: '11px 13px 12px' }}>
                                  {/* Name row for hotel/transport (no photo) */}
                                  {!showPhoto && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                                      <span style={{ fontSize: 18 }}>{a.icon || TYPE_ICONS[a.type] || '📍'}</span>
                                      <span style={{ fontSize: 14, fontWeight: 700, color: isDone ? D.muted : D.espresso, textDecoration: isDone ? 'line-through' : 'none', fontFamily: "'Sora',sans-serif" }}>{a.name}</span>
                                    </div>
                                  )}

                                  {/* Tags */}
                                  {allTags.length > 0 && (
                                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 7 }}>
                                      {allTags.map((tag, ti) => {
                                        const ts = tagStyle(tag, tag === 'MUST DO');
                                        return <span key={ti} style={{ fontSize: 10, fontWeight: 700, letterSpacing: .7, textTransform: 'uppercase', padding: '2px 9px', borderRadius: 999, background: ts.bg, color: ts.color }}>{tag}</span>;
                                      })}
                                    </div>
                                  )}

                                  {/* Opening hours */}
                                  {a.openingHours && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                                      <span style={{ fontSize: 11 }}>🕐</span>
                                      <span style={{ fontSize: 11.5, color: D.muted }}>Open {a.openingHours}</span>
                                      {a.hoursSource === 'verified'  && <span style={{ fontSize: 9, fontWeight: 700, background: D.sageTint, color: D.sage, borderRadius: 4, padding: '1px 5px' }}>✓ verified</span>}
                                      {a.hoursSource === 'estimated' && <span style={{ fontSize: 9, fontStyle: 'italic', background: '#F4F3FF', color: '#7A6FCF', borderRadius: 4, padding: '1px 5px' }}>est.</span>}
                                    </div>
                                  )}

                                  {/* Description */}
                                  {(a.note || a.description) && (
                                    <div style={{ fontSize: 12.5, color: D.secondary, lineHeight: 1.65, marginBottom: 7 }}>{a.note || a.description}</div>
                                  )}

                                  {/* Heads-up warning */}
                                  {a.headsUp && (
                                    <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start', background: '#FFFBF0', border: '0.5px solid #FAC775', borderRadius: 6, padding: '7px 10px', marginBottom: 7 }}>
                                      <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.2 }}>⚠️</span>
                                      <span style={{ fontSize: 11, color: '#7A4F00', lineHeight: 1.5 }}>{a.headsUp}</span>
                                    </div>
                                  )}

                                  {/* Meta row */}
                                  {(a.duration || a.cost || a.area) && (
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 9 }}>
                                      {a.duration && <span style={{ fontSize: 11, color: D.muted }}>⏱ {a.duration}</span>}
                                      {a.cost && <span style={{ fontSize: 11, color: D.gold, fontWeight: 700 }}>🔥 {a.cost}</span>}
                                      {a.area && <span style={{ fontSize: 11, color: D.muted }}>📍 {a.area}</span>}
                                    </div>
                                  )}

                                  {/* Action pills */}
                                  {a.type !== 'hotel' && a.type !== 'transport' && a.type !== 'travel' && (
                                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                                      <a className="itin-action-pill"
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.name} ${form.dest}`)}`}
                                        target="_blank" rel="noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#2563AB', background: D.blueTint, borderRadius: 999, padding: '6px 14px', textDecoration: 'none', fontWeight: 600, border: 'none', fontFamily: "'DM Sans',sans-serif" }}
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                        Maps
                                      </a>
                                      <a className="itin-action-pill"
                                        href={`https://www.google.com/search?q=${encodeURIComponent(`${a.name} ${form.dest}`)}`}
                                        target="_blank" rel="noreferrer"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: D.secondary, background: D.neutral, borderRadius: 999, padding: '6px 14px', textDecoration: 'none', fontWeight: 600, border: 'none', fontFamily: "'DM Sans',sans-serif" }}
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                        Know more
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Done toggle */}
                              <button
                                onClick={() => toggleActivity(doneKey)}
                                style={{
                                  flexShrink: 0, alignSelf: 'flex-start', marginTop: 6, marginLeft: 6,
                                  width: 28, height: 28, borderRadius: '50%',
                                  border: isDone ? 'none' : `1.5px solid ${D.border}`,
                                  background: isDone ? accentColor : D.surface,
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  boxShadow: isDone ? `0 2px 8px ${accentColor}55` : 'none',
                                  transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                                }}
                              >
                                {isDone ? (
                                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                    <polyline points="2.5,6.5 5.5,9.5 10.5,3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                ) : (
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <circle cx="6" cy="6" r="5" stroke={D.border} strokeWidth="1.5"/>
                                  </svg>
                                )}
                              </button>
                            </div>

                            {/* Transit chip */}
                            {!isLast && a.travelToNext && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0 8px 20px' }}>
                                <div style={{ flex: 1, height: 1, background: D.divider }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: D.neutral, borderRadius: 999, padding: '3px 10px', fontSize: 11, color: D.muted, flexShrink: 0 }}>
                                  <span style={{ fontSize: 13 }}>🚶</span> {a.travelToNext}
                                </div>
                                <div style={{ flex: 1, height: 1, background: D.divider }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              })()}

              {sources.length > 0 && (
                <div style={{ background: D.surface, border: `0.5px solid ${D.border}`, borderRadius: 12, padding: '12px 14px', marginTop: 4, boxShadow: D.cardShadow }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 10 }}>🔍 Researched from</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {sources.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, color: isSolo ? '#534AB7' : '#0F6E56', background: isSolo ? '#EEEDFE' : D.sageTint, borderRadius: 999, padding: '4px 11px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                        🔗 {s.title?.slice(0, 28) || new URL(s.url).hostname}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {iTab === 'taste' && (
        <LocalTastePage
          destination={form.dest}
          isSolo={isSolo}
          autoData={localTasteData}
          autoStep={localTasteStep}
          onRetry={runGenerateLocalTaste}
        />
      )}
    </div>
  );
}
/* ═══════════════════════════════════════════════════════
   TRIP AI CHATBOT
═══════════════════════════════════════════════════════ */
export default ItineraryPage;
export { LocalTastePage };
