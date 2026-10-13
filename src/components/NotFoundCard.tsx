'use client';

import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';

export default function NotFoundCard({ kind }: { kind: 'wish' | 'card' | 'page' }) {
  const { t } = useLanguage();
  const title = kind === 'card' ? t.card.notFoundTitle : kind === 'wish' ? t.wish.notFoundTitle : t.errors.notFound;
  const desc = kind === 'card' ? t.card.notFoundDesc : t.wish.notFoundDesc;
  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="card p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas text-ink-3">
          <SearchX className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-extrabold">{title}</h1>
        <p className="mt-2 text-ink-2">{desc}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/create" className="btn-primary">
            {t.wish.createOwn}
          </Link>
          <Link href="/" className="btn-ghost">
            {t.common.backHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
