import type { Metadata } from 'next';
import { cache } from 'react';
import { getWish } from '@/lib/server/wishes';
import { getSiteUrl } from '@/lib/server/site';
import { absoluteUrl } from '@/lib/config';
import { formatSol } from '@/lib/amounts';
import WishView from './WishView';
import NotFoundCard from '@/components/NotFoundCard';

const loadWish = cache(async (id: string) => {
  try {
    return await getWish(id);
  } catch (err) {
    console.error('[wish page]', err);
    return null;
  }
});

export async function generateMetadata({ params }: PageProps<'/w/[id]'>): Promise<Metadata> {
  const { id } = await params;
  const wish = await loadWish(id);
  if (!wish) return { title: 'Wishlist not found', robots: { index: false } };
  const site = await getSiteUrl();
  const description = `${wish.creatorName ? `${wish.creatorName} · ` : ''}${formatSol(wish.amountSol)} SOL · ${
    wish.description || 'Send a gift with an on-chain greeting card on Solana.'
  }`.slice(0, 200);
  return {
    title: wish.title,
    description,
    openGraph: { title: wish.title, description, url: `${site}/w/${wish.id}` },
    twitter: { card: 'summary_large_image', title: wish.title, description },
    alternates: { canonical: `${site}/w/${wish.id}` },
  };
}

export default async function WishPage({ params }: PageProps<'/w/[id]'>) {
  const { id } = await params;
  const wish = await loadWish(id);
  if (!wish) return <NotFoundCard kind="wish" />;
  const site = await getSiteUrl();
  return <WishView wish={{ ...wish, iconUrl: absoluteUrl(wish.iconUrl, site) }} />;
}
