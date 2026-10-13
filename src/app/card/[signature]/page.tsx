import type { Metadata } from 'next';
import { cache } from 'react';
import { getGreetingCard } from '@/lib/server/chain';
import { getWish } from '@/lib/server/wishes';
import { formatSol } from '@/lib/amounts';
import NotFoundCard from '@/components/NotFoundCard';
import CardView from './CardView';

const loadCard = cache(async (signature: string) => {
  try {
    const card = await getGreetingCard(signature);
    if (!card) return null;
    const wish = card.wishId ? await getWish(card.wishId).catch(() => null) : null;
    return { card, wish };
  } catch (err) {
    console.error('[card page]', err);
    return null;
  }
});

export async function generateMetadata({ params }: PageProps<'/card/[signature]'>): Promise<Metadata> {
  const { signature } = await params;
  const data = await loadCard(signature);
  if (!data) return { title: 'Greeting card', robots: { index: false } };
  const title = `🎁 ${data.card.from || 'Friend'} → ${data.wish?.creatorName || 'SolWish'}`;
  const description = `${data.card.msg ? `“${data.card.msg.slice(0, 140)}” · ` : ''}+${formatSol(data.card.amountSol)} SOL · verified on Solana`;
  return { title, description, openGraph: { title, description }, twitter: { title, description } };
}

export default async function CardPage({ params }: PageProps<'/card/[signature]'>) {
  const { signature } = await params;
  const data = await loadCard(signature);
  if (!data) return <NotFoundCard kind="card" />;
  return <CardView card={data.card} wish={data.wish} />;
}
