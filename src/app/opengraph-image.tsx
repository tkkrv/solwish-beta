import { ImageResponse } from 'next/og';
import { LogoBadge, OG_SIZE, ogFonts } from '@/lib/server/og';

export const alt = 'SolWish — wishlists and gift links on Solana';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(135deg,#F3F6FB 0%,#FFFFFF 50%,#EDE4FF 100%)',
          fontFamily: 'Inter',
        }}
      >
        <LogoBadge />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 84, fontWeight: 800, color: '#0B1220', lineHeight: 1.05 }}>Flowers fade.</div>
          <div style={{ fontSize: 84, fontWeight: 800, color: '#7C3AED', lineHeight: 1.05 }}>SolWish stays.</div>
          <div style={{ marginTop: 28, fontSize: 32, color: '#4B5567', fontWeight: 700 }}>
            Crypto wishlists & gift links with on-chain greeting cards
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 24, fontWeight: 700, color: '#4B5567' }}>
          <span>Solana Blinks</span>
          <span>·</span>
          <span>SPL Memo</span>
          <span>·</span>
          <span>0% fees</span>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() }
  );
}
