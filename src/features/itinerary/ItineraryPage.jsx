import { useState, useRef, useEffect } from 'react';
import { normalizeMembers } from '../shared/constants';
import { S } from '../shared/styles';
import { Spinner } from '../shared/ui';
import { PlacePhoto, PlacePhotosStrip } from '../media/PlaceMedia';
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
  const Sec = ({ icon, title, items, iconBg, secKey, dest, startIndex = 0 }) => {
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
                  <PlacePhoto query={`${item.name} ${dest} photo`} style={{ height: 110 }} delay={(startIndex + i) * 600} />
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
      <Sec icon="🍴" iconBg="#FAEEDA" title="Must-eat dishes" items={data.dishes || []} secKey="dishes" dest={dest} startIndex={0} />
      <PlacePhotosStrip queries={[`${dest} food`]} style={{ marginBottom: '1rem' }} />
      <Sec icon="📍" iconBg="#E6F1FB" title="Unmissable places" items={data.places || []} secKey="places" dest={dest} startIndex={4} />
      <PlacePhotosStrip queries={[`${dest} landmarks`]} style={{ marginBottom: '1rem' }} />
      <Sec icon="✨" iconBg="#EEEDFE" title="Local experiences" items={data.experiences || []} secKey="exp" dest={dest} startIndex={8} />
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
  const [customDesc, setCustomDesc] = useState('');
  const [showDescBox, setShowDescBox] = useState(false);

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

  const runGenerateItinerary = async (descOverride) => {
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
        customDescription: descOverride ?? customDesc,
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
      <div style={{ display: 'flex', gap: 0, background: '#fff', border: '0.5px solid rgba(0,0,0,0.09)', borderRadius: 13, padding: 3, marginBottom: '1.1rem' }}>
        {ITABS.map(t => (
          <button key={t.id} onClick={() => setITab(t.id)}
            style={{ flex: 1, padding: '8px 8px', fontSize: 12, fontWeight: 500, borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", background: iTab === t.id ? (isSolo ? 'linear-gradient(135deg,#7F77DD,#534AB7)' : '#1D9E75') : 'transparent', color: iTab === t.id ? '#fff' : '#6b6b68', transition: 'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {iTab === 'planner' && (
        <div>
        {/* Description / customize box */}
          <div style={{ marginBottom: '1rem' }}>
            {!showDescBox && step === 'result' && (
              <button
                style={{ ...S.btn, width: '100%', justifyContent: 'center', fontSize: 13, color: isSolo ? '#534AB7' : '#0F6E56', background: isSolo ? '#EEEDFE' : '#E1F5EE', border: `0.5px solid ${isSolo ? '#AFA9EC' : '#9FE1CB'}` }}
                onClick={() => setShowDescBox(true)}>
                ✏️ Customize & regenerate itinerary
              </button>
            )}
            {(showDescBox || step === 'error' || (!trip._cachedItin && step !== 'loading')) && (
              <div style={{ ...S.card, border: `0.5px solid ${isSolo ? '#AFA9EC' : '#9FE1CB'}`, background: isSolo ? '#fdfcff' : '#f9fffe' }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: isSolo ? '#534AB7' : '#0F6E56', marginBottom: 4 }}>
                  ✏️ Customize your itinerary
                </div>
                <div style={{ fontSize: 12, color: '#6b6b68', marginBottom: 10 }}>
                  Describe what you want — pace, priorities, special interests. Leave blank for a balanced itinerary.
                </div>
                <textarea
                  style={{ ...S.input, resize: 'none', minHeight: 80, lineHeight: 1.55, fontSize: 13 }}
                  value={customDesc}
                  onChange={e => setCustomDesc(e.target.value)}
                  placeholder={`e.g. "Focus on heritage sites and street food. Avoid malls. We prefer a relaxed morning pace."`}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button
                    style={{ ...S.btn, ...(isSolo ? S.btnSolo : S.btnP), flex: 1, justifyContent: 'center', padding: '10px', fontSize: 13 }}
                    onClick={() => {
                      setShowDescBox(false);
                      onCacheUpdate?.({ _cachedItin: null });
                      runGenerateItinerary(customDesc);
                    }}>
                    🗺️ Generate itinerary
                  </button>
                  {step === 'result' && (
                    <button style={S.btn} onClick={() => setShowDescBox(false)}>✕</button>
                  )}
                </div>
              </div>
            )}
          </div>
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
            <div style={{ paddingBottom: '2rem' }}>
              <div style={{ background: headerBg, borderRadius: 16, padding: '1.25rem 1.5rem', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 80, opacity: 0.08 }}>✈️</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
                  {itin.headline || `${days}-Day ${form.dest} Itinerary`}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, marginBottom: 12 }}>{itin.summary}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <SlotBadge slot={form.arrivalSlot} label="✈️ Arrives" />
                  <SlotBadge slot={form.departureSlot} label="🛫 Departs" />
                  {itin.totalEstimatedCost && (
                    <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#fff' }}>
                      💰 {itin.totalEstimatedCost}
                    </div>
                  )}
                  
                </div>
              </div>

              {itin.quickTips?.length > 0 && (
                <div style={{ ...S.card, marginBottom: '1rem', background: '#FAEEDA', border: '0.5px solid #FAC775' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#854F0B', textTransform: 'uppercase', letterSpacing: .4, marginBottom: 8 }}>💡 Quick Tips</div>
                  {itin.quickTips.map((tip, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#5a3a0a', lineHeight: 1.5, marginBottom: i < itin.quickTips.length - 1 ? 5 : 0 }}>· {tip}</div>
                  ))}
                </div>
              )}

              <PlacePhotosStrip
                queries={[form.dest, `${form.dest} landmarks`, `${form.dest} travel`]}
                style={{ marginBottom: '1rem' }}
              />

              {(() => {
                let photoIndex = 0;
                return (itin.days || []).map((d, dayIndex) => {
                  const dateLabel = form.arrival ? formatTripDate(form.arrival, dayIndex) : `Day ${d.day}`;
                  const isArrivalDay = dayIndex === 0;
                  const isDepartureDay = dayIndex === (itin.days.length - 1);
                  return (
                    <div key={d.day} style={{ ...S.card, padding: 0, overflow: 'hidden', marginBottom: 14 }}>
                      <div style={{ background: headerBg, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '3px 10px', fontSize: 11, fontWeight: 700, fontFamily: "'Sora',sans-serif", flexShrink: 0 }}>
                          {dateLabel}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{d.title}</div>
                          {d.theme && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>{d.theme}</div>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                          {isArrivalDay && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
                              ✈️ Arrives {SLOT_LABELS[form.arrivalSlot]}
                            </span>
                          )}
                          {isDepartureDay && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
                              🛫 Departs {SLOT_LABELS[form.departureSlot]}
                            </span>
                          )}
                          {d.weather && (
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                              {d.weather.high > 30 ? '☀️' : d.weather.high > 18 ? '⛅' : '🧊'} {d.weather.high}°/{d.weather.low}°
                            </div>
                          )}
                          {d.estimatedCost && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{d.estimatedCost}</div>}
                        </div>
                      </div>
                      {d.weather?.tip && (
                        <div style={{ padding: '6px 16px', background: isSolo ? '#f4f3ff' : '#f0faf6', borderBottom: `0.5px solid ${isSolo ? '#c9c5f5' : '#c8ecd8'}`, fontSize: 11, color: isSolo ? '#534AB7' : '#0F6E56' }}>
                          💡 {d.weather.tip}
                        </div>
                      )}
                      {d.proTip && (
                        <div style={{ padding: '8px 16px', background: '#FAEEDA', borderBottom: '0.5px solid #FAC775', fontSize: 12, color: '#5a3a0a', lineHeight: 1.5, display: 'flex', gap: 8 }}>
                          <span style={{ flexShrink: 0 }}>🎯</span>
                          <span><strong>Local tip:</strong> {d.proTip}</span>
                        </div>
                      )}
                      <div style={{ padding: '10px 16px' }}>
                        {(d.activities || []).map((a, i) => {
                          const showPhoto = a.type === 'attraction' || a.type === 'food' || a.type === 'experience' || a.type === 'shopping';
                          const currentDelay = showPhoto ? photoIndex++ * 600 : 0;
                          const isLast = i === d.activities.length - 1;
                          return (
                            <div key={i}>
                              <div style={{ display: 'flex', gap: 12, padding: '10px 0' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 14 }}>
                                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: a.mustDo ? accentColor : '#D3D1C7', marginTop: 4, flexShrink: 0, border: a.mustDo ? `2px solid ${accentColor}33` : 'none', boxSizing: 'border-box' }} />
                                  {!isLast && <div style={{ width: 1, flex: 1, background: 'rgba(0,0,0,0.06)', marginTop: 3 }} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 3 }}>
                                    {/* Time column: shows start → end */}
                                    <div style={{ flexShrink: 0, width: 80, paddingTop: 2 }}>
                                      <div style={{ fontSize: 11, color: '#a8a8a5', fontWeight: 600 }}>{a.time}</div>
                                      {a.endTime && <div style={{ fontSize: 10, color: '#c8c8c4' }}>↓ {a.endTime}</div>}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 16 }}>{a.icon || TYPE_ICONS[a.type] || '📍'}</span>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a18' }}>{a.name}</span>
                                        {a.mustDo && (
                                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8, background: isSolo ? '#EEEDFE' : '#E1F5EE', color: accentColor, textTransform: 'uppercase', letterSpacing: .3 }}>Must do</span>
                                        )}
                                        {a.energyLevel && ENERGY_CONFIG[a.energyLevel] && (
                                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: ENERGY_CONFIG[a.energyLevel].bg, color: ENERGY_CONFIG[a.energyLevel].color, letterSpacing: .3, fontFamily: 'monospace' }}>
                                            {ENERGY_CONFIG[a.energyLevel].symbol} {ENERGY_CONFIG[a.energyLevel].label}
                                          </span>
                                        )}
                                      </div>
                                      {a.openingHours && (
                                        <div style={{ fontSize: 11, color: '#a8a8a5', marginTop: 2 }}>🕐 Open {a.openingHours}</div>
                                      )}
                                      {a.note && <div style={{ fontSize: 12, color: '#6b6b68', marginTop: 4, lineHeight: 1.55, fontStyle: 'italic' }}>{a.note}</div>}
                                      {a.headsUp && (
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 6, background: '#FFFBF0', border: '0.5px solid #FAC775', borderRadius: 8, padding: '5px 8px' }}>
                                          <span style={{ fontSize: 12, flexShrink: 0 }}>⚠️</span>
                                          <span style={{ fontSize: 11, color: '#7A4F00', lineHeight: 1.5 }}>{a.headsUp}</span>
                                        </div>
                                      )}
                                      <div style={{ display: 'flex', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
                                        {a.duration && <span style={{ fontSize: 11, color: '#a8a8a5' }}>⏱ {a.duration}</span>}
                                        {a.cost && <span style={{ fontSize: 11, color: '#a8a8a5' }}>💰 {a.cost}</span>}
                                        {a.area && <span style={{ fontSize: 11, color: '#a8a8a5' }}>📍 {a.area}</span>}
                                      </div>
                                      {showPhoto && (
                                        <div style={{ marginTop: 10 }}>
                                          <PlacePhoto query={`${a.name} ${form.dest}`} style={{ height: 120 }} delay={currentDelay} />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {/* Travel connector to next activity */}
                              {!isLast && a.travelToNext && (
                                <div style={{ display: 'flex', gap: 12, paddingBottom: 2 }}>
                                  <div style={{ width: 14, display: 'flex', justifyContent: 'center' }}>
                                    <div style={{ width: 1, background: 'rgba(0,0,0,0.06)', height: '100%' }} />
                                  </div>
                                  <div style={{ fontSize: 10, color: '#b0b0aa', paddingLeft: 2, paddingBottom: 4, fontStyle: 'italic' }}>
                                    🚶 {a.travelToNext}
                                  </div>
                                </div>
                              )}
                              {/* Separator line between activities (not after travel connector) */}
                              {!isLast && !a.travelToNext && (
                                <div style={{ marginLeft: 26, height: '0.5px', background: 'rgba(0,0,0,0.05)' }} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}

              {sources.length > 0 && (
                <div style={{ ...S.card, marginBottom: '1rem' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b6b68', textTransform: 'uppercase', letterSpacing: .4, marginBottom: 10 }}>🔍 Researched from</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {sources.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noreferrer"
                        style={{ fontSize: 11, color: isSolo ? '#534AB7' : '#0F6E56', background: isSolo ? '#EEEDFE' : '#E1F5EE', border: `0.5px solid ${isSolo ? '#AFA9EC' : '#9FE1CB'}`, borderRadius: 8, padding: '4px 10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
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
