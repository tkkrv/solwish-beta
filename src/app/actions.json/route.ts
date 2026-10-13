import type { ActionsJson } from '@solana/actions';
import { ACTION_HEADERS } from '@/lib/server/actions';

/**
 * Связывает адреса сайта с Action API, чтобы ссылки на вишлисты
 * раскрывались в Blink в X, Dialect и кошельках.
 */
export async function GET() {
  const payload: ActionsJson = {
    rules: [
      { pathPattern: '/w/*', apiPath: '/api/actions/gift/*' },
      // Ссылки первой версии вида /blink?id=wish_xxx (query-параметры сохраняются)
      { pathPattern: '/blink', apiPath: '/api/actions/gift' },
      { pathPattern: '/api/actions/**', apiPath: '/api/actions/**' },
    ],
  };
  return Response.json(payload, { headers: ACTION_HEADERS });
}

export const OPTIONS = GET;
