import { useState, useRef, useEffect, useMemo } from 'react';
import { addPhoto, deletePhoto, imagekitAuth } from '../../api';
import { normalizeMembers } from '../shared/constants';
import { S } from '../shared/styles';
import { Avatar } from '../shared/ui';

/* ── Design tokens — match app theme ── */
const D = {
  bg: '#FAF8F4', surface: '#FFFFFF', espresso: '#1C1410',
  gold: '#C9913A', goldTint: '#FDF3E3',
  sage: '#7A9E7E', sageTint: '#EBF3EC',
  coral: '#E8715A', coralTint: '#FDF0EE',
  blueTint: '#E6F1FB', neutral: '#F4F2EE',
  muted: '#8A7E76', secondary: '#5C504A',
  divider: 'rgba(28,20,16,0.06)', border: 'rgba(28,20,16,0.08)',
  green: '#1D9E75', greenDeep: '#0F6E56',
};

/* ── Inject CSS ── */
if (typeof document !== 'undefined' && !document.getElementById('photos-v2-styles')) {
  const el = document.createElement('style');
  el.id = 'photos-v2-styles';
  el.textContent = `
    @keyframes phPageIn   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes phFadeIn   { from{opacity:0} to{opacity:1} }
    @keyframes phPopIn    { from{opacity:0;transform:scale(0.9) translateY(16px)} 60%{transform:scale(1.02)} to{opacity:1;transform:scale(1) translateY(0)} }
    @keyframes phSlideUp  { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes phSpin     { to{transform:rotate(360deg)} }
    @keyframes phBob      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }

    .ph-root {
      font-family:'DM Sans',sans-serif; background:#FAF8F4; color:#1C1410;
      min-height:100vh; padding-bottom:8rem; animation:phPageIn .3s ease both;
    }

    /* ── Album header hero ── */
    .ph-hero {
      background:linear-gradient(160deg,#FFFFFF 0%,#F5F2EC 100%);
      border-bottom:1px solid rgba(28,20,16,0.07);
      padding:1rem 1rem .85rem;
    }
    .ph-hero-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:.6rem; }
    .ph-hero-title {
      display:flex; align-items:center; gap:9px;
    }
    .ph-hero-icon {
      width:36px; height:36px; border-radius:11px;
      background:linear-gradient(135deg,#1D9E75,#0F6E56);
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 4px 12px rgba(29,158,117,0.28); flex-shrink:0;
    }
    .ph-hero-name { font-family:'Sora',sans-serif; font-size:17px; font-weight:800; color:#1C1410; line-height:1.1; }
    .ph-hero-sub { font-size:11px; color:#8A7E76; margin-top:1px; }
    .ph-hero-count {
      font-family:'Sora',sans-serif; font-size:22px; font-weight:800; color:#1C1410; line-height:1;
      text-align:right;
    }
    .ph-hero-count span { display:block; font-family:'DM Sans',sans-serif; font-size:10px; font-weight:500; color:#8A7E76; margin-top:1px; text-align:right; }

    /* encryption / privacy box */
    .ph-enc-box {
      display:flex; align-items:center; gap:10px;
      background:#EBF3EC; border:1px solid rgba(122,158,126,0.3);
      border-radius:12px; padding:9px 13px; margin-top:.75rem;
    }
    .ph-enc-icon {
      width:32px; height:32px; border-radius:9px;
      background:#fff; border:1px solid rgba(122,158,126,0.25);
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    .ph-enc-text { flex:1; }
    .ph-enc-label { font-size:12px; font-weight:700; color:#166534; line-height:1.2; }
    .ph-enc-desc { font-size:11px; color:#5C504A; margin-top:2px; line-height:1.4; }

    /* ── member tabs ── */
    .ph-tabs {
      display:flex; gap:8px; overflow-x:auto; padding:.85rem 1rem .75rem;
      scrollbar-width:none; background:#FAF8F4;
      border-bottom:1px solid rgba(28,20,16,0.06);
    }
    .ph-tabs::-webkit-scrollbar { display:none; }
    .ph-tab {
      display:flex; align-items:center; gap:7px; flex-shrink:0; cursor:pointer;
      padding:7px 13px 7px 8px;
      background:#F0EDE8; border:1.5px solid transparent; border-radius:99px;
      transition:all .2s;
    }
    .ph-tab:hover { background:#E8E4DE; }
    .ph-tab.active {
      background:linear-gradient(135deg,#E6FFF4,#EBF3EC);
      border-color:rgba(29,158,117,0.35);
    }
    .ph-tab-avatar {
      width:28px; height:28px; border-radius:50%; position:relative;
      background:#D8D4CE;
      display:flex; align-items:center; justify-content:center;
      font-size:11px; font-weight:800; color:#5C504A;
      flex-shrink:0; overflow:visible;
    }
    .ph-tab.active .ph-tab-avatar { background:linear-gradient(135deg,#1D9E75,#0F6E56); color:#fff; }
    .ph-tab-badge {
      position:absolute; top:-4px; right:-4px;
      background:#1D9E75; color:#fff; font-size:8px; font-weight:800;
      min-width:15px; height:15px; border-radius:8px;
      display:flex; align-items:center; justify-content:center;
      padding:0 3px; border:1.5px solid #FAF8F4;
    }
    .ph-tab-label { font-size:12px; font-weight:600; color:#5C504A; white-space:nowrap; }
    .ph-tab.active .ph-tab-label { color:#0F6E56; font-weight:700; }

    /* ── folder content area ── */
    .ph-folder-wrap { padding:.9rem 1rem 0; }

    /* folder headline */
    .ph-folder-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:.75rem; }
    .ph-folder-name { font-family:'Sora',sans-serif; font-size:15px; font-weight:800; color:#1C1410; }
    .ph-folder-count { font-size:11.5px; color:#8A7E76; margin-top:1px; }

    /* upload card */
    .ph-upload {
      display:block; width:100%; border-radius:18px; overflow:hidden;
      background:#FFFFFF; border:1.5px dashed rgba(28,20,16,0.13);
      cursor:pointer; text-align:center; position:relative;
      transition:border-color .25s, background .25s;
      box-shadow:0 2px 12px rgba(28,20,16,0.05);
      margin-bottom:1rem;
    }
    .ph-upload:hover, .ph-upload.drag {
      border-color:#1D9E75; background:#F4FBF8;
    }
    .ph-upload-inner { padding:1.75rem 1.25rem 1.5rem; }
    .ph-upload-icon { margin-bottom:10px; animation:phBob 3.5s ease-in-out infinite; display:inline-block; }
    .ph-upload-cta {
      display:inline-flex; align-items:center; gap:7px;
      background:linear-gradient(135deg,#1D9E75,#0F6E56);
      color:#fff; font-size:13px; font-weight:700; font-family:'DM Sans',sans-serif;
      border-radius:99px; padding:9px 20px; margin-bottom:8px;
      box-shadow:0 4px 14px rgba(29,158,117,0.3);
    }
    .ph-upload-sub { font-size:11.5px; color:#8A7E76; }
    .ph-upload-who {
      display:inline-flex; align-items:center; gap:5px; margin-top:8px;
      background:#EBF3EC; border:1px solid rgba(122,158,126,0.3);
      color:#166534; font-size:11px; font-weight:700; border-radius:99px; padding:4px 12px;
    }
    .ph-upload-overlay {
      position:absolute; inset:0; background:rgba(250,248,244,0.9);
      backdrop-filter:blur(3px); display:flex; flex-direction:column;
      align-items:center; justify-content:center; gap:9px; border-radius:16px;
    }
    .ph-spinner { width:28px; height:28px; border:2.5px solid rgba(29,158,117,0.2); border-top-color:#1D9E75; border-radius:50%; animation:phSpin .65s linear infinite; }
    .ph-upload-progress-text { font-size:12px; font-weight:700; color:#1D9E75; }

    /* viewer banner */
    .ph-viewer-banner {
      background:#FFFFFF; border-radius:16px;
      padding:12px 15px; display:flex; align-items:center; gap:12px;
      border:1px solid rgba(28,20,16,0.08); box-shadow:0 2px 8px rgba(28,20,16,0.05);
      margin-bottom:1rem;
    }
    .ph-viewer-avatar {
      width:38px; height:38px; border-radius:50%;
      background:linear-gradient(135deg,#F4F2EE,#E8E4DE);
      display:flex; align-items:center; justify-content:center;
      font-size:13px; font-weight:700; color:#5C504A; flex-shrink:0;
      border:1.5px solid rgba(28,20,16,0.08);
    }
    .ph-viewer-text { font-size:13px; color:#8A7E76; line-height:1.5; }
    .ph-viewer-text strong { color:#1C1410; }

    /* ── photo grid ── */
    .ph-grid {
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:3px; padding:0;
    }
    .ph-cell {
      position:relative; overflow:hidden;
      aspect-ratio:1; cursor:pointer; background:#F4F2EE;
      border:2px solid transparent; transition:opacity .18s;
    }
    .ph-cell.sel { border-color:#1D9E75; }
    .ph-cell img { width:100%; height:100%; object-fit:cover; display:block; }
    .ph-cell:hover img { filter:brightness(.88); }
    .ph-check {
      position:absolute; top:6px; right:6px; width:20px; height:20px; border-radius:50%;
      background:rgba(255,255,255,0.8); border:1.5px solid rgba(28,20,16,0.2);
      display:flex; align-items:center; justify-content:center; z-index:3;
      transition:all .15s; backdrop-filter:blur(3px);
    }
    .ph-cell.sel .ph-check { background:#1D9E75; border-color:#1D9E75; }
    .ph-expand {
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      opacity:0; transition:opacity .18s; pointer-events:none; z-index:2;
    }
    .ph-cell:hover .ph-expand { opacity:1; pointer-events:all; }
    .ph-expand-btn {
      background:rgba(255,255,255,0.88); backdrop-filter:blur(6px);
      border-radius:50%; width:34px; height:34px;
      display:flex; align-items:center; justify-content:center;
      border:1px solid rgba(28,20,16,0.1); transition:transform .15s;
      box-shadow:0 2px 8px rgba(0,0,0,0.1);
    }
    .ph-expand-btn:hover { transform:scale(1.08); }
    .ph-del-btn {
      position:absolute; top:6px; left:6px; width:26px; height:26px; border-radius:50%;
      background:rgba(255,255,255,0.88); border:1px solid rgba(28,20,16,0.1);
      display:flex; align-items:center; justify-content:center; z-index:3;
      opacity:0; cursor:pointer; transition:all .15s; backdrop-filter:blur(4px);
    }
    .ph-cell:hover .ph-del-btn { opacity:1; }
    .ph-del-btn:hover { background:#FAECE7 !important; border-color:rgba(232,113,90,0.4) !important; }

    /* empty state */
    .ph-empty { text-align:center; padding:3.5rem 1.25rem 2rem; }
    .ph-empty-title { font-size:15px; font-weight:700; color:#5C504A; margin-bottom:5px; }
    .ph-empty-sub { font-size:13px; color:#8A7E76; }

    /* selection action bar */
    .ph-action-bar {
      position:fixed; bottom:0; left:50%; transform:translateX(-50%);
      width:100%; max-width:880px;
      background:rgba(255,255,255,0.97); backdrop-filter:blur(20px);
      border-top:1px solid rgba(28,20,16,0.08);
      padding:12px 1rem; display:flex; align-items:center; gap:8px; z-index:190;
      animation:phSlideUp .22s ease both;
    }
    .ph-action-label { flex:1; font-size:13px; color:#8A7E76; }
    .ph-action-label strong { color:#1C1410; font-size:14px; }
    .ph-btn-ghost {
      background:#F4F2EE; border:1px solid rgba(28,20,16,0.1);
      color:#5C504A; font-size:13px; font-family:'DM Sans',sans-serif; font-weight:600;
      padding:8px 14px; border-radius:10px; cursor:pointer; transition:all .15s;
    }
    .ph-btn-ghost:hover { background:#EDE9E4; }
    .ph-btn-primary {
      background:linear-gradient(135deg,#1D9E75,#0F6E56); border:none;
      color:#fff; font-size:13px; font-family:'DM Sans',sans-serif; font-weight:700;
      padding:8px 16px; border-radius:10px; cursor:pointer;
      display:flex; align-items:center; gap:6px;
      box-shadow:0 4px 14px rgba(29,158,117,0.3);
    }
    .ph-btn-primary:hover { transform:translateY(-1px); }
    .ph-btn-danger {
      background:#FDF0EE; border:1px solid rgba(232,113,90,0.3);
      color:#E8715A; font-size:13px; font-family:'DM Sans',sans-serif; font-weight:700;
      padding:8px 16px; border-radius:10px; cursor:pointer;
      display:flex; align-items:center; gap:6px;
    }
    .ph-btn-danger:hover { background:#FAECE7; border-color:rgba(232,113,90,0.5); }
    .ph-count-badge {
      background:rgba(255,255,255,0.28); border-radius:99px;
      padding:1px 7px; font-size:12px; font-weight:800;
    }
    .ph-del-badge {
      background:rgba(232,113,90,0.25); border-radius:99px;
      padding:1px 7px; font-size:12px; font-weight:800;
    }

    /* confirm dialog */
    .ph-conf-overlay {
      position:fixed; inset:0; background:rgba(28,20,16,0.48);
      backdrop-filter:blur(6px); z-index:700;
      display:flex; align-items:center; justify-content:center; padding:1.5rem;
      animation:phFadeIn .15s ease;
    }
    .ph-conf-box {
      background:#fff; border-radius:22px; padding:1.75rem;
      width:100%; max-width:340px;
      box-shadow:0 24px 80px rgba(28,20,16,0.2);
      animation:phPopIn .3s cubic-bezier(0.34,1.3,0.64,1) both;
    }
    .ph-conf-title { font-family:'Sora',sans-serif; font-size:17px; font-weight:800; color:#1C1410; margin-bottom:8px; text-align:center; }
    .ph-conf-sub { font-size:13px; color:#8A7E76; text-align:center; line-height:1.6; margin-bottom:22px; }
    .ph-conf-sub strong { color:#5C504A; }
    .ph-conf-actions { display:flex; gap:10px; }
    .ph-conf-cancel {
      flex:1; background:#F4F2EE; border:1px solid rgba(28,20,16,0.1);
      color:#5C504A; font-size:14px; font-family:'DM Sans',sans-serif; font-weight:600;
      padding:11px; border-radius:13px; cursor:pointer;
    }
    .ph-conf-cancel:hover { background:#EDE9E4; }
    .ph-conf-confirm {
      flex:1; background:linear-gradient(135deg,#E8715A,#C4513E); border:none;
      color:#fff; font-size:14px; font-family:'DM Sans',sans-serif; font-weight:700;
      padding:11px; border-radius:13px; cursor:pointer;
      box-shadow:0 4px 14px rgba(232,113,90,0.35);
    }

    /* lightbox */
    .ph-lbox {
      position:fixed; inset:0; background:rgba(10,8,6,0.95);
      z-index:600; display:flex; align-items:center; justify-content:center; flex-direction:column;
      animation:phFadeIn .18s ease;
    }
    .ph-lbox-img { max-width:92vw; max-height:78vh; object-fit:contain; border-radius:10px; box-shadow:0 24px 80px rgba(0,0,0,0.7); }
    .ph-lbox-nav { display:flex; align-items:center; gap:18px; margin-top:18px; }
    .ph-lbox-btn {
      background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15);
      color:#fff; width:40px; height:40px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; transition:all .15s;
    }
    .ph-lbox-btn:hover { background:rgba(255,255,255,0.18); }
    .ph-lbox-btn:disabled { opacity:.2; cursor:default; }
    .ph-lbox-count { font-size:12px; color:rgba(255,255,255,0.45); min-width:52px; text-align:center; }
    .ph-lbox-close {
      position:absolute; top:14px; right:14px;
      background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15);
      color:#fff; width:36px; height:36px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      cursor:pointer; transition:all .15s; font-size:14px;
    }
    .ph-lbox-close:hover { background:rgba(255,255,255,0.18); }

    /* welcome popup */
    .ph-welcome-overlay {
      position:fixed; inset:0; background:rgba(28,20,16,0.52);
      backdrop-filter:blur(5px); z-index:800;
      display:flex; align-items:center; justify-content:center; padding:1.5rem;
      animation:phFadeIn .22s ease both;
    }
    .ph-welcome-box {
      background:#fff; border-radius:24px; overflow:hidden;
      width:100%; max-width:360px;
      box-shadow:0 28px 80px rgba(28,20,16,0.25);
      animation:phPopIn .45s cubic-bezier(0.34,1.3,0.64,1) both;
    }
  `;
  document.head.appendChild(el);
}

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
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [pendingDeletePhoto, setPendingDeletePhoto] = useState(null);
  const WELCOME_KEY = `travelbae_photos_welcome_${trip.id}`;
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return !localStorage.getItem(WELCOME_KEY); } catch { return false; }
  });

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

  const dismissWelcome = () => {
    try { localStorage.setItem(WELCOME_KEY, '1'); } catch { /* ignore */ }
    setShowWelcome(false);
  };

  /* ── upload ── */
  const processFiles = async (files) => {
    setUploading(true);
    setUploadProgress(0);
    let auth = null;
    try { auth = await imagekitAuth(); } catch (e) { console.error('IK auth failed', e); setUploading(false); return; }
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeFile = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${trip.id}_${me}_${Date.now()}_${safeFile}`;
      const form = new FormData();
      form.append('file', file);
      form.append('fileName', fileName);
      form.append('folder', `/tb-photos/user/${trip.id}`);
      form.append('useUniqueFileName', 'false');
      form.append('publicKey',  auth.publicKey);
      form.append('signature',  auth.signature);
      form.append('expire',     String(auth.expire));
      form.append('token',      auth.token);
      try {
        const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: form });
        const uploadData = await uploadRes.json();
        if (!uploadData.url) { console.error('IK upload error', uploadData); continue; }
        const publicUrl = uploadData.url;
        try {
          const res = await addPhoto(trip.id, publicUrl);
          setAllPhotos(p => [...p, res.photo || { id: Date.now() + Math.random(), url: publicUrl, uploader: me }]);
        } catch {
          setAllPhotos(p => [...p, { id: Date.now() + Math.random(), url: publicUrl, uploader: me }]);
        }
      } catch (e) { console.error('Upload error:', e.message); }
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
    await deletePhoto(trip.id, photo.id);
    setAllPhotos(p => p.filter(x => x.id !== photo.id));
    setSelected(s => { const n = new Set(s); n.delete(photo.id); return n; });
    setPendingDeletePhoto(null);
    setConfirmDelete(null);
  };

  /* ── delete (bulk) ── */
  const doDeleteBulk = async () => {
    const toDelete = folderPhotos.filter(p => selected.has(p.id));
    for (const photo of toDelete) { await deletePhoto(trip.id, photo.id); }
    const deletedIds = new Set(toDelete.map(p => p.id));
    setAllPhotos(p => p.filter(x => !deletedIds.has(x.id)));
    setSelected(new Set());
    setConfirmDelete(null);
  };

  const askDeleteSingle = (photo, e) => { e.stopPropagation(); setPendingDeletePhoto(photo); setConfirmDelete('single'); };
  const askDeleteBulk = () => setConfirmDelete('bulk');
  const cancelDelete = () => { setConfirmDelete(null); setPendingDeletePhoto(null); };
  const confirmDeleteAction = () => {
    if (confirmDelete === 'single' && pendingDeletePhoto) doDeleteSingle(pendingDeletePhoto);
    else if (confirmDelete === 'bulk') doDeleteBulk();
  };

  const toggle = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => setSelected(new Set());

  /* ── download selected ── */
  const downloadSelected = async () => {
    const photos = folderPhotos.filter(p => selected.has(p.id));
    for (const p of photos) {
      try {
        const res = await fetch(p.url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl; a.download = p.url.split('/').pop() || `photo-${p.id}.jpg`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } catch { window.open(p.url, '_blank'); }
    }
  };

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
  const totalPhotos = allPhotos.length;

  return (
    <div className="ph-root">

      {/* ── Welcome popup ── */}
      {showWelcome && (
        <div className="ph-welcome-overlay" onClick={dismissWelcome}>
          <div className="ph-welcome-box" onClick={e => e.stopPropagation()}>
            <div style={{ height: 4, background: `linear-gradient(90deg,${D.green},${D.greenDeep})` }} />
            <div style={{ padding: '1.5rem' }}>
              <div style={{ width: 52, height: 52, borderRadius: 17, background: `linear-gradient(135deg,${D.green},${D.greenDeep})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 6px 20px rgba(29,158,117,0.3)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: D.espresso, marginBottom: 10, lineHeight: 1.25 }}>
                Your trip's shared album
              </div>
              <div style={{ fontSize: 13.5, color: D.secondary, lineHeight: 1.7, marginBottom: 16 }}>
                Upload your photos here and <strong style={{ color: D.espresso }}>every trip member gets instant access</strong> — no WhatsApp groups, no Drives, no third-party apps needed.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
                {[
                  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={D.green} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, text: 'Photos are private — only your trip group can view them' },
                  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={D.green} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, text: 'Browse by person — each member has their own folder' },
                  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={D.green} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>, text: 'Select and download any photos with one tap' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: D.secondary }}>
                    <div style={{ width: 28, height: 28, borderRadius: 9, background: D.sageTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</div>
                    {item.text}
                  </div>
                ))}
              </div>
              <button
                onClick={dismissWelcome}
                style={{ width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, borderRadius: 14, border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", background: `linear-gradient(135deg,${D.green},${D.greenDeep})`, color: '#fff', boxShadow: '0 4px 16px rgba(29,158,117,0.3)' }}
              >
                Got it, let's upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Album hero header ── */}
      <div className="ph-hero">
        <div className="ph-hero-top">
          <div className="ph-hero-title">
            <div className="ph-hero-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>
            <div>
              <div className="ph-hero-name">Trip Album</div>
              <div className="ph-hero-sub">{memberNames.length} member{memberNames.length !== 1 ? 's' : ''} · shared space</div>
            </div>
          </div>
          {totalPhotos > 0 && (
            <div className="ph-hero-count">
              {totalPhotos}
              <span>{totalPhotos === 1 ? 'photo' : 'photos'}</span>
            </div>
          )}
        </div>

        {/* Encryption / privacy box */}
        <div className="ph-enc-box">
          <div className="ph-enc-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div className="ph-enc-text">
            <div className="ph-enc-label">Private &amp; secure</div>
            <div className="ph-enc-desc">Photos are stored privately — only members of this trip can view or download them.</div>
          </div>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#7A9E7E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
      </div>

      {/* ── Member folder tabs ── */}
      <div className="ph-tabs">
        {memberNames.map(m => {
          const count = (byMember[m] || []).length;
          const isActive = activeFolder === m;
          const isMe = m === me;
          return (
            <div key={m} className={`ph-tab ${isActive ? 'active' : ''}`}
              onClick={() => { setActiveFolder(m); setSelected(new Set()); }}>
              <div className="ph-tab-avatar">
                {isMe
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  : <span>{initials(m)}</span>
                }
                {count > 0 && <span className="ph-tab-badge">{count}</span>}
              </div>
              <span className="ph-tab-label">{isMe ? 'My folder' : m}</span>
            </div>
          );
        })}
      </div>

      {/* ── Folder content ── */}
      <div className="ph-folder-wrap">

        {/* Folder header row */}
        <div className="ph-folder-header">
          <div>
            <div className="ph-folder-name">{isMyFolder ? 'Your photos' : `${activeFolder}'s photos`}</div>
            <div className="ph-folder-count">
              {folderPhotos.length} photo{folderPhotos.length !== 1 ? 's' : ''}
              {totalPhotos > folderPhotos.length && ` · ${totalPhotos} total`}
            </div>
          </div>
        </div>

        {/* Upload zone (my folder) or viewer banner (others) */}
        {isMyFolder ? (
          <label
            className={`ph-upload ${dragging ? 'drag' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleUpload} />
            {uploading && (
              <div className="ph-upload-overlay">
                <div className="ph-spinner" />
                <div className="ph-upload-progress-text">Uploading… {uploadProgress}%</div>
                <div style={{ width: '60%', height: 4, background: 'rgba(28,20,16,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${uploadProgress}%`, background: D.green, borderRadius: 4, transition: 'width .3s' }} />
                </div>
              </div>
            )}
            <div className="ph-upload-inner">
              <div className="ph-upload-icon">
                <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={dragging ? D.green : D.muted} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  {dragging
                    ? <><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="8" x2="12" y2="16"/></>
                    : <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>
                  }
                </svg>
              </div>
              <div className="ph-upload-cta">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                {dragging ? 'Release to upload' : 'Add photos'}
              </div>
              <div className="ph-upload-sub">JPG · PNG · HEIC · WebP</div>
              <div className="ph-upload-who">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {me}
              </div>
            </div>
          </label>
        ) : (
          <div className="ph-viewer-banner">
            <div className="ph-viewer-avatar">{initials(activeFolder)}</div>
            <div className="ph-viewer-text">
              Viewing <strong>{activeFolder}'s</strong> album — tap any photo to select, then download.
            </div>
          </div>
        )}
      </div>

      {/* ── Photo grid ── */}
      {folderPhotos.length === 0 ? (
        <div className="ph-empty">
          <div style={{ width: 64, height: 64, borderRadius: 20, background: D.neutral, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={D.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {isMyFolder
                ? <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>
                : <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>
              }
            </svg>
          </div>
          <div className="ph-empty-title">{isMyFolder ? 'Your roll is empty' : `${activeFolder} hasn't uploaded yet`}</div>
          <div className="ph-empty-sub">{isMyFolder ? 'Tap above to add your first memory' : 'Check back soon!'}</div>
        </div>
      ) : (
        <div className="ph-grid">
          {folderPhotos.map((p, idx) => {
            const thumbUrl = p.url && p.url.includes('ik.imagekit.io')
              ? p.url.replace(/(\/[^/?]+)(\?.*)?$/, '/tr:w-300,h-300,q-75,fo-auto$1$2')
              : p.url;
            return (
              <div key={p.id} className={`ph-cell ${selected.has(p.id) ? 'sel' : ''}`} onClick={() => toggle(p.id)}>
                <img src={thumbUrl} alt="" loading="lazy" onError={e => { e.target.style.display = 'none'; }} />
                <div className="ph-check">
                  {selected.has(p.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <div className="ph-expand" onClick={(e) => { e.stopPropagation(); openLightbox(idx); }}>
                  <div className="ph-expand-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={D.secondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
                  </div>
                </div>
                {isMyFolder && (
                  <button className="ph-del-btn" onClick={(e) => askDeleteSingle(p, e)} title="Delete">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={D.coral} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Selection action bar ── */}
      {selected.size > 0 && (
        <div className="ph-action-bar">
          <div className="ph-action-label"><strong>{selected.size}</strong> selected</div>
          <button className="ph-btn-ghost" onClick={clearSel}>Clear</button>
          <button className="ph-btn-primary" onClick={downloadSelected}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
            <span className="ph-count-badge">{selected.size}</span>
          </button>
          {isMyFolder && (
            <button className="ph-btn-danger" onClick={askDeleteBulk}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
              Delete
              <span className="ph-del-badge">{selected.size}</span>
            </button>
          )}
        </div>
      )}

      {/* ── Confirm Delete Dialog ── */}
      {confirmDelete && (
        <div className="ph-conf-overlay" onClick={cancelDelete}>
          <div className="ph-conf-box" onClick={e => e.stopPropagation()}>
            <div style={{ width: 48, height: 48, borderRadius: 15, background: '#FAECE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={D.coral} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </div>
            <div className="ph-conf-title">
              {confirmDelete === 'bulk' ? `Delete ${selected.size} photo${selected.size > 1 ? 's' : ''}?` : 'Delete this photo?'}
            </div>
            <div className="ph-conf-sub">
              {confirmDelete === 'bulk'
                ? <>Permanently removes <strong>{selected.size} photo{selected.size > 1 ? 's' : ''}</strong> from your trip. This can't be undone.</>
                : <>This photo will be permanently removed from your trip.</>
              }
            </div>
            <div className="ph-conf-actions">
              <button className="ph-conf-cancel" onClick={cancelDelete}>Cancel</button>
              <button className="ph-conf-confirm" onClick={confirmDeleteAction}>
                {confirmDelete === 'bulk' ? `Delete ${selected.size}` : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="ph-lbox" onClick={() => setLightbox(null)}>
          <button className="ph-lbox-close" onClick={() => setLightbox(null)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <img className="ph-lbox-img" src={lightbox.photos[lightbox.index]?.url} alt="" onClick={(e) => e.stopPropagation()} />
          <div className="ph-lbox-nav" onClick={(e) => e.stopPropagation()}>
            <button className="ph-lbox-btn" onClick={lbPrev} disabled={lightbox.index === 0}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="ph-lbox-count">{lightbox.index + 1} / {lightbox.photos.length}</span>
            <button className="ph-lbox-btn" onClick={lbNext} disabled={lightbox.index === lightbox.photos.length - 1}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PhotosPage;
