'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import WalletButton from './WalletButton';
import { useLanguage } from '@/i18n/LanguageProvider';

export default function SiteHeader() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const links = [
    { href: '/create', label: t.nav.createWish },
    { href: '/gift', label: t.nav.giftLink },
    { href: '/my', label: t.nav.myWishes },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  pathname?.startsWith(l.href) ? 'text-ink' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <WalletButton />
        </div>
      </div>
      {/* Мобильная навигация */}
      <div className="flex items-center justify-between gap-2 border-t border-line/60 px-4 py-2 md:hidden">
        <nav className="-mx-1 flex min-w-0 gap-0.5 overflow-x-auto px-1 [scrollbar-width:none]">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-lg px-2 py-1.5 text-[13px] font-semibold ${
                pathname?.startsWith(l.href) ? 'bg-surface text-ink' : 'text-ink-2'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="shrink-0 sm:hidden">
          <LanguageSwitcher compact />
        </div>
      </div>
    </header>
  );
}
