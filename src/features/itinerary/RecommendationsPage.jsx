// src/features/itinerary/RecommendationsPage.jsx
// ═══════════════════════════════════════════════════════════════════
// "Nearby" — Hotels · Hospitals · Rentals
// Data is read from the backend DB (Supabase via Prisma).
// The backend fetches from Serper & Geoapify and caches for 30 days.
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { PlacePhoto } from '../media/PlaceMedia';

/* ── Design tokens (matches ItineraryPage) ── */
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

/* ── Inject CSS once ── */
if (typeof document !== 'undefined' && !document.getElementById('recs-styles')) {
  const el = document.createElement('style');
  el.id = 'recs-styles';
  el.textContent = `
    @keyframes recCardIn {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .rec-card { animation: recCardIn 0.34s cubic-bezier(0.34,1.3,0.64,1) both; }
    .rec-hotel-card:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(28,20,16,0.13) !important; }
    .rec-hotel-card { transition: transform 0.2s ease, box-shadow 0.2s ease; cursor: default; }
    .rec-chip { transition: background 0.15s ease, color 0.15s ease; }
  `;
  document.head.appendChild(el);
}

/* ── Star renderer ── */
function Stars({ rating }) {
  if (!rating) return null;
  const r    = parseFloat(rating);
  if (isNaN(r)) return null;
  const full = Math.floor(r);
  const half = r - full >= 0.3;
  const arr  = [];
  for (let i = 0; i < 5; i++) {
    if (i < full)                    arr.push('★');
    else if (i === full && half)     arr.push('½');
    else                             arr.push('☆');
  }
  return (
    <span style={{ fontSize: 11, letterSpacing: 0.5 }}>
      <span style={{ color: '#E6A817' }}>{arr.slice(0, full + (half ? 1 : 0)).join('')}</span>
      <span style={{ color: '#D3D1C7' }}>{arr.slice(full + (half ? 1 : 0)).join('')}</span>
      <span style={{ fontFamily: "'DM Sans',sans-serif", color: D.muted, marginLeft: 4, fontSize: 10 }}>
        {r.toFixed(1)}
      </span>
    </span>
  );
}

/* ── Price badge ── */
const PRICE_CONFIG = {
  budget:  { label: 'Budget',  bg: D.sageTint,  color: D.sage,   icon: '₹'    },
  mid:     { label: 'Mid',     bg: D.goldTint,  color: D.gold,   icon: '₹₹'   },
  luxury:  { label: 'Luxury',  bg: '#FFF0F6',   color: '#9B2260', icon: '₹₹₹' },
};
function PriceBadge({ level }) {
  const cfg = PRICE_CONFIG[level] || PRICE_CONFIG.mid;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color, borderRadius: 999, padding: '2px 8px' }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

/* ── Category badge ── */
const CAT_CONFIG = {
  hospital:  { bg: '#FEE2E2', color: '#B91C1C', icon: '🏥' },
  clinic:    { bg: D.blueTint, color: '#1D4ED8', icon: '🩺' },
  pharmacy:  { bg: D.sageTint, color: '#166534', icon: '💊' },
  emergency: { bg: '#FEF3C7', color: '#92400E', icon: '🚨' },
};
function CatBadge({ cat }) {
  const cfg = CAT_CONFIG[cat] || CAT_CONFIG.clinic;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, background: cfg.bg, color: cfg.color, borderRadius: 6, padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {cfg.icon} {cat.charAt(0).toUpperCase() + cat.slice(1)}
    </span>
  );
}

/* ── Section header ── */
function SecHeader({ icon, title, subtitle, count, accentColor, accentBg }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
      background: D.surface, borderRadius: 16, padding: '12px 14px',
      boxShadow: '0 2px 12px rgba(28,20,16,0.07)', border: `0.5px solid ${D.border}`,
      borderLeft: `4px solid ${accentColor}`,
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 13, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: D.espresso, fontFamily: "'Sora',sans-serif", lineHeight: 1.1 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <span style={{ fontSize: 18, fontWeight: 800, color: accentColor, fontFamily: "'Sora',sans-serif", lineHeight: 1 }}>{count}</span>
        <div style={{ fontSize: 9, color: D.muted, textTransform: 'uppercase', letterSpacing: .5 }}>listed</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   HOTELS SECTION
───────────────────────────────────────────────────────────────── */
function HotelsSection({ hotels, destination }) {
  const [priceFilter, setPriceFilter] = useState('all'); // all | budget | mid | luxury
  const [minRating,   setMinRating]   = useState(0);     // 0 = no filter

  const PRICE_FILTERS = [
    { id: 'all',    label: 'All' },
    { id: 'budget', label: '₹ Budget' },
    { id: 'mid',    label: '₹₹ Mid' },
    { id: 'luxury', label: '₹₹₹ Luxury' },
  ];
  const RATING_FILTERS = [
    { v: 0,   label: 'Any' },
    { v: 3,   label: '3+' },
    { v: 3.5, label: '3.5+' },
    { v: 4,   label: '4+' },
    { v: 4.5, label: '4.5+' },
  ];

  const filtered = hotels.filter(h => {
    if (priceFilter !== 'all' && h.priceLevel !== priceFilter) return false;
    if (minRating > 0 && (!h.rating || h.rating < minRating)) return false;
    return true;
  });

  if (!hotels.length) return null;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <SecHeader
        icon="🏨" title="Hotels & Stays"
        subtitle="Curated options — tap to view on Maps"
        count={filtered.length}
        accentColor={D.gold} accentBg={D.goldTint}
      />

      {/* Filter bar */}
      <div style={{ marginBottom: 12 }}>
        {/* Price filters */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, marginBottom: 8 }}>
          {PRICE_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setPriceFilter(f.id)}
              className="rec-chip"
              style={{
                flexShrink: 0,
                fontSize: 11, fontWeight: 700,
                padding: '5px 12px', borderRadius: 999,
                border: `1.5px solid ${priceFilter === f.id ? D.gold : D.border}`,
                background: priceFilter === f.id ? D.goldTint : D.surface,
                color: priceFilter === f.id ? D.gold : D.muted,
                cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
              }}
            >{f.label}</button>
          ))}
        </div>
        {/* Rating filters */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: .6, flexShrink: 0 }}>Min ★</span>
          {RATING_FILTERS.map(f => (
            <button
              key={f.v}
              onClick={() => setMinRating(f.v)}
              className="rec-chip"
              style={{
                flexShrink: 0,
                fontSize: 11, fontWeight: 700,
                padding: '4px 10px', borderRadius: 999,
                border: `1.5px solid ${minRating === f.v ? '#E6A817' : D.border}`,
                background: minRating === f.v ? '#FEF3C7' : D.surface,
                color: minRating === f.v ? '#92400E' : D.muted,
                cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
              }}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* No results */}
      {!filtered.length && (
        <div style={{ textAlign: 'center', padding: '2rem', color: D.muted, fontSize: 13 }}>
          No hotels match these filters.
        </div>
      )}

      {/* Hotel cards — 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {filtered.map((h, i) => (
          <a
            key={h.id || i}
            className="rec-card rec-hotel-card"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + ' ' + destination)}`}
            target="_blank" rel="noreferrer"
            style={{
              textDecoration: 'none',
              background: D.surface,
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: D.cardShadow,
              border: `0.5px solid ${D.border}`,
              display: 'flex', flexDirection: 'column',
              animationDelay: `${i * 40}ms`,
            }}
          >
            {/* Photo */}
            <div style={{ height: 100, overflow: 'hidden', background: D.neutral, position: 'relative' }}>
              {h.imageUrl ? (
                <img
                  src={h.imageUrl} alt={h.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <PlacePhoto
                  query={`${h.name} ${destination} hotel`}
                  style={{ height: 100, borderRadius: 0 }}
                  delay={i * 300}
                />
              )}
              {/* Price badge overlay */}
              <div style={{ position: 'absolute', top: 7, right: 7 }}>
                <PriceBadge level={h.priceLevel} />
              </div>
            </div>
            {/* Body */}
            <div style={{ padding: '8px 10px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: D.espresso, lineHeight: 1.25, fontFamily: "'Sora',sans-serif" }}>
                {h.name}
              </div>
              {h.rating && <Stars rating={h.rating} />}
              {h.address && (
                <div style={{ fontSize: 10.5, color: D.muted, lineHeight: 1.4, marginTop: 2 }}>
                  📍 {h.address.length > 55 ? h.address.slice(0, 55) + '…' : h.address}
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   HOSPITALS SECTION
───────────────────────────────────────────────────────────────── */
function HospitalsSection({ hospitals }) {
  if (!hospitals.length) return null;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <SecHeader
        icon="🏥" title="Hospitals & Clinics"
        subtitle="Nearby healthcare — 24h centres shown first"
        count={hospitals.length}
        accentColor="#B91C1C" accentBg="#FEE2E2"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {hospitals.map((h, i) => (
          <a
            key={h.id || i}
            className="rec-card"
            href={
              h.lat && h.lng
                ? `https://www.google.com/maps/search/?api=1&query=${h.lat},${h.lng}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name)}`
            }
            target="_blank" rel="noreferrer"
            style={{
              textDecoration: 'none',
              background: D.surface,
              borderRadius: 14,
              padding: '12px 14px',
              boxShadow: D.cardShadow,
              border: `0.5px solid ${D.border}`,
              borderLeft: h.is24h ? '3px solid #B91C1C' : `0.5px solid ${D.border}`,
              display: 'flex', alignItems: 'flex-start', gap: 12,
              animationDelay: `${i * 35}ms`,
            }}
          >
            {/* Icon */}
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: h.is24h ? '#FEE2E2' : D.neutral,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>
              {CAT_CONFIG[h.category]?.icon || '🏥'}
            </div>
            {/* Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: D.espresso, fontFamily: "'Sora',sans-serif", lineHeight: 1.2 }}>
                  {h.name}
                </span>
                {h.is24h && (
                  <span style={{ fontSize: 9, fontWeight: 800, background: '#B91C1C', color: '#fff', borderRadius: 4, padding: '2px 6px', letterSpacing: .5, flexShrink: 0 }}>
                    24H
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: h.address || h.phone ? 5 : 0 }}>
                <CatBadge cat={h.category} />
              </div>
              {h.address && (
                <div style={{ fontSize: 11, color: D.muted, lineHeight: 1.4, marginBottom: h.phone ? 3 : 0 }}>
                  📍 {h.address.length > 70 ? h.address.slice(0, 70) + '…' : h.address}
                </div>
              )}
              {h.phone && (
                <a
                  href={`tel:${h.phone}`}
                  onClick={e => e.stopPropagation()}
                  style={{ fontSize: 11, color: '#1D4ED8', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                >
                  📞 {h.phone}
                </a>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   RENTALS SECTION
───────────────────────────────────────────────────────────────── */
const RENTAL_CONFIG = {
  car:     { icon: '🚗', label: 'Cars',     bg: D.blueTint,  color: '#1D4ED8' },
  bike:    { icon: '🏍️', label: 'Bikes',    bg: D.sageTint,  color: '#166534' },
  scooter: { icon: '🛵', label: 'Scooters', bg: D.goldTint,  color: '#92400E' },
  cycle:   { icon: '🚲', label: 'Cycles',   bg: '#F4F3FF',   color: '#534AB7' },
};

function RentalCard({ rental, index }) {
  const cfg = RENTAL_CONFIG[rental.type] || RENTAL_CONFIG.car;
  return (
    <div
      className="rec-card"
      style={{
        background: D.surface, borderRadius: 14, padding: '12px 13px',
        boxShadow: D.cardShadow, border: `0.5px solid ${D.border}`,
        display: 'flex', alignItems: 'flex-start', gap: 11,
        animationDelay: `${index * 40}ms`,
      }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
        {cfg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: D.espresso, lineHeight: 1.2, marginBottom: 4, fontFamily: "'Sora',sans-serif" }}>
          {rental.name}
        </div>
        {rental.rating && <Stars rating={rental.rating} />}
        {rental.address && (
          <div style={{ fontSize: 11, color: D.muted, marginTop: 4, lineHeight: 1.4 }}>
            📍 {rental.address.length > 60 ? rental.address.slice(0, 60) + '…' : rental.address}
          </div>
        )}
        {rental.phone && (
          <a
            href={`tel:${rental.phone}`}
            style={{ fontSize: 11, color: '#1D4ED8', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 3 }}
          >
            📞 {rental.phone}
          </a>
        )}
        {rental.mapsUrl && (
          <a
            href={rental.mapsUrl}
            target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#2563AB', background: D.blueTint, borderRadius: 999, padding: '4px 11px', textDecoration: 'none', fontWeight: 600, marginTop: 6 }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            View on Maps
          </a>
        )}
      </div>
    </div>
  );
}

function RentalsSection({ rentals }) {
  const [typeFilter, setTypeFilter] = useState('all');

  const types = ['car', 'bike', 'scooter', 'cycle'].filter(t =>
    rentals.some(r => r.type === t)
  );

  const shown = typeFilter === 'all'
    ? rentals
    : rentals.filter(r => r.type === typeFilter);

  if (!rentals.length) return null;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <SecHeader
        icon="🚗" title="Rentals"
        subtitle="Cars, bikes & scooters to get around"
        count={shown.length}
        accentColor="#1D4ED8" accentBg={D.blueTint}
      />

      {/* Type filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 2 }}>
        <button
          onClick={() => setTypeFilter('all')}
          className="rec-chip"
          style={{
            flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 999,
            border: `1.5px solid ${typeFilter === 'all' ? '#1D4ED8' : D.border}`,
            background: typeFilter === 'all' ? D.blueTint : D.surface,
            color: typeFilter === 'all' ? '#1D4ED8' : D.muted,
            cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
          }}
        >All</button>
        {types.map(t => {
          const cfg = RENTAL_CONFIG[t];
          const active = typeFilter === t;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="rec-chip"
              style={{
                flexShrink: 0, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 999,
                border: `1.5px solid ${active ? cfg.color : D.border}`,
                background: active ? cfg.bg : D.surface,
                color: active ? cfg.color : D.muted,
                cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <span>{cfg.icon}</span> {cfg.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map((r, i) => (
          <RentalCard key={r.id || i} rental={r} index={i} />
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────── */
export default function RecommendationsPage({ destination, isSolo }) {
  const [step,  setStep]  = useState('loading'); // loading | result | error
  const [data,  setData]  = useState(null);       // { hotels, hospitals, rentals }
  const accentColor = isSolo ? '#7F77DD' : '#1D9E75';

  useEffect(() => {
    if (!destination) { setStep('error'); return; }
    let cancelled = false;

    (async () => {
      setStep('loading');
      try {
        const { fetchRecommendations } = await import('../../api');
        const result = await fetchRecommendations(destination);
        if (!cancelled) {
          setData(result);
          setStep('result');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[RECS] fetch error:', err);
          setStep('error');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [destination]);

  /* ── Loading ── */
  if (step === 'loading') {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', margin: '0 auto 16px',
          border: `3px solid ${isSolo ? '#7F77DD' : D.gold}`,
          borderTopColor: 'transparent', animation: 'spin 0.9s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 15, fontWeight: 700, color: D.espresso, marginBottom: 6 }}>
          Finding the best in {destination}…
        </div>
        <div style={{ fontSize: 12, color: D.muted, lineHeight: 1.7 }}>
          🏨 Searching hotels &amp; stays<br />
          🏥 Locating nearby healthcare<br />
          🚗 Finding rental services
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (step === 'error') {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: D.espresso, marginBottom: 8 }}>
          Couldn't load recommendations
        </div>
        <div style={{ fontSize: 12, color: D.muted, marginBottom: 20 }}>
          Check your connection and try again.
        </div>
        <button
          onClick={() => { setStep('loading'); setData(null); }}
          style={{
            padding: '10px 24px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none',
            background: isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : `linear-gradient(135deg,${D.gold},#A8731E)`,
            color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif",
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  const { hotels = [], hospitals = [], rentals = [] } = data || {};
  const total = hotels.length + hospitals.length + rentals.length;

  /* ── Result ── */
  return (
    <div style={{ background: D.bg, paddingBottom: '2rem' }}>
      {/* Hero banner */}
      <div style={{
        position: 'relative', borderRadius: 16, overflow: 'hidden',
        background: 'linear-gradient(135deg,#0F1B33 0%,#1A3A6B 50%,#2563AB 100%)',
        marginBottom: '1.25rem', padding: '1.25rem 1.25rem 1rem',
        boxShadow: '0 4px 20px rgba(28,20,16,0.18)',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 130, opacity: 0.06, lineHeight: 1 }}>🗺️</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, fontFamily: "'DM Sans',sans-serif" }}>
            RECOMMENDATIONS
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.2, letterSpacing: -0.3, marginBottom: 5, fontFamily: "'Sora',sans-serif" }}>
            Everything you need in {destination.charAt(0).toUpperCase() + destination.slice(1)}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 14 }}>
            Hotels · Hospitals · Rentals — live data, refreshed monthly
          </div>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { n: hotels.length,    label: 'hotels',    icon: '🏨' },
              { n: hospitals.length, label: 'clinics',   icon: '🏥' },
              { n: rentals.length,   label: 'rentals',   icon: '🚗' },
            ].map(({ n, label, icon }) => n > 0 && (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.13)', border: '0.5px solid rgba(255,255,255,0.22)',
                backdropFilter: 'blur(6px)', borderRadius: 999, padding: '4px 12px',
                display: 'flex', gap: 5, alignItems: 'center',
              }}>
                <span style={{ fontSize: 12 }}>{icon}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{n}</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {total === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: D.muted, fontSize: 13 }}>
          No recommendations found for this destination yet.
        </div>
      )}

      <HotelsSection    hotels={hotels}       destination={destination} />
      <HospitalsSection hospitals={hospitals} />
      <RentalsSection   rentals={rentals} />

      {/* Cache notice */}
      {data?.fromCache === false && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: D.surface, border: `0.5px solid ${D.border}`, borderLeft: `3px solid ${accentColor}`, borderRadius: 10, padding: '10px 12px', fontSize: 11, color: D.muted, lineHeight: 1.6 }}>
          <span>✅</span>
          <span>Fresh data fetched and saved. The next user who opens {destination.charAt(0).toUpperCase() + destination.slice(1)} will load instantly.</span>
        </div>
      )}
    </div>
  );
}
