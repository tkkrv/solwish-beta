import Link from 'next/link';

export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="sw-logo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9945FF" />
          <stop offset="0.55" stopColor="#7C3AED" />
          <stop offset="1" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#sw-logo)" />
      <rect x="8" y="14" width="16" height="10" rx="2" fill="none" stroke="#fff" strokeWidth="2" />
      <rect x="7" y="10.5" width="18" height="4" rx="1.5" fill="none" stroke="#fff" strokeWidth="2" />
      <path d="M16 10.5V24" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M16 10.3c-1.2-2.6-4.6-3.2-4.6-1.1 0 1.4 2.6 1.6 4.6 1.1Zm0 0c1.2-2.6 4.6-3.2 4.6-1.1 0 1.4-2.6 1.6-4.6 1.1Z"
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 rounded-lg" aria-label="SolWish">
      <LogoMark />
      <span className="text-lg font-extrabold tracking-tight text-ink">
        SolWish
        <span className="ml-1.5 rounded-md bg-brand-soft px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-brand">
          beta
        </span>
      </span>
    </Link>
  );
}
