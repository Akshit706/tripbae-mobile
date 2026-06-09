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
    @keyframes phCardIn   { from{opacity:0;transform:translateY(14px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
    @keyframes phFadeIn   { from{opacity:0} to{opacity:1} }
    @keyframes phPopIn    { from{opacity:0;transform:scale(0.88) translateY(20px)} 60%{transform:scale(1.02)} to{opacity:1;transform:scale(1) translateY(0)} }
    @keyframes phSlideUp  { from{transform:translateY(100%)} to{transform:translateY(0)} }
    @keyframes phSpin     { to{transform:rotate(360deg)} }
    @keyframes phShimmer  { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
    @keyframes phBob      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }

    .ph-root { font-family:'DM Sans',sans-serif; background:#FAF8F4; color:#1C1410; min-height:100vh; padding-bottom:7rem; animation:phPageIn .35s ease both; }

    /* folder tabs */
    .ph-tabs { display:flex; gap:8px; overflow-x:auto; padding:.9rem 1rem; scrollbar-width:none; }
    .ph-tabs::-webkit-scrollbar { display:none; }
    .ph-tab { display:flex; flex-direction:column; align-items:center; gap:5px; cursor:pointer; flex-shrink:0; min-width:60px; }
    .ph-tab-avatar {
      width:56px; height:48px; border-radius:14px; position:relative;
      display:flex; align-items:center; justify-content:center;
      background:#F0EDE8; border:2px solid transparent;
      font-size:13px; font-weight:700; color:${D.muted};
      transition:all .2s;
    }
    .ph-tab:hover .ph-tab-avatar { border-color:rgba(29,158,117,0.3); transform:translateY(-2px); }
    .ph-tab.active .ph-tab-avatar {
      background:linear-gradient(135deg,${D.green},${D.greenDeep});
      border-color:transparent; color:#fff;
      box-shadow:0 5px 18px rgba(29,158,117,0.32);
      transform:translateY(-2px);
    }
    .ph-tab-badge {
      position:absolute; top:-5px; right:-5px;
      background:${D.green}; color:#fff; font-size:8px; font-weight:800;
      min-width:16px; height:16px; border-radius:8px;
      display:flex; align-items:center; justify-content:center;
      padding:0 3px; border:2px solid #FAF8F4;
    }
    .ph-tab-label { font-size:10px; font-weight:600; color:${D.muted}; max-width:62px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transition:color .2s; }
    .ph-tab.active .ph-tab-label { color:${D.green}; font-weight:700; }

    /* upload zone */
    .ph-upload {
      margin:.5rem 1rem 1rem; border-radius:18px; padding:1.75rem 1.25rem;
      text-align:center; cursor:pointer; position:relative; overflow:hidden;
      background:#FFFDF8; border:1.5px dashed rgba(28,20,16,0.14);
      transition:all .25s;
    }
    .ph-upload:hover, .ph-upload.drag { border-color:${D.green}; background:#F0FBF6; }
    .ph-upload-icon { margin-bottom:10px; opacity:.7; animation:phBob 3s ease-in-out infinite; }
    .ph-upload-title { font-size:14px; font-weight:600; color:${D.secondary}; margin-bottom:4px; }
    .ph-upload-sub { font-size:12px; color:${D.muted}; }
    .ph-upload-badge {
      display:inline-flex; align-items:center; gap:5px; margin-top:10px;
      background:${D.sageTint}; border:1px solid rgba(122,158,126,0.3);
      color:${D.sage}; font-size:11px; font-weight:700; border-radius:99px; padding:4px 12px;
    }
    .ph-upload-overlay {
      position:absolute; inset:0; background:rgba(250,248,244,0.88);
      backdrop-filter:blur(4px); display:flex; flex-direction:column;
      align-items:center; justify-content:center; gap:8px; border-radius:16px;
    }
    .ph-spinner { width:28px; height:28px; border:2.5px solid rgba(29,158,117,0.2); border-top-color:${D.green}; border-radius:50%; animation:phSpin .7s linear infinite; }
    .ph-upload-progress-text { font-size:12px; font-weight:700; color:${D.green}; }

    /* viewer banner (others' folder) */
    .ph-viewer-banner {
      margin:.5rem 1rem 1rem; background:${D.surface}; border-radius:16px;
      padding:12px 16px; display:flex; align-items:center; gap:12px;
      border:0.5px solid ${D.border}; box-shadow:0 2px 8px rgba(28,20,16,0.05);
    }
    .ph-viewer-avatar {
      width:38px; height:38px; border-radius:50%;
      background:linear-gradient(135deg,${D.neutral},#E8E4DE);
      display:flex; align-items:center; justify-content:center;
      font-size:13px; font-weight:700; color:${D.secondary}; flex-shrink:0;
    }
    .ph-viewer-text { font-size:13px; color:${D.muted}; line-height:1.5; }
    .ph-viewer-text strong { color:${D.espresso}; }

    /* photo grid */
    .ph-grid {
      display:grid;
      grid-template-columns:repeat(auto-fill,minmax(110px,1fr));
      gap:4px; padding:0 1rem;
    }
    .ph-cell {
      position:relative; border-radius:10px; overflow:hidden;
      aspect-ratio:1; cursor:pointer; background:${D.neutral};
      border:2.5px solid transparent; transition:transform .2s, box-shadow .2s;
    }
    .ph-cell:hover { transform:scale(1.02); box-shadow:0 8px 24px rgba(28,20,16,0.15); }
    .ph-cell.sel { border-color:${D.green}; box-shadow:0 0 0 2px rgba(29,158,117,0.25); }
    .ph-cell img { width:100%; height:100%; object-fit:cover; display:block; transition:filter .2s; }
    .ph-cell:hover img { filter:brightness(.88); }
    .ph-check {
      position:absolute; top:6px; right:6px; width:20px; height:20px; border-radius:50%;
      background:rgba(255,255,255,0.75); border:1.5px solid rgba(28,20,16,0.18);
      display:flex; align-items:center; justify-content:center; z-index:3;
      transition:all .15s; backdrop-filter:blur(2px);
    }
    .ph-cell.sel .ph-check { background:${D.green}; border-color:${D.green}; }
    .ph-expand {
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      opacity:0; transition:opacity .2s; pointer-events:none; z-index:2;
    }
    .ph-cell:hover .ph-expand { opacity:1; pointer-events:all; }
    .ph-expand-btn {
      background:rgba(255,255,255,0.82); backdrop-filter:blur(6px);
      border-radius:50%; width:34px; height:34px;
      display:flex; align-items:center; justify-content:center;
      border:1px solid rgba(28,20,16,0.1); transition:transform .15s;
      box-shadow:0 2px 8px rgba(0,0,0,0.12);
    }
    .ph-expand-btn:hover { transform:scale(1.1); }
    .ph-del-btn {
      position:absolute; top:6px; left:6px; width:26px; height:26px; border-radius:50%;
      background:rgba(255,255,255,0.82); border:1px solid rgba(28,20,16,0.1);
      display:flex; align-items:center; justify-content:center; z-index:3;
      opacity:0; cursor:pointer; transition:all .15s; backdrop-filter:blur(4px);
    }
    .ph-cell:hover .ph-del-btn { opacity:1; }
    .ph-del-btn:hover { background:#FAECE7 !important; border-color:rgba(232,113,90,0.4) !important; }

    /* empty state */
    .ph-empty { text-align:center; padding:4rem 1.25rem; color:${D.muted}; }
    .ph-empty-title { font-size:15px; font-weight:700; color:${D.secondary}; margin-bottom:5px; }
    .ph-empty-sub { font-size:13px; color:${D.muted}; }

    /* selection action bar */
    .ph-action-bar {
      position:fixed; bottom:0; left:50%; transform:translateX(-50%);
      width:100%; max-width:880px;
      background:rgba(255,255,255,0.96); backdrop-filter:blur(20px);
      border-top:1px solid rgba(28,20,16,0.08);
      padding:12px 1rem; display:flex; align-items:center; gap:8px; z-index:190;
      animation:phSlideUp .2s ease-out;
    }
    .ph-action-label { flex:1; font-size:13px; color:${D.muted}; }
    .ph-action-label strong { color:${D.espresso}; font-size:14px; }
    .ph-btn-ghost {
      background:${D.neutral}; border:1px solid ${D.border};
      color:${D.secondary}; font-size:13px; font-family:'DM Sans',sans-serif; font-weight:600;
      padding:8px 14px; border-radius:10px; cursor:pointer; transition:all .15s;
    }
    .ph-btn-ghost:hover { background:#EDE9E4; }
    .ph-btn-primary {
      background:linear-gradient(135deg,${D.green},${D.greenDeep}); border:none;
      color:#fff; font-size:13px; font-family:'DM Sans',sans-serif; font-weight:700;
      padding:8px 16px; border-radius:10px; cursor:pointer;
      display:flex; align-items:center; gap:6px;
      box-shadow:0 4px 14px rgba(29,158,117,0.3);
    }
    .ph-btn-primary:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(29,158,117,0.38); }
    .ph-btn-danger {
      background:#FDF0EE; border:1px solid rgba(232,113,90,0.3);
      color:${D.coral}; font-size:13px; font-family:'DM Sans',sans-serif; font-weight:700;
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
      position:fixed; inset:0; background:rgba(28,20,16,0.45);
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
    .ph-conf-title { font-family:'Sora',sans-serif; font-size:17px; font-weight:800; color:${D.espresso}; margin-bottom:8px; text-align:center; }
    .ph-conf-sub { font-size:13px; color:${D.muted}; text-align:center; line-height:1.6; margin-bottom:22px; }
    .ph-conf-sub strong { color:${D.secondary}; }
    .ph-conf-actions { display:flex; gap:10px; }
    .ph-conf-cancel {
      flex:1; background:${D.neutral}; border:1px solid ${D.border};
      color:${D.secondary}; font-size:14px; font-family:'DM Sans',sans-serif; font-weight:600;
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
            {/* gold top band */}
            <div style={{ height: 4, background: `linear-gradient(90deg,${D.green},${D.greenDeep})` }} />
            <div style={{ padding: '1.5rem' }}>
              {/* Icon */}
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
              {/* Feature row */}
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

      {/* ── Folder tabs ── */}
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
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  : <span style={{ fontSize: 13, fontWeight: 700 }}>{initials(m)}</span>
                }
                {count > 0 && <span className="ph-tab-badge">{count}</span>}
              </div>
              <span className="ph-tab-label">{isMe ? 'Mine' : m}</span>
            </div>
          );
        })}
      </div>

      {/* thin divider */}
      <div style={{ height: 1, background: D.divider, margin: '0 1rem .75rem' }} />

      {/* ── Section header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem .75rem' }}>
        <div>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 800, color: D.espresso, lineHeight: 1.2 }}>
            {isMyFolder ? 'Your photos' : `${activeFolder}'s photos`}
          </div>
          <div style={{ fontSize: 11, color: D.muted, marginTop: 2 }}>
            {folderPhotos.length} photo{folderPhotos.length !== 1 ? 's' : ''}
            {totalPhotos > folderPhotos.length && ` · ${totalPhotos} total in trip`}
          </div>
        </div>
        {/* Privacy pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: D.sageTint, border: '1px solid rgba(122,158,126,0.25)', borderRadius: 999, padding: '4px 11px' }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={D.sage} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span style={{ fontSize: 10, fontWeight: 700, color: D.sage }}>Trip-only</span>
        </div>
      </div>

      {/* ── Upload zone or viewer banner ── */}
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
          <div className="ph-upload-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={D.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {dragging
                ? <><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="8" x2="12" y2="16"/></>
                : <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></>
              }
            </svg>
          </div>
          <div className="ph-upload-title">{dragging ? 'Release to upload' : 'Drop photos or tap to pick'}</div>
          <div className="ph-upload-sub">JPG · PNG · HEIC · WebP — uploaded to ImageKit</div>
          <div className="ph-upload-badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {me}
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
                {/* Checkmark */}
                <div className="ph-check">
                  {selected.has(p.id) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                {/* Expand */}
                <div className="ph-expand" onClick={(e) => { e.stopPropagation(); openLightbox(idx); }}>
                  <div className="ph-expand-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={D.secondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
                  </div>
                </div>
                {/* Delete — my folder only */}
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
    for (const photo of toDelete) {
      await deletePhoto(trip.id, photo.id);
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
          {folderPhotos.map((p, idx) => {
            // ImageKit on-the-fly resize for grid thumbnails — much faster to load
            const thumbUrl = p.url && p.url.includes('ik.imagekit.io')
              ? p.url.replace(/(\/[^/?]+)(\?.*)?$/, '/tr:w-300,h-300,q-75,fo-auto$1$2')
              : p.url;
            return (
            <div
              key={p.id}
              className={`pc ${selected.has(p.id) ? 'sel' : ''}`}
              onClick={() => toggle(p.id)}
            >
              <img src={thumbUrl} alt="" loading="lazy" onError={e => { e.target.style.display = 'none'; }} />

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
            );
          })}
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
