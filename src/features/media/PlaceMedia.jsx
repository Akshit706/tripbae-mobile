import { useState, useEffect } from 'react';

// Module-level cache: query → resolved URL (or null). Shared across all instances.
const _photoCache = new Map();
// In-flight promises to deduplicate concurrent requests for the same query.
const _photoInFlight = new Map();

async function fetchCached(query) {
  if (_photoCache.has(query)) return _photoCache.get(query);
  if (_photoInFlight.has(query)) return _photoInFlight.get(query);
  const { fetchPlacePhotos } = await import('../../api');
  const promise = fetchPlacePhotos(query)
    .then(data => {
      const url = (data.urls || [])[0] || null;
      _photoCache.set(query, url);
      _photoInFlight.delete(query);
      return url;
    })
    .catch(() => {
      _photoCache.set(query, null);
      _photoInFlight.delete(query);
      return null;
    });
  _photoInFlight.set(query, promise);
  return promise;
}

// Deterministic gradient from query string — looks good, never blank
function gradientFromQuery(query) {
  const gradients = [
    'linear-gradient(135deg,#1C1410 0%,#3D2B1F 50%,#6B4226 100%)',
    'linear-gradient(135deg,#0F2027 0%,#203A43 50%,#2C5364 100%)',
    'linear-gradient(135deg,#16213E 0%,#0F3460 50%,#533483 100%)',
    'linear-gradient(135deg,#1A1A2E 0%,#16213E 50%,#0F3460 100%)',
    'linear-gradient(135deg,#0D0D0D 0%,#1A1A1A 40%,#2D4A22 100%)',
    'linear-gradient(135deg,#2C1810 0%,#4A2512 50%,#7A3B1E 100%)',
    'linear-gradient(135deg,#0A0A23 0%,#1A1A3E 50%,#2D2D6B 100%)',
    'linear-gradient(135deg,#1B2A1B 0%,#2D4A2D 50%,#1A3A1A 100%)',
  ];
  const code = Math.abs(Array.from(query || '').reduce((a, c) => a + c.charCodeAt(0), 0));
  return gradients[code % gradients.length];
}

function PlacePhoto({ query, style, delay = 0 }) {
  const [url, setUrl] = useState(() => _photoCache.get(query) ?? null);
  const [loading, setLoading] = useState(!_photoCache.has(query));
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!query) return;
    if (_photoCache.has(query)) {
      setUrl(_photoCache.get(query));
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      fetchCached(query).then(u => { setUrl(u); setLoading(false); });
    }, delay);
    return () => clearTimeout(timer);
  }, [query, delay]);

  const fallbackStyle = {
    width: '100%', height: 140, borderRadius: 12,
    background: gradientFromQuery(query),
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    ...style,
  };

  if (loading) return (
    <div style={{ ...fallbackStyle, background: undefined, backgroundColor: '#1A1A2E', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.04) 50%,rgba(255,255,255,0) 100%)', backgroundSize: '400px 100%', animation: 'phSpin 1.4s ease-in-out infinite' }} />
    </div>
  );

  if (!url || imgError) return (
    <div style={fallbackStyle}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
    </div>
  );

  return (
    <img
      src={url}
      alt={query}
      style={{ width: '100%', height: 140, borderRadius: 12, objectFit: 'cover', display: 'block', ...style }}
      onError={() => setImgError(true)}
    />
  );
}


function PlacePhotosStrip({ queries, style }) {
  const [urls, setUrls] = useState([]);
  const cacheKey = queries?.join(',') || '';

  useEffect(() => {
    if (!queries?.length) return;
    const q = queries.join(' ');
    if (_photoCache.has(q)) {
      const cached = _photoCache.get(q);
      if (cached) setUrls([cached]);
      return;
    }
    fetchCached(q).then(u => { if (u) setUrls([u]); });
  }, [cacheKey]);

  if (urls.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, ...style }}>
      {urls.map((url, i) => (
        <img
          key={i}
          src={url}
          alt=""
          style={{ width: 140, height: 100, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
          onError={e => e.target.style.display = 'none'}
        />
      ))}
    </div>
  );
}




export { PlacePhoto, PlacePhotosStrip };
