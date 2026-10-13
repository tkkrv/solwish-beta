import { ImageResponse } from 'next/og';
import { getWish } from '@/lib/server/wishes';
import { getWishGifts } from '@/lib/server/chain';
import { LogoBadge, OG_SIZE, coverDataUrl, ogFonts } from '@/lib/server/og';
import { getSolPrices } from '@/lib/server/price';
import { computeProgress } from '@/lib/progress';
import { formatMoney, isFiat } from '@/lib/money';

export const alt = 'SolWish wishlist';
export const size = OG_SIZE;
export const contentType = 'image/png';

/** Превью ссылки на вишлист: название, для кого и прогресс сбора. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wish = await getWish(id).catch(() => null);
  const fonts = await ogFonts();

  if (!wish) {
    return new ImageResponse(
      (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F6FB', fontFamily: 'Inter' }}>
          <LogoBadge />
        </div>
      ),
      { ...size, fonts }
    );
  }

  const summary = await Promise.race([
    getWishGifts(wish).catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), 2500)),
  ]);
  const prices = isFiat(wish.goalCurrency) ? await getSolPrices().catch(() => null) : null;
  const price = isFiat(wish.goalCurrency) ? (prices?.[wish.goalCurrency] ?? null) : null;
  const progress = computeProgress(wish, summary?.gifts ?? [], price);
  const pct = Math.max(0, Math.min(1, progress.goal > 0 ? progress.raised / progress.goal : 0));
  const money = (v: number) => formatMoney(v, wish.goalCurrency, 'en-US');
  const cover = (await coverDataUrl(wish.iconUrl)) || (wish.iconUrl.startsWith('https://') ? wish.iconUrl : null);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#F3F6FB', fontFamily: 'Inter' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 64 }}>
          <LogoBadge />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {wish.creatorName ? (
              <div style={{ fontSize: 30, fontWeight: 700, color: '#8A93A3' }}>{`For ${wish.creatorName}`}</div>
            ) : null}
            <div style={{ fontSize: 64, fontWeight: 800, color: '#0B1220', lineHeight: 1.08, marginTop: 8, display: 'flex' }}>
              {wish.title.length > 48 ? `${wish.title.slice(0, 46)}…` : wish.title}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', width: '100%', height: 18, borderRadius: 9, background: '#E3E8F0' }}>
              <div
                style={{
                  width: `${Math.max(pct * 100, pct > 0 ? 3 : 0)}%`,
                  height: 18,
                  borderRadius: 9,
                  background: 'linear-gradient(90deg,#9945FF,#7C3AED,#14F195)',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30, fontWeight: 800, color: '#0B1220' }}>
              <span>{`${money(progress.raised)} / ${money(progress.goal)}`}</span>
              <span style={{ color: '#7C3AED' }}>Send a gift</span>
            </div>
          </div>
        </div>
        {cover ? (
          <img src={cover} alt="" width={460} height={630} style={{ objectFit: 'cover' }} />
        ) : null}
      </div>
    ),
    { ...size, fonts }
  );
}
