'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import WalletButton from './WalletButton';
import { useLanguage } from '@/i18n/LanguageProvider';

export default function SiteHeader() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = [
    { href: '/create', label: t.nav.createWish },
    { href: '/gift', label: t.nav.giftLink },
    { href: '/my', label: t.nav.myWishes },
    { href: '/pricing', label: t.nav.pricing },
    { href: '/demo', label: t.nav.demo },
  ];
  const active = (href: string) => pathname?.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  active(l.href) ? 'text-ink' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden lg:block">
            <LanguageSwitcher />
          </div>
          <div className="hidden sm:block">
            <WalletButton />
          </div>
          <div className="sm:hidden">
            <WalletButton short />
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? t.nav.closeMenu : t.nav.menu}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink transition hover:border-ink-3 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Мобильное меню: крупные пункты и выбор языка */}
      {open && (
        <>
          <button
            type="button"
            aria-label={t.nav.closeMenu}
            onClick={() => setOpen(false)}
            className="fixed inset-x-0 top-full h-screen w-full cursor-default bg-ink/20 lg:hidden"
          />
          <div id="mobile-menu" className="border-t border-line/60 bg-canvas px-4 pb-5 pt-2 shadow-lg lg:hidden">
            <nav className="mx-auto flex max-w-6xl flex-col">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-xl px-3 py-3 text-base font-semibold ${
                    active(l.href) ? 'bg-surface text-ink' : 'text-ink-2 hover:bg-surface hover:text-ink'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="mx-auto mt-3 flex max-w-6xl items-center justify-between border-t border-line/60 px-3 pt-4">
              <span className="text-sm font-semibold text-ink-3">Язык · Тіл · Language</span>
              <LanguageSwitcher />
            </div>
          </div>
        </>
      )}
    </header>
  );
}
