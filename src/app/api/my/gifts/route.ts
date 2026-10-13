import { NextResponse } from 'next/server';
import { getSentGifts } from '@/lib/server/chain';
import { apiError, handleServerError } from '@/lib/server/http';
import { isValidSolanaAddress } from '@/lib/validation';

/** Подарки, отправленные кошельком, — читаются из блокчейна. */
export async function GET(req: Request) {
  const wallet = new URL(req.url).searchParams.get('wallet') || '';
  if (!isValidSolanaAddress(wallet)) return apiError('invalid_input', 400);
  try {
    return NextResponse.json(
      { gifts: await getSentGifts(wallet) },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=120' } }
    );
  } catch (err) {
    return handleServerError(err, 'GET /api/my/gifts');
  }
}
