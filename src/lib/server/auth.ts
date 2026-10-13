import 'server-only';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';
import { isFresh, parseAuthMessage, type AuthAction } from '../auth-message';
import type { WalletAuth } from '../validation';

export class AuthError extends Error {}

/** Проверяет подпись кошелька под сообщением из buildAuthMessage. Возвращает адрес кошелька. */
export function verifyWalletAuth(auth: WalletAuth, action: AuthAction, target: string): string {
  const fields = parseAuthMessage(auth.message);
  if (fields.action !== action || fields.target !== target || fields.wallet !== auth.wallet) {
    throw new AuthError('auth_mismatch');
  }
  if (!isFresh(fields.issuedAt)) throw new AuthError('auth_expired');
  let ok = false;
  try {
    ok = nacl.sign.detached.verify(
      new TextEncoder().encode(auth.message),
      bs58.decode(auth.signature),
      new PublicKey(auth.wallet).toBytes()
    );
  } catch {
    ok = false;
  }
  if (!ok) throw new AuthError('auth_invalid');
  return auth.wallet;
}
