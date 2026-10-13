import 'server-only';
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  type ConfirmedSignatureInfo,
  type ParsedTransactionWithMeta,
} from '@solana/web3.js';
import { MEMO_PROGRAM_ID, RPC_URL } from '../config';
import { isThanksMemo, isWishMemo, parseSolWishMemo, type SolWishMemo } from '../memo';
import type { Gift, GiftsSummary, GreetingCard, SentGift, ThankYou, Wish } from '../types';

let connection: Connection | null = null;
export function getConnection() {
  if (!connection) connection = new Connection(RPC_URL, 'confirmed');
  return connection;
}

interface ParsedTransfer {
  source: string;
  destination: string;
  lamports: number;
}

function systemTransfers(tx: ParsedTransactionWithMeta): ParsedTransfer[] {
  const out: ParsedTransfer[] = [];
  for (const ix of tx.transaction.message.instructions) {
    if ('parsed' in ix && ix.program === 'system' && ix.parsed?.type === 'transfer') {
      const info = ix.parsed.info;
      out.push({ source: info.source, destination: info.destination, lamports: Number(info.lamports) });
    }
  }
  return out;
}

function memoFromTx(tx: ParsedTransactionWithMeta): SolWishMemo | null {
  for (const ix of tx.transaction.message.instructions) {
    if (ix.programId.equals(MEMO_PROGRAM_ID) && 'parsed' in ix) {
      const memo = parseSolWishMemo(String(ix.parsed));
      if (memo) return memo;
    }
  }
  return null;
}

/** Разбирает транзакции пачками, чтобы не упираться в лимиты публичного RPC. */
async function fetchParsed(sigs: ConfirmedSignatureInfo[], max = 100) {
  const conn = getConnection();
  const out: { info: ConfirmedSignatureInfo; tx: ParsedTransactionWithMeta }[] = [];
  const list = sigs.slice(0, max);
  for (let i = 0; i < list.length; i += 25) {
    const chunk = list.slice(i, i + 25);
    const txs = await conn.getParsedTransactions(
      chunk.map((s) => s.signature),
      { maxSupportedTransactionVersion: 0, commitment: 'confirmed' }
    );
    txs.forEach((tx, idx) => tx && out.push({ info: chunk[idx], tx }));
  }
  return out;
}

const giftsCache = new Map<string, { at: number; value: GiftsSummary }>();
const CACHE_MS = 15_000;

/**
 * Подарки по вишлисту читаются прямо из блокчейна:
 * подписи получателя → фильтр по memo SolWish c нужным wishId → суммы из переводов.
 */
export async function getWishGifts(wish: Wish): Promise<GiftsSummary> {
  const cached = giftsCache.get(wish.id);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  const signatures = await getConnection().getSignaturesForAddress(new PublicKey(wish.recipientWallet), {
    limit: 500,
  });
  const matching = signatures.filter((s) => {
    if (s.err) return false;
    const memo = parseSolWishMemo(s.memo);
    return isWishMemo(memo) && memo.wishId === wish.id;
  });

  const gifts: Gift[] = [];
  for (const { info, tx } of await fetchParsed(matching)) {
    const memo = parseSolWishMemo(info.memo);
    if (!isWishMemo(memo)) continue;
    const transfers = systemTransfers(tx);
    const lamports = transfers
      .filter((t) => t.destination === wish.recipientWallet)
      .reduce((sum, t) => sum + t.lamports, 0);
    if (!lamports) continue;
    gifts.push({
      signature: info.signature,
      from: memo.a ? '' : memo.from.slice(0, 64),
      msg: memo.msg.slice(0, 400),
      amountSol: lamports / LAMPORTS_PER_SOL,
      sender: transfers[0]?.source || '',
      blockTime: info.blockTime ?? null,
      anonymous: memo.a === 1,
      itemId: typeof memo.i === 'string' ? memo.i : null,
      fiat: typeof memo.f === 'number' ? memo.f : null,
    });
  }

  const value: GiftsSummary = {
    gifts,
    count: gifts.length,
    totalSol: gifts.reduce((s, g) => s + g.amountSol, 0),
  };
  giftsCache.set(wish.id, { at: Date.now(), value });
  return value;
}

export function invalidateGifts(wishId: string) {
  giftsCache.delete(wishId);
}

/** Открытка по подписи транзакции: проверяем, что это действительно перевод с memo SolWish. */
export async function getGreetingCard(signature: string): Promise<GreetingCard | null> {
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(signature)) return null;
  const tx = await getConnection().getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  });
  if (!tx || tx.meta?.err) return null;

  const memo = memoFromTx(tx);
  const transfer = systemTransfers(tx)[0];
  if (!memo || !transfer || isThanksMemo(memo)) return null;
  const wishMemo = isWishMemo(memo) ? memo : null;

  return {
    signature,
    kind: wishMemo ? 'wish' : 'link',
    wishId: wishMemo ? wishMemo.wishId : null,
    from: wishMemo?.a ? '' : memo.from.slice(0, 64),
    msg: memo.msg.slice(0, 400),
    anonymous: wishMemo?.a === 1,
    amountSol: transfer.lamports / LAMPORTS_PER_SOL,
    sender: transfer.source,
    recipient: transfer.destination,
    blockTime: tx.blockTime ?? null,
  };
}

/** «Спасибо» получателя на подарок: memo type=thanks с ref = подпись подарка, подписанный получателем. */
export async function getThankYou(recipient: string, giftSignature: string): Promise<ThankYou | null> {
  const signatures = await getConnection().getSignaturesForAddress(new PublicKey(recipient), { limit: 300 });
  const hit = signatures.find((s) => {
    if (s.err) return false;
    const memo = parseSolWishMemo(s.memo);
    return isThanksMemo(memo) && memo.ref === giftSignature;
  });
  if (!hit) return null;
  // Убеждаемся, что «спасибо» подписал именно получатель (а не кто-то посторонний).
  const tx = await getConnection().getParsedTransaction(hit.signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  });
  const signers = tx?.transaction.message.accountKeys.filter((k) => k.signer).map((k) => k.pubkey.toBase58());
  if (!tx || !signers?.includes(recipient)) return null;
  const memo = memoFromTx(tx);
  if (!isThanksMemo(memo)) return null;
  return { signature: hit.signature, msg: memo.msg.slice(0, 400), blockTime: hit.blockTime ?? null };
}

/** Подарки, отправленные кошельком (по memo SolWish в его истории). */
export async function getSentGifts(wallet: string): Promise<SentGift[]> {
  const signatures = await getConnection().getSignaturesForAddress(new PublicKey(wallet), { limit: 300 });
  const ours = signatures.filter((s) => {
    if (s.err) return false;
    const memo = parseSolWishMemo(s.memo);
    return !!memo && !isThanksMemo(memo);
  });
  const sent: SentGift[] = [];
  for (const { info, tx } of await fetchParsed(ours, 50)) {
    const memo = parseSolWishMemo(info.memo);
    const transfer = systemTransfers(tx).find((t) => t.source === wallet);
    if (!memo || !transfer || isThanksMemo(memo)) continue;
    sent.push({
      signature: info.signature,
      wishId: isWishMemo(memo) ? memo.wishId : null,
      kind: isWishMemo(memo) ? 'wish' : 'link',
      msg: memo.msg.slice(0, 200),
      amountSol: transfer.lamports / LAMPORTS_PER_SOL,
      recipient: transfer.destination,
      blockTime: info.blockTime ?? null,
    });
  }
  return sent;
}
