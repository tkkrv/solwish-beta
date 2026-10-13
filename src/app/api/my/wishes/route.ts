import { NextResponse } from 'next/server';
import { listWishesByWallet } from '@/lib/server/wishes';
import { apiError, handleServerError } from '@/lib/server/http';
import { isValidSolanaAddress } from '@/lib/validation';

/** Вишлисты кошелька (как получателя или подтверждённого создателя). Данные публичные. */
export async function GET(req: Request) {
  const wallet = new URL(req.url).searchParams.get('wallet') || '';
  if (!isValidSolanaAddress(wallet)) return apiError('invalid_input', 400);
  try {
    return NextResponse.json({ wishes: await listWishesByWallet(wallet) });
  } catch (err) {
    return handleServerError(err, 'GET /api/my/wishes');
  }
}
