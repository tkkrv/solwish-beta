import type { Metadata } from 'next';
import '@dialectlabs/blinks/index.css';

export const metadata: Metadata = {
  title: 'Blink preview',
  description: 'See how a SolWish wishlist looks and works as a Solana Blink.',
  robots: { index: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
