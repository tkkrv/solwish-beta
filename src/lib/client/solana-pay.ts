/**
 * Solana Pay transfer request: solana:<recipient>?amount=&reference=&label=&message=&memo=
 * Кошелёк сам добавит SPL Memo из параметра memo — открытка будет такой же, как при оплате с сайта.
 * https://docs.solanapay.com/spec
 */
export function buildTransferRequestUrl(opts: {
  recipient: string;
  amount: number;
  reference: string;
  label: string;
  message: string;
  memo: string;
}): string {
  const params = new URLSearchParams();
  params.set('amount', opts.amount.toFixed(9).replace(/\.?0+$/, ''));
  params.set('reference', opts.reference);
  params.set('label', opts.label);
  params.set('message', opts.message);
  params.set('memo', opts.memo);
  // URLSearchParams кодирует пробелы как "+", Solana Pay ожидает %20.
  return `solana:${opts.recipient}?${params.toString().replace(/\+/g, '%20')}`;
}
