/**
 * Подпись кошельком вместо логина (в духе Sign-In With Solana).
 * Пользователь подписывает понятный текст; сервер проверяет подпись, адрес, действие и время.
 */
export type AuthAction = 'create-wish' | 'manage-wish' | 'link-telegram';

const MAX_AGE_MS = 10 * 60_000;

export function buildAuthMessage(opts: {
  action: AuthAction;
  wallet: string;
  target: string;
  domain: string;
  issuedAt?: string;
}): string {
  return [
    `${opts.domain} wants you to confirm an action with your Solana wallet.`,
    '',
    `Action: ${opts.action}`,
    `Target: ${opts.target}`,
    `Wallet: ${opts.wallet}`,
    `Issued At: ${opts.issuedAt ?? new Date().toISOString()}`,
    '',
    'This signature does not send a transaction and costs nothing.',
  ].join('\n');
}

export function parseAuthMessage(message: string) {
  const get = (key: string) => message.match(new RegExp(`^${key}: (.+)$`, 'm'))?.[1]?.trim() ?? null;
  return {
    action: get('Action'),
    target: get('Target'),
    wallet: get('Wallet'),
    issuedAt: get('Issued At'),
  };
}

export function isFresh(issuedAt: string | null, now = Date.now()): boolean {
  if (!issuedAt) return false;
  const t = Date.parse(issuedAt);
  return Number.isFinite(t) && now - t < MAX_AGE_MS && t - now < 60_000;
}
