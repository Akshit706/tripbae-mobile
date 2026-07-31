import { memo } from 'react';
import { mcolor, nickName } from './constants';
import { S } from './styles';

function _Avatar({ name, size = 26 }) {
  const display = nickName(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: mcolor(display),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: Math.round(size * .38), fontWeight: 700,
      flexShrink: 0, fontFamily: "'Sora',sans-serif"
    }}>
      {display.slice(0, 2).toUpperCase()}
    </div>
  );
}
export const Avatar = memo(_Avatar);

function _SoloAvatar({ initials, size = 26 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg,#7F77DD,#534AB7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: Math.round(size * .38), fontWeight: 700,
      flexShrink: 0, fontFamily: "'Sora',sans-serif"
    }}>
      {(initials || 'ME').slice(0, 2).toUpperCase()}
    </div>
  );
}
export const SoloAvatar = memo(_SoloAvatar);

function _Spinner({ text, solo }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
      <div style={solo ? S.soloSpinner : S.spinner} />
      <p style={{ fontSize: 14, color: '#6b6b68' }}>{text || 'Loading…'}</p>
    </div>
  );
}
export const Spinner = memo(_Spinner);

function _CatIcon({ id, size = 18, color, style: extraStyle }) {
  const s = { width: size, height: size, display: 'block', flexShrink: 0, ...extraStyle };
  const c = color || 'currentColor';
  const p = { viewBox: '0 0 24 24', fill: 'none', stroke: c, strokeWidth: '1.7', strokeLinecap: 'round', strokeLinejoin: 'round', style: s };
  switch (id) {
    case 'food': return <svg {...p}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Z"/><path d="M21 15v7"/></svg>;
    case 'transport': return <svg {...p}><path d="M5 11 7.5 5h9L19 11"/><rect x="2" y="11" width="20" height="7" rx="1.5"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M3 14h18"/></svg>;
    case 'stay': return <svg {...p}><path d="M3 12 12 4l9 8"/><path d="M5 10.5V20a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1V10.5"/></svg>;
    case 'activity': return <svg {...p}><polygon points="12,2 15.1,8.3 22,9.3 17,14.1 18.2,21 12,17.8 5.8,21 7,14.1 2,9.3 8.9,8.3"/></svg>;
    case 'shopping': return <svg {...p}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
    default: return <svg {...p}><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5" fill={c} stroke="none"/></svg>;
  }
}
export const CatIcon = memo(_CatIcon);

function _Stars({ n, rating }) {
  return (
    <span>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < n ? '#BA7517' : '#D3D1C7', fontSize: 11 }}>★</span>
      ))}
      <span style={{ fontSize: 11, color: '#6b6b68', marginLeft: 4 }}>{rating}</span>
    </span>
  );
}
export const Stars = memo(_Stars);

export function ConfirmDialog({ title, message, confirmLabel, confirmStyle, onConfirm, onCancel }) {
  return (
    <div className="tb-sheet-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="tb-modal-pop" style={{ background: '#fff', borderRadius: 18, padding: '1.75rem', maxWidth: 340, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center' }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
          {confirmStyle === 'danger'
            ? <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#993C1D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            : <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#FF8C3A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="9,12 12,15 16,9"/></svg>}
        </div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#6b6b68', lineHeight: 1.6, marginBottom: 22 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ ...S.btn, flex: 1, justifyContent: 'center', padding: '11px' }} onClick={onCancel}>Cancel</button>
          <button
            style={{ ...S.btn, flex: 1, justifyContent: 'center', padding: '11px', fontWeight: 600,
              ...(confirmStyle === 'danger' ? S.btnDanger : S.btnP),
              background: confirmStyle === 'danger' ? '#993C1D' : undefined,
              color: confirmStyle === 'danger' ? '#fff' : undefined }}
            onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
