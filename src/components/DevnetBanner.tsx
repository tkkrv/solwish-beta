'use client';

import { Droplet } from 'lucide-react';
import { FAUCET_URL, IS_DEVNET } from '@/lib/config';
import { useLanguage } from '@/i18n/LanguageProvider';

export default function DevnetBanner() {
  const { t } = useLanguage();
  if (!IS_DEVNET) return null;
  return (
    <div className="bg-ink px-4 py-2 text-center text-[13px] text-white/85">
      <span>{t.devnet.text}</span>{' '}
      <a
        href={FAUCET_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-semibold text-[#14F195] underline-offset-2 hover:underline"
      >
        <Droplet className="h-3.5 w-3.5" />
        {t.devnet.faucet}
      </a>
    </div>
  );
}
