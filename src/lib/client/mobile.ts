export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** Уже внутри браузера кошелька (Phantom/Solflare/Backpack)? */
export function isInWalletBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.phantom || w.solflare || w.backpack || (w.solana as { isPhantom?: boolean })?.isPhantom);
}

/** Deeplink: открыть страницу во встроенном браузере кошелька. */
export function phantomBrowseUrl(url: string): string {
  const ref = new URL(url).origin;
  return `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(ref)}`;
}

export function solflareBrowseUrl(url: string): string {
  const ref = new URL(url).origin;
  return `https://solflare.com/ul/v1/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(ref)}`;
}
