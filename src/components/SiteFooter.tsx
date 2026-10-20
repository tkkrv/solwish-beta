'use client';

import Link from 'next/link';
import { Send } from 'lucide-react';
import { LogoMark } from './Logo';
import { TELEGRAM_BOT_URL } from '@/lib/config';
import { useLanguage } from '@/i18n/LanguageProvider';

export default function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-ink-2 sm:flex-row">
        <div className="flex items-center gap-2">
          <LogoMark className="h-6 w-6" />
          <span>{t.home.footer}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 whitespace-nowrap">
          <Link href="/create" className="hover:text-ink">
            {t.nav.createWish}
          </Link>
          <Link href="/gift" className="hover:text-ink">
            {t.nav.giftLink}
          </Link>
          <Link href="/my" className="hover:text-ink">
            {t.nav.myWishes}
          </Link>
          <Link href="/demo" className="hover:text-ink">
            {t.nav.demo}
          </Link>
          <Link href="/#about" className="hover:text-ink">
            {t.nav.about}
          </Link>
          <Link href="/pricing" className="hover:text-ink">
            {t.nav.pricing}
          </Link>
          <Link href="/pricing#business" className="hover:text-ink">
            {t.pricing.bizTitle}
          </Link>
          <Link href="/terms" className="hover:text-ink">
            {t.legal.terms}
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            {t.legal.privacy}
          </Link>
          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-ink"
          >
            <Send className="h-4 w-4" />
            {t.home.telegram}
          </a>
        </div>
      </div>
    </footer>
  );
}
