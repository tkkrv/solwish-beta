import 'server-only';
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  type ParsedTransactionWithMeta,
} from '@solana/web3.js';
import { RPC_URL } from '../config';
import { isWishMemo, parseSolWishMemo } from '../memo';
import type { GiftsSummary, GreetingCard, Wish } from '../types';

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
      out.push({
        source: info.source,
        destination: info.destination,
        lamports: Number(info.lamports),
      });
    }
  }
  return out;
}

const cache = new Map<string, { at: number; value: GiftsSummary }>();
const CACHE_MS = 15_000;

/**
 * Подарки по вишлисту читаются прямо из блокчейна:
 * подписи получателя → фильтр по memo SolWish c нужным wishId → суммы из переводов.
 */
export async function getWishGifts(wish: Wish): Promise<GiftsSummary> {
  const cached = cache.get(wish.id);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  const conn = getConnection();
  const recipient = new PublicKey(wish.recipientWallet);
  const signatures = await conn.getSignaturesForAddress(recipient, { limit: 500 });

  const matching = signatures.filter((s) => {
    if (s.err) return false;
    const memo = parseSolWishMemo(s.memo);
    return isWishMemo(memo) && memo.wishId === wish.id;
  });

  const gifts: GiftsSummary['gifts'] = [];
  // Небольшими пачками, чтобы не упираться в лимиты публичного RPC.
  for (let i = 0; i < Math.min(matching.length, 100); i += 25) {
    const chunk = matching.slice(i, i + 25);
    const txs = await conn.getParsedTransactions(
      chunk.map((s) => s.signature),
      { maxSupportedTransactionVersion: 0, commitment: 'confirmed' }
    );
    txs.forEach((tx, idx) => {
      if (!tx) return;
      const sig = chunk[idx];
      const memo = parseSolWishMemo(sig.memo);
      const lamports = systemTransfers(tx)
        .filter((t) => t.destination === wish.recipientWallet)
        .reduce((sum, t) => sum + t.lamports, 0);
      if (!lamports || !memo) return;
      const sender = systemTransfers(tx)[0]?.source || '';
      gifts.push({
        signature: sig.signature,
        from: memo.from.slice(0, 64),
        msg: memo.msg.slice(0, 400),
        amountSol: lamports / LAMPORTS_PER_SOL,
        sender,
        blockTime: sig.blockTime ?? null,
      });
    });
  }

  const value: GiftsSummary = {
    gifts,
    count: gifts.length,
    totalSol: gifts.reduce((s, g) => s + g.amountSol, 0),
  };
  cache.set(wish.id, { at: Date.now(), value });
  return value;
}

/** Открытка по подписи транзакции: проверяем, что это действительно перевод с memo SolWish. */
export async function getGreetingCard(signature: string): Promise<GreetingCard | null> {
  if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(signature)) return null;
  const tx = await getConnection().getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  });
  if (!tx || tx.meta?.err) return null;

  let memoText: string | null = null;
  for (const ix of tx.transaction.message.instructions) {
    if (ix.programId.toBase58() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') {
      memoText = 'parsed' in ix ? String(ix.parsed) : null;
    }
  }
  const memo = parseSolWishMemo(memoText);
  const transfer = systemTransfers(tx)[0];
  if (!memo || !transfer) return null;

  return {
    signature,
    kind: isWishMemo(memo) ? 'wish' : 'link',
    wishId: isWishMemo(memo) ? memo.wishId : null,
    from: memo.from.slice(0, 64),
    msg: memo.msg.slice(0, 400),
    amountSol: transfer.lamports / LAMPORTS_PER_SOL,
    sender: transfer.source,
    recipient: transfer.destination,
    blockTime: tx.blockTime ?? null,
  };
}
