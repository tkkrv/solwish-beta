import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create a wishlist',
  description: 'Set a goal in SOL and get a link that works as a page, a QR code and a Solana Blink.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
