'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { RPC_URL } from '@/lib/config';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import type { Locale } from '@/i18n';
import { ToastProvider } from './Toast';

import '@solana/wallet-adapter-react-ui/styles.css';

export default function ClientProviders({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  // Остальные кошельки (Backpack и др.) подключаются автоматически через Wallet Standard.
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={RPC_URL} config={{ commitment: 'confirmed' }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <LanguageProvider initialLocale={locale}>
            <ToastProvider>{children}</ToastProvider>
          </LanguageProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
