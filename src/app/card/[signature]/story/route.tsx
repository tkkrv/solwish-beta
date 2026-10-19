import { ImageResponse } from 'next/og';
import { cookies, headers } from 'next/headers';
import { getGreetingCard } from '@/lib/server/chain';
import { getWish } from '@/lib/server/wishes';
import { LogoBadge, ogFonts } from '@/lib/server/og';
import { getSiteUrl } from '@/lib/server/site';
import { dictionaries, fmt, LOCALE_COOKIE, resolveLocale } from '@/i18n';
import { formatSol } from '@/lib/amounts';
import { shortAddress } from '@/lib/config';
import { isPremiumStyle } from '@/lib/premium';

const BACKGROUNDS = {
  default: 'linear-gradient(160deg, #9945FF 0%, #7C3AED 45%, #14F195 100%)',
  aurora: 'linear-gradient(160deg, #14F195 0%, #9945FF 50%, #FF7AC6 100%)',
  confetti: 'linear-gradient(160deg, #FF7AC6 0%, #F59E0B 50%, #14F195 100%)',
  gold: 'linear-gradient(160deg, #F7D774 0%, #B8860B 55%, #F7D774 100%)',
} as const;

/** Открытка для Stories (1080×1920 PNG) — чтобы поделиться в Instagram/Telegram. */
export async function GET(_req: Request, ctx: RouteContext<'/card/[signature]/story'>) {
  const { signature } = await ctx.params;
  const card = await getGreetingCard(signature).catch(() => null);
  if (!card) return new Response('Not found', { status: 404 });

  const [wish, cookieStore, headerStore, site, fonts] = await Promise.all([
    card.wishId ? getWish(card.wishId).catch(() => null) : null,
    cookies(),
    headers(),
    getSiteUrl(),
    ogFonts(),
  ]);
  const t = dictionaries[resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerStore.get('accept-language'))];
  const to = wish?.creatorName || shortAddress(card.recipient);
  const from = card.anonymous ? t.wish.anonymousLabel : card.from || t.wish.anonymous;
  const msg = card.hidden ? t.wish.hiddenMsg : card.msg || '🎁';
  const background = BACKGROUNDS[isPremiumStyle(card.style) ? card.style : 'default'];
  const size = msg.length > 110 ? 58 : msg.length > 60 ? 70 : 84;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 90,
          background,
          fontFamily: 'Inter',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: '#FFFFFF',
            borderRadius: 64,
            padding: 80,
            boxShadow: '0 40px 120px rgba(11,18,32,0.35)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <LogoBadge />
            <div
              style={{
                display: 'flex',
                padding: '14px 26px',
                borderRadius: 999,
                background: '#E7F8F2',
                color: '#0FA37F',
                fontSize: 30,
                fontWeight: 700,
              }}
            >
              {fmt(t.card.verified, { network: 'Devnet' })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: '#8A93A3', textTransform: 'uppercase', letterSpacing: 4 }}>
              {t.card.to}
            </div>
            <div style={{ fontSize: 76, fontWeight: 800, color: '#0B1220', marginTop: 8 }}>{to}</div>
            {wish ? <div style={{ fontSize: 38, fontWeight: 700, color: '#4B5567', marginTop: 8 }}>{wish.title}</div> : null}
            <div style={{ fontSize: size, fontWeight: 800, color: '#0B1220', lineHeight: 1.2, marginTop: 90, display: 'flex' }}>
              {`“${msg}”`}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', height: 2, background: '#E3E8F0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 30, fontWeight: 700, color: '#8A93A3' }}>{t.card.from}</div>
                <div style={{ fontSize: 48, fontWeight: 800, color: '#0B1220' }}>{from}</div>
              </div>
              <div style={{ fontSize: 56, fontWeight: 800, color: '#0FA37F' }}>{`+${formatSol(card.amountSol)} SOL`}</div>
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: '#7C3AED' }}>{new URL(site).host}</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      fonts,
      headers: {
        'Content-Disposition': `inline; filename="solwish-card-${signature.slice(0, 8)}.png"`,
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}
