import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demo',
  description: 'Try SolWish without a wallet: AI greeting helper, moderation and premium card designs.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
