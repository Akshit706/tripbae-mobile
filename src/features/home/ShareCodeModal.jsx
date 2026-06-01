import { useState } from 'react';
import { S } from '../shared/styles';

function ShareCodeModal({ trip, onDismiss }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(trip.shareCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const isSolo = trip.isSolo;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '2rem 1.75rem', maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{trip.emoji}</div>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{isSolo ? 'Adventure Ready! 🎒' : 'Trip Created! 🎉'}</div>
        <div style={{ fontSize: 13, color: '#6b6b68', marginBottom: 24, lineHeight: 1.6 }}>
          {isSolo
            ? <>Your solo trip <strong>{trip.groupName}</strong> is set up. Jump in and start tracking your journey.</>
            : <>Share this code with your friends so they can join <strong>{trip.groupName}</strong></>}
        </div>
        {!isSolo && (
          <>
            <div style={{ background: '#EEEDFE', border: '0.5px solid #AFA9EC', borderRadius: 14, padding: '18px', marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: '#534AB7', fontWeight: 600, letterSpacing: .4, textTransform: 'uppercase', marginBottom: 8 }}>Your Share Code</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 700, color: '#26215C', letterSpacing: 3 }}>{trip.shareCode}</div>
            </div>
            <button style={{ ...S.btn, ...(copied ? { background: '#E1F5EE', color: '#0F6E56', border: '0.5px solid #9FE1CB' } : S.btnP), width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, borderRadius: 12, marginBottom: 10 }} onClick={copy}>
              {copied ? '✓ Copied!' : '📋 Copy Code'}
            </button>
          </>
        )}
        <button style={{ ...S.btn, width: '100%', justifyContent: 'center', padding: '10px', fontSize: 14, borderRadius: 12 }} onClick={onDismiss}>
          {isSolo ? 'Start Exploring →' : 'Open Trip →'}
        </button>
      </div>
    </div>
  );
}

export default ShareCodeModal;
