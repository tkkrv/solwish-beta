import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'You have a gift',
  description: 'Someone sent you SOL with a greeting card. Open the link to claim it.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
