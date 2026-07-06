import { useState } from 'react';
import { S } from '../shared/styles';
import lumi11 from '../../assets/lumi11.png';

function ShareCodeModal({ trip, onDismiss }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(trip.shareCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const isSolo = trip.isSolo;
  return (
    <div className="tb-sheet-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="tb-modal-pop" style={{ background: '#fff', borderRadius: 24, padding: '1.5rem 1.75rem', maxWidth: 360, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        {/* Header row: Lumi beside title + subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <img src={lumi11} alt="Lumi" style={{ width: 72, height: 72, objectFit: 'contain', flexShrink: 0 }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 19, fontWeight: 700, color: '#1a1a18', marginBottom: 4 }}>
              {isSolo ? 'Adventure Ready!' : 'Trip Created!'}
            </div>
            <div style={{ fontSize: 12.5, color: '#6b6b68', lineHeight: 1.55 }}>
              {isSolo
                ? <>Your solo trip <strong>{trip.groupName}</strong> is all set.</>
                : <>Share the code below so friends can join <strong>{trip.groupName}</strong>.</>}
            </div>
          </div>
        </div>
        {!isSolo && (
          <>
            <div style={{ background: '#FFF3EE', border: '0.5px solid #FFB899', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, color: '#FF6B35', fontWeight: 600, letterSpacing: .4, textTransform: 'uppercase', marginBottom: 6 }}>Your Share Code</div>
              <div className="tb-amount-pop" style={{ fontFamily: "'Sora',sans-serif", fontSize: 28, fontWeight: 700, color: '#C94B1A', letterSpacing: 3 }}>{trip.shareCode}</div>
            </div>
            <button style={{ ...S.btn, ...(copied ? { background: '#FFF3EE', color: '#C94B1A', border: '0.5px solid #FFB899' } : { background: '#FF6B35', color: '#fff', border: 'none', boxShadow: '0 8px 20px rgba(255,107,53,0.3)' }), width: '100%', justifyContent: 'center', padding: '12px', fontSize: 15, borderRadius: 12, marginBottom: 10 }} onClick={copy}>
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
          </>
        )}
        <button style={{ ...S.btn, width: '100%', justifyContent: 'center', padding: '10px', fontSize: 14, borderRadius: 12 }} onClick={onDismiss}>
          {isSolo ? 'Start Exploring' : 'Open Trip'}
        </button>
      </div>
    </div>
  );
}

export default ShareCodeModal;
