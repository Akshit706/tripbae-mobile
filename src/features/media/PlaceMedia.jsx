import { useState, useEffect } from 'react';

// Module-level cache: query → resolved URL (or null). Shared across all instances.
const _photoCache = new Map();
// In-flight promises to deduplicate concurrent requests for the same query.
const _photoInFlight = new Map();
// Multi-photo cache for slider use-cases (day planner, hotels, etc.).
const _photoListCache = new Map();
const _photoListInFlight = new Map();

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

async function fetchCachedList(query, limit = 3) {
  if (_photoListCache.has(query)) return (_photoListCache.get(query) || []).slice(0, limit);
  if (_photoListInFlight.has(query)) {
    const inFlight = await _photoListInFlight.get(query);
    return (inFlight || []).slice(0, limit);
  }
  const { fetchPlacePhotos } = await import('../../api');
  const promise = fetchPlacePhotos(query)
    .then(data => {
      const urls = (data.urls || []).filter(Boolean);
      _photoListCache.set(query, urls);
      _photoCache.set(query, urls[0] || null);
      _photoListInFlight.delete(query);
      return urls;
    })
    .catch(() => {
      _photoListCache.set(query, []);
      _photoCache.set(query, null);
      _photoListInFlight.delete(query);
      return [];
    });
  _photoListInFlight.set(query, promise);
  const resolved = await promise;
  return (resolved || []).slice(0, limit);
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

function PlacePhotoCarousel({ query, style, delay = 0, limit = 3, alt = '', onImageClick }) {
  const [photos, setPhotos] = useState(() => (_photoListCache.get(query) || []).slice(0, limit));
  const [photoIdx, setPhotoIdx] = useState(0);
  const [loading, setLoading] = useState(!_photoListCache.has(query));
  const [imgErr, setImgErr] = useState(new Set());

  useEffect(() => {
    if (!query) return;
    setPhotoIdx(0);
    setImgErr(new Set());

    if (_photoListCache.has(query)) {
      setPhotos((_photoListCache.get(query) || []).slice(0, limit));
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      fetchCachedList(query, limit).then(urls => {
        setPhotos(urls || []);
        setLoading(false);
      });
    }, delay);
    return () => clearTimeout(timer);
  }, [query, limit, delay]);

  const activePhotos = (photos || []).filter((_, i) => !imgErr.has(i));
  const canSlide = activePhotos.length > 1;
  const safeIdx = activePhotos.length ? (photoIdx % activePhotos.length) : 0;
  const curUrl = activePhotos[safeIdx] || null;
  const fallbackBg = gradientFromQuery(query);

  const rootStyle = {
    position: 'relative',
    width: '100%',
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    background: fallbackBg,
    ...style,
  };

  if (loading) {
    return (
      <div style={{ ...rootStyle, background: '#1A1A2E' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,0.05) 50%,rgba(255,255,255,0) 100%)', backgroundSize: '400px 100%', animation: 'phSpin 1.4s ease-in-out infinite' }} />
      </div>
    );
  }

  return (
    <div style={rootStyle}>
      {curUrl ? (
        <img
          src={curUrl}
          alt={alt || query}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => setImgErr(prev => {
            const next = new Set(prev);
            next.add(safeIdx);
            return next;
          })}
          onClick={onImageClick ? () => onImageClick(curUrl) : undefined}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: fallbackBg }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      )}

      {canSlide && (
        <>
          <button
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setPhotoIdx(i => (i - 1 + activePhotos.length) % activePhotos.length);
            }}
            style={{
              position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.22)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(4px)', zIndex: 2,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setPhotoIdx(i => (i + 1) % activePhotos.length);
            }}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.22)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backdropFilter: 'blur(4px)', zIndex: 2,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>

          <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4, pointerEvents: 'none', zIndex: 2 }}>
            {activePhotos.map((_, i) => (
              <div key={i} style={{ width: i === safeIdx ? 14 : 5, height: 5, borderRadius: 99, background: i === safeIdx ? '#fff' : 'rgba(255,255,255,0.42)', transition: 'all .2s' }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}




export { PlacePhoto, PlacePhotosStrip, PlacePhotoCarousel };
