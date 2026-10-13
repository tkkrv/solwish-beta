import bs58 from 'bs58';
import type { PublicKey } from '@solana/web3.js';
import { buildAuthMessage, type AuthAction } from '../auth-message';
import type { WalletAuth } from '../validation';

/** Просит кошелёк подписать текстовое сообщение (без транзакции и комиссии). */
export async function signWalletAuth(opts: {
  action: AuthAction;
  target: string;
  publicKey: PublicKey;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}): Promise<WalletAuth> {
  const wallet = opts.publicKey.toBase58();
  const message = buildAuthMessage({
    action: opts.action,
    target: opts.target,
    wallet,
    domain: window.location.host,
  });
  const signature = await opts.signMessage(new TextEncoder().encode(message));
  return { wallet, message, signature: bs58.encode(signature) };
}
