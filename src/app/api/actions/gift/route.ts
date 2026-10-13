/**
 * Старый адрес Blink (/api/actions/gift?id=...), оставлен для совместимости со ссылками первой версии.
 * Параметр `to` больше не используется: получатель всегда берётся из базы.
 */
import { ACTION_HEADERS, handleActionGet, handleActionPost } from '@/lib/server/actions';

export async function OPTIONS() {
  return new Response(null, { headers: ACTION_HEADERS });
}

export async function GET(req: Request) {
  return handleActionGet(req, new URL(req.url).searchParams.get('id'));
}

export async function POST(req: Request) {
  return handleActionPost(req, new URL(req.url).searchParams.get('id'));
}
