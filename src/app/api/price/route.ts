import { NextResponse } from 'next/server';
import { getSolPrices } from '@/lib/server/price';

export async function GET() {
  const prices = await getSolPrices();
  if (!prices) return NextResponse.json({ error: 'price_unavailable' }, { status: 503 });
  return NextResponse.json(
    { prices, updatedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  );
}
