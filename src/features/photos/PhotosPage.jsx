import { useState, useRef, useEffect, useMemo } from 'react';
import { addPhoto, deletePhoto, imagekitAuth } from '../../api';
import { normalizeMembers } from '../shared/constants';
import lumi13Img from '../../assets/lumi13.png';

/* ── Design tokens ── */
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

/* ── Avatar colour palette (matches app) ── */
const MCOLORS = ['#1D9E75','#D85A30','#BA7517','#7F77DD','#378ADD','#D4537E','#0F6E56','#993C1D'];
function mcolor(name) {
  const code = Math.abs(Array.from(name || '?').reduce((a, c) => a + c.charCodeAt(0), 0));
  return MCOLORS[code % MCOLORS.length];
}

/* ── Inject CSS ── */
if (typeof document !== 'undefined' && !document.getElementById('photos-v2-styles')) {
  const el = document.createElement('style');
  el.id = 'photos-v2-styles';
  el.textContent = `
    @keyframes phPageIn   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes phFadeIn   { from{opacity:0} to{opacity:1} }
    @keyframes phPopIn    { from{opacity:0;transform:scale(0.9) translateY(16px)} 60%{transform:scale(1.02)} to{opacity:1;transform:scale(1) translateY(0)} }
    @keyframes phSlideUp  { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
    @keyframes phSpin     { to{transform:rotate(360deg)} }
    @keyframes phPulse    { 0%,100%{opacity:.7} 50%{opacity:1} }
    @keyframes phHeroGlow { 0%,100%{box-shadow:0 4px 32px rgba(15,110,86,0.22)} 50%{box-shadow:0 16px 56px rgba(29,158,117,0.42)} }
    @keyframes phHeroScan {
      0%   { transform:translateX(-100%); opacity:0; }
      8%   { opacity:1; }
      92%  { opacity:1; }
      100% { transform:translateX(220%); opacity:0; }
    }
    @keyframes phRingPulse {
      0%,100% { box-shadow:0 0 0 0 rgba(29,158,117,0.55); }
      50%     { box-shadow:0 0 0 7px rgba(29,158,117,0); }
    }
    @keyframes phCellIn   { from{opacity:0;transform:scale(0.93)} to{opacity:1;transform:scale(1)} }
    @keyframes phTabIn    { from{opacity:0;transform:translateY(10px) scale(0.86)} to{opacity:1;transform:translateY(0) scale(1)} }

    .ph-root {
      font-family:'DM Sans',sans-serif; background:#FAF8F4; color:#1C1410;
      min-height:100vh; padding-bottom:8rem; animation:phPageIn .3s ease both;
    }

    /* ── Hero card (compact, left-aligned like day planner) ── */
    .ph-hero {
      position:relative; border-radius:22px; overflow:hidden;
      background:linear-gradient(160deg,#081510 0%,#0A2C1A 40%,#0F6E56 100%);
      margin:1rem 1rem 0;
      animation:phHeroGlow 5s ease-in-out infinite;
    }
    .ph-hero-bg {
      position:absolute; inset:0; width:100%; height:100%;
      object-fit:cover; opacity:0.28;
      transform:scale(1.06); transition:opacity .8s ease;
    }
    .ph-hero-dot-grid {
      position:absolute; inset:0;
      background-image:radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px);
      background-size:20px 20px; pointer-events:none; z-index:1;
    }
    .ph-hero-overlay {
      position:absolute; inset:0;
      background:linear-gradient(165deg,rgba(6,16,11,0.88) 0%,rgba(8,30,18,0.64) 55%,rgba(15,80,50,0.44) 100%);
      z-index:2;
    }
    .ph-hero-scan {
      position:absolute; top:0; bottom:0; width:55%;
      background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.055) 50%,transparent 100%);
      z-index:3; pointer-events:none;
      animation:phHeroScan 9s ease-in-out infinite 2.5s;
    }
    .ph-hero-deco-c1 {
      position:absolute; top:-30px; right:-20px; width:120px; height:120px;
      border-radius:50%; background:rgba(255,255,255,0.04); z-index:3; pointer-events:none;
    }
    .ph-hero-content {
      position:relative; z-index:4; padding:1.15rem 1.15rem 1.05rem;
      text-align:center;
    }
    .ph-hero-eyebrow {
      font-size:9px; font-weight:700; color:rgba(255,255,255,0.38);
      text-transform:uppercase; letter-spacing:2.4px;
      margin-bottom:6px;
    }
    .ph-hero-name {
      font-family:'Sora',sans-serif; font-size:20px; font-weight:800; color:#fff;
      line-height:1.15; letter-spacing:-0.4px; margin-bottom:3px;
    }
    .ph-hero-dest {
      font-size:11px; color:rgba(255,255,255,0.48); margin-bottom:10px;
      display:flex; align-items:center; gap:4px; justify-content:center;
    }
    /* inline stats row */
    .ph-hero-stats {
      display:flex; align-items:center; gap:10px; margin-bottom:0; flex-wrap:nowrap;
      justify-content:center;
    }
    .ph-hero-stat-item {
      display:flex; align-items:center; gap:4px;
    }
    .ph-hero-stat-num { font-family:'Sora',sans-serif; font-size:12px; font-weight:700; color:#fff; }
    .ph-hero-stat-lbl { font-size:11px; color:rgba(255,255,255,0.48); }
    .ph-hero-stat-div { width:1px; height:12px; background:rgba(255,255,255,0.18); flex-shrink:0; }

    /* privacy note — inside hero, below stats */
    .ph-privacy-note {
      display:flex; align-items:center; justify-content:center; gap:5px;
      margin-top:10px; padding-top:9px;
      border-top:1px solid rgba(255,255,255,0.12);
    }
    .ph-privacy-note svg { flex-shrink:0; display:block; }
    .ph-privacy-note-text {
      font-size:10.5px; font-weight:600; color:rgba(255,255,255,0.55);
      letter-spacing:0.15px; line-height:1.4;
    }

    /* ── member tabs ── */
    .ph-tabs {
      display:flex; gap:10px; overflow-x:auto; padding:.9rem 1rem .8rem;
      scrollbar-width:none; background:#FAF8F4;
      border-bottom:1px solid rgba(28,20,16,0.07);
    }
    .ph-tabs::-webkit-scrollbar { display:none; }

    .ph-tab {
      display:flex; flex-direction:column; align-items:center; gap:5px;
      flex-shrink:0; cursor:pointer; min-width:62px;
    }
    .ph-tab-ring {
      width:52px; height:52px; border-radius:50%; position:relative;
      border:2.5px solid transparent; transition:all .2s;
      flex-shrink:0;
    }
    .ph-tab.active .ph-tab-ring {
      border-color:#1D9E75;
      animation:phRingPulse 2.2s ease-in-out infinite;
    }
    .ph-tab-av {
      width:100%; height:100%; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
      font-family:'Sora',sans-serif; font-size:16px; font-weight:800; color:#fff;
      overflow:hidden;
    }
    .ph-tab-av img { width:100%; height:100%; object-fit:cover; }
    .ph-tab-badge {
      position:absolute; bottom:-2px; right:-2px;
      background:#1D9E75; color:#fff; font-size:8px; font-weight:800;
      min-width:16px; height:16px; border-radius:8px;
      display:flex; align-items:center; justify-content:center;
      padding:0 3px; border:2px solid #FAF8F4;
    }
    .ph-tab-label { font-size:10.5px; font-weight:600; color:#8A7E76; white-space:nowrap; transition:color .2s; }
    .ph-tab.active .ph-tab-label { color:#0F6E56; font-weight:700; }

    /* ── folder content ── */
    .ph-folder-wrap { padding:.85rem 1rem 0; }
    .ph-folder-header {
      display:flex; align-items:center; justify-content:space-between;
      margin-bottom:.8rem;
    }
    .ph-folder-name { font-family:'Sora',sans-serif; font-size:16px; font-weight:800; color:#1C1410; }
    .ph-folder-count { font-size:11px; color:#8A7E76; margin-top:2px; }

    /* upload card */
    .ph-upload {
      display:block; width:100%; border-radius:16px; overflow:hidden;
      background:#fff; border:1.5px dashed rgba(28,20,16,0.13);
      cursor:pointer; position:relative;
      transition:border-color .2s, background .2s;
      box-shadow:0 2px 10px rgba(28,20,16,0.05);
      margin-bottom:1rem;
    }
    .ph-upload:hover, .ph-upload.drag {
      border-color:#1D9E75; background:#F4FBF8;
    }
    .ph-upload-inner {
      display:flex; align-items:center; gap:14px;
      padding:14px 16px;
    }
    .ph-upload-left {
      width:44px; height:44px; border-radius:13px; flex-shrink:0;
      background:linear-gradient(135deg,#1D9E75,#0F6E56);
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 4px 12px rgba(29,158,117,0.28);
    }
    .ph-upload-right { flex:1; min-width:0; }
    .ph-upload-title { font-size:13.5px; font-weight:700; color:#1C1410; margin-bottom:2px; }
    .ph-upload-sub { font-size:11px; color:#8A7E76; }
    .ph-upload-arrow {
      width:32px; height:32px; border-radius:50%;
      background:#F4F2EE; display:flex; align-items:center; justify-content:center;
      flex-shrink:0;
    }
    .ph-upload-overlay {
      position:absolute; inset:0; background:rgba(250,248,244,0.92);
      backdrop-filter:blur(4px); display:flex; flex-direction:column;
      align-items:center; justify-content:center; gap:8px;
    }
    .ph-spinner { width:26px; height:26px; border:2.5px solid rgba(29,158,117,0.18); border-top-color:#1D9E75; border-radius:50%; animation:phSpin .65s linear infinite; }
    .ph-upload-prog-text { font-size:12px; font-weight:700; color:#1D9E75; }

    /* viewer banner */
    .ph-viewer-banner {
      background:#fff; border-radius:16px;
      padding:12px 14px; display:flex; align-items:center; gap:12px;
      border:1px solid rgba(28,20,16,0.08);
      box-shadow:0 2px 8px rgba(28,20,16,0.05); margin-bottom:1rem;
    }
    .ph-viewer-av {
      width:40px; height:40px; border-radius:50%; flex-shrink:0;
      display:flex; align-items:center; justify-content:center;
      font-family:'Sora',sans-serif; font-size:15px; font-weight:800; color:#fff;
      border:2px solid rgba(255,255,255,0.5);
    }
    .ph-viewer-text { font-size:13px; color:#8A7E76; line-height:1.5; }
    .ph-viewer-text strong { color:#1C1410; }

    /* ── photo grid ── */
    .ph-grid {
      display:grid; grid-template-columns:repeat(3,1fr); gap:2px; padding:0;
    }
    .ph-cell {
      position:relative; overflow:hidden;
      aspect-ratio:1; cursor:pointer; background:#EDE9E4;
      border:2px solid transparent; transition:opacity .15s;
    }
    .ph-cell.sel { border-color:#1D9E75; }
    .ph-cell img { width:100%; height:100%; object-fit:cover; display:block; transition:filter .15s; }
    .ph-cell:hover img { filter:brightness(.85); }
    .ph-check {
      position:absolute; top:6px; right:6px; width:20px; height:20px; border-radius:50%;
      background:rgba(255,255,255,0.82); border:1.5px solid rgba(28,20,16,0.18);
      display:flex; align-items:center; justify-content:center; z-index:3;
      transition:all .15s; backdrop-filter:blur(3px);
    }
    .ph-cell.sel .ph-check { background:#1D9E75; border-color:#1D9E75; }
    .ph-expand {
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      opacity:0; transition:opacity .15s; pointer-events:none; z-index:2;
    }
    .ph-cell:hover .ph-expand { opacity:1; pointer-events:all; }
    .ph-expand-btn {
      background:rgba(255,255,255,0.9); backdrop-filter:blur(6px);
      border-radius:50%; width:34px; height:34px;
      display:flex; align-items:center; justify-content:center;
      border:1px solid rgba(28,20,16,0.08); box-shadow:0 2px 8px rgba(0,0,0,0.1);
    }
    .ph-del-btn {
      position:absolute; top:6px; left:6px; width:26px; height:26px; border-radius:50%;
      background:rgba(255,255,255,0.88); border:1px solid rgba(28,20,16,0.1);
      display:flex; align-items:center; justify-content:center; z-index:3;
      opacity:0; cursor:pointer; transition:all .15s; backdrop-filter:blur(4px);
    }
    .ph-cell:hover .ph-del-btn { opacity:1; }
    .ph-del-btn:hover { background:#FAECE7 !important; border-color:rgba(232,113,90,0.4) !important; }

    /* empty */
    .ph-empty { text-align:center; padding:3rem 1.25rem 2rem; }
    .ph-empty-title { font-size:15px; font-weight:700; color:#5C504A; margin-bottom:5px; }
    .ph-empty-sub { font-size:12.5px; color:#8A7E76; }

    /* action bar */
    .ph-action-bar {
      position:fixed; bottom:0; left:50%; transform:translateX(-50%);
      width:100%; max-width:880px;
      background:rgba(255,255,255,0.97); backdrop-filter:blur(20px);
      border-top:1px solid rgba(28,20,16,0.08);
      padding:12px 1rem; display:flex; align-items:center; gap:8px; z-index:190;
      animation:phSlideUp .2s ease both;
    }
    .ph-action-label { flex:1; font-size:13px; color:#8A7E76; }
    .ph-action-label strong { color:#1C1410; font-size:14px; }
    .ph-btn-ghost {
      background:#F4F2EE; border:1px solid rgba(28,20,16,0.1);
      color:#5C504A; font-size:13px; font-family:'DM Sans',sans-serif; font-weight:600;
      padding:8px 14px; border-radius:10px; cursor:pointer;
    }
    .ph-btn-primary {
      background:linear-gradient(135deg,#1D9E75,#0F6E56); border:none;
      color:#fff; font-size:13px; font-family:'DM Sans',sans-serif; font-weight:700;
      padding:8px 16px; border-radius:10px; cursor:pointer;
      display:flex; align-items:center; gap:6px;
      box-shadow:0 4px 14px rgba(29,158,117,0.3);
    }
    .ph-btn-danger {
      background:#FDF0EE; border:1px solid rgba(232,113,90,0.3);
      color:#E8715A; font-size:13px; font-family:'DM Sans',sans-serif; font-weight:700;
      padding:8px 16px; border-radius:10px; cursor:pointer;
      display:flex; align-items:center; gap:6px;
    }
    .ph-count-badge { background:rgba(255,255,255,0.28); border-radius:99px; padding:1px 7px; font-size:12px; font-weight:800; }
    .ph-del-badge { background:rgba(232,113,90,0.25); border-radius:99px; padding:1px 7px; font-size:12px; font-weight:800; }

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
    .ph-conf-confirm {
      flex:1; background:linear-gradient(135deg,#E8715A,#C4513E); border:none;
      color:#fff; font-size:14px; font-family:'DM Sans',sans-serif; font-weight:700;
      padding:11px; border-radius:13px; cursor:pointer;
    }

    /* lightbox */
    .ph-lbox {
      position:fixed; inset:0; background:rgba(10,8,6,0.96);
      z-index:600; display:flex; align-items:center; justify-content:center; flex-direction:column;
      animation:phFadeIn .18s ease;
    }
    .ph-lbox-img { max-width:92vw; max-height:78vh; object-fit:contain; border-radius:10px; box-shadow:0 24px 80px rgba(0,0,0,0.7); }
    .ph-lbox-nav { display:flex; align-items:center; gap:18px; margin-top:18px; }
    .ph-lbox-btn {
      background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15);
      color:#fff; width:40px; height:40px; border-radius:50%;
      display:flex; align-items:center; justify-content:center; cursor:pointer;
    }
    .ph-lbox-btn:hover { background:rgba(255,255,255,0.18); }
    .ph-lbox-btn:disabled { opacity:.2; cursor:default; }
    .ph-lbox-count { font-size:12px; color:rgba(255,255,255,0.45); min-width:52px; text-align:center; }
    .ph-lbox-close {
      position:absolute; top:14px; right:14px;
      background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15);
      color:#fff; width:36px; height:36px; border-radius:50%;
      display:flex; align-items:center; justify-content:center; cursor:pointer;
    }

    /* welcome popup */
    .ph-welcome-overlay {
      position:fixed; inset:0; background:rgba(28,20,16,0.52);
      backdrop-filter:blur(5px); z-index:800;
      display:flex; align-items:center; justify-content:center; padding:1.5rem;
      animation:phFadeIn .22s ease both;
    }
    .ph-welcome-box {
      background:#fff; border-radius:24px; overflow:hidden;
      width:100%; max-width:400px; position:relative;
      box-shadow:0 28px 80px rgba(28,20,16,0.25);
      animation:phPopIn .45s cubic-bezier(0.34,1.3,0.64,1) both;
    }
  `;
  document.head.appendChild(el);
}

function PhotosPage({ trip, myNickname, myAvatar }) {
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

  const initials = (name) => (name || '?').slice(0, 2).toUpperCase();
  const totalPhotos = allPhotos.length;

  /* ── pick one photo as hero background ── */
  const heroBgUrl = useMemo(() => {
    if (!allPhotos.length) return null;
    const seed = Math.abs(Array.from(trip.id || 'x').reduce((a, c) => a + c.charCodeAt(0), 0));
    const photo = allPhotos[seed % allPhotos.length];
    if (!photo?.url) return null;
    if (!photo.url.includes('ik.imagekit.io')) return photo.url;
    // IK real-time transformation: resize + quality
    const sep = photo.url.includes('?') ? '&' : '?';
    return photo.url + sep + 'tr=w-700,h-260,fo-auto,q-65';
  }, [allPhotos, trip.id]);

  return (
    <div className="ph-root">

      {/* ── Welcome popup ── */}
      {showWelcome && (
        <div className="ph-welcome-overlay" onClick={dismissWelcome}>
          <div className="ph-welcome-box" onClick={e => e.stopPropagation()}>
            {/* Orange top strip */}
            <div style={{ height: 4, background: 'linear-gradient(90deg,#FF6A00,#FF8C3B,#FF6A00)' }} />
            {/* X close */}
            <button onClick={dismissWelcome} style={{ position:'absolute', top:14, right:14, width:28, height:28, borderRadius:'50%', border:'none', background:'#F3F4F6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, zIndex:1 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            {/* Side-by-side: Lumi + text */}
            <div style={{ display:'flex', alignItems:'center', padding:'1.25rem 1.25rem 1rem', gap:14 }}>
              <div style={{ width:92, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <img src={lumi13Img} alt="Lumi" style={{ width:86, height:116, objectFit:'contain', display:'block' }} />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'#FFF3EB', borderRadius:999, padding:'3px 9px', marginBottom:8 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:'#FF6A00' }} />
                  <span style={{ fontSize:9.5, fontWeight:700, color:'#FF6A00', letterSpacing:.8, textTransform:'uppercase', fontFamily:"'DM Sans',sans-serif" }}>Lumi says</span>
                </div>
                <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, color:'#1C1410', lineHeight:1.25, marginBottom:7 }}>
                  Your trip's shared album
                </div>
                <div style={{ fontSize:12, color:'#5C504A', lineHeight:1.62, marginBottom:10 }}>
                  Everyone's snapping — but who's actually saving them? Drop your shots here and the whole group gets instant access. No cloud chaos, no "please send" texts.
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {[
                    'Private album — only your trip group sees it',
                    'Each member gets their own folder to browse',
                    'One tap to select and download any photo',
                  ].map((f, i) => (
                    <div key={i} style={{ display:'flex', gap:6, alignItems:'flex-start' }}>
                      <div style={{ width:15, height:15, borderRadius:4, background:'#FFF3EB', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                        <svg width="8" height="8" viewBox="0 0 12 10" fill="none"><polyline points="1,5 4,8 11,1" stroke="#FF6A00" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <span style={{ fontSize:11.5, color:'#5C504A', lineHeight:1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* CTA */}
            <div style={{ padding:'0 1.25rem 1.25rem' }}>
              <button onClick={dismissWelcome} style={{ width:'100%', padding:'13px', fontSize:14, fontWeight:700, borderRadius:14, border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", background:'linear-gradient(135deg,#FF6A00,#FF8C3B)', color:'#fff', boxShadow:'0 4px 16px rgba(255,106,0,0.3)' }}>
                Got it, let's shoot 📸
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero card (compact, left-aligned) ── */}
      <div className="ph-hero">
        {heroBgUrl && <img className="ph-hero-bg" src={heroBgUrl} alt="" />}
        <div className="ph-hero-dot-grid" />
        <div className="ph-hero-overlay" />
        <div className="ph-hero-scan" />
        <div className="ph-hero-deco-c1" />
        <div className="ph-hero-content">
          <div className="ph-hero-eyebrow">✦ TRIP ALBUM ✦</div>
          <div className="ph-hero-name">{trip.groupName || trip.destination || 'Our Memories'}</div>
          {trip.destination && trip.groupName && (
            <div className="ph-hero-dest">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {trip.destination}
            </div>
          )}
          <div className="ph-hero-stats">
            <div className="ph-hero-stat-item">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              <span className="ph-hero-stat-num">{totalPhotos}</span>
              <span className="ph-hero-stat-lbl">{totalPhotos === 1 ? 'photo' : 'photos'}</span>
            </div>
            <div className="ph-hero-stat-div" />
            <div className="ph-hero-stat-item">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span className="ph-hero-stat-num">{memberNames.length}</span>
              <span className="ph-hero-stat-lbl">{memberNames.length === 1 ? 'member' : 'members'}</span>
            </div>
          </div>
          <div className="ph-privacy-note">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#5BE3B0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span className="ph-privacy-note-text">End-to-end encrypted · Visible only to your trip group</span>
          </div>
        </div>
      </div>

      {/* ── Member folder tabs ── */}
      <div className="ph-tabs">
        {memberNames.map(m => {
          const count = (byMember[m] || []).length;
          const isActive = activeFolder === m;
          const isMe = m === me;
          const color = mcolor(m);
          return (
            <div key={m} className={`ph-tab ${isActive ? 'active' : ''}`}
              onClick={() => { setActiveFolder(m); setSelected(new Set()); }}>
              <div className="ph-tab-ring">
                <div className="ph-tab-av" style={{ background: isMe && myAvatar ? 'transparent' : color }}>
                  {isMe && myAvatar
                    ? <img src={myAvatar} alt={m} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : initials(m)
                  }
                </div>
                {count > 0 && <span className="ph-tab-badge">{count}</span>}
              </div>
              <span className="ph-tab-label">{isMe ? 'You' : m}</span>
            </div>
          );
        })}
      </div>

      {/* ── Folder content ── */}
      <div className="ph-folder-wrap">
        <div className="ph-folder-header">
          <div>
            <div className="ph-folder-name">{isMyFolder ? 'Your photos' : `${activeFolder}'s photos`}</div>
            <div className="ph-folder-count">
              {folderPhotos.length} photo{folderPhotos.length !== 1 ? 's' : ''}
              {totalPhotos > folderPhotos.length && ` · ${totalPhotos} total`}
            </div>
          </div>
        </div>

        {/* Upload card (my folder) or viewer banner (others) */}
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
                <div className="ph-upload-prog-text">Uploading… {uploadProgress}%</div>
                <div style={{ width: '55%', height: 4, background: 'rgba(28,20,16,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${uploadProgress}%`, background: D.green, borderRadius: 4, transition: 'width .3s' }} />
                </div>
              </div>
            )}
            <div className="ph-upload-inner">
              <div className="ph-upload-left">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div className="ph-upload-right">
                <div className="ph-upload-title">{dragging ? 'Release to upload' : 'Upload photos'}</div>
                <div className="ph-upload-sub">Tap to pick · drag and drop · JPG PNG HEIC</div>
              </div>
            </div>
          </label>
        ) : (
          <div className="ph-viewer-banner">
            <div className="ph-viewer-av" style={{ background: mcolor(activeFolder) }}>
              {initials(activeFolder)}
            </div>
            <div className="ph-viewer-text">
              Viewing <strong>{activeFolder}'s</strong> photos — tap to select, then download.
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
