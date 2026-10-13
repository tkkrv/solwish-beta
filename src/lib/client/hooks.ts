'use client';

import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/** true только в браузере после гидрации (без setState в эффектах). */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

function subscribeHash(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

/** Текущий #фрагмент адреса (на сервере — пустая строка). */
export function useLocationHash(): string {
  return useSyncExternalStore(
    subscribeHash,
    () => window.location.hash,
    () => ''
  );
}

/** Текущий адрес страницы (на сервере — пустая строка). */
export function useLocationHref(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.href,
    () => ''
  );
}
