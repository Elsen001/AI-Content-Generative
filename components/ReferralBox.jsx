'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Gift } from 'lucide-react';

export function ReferralBox({ code, bonus = 0 }) {
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setLink(`${window.location.origin}/register?ref=${code}`);
    }
  }, [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link || code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard may be blocked; the code is still visible
    }
  };

  return (
    <div className="referral-box">
      <div className="row" style={{ gap: 8 }}>
        <Gift size={15} color="var(--lime)" />
        <b style={{ fontSize: 12 }}>Referral proqramı</b>
      </div>
      <p className="tiny muted mt-1" style={{ marginTop: 6 }}>
        Hər dəvət üçün sizə və dostunuza {bonus} bonus kredit.
      </p>
      <div className="code">
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{link || code}</span>
        <button
          type="button"
          onClick={copy}
          style={{ border: 0, background: 'none', color: 'var(--lime)', display: 'flex' }}
          aria-label="Linki kopyala"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <p className="tiny muted mt-1" style={{ marginTop: 6 }}>
        Kod: <span className="mono" style={{ color: 'var(--text)' }}>{code}</span>
      </p>
    </div>
  );
}
