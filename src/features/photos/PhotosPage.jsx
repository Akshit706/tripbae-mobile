import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../supabase';
import { addPhoto, deletePhoto } from '../../api';
import { normalizeMembers } from '../shared/constants';
import { S } from '../shared/styles';
import { Avatar } from '../shared/ui';
import { PlacePhoto, PlacePhotosStrip } from '../media/PlaceMedia';
function PhotosPage({ trip, myNickname }) {
  const memberNames = normalizeMembers(trip.members);
  const me = myNickname || memberNames[0] || 'Me';

  const initialPhotos = trip.photos || [];
  const [allPhotos, setAllPhotos] = useState(initialPhotos);
  const [activeFolder, setActiveFolder] = useState(me);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  // ── NEW: confirm dialog state ──
  const [confirmDelete, setConfirmDelete] = useState(null); // null | 'single' | 'bulk'
  const [pendingDeletePhoto, setPendingDeletePhoto] = useState(null); // single photo

  const byMember = useMemo(() => {
    const map = {};
    memberNames.forEach(m => { map[m] = []; });
    allPhotos.forEach(p => {
      if (map[p.uploader]) map[p.uploader].push(p);
      else map[p.uploader] = [p];
    });
    return map;
  }, [allPhotos, memberNames]);

  const folderPhotos = byMember[activeFolder] || [];
  const isMyFolder = activeFolder === me;

  /* ── upload ── */
  const processFiles = async (files) => {
    setUploading(true);
    setUploadProgress(0);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `${trip.id}/${me}/${Date.now()}-${file.name}`;

      const { error } = await supabase.storage
        .from('trip-photos')
        .upload(fileName, file);

      if (error) { console.error('Upload error:', error.message); continue; }

      const { data: { publicUrl } } = supabase.storage
        .from('trip-photos')
        .getPublicUrl(fileName);

      try {
        const res = await addPhoto(trip.id, publicUrl);
        setAllPhotos(p => [...p, res.photo || { id: Date.now() + Math.random(), url: publicUrl, uploader: me }]);
      } catch {
        setAllPhotos(p => [...p, { id: Date.now() + Math.random(), url: publicUrl, uploader: me }]);
      }
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }
    setUploading(false);
    setUploadProgress(0);
    setActiveFolder(me);
  };

  const handleUpload = (e) => processFiles(Array.from(e.target.files));
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) processFiles(files);
  };

  /* ── delete (single) ── */
  const doDeleteSingle = async (photo) => {
    const fileName = `${trip.id}/${me}/${photo.url.split('/').pop()}`;
    await supabase.storage.from('trip-photos').remove([fileName]);
    
    await deletePhoto(trip.id, photo.id); // ← replaces the silent try/catch fetch

    setAllPhotos(p => p.filter(x => x.id !== photo.id));
    setSelected(s => { const n = new Set(s); n.delete(photo.id); return n; });
    setPendingDeletePhoto(null);
    setConfirmDelete(null);
  };

  /* ── delete (bulk) ── */
  const doDeleteBulk = async () => {
    const toDelete = folderPhotos.filter(p => selected.has(p.id));
    for (const photo of toDelete) {
      const fileName = `${trip.id}/${me}/${photo.url.split('/').pop()}`;
      await supabase.storage.from('trip-photos').remove([fileName]);
      await deletePhoto(trip.id, photo.id); // ← same fix
    }
    const deletedIds = new Set(toDelete.map(p => p.id));
    setAllPhotos(p => p.filter(x => !deletedIds.has(x.id)));
    setSelected(new Set());
    setConfirmDelete(null);
  };

  /* ── confirm delete flow ── */
  const askDeleteSingle = (photo, e) => {
    e.stopPropagation();
    setPendingDeletePhoto(photo);
    setConfirmDelete('single');
  };
  const askDeleteBulk = () => setConfirmDelete('bulk');

  const cancelDelete = () => {
    setConfirmDelete(null);
    setPendingDeletePhoto(null);
  };

  const confirmDeleteAction = () => {
    if (confirmDelete === 'single' && pendingDeletePhoto) doDeleteSingle(pendingDeletePhoto);
    else if (confirmDelete === 'bulk') doDeleteBulk();
  };

  /* ── selection ── */
  const toggle = (id) => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const clearSel = () => setSelected(new Set());

  /* ── download selected (fixed: fetch → blob → anchor) ── */
  const downloadSelected = async () => {
    const photos = folderPhotos.filter(p => selected.has(p.id));
    for (const p of photos) {
      try {
        const res = await fetch(p.url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = p.url.split('/').pop() || `photo-${p.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } catch (err) {
        // Fallback: open in new tab if CORS blocks the fetch
        window.open(p.url, '_blank');
      }
    }
  };

  /* ── lightbox ── */
  const openLightbox = (idx) => setLightbox({ photos: folderPhotos, index: idx });
  const lbPrev = () => setLightbox(l => ({ ...l, index: Math.max(0, l.index - 1) }));
  const lbNext = () => setLightbox(l => ({ ...l, index: Math.min(l.photos.length - 1, l.index + 1) }));

  useEffect(() => {
    const onKey = (e) => {
      if (confirmDelete) {
        if (e.key === 'Escape') cancelDelete();
        if (e.key === 'Enter') confirmDeleteAction();
        return;
      }
      if (!lightbox) return;
      if (e.key === 'ArrowLeft') lbPrev();
      if (e.key === 'ArrowRight') lbNext();
      if (e.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, confirmDelete, pendingDeletePhoto]);

  const initials = (name) => name.slice(0, 2).toUpperCase();

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

    .pr { font-family:'DM Sans',sans-serif; background:#0c0c0f; color:#e2e0da; display:block; padding-bottom:7rem; min-height:100vh; }

    /* ── folders bar ── */
    .fb { display:flex; gap:12px; overflow-x:auto; padding:1.25rem 1.25rem 1rem; scrollbar-width:none; }
    .fb::-webkit-scrollbar { display:none; }

    .ft { display:flex; flex-direction:column; align-items:center; gap:7px; cursor:pointer; flex-shrink:0; }

    .fi {
      width:62px; height:54px; border-radius:14px; position:relative;
      display:flex; align-items:center; justify-content:center;
      font-size:15px; font-weight:700; letter-spacing:.5px;
      background:#1c1c20; border:1.5px solid rgba(255,255,255,0.06);
      transition:all .2s; color:#9e9c96;
    }
    .ft:hover .fi { border-color:rgba(255,255,255,0.14); transform:translateY(-2px); }
    .ft.active .fi {
      background:linear-gradient(135deg,#1D9E75,#0f6e56);
      border-color:rgba(29,158,117,0.5);
      color:#fff;
      box-shadow:0 6px 24px rgba(29,158,117,0.3);
      transform:translateY(-2px);
    }
    .ft.mine .fi { background:linear-gradient(135deg,#1e1e23,#161619); }
    .ft.mine.active .fi { background:linear-gradient(135deg,#1D9E75,#0f6e56); }

    .fc {
      position:absolute; top:-6px; right:-6px;
      background:#1D9E75; color:#fff; font-size:9px; font-weight:700;
      min-width:18px; height:18px; border-radius:9px;
      display:flex; align-items:center; justify-content:center;
      padding:0 4px; border:2px solid #0c0c0f;
    }

    .fl { font-size:10px; font-weight:500; color:#6e6c66; max-width:66px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transition:color .2s; letter-spacing:.2px; }
    .ft.active .fl { color:#c8c6c0; }

    /* ── divider ── */
    .divider { height:1px; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.06),transparent); margin:0 1.25rem; }

    /* ── section header ── */
    .sh { display:flex; align-items:baseline; gap:10px; padding:1.25rem 1.25rem 1rem; }
    .st { font-family:'DM Serif Display',serif; font-size:24px; color:#e2e0da; margin:0; line-height:1; }
    .st em { font-style:italic; color:#1D9E75; }
    .ss { font-size:11px; color:#4a4845; letter-spacing:.3px; }

    /* ── privacy notice ── */
    .pn {
      display:flex; align-items:center; gap:10px;
      margin:0 1.25rem 1rem; padding:10px 14px;
      background:linear-gradient(135deg,rgba(29,158,117,0.08),rgba(29,158,117,0.03));
      border:1px solid rgba(29,158,117,0.18);
      border-radius:12px;
      font-size:11.5px; color:#9ec9b9; letter-spacing:.2px; line-height:1.45;
    }
    .pn-ic { font-size:15px; flex-shrink:0; }
    .pn strong { color:#1D9E75; font-weight:600; }

    /* ── upload zone ── */
    .uz {
      margin:0 1.25rem 1.25rem;
      border-radius:18px; padding:2rem 1.5rem;
      text-align:center; cursor:pointer;
      position:relative; z-index:1; display:block; width:auto;
      overflow:hidden; transition:all .3s;
      background:#141418;
      border:1.5px dashed rgba(255,255,255,0.1);
    }
    .uz:hover { border-color:rgba(29,158,117,0.5); background:#161a18; }
    .uz.drag { border-color:#1D9E75; background:#0f1a16; box-shadow:0 0 40px rgba(29,158,117,0.1); }

    .ui { font-size:40px; margin-bottom:12px; display:block; animation:bob 3s ease-in-out infinite; }
    @keyframes bob { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-6px) rotate(3deg)} }

    .ut { font-size:14px; font-weight:500; color:#b8b6b0; margin:0 0 5px; }
    .usub { font-size:12px; color:#4a4845; margin:0; }

    .ubadge {
      display:inline-flex; align-items:center; gap:6px;
      background:rgba(29,158,117,0.1); border:1px solid rgba(29,158,117,0.2);
      color:#1D9E75; font-size:11px; font-weight:600;
      padding:4px 12px; border-radius:99px; margin-top:12px; letter-spacing:.2px;
    }

    /* uploading overlay */
    .upl-overlay {
      position:absolute; inset:0; background:rgba(12,12,15,0.75);
      backdrop-filter:blur(4px); border-radius:16px;
      display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px;
      z-index:10;
    }
    .upl-spin {
      width:32px; height:32px; border:3px solid rgba(29,158,117,0.2);
      border-top-color:#1D9E75; border-radius:50%;
      animation:spin .7s linear infinite;
    }
    @keyframes spin { to{transform:rotate(360deg)} }
    .upl-text { font-size:12px; color:#1D9E75; font-weight:600; }

    /* ── view banner ── */
    .vb {
      margin:0 1.25rem 1.25rem;
      background:#141418; border:1px solid rgba(255,255,255,0.05);
      border-radius:16px; padding:.9rem 1.25rem;
      display:flex; align-items:center; gap:12px;
    }
    .vba {
      width:38px; height:38px; border-radius:50%;
      background:linear-gradient(135deg,#252529,#1a1a1e);
      display:flex; align-items:center; justify-content:center;
      font-size:13px; font-weight:700; color:#9e9c96;
      border:1.5px solid rgba(255,255,255,0.07); flex-shrink:0;
    }
    .vbt { font-size:13px; color:#6e6c66; line-height:1.5; }
    .vbt strong { color:#c8c6c0; }

    /* ── photo grid ── */
    .pg {
      display:grid; clear:both;
      grid-template-columns:repeat(auto-fill,minmax(110px,1fr));
      gap:4px; padding:0 1.25rem;
    }

    .pc {
      position:relative; border-radius:10px; overflow:hidden;
      aspect-ratio:1; cursor:pointer;
      transition:transform .2s, box-shadow .2s;
      border:2px solid transparent;
      background:#1c1c20;
    }
    .pc:hover { transform:scale(1.02); box-shadow:0 10px 30px rgba(0,0,0,0.6); }
    .pc.sel { border-color:#1D9E75; box-shadow:0 0 0 2px rgba(29,158,117,0.3); }

    .pc img { width:100%; height:100%; object-fit:cover; display:block; transition:filter .2s; }
    .pc:hover img { filter:brightness(.8); }

    /* checkmark */
    .pck {
      position:absolute; top:7px; right:7px;
      width:22px; height:22px; border-radius:50%;
      background:rgba(0,0,0,0.55); border:2px solid rgba(255,255,255,0.4);
      display:flex; align-items:center; justify-content:center;
      font-size:11px; color:#fff; transition:all .15s; z-index:3;
      backdrop-filter:blur(4px);
    }
    .pc.sel .pck { background:#1D9E75; border-color:#1D9E75; }

    /* expand — hover only */
    .pex {
      position:absolute; inset:0;
      display:flex; align-items:center; justify-content:center;
      opacity:0; transition:opacity .2s;
      pointer-events:none; z-index:2;
    }
    .pc:hover .pex { opacity:1; pointer-events:all; }
    .pexi {
      background:rgba(0,0,0,0.6); backdrop-filter:blur(6px);
      border-radius:50%; width:36px; height:36px;
      display:flex; align-items:center; justify-content:center;
      font-size:16px; border:1px solid rgba(255,255,255,0.15);
      transition:transform .15s;
    }
    .pexi:hover { transform:scale(1.1); }

    /* delete btn — my folder hover only */
    .pdel {
      position:absolute; top:7px; left:7px;
      width:26px; height:26px; border-radius:50%;
      background:rgba(0,0,0,0.6); border:1px solid rgba(255,255,255,0.1);
      color:#fff; font-size:12px; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      opacity:0; transition:opacity .15s, background .15s;
      z-index:3; backdrop-filter:blur(4px);
    }
    .pc:hover .pdel { opacity:1; }
    .pdel:hover { background:rgba(153,60,29,0.85) !important; }

    /* ── empty state ── */
    .es { text-align:center; padding:4rem 1.25rem; color:#4a4845; }
    .ei { font-size:56px; margin-bottom:16px; display:block; opacity:.5; }
    .etit { font-size:16px; font-weight:500; color:#6e6c66; margin:0 0 6px; }
    .esub { font-size:13px; margin:0; }

    /* ── action bar ── */
    .ab {
      position:fixed; bottom:0; left:50%;
      transform:translateX(-50%);
      width:100%; max-width:880px;
      background:rgba(12,12,15,0.96);
      backdrop-filter:blur(24px);
      border-top:1px solid rgba(255,255,255,0.07);
      padding:14px 1.25rem;
      display:flex; align-items:center; gap:10px;
      z-index:190;
      animation:slideUp .2s ease-out;
    }
    @keyframes slideUp { from{transform:translateX(-50%) translateY(100%)} to{transform:translateX(-50%) translateY(0)} }

    .al { flex:1; font-size:13px; color:#6e6c66; }
    .al strong { color:#e2e0da; font-size:15px; }

    .bgh {
      background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
      color:#9e9c96; font-size:13px; font-family:'DM Sans',sans-serif; font-weight:500;
      padding:9px 16px; border-radius:10px; cursor:pointer; transition:all .15s;
    }
    .bgh:hover { background:rgba(255,255,255,0.1); color:#e2e0da; }

    .bpr {
      background:linear-gradient(135deg,#1D9E75,#0f6e56); border:none;
      color:#fff; font-size:13px; font-family:'DM Sans',sans-serif; font-weight:600;
      padding:9px 18px; border-radius:10px; cursor:pointer;
      transition:all .15s; box-shadow:0 4px 16px rgba(29,158,117,0.35);
      display:flex; align-items:center; gap:7px;
    }
    .bpr:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(29,158,117,0.45); }

    /* NEW: red delete button in action bar */
    .bdel {
      background:rgba(220,60,40,0.12); border:1px solid rgba(220,60,40,0.3);
      color:#e8604a; font-size:13px; font-family:'DM Sans',sans-serif; font-weight:600;
      padding:9px 18px; border-radius:10px; cursor:pointer;
      transition:all .15s;
      display:flex; align-items:center; gap:7px;
    }
    .bdel:hover { background:rgba(220,60,40,0.22); border-color:rgba(220,60,40,0.5); transform:translateY(-1px); }

    .dl-count {
      background:rgba(255,255,255,0.2); border-radius:99px;
      padding:1px 7px; font-size:12px; font-weight:700;
    }
    .del-count {
      background:rgba(220,60,40,0.25); border-radius:99px;
      padding:1px 7px; font-size:12px; font-weight:700; color:#e8604a;
    }

    /* ── confirm dialog overlay ── */
    .conf-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,0.7);
      backdrop-filter:blur(8px); z-index:700;
      display:flex; align-items:center; justify-content:center;
      padding:1.25rem;
      animation:fadeIn .15s ease;
    }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }

    .conf-box {
      background:#18181c; border:1px solid rgba(255,255,255,0.1);
      border-radius:20px; padding:1.75rem 1.5rem 1.5rem;
      width:100%; max-width:340px;
      box-shadow:0 32px 80px rgba(0,0,0,0.8);
      animation:popIn .18s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes popIn { from{transform:scale(0.9);opacity:0} to{transform:scale(1);opacity:1} }

    .conf-icon { font-size:36px; display:block; text-align:center; margin-bottom:14px; }

    .conf-title {
      font-family:'DM Serif Display',serif; font-size:20px;
      color:#e2e0da; text-align:center; margin:0 0 8px;
    }
    .conf-sub {
      font-size:13px; color:#6e6c66; text-align:center;
      margin:0 0 1.5rem; line-height:1.55;
    }
    .conf-sub strong { color:#c8c6c0; }

    .conf-actions { display:flex; gap:10px; }
    .conf-cancel {
      flex:1; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
      color:#9e9c96; font-size:14px; font-family:'DM Sans',sans-serif; font-weight:500;
      padding:11px; border-radius:12px; cursor:pointer; transition:all .15s;
    }
    .conf-cancel:hover { background:rgba(255,255,255,0.1); color:#e2e0da; }

    .conf-confirm {
      flex:1; background:linear-gradient(135deg,#c0392b,#922b21); border:none;
      color:#fff; font-size:14px; font-family:'DM Sans',sans-serif; font-weight:600;
      padding:11px; border-radius:12px; cursor:pointer;
      transition:all .15s; box-shadow:0 4px 16px rgba(192,57,43,0.4);
    }
    .conf-confirm:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(192,57,43,0.55); }

    /* ── lightbox ── */
    .lbo {
      position:fixed; inset:0; background:rgba(0,0,0,0.96);
      z-index:600; display:flex; align-items:center;
      justify-content:center; flex-direction:column;
      animation:fadeIn .18s ease;
    }

    .lbi {
      max-width:92vw; max-height:78vh; object-fit:contain;
      border-radius:10px; box-shadow:0 30px 100px rgba(0,0,0,0.8);
    }
    .lbnav { display:flex; align-items:center; gap:20px; margin-top:20px; }
    .lbb {
      background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1);
      color:#e2e0da; width:42px; height:42px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; font-size:18px; transition:all .15s;
    }
    .lbb:hover { background:rgba(255,255,255,0.14); }
    .lbb:disabled { opacity:.2; cursor:default; }
    .lbc { font-size:12px; color:#4a4845; min-width:55px; text-align:center; letter-spacing:.5px; }
    .lbclose {
      position:absolute; top:16px; right:16px;
      background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.1);
      color:#e2e0da; width:38px; height:38px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; font-size:16px; transition:all .15s;
    }
    .lbclose:hover { background:rgba(255,255,255,0.14); }
  `;

  return (
    <div className="pr">
      <style>{styles}</style>

      {/* ── Folder tabs ── */}
      <div className="fb">
        {memberNames.map(m => {
          const count = (byMember[m] || []).length;
          const isActive = activeFolder === m;
          const isMe = m === me;
          return (
            <div
              key={m}
              className={`ft ${isActive ? 'active' : ''} ${isMe ? 'mine' : ''}`}
              onClick={() => { setActiveFolder(m); setSelected(new Set()); }}
            >
              <div className="fi">
                {isMe ? '👤' : initials(m)}
                {count > 0 && <span className="fc">{count}</span>}
              </div>
              <span className="fl">{isMe ? 'Mine' : m}</span>
            </div>
          );
        })}
      </div>

      <div className="divider" />

      {/* ── Section header ── */}
      <div className="sh">
        <h2 className="st">
          {isMyFolder ? <>Your <em>shots</em></> : <><em>{activeFolder}</em>'s shots</>}
        </h2>
        <span className="ss">{folderPhotos.length} photo{folderPhotos.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Privacy reassurance ── */}
      <div className="pn">
        <span className="pn-ic">🔒</span>
        <span>
          Your photos are <strong>end-to-end encrypted</strong> and visible only to you and your trip mates — Upload freely.
        </span>
      </div>

      {/* ── Upload zone / View banner ── */}
      {isMyFolder ? (
        <label
          className={`uz ${dragging ? 'drag' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleUpload} />

          {uploading && (
            <div className="upl-overlay">
              <div className="upl-spin" />
              <div className="upl-text">Uploading… {uploadProgress}%</div>
              <div style={{ width: '60%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${uploadProgress}%`, background: '#1D9E75', borderRadius: 4, transition: 'width .3s' }} />
              </div>
            </div>
          )}

          <span className="ui">{dragging ? '🎯' : '📷'}</span>
          <p className="ut">{dragging ? 'Release to upload' : 'Drop photos or tap to pick'}</p>
          <p className="usub">JPG · PNG · HEIC · WebP</p>
          <div className="ubadge">
            <span>👤</span> {me}
          </div>
        </label>
      ) : (
        <div className="vb">
          <div className="vba">{initials(activeFolder)}</div>
          <div className="vbt">
            Viewing <strong>{activeFolder}'s</strong> collection — tap to select, then download.
          </div>
        </div>
      )}

      {/* ── Photo grid ── */}
      {folderPhotos.length === 0 ? (
        <div className="es">
          <span className="ei">{isMyFolder ? '🌄' : '🫙'}</span>
          <p className="etit">{isMyFolder ? 'Your roll is empty' : `${activeFolder} hasn't shared yet`}</p>
          <p className="esub">{isMyFolder ? 'Tap above to add your first memory' : 'Check back soon!'}</p>
        </div>
      ) : (
        <div className="pg">
          {folderPhotos.map((p, idx) => (
            <div
              key={p.id}
              className={`pc ${selected.has(p.id) ? 'sel' : ''}`}
              onClick={() => toggle(p.id)}
            >
              <img src={p.url} alt="" loading="lazy" onError={e => { e.target.style.display = 'none'; }} />

              {/* Checkmark */}
              <div className="pck">{selected.has(p.id) ? '✓' : ''}</div>

              {/* Expand to fullscreen — hover only */}
              <div className="pex" onClick={(e) => { e.stopPropagation(); openLightbox(idx); }}>
                <div className="pexi">⛶</div>
              </div>

              {/* Single-photo delete — my folder only, hover only */}
              {isMyFolder && (
                <button
                  className="pdel"
                  onClick={(e) => askDeleteSingle(p, e)}
                  title="Delete photo"
                >
                  🗑
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Selection action bar — always rendered when selection > 0 ── */}
      {selected.size > 0 && (
        <div className="ab">
          <div className="al">
            <strong>{selected.size}</strong> selected
          </div>
          <button className="bgh" onClick={clearSel}>Clear</button>
          <button className="bpr" onClick={downloadSelected}>
            ⬇ Download
            <span className="dl-count">{selected.size}</span>
          </button>
          {/* Delete selected — only shown in own folder */}
          {isMyFolder && (
            <button className="bdel" onClick={askDeleteBulk}>
              🗑 Delete
              <span className="del-count">{selected.size}</span>
            </button>
          )}
        </div>
      )}

      {/* ── Confirm Delete Dialog ── */}
      {confirmDelete && (
        <div className="conf-overlay" onClick={cancelDelete}>
          <div className="conf-box" onClick={e => e.stopPropagation()}>
            <span className="conf-icon">🗑️</span>
            <h3 className="conf-title">
              {confirmDelete === 'bulk'
                ? `Delete ${selected.size} photo${selected.size > 1 ? 's' : ''}?`
                : 'Delete this photo?'}
            </h3>
            <p className="conf-sub">
              {confirmDelete === 'bulk'
                ? <>This will permanently remove <strong>{selected.size} photo{selected.size > 1 ? 's' : ''}</strong> from your trip. This can't be undone.</>
                : <>This photo will be permanently removed from your trip. This can't be undone.</>
              }
            </p>
            <div className="conf-actions">
              <button className="conf-cancel" onClick={cancelDelete}>Cancel</button>
              <button className="conf-confirm" onClick={confirmDeleteAction}>
                {confirmDelete === 'bulk' ? `Delete ${selected.size}` : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="lbo" onClick={() => setLightbox(null)}>
          <button className="lbclose" onClick={() => setLightbox(null)}>✕</button>
          <img
            className="lbi"
            src={lightbox.photos[lightbox.index]?.url}
            alt=""
            onClick={(e) => e.stopPropagation()}
          />
          <div className="lbnav" onClick={(e) => e.stopPropagation()}>
            <button className="lbb" onClick={lbPrev} disabled={lightbox.index === 0}>‹</button>
            <span className="lbc">{lightbox.index + 1} / {lightbox.photos.length}</span>
            <button className="lbb" onClick={lbNext} disabled={lightbox.index === lightbox.photos.length - 1}>›</button>
          </div>
        </div>
      )}
    </div>
  );
}


export default PhotosPage;
