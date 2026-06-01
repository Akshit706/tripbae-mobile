import { useState, useEffect } from 'react';
function PlacePhoto({ query, style, delay = 0 }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) return;
    const timer = setTimeout(() => {
      import('../../api').then(({ fetchPlacePhotos }) => {
        fetchPlacePhotos(query)
          .then(data => {
            const urls = data.urls || [];
            if (urls.length > 0) setUrl(urls[0]);
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      });
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

  useEffect(() => {
    if (!queries?.length) return;
    import('../../api').then(({ fetchPlacePhotos }) => {
      fetchPlacePhotos(queries.join(' '))
        .then(data => setUrls(data.urls || []))
        .catch(() => {});
    });
  }, [queries?.join(',')]);

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
