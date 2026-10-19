import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'SolWish is free to gift. Premium greeting cards and features for business.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
