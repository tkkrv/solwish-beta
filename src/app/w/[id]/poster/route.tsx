import { ImageResponse } from 'next/og';
import { cookies, headers } from 'next/headers';
import QRCode from 'qrcode';
import { getWish } from '@/lib/server/wishes';
import { LogoBadge, coverDataUrl, ogFonts } from '@/lib/server/og';
import { getSiteUrl } from '@/lib/server/site';
import { dictionaries, fmt, LOCALE_COOKIE, resolveLocale } from '@/i18n';

/** Постер для печати (A5, 150 dpi = 1240×1748): обложка, название и большой QR на вишлист. */
export async function GET(req: Request, ctx: RouteContext<'/w/[id]/poster'>) {
  const { id } = await ctx.params;
  const wish = await getWish(id).catch(() => null);
  if (!wish) return new Response('Not found', { status: 404 });

  const [cookieStore, headerStore, site, fonts] = await Promise.all([cookies(), headers(), getSiteUrl(), ogFonts()]);
  const t = dictionaries[resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value, headerStore.get('accept-language'))];
  const link = `${site}/w/${wish.id}`;
  const qr = await QRCode.toDataURL(link, {
    width: 760,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0B1220', light: '#FFFFFF' },
  });
  const cover = (await coverDataUrl(wish.iconUrl)) || (wish.iconUrl.startsWith('https://') ? wish.iconUrl : null);
  const title = wish.title.length > 60 ? `${wish.title.slice(0, 58)}…` : wish.title;
  const titleSize = title.length > 36 ? 64 : 80;
  const download = new URL(req.url).searchParams.has('download');

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF', fontFamily: 'Inter' }}>
        <div style={{ display: 'flex', height: 420, background: 'linear-gradient(135deg,#9945FF,#7C3AED 55%,#14F195)' }}>
          {cover ? <img src={cover} alt="" width={1240} height={420} style={{ objectFit: 'cover' }} /> : null}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 90px 60px' }}>
          {wish.creatorName ? (
            <div style={{ fontSize: 36, fontWeight: 700, color: '#8A93A3', display: 'flex' }}>
              {fmt(t.wish.forWhom, { name: wish.creatorName })}
            </div>
          ) : null}
          <div
            style={{
              fontSize: titleSize,
              fontWeight: 800,
              color: '#0B1220',
              lineHeight: 1.1,
              marginTop: 10,
              textAlign: 'center',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            {title}
          </div>
          <div
            style={{
              marginTop: 44,
              display: 'flex',
              padding: 24,
              borderRadius: 40,
              border: '4px solid #E3E8F0',
            }}
          >
            <img src={qr} alt="" width={640} height={640} />
          </div>
          <div style={{ fontSize: 46, fontWeight: 800, color: '#7C3AED', marginTop: 36, display: 'flex' }}>
            {t.wish.posterScan}
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#8A93A3', marginTop: 10, display: 'flex' }}>
            {t.wish.posterHint}
          </div>
          <div style={{ flex: 1, display: 'flex' }} />
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <LogoBadge />
            <div style={{ fontSize: 30, fontWeight: 700, color: '#4B5567', display: 'flex' }}>
              {new URL(site).host}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1240,
      height: 1748,
      fonts,
      headers: {
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="solwish-poster-${wish.id}.png"`,
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
}
