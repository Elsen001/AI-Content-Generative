import Link from 'next/link';

export function Logo({ href = '/', compact = false }) {
  return (
    <Link href={href} className="brand" aria-label="VYRAL ana səhifə">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5l8 14 8-14" />
          <path d="M8.5 5h7" />
        </svg>
      </span>
      {!compact && <span className="brand-word">VYRAL</span>}
    </Link>
  );
}
