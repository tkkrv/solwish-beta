import bs58 from 'bs58';
import { Buffer } from 'buffer';
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { CLAIM_FEE_LAMPORTS, GIFT_TX_COMPUTE_UNITS, MEMO_PROGRAM_ID } from '../config';
import { buildLinkMemo, parseSolWishMemo } from '../memo';

/**
 * Подарок-ссылка по механике TipLink:
 * одноразовый кошелёк создаётся в браузере, его секретный ключ живёт только в #фрагменте ссылки
 * (фрагмент не отправляется на сервер), получатель переводит баланс себе.
 */

export function createLinkKeypair() {
  return Keypair.generate();
}

export function linkUrl(origin: string, keypair: Keypair) {
  return `${origin}/claim#${bs58.encode(keypair.secretKey)}`;
}

export function keypairFromHash(hash: string): Keypair | null {
  try {
    const raw = hash.replace(/^#/, '').trim();
    const bytes = bs58.decode(raw);
    if (bytes.length !== 64) return null;
    return Keypair.fromSecretKey(bytes);
  } catch {
    return null;
  }
}

/** Транзакция пополнения ссылки: сумма + запас на комиссию claim + открытка в Memo. */
export function buildFundTransaction(opts: {
  sender: PublicKey;
  link: PublicKey;
  amountSol: number;
  from: string;
  message: string;
}) {
  const lamports = Math.round(opts.amountSol * LAMPORTS_PER_SOL) + CLAIM_FEE_LAMPORTS;
  return new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: GIFT_TX_COMPUTE_UNITS }),
    SystemProgram.transfer({ fromPubkey: opts.sender, toPubkey: opts.link, lamports }),
    new TransactionInstruction({
      keys: [{ pubkey: opts.sender, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(buildLinkMemo(opts.from, opts.message), 'utf-8'),
    })
  );
}

/** Забрать всё с ссылки на адрес получателя. Комиссию платит сама ссылка. */
export async function claimLink(connection: Connection, keypair: Keypair, destination: PublicKey) {
  const balance = await connection.getBalance(keypair.publicKey, 'confirmed');
  const lamports = balance - CLAIM_FEE_LAMPORTS;
  if (lamports <= 0) throw new Error('link_empty');

  const latest = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({ feePayer: keypair.publicKey, ...latest }).add(
    SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: destination, lamports })
  );
  tx.sign(keypair);
  const signature = await connection.sendRawTransaction(tx.serialize());
  const result = await connection.confirmTransaction({ signature, ...latest }, 'confirmed');
  if (result.value.err) throw new Error('transaction failed');
  return { signature, lamports };
}

/** Открытка, приложенная при пополнении (ищем memo SolWish в истории ссылки). */
export async function readLinkCard(connection: Connection, link: PublicKey) {
  const sigs = await connection.getSignaturesForAddress(link, { limit: 20 }, 'confirmed');
  for (const s of [...sigs].reverse()) {
    const memo = parseSolWishMemo(s.memo);
    if (memo && memo.type === 'link') return { from: memo.from, msg: memo.msg, signature: s.signature };
  }
  return null;
}

// ---------- «Мои ссылки» (только на этом устройстве) ----------

export interface StoredLink {
  pubkey: string;
  url: string;
  amountSol: number;
  message: string;
  createdAt: number;
  funded: boolean;
}

const STORAGE_KEY = 'solwish_gift_links';

export function loadStoredLinks(): StoredLink[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as StoredLink[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveStoredLink(link: StoredLink) {
  try {
    const list = loadStoredLinks().filter((l) => l.pubkey !== link.pubkey);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([link, ...list].slice(0, 50)));
  } catch {
    // приватный режим — ссылку всё равно покажем на экране
  }
}
