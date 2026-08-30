import { useState, useRef, useEffect } from 'react';
import { imagekitAuth } from '../../api';
import lumiImg from '../../assets/party_lumi5.png';

// ── Storage keys ──────────────────────────────────────────────────────────────
export const CLUB_WIZARD_DONE_KEY = 'travelbae_club_wizard_done';
export const CLUB_WIZARD_DATA_KEY = 'travelbae_club_wizard_data';

// ── Brand ─────────────────────────────────────────────────────────────────────
const G      = 'linear-gradient(135deg, #EE0FA0 0%, #8820D0 60%, #1C0A8A 100%)';
const G_SOFT = 'linear-gradient(135deg, rgba(238,15,160,0.07), rgba(136,32,208,0.07))';
const ACCENT  = '#8820D0';
const ACCENT2 = '#6B21A8';

// ── Option data ───────────────────────────────────────────────────────────────

const TRAVEL_PERSONALITIES = [
  { id: 'beach',     label: 'Beach & Island Escapes' },
  { id: 'mountains', label: 'Mountains & Treks' },
  { id: 'food',      label: 'Local Food Hunter' },
  { id: 'nightlife', label: 'Nightlife & Parties' },
  { id: 'culture',   label: 'History & Culture' },
  { id: 'hidden',    label: 'Hidden Gems' },
  { id: 'outdoor',   label: 'Outdoor & Wild' },
  { id: 'roads',     label: 'Road Trip Lover' },
  { id: 'slow',      label: 'Slow & Relaxed' },
  { id: 'backpack',  label: 'Backpacker Mode' },
];

const STORY_CATEGORIES = [
  {
    id: 'personality',
    label: 'Travel Personality',
    prompts: [
      "My travel style in 3 words is…",
      "I plan everything OR I figure it out when I land — and here's proof…",
      "The trip that changed me was…",
      "I'd spontaneously book a flight right now to…",
      "My worst travel day that became my best story…",
      "I travel because…",
      "The place I keep going back to, and why…",
    ],
  },
  {
    id: 'adventure',
    label: 'Adventure & Stories',
    prompts: [
      "I once got completely lost — and…",
      "Biggest travel risk I ever took…",
      "I cried at a place once, because…",
      "Most unhinged thing I did on a trip…",
      "Something I ate on a trip that changed everything…",
      "The local who changed my trip…",
      "I almost missed my flight because…",
      "My travel flex:",
    ],
  },
  {
    id: 'vibes',
    label: 'Preferences & Vibe',
    prompts: [
      "Beach, mountains, or city — and I'll fight for it",
      "Hostels or hotels, and here's my hill to die on…",
      "Solo trip or group chaos? My honest take…",
      "The one thing I always pack without fail…",
      "One thing I never do on a trip…",
      "My travel non-negotiable is…",
    ],
  },
  {
    id: 'convo',
    label: 'Conversation Starters',
    prompts: [
      "Ask me about…",
      "Unpopular travel opinion:",
      "Best conversation I had with a stranger while traveling…",
      "I'm the friend who _____ during every trip",
    ],
  },
];

const NEXT_VIBES = [
  { id: 'food-hunt',   label: 'Food Hunt' },
  { id: 'adventure',   label: 'Adventure' },
  { id: 'nightlife',   label: 'Nightlife' },
  { id: 'photography', label: 'Photography' },
  { id: 'culture',     label: 'Culture' },
  { id: 'beach',       label: 'Beach & Chill' },
  { id: 'reset',       label: 'Reset Mode' },
  { id: 'shopping',    label: 'Shopping' },
];

const LOOKING_FOR = [
  { id: 'buddies',  label: 'Travel Buddies' },
  { id: 'hang',     label: 'People to Hang With' },
  { id: 'photo',    label: 'Photo Partner' },
  { id: 'tips',     label: 'Local Tips' },
  { id: 'adv',      label: 'Adventure Partner' },
  { id: 'food',     label: 'Food Buddy' },
];

const RED_FLAGS = [
  { id: 'sleep',    label: "Can't wake up before 10" },
  { id: 'photos',   label: '400 photos of the same statue' },
  { id: 'food',     label: 'Needs 3 options before choosing a restaurant' },
  { id: 'maps',     label: 'Gets lost despite Google Maps' },
  { id: 'shopping', label: 'Shopping for half the trip' },
  { id: 'onedrink', label: "Always 'just one more drink'" },
  { id: 'late',     label: 'Perpetually 20 minutes late' },
  { id: 'budget',   label: 'Somehow always over budget' },
];

const GREEN_FLAGS = [
  { id: 'easygoing', label: 'Easygoing, no drama' },
  { id: 'planner',   label: 'Actually good at planning' },
  { id: 'foodfind',  label: 'Always finds the good spots' },
  { id: 'photos',    label: 'Takes great photos' },
  { id: 'budget',    label: 'Budget-conscious' },
  { id: 'chaos',     label: 'Handles chaos without melting down' },
  { id: 'funny',     label: 'Makes everyone laugh' },
  { id: 'morning',   label: 'Actually likes early mornings' },
];

const HERE_FOR = [
  { id: 'kind',      label: '🧑‍🤝‍🧑 Find my kind of people',                   sub: 'Same energy. Different passport.' },
  { id: 'partner',   label: '✈️ Find a travel partner',                     sub: 'Someone who actually shows up at the airport.' },
  { id: 'trip',      label: '🗺️ Find company for an upcoming trip',          sub: "I have a destination. Just need the right person in the seat next to me." },
  { id: 'traveling', label: "🌎 Meet people while I'm travelling",           sub: "Strangers in a new city who don't feel like strangers." },
  { id: 'local',     label: "🏡 See a place through a local's eyes",         sub: "Skip the tourist trail. Find the spot they never put on Google." },
  { id: 'unplanned', label: '🎉 Someone for the unplanned stuff',            sub: 'The 11 PM "wait, should we?" moments. Say yes with me.' },
  { id: 'adventure', label: '🏔️ Find my adventure partner',                 sub: 'Trek, dive, ride, climb — I need someone equally bad at saying no.' },
  { id: 'obsess',    label: '📸 Find people who obsess over the same things', sub: "Food. Shots. Music. We'll know in five minutes if it's a match." },
  { id: 'friends',   label: '💬 Build friendships that outlast the trip',    sub: 'Not just a travel contact. An actual friend.' },
  { id: 'road',      label: "💕 Let's see where the road takes us",          sub: 'Started as a travel match. Open to whatever comes next.' },
];

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi",
  "Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Republic)","DR Congo","Costa Rica","Croatia","Cuba","Cyprus","Czech Republic",
  "Denmark","Djibouti","Dominica","Dominican Republic",
  "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Europe",
  "Fiji","Finland","France",
  "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana",
  "Haiti","Honduras","Hungary",
  "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
  "Jamaica","Japan","Jordan",
  "Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg",
  "Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar",
  "Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway",
  "Oman",
  "Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal",
  "Qatar",
  "Romania","Russia","Rwanda",
  "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
  "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu",
  "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan",
  "Vanuatu","Vatican City","Venezuela","Vietnam",
  "Yemen",
  "Zambia","Zimbabwe",
];

const PHOTO_PROMPTS = [
  "What you don't see in this photo…",
  "This was 10 seconds before everything went wrong.",
  "Zero stars on Google. Ten stars from me.",
  "I stood here for longer than I should have.",
  "The story behind this starts with a wrong turn.",
  "We almost didn't stop here. Biggest mistake we almost made.",
  "No menu. No English. Best meal of the trip.",
  "I've described this place to 11 people since I got back.",
  "Met this person five minutes before this was taken.",
  "I didn't plan this. It just happened.",
  "This cost me ₹200 and was the best decision of the trip.",
  "Didn't take a photo for an hour after this. Just sat there.",
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const NIGHTLIFE_OPTIONS = [
  { id: 'early',   label: 'Early night, no apologies' },
  { id: 'chill',   label: 'Chill drinks, good chat' },
  { id: 'party',   label: 'Out till late' },
  { id: 'sunrise', label: 'Until sunrise, obviously' },
];

const ACCOM_OPTIONS = [
  { id: 'hotel',  label: 'Hotel' },
  { id: 'airbnb', label: 'Airbnb' },
  { id: 'hostel', label: 'Hostel' },
  { id: 'camp',   label: 'Camping' },
  { id: 'any',    label: 'Wherever, honestly' },
];

const STEPS = [
  { id: 'basics',   sub: "Dates, destination, home base — three things, then we move." },
  { id: 'photos',   sub: "One great group shot > a hundred solo selfies. Just saying." },
  { id: 'identity', sub: "Pick up to 3. Chose all 10? We need to have a conversation." },
  { id: 'stories',  sub: "Pick 3 prompts. Vague answers match no one — be specific." },
  { id: 'dna',      sub: "These don't lie. Your crew already knows where you land." },
  { id: 'world',    sub: "Add where you've been. Add where you're headed next." },
  { id: 'fun',      sub: "Be honest. The right person will love you for it anyway." },
  { id: 'here',     sub: "This shapes who finds you. No pressure. (A little pressure.)" },
];

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const Ic = {
  check:    (c='currentColor') => <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  user:     (c='#8B5CF6')     => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  pin:      (c='#8B5CF6')     => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>,
  globe:    (c='#8B5CF6')     => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  music:    (c='#8B5CF6')     => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  plane:    (c='#8B5CF6')     => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 4c-1.5 0-3.5 1-3.5 1l-7 4-4-1.5C3.5 6.5 3 8 4 9l3 2 1 4 4 1 2 3 2.8-.8z"/></svg>,
  camera:   (c='#8B5CF6')     => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  plus:     (c='#8B5CF6')     => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  x:        (c='#fff')        => <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  search:   (c='#8B5CF6')     => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  info:     (c=ACCENT)        => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  heart:    (c='#8B5CF6')     => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  bookmark: (c='#8B5CF6')     => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>,
  cal:      (c='#8B5CF6')     => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  star:     (c='#8B5CF6')     => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  users:    (c='#8B5CF6')     => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  home:     (c='#8B5CF6')     => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  chat:     (c='#8B5CF6')     => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  flag:     (c='#8B5CF6')     => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>,
  trend:    (c='#8B5CF6')     => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 8 13.5 16.5 8.5 11.5 2 18"/><polyline points="16 8 22 8 22 14"/></svg>,
  trophy:   (c='#8B5CF6')     => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>,
};

// ── Input base styles ─────────────────────────────────────────────────────────

const INP = {
  width: '100%', background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12,
  padding: '12px 14px', color: '#111827', fontSize: 14.5, outline: 'none',
  fontFamily: "'DM Sans', -apple-system, sans-serif", boxSizing: 'border-box', transition: 'border-color .15s',
};

const LBL = {
  display: 'flex', alignItems: 'center', gap: 6, color: '#6B7280', fontSize: 10.5,
  letterSpacing: '1.3px', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8,
  fontFamily: "'DM Sans', sans-serif",
};

// ── MultiSelect ───────────────────────────────────────────────────────────────

function MultiSelect({ options, selected, onToggle, max = 99, cols = 2 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
      {options.map(opt => {
        const key = opt.id || opt.label;
        const isSel = selected.includes(key);
        const disabled = !isSel && selected.length >= max;
        return (
          <button key={key} type="button" onClick={() => !disabled && onToggle(key)} style={{
            display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderRadius: 12,
            border: isSel ? `1.5px solid ${ACCENT}` : '1.5px solid #E5E7EB',
            background: isSel ? G_SOFT : '#F9FAFB',
            color: isSel ? ACCENT2 : '#374151',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.38 : 1,
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: isSel ? 700 : 500,
            transition: 'all .14s', textAlign: 'left',
            boxShadow: isSel ? `0 0 0 3px rgba(136,32,208,0.10)` : 'none',
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
              border: isSel ? 'none' : '1.5px solid #D1D5DB',
              background: isSel ? G : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{isSel && Ic.check('#fff')}</div>
            <span style={{ lineHeight: 1.3 }}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── City search (Nominatim) ───────────────────────────────────────────────────

function CitySearch({ value, onChange }) {
  const [q, setQ] = useState(value || '');
  const [results, setResults] = useState([]);
  const timer = useRef(null);

  const search = async (text) => {
    if (text.length < 2) { setResults([]); return; }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=6&featuretype=city`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const json = await res.json();
      const cities = json
        .filter(d => ['city','town','village','municipality'].includes(d.type) || d.addresstype === 'city')
        .map(d => {
          const name = d.address.city || d.address.town || d.address.village || d.name;
          return d.address.country ? `${name}, ${d.address.country}` : name;
        });
      setResults([...new Set(cities)]);
    } catch { setResults([]); }
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setQ(v); onChange(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(v), 350);
  };

  const select = (city) => { setQ(city); onChange(city); setResults([]); };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '0 12px' }}>
        {Ic.search()}
        <input style={{ border: 'none', background: 'transparent', flex: 1, padding: '12px 0', fontSize: 14.5, outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}
          value={q} onChange={handleChange} placeholder="City you operate from" />
      </div>
      {results.length > 0 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden', marginTop: 4, maxHeight: 180, overflowY: 'auto' }}>
          {results.map(c => (
            <div key={c} onClick={() => select(c)} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: '#374151', borderBottom: '0.5px solid #F3F4F6' }}>{c}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step: Basics ──────────────────────────────────────────────────────────────

const AGES    = Array.from({ length: 53 }, (_, i) => i + 18);
const HEIGHTS = [
  "4'8\"","4'9\"","4'10\"","4'11\"",
  "5'0\"","5'1\"","5'2\"","5'3\"","5'4\"","5'5\"","5'6\"","5'7\"",
  "5'8\"","5'9\"","5'10\"","5'11\"",
  "6'0\"","6'1\"","6'2\"","6'3\"","6'4\"","6'5\"","6'6\"","6'7\"",
];

function SelectField({ label, icon, value, onChange, placeholder, options }) {
  return (
    <div>
      <div style={LBL}>{icon} <span>{label}</span></div>
      <div style={{ position: 'relative' }}>
        <select value={value || ''} onChange={e => onChange(e.target.value)}
          style={{ ...INP, paddingRight: 34, appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer', color: value ? '#111827' : '#9CA3AF' }}>
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <svg style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
    </div>
  );
}

function StepBasics({ data, setData, tripDest, tripArrival, tripDeparture }) {
  const toD = v => v ? String(v).slice(0, 10) : '';

  // pre-populate dates from trip if user hasn't set them manually
  useEffect(() => {
    const updates = {};
    if (!data.arrivalDate && tripArrival) updates.arrivalDate = toD(tripArrival);
    if (!data.departureDate && tripDeparture) updates.departureDate = toD(tripDeparture);
    if (Object.keys(updates).length) setData(d => ({ ...d, ...updates }));
  }, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <SelectField
          label="Age" icon={Ic.user()} placeholder="Your age"
          value={data.age} options={AGES.map(String)}
          onChange={v => setData(d => ({ ...d, age: v }))}
        />
        <SelectField
          label="Height" icon={Ic.trend()} placeholder="Your height"
          value={data.height} options={HEIGHTS}
          onChange={v => setData(d => ({ ...d, height: v }))}
        />
      </div>
      <div>
        <div style={LBL}>{Ic.home()} <span>Home town</span></div>
        <CitySearch value={data.city || ''} onChange={v => setData(d => ({ ...d, city: v }))} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div style={LBL}>{Ic.cal()} <span>Arrival</span></div>
          <input type="date" value={data.arrivalDate || toD(tripArrival)}
            onChange={e => setData(d => ({ ...d, arrivalDate: e.target.value }))}
            style={{ ...INP, padding: '6px 8px', fontSize: 12.5 }} />
        </div>
        <div>
          <div style={LBL}>{Ic.cal()} <span>Departure</span></div>
          <input type="date" value={data.departureDate || toD(tripDeparture)}
            onChange={e => setData(d => ({ ...d, departureDate: e.target.value }))}
            style={{ ...INP, padding: '6px 8px', fontSize: 12.5 }} />
        </div>
      </div>
      <div>
        <div style={LBL}>{Ic.pin()} <span>Destination</span></div>
        {tripDest
          ? <div style={{ ...INP, padding: '7px 10px', fontSize: 13, color: ACCENT2, fontWeight: 600 }}>{tripDest}</div>
          : <CitySearch value={data.tripDest || ''} onChange={v => setData(d => ({ ...d, tripDest: v }))} />
        }
      </div>
    </div>
  );
}

// ── Step: Photos (wizard step 2) ──────────────────────────────────────────────

function StepPhotosWizard({ data, setData }) {
  const inputId  = 'club-wiz-photo-input';
  const [uploading, setUploading] = useState(false);
  const photos   = data.photoUrls     || [];
  const captions = data.photoCaptions || {};

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      // bust browser GET cache so each upload gets a fresh token
      const auth = await fetch(`https://travelbae-backend-sg.onrender.com/ai/imagekit-auth?_=${Date.now()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('travelbae_token') || ''}` },
      }).then(r => r.json());
      if (!auth.publicKey || !auth.signature || !auth.token) throw new Error('Auth failed');
      const safeName = `club_wiz_${Date.now()}_${(Math.random() * 1e6 | 0)}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const form = new FormData();
      form.append('file', file);
      form.append('fileName', safeName);
      form.append('folder', '/tb-club-wizard');
      form.append('useUniqueFileName', 'true');
      form.append('publicKey', auth.publicKey);
      form.append('signature', auth.signature);
      form.append('expire', String(auth.expire));
      form.append('token', auth.token);
      const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: form });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d.message || d.error || 'Upload failed');
      setData(prev => ({ ...prev, photoUrls: [...(prev.photoUrls || []).slice(0, 3), d.url] }));
    } catch (err) { alert('Photo upload failed: ' + err.message); }
    setUploading(false);
  };

  const remove = i => setData(d => {
    const urls = (d.photoUrls || []).filter((_, j) => j !== i);
    const caps = { ...(d.photoCaptions || {}) };
    const newCaps = {};
    Object.entries(caps).forEach(([k, v]) => {
      const ki = parseInt(k);
      if (ki < i) newCaps[ki] = v;
      else if (ki > i) newCaps[ki - 1] = v;
    });
    return { ...d, photoUrls: urls, photoCaptions: newCaps };
  });

  const setCaption = (idx, cap) => setData(d => ({
    ...d, photoCaptions: { ...(d.photoCaptions || {}), [idx]: cap },
  }));

  const movePhoto = (from, to) => setData(d => {
    const urls = [...(d.photoUrls || [])];
    const caps = { ...(d.photoCaptions || {}) };
    [urls[from], urls[to]] = [urls[to], urls[from]];
    const tmp = caps[from];
    if (caps[to] !== undefined) caps[from] = caps[to]; else delete caps[from];
    if (tmp !== undefined) caps[to] = tmp; else delete caps[to];
    return { ...d, photoUrls: urls, photoCaptions: caps };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <style>{`.ph-pills::-webkit-scrollbar { display: none; } @keyframes photoIn { from { opacity:0; transform:scale(0.97) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
      {/* input lives first so its DOM position never shifts as photos are added */}
      <input id={inputId} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
      {/* 3-dot progress counter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 32, height: 4, borderRadius: 99, background: i < photos.length ? G : '#E9E5FF', transition: 'background .3s' }} />
          ))}
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: photos.length === 3 ? '#16A34A' : ACCENT, fontFamily: "'DM Sans',sans-serif" }}>
          {photos.length}/3 {photos.length === 3 ? '✓ All set' : 'required'}
        </span>
      </div>
      {photos.map((url, idx) => (
        <div key={url} style={{
          border: '1.5px solid #E9E5FF', borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(136,32,208,0.10)',
          animation: 'photoIn .32s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          <div style={{ position: 'relative', background: 'linear-gradient(160deg, #F5F0FF 0%, #EEF2FF 100%)' }}>
            <img src={url} alt="" style={{ width: '100%', height: 'auto', maxHeight: 340, objectFit: 'contain', display: 'block' }} />
            {idx === 0 && (
              <div style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 9, fontWeight: 800, color: '#fff', background: G, padding: '3px 10px', borderRadius: 99, letterSpacing: 0.8, boxShadow: '0 2px 8px rgba(136,32,208,0.35)' }}>COVER</div>
            )}
            <div style={{ position:'absolute', top:8, right:8, display:'flex', gap:5 }}>
              {idx > 0 && (
                <button type="button" onClick={() => movePhoto(idx, idx - 1)}
                  style={{ width:28, height:28, borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)', color:'#fff', fontSize:14, lineHeight:1 }}>
                  ↑
                </button>
              )}
              {idx < photos.length - 1 && (
                <button type="button" onClick={() => movePhoto(idx, idx + 1)}
                  style={{ width:28, height:28, borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)', color:'#fff', fontSize:14, lineHeight:1 }}>
                  ↓
                </button>
              )}
              <button type="button" onClick={() => remove(idx)}
                style={{ width:28, height:28, borderRadius:'50%', background:'rgba(0,0,0,0.5)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' }}>
                {Ic.x()}
              </button>
            </div>
          </div>
          <div style={{ padding: '12px 14px 14px', background: '#fff' }}>
            <div style={{ fontSize: 10.5, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 9 }}>Pick a prompt</div>
            <select
              value={captions[idx] || ''}
              onChange={e => setCaption(idx, e.target.value || null)}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 12,
                border: `1.5px solid ${captions[idx] ? ACCENT : '#E9E5FF'}`,
                background: captions[idx] ? `${ACCENT}08` : '#F9FAFB',
                color: captions[idx] ? ACCENT : '#9CA3AF',
                fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                fontWeight: captions[idx] ? 600 : 400,
                cursor: 'pointer', outline: 'none', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%238820D0' strokeWidth='1.8' fill='none' strokeLinecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center',
                paddingRight: 36,
              }}
            >
              <option value="">Pick one…</option>
              {PHOTO_PROMPTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      ))}
      {photos.length < 3 && (
        <label htmlFor={inputId} style={{
          height: 100, borderRadius: 20, border: `2px dashed ${ACCENT}35`,
          background: 'linear-gradient(135deg, #F8F5FF 0%, #F0F4FF 100%)',
          cursor: uploading ? 'wait' : 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
          transition: 'all .2s', pointerEvents: uploading ? 'none' : 'auto',
        }}>
          {uploading
            ? <div style={{ width: 22, height: 22, border: `2.5px solid rgba(136,32,208,0.15)`, borderTopColor: ACCENT, borderRadius: '50%', animation: 'wizSpin .7s linear infinite' }} />
            : <>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${ACCENT}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{Ic.camera()}</div>
                <span style={{ fontSize: 13, color: ACCENT, fontWeight: 700 }}>Add photo {photos.length + 1} of 3</span>
              </>
          }
        </label>
      )}
    </div>
  );
}

// ── Step: Identity ────────────────────────────────────────────────────────────

function StepIdentity({ data, setData }) {
  const selected = data.personalities || [];
  const toggle = key => setData(d => {
    const arr = d.personalities || [];
    return { ...d, personalities: arr.includes(key) ? arr.filter(x => x !== key) : arr.length < 3 ? [...arr, key] : arr };
  });
  return <MultiSelect options={TRAVEL_PERSONALITIES} selected={selected} onToggle={toggle} max={3} cols={2} />;
}

// ── Step: Stories ─────────────────────────────────────────────────────────────

function StepStories({ data, setData }) {
  const [activeCat, setActiveCat]     = useState(STORY_CATEGORIES[0].id);
  const [editingPrompt, setEditing]   = useState(null);
  const selected = data.selectedPrompts || [];
  const answers  = data.promptAnswers  || {};

  const currentPrompts = STORY_CATEGORIES.find(c => c.id === activeCat)?.prompts || [];

  const toggle = p => setData(d => {
    const arr = d.selectedPrompts || [];
    if (arr.includes(p)) {
      const a = { ...(d.promptAnswers || {}) };
      delete a[p];
      return { ...d, selectedPrompts: arr.filter(x => x !== p), promptAnswers: a };
    }
    if (arr.length >= 3) {
      const a = { ...(d.promptAnswers || {}) };
      delete a[arr[0]];
      return { ...d, selectedPrompts: [...arr.slice(1), p], promptAnswers: a };
    }
    return { ...d, selectedPrompts: [...arr, p] };
  });

  const setAnswer = (p, v) => setData(d => ({ ...d, promptAnswers: { ...(d.promptAnswers || {}), [p]: v } }));

  const handlePromptClick = (p) => {
    if (!selected.includes(p)) {
      toggle(p);
      setEditing(p);
    } else {
      setEditing(editingPrompt === p ? null : p);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <style>{`
        @keyframes stSlide { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:translateX(0); } }
        .st-pills::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Category pills */}
      <div className="st-pills" style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}>
        {STORY_CATEGORIES.map(cat => {
          const catCount = cat.prompts.filter(p => selected.includes(p)).length;
          const isActive = activeCat === cat.id;
          return (
            <button key={cat.id} type="button" onClick={() => setActiveCat(cat.id)}
              style={{
                flexShrink: 0, padding: '6px 14px', borderRadius: 99, border: 'none',
                background: isActive ? G : '#F3F4F6',
                color: isActive ? '#fff' : '#6B7280',
                fontFamily: "'DM Sans', sans-serif", fontSize: 12.5,
                cursor: 'pointer', fontWeight: isActive ? 700 : 500,
                transition: 'background .18s, color .18s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
              {cat.label}
              {catCount > 0 && (
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.28)' : `${ACCENT}22`,
                  color: isActive ? '#fff' : ACCENT,
                  borderRadius: 99, padding: '1px 6px', fontSize: 10.5, fontWeight: 800,
                }}>{catCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Prompts list */}
      <div key={activeCat} style={{ display: 'flex', flexDirection: 'column', gap: 7, animation: 'stSlide .2s ease both' }}>
        {currentPrompts.map(p => {
          const isSel = selected.includes(p);
          const isEditing = editingPrompt === p;
          return (
            <div key={p} style={{
              borderRadius: 14, transition: 'all .18s',
              ...(isSel
                ? { background: G, padding: 2, boxShadow: '0 2px 16px rgba(238,15,160,0.15)' }
                : { border: '1.5px solid #EFEFEF', boxShadow: 'none' }
              ),
            }}>
              <div style={{ borderRadius: isSel ? 12 : 12.5, overflow: 'hidden', background: isSel ? '#fff' : '#F9FAFB' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <button type="button" onClick={() => handlePromptClick(p)} style={{
                    flex: 1, textAlign: 'left', padding: '13px 16px', border: 'none',
                    background: 'transparent', color: isSel ? ACCENT2 : '#374151',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, cursor: 'pointer',
                    fontWeight: isSel ? 600 : 400, lineHeight: 1.45, transition: 'color .16s',
                  }}>
                    {p}
                    {isSel && !isEditing && answers[p] && (
                      <div style={{ marginTop: 3, fontSize: 11.5, color: '#9CA3AF', fontWeight: 400, fontStyle: 'italic' }}>
                        {answers[p].length > 50 ? answers[p].slice(0, 50) + '…' : answers[p]}
                      </div>
                    )}
                  </button>
                  {isSel && (
                    <button type="button"
                      onClick={() => { toggle(p); if (editingPrompt === p) setEditing(null); }}
                      style={{ padding: '11px 12px 11px 0', border: 'none', background: 'transparent', cursor: 'pointer', color: '#C4B5FD', fontSize: 14, lineHeight: 1, flexShrink: 0 }}>
                      ✕
                    </button>
                  )}
                </div>
                {isSel && isEditing && (
                  <div style={{ padding: '0 14px 12px' }}>
                    <textarea
                      value={answers[p] || ''}
                      onChange={e => setAnswer(p, e.target.value)}
                      placeholder="Finish the thought — the more specific, the better."
                      rows={3}
                      style={{
                        width: '100%', boxSizing: 'border-box', resize: 'none',
                        background: '#fff', border: `1.5px solid ${ACCENT}30`,
                        borderRadius: 10, padding: '10px 12px',
                        color: '#111827', fontSize: 13.5, lineHeight: 1.6,
                        outline: 'none', fontFamily: "'DM Sans', sans-serif",
                      }}
                      onFocus={e => e.target.style.borderColor = `${ACCENT}80`}
                      onBlur={e => e.target.style.borderColor = `${ACCENT}30`}
                    />
                    <button type="button" onClick={() => setEditing(null)}
                      style={{
                        marginTop: 7, padding: '5px 14px', borderRadius: 99, border: 'none',
                        background: G, color: '#fff', fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      }}>
                      Save ✓
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step: Next adventure ──────────────────────────────────────────────────────

function StepNext({ data, setData }) {
  const [q, setQ] = useState(data.nextDest || '');
  const filtered  = COUNTRIES.filter(c => c.toLowerCase().includes(q.toLowerCase()));
  const tripVibes = data.tripVibes  || [];
  const lookingFor = data.lookingFor || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={LBL}>{Ic.plane()} <span>Destination</span></div>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '0 12px' }}>
            {Ic.search()}
            <input style={{ border: 'none', background: 'transparent', flex: 1, padding: '12px 0', fontSize: 14.5, outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}
              value={q} onChange={e => { setQ(e.target.value); setData(d => ({ ...d, nextDest: e.target.value })); }}
              placeholder="Which country is next?" />
          </div>
          {q.length > 0 && filtered.length > 0 && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden', marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
              {filtered.slice(0, 8).map(c => (
                <div key={c} onClick={() => { setData(d => ({ ...d, nextDest: c })); setQ(c); }}
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: '#374151', borderBottom: '0.5px solid #F3F4F6' }}>{c}</div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div>
        <div style={LBL}>{Ic.cal()} <span>Around when?</span></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {MONTHS.map(m => (
            <button key={m} type="button" onClick={() => setData(d => ({ ...d, nextMonth: m }))} style={{
              padding: '7px 14px', borderRadius: 99, border: 'none',
              background: data.nextMonth === m ? G : '#F3F4F6',
              color: data.nextMonth === m ? '#fff' : '#374151',
              fontFamily: "'DM Sans', sans-serif", fontSize: 13,
              cursor: 'pointer', fontWeight: data.nextMonth === m ? 700 : 500, transition: 'all .14s',
            }}>{m}</button>
          ))}
        </div>
      </div>
      <div>
        <div style={LBL}>{Ic.star()} <span>Trip vibe</span></div>
        <MultiSelect options={NEXT_VIBES} selected={tripVibes}
          onToggle={key => setData(d => ({ ...d, tripVibes: tripVibes.includes(key) ? tripVibes.filter(x => x !== key) : [...tripVibes, key] }))} cols={2} />
      </div>
      <div>
        <div style={LBL}>{Ic.users()} <span>Looking for</span></div>
        <MultiSelect options={LOOKING_FOR} selected={lookingFor}
          onToggle={key => setData(d => ({ ...d, lookingFor: lookingFor.includes(key) ? lookingFor.filter(x => x !== key) : [...lookingFor, key] }))} cols={2} />
      </div>
    </div>
  );
}

// ── Step: DNA / sliders ───────────────────────────────────────────────────────

function Slider({ icon, label, leftEmoji, leftText, leftSub, rightEmoji, rightText, rightSub, value, onChange }) {
  const pct = ((value ?? 4) / 9) * 100;
  return (
    <div style={{ background: '#fff', border: '1px solid #F0F0F0', borderRadius: 18, padding: '16px 16px 14px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: '#F5F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.35 }}>{label}</div>
      </div>
      <div style={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 99, background: '#EBEBEB' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: G, borderRadius: 99 }} />
        </div>
        <div style={{
          position: 'absolute', left: `${pct}%`, transform: 'translateX(-50%)',
          width: 24, height: 24, borderRadius: '50%',
          background: ACCENT, border: '3px solid #fff',
          boxShadow: '0 2px 10px rgba(136,32,208,0.4)',
          pointerEvents: 'none', zIndex: 2,
        }} />
        <input type="range" min={0} max={9} step={1} value={value ?? 4} onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', margin: 0, zIndex: 3 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
        <div style={{ maxWidth: '46%', textAlign: 'left' }}>
          <div style={{ fontSize: 22, lineHeight: 1, marginBottom: 4 }}>{leftEmoji}</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', lineHeight: 1.3 }}>{leftText}</div>
          {leftSub && <div style={{ fontSize: 11.5, color: '#9CA3AF', lineHeight: 1.3, marginTop: 1 }}>{leftSub}</div>}
        </div>
        <div style={{ maxWidth: '46%', textAlign: 'right' }}>
          <div style={{ fontSize: 22, lineHeight: 1, marginBottom: 4 }}>{rightEmoji}</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', lineHeight: 1.3, textAlign: 'right' }}>{rightText}</div>
          {rightSub && <div style={{ fontSize: 11.5, color: '#9CA3AF', lineHeight: 1.3, marginTop: 1, textAlign: 'right' }}>{rightSub}</div>}
        </div>
      </div>
    </div>
  );
}

function StepDNA({ data, setData }) {
  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  return (
    <div>
      <Slider
        icon="🌙"
        label="Day 2, 7 AM. Where are you?"
        leftEmoji="🌅" leftText="Already outside." leftSub="Sent you a photo."
        rightEmoji="💀" rightText="Don't open my door" rightSub="before 11."
        value={data.morning} onChange={v => set('morning', v)}
      />
      <Slider
        icon="📷"
        label="You find a great spot. Your camera roll after:"
        leftEmoji="✨" leftText="Three shots, one keeper," leftSub="moved on."
        rightEmoji="📸" rightText="47 poses, still not" rightSub="the right light."
        value={data.photos} onChange={v => set('photos', v)}
      />
      <Slider
        icon="🕵️"
        label="Your boss, your mom, your ex — nobody knows where you are right now:"
        leftEmoji="🤫" leftText="Phone's on silent." leftSub="I have vanished."
        rightEmoji="📲" rightText="Posted twice already." rightSub="Tagged the hotel."
        value={data.offline} onChange={v => set('offline', v)}
      />
      <Slider
        icon="😍"
        label="You're loving this place:"
        leftEmoji="😌" leftText="Let's stay a while." leftSub="The vibe is everything."
        rightEmoji="🗺️" rightText="We can vibe later." rightSub="Three more stops today."
        value={data.explorer} onChange={v => set('explorer', v)}
      />
    </div>
  );
}

// ── Step: World ───────────────────────────────────────────────────────────────

function ChipInput({ value, onChange, placeholder, showChips = true, max = 999 }) {
  const [q, setQ] = useState('');
  const chips   = value || [];
  const filtered = COUNTRIES.filter(c => c.toLowerCase().includes(q.toLowerCase()) && !chips.includes(c));
  return (
    <div>
      {showChips && chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {chips.map(c => (
            <span key={c} onClick={() => onChange(chips.filter(x => x !== c))}
              style={{ background: G_SOFT, border: `1px solid ${ACCENT}35`, borderRadius: 99, padding: '4px 10px', color: ACCENT2, fontSize: 12.5, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              {c} <span style={{ opacity: 0.5, fontSize: 10 }}>✕</span>
            </span>
          ))}
        </div>
      )}
      {(max === 999 || chips.length < max) && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F9FAFB', border: '1.5px solid #E5E7EB', borderRadius: 12, padding: '0 12px' }}>
            {Ic.search()}
            <input style={{ border: 'none', background: 'transparent', flex: 1, padding: '10px 0', fontSize: 14, outline: 'none', fontFamily: "'DM Sans', sans-serif", color: '#111827' }}
              value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} />
          </div>
          {q.length > 0 && filtered.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, marginTop: 4, maxHeight: 130, overflowY: 'auto', border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
              {filtered.slice(0, 6).map(c => (
                <div key={c} onClick={() => { onChange(max === 1 ? [c] : [...chips, c]); setQ(''); }}
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13.5, color: '#374151', borderBottom: '0.5px solid #F3F4F6' }}>{c}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CountryCards({ items, onRemove }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map(item => (
        <div key={item} style={{ padding: '1.5px', borderRadius: 12, background: G }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
            borderRadius: 11, background: '#fff',
          }}>
            <span style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, fontWeight: 600, color: ACCENT2 }}>{item}</span>
            <svg onClick={() => onRemove(item)} width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="#A855F7" strokeWidth="2.5" strokeLinecap="round"
              style={{ cursor: 'pointer', flexShrink: 0, opacity: 0.7 }}>
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

function StepWorld({ data, setData }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={LBL}>{Ic.globe()} <span>Been to</span></div>
        <ChipInput value={data.been} onChange={v => setData(d => ({ ...d, been: v }))} placeholder="Search countries..." showChips={false} />
        <CountryCards items={data.been || []} onRemove={c => setData(d => ({ ...d, been: (d.been || []).filter(x => x !== c) }))} />
      </div>
      <div>
        <div style={LBL}>
          {Ic.bookmark()}
          <span>Still on the list</span>
          <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11, color: '#C4B5FD', fontWeight: 500, fontStyle: 'italic' }}> — manifesting it 🌙</span>
        </div>
        {data.bucket?.[0] ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            borderRadius: 11, background: G_SOFT, border: `1.5px solid ${ACCENT}35`,
            boxShadow: `0 2px 10px ${ACCENT}10`,
          }}>
            <span style={{ fontSize: 15 }}>🌙</span>
            <span style={{ flex: 1, fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, color: ACCENT2, fontWeight: 600 }}>{data.bucket[0]}</span>
            <span onClick={() => setData(d => ({ ...d, bucket: [] }))}
              style={{ cursor: 'pointer', color: '#C4B5FD', fontSize: 18, lineHeight: 1 }}>×</span>
          </div>
        ) : (
          <ChipInput value={data.bucket} onChange={v => setData(d => ({ ...d, bucket: v }))} placeholder="Search countries..." max={1} />
        )}
      </div>
    </div>
  );
}

// ── Step: Fun stuff ───────────────────────────────────────────────────────────

function StepFun({ data, setData }) {
  const selRed   = data.redFlags   || [];
  const selGreen = data.greenFlags || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ ...LBL, marginBottom: 10 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          <span style={{ color: '#EF4444' }}>My travel red flag — be honest</span>
        </div>
        <MultiSelect options={RED_FLAGS} selected={selRed}
          onToggle={key => setData(d => ({ ...d, redFlags: selRed.includes(key) ? selRed.filter(x => x !== key) : [...selRed, key] }))} cols={2} />
      </div>
      <div>
        <div style={{ ...LBL, marginBottom: 10 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          <span style={{ color: '#22C55E' }}>My travel green flag</span>
        </div>
        <MultiSelect options={GREEN_FLAGS} selected={selGreen}
          onToggle={key => setData(d => ({ ...d, greenFlags: selGreen.includes(key) ? selGreen.filter(x => x !== key) : [...selGreen, key] }))} cols={2} />
      </div>
    </div>
  );
}

// ── Step: Here for ────────────────────────────────────────────────────────────

function StepHere({ data, setData }) {
  const selected = data.hereFor || [];
  const toggle = key => setData(d => {
    const arr = d.hereFor || [];
    return { ...d, hereFor: arr.includes(key) ? arr.filter(x => x !== key) : [...arr, key] };
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {HERE_FOR.map(opt => {
        const isSel = selected.includes(opt.id);
        return (
          <button key={opt.id} type="button" onClick={() => toggle(opt.id)} style={{
            width: '100%', textAlign: 'left', padding: '13px 16px', borderRadius: 14,
            border: isSel ? `1.5px solid ${ACCENT}` : '1.5px solid #E5E7EB',
            background: isSel ? G_SOFT : '#F9FAFB',
            cursor: 'pointer', transition: 'all .16s',
          }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, color: isSel ? ACCENT2 : '#111827', lineHeight: 1.3 }}>{opt.label}</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#9CA3AF', marginTop: 3, fontStyle: 'italic', lineHeight: 1.4 }}>{opt.sub}</div>
          </button>
        );
      })}
    </div>
  );
}

// ── Step router ───────────────────────────────────────────────────────────────

function StepContent({ stepId, data, setData, tripDest, tripArrival, tripDeparture }) {
  switch (stepId) {
    case 'basics':   return <StepBasics       data={data} setData={setData} tripDest={tripDest} tripArrival={tripArrival} tripDeparture={tripDeparture} />;
    case 'photos':   return <StepPhotosWizard data={data} setData={setData} />;
    case 'identity': return <StepIdentity     data={data} setData={setData} />;
    case 'stories':  return <StepStories      data={data} setData={setData} />;
    case 'dna':      return <StepDNA          data={data} setData={setData} />;
    case 'world':    return <StepWorld        data={data} setData={setData} />;
    case 'fun':      return <StepFun          data={data} setData={setData} />;
    case 'here':     return <StepHere         data={data} setData={setData} />;
    default:         return null;
  }
}

// ── Personal Card — Hinge-style vertical scroll card ────────────────────────

const PC_STYLES = `
  @keyframes pcFadeUp {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes pcHeroIn {
    from { opacity:0; transform:scale(1.04); }
    to   { opacity:1; transform:scale(1); }
  }
  @keyframes pcPillIn {
    from { opacity:0; transform:translateX(-10px) scale(0.88); }
    to   { opacity:1; transform:translateX(0) scale(1); }
  }
  @keyframes pcGlow {
    0%,100% { box-shadow:0 4px 24px rgba(238,15,160,0.38); }
    50%      { box-shadow:0 8px 44px rgba(238,15,160,0.7); }
  }
  @keyframes pcBarGrow {
    from { width:0%; }
  }
  @property --pcAngle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
  }
  @keyframes pcBorderTravel {
    to { --pcAngle: 360deg; }
  }
  @keyframes pcFloat {
    0%,100% { transform:translateY(0px); }
    50%     { transform:translateY(-4px); }
  }
  @keyframes pcShimmer {
    0%   { transform:translateX(-200%) skewX(-12deg); }
    100% { transform:translateX(300%) skewX(-12deg); }
  }
  @keyframes pcPulse {
    0%,100% { opacity:1; }
    50%     { opacity:0.3; }
  }
  .pc-hero-img { animation:pcHeroIn .75s cubic-bezier(0.22,1,0.36,1) both; }
  .pc-glow-btn { animation:pcGlow 2.6s ease-in-out infinite; transition:transform .18s cubic-bezier(0.34,1.56,0.64,1),box-shadow .18s; }
  .pc-glow-btn:hover  { transform:scale(1.02); }
  .pc-glow-btn:active { transform:scale(0.97); transition-duration:.09s; }
  .pc-dna-bar { animation:pcBarGrow .95s cubic-bezier(0.22,1,0.36,1) .3s both; }
  .pc-card-shell {
    --pcAngle: 0deg;
    background: conic-gradient(from var(--pcAngle) at 50% 50%,#EE0FA0 0deg,#8820D0 90deg,#1C0A8A 200deg,#1C0A8A 280deg,rgba(255,255,255,0.95) 318deg,#EE0FA0 360deg);
    animation: pcBorderTravel 3s linear infinite, pcFloat 7s ease-in-out infinite;
    padding:3.5px;
    border-radius:28px;
    box-shadow:0 4px 24px rgba(28,10,138,0.18),0 2px 10px rgba(238,15,160,0.15);
    position:relative;
    overflow:hidden;
  }
  .pc-card-shell::before {
    display:none;
  }
  .pc-card-inner {
    border-radius:26px;
    overflow:hidden;
    background:#fff;
    font-family:'DM Sans',-apple-system,sans-serif;
  }
  .pc-photo-thumb {
    transition:transform .25s cubic-bezier(0.22,1,0.36,1);
  }
  .pc-photo-thumb:hover { transform:scale(1.01); }
  @keyframes pcScaleIn {
    from { opacity:0; transform:scale(0.78); }
    to   { opacity:1; transform:scale(1); }
  }
  .pc-section-card {
    transition:box-shadow .25s cubic-bezier(0.22,1,0.36,1), transform .25s cubic-bezier(0.22,1,0.36,1);
  }
  .pc-section-card:hover {
    box-shadow:0 8px 40px rgba(28,10,138,0.1),0 2px 12px rgba(238,15,160,0.07) !important;
    transform:translateY(-2px);
  }
`;

export function ClubPersonalCard({ data, onEdit }) {
  const photoUrls     = data.photoUrls     || [];
  const photoCaps     = data.photoCaptions || {};
  const personalities = (data.personalities || []).map(id => TRAVEL_PERSONALITIES.find(p => p.id === id)).filter(Boolean);
  const prompts       = (data.selectedPrompts || []).slice(0, 3);
  const promptAnswers = data.promptAnswers || {};
  const greenFlagObjs = (data.greenFlags || []).map(id => GREEN_FLAGS.find(g => g.id === id)).filter(Boolean);
  const redFlagObjs   = (data.redFlags   || []).map(id => RED_FLAGS.find(r => r.id === id)).filter(Boolean);
  const hereForObjs   = (data.hereFor    || []).map(id => HERE_FOR.find(h => h.id === id)).filter(Boolean);
  const nextVibeObjs  = (data.tripVibes  || []).map(id => NEXT_VIBES.find(v => v.id === id)).filter(Boolean);
  const lookForObjs   = (data.lookingFor || []).map(id => LOOKING_FOR.find(l => l.id === id)).filter(Boolean);

  const coverPhoto = photoUrls[0];
  const photo2     = photoUrls[1];
  const photo3     = photoUrls[2];

  const GRD      = 'linear-gradient(135deg,#EE0FA0 0%,#8820D0 60%,#1C0A8A 100%)';
  const GRD_SOFT = 'linear-gradient(135deg,rgba(238,15,160,0.08) 0%,rgba(136,32,208,0.07) 100%)';
  const PINK     = '#EE0FA0';
  const PURP     = '#8820D0';

  const tripTag = (() => {
    if (!data.arrivalDate) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const arr = new Date(data.arrivalDate); arr.setHours(0,0,0,0);
    const dep = data.departureDate ? new Date(data.departureDate) : null;
    if (dep) dep.setHours(0,0,0,0);
    const diff = Math.round((arr - today) / 86400000);
    if (dep && today >= arr && today <= dep) return { label:'Currently Travelling', live:true };
    if (diff > 0 && diff <= 7) return { label:`Leaving in ${diff} day${diff===1?'':'s'}`, live:false };
    return null;
  })();

  const dnaItems = [
    data.morning  !== undefined && { q:'Day 2, 7 AM — where are you?',           left:'Outside. Already sent you a photo.',      right:"Don't open my door before 11.",        val:data.morning  },
    data.photos   !== undefined && { q:'Camera roll after the perfect spot:',    left:'3 shots. One keeper. Moved on.',          right:'47 poses. Still wrong light.',         val:data.photos   },
    data.offline  !== undefined && { q:"Nobody knows where you are right now:", left:"Phone's off. I've vanished.",             right:'Posted twice. Tagged the hotel.',       val:data.offline  },
    data.explorer !== undefined && { q:'You love this place. The call is:',      left:"Let's stay a while. The vibe is it.",     right:'Three more stops today. Let\'s go.',   val:data.explorer },
  ].filter(Boolean);

  const s = (d) => ({ animation:`pcFadeUp .55s cubic-bezier(0.22,1,0.36,1) ${d}ms both` });

  const statItems = [
    data.countriesCount ? { num: data.countriesCount, lbl: 'Countries' } : null,
    data.nextDest ? { num: data.nextDest, lbl: 'Next up' } : null,
  ].filter(Boolean).slice(0, 3);

  return (
    <>
      <style>{PC_STYLES}</style>
      <div className="pc-card-shell">
      <div className="pc-card-inner">

      {/* ── HERO ── */}
      <div style={{ position:'relative', aspectRatio:'3/4', maxHeight:520, background: coverPhoto ? '#fff' : GRD, overflow:'hidden' }}>
        {coverPhoto
          ? <img className="pc-hero-img" src={coverPhoto} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
          : (
            <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ color:'rgba(255,255,255,0.35)', fontSize:13, letterSpacing:2 }}>Add a cover photo</div>
            </div>
          )
        }
        {/* photo count dots */}
        {photoUrls.length > 1 && !tripTag && (
          <div style={{ position:'absolute', top:16, left:'50%', transform:'translateX(-50%)', display:'flex', gap:4, zIndex:3 }}>
            {photoUrls.map((_,i) => (
              <div key={i} style={{ height:3, width: i===0 ? 26:14, borderRadius:99, background: i===0 ? '#fff':'rgba(255,255,255,0.38)', transition:'all .3s' }} />
            ))}
          </div>
        )}
        {/* trip status – opaque pill badge at top */}
        {tripTag && (
          <div style={{ position:'absolute', top:14, left:0, right:0, zIndex:2, pointerEvents:'none', display:'flex', justifyContent:'center' }}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:5, padding:'4px 11px 4px 9px',
              background: tripTag.live
                ? 'linear-gradient(135deg,#16A34A 0%,#15803D 100%)'
                : 'linear-gradient(135deg,#8820D0 0%,#EE0FA0 100%)',
              borderRadius:99,
              boxShadow: tripTag.live ? '0 2px 10px rgba(22,163,74,0.45)' : '0 2px 10px rgba(136,32,208,0.45)',
            }}>
              <span style={{ width:5, height:5, borderRadius:'50%', background:'rgba(255,255,255,0.9)', display:'block', flexShrink:0, animation:'pcPulse 1.4s ease-in-out infinite' }} />
              <div style={{ fontSize:10, fontWeight:700, color:'#fff', letterSpacing:'1.2px', textTransform:'uppercase' }}>{tripTag.label}</div>
            </div>
          </div>
        )}
        {/* deep bottom fade */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:320, background:'linear-gradient(to top,rgba(4,0,18,0.95) 0%,rgba(4,0,18,0.6) 45%,transparent 100%)', pointerEvents:'none' }} />
        {/* hero content */}
        <div style={{ position:'absolute', bottom:26, left:20, right:20, zIndex:2 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <div style={{ fontSize:33, fontWeight:800, color:'#fff', letterSpacing:'-0.6px', lineHeight:1, fontFamily:"'Sora',sans-serif" }}>
              {data.name || 'Your Name'}
              {data.age && <span style={{ fontWeight:500, opacity:0.85 }}>, {data.age}</span>}
            </div>
            <div style={{ width:22, height:22, borderRadius:'50%', background:GRD, flexShrink:0, boxShadow:'0 2px 10px rgba(238,15,160,0.65)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          {(data.city || data.height || data.countriesCount) && (
            <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:5, color:'rgba(255,255,255,0.62)', fontSize:13, marginBottom:12 }}>
              {data.city && <span>{data.city}</span>}
              {data.height && (
                <>
                  <span style={{ opacity:0.35, fontSize:10 }}>·</span>
                  <span>{data.height}</span>
                </>
              )}
              {data.countriesCount && (
                <>
                  <span style={{ opacity:0.35, fontSize:10 }}>·</span>
                  <span>{data.countriesCount} countries explored</span>
                </>
              )}
            </div>
          )}
          {personalities.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {personalities.map((p,i) => (
                <span key={p.id} style={{
                  background:'rgba(238,15,160,0.22)', border:'1px solid rgba(255,255,255,0.28)',
                  backdropFilter:'blur(14px)', borderRadius:99, padding:'5px 14px',
                  fontSize:12, color:'#fff', fontWeight:600, letterSpacing:'0.1px',
                  animation:`pcPillIn .45s cubic-bezier(0.22,1,0.36,1) ${i*90}ms both`,
                }}>
                  {p.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── STATS ── */}
      {statItems.length > 0 && (
        <div style={{ display:'flex', gap:8, margin:'14px 16px 0', ...s(60) }}>
          {statItems.map((st,i) => (
            <div key={i} className="pc-section-card" style={{ flex:1, background:'#fff', border:'1px solid #EBEBEB', borderRadius:18, padding:'14px 8px', textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: typeof st.num==='number' ? 24:20, fontWeight:800, background:GRD, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', letterSpacing:'-0.5px', lineHeight:1, animation:`pcScaleIn .5s cubic-bezier(0.34,1.56,0.64,1) ${i*80+150}ms both` }}>{st.num}</div>
              <div style={{ fontSize:9.5, color:'#B8B8B8', marginTop:4, fontWeight:700, textTransform:'uppercase', letterSpacing:'1px' }}>{st.lbl}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── PROMPT 1 ── */}
      {prompts[0] && promptAnswers[prompts[0]] && (
        <div className="pc-section-card" style={{ margin:'12px 16px 0', background:'#fff', border:'1px solid #EBEBEB', borderLeft:`4px solid ${PINK}`, borderRadius:22, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', ...s(120) }}>
          <div style={{ fontSize:11, color:PINK, fontStyle:'italic', marginBottom:8, opacity:0.85 }}>{prompts[0]}</div>
          <div style={{ fontSize:19, fontWeight:700, color:'#111827', lineHeight:1.4, letterSpacing:'-0.2px' }}>
            {promptAnswers[prompts[0]]}
          </div>
        </div>
      )}

      {/* ── NEXT ADVENTURE ── */}
      {(data.nextDest || nextVibeObjs.length > 0) && (
        <div style={{ margin:'12px 16px 0', background:GRD, borderRadius:22, padding:'20px 20px', ...s(200), position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-30, right:-30, width:110, height:110, borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-20, left:-20, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }} />
          <div style={{ fontSize:10, letterSpacing:'1.5px', textTransform:'uppercase', color:'rgba(255,255,255,0.55)', fontWeight:700, marginBottom:6 }}>NEXT ADVENTURE</div>
          <div style={{ fontSize:24, fontWeight:800, color:'#fff', letterSpacing:'-0.5px', fontFamily:"'Sora',sans-serif", lineHeight:1.1 }}>
            {data.nextDest || '—'}
          </div>
          {data.nextMonth && (
            <div style={{ fontSize:13, color:'rgba(255,255,255,0.58)', marginTop:5 }}>
              {data.nextMonth}
            </div>
          )}
          {nextVibeObjs.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:12 }}>
              {nextVibeObjs.map(v => (
                <span key={v.id} style={{ background:'rgba(255,255,255,0.17)', backdropFilter:'blur(10px)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:99, padding:'5px 13px', fontSize:12, color:'#fff', fontWeight:600 }}>
                  {v.label}
                </span>
              ))}
            </div>
          )}
          {lookForObjs.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:8 }}>
              {lookForObjs.map(l => (
                <span key={l.id} style={{ background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:99, padding:'3px 10px', fontSize:11, color:'rgba(255,255,255,0.82)', fontWeight:500 }}>
                  {l.label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PHOTO 2 ── */}
      {photo2 && (
        <div className="pc-photo-thumb" style={{ position:'relative', height:300, margin:'12px 16px 0', overflow:'hidden', borderRadius:20, background:'#000', ...s(260) }}>
          <img src={photo2} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
          {photoCaps[1] && (
            <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'32px 18px 14px', background:'linear-gradient(to top,rgba(0,0,0,0.55),transparent)', pointerEvents:'none' }}>
              <div style={{ color:'#fff', fontSize:13.5, fontWeight:600, letterSpacing:'-0.1px', textShadow:'0 1px 6px rgba(0,0,0,0.6)' }}>{photoCaps[1]}</div>
            </div>
          )}
        </div>
      )}

      {/* ── PROMPT 2 ── */}
      {prompts[1] && promptAnswers[prompts[1]] && (
        <div className="pc-section-card" style={{ margin:'12px 16px 0', background:'#fff', border:'1px solid #EBEBEB', borderLeft:`4px solid ${PURP}`, borderRadius:22, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', ...s(300) }}>
          <div style={{ fontSize:11, color:PURP, fontStyle:'italic', marginBottom:8, opacity:0.85 }}>{prompts[1]}</div>
          <div style={{ fontSize:18, fontWeight:700, color:'#111827', lineHeight:1.42, letterSpacing:'-0.15px' }}>
            {promptAnswers[prompts[1]]}
          </div>
        </div>
      )}

      {/* ── PROMPT 3 ── */}
      {prompts[2] && promptAnswers[prompts[2]] && (
        <div className="pc-section-card" style={{ margin:'12px 16px 0', background:'#fff', border:'1px solid #EBEBEB', borderLeft:`4px solid ${PINK}`, borderRadius:22, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', ...s(340) }}>
          <div style={{ fontSize:11, color:PINK, fontStyle:'italic', marginBottom:8, opacity:0.85 }}>{prompts[2]}</div>
          <div style={{ fontSize:18, fontWeight:700, color:'#111827', lineHeight:1.42, letterSpacing:'-0.15px' }}>
            {promptAnswers[prompts[2]]}
          </div>
        </div>
      )}

      {/* ── TRAVEL DNA ── */}
      {dnaItems.length > 0 && (
        <div className="pc-section-card" style={{ margin:'12px 16px 0', background:'#fff', border:'1px solid #EBEBEB', borderRadius:22, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', ...s(400) }}>
          <div style={{ fontSize:10, letterSpacing:'1.5px', textTransform:'uppercase', fontWeight:700, marginBottom:18, background:GRD, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Travel DNA</div>
          {dnaItems.map((item, i) => {
            const pct = (item.val / 9) * 100;
            const isLeft = pct < 45;
            const isRight = pct > 55;
            return (
              <div key={i} style={{ marginBottom: i < dnaItems.length - 1 ? 20 : 0 }}>
                <div style={{ fontSize:12, color:'#6B7280', marginBottom:10, fontStyle:'italic', lineHeight:1.4 }}>{item.q}</div>
                <div style={{ position:'relative', height:6, background:'rgba(238,15,160,0.1)', borderRadius:99, marginBottom:10 }}>
                  <div className="pc-dna-bar" style={{ height:'100%', width:`${pct}%`, background:GRD, borderRadius:99 }} />
                  <div style={{ position:'absolute', left:`${pct}%`, top:'50%', transform:'translate(-50%,-50%)', width:18, height:18, borderRadius:'50%', background: isLeft ? PINK : PURP, border:'3px solid #fff', boxShadow:`0 2px 10px rgba(238,15,160,0.5)`, transition:'left .3s' }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:10.5, color: isLeft ? PINK:'#B0B0B0', fontWeight: isLeft ? 700:400, maxWidth:'46%', lineHeight:1.35 }}>{item.left}</span>
                  <span style={{ fontSize:10.5, color: isRight ? PURP:'#B0B0B0', fontWeight: isRight ? 700:400, maxWidth:'46%', textAlign:'right', lineHeight:1.35 }}>{item.right}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PHOTO 3 ── */}
      {photo3 && (
        <div className="pc-photo-thumb" style={{ position:'relative', height:260, margin:'12px 16px 0', overflow:'hidden', borderRadius:20, background:'#000', ...s(450) }}>
          <img src={photo3} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
          {photoCaps[2] && (
            <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'28px 18px 14px', background:'linear-gradient(to top,rgba(0,0,0,0.52),transparent)', pointerEvents:'none' }}>
              <div style={{ color:'#fff', fontSize:13.5, fontWeight:600, textShadow:'0 1px 6px rgba(0,0,0,0.6)' }}>{photoCaps[2]}</div>
            </div>
          )}
        </div>
      )}



      {/* ── FLAGS ── */}
      {(greenFlagObjs.length > 0 || redFlagObjs.length > 0) && (
        <div style={{ display:'flex', flexDirection:'column', gap:8, margin:'12px 16px 0', ...s(540) }}>
          {redFlagObjs.length > 0 && (
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:20, padding:'16px 14px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:10 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"/><path d="M8 20v2h8v-2"/><circle cx="9" cy="12" r="1" fill="#374151"/><circle cx="15" cy="12" r="1" fill="#374151"/><path d="m12.5 17-.5-1-.5 1h1z" fill="#374151"/></svg>
                <div style={{ fontSize:10, letterSpacing:'1.2px', textTransform:'uppercase', color:'#374151', fontWeight:700 }}>Red Flag</div>
              </div>
              {redFlagObjs.map(r => (
                <div key={r.id} style={{ fontSize:12.5, color:'#374151', lineHeight:1.5, marginBottom:5, paddingBottom:5, borderBottom:'1px solid #F5F5F5' }}>{r.label}</div>
              ))}
            </div>
          )}
          {greenFlagObjs.length > 0 && (
            <div style={{ background:'#fff', border:'1px solid #EBEBEB', borderRadius:20, padding:'16px 14px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:10 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#EE0FA0" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <div style={{ fontSize:10, letterSpacing:'1.2px', textTransform:'uppercase', color:'#374151', fontWeight:700 }}>Green Flag</div>
              </div>
              {greenFlagObjs.map(g => (
                <div key={g.id} style={{ fontSize:12.5, color:'#374151', lineHeight:1.5, marginBottom:5, paddingBottom:5, borderBottom:'1px solid #F5F5F5' }}>{g.label}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── HERE FOR ── */}
      {hereForObjs.length > 0 && (
        <div className="pc-section-card" style={{ margin:'12px 16px 0', background:'#fff', border:'1px solid #EBEBEB', borderRadius:22, padding:'18px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', ...s(580) }}>
          <div style={{ fontSize:10, letterSpacing:'1.5px', textTransform:'uppercase', fontWeight:700, marginBottom:14, background:GRD, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Here For</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {hereForObjs.map(h => (
              <div key={h.id} style={{ background:'#fff', border:'1px solid #F0F0F0', borderRadius:14, padding:'12px 16px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#111827', lineHeight:1.3 }}>{h.label}</div>
                <div style={{ fontSize:12, color:'#9CA3AF', marginTop:4, fontStyle:'italic', lineHeight:1.45 }}>{h.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SOUNDTRACK ── */}
      {data.soundtrack && (
        <div className="pc-section-card" style={{ margin:'12px 16px 0', background:'#fff', border:'1px solid #EBEBEB', borderLeft:'3px solid #22C55E', borderRadius:20, padding:'14px 18px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', ...s(620) }}>
          <div style={{ fontSize:10, letterSpacing:'1.2px', textTransform:'uppercase', color:'#16A34A', fontWeight:700, marginBottom:5 }}>Trip Soundtrack</div>
          <div style={{ fontSize:15, color:'#111827', fontWeight:600 }}>{data.soundtrack}</div>
        </div>
      )}

      {/* ── EDIT BUTTON ── */}
      {onEdit && (
        <div style={{ padding:'24px 16px 4px', ...s(660) }}>
          <button type="button" onClick={onEdit} className="pc-glow-btn" style={{
            display:'block', width:'100%', padding:'16px', borderRadius:20,
            border:'none', background:GRD, color:'#fff',
            fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:800, cursor:'pointer',
            letterSpacing:'-0.2px',
          }}>
            Edit Profile
          </button>
        </div>
      )}

      <div style={{ height:32 }} />
      </div>{/* pc-card-inner */}
      </div>{/* pc-card-shell */}


    </>
  );
}

// ── Step headline with gradient word ─────────────────────────────────────────

const GRAD_WORD = { background: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' };

function StepHeadline({ stepId, name }) {
  const first = name?.trim().split(' ')[0];
  switch (stepId) {
    case 'basics':   return first
      ? <>Let's go, <span style={GRAD_WORD}>{first}.</span> Show them who you are.</>
      : <>Show them who you are.</>;
    case 'photos':   return <>Let the <span style={GRAD_WORD}>photos</span> do the talking.</>;
    case 'identity': return <>Pick your travel <span style={GRAD_WORD}>flavour.</span></>;
    case 'stories':  return <>Tell me something <span style={GRAD_WORD}>real.</span></>;
    case 'dna':      return <>The sliders of <span style={GRAD_WORD}>truth.</span></>;
    case 'world':    return <>Time to count the <span style={GRAD_WORD}>stamps.</span></>;
    case 'fun':      return <>Now the <span style={GRAD_WORD}>fun</span> part.</>;
    case 'here':     return <>Last one. What's your actual <span style={GRAD_WORD}>vibe?</span></>;
    default:         return null;
  }
}

// ── Wizard Shell ──────────────────────────────────────────────────────────────

export function ClubProfileWizard({ onComplete, onSkip, tripDest, tripArrival, tripDeparture, isEditing = false, tripId }) {
  // build per-trip keys so each account's data is isolated
  const dataKey = tripId ? `${CLUB_WIZARD_DATA_KEY}_${tripId}` : CLUB_WIZARD_DATA_KEY;
  const doneKey = tripId ? `${CLUB_WIZARD_DONE_KEY}_${tripId}` : CLUB_WIZARD_DONE_KEY;

  // -1 = intro, 0..N-1 = steps
  const [screen, setScreen] = useState(-1);
  const [stepError, setStepError] = useState('');
  const [data, setData] = useState(() => {
    try {
      const profRaw = localStorage.getItem('travelbae_profile');
      const prof = profRaw ? JSON.parse(profRaw) : {};
      const savedRaw = localStorage.getItem(dataKey);
      if (savedRaw) {
        const saved = JSON.parse(savedRaw);
        return { ...saved, name: saved.name || prof.name || '' };
      }
      return { name: prof.name || '', photoUrls: [] };
    } catch { return {}; }
  });

  const isIntro = screen === -1;
  const isLast  = screen === STEPS.length - 1;
  const pct     = screen < 0 ? 0 : Math.round(((screen + 1) / STEPS.length) * 100);
  const step    = STEPS[screen] || null;

  const persist = d => { try { localStorage.setItem(dataKey, JSON.stringify(d)); } catch {} };

  const advance = () => {
    if (step?.id === 'photos' && (data.photoUrls || []).length < 3) {
      setStepError('All 3 photos are required — they make your profile stand out.');
      return;
    }
    setStepError('');
    persist(data);
    if (isLast) {
      try { localStorage.setItem(doneKey, '1'); } catch {}
      onComplete(data);
    } else {
      setScreen(s => s + 1);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1002,
        background: 'rgba(10,5,30,0.68)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        animation: 'clubFadeIn .2s ease both',
      }}
    >
      <style>{`
        @keyframes wizSlideUp { from { opacity:0; transform:translateY(24px) scale(.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes wizSpin    { to { transform:rotate(360deg); } }
        @keyframes wizIn      { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:translateX(0); } }
        @keyframes photoIn    { from { opacity:0; transform:scale(0.97) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .wiz-continue { transition: filter .15s, transform .1s; }
        .wiz-continue:hover { filter: brightness(1.1); }
        .wiz-continue:active { transform: scale(0.97); }
        .wiz-back { transition: all .15s; }
        .wiz-back:hover { background: #F0ECFF !important; border-color: #C4B5FD !important; }
        .wiz-back:active { transform: scale(0.97); }
      `}</style>

      <div style={{ position: 'relative', width: '100%', maxWidth: 468 }}>
        {isEditing && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            style={{
              position: 'absolute', top: -14, right: -14, zIndex: 10,
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
              border: '1.5px solid rgba(255,255,255,0.28)',
              color: '#fff', fontSize: 16, lineHeight: 1,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
        <div style={{
          width: '100%', maxHeight: '88vh',
          background: '#fff', borderRadius: 24,
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: '0 32px 80px rgba(10,5,30,0.36), 0 0 0 1px rgba(255,255,255,0.06)',
          animation: 'wizSlideUp .38s cubic-bezier(0.22,1,0.36,1) both',
        }}>

        {/* ── Intro ── */}
        {isIntro && (
          <>
            <div style={{ background: '#fff', padding: '32px 24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
              <img src={lumiImg} alt="Lumi" style={{ height: 156, width: 'auto', objectFit: 'contain', display: 'block' }} />
            </div>

            <div style={{ padding: '20px 24px 0', overflowY: 'auto', flex: 1 }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1.2, marginBottom: 8 }}>
                Your people are out there.
              </div>
              <div style={{ fontSize: 13.5, color: '#6B7280', lineHeight: 1.7, marginBottom: 20 }}>
                Most travel profiles say "I love adventures." Groundbreaking. This one's different. Two minutes, honest answers, and the right people will actually find you. Don't overthink it.
              </div>
            </div>

            <div style={{ padding: '14px 24px 28px', flexShrink: 0 }}>
              <button type="button" onClick={advance}
                style={{ width: '100%', padding: '15px', borderRadius: 16, border: 'none', background: G, color: '#fff', fontFamily: "'DM Sans',sans-serif", fontSize: 16, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 24px rgba(136,32,208,0.38)', letterSpacing: '-0.2px' }}>
                Let's go →
              </button>
            </div>
          </>
        )}

        {/* ── Question steps ── */}
        {!isIntro && step && (
          <>
            <div style={{ height: 4, background: G, flexShrink: 0 }} />

            <div style={{ padding: '14px 20px 10px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 4, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: G, borderRadius: 99, transition: 'width .32s cubic-bezier(.4,0,.2,1)' }} />
                </div>
                <span style={{ fontSize: 11, color: ACCENT, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", flexShrink: 0 }}>{screen + 1} / {STEPS.length}</span>
              </div>
              <div key={step.id} style={{ animation: 'wizIn .22s ease both' }}>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: '#111827', lineHeight: 1.25, marginBottom: 5 }}>
                  <StepHeadline stepId={step.id} name={data.name} />
                </div>
                <div style={{ fontSize: 12.5, color: '#9CA3AF', lineHeight: 1.55 }}>{step.sub}</div>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: step.id === 'basics' ? 'visible' : 'auto', padding: '4px 20px 20px' }}>
              <div key={`c-${screen}`} style={{ animation: 'wizIn .22s ease both' }}>
                <StepContent stepId={step.id} data={data} setData={setData} tripDest={tripDest} tripArrival={tripArrival} tripDeparture={tripDeparture} />
              </div>
            </div>

            <div style={{ padding: '12px 20px 28px', borderTop: '1px solid #F3F4F6', background: '#fff', display: 'flex', gap: 10, flexShrink: 0 }}>
              <button type="button" onClick={() => { setStepError(''); setScreen(s => s - 1); }} className="wiz-back"
                style={{ flex: 1, padding: '9px', borderRadius: 12, border: '1.5px solid #E5E7EB', background: '#F9FAFB', color: '#374151', fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                ← Back
              </button>
              <button type="button" onClick={advance} className="wiz-continue"
                style={{ flex: 3, padding: '9px', borderRadius: 12, border: 'none', background: G, color: '#fff', fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(136,32,208,0.3)', letterSpacing: '-0.2px' }}>
                {isLast ? "Done — show me my match 🎉" : "Continue →"}
              </button>
            </div>
            {stepError && (
              <div style={{ padding: '0 20px 16px', marginTop: -4 }}>
                <div style={{ background: 'rgba(238,15,160,0.07)', border: '1px solid rgba(238,15,160,0.22)', borderRadius: 10, padding: '9px 13px', fontSize: 12.5, color: '#C0186B', fontWeight: 600, textAlign: 'center' }}>
                  {stepError}
                </div>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
