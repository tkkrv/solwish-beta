import type { Metadata, Viewport } from 'next';
import { cookies, headers } from 'next/headers';
import './fonts.css';
import './globals.css';
import ClientProviders from '@/components/ClientProviders';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import DevnetBanner from '@/components/DevnetBanner';
import { LOCALE_COOKIE, resolveLocale } from '@/i18n';
import { getSiteUrl } from '@/lib/server/site';

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = await getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: 'SolWish — wishlists and gift links on Solana',
      template: '%s · SolWish',
    },
    description:
      'Flowers fade, SolWish stays. Zero-fee P2P gifting on Solana with on-chain greeting cards, Blinks and gift links.',
    openGraph: { siteName: 'SolWish', type: 'website' },
    twitter: { card: 'summary_large_image' },
  };
}

export const viewport: Viewport = {
  themeColor: '#F3F6FB',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const locale = resolveLocale(
    cookieStore.get(LOCALE_COOKIE)?.value,
    headerStore.get('accept-language')
  );

  return (
    <html lang={locale}>
      <body className="flex min-h-screen flex-col font-sans">
        <ClientProviders locale={locale}>
          <DevnetBanner />
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </ClientProviders>
      </body>
    </html>
  );
}
