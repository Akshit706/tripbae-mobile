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

function PlacePhoto({ query, style, delay = 0 }) {
  const [url, setUrl] = useState(() => _photoCache.get(query) ?? null);
  const [loading, setLoading] = useState(!_photoCache.has(query));

  useEffect(() => {
    if (!query) return;
    // Already cached synchronously — nothing to do
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

  if (loading) return (
    <div style={{ width: '100%', height: 140, borderRadius: 12, background: '#F1EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, ...style }}>
      🌍
    </div>
  );

  if (!url) return null;

  return (
    <img
      src={url}
      alt={query}
      style={{ width: '100%', height: 140, borderRadius: 12, objectFit: 'cover', display: 'block', ...style }}
      onError={e => e.target.style.display = 'none'}
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
