import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gift link',
  description: 'Put SOL into a link and send it to anyone. The recipient claims it in one tap.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
