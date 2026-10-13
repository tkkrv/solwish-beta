import 'server-only';
import {
  ComputeBudgetProgram,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { GIFT_TX_COMPUTE_UNITS, LIMITS, MEMO_PROGRAM_ID } from '../config';
import { buildWishMemo } from '../memo';
import { utf8Bytes } from '../validation';
import { getConnection } from './chain';
import type { Wish } from '../types';

export class GiftInputError extends Error {}

/**
 * Атомарная транзакция: перевод SOL получателю вишлиста + SPL Memo с открыткой.
 * Получатель берётся ТОЛЬКО из базы, параметры из URL на него не влияют.
 */
export async function buildGiftTransaction(opts: {
  wish: Wish;
  sender: PublicKey;
  amountSol: number;
  senderName: string;
  message: string;
}) {
  const { wish, sender, amountSol } = opts;
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);
  if (!Number.isSafeInteger(lamports) || lamports <= 0) {
    throw new GiftInputError('invalid_amount');
  }

  const memo = buildWishMemo(wish.id, opts.senderName, opts.message);
  if (utf8Bytes(memo) > LIMITS.memoMaxBytes) {
    throw new GiftInputError('memo_too_long');
  }

  const recipient = new PublicKey(wish.recipientWallet);

  const { blockhash, lastValidBlockHeight } =
    await getConnection().getLatestBlockhash('confirmed');

  const tx = new Transaction({ feePayer: sender, blockhash, lastValidBlockHeight }).add(
    // Memo с кириллицей может съесть больше стандартных 200k compute units.
    ComputeBudgetProgram.setComputeUnitLimit({ units: GIFT_TX_COMPUTE_UNITS }),
    SystemProgram.transfer({ fromPubkey: sender, toPubkey: recipient, lamports }),
    new TransactionInstruction({
      keys: [{ pubkey: sender, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(memo, 'utf-8'),
    })
  );

  return { transaction: tx, memo, lastValidBlockHeight };
}
