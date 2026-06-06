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
  cardShadow:'0 2px 14px rgba(28,20,16,0.07)',
};

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

  // Sync if parent finishes loading after mount
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

  const toggleDone = (key) => setDoneItems(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

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
      <span style={{ fontSize: 11, letterSpacing: 1 }}>
        <span style={{ color: '#E6A817' }}>{stars.slice(0, full + (half ? 1 : 0)).join('')}</span>
        <span style={{ color: '#D3D1C7' }}>{stars.slice(full + (half ? 1 : 0)).join('')}</span>
        <span style={{ color: '#a8a8a5', marginLeft: 3 }}>{r.toFixed(1)}</span>
      </span>
    );
  };

  const tagBg = t => {
    if (['must-try','must-do','iconic'].includes(t)) return { bg: '#FAECE7', color: '#993C1D' };
    if (['heritage','scenic','culture','offbeat'].includes(t)) return { bg: '#E6F1FB', color: '#378ADD' };
    return { bg: '#FAEEDA', color: '#854F0B' };
  };
  const accentColor = isSolo ? '#7F77DD' : '#1D9E75';
  const Sec = ({ icon, title, items, iconBg, secKey, dest, startIndex = 0, photoSuffix = 'photo' }) => {
    const doneCount = items.filter((_, i) => doneItems.has(`${secKey}-${i}`)).length;
    return (
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: .4, textTransform: 'uppercase', color: '#6b6b68' }}>{title}</span>
          <span style={{ fontSize: 11, color: '#a8a8a5' }}>{items.length} picks</span>
          {doneCount > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: accentColor, background: isSolo ? '#EEEDFE' : '#E1F5EE', border: `0.5px solid ${isSolo ? '#AFA9EC' : '#9FE1CB'}`, borderRadius: 10, padding: '2px 8px', marginLeft: 'auto' }}>✓ {doneCount}/{items.length} done</span>}
        </div>
        {items.map((item, i) => {
          const key = `${secKey}-${i}`;
          const isDone = doneItems.has(key);
          return (
            <div key={i} style={{ ...S.card, display: 'flex', gap: 14, alignItems: 'flex-start', opacity: isDone ? 0.45 : 1, transition: 'all .25s' }}>
              <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, filter: isDone ? 'grayscale(1)' : 'none' }}>{item.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? '#a8a8a5' : '#1a1a18' }}>{item.name}</div>
                {/* Rating + price + best time row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                  {item.rating && renderStars(item.rating)}
                  {item.priceRange && (
                    <span style={{ fontSize: 11, color: '#5a3a0a', background: '#FAEEDA', borderRadius: 6, padding: '1px 7px', fontWeight: 600 }}>{item.priceRange}</span>
                  )}
                  {item.bestTime && (
                    <span style={{ fontSize: 11, color: '#0F6E56', background: '#E1F5EE', borderRadius: 6, padding: '1px 7px', fontWeight: 600 }}>Best: {item.bestTime}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#6b6b68', lineHeight: 1.5 }}>{item.desc}</div>
                <div style={{ margin: '10px 0 4px' }}>
                  <PlacePhoto query={`${item.name} ${dest} ${photoSuffix}`} style={{ height: 110 }} delay={(startIndex + i) * 600} />
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
                  {(item.tags || []).map(t => { const c = tagBg(t); return <span key={t} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: .3, background: isDone ? '#F1EFE8' : c.bg, color: isDone ? '#a8a8a5' : c.color }}>{t}</span>; })}
                </div>
              </div>
              <button onClick={() => toggleDone(key)} style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', border: isDone ? `2px solid ${accentColor}` : '1.5px solid rgba(0,0,0,0.15)', background: isDone ? accentColor : '#fff', color: isDone ? '#fff' : '#a8a8a5', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>{isDone ? '✓' : '○'}</button>
            </div>
          );
        })}
      </div>
    );
  };

  if (step === 'loading') return <Spinner text={`Discovering local flavours of ${dest}…`} solo={isSolo} />;

  if (step === 'result' && data) return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#fff9f0,#fff0e5)', border: '0.5px solid #FAC775', borderRadius: 14, padding: '1.1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ fontSize: 36 }}>🗺️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, color: '#854F0B', marginBottom: 3 }}>{data.headline}</div>
          <div style={{ fontSize: 12, color: '#6b6b68', lineHeight: 1.5 }}>{data.tagline}</div>
        </div>
        {/* <button style={{ ...S.btn, fontSize: 12, flexShrink: 0 }} onClick={() => { setStep('idle'); setData(null); setDoneItems(new Set()); }}>↺</button> */}
      </div>
      <Sec icon="🍴" iconBg="#FAEEDA" title="Must-eat dishes" items={data.dishes || []} secKey="dishes" dest={dest} startIndex={0} photoSuffix="food dish restaurant" />
      <Sec icon="📍" iconBg="#E6F1FB" title="Unmissable places" items={data.places || []} secKey="places" dest={dest} startIndex={4} photoSuffix="tourist attraction landmark" />
      <Sec icon="✨" iconBg="#EEEDFE" title="Local experiences" items={data.experiences || []} secKey="exp" dest={dest} startIndex={8} photoSuffix="travel experience" />
      {data.tip && <div style={{ background: isSolo ? '#EEEDFE' : '#E1F5EE', border: `0.5px solid ${isSolo ? '#AFA9EC' : '#9FE1CB'}`, borderRadius: 10, padding: '.75rem 1rem', display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: '1rem', fontSize: 12, color: isSolo ? '#26215C' : '#085041', lineHeight: 1.5 }}>💡 <span><strong>Local tip:</strong> {data.tip}</span></div>}
    </div>
  );

  return (
    <div>
      <div style={{ background: 'linear-gradient(135deg,#FAEEDA,#FAECE7)', border: '0.5px solid #FAC775', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🍽️</div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Local Taste Guide</div>
        <div style={{ fontSize: 13, color: '#6b6b68', lineHeight: 1.6 }}>Discover what to eat, where to go, and what to do like a local.</div>
      </div>
      <div style={S.card}>
        <label style={S.label}>Destination</label>
        <input style={S.input} value={dest} onChange={e => setDest(e.target.value)} onKeyDown={e => e.key === 'Enter' && generate()} placeholder="e.g. Jaipur, Rajasthan" />
        <button style={{ ...S.btn, ...(isSolo ? S.btnSolo : S.btnP), width: '100%', justifyContent: 'center', marginTop: 12, padding: '11px', fontSize: 14, borderRadius: 12 }} onClick={generate} disabled={!dest.trim()}>✨ Discover local flavours</button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        {['Jaipur','Udaipur','Goa','Varanasi','Mumbai','Coorg','Hampi'].map(c => (
          <button key={c} style={{ ...S.btn, fontSize: 12, padding: '5px 12px', borderRadius: 20 }} onClick={() => setDest(c)}>{c}</button>
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
  });

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

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, background: D.surface, border: `0.5px solid ${D.border}`, borderRadius: 14, padding: 3, marginBottom: '1.1rem', boxShadow: '0 1px 6px rgba(28,20,16,0.05)' }}>
        {ITABS.map(t => (
          <button key={t.id} onClick={() => setITab(t.id)}
            style={{ flex: 1, padding: '9px 8px', fontSize: 12, fontWeight: 600, borderRadius: 11, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", background: iTab === t.id ? (isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : D.gold) : 'transparent', color: iTab === t.id ? '#fff' : D.muted, transition: 'all .15s' }}>
            {t.label}
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
            <div style={{ background: D.bg, paddingBottom: '2rem' }}>

              {/* ── Hero card ──────────────────────────────────────── */}
              <div style={{
                background: `linear-gradient(160deg, ${isSolo ? '#2C2460' : '#1C3028'} 0%, ${isSolo ? '#7F77DD' : '#1D9E75'} 100%)`,
                borderRadius: 18,
                padding: '1.5rem',
                marginBottom: '1rem',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* watermark glyph */}
                <div style={{ position: 'absolute', top: -18, right: -18, fontSize: 120, opacity: 0.05, lineHeight: 1 }}>✈</div>
                {/* arrival / departure pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span style={{ background: 'rgba(255,255,255,0.15)', border: '0.5px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '4px 11px', fontSize: 11, color: '#fff', fontWeight: 500 }}>
                    ✈️ {SLOT_LABELS[form.arrivalSlot]}
                  </span>
                  <span style={{ background: 'rgba(255,255,255,0.15)', border: '0.5px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '4px 11px', fontSize: 11, color: '#fff', fontWeight: 500 }}>
                    🛬 {SLOT_LABELS[form.departureSlot]}
                  </span>
                </div>
                {/* title */}
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: -0.3, lineHeight: 1.3, marginBottom: 6, fontFamily: "'Sora',sans-serif" }}>
                  {itin.headline || `${days}-Day ${form.dest} Itinerary`}
                </div>
                {itin.summary && (
                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, marginBottom: 14 }}>{itin.summary}</div>
                )}
                {/* budget + best time */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {itin.totalEstimatedCost && (
                    <span style={{ background: 'rgba(255,255,255,0.13)', border: '0.5px solid rgba(255,255,255,0.22)', borderRadius: 999, padding: '4px 12px', fontSize: 12, color: '#F5D9A8', fontWeight: 600 }}>
                      🔥 {itin.totalEstimatedCost}
                    </span>
                  )}
                  {itin.bestTimeToVisit && (
                    <span style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 999, padding: '4px 12px', fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                      🗓 {itin.bestTimeToVisit}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Quick tips: horizontal scroll pills ─────────── */}
              {itin.quickTips?.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: D.muted, textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8, paddingLeft: 2 }}>💡 Quick Tips</div>
                  <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {itin.quickTips.map((tip, i) => (
                      <div key={i} style={{ flexShrink: 0, background: D.coralTint, borderRadius: 12, padding: '8px 13px', maxWidth: 220, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 13, flexShrink: 0 }}>💡</span>
                        <span style={{ fontSize: 12, color: D.coral, lineHeight: 1.5 }}>{tip}</span>
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

                      {/* Day header: gold left border, muted date cap, italic serif theme */}
                      <div style={{ display: 'flex', alignItems: 'stretch', background: 'rgba(250,248,244,0.97)', borderRadius: 12, padding: '10px 14px', marginBottom: 10, boxShadow: '0 1px 6px rgba(28,20,16,0.05)' }}>
                        <div style={{ width: 3, borderRadius: 2, background: D.gold, marginRight: 12, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.1, textTransform: 'uppercase', color: D.muted }}>{dateLabel}</span>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              {d.weather && (
                                <span style={{ fontSize: 12, color: D.coral }}>{weatherIcon} {d.weather.high}°<span style={{ color: D.muted }}>/{d.weather.low}°</span></span>
                              )}
                              {isArrivalDay && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: D.blueTint, color: '#2563AB' }}>✈ Arrives</span>}
                              {isDepartureDay && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: D.coralTint, color: D.coral }}>🛫 Departs</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontSize: 15, fontStyle: 'italic', color: D.espresso, fontFamily: "'Georgia',serif", letterSpacing: -0.1, flex: 1 }}>{d.title || d.theme}</div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                              {d.estimatedCost && (
                                <span style={{ fontSize: 11, fontWeight: 600, background: D.goldTint, color: D.gold, borderRadius: 999, padding: '2px 9px' }}>{d.estimatedCost}</span>
                              )}
                              {dayDoneCount > 0 && (
                                <span style={{ fontSize: 10, fontWeight: 700, background: D.sageTint, color: D.sage, borderRadius: 999, padding: '2px 9px' }}>✓ {dayDoneCount}/{dayTotalCount}</span>
                              )}
                            </div>
                          </div>
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
                        const dotColor = a.mustDo ? D.gold : '#D3CFC8';
                        const allTags  = [
                          ...(a.mustDo ? ['MUST DO'] : []),
                          ...(a.energyLevel && ENERGY_CONFIG[a.energyLevel] ? [ENERGY_CONFIG[a.energyLevel].label] : []),
                        ];

                        return (
                          <div key={i}>
                            {/* Timeline row */}
                            <div style={{ display: 'flex', gap: 0, opacity: isDone ? 0.42 : 1, transition: 'opacity .25s' }}>

                              {/* Time + dot column */}
                              <div style={{ width: 58, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: 10, paddingTop: 3 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: D.espresso, lineHeight: 1 }}>{a.time}</span>
                                {a.endTime && <span style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>{a.endTime}</span>}
                              </div>

                              {/* Connector */}
                              <div style={{ width: 18, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 5 }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: dotColor, flexShrink: 0, zIndex: 1, boxShadow: a.mustDo ? `0 0 0 3px ${D.goldTint}` : 'none' }} />
                                {!isLast && <div style={{ width: 1.5, flex: 1, background: D.divider, marginTop: 3 }} />}
                              </div>

                              {/* Activity card */}
                              <div style={{ flex: 1, marginLeft: 10, marginBottom: 10, background: D.surface, borderRadius: 14, padding: '13px 14px', boxShadow: D.cardShadow, border: `0.5px solid ${D.border}`, minWidth: 0 }}>

                                {/* Row 1: name + category icon */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontSize: 14.5, fontWeight: 700, color: isDone ? D.muted : D.espresso, textDecoration: isDone ? 'line-through' : 'none', lineHeight: 1.3 }}>{a.name}</span>
                                  </div>
                                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{a.icon || TYPE_ICONS[a.type] || '📍'}</span>
                                </div>

                                {/* Row 2: tags */}
                                {allTags.length > 0 && (
                                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 7 }}>
                                    {allTags.map((tag, ti) => {
                                      const ts = tagStyle(tag, tag === 'MUST DO');
                                      return (
                                        <span key={ti} style={{ fontSize: 10, fontWeight: 700, letterSpacing: .7, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, background: ts.bg, color: ts.color }}>{tag}</span>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Row 3: opening hours */}
                                {a.openingHours && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                                    <span style={{ fontSize: 11 }}>🕐</span>
                                    <span style={{ fontSize: 11.5, color: D.muted }}>Open {a.openingHours}</span>
                                    {a.hoursSource === 'verified'  && <span style={{ fontSize: 9, fontWeight: 700, background: D.sageTint, color: D.sage, borderRadius: 4, padding: '1px 5px' }}>✓ verified</span>}
                                    {a.hoursSource === 'estimated' && <span style={{ fontSize: 9, fontStyle: 'italic', background: '#F4F3FF', color: '#7A6FCF', borderRadius: 4, padding: '1px 5px' }}>est.</span>}
                                  </div>
                                )}

                                {/* Row 4: note / description */}
                                {(a.note || a.description) && (
                                  <div style={{ fontSize: 12.5, color: D.secondary, lineHeight: 1.6, marginBottom: 7 }}>{a.note || a.description}</div>
                                )}

                                {/* Row 4b: headsUp warning */}
                                {a.headsUp && (
                                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', background: '#FFFBF0', border: `0.5px solid #FAC775`, borderRadius: 8, padding: '6px 9px', marginBottom: 7 }}>
                                    <span style={{ fontSize: 12, flexShrink: 0 }}>⚠️</span>
                                    <span style={{ fontSize: 11, color: '#7A4F00', lineHeight: 1.5 }}>{a.headsUp}</span>
                                  </div>
                                )}

                                {/* Row 5: meta — duration, cost, area */}
                                {(a.duration || a.cost || a.area) && (
                                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                                    {a.duration && <span style={{ fontSize: 11, color: D.muted }}>⏱ {a.duration}</span>}
                                    {a.cost && <span style={{ fontSize: 11, color: D.gold, fontWeight: 600 }}>🔥 {a.cost}</span>}
                                    {a.area && <span style={{ fontSize: 11, color: D.muted }}>📍 {a.area}</span>}
                                  </div>
                                )}

                                {/* Row 6: photo */}
                                {showPhoto && (
                                  <div style={{ marginBottom: 8 }}>
                                    <PlacePhoto
                                      query={`${a.name} ${form.dest} ${a.type === 'food' ? 'restaurant dish food' : a.type === 'experience' ? 'travel experience' : a.type === 'shopping' ? 'market shopping' : 'tourist attraction landmark'}`}
                                      style={{ height: 140, borderRadius: 10 }}
                                      delay={currentDelay}
                                    />
                                  </div>
                                )}

                                {/* Row 7: action pills */}
                                {a.type !== 'hotel' && a.type !== 'transport' && a.type !== 'travel' && (
                                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                                    <a
                                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${a.name} ${form.dest}`)}`}
                                      target="_blank" rel="noreferrer"
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#2563AB', background: D.blueTint, borderRadius: 999, padding: '5px 13px', textDecoration: 'none', fontWeight: 600, border: 'none' }}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                      Maps
                                    </a>
                                    <a
                                      href={`https://www.google.com/search?q=${encodeURIComponent(`${a.name} ${form.dest}`)}`}
                                      target="_blank" rel="noreferrer"
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: D.secondary, background: D.neutral, borderRadius: 999, padding: '5px 13px', textDecoration: 'none', fontWeight: 600, border: 'none' }}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                      Know more
                                    </a>
                                  </div>
                                )}
                              </div>

                              {/* Done toggle */}
                              <button
                                onClick={() => toggleActivity(doneKey)}
                                style={{ flexShrink: 0, alignSelf: 'flex-start', marginTop: 4, marginLeft: 6, width: 28, height: 28, borderRadius: '50%', border: isDone ? `2px solid ${accentColor}` : `1.5px solid ${D.border}`, background: isDone ? accentColor : D.surface, color: isDone ? '#fff' : D.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}
                              >{isDone ? '✓' : '○'}</button>
                            </div>

                            {/* Transit chip */}
                            {!isLast && a.travelToNext && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0 4px 26px' }}>
                                <div style={{ flex: 1, height: 1, background: D.divider }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: D.neutral, borderRadius: 999, padding: '3px 10px', fontSize: 11, color: D.muted, flexShrink: 0 }}>
                                  🚶 {a.travelToNext}
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
