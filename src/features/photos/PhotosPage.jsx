import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { addPhoto, deletePhoto, imagekitAuthPhotos, getTrip } from '../../api';
import { normalizeMembers } from '../shared/constants';
import { usePullToRefresh, PullToRefreshSpinner } from '../shared/pullToRefresh';
import lumi13Img from '../../assets/lumi13.png';
import photosImg from '../../assets/photos.png';

/* ── Design tokens ── */
const D = {
  bg: '#FAF8F4', surface: '#FFFFFF', espresso: '#1C1410',
  gold: '#C9913A', goldTint: '#FDF3E3',
  sage: '#7A9E7E', sageTint: '#FFF3EB',
  coral: '#E8715A', coralTint: '#FDF0EE',
  blueTint: '#E6F1FB', neutral: '#F4F2EE',
  muted: '#8A7E76', secondary: '#5C504A',
  divider: 'rgba(28,20,16,0.06)', border: 'rgba(28,20,16,0.08)',
  green: '#FF6A00', greenDeep: '#FF8C3A',
};

/* ── Avatar colour palette (matches app) ── */
const MCOLORS = ['#FF6A00','#D85A30','#BA7517','#7F77DD','#378ADD','#D4537E','#FF8C3A','#993C1D'];
function mcolor(name) {
  const code = Math.abs(Array.from(name || '?').reduce((a, c) => a + c.charCodeAt(0), 0));
  return MCOLORS[code % MCOLORS.length];
}

/* ── Shared ImageKit thumb helper — same URL shape everywhere so the
   browser's HTTP cache is reused (grid thumb === lightbox placeholder). ── */
function ikThumb(url, tr = 'w-300,h-300,q-75,fo-auto') {
  if (!url || !url.includes('ik.imagekit.io')) return url;
  return url.replace(/(\/[^/?]+)(\?.*)?$/, `/tr:${tr}$1$2`);
}

/* ── Downscale on-device before upload — raw phone photos (often 4-12MB
   HEIC/JPEG) take a long time to upload over cellular; nothing in this app
   ever displays more than ~1200px anyway (see lbUrl below), so shrinking to
   1600px on the long edge cuts the upload payload by 80-95% with no visible
   quality loss, and is what actually makes "upload from gallery" feel fast. */
async function resizeImageForUpload(file, maxDim = 1600, quality = 0.85) {
  if (!file.type?.startsWith('image/') || file.size < 400 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) { bitmap.close?.(); return file; }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
  } catch {
    return file; // format the browser can't decode (rare HEIC cases) — upload as-is
  }
}

/* ── Inject CSS ── */
if (typeof document !== 'undefined' && !document.getElementById('photos-v2-styles')) {
  const el = document.createElement('style');
  el.id = 'photos-v2-styles';
  el.textContent = `
    @keyframes phPageIn   { from{opacity:0;transform:translateY(8px)} to{opacity:1} }
    @keyframes phFadeIn   { from{opacity:0} to{opacity:1} }
    @keyframes phPopIn    { from{opacity:0;transform:scale(0.9) translateY(16px)} 60%{transform:scale(1.02)} to{opacity:1;transform:scale(1) translateY(0)} }
    @keyframes phSpin     { to{transform:rotate(360deg)} }
    @keyframes phPulse    { 0%,100%{opacity:.7} 50%{opacity:1} }
    @keyframes phHeroGlow { 0%,100%{box-shadow:0 4px 32px rgba(255,106,0,0.22)} 50%{box-shadow:0 16px 56px rgba(255,140,59,0.42)} }
    @keyframes phHeroScan {
      0%   { transform:translateX(-100%); opacity:0; }
      8%   { opacity:1; }
      92%  { opacity:1; }
      100% { transform:translateX(220%); opacity:0; }
    }
    @keyframes phOrbDrift { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-12px) scale(1.06)} }
    @keyframes phRingPulse {
      0%,100% { box-shadow:0 0 0 0 rgba(255,106,0,0.55); }
      50%     { box-shadow:0 0 0 7px rgba(255,106,0,0); }
    }
    @keyframes phCellIn   { from{opacity:0;transform:scale(0.93)} to{opacity:1;transform:scale(1)} }
    @keyframes phTabIn    { from{opacity:0;transform:translateY(10px) scale(0.86)} to{opacity:1;transform:translateY(0) scale(1)} }

    .ph-root {
      font-family:'DM Sans',sans-serif; background:#FAF8F4; color:#1C1410;
      min-height:100vh; padding-bottom:8rem; animation:phPageIn .3s ease both;
    }

    /* ── Hero card ── */
    .ph-hero {
      position:relative; border-radius:22px; overflow:hidden;
      background-color:#1a0d00;
      margin:0 1rem 0;
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
      background:linear-gradient(to bottom,rgba(0,0,0,0.22) 0%,rgba(0,0,0,0.62) 48%,rgba(0,0,0,0.74) 100%);
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
      font-size:9px; font-weight:700; color:rgba(255,255,255,0.82);
      text-transform:uppercase; letter-spacing:2.4px;
      margin-bottom:6px; text-shadow:0 1px 6px rgba(0,0,0,0.4);
    }
    .ph-hero-name {
      font-family:'Sora',sans-serif; font-size:20px; font-weight:800; color:#fff;
      line-height:1.15; letter-spacing:-0.4px; margin-bottom:3px;
      text-shadow:0 1px 14px rgba(0,0,0,0.65), 0 2px 4px rgba(0,0,0,0.4);
    }
    .ph-hero-dest {
      font-size:11px; color:rgba(255,255,255,0.85); margin-bottom:10px;
      display:flex; align-items:center; gap:4px; justify-content:center;
      text-shadow:0 1px 6px rgba(0,0,0,0.45);
    }
    .ph-hero-stats {
      display:flex; align-items:center; gap:10px; margin-bottom:0; flex-wrap:nowrap;
      justify-content:center;
    }
    .ph-hero-stat-item {
      display:flex; align-items:center; gap:4px;
    }
    .ph-hero-stat-num { font-family:'Sora',sans-serif; font-size:12px; font-weight:700; color:#fff; text-shadow:0 1px 6px rgba(0,0,0,0.45); }
    .ph-hero-stat-lbl { font-size:11px; color:rgba(255,255,255,0.75); text-shadow:0 1px 4px rgba(0,0,0,0.4); }
    .ph-hero-stat-div { width:1px; height:12px; background:rgba(255,255,255,0.18); flex-shrink:0; }

    .ph-privacy-note {
      display:flex; align-items:center; justify-content:center; gap:5px;
      margin-top:10px; padding-top:9px;
      border-top:1px solid rgba(255,255,255,0.25);
    }
    .ph-privacy-note svg { flex-shrink:0; display:block; }
    .ph-privacy-note-text {
      font-size:10.5px; font-weight:600; color:rgba(255,255,255,0.80);
      letter-spacing:0.15px; line-height:1.4; text-shadow:0 1px 5px rgba(0,0,0,0.4);
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
      border-color:#FF6A00;
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
      background:#FF6A00; color:#fff; font-size:8px; font-weight:800;
      min-width:16px; height:16px; border-radius:8px;
      display:flex; align-items:center; justify-content:center;
      padding:0 3px; border:2px solid #FAF8F4;
    }
    .ph-tab-label { font-size:10.5px; font-weight:600; color:#8A7E76; white-space:nowrap; transition:color .2s; }
    .ph-tab.active .ph-tab-label { color:#FF6A00; font-weight:700; }

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
      border-color:#FF6A00; background:#FFF8F4;
    }
    .ph-upload-full { cursor:not-allowed; opacity:0.72; }
    .ph-upload-full:hover, .ph-upload-full.drag { border-color:rgba(28,20,16,0.13) !important; background:#fff !important; }
    .ph-upload-inner {
      display:flex; align-items:center; gap:14px;
      padding:14px 16px;
    }
    .ph-upload-left {
      width:44px; height:44px; border-radius:13px; flex-shrink:0;
      background:linear-gradient(135deg,#FF6A00,#D85A30);
      display:flex; align-items:center; justify-content:center;
      box-shadow:0 4px 12px rgba(255,106,0,0.28);
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
    .ph-spinner { width:26px; height:26px; border:2.5px solid rgba(255,106,0,0.18); border-top-color:#FF6A00; border-radius:50%; animation:phSpin .65s linear infinite; }
    .ph-upload-prog-text { font-size:12px; font-weight:700; color:#FF6A00; }

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
      border:2px solid transparent; transition:opacity .12s, transform .12s;
      -webkit-tap-highlight-color:transparent; touch-action:manipulation;
      /* virtualize off-screen cells so scrolling stays cheap on large albums */
      content-visibility:auto; contain-intrinsic-size:200px 200px; contain:layout paint;
    }
    .ph-cell.sel { border-color:#FF6A00; }
    .ph-cell img { width:100%; height:100%; object-fit:cover; display:block; transition:opacity .3s; }
    .ph-cell:active { transform:scale(0.97); opacity:0.88; }
    .ph-check {
      position:absolute; top:6px; right:6px; width:20px; height:20px; border-radius:50%;
      background:rgba(255,255,255,0.92); border:1.5px solid rgba(28,20,16,0.18);
      display:flex; align-items:center; justify-content:center; z-index:3;
      transition:opacity .12s, background .12s, border-color .12s; opacity:0;
    }
    .ph-cell-selmode .ph-check { opacity:1; }
    .ph-cell.sel .ph-check { opacity:1; background:#FF6A00; border-color:#FF6A00; }
    .ph-cell-selmode .ph-del-btn { display:none; }
    .ph-cell-selmode .ph-expand { display:none; }
    .ph-expand {
      position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
      opacity:0; transition:opacity .15s; pointer-events:none; z-index:2;
    }
    .ph-expand-btn {
      background:rgba(255,255,255,0.94);
      border-radius:50%; width:34px; height:34px;
      display:flex; align-items:center; justify-content:center;
      border:1px solid rgba(28,20,16,0.08); box-shadow:0 2px 8px rgba(0,0,0,0.1);
    }
    .ph-del-btn {
      position:absolute; top:6px; left:6px; width:26px; height:26px; border-radius:50%;
      background:rgba(255,255,255,0.92); border:1px solid rgba(28,20,16,0.1);
      display:flex; align-items:center; justify-content:center; z-index:3;
      opacity:0; cursor:pointer; transition:opacity .12s, background .12s;
    }
    /* Real-hover only (mouse/trackpad) — on touch devices ":hover" fires on
       tap and briefly flashes the delete/expand icon before the lightbox
       opens, since there's no true hover state to clear it. */
    @media (hover:hover) and (pointer:fine) {
      .ph-cell:hover .ph-expand { opacity:1; pointer-events:all; }
      .ph-cell:hover .ph-del-btn { opacity:1; }
      .ph-del-btn:hover { background:#FAECE7 !important; border-color:rgba(232,113,90,0.4) !important; }
    }

    /* empty */
    .ph-empty { text-align:center; padding:3rem 1.25rem 2rem; }
    .ph-empty-title { font-size:15px; font-weight:700; color:#5C504A; margin-bottom:5px; }
    .ph-empty-sub { font-size:12.5px; color:#8A7E76; }

    /* Floating selection toolbar — a small pill anchored bottom-right
       (same spot as the app's other floating action buttons), instead of
       a full-width bar sitting on top of the bottom nav. */
    .ph-float-bar {
      position:fixed;
      bottom:calc(88px + env(safe-area-inset-bottom, 0px));
      right:20px;
      display:flex;
      align-items:center;
      gap:8px;
      background:#FFFFFF;
      border:1px solid rgba(28,20,16,0.10);
      border-radius:999px;
      padding:7px 8px;
      z-index:400;
      animation:phPopIn .2s cubic-bezier(0.34,1.3,0.64,1) both;
      box-shadow:0 10px 32px rgba(28,20,16,0.2), 0 2px 8px rgba(28,20,16,0.08);
    }
    .ph-float-count {
      min-width:20px; height:20px; padding:0 6px; border-radius:999px;
      background:#FF6A00; color:#fff; font-size:11px; font-weight:800;
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    .ph-float-btn {
      width:34px; height:34px; border-radius:50%; border:none; cursor:pointer;
      background:#F4F2EE; display:flex; align-items:center; justify-content:center;
      flex-shrink:0; transition:transform .12s;
    }
    .ph-float-btn:active { transform:scale(0.9); }
    .ph-float-btn-danger { background:#FDF0EE; }
    .ph-float-btn:disabled { cursor:default; }
    .ph-float-spinner {
      width:14px; height:14px; border-radius:50%;
      border:2px solid rgba(255,106,0,0.25); border-top-color:#FF6A00;
      animation:phSpin .7s linear infinite;
    }
    .ph-toast {
      position:fixed; bottom:calc(24px + env(safe-area-inset-bottom, 0px));
      left:50%; transform:translateX(-50%);
      background:#1C1410; color:#fff; font-size:13px; font-weight:600;
      padding:10px 18px; border-radius:22px; z-index:9500;
      box-shadow:0 8px 24px rgba(0,0,0,0.28); animation:phFadeIn .2s ease;
      max-width:80vw; text-align:center;
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
    .ph-conf-confirm {
      flex:1; background:linear-gradient(135deg,#E8715A,#C4513E); border:none;
      color:#fff; font-size:14px; font-family:'DM Sans',sans-serif; font-weight:700;
      padding:11px; border-radius:13px; cursor:pointer;
    }

    /* ── FIX 2: Lightbox — true viewport-locked fullscreen, no scroll ──
       Rendered via createPortal straight into document.body so it can
       never inherit a transformed/scrolling ancestor (which was causing
       the fixed overlay to land at inconsistent vertical offsets). The
       image fills the entire viewport (Apple/Google Photos style). */
    .ph-lbox {
      position:fixed;
      inset:0;
      background:rgba(20,14,10,0.5);
      backdrop-filter:blur(34px) saturate(1.4);
      -webkit-backdrop-filter:blur(34px) saturate(1.4);
      z-index:9000;
      display:flex;
      align-items:center;
      justify-content:center;
      /* no overflow — the image must not cause scroll */
      overflow:hidden;
      touch-action:none;
      animation:phFadeIn .18s ease;
    }
    .ph-lbox-stage {
      position:relative; width:100vw; height:100dvh; flex-shrink:0;
    }
    /* instantly-available blurred stand-in (reuses the already-cached grid
       thumbnail) so the lightbox never shows a blank frame while the
       full-res image is still downloading */
    .ph-lbox-img-ph {
      position:absolute; inset:0; width:100%; height:100%;
      object-fit:contain; filter:blur(20px) brightness(0.82); transform:scale(1.1);
    }
    .ph-lbox-img {
      position:absolute; inset:0; width:100%; height:100%;
      object-fit:contain; opacity:0; transition:opacity .25s ease;
    }
    .ph-lbox-count {
      position:fixed; top:calc(16px + env(safe-area-inset-top,0px)); left:50%;
      transform:translateX(-50%);
      font-size:12px; color:rgba(255,255,255,0.6);
      z-index:9010;
    }
    .ph-lbox-arrow {
      position:fixed; top:50%; transform:translateY(-50%);
      background:linear-gradient(135deg,#FF6A00,#E85A00); border:none;
      box-shadow:0 6px 18px rgba(255,106,0,0.45);
      color:#fff; width:44px; height:44px; border-radius:50%;
      display:flex; align-items:center; justify-content:center; cursor:pointer;
      transition:transform .15s, box-shadow .15s, opacity .15s;
      z-index:9010;
    }
    .ph-lbox-arrow:hover { transform:translateY(-50%) scale(1.06); }
    .ph-lbox-arrow:disabled { opacity:0; pointer-events:none; }
    .ph-lbox-arrow-left { left:12px; }
    .ph-lbox-arrow-right { right:12px; }
    .ph-lbox-close {
      position:fixed; top:calc(14px + env(safe-area-inset-top,0px)); right:14px;
      background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.18);
      color:#fff; width:38px; height:38px; border-radius:50%;
      display:flex; align-items:center; justify-content:center; cursor:pointer;
      transition:background .15s;
      /* ensure it's always on top even if image is tall */
      z-index:9010;
    }
    .ph-lbox-close:hover { background:rgba(255,255,255,0.22); }

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

const PHOTO_CAP = 20;

/* ── Memoized grid cell — with stable callback props (see useCallback
   below), a selection tap only re-renders the cell(s) that actually
   changed instead of the whole album grid. ── */
const PhotoCell = memo(function PhotoCell({ photo, idx, isSelected, selectionMode, isMyFolder, onOpen, onToggle, onDelete }) {
  const thumbUrl = ikThumb(photo.url);
  return (
    <div
      className={`ph-cell ${isSelected ? 'sel' : ''} ${selectionMode ? 'ph-cell-selmode' : ''}`}
      onClick={() => selectionMode ? onToggle(photo.id) : onOpen(idx)}
    >
      <img src={thumbUrl} alt="" loading="lazy" decoding="async"
        style={{ opacity: 0 }}
        onLoad={e => { e.target.style.opacity = 1; }}
        onError={e => { e.target.style.display = 'none'; }} />
      <div className="ph-check">
        {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
      </div>
      <div className="ph-expand" onClick={(e) => { e.stopPropagation(); onOpen(idx); }}>
        <div className="ph-expand-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={D.secondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
        </div>
      </div>
      {isMyFolder && (
        <button className="ph-del-btn" onClick={(e) => onDelete(photo, e)} title="Delete">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={D.coral} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      )}
    </div>
  );
});

function PhotosPage({ trip, myNickname, myAvatar, isActive = true }) {
  const memberNames = useMemo(() => normalizeMembers(trip.members), [trip.members]);
  const me = myNickname || memberNames[0] || 'Me';

  // Backend attaches each member's real profile photo (member.photoUrl) —
  // build a nickname -> photoUrl lookup so teammates show their real photo
  // too, not just initials for everyone except "me".
  const memberPhotos = useMemo(() => {
    const map = {};
    (trip.members || []).forEach(m => {
      if (m && typeof m === 'object' && m.nickname) map[m.nickname] = m.photoUrl || null;
    });
    return map;
  }, [trip.members]);
  const avatarFor = (name) => memberPhotos[name] || (name === me ? myAvatar : null);

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
  const [selectionMode, setSelectionMode] = useState(false);
  const mountedRef = useRef(true);
  const lbTouchStartRef = useRef(null);
  const WELCOME_KEY = `travelbae_photos_welcome_${trip.id}`;
  const [showWelcome, setShowWelcome] = useState(() => {
    try { return !localStorage.getItem(WELCOME_KEY); } catch { return false; }
  });

  // The page now stays mounted across tab switches (kept alive for instant
  // switching), so re-sync from the trip prop whenever it changes upstream.
  useEffect(() => { setAllPhotos(trip.photos || []); }, [trip.photos]);

  const isRefreshing = usePullToRefresh(() => getTrip(trip.id).then(data => {
    const t = data.trip || data;
    setAllPhotos(t.photos || []);
  }), [trip.id]);

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
    const myCount = (byMember[me] || []).length;
    const slots = PHOTO_CAP - myCount;
    if (slots <= 0) return;
    const toUpload = Array.from(files).slice(0, slots);
    if (mountedRef.current) { setUploading(true); setUploadProgress(0); }
    let completed = 0;
    let fileIdx = 0;
    const uploadOne = async () => {
      if (fileIdx >= toUpload.length) return;
      const file = toUpload[fileIdx++];
      let auth;
      try { auth = await imagekitAuthPhotos(); } catch {
        completed++;
        if (mountedRef.current) setUploadProgress(Math.round((completed / toUpload.length) * 100));
        await uploadOne(); return;
      }
      const uploadFile = await resizeImageForUpload(file);
      const safeFile = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${trip.id}_${me}_${Date.now()}_${safeFile}`;
      const form = new FormData();
      form.append('file', uploadFile, fileName);
      form.append('fileName', fileName);
      form.append('folder', `/tb-photos/user/${trip.id}`);
      form.append('useUniqueFileName', 'false');
      form.append('publicKey', auth.publicKey);
      form.append('signature', auth.signature);
      form.append('expire', String(auth.expire));
      form.append('token', auth.token);
      try {
        const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', { method: 'POST', body: form });
        const uploadData = await uploadRes.json();
        if (uploadData.url) {
          const publicUrl = uploadData.url;
          try {
            const res = await addPhoto(trip.id, publicUrl);
            if (mountedRef.current) setAllPhotos(p => [...p, res.photo || { id: Date.now() + Math.random(), url: publicUrl, uploader: me }]);
          } catch {
            if (mountedRef.current) setAllPhotos(p => [...p, { id: Date.now() + Math.random(), url: publicUrl, uploader: me }]);
          }
        }
      } catch (e) { console.error('Upload error:', e.message); }
      completed++;
      if (mountedRef.current) setUploadProgress(Math.round((completed / toUpload.length) * 100));
      await uploadOne();
    };
    await Promise.all(Array.from({ length: Math.min(4, toUpload.length) }, uploadOne));
    if (mountedRef.current) { setUploading(false); setUploadProgress(0); setActiveFolder(me); }
  };

  const handleUpload = (e) => processFiles(Array.from(e.target.files));
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if ((byMember[me] || []).length >= PHOTO_CAP) return;
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) processFiles(files);
  };

  /* ── delete single ── */
  const doDeleteSingle = async (photo) => {
    await deletePhoto(trip.id, photo.id);
    setAllPhotos(p => p.filter(x => x.id !== photo.id));
    setSelected(s => { const n = new Set(s); n.delete(photo.id); return n; });
    setPendingDeletePhoto(null);
    setConfirmDelete(null);
  };

  /* ── delete bulk ── */
  const doDeleteBulk = async () => {
    const toDelete = folderPhotos.filter(p => selected.has(p.id));
    await Promise.all(toDelete.map(photo => deletePhoto(trip.id, photo.id).catch(() => {})));
    const deletedIds = new Set(toDelete.map(p => p.id));
    setAllPhotos(p => p.filter(x => !deletedIds.has(x.id)));
    setSelected(new Set());
    setSelectionMode(false);
    setConfirmDelete(null);
  };

  const askDeleteSingle = useCallback((photo, e) => { e.stopPropagation(); setPendingDeletePhoto(photo); setConfirmDelete('single'); }, []);
  const askDeleteBulk = () => setConfirmDelete('bulk');
  const cancelDelete = () => { setConfirmDelete(null); setPendingDeletePhoto(null); };
  const confirmDeleteAction = () => {
    if (confirmDelete === 'single' && pendingDeletePhoto) doDeleteSingle(pendingDeletePhoto);
    else if (confirmDelete === 'bulk') doDeleteBulk();
  };

  const toggle = useCallback((id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);
  const clearSel = () => { setSelected(new Set()); setSelectionMode(false); };

  /* ── download selected ──
     Blob+<a download> never fires in the Android/iOS WebView, and routing
     through the OS share sheet makes the user manually pick "Save image"
     for each file. @capacitor-community/media's savePhoto() writes straight
     into a device photo album (native MediaStore/Photos call — no share
     sheet, no extra storage permissions needed since it only touches the
     app's own album) and accepts the ImageKit URL directly, so there's no
     manual fetch/base64 step either. */
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState('');
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200); };
  const downloadSelected = async () => {
    const photos = folderPhotos.filter(p => selected.has(p.id));
    if (!photos.length || downloading) return;
    setDownloading(true);
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        const { Media } = await import('@capacitor-community/media');
        let albumId;
        try {
          const { albums } = await Media.getAlbums();
          albumId = albums.find(a => a.name === 'TripBae')?.identifier;
          if (!albumId) {
            await Media.createAlbum({ name: 'TripBae' });
            albumId = (await Media.getAlbums()).albums.find(a => a.name === 'TripBae')?.identifier;
          }
        } catch { /* fall through and let savePhoto use/create a default album */ }
        let saved = 0;
        for (const p of photos) {
          try {
            await Media.savePhoto({ path: p.url, albumIdentifier: albumId, fileName: `tripbae-${p.id}` });
            saved++;
          } catch { /* skip this one, keep going */ }
        }
        showToast(saved
          ? `Saved ${saved > 1 ? `${saved} photos` : 'photo'} to Photos`
          : 'Could not save photos');
      } else {
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
      }
    } finally {
      setDownloading(false);
    }
  };

  const openLightbox = useCallback((idx) => setLightbox({ photos: folderPhotos, index: idx }), [folderPhotos]);
  const lbPrev = () => setLightbox(l => ({ ...l, index: Math.max(0, l.index - 1) }));
  const lbNext = () => setLightbox(l => ({ ...l, index: Math.min(l.photos.length - 1, l.index + 1) }));

  const handleLbTouchStart = (e) => { lbTouchStartRef.current = e.touches[0].clientX; };
  const handleLbTouchEnd = (e) => {
    if (lbTouchStartRef.current === null) return;
    const dx = e.changedTouches[0].clientX - lbTouchStartRef.current;
    lbTouchStartRef.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && lightbox.index < lightbox.photos.length - 1) lbNext();
    else if (dx > 0 && lightbox.index > 0) lbPrev();
  };

  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  /* FIX 2: Lock scroll on BOTH html and body when lightbox is open.
     This prevents any residual scroll offset from shifting the fixed overlay. */
  useEffect(() => {
    if (!lightbox) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyPos = document.body.style.position;
    const scrollY = window.scrollY;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    // On iOS Safari, overflow:hidden alone isn't enough — fix the body in place
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.position = prevBodyPos;
      document.body.style.top = '';
      document.body.style.width = '';
      // Restore scroll position after iOS Safari body-fix
      window.scrollTo(0, scrollY);
    };
  }, [lightbox]);

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
  const myPhotoCount = (byMember[me] || []).length;
  const atCap = myPhotoCount >= PHOTO_CAP;
  const lbUrl = (url) => {
    if (!url || !url.includes('ik.imagekit.io')) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}tr=w-1200,h-1200,fo-auto,q-82`;
  };

  // Prefetch the neighbouring full-res images so swiping/arrow-tapping in
  // the lightbox feels instant instead of waiting on a fresh network fetch.
  useEffect(() => {
    if (!lightbox) return;
    const { photos, index } = lightbox;
    [index - 1, index + 1].forEach(i => {
      const url = photos[i]?.url;
      if (url) { const img = new Image(); img.src = lbUrl(url); }
    });
  }, [lightbox]);

  const heroBgUrl = useMemo(() => {
    if (!allPhotos.length) return null;
    const seed = Math.abs(Array.from(trip.id || 'x').reduce((a, c) => a + c.charCodeAt(0), 0));
    const photo = allPhotos[seed % allPhotos.length];
    if (!photo?.url) return null;
    if (!photo.url.includes('ik.imagekit.io')) return photo.url;
    const sep = photo.url.includes('?') ? '&' : '?';
    return photo.url + sep + 'tr=w-700,h-260,fo-auto,q-65';
  }, [allPhotos, trip.id]);

  return (
    <div className="ph-root">
      <PullToRefreshSpinner active={isRefreshing} />

      {/* ── Welcome popup ── */}
      {showWelcome && (
        <div className="ph-welcome-overlay" onClick={dismissWelcome}>
          <div className="ph-welcome-box" onClick={e => e.stopPropagation()}>
            <div style={{ height: 4, background: 'linear-gradient(90deg,#FF6A00,#FF8C3B,#FF6A00)' }} />
            <button onClick={dismissWelcome} style={{ position:'absolute', top:14, right:14, width:28, height:28, borderRadius:'50%', border:'none', background:'#F3F4F6', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', padding:0, zIndex:1 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div style={{ padding:'1.2rem 1.25rem 0.5rem' }}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'#FFF3EB', borderRadius:999, padding:'3px 9px', marginBottom:8 }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:'#FF6A00' }} />
                <span style={{ fontSize:9.5, fontWeight:700, color:'#FF6A00', letterSpacing:.8, textTransform:'uppercase', fontFamily:"'DM Sans',sans-serif" }}>Lumi says</span>
              </div>
              <div style={{ fontFamily:"'Sora',sans-serif", fontSize:15, fontWeight:800, color:'#1C1410', lineHeight:1.25, marginBottom:7 }}>
                Your trip's shared album
              </div>
              <div style={{ fontSize:12, color:'#5C504A', lineHeight:1.62 }}>
                Everyone's snapping — but who's actually saving them? Drop your shots here and the whole group gets instant access. No cloud chaos, no "please send" texts.
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', padding:'0.5rem 1rem 0.75rem', gap:8 }}>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                {['Private album', 'Member folders'].map((f, i) => (
                  <div key={i} style={{ padding:'9px 8px', borderRadius:10, border:'1.5px solid rgba(255,106,0,0.3)', background:'#FFF8F4', textAlign:'center', minHeight:42, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize:10.5, color:'#1C1410', lineHeight:1.3, fontWeight:700 }}>{f}</span>
                  </div>
                ))}
              </div>
              <div style={{ width:88, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <img src={lumi13Img} alt="Lumi" style={{ height:106, width:'auto', objectFit:'contain', display:'block' }} />
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                {['One-tap download', 'Group access only'].map((f, i) => (
                  <div key={i} style={{ padding:'9px 8px', borderRadius:10, border:'1.5px solid rgba(255,106,0,0.3)', background:'#FFF8F4', textAlign:'center', minHeight:42, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize:10.5, color:'#1C1410', lineHeight:1.3, fontWeight:700 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding:'0 1.25rem 1.25rem' }}>
              <button onClick={dismissWelcome} style={{ width:'100%', padding:'13px', fontSize:14, fontWeight:700, borderRadius:14, border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", background:'linear-gradient(135deg,#FF6A00,#FF8C3B)', color:'#fff', boxShadow:'0 4px 16px rgba(255,106,0,0.3)' }}>
                Got it, let's shoot 📸
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero card ── */}
      <div className="ph-hero">
        <div style={{ position:'absolute', inset:0, backgroundImage:`url(${photosImg})`, backgroundSize:'cover', backgroundPosition:'center', filter:'brightness(1.28) saturate(1.1)' }} />
        {heroBgUrl && <img className="ph-hero-bg" src={heroBgUrl} alt="" />}
        <div className="ph-hero-dot-grid" />
        <div className="ph-hero-overlay" />
        <div className="ph-hero-scan" />
        <div style={{ position:'absolute', bottom:-50, right:-20, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,106,0,0.32) 0%,transparent 62%)', pointerEvents:'none', zIndex:3, animation:'phOrbDrift 9s ease-in-out infinite' }} />
        <div style={{ position:'absolute', top:-30, left:-20, width:130, height:130, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,180,60,0.18) 0%,transparent 65%)', pointerEvents:'none', zIndex:3, animation:'phOrbDrift 12s ease-in-out infinite 3s' }} />
        <div className="ph-hero-deco-c1" />
        <button onClick={() => setShowWelcome(true)} title="About Photos" style={{ position:'absolute', top:10, right:10, width:26, height:26, borderRadius:'50%', border:'none', background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10, padding:0 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </button>
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span className="ph-privacy-note-text">End-to-end encrypted · Visible only to your trip group</span>
          </div>
          <div className="ph-privacy-note" style={{ marginTop:6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            <span className="ph-privacy-note-text">Photos are deleted 3 days after your trip ends</span>
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
          const avatarUrl = avatarFor(m);
          return (
            <div key={m} className={`ph-tab ${isActive ? 'active' : ''}`}
              onClick={() => { setActiveFolder(m); setSelected(new Set()); }}>
              <div className="ph-tab-ring">
                <div className="ph-tab-av" style={{ background: avatarUrl ? 'transparent' : color }}>
                  {avatarUrl
                    ? <img src={avatarUrl} alt={m} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
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
          {folderPhotos.length > 0 && (
            <button
              onClick={() => { setSelectionMode(s => !s); setSelected(new Set()); }}
              style={selectionMode
                ? { background: 'rgba(255,106,0,0.1)', color: '#FF6A00', border: '1.5px solid rgba(255,106,0,0.28)', borderRadius: 12, padding: '9px 18px', fontSize: 13.5, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', flexShrink: 0 }
                : { background: '#FF6A00', color: '#fff', border: 'none', borderRadius: 12, padding: '9px 18px', fontSize: 13.5, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: 'pointer', flexShrink: 0, boxShadow: '0 3px 12px rgba(255,106,0,0.3)' }}
            >
              {selectionMode ? 'Done' : 'Select'}
            </button>
          )}
        </div>

        {isMyFolder ? (
          <label
            className={`ph-upload ${dragging && !atCap ? 'drag' : ''} ${atCap ? 'ph-upload-full' : ''}`}
            onDragOver={(e) => { e.preventDefault(); if (!atCap) setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleUpload} disabled={atCap} />
            {uploading && (
              <div className="ph-upload-overlay">
                <div className="ph-spinner" />
                <div className="ph-upload-prog-text">Uploading… {uploadProgress}%</div>
                <div style={{ width: '55%', height: 4, background: 'rgba(28,20,16,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${uploadProgress}%`, background: '#FF6A00', borderRadius: 4, transition: 'width .3s' }} />
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
                <div className="ph-upload-title">{atCap ? 'Storage full (20/20)' : dragging ? 'Release to upload' : 'Upload photos'}</div>
                <div className="ph-upload-sub">{atCap ? 'Delete photos to free up slots' : `${PHOTO_CAP - myPhotoCount} slot${PHOTO_CAP - myPhotoCount !== 1 ? 's' : ''} left · JPG PNG HEIC`}</div>
              </div>
            </div>
          </label>
        ) : (
          <div className="ph-viewer-banner">
            <div className="ph-viewer-av" style={{ background: avatarFor(activeFolder) ? 'transparent' : mcolor(activeFolder) }}>
              {avatarFor(activeFolder)
                ? <img src={avatarFor(activeFolder)} alt={activeFolder} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : initials(activeFolder)
              }
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
          {folderPhotos.map((p, idx) => (
            <PhotoCell
              key={p.id}
              photo={p}
              idx={idx}
              isSelected={selected.has(p.id)}
              selectionMode={selectionMode}
              isMyFolder={isMyFolder}
              onOpen={openLightbox}
              onToggle={toggle}
              onDelete={askDeleteSingle}
            />
          ))}
        </div>
      )}

      {/* ── Selection toolbar — floating pill, bottom-right, icon-only ── */}
      {isActive && selected.size > 0 && createPortal(
        <div className="ph-float-bar">
          <span className="ph-float-count">{selected.size}</span>
          <button className="ph-float-btn" onClick={clearSel} title="Clear selection">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5C504A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <button className="ph-float-btn" onClick={downloadSelected} disabled={downloading} title="Download selected">
            {downloading
              ? <span className="ph-float-spinner" />
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            }
          </button>
          {isMyFolder && (
            <button className="ph-float-btn ph-float-btn-danger" onClick={askDeleteBulk} title="Delete selected">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E8715A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          )}
        </div>,
        document.body
      )}

      {/* ── Toast (download result) ── */}
      {isActive && toast && createPortal(
        <div className="ph-toast">{toast}</div>,
        document.body
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

      {/* ── Lightbox — viewport-locked, scroll-proof — portaled to <body> so it
             always positions against the true viewport, never a transformed/
             scrolling ancestor ── */}
      {isActive && lightbox && createPortal(
        <div
          className="ph-lbox"
          onClick={() => setLightbox(null)}
          onTouchStart={handleLbTouchStart}
          onTouchEnd={handleLbTouchEnd}
        >
          <button className="ph-lbox-close" onClick={() => setLightbox(null)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <span className="ph-lbox-count">{lightbox.index + 1} / {lightbox.photos.length}</span>
          <button
            className="ph-lbox-arrow ph-lbox-arrow-left"
            onClick={(e) => { e.stopPropagation(); lbPrev(); }}
            disabled={lightbox.index === 0}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="ph-lbox-stage" onClick={(e) => e.stopPropagation()}>
            <img
              key={`ph-${lightbox.index}`}
              className="ph-lbox-img-ph"
              src={ikThumb(lightbox.photos[lightbox.index]?.url)}
              alt=""
            />
            <img
              key={`full-${lightbox.index}`}
              className="ph-lbox-img"
              src={lbUrl(lightbox.photos[lightbox.index]?.url)}
              alt=""
              onLoad={e => { e.target.style.opacity = 1; }}
            />
          </div>
          <button
            className="ph-lbox-arrow ph-lbox-arrow-right"
            onClick={(e) => { e.stopPropagation(); lbNext(); }}
            disabled={lightbox.index === lightbox.photos.length - 1}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

export default PhotosPage;