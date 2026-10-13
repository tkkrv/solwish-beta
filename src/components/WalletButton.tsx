'use client';

import dynamic from 'next/dynamic';
import { useLanguage } from '@/i18n/LanguageProvider';

/** Кнопка кошелька рендерится только в браузере (иначе hydration mismatch). */
const BaseWalletMultiButton = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).BaseWalletMultiButton,
  { ssr: false, loading: () => <div className="h-10 w-[150px] rounded-xl bg-line/60" /> }
);

export default function WalletButton() {
  const { t } = useLanguage();
  return (
    <BaseWalletMultiButton
      labels={{
        'no-wallet': t.wallet.connect,
        'has-wallet': t.wallet.connect,
        connecting: t.wallet.connecting,
        'change-wallet': t.wallet.change,
        'copy-address': t.wallet.copyAddress,
        copied: t.wallet.copied,
        disconnect: t.wallet.disconnect,
      }}
    />
  );
}
