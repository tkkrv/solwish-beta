import { NextResponse } from 'next/server';
import { AI_ENABLED } from '@/lib/server/ai';

/** Включены ли AI-функции на этом сервере (есть ли ключ). */
export function GET() {
  return NextResponse.json({ enabled: AI_ENABLED }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
