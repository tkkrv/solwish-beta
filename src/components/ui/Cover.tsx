'use client';

import { useState } from 'react';
import { DEFAULT_COVER } from '@/lib/covers';

/**
 * Обложка вишлиста с запасным вариантом, если внешняя картинка не загрузилась.
 * Картинка берётся прямо из `src`, поэтому превью сразу меняется при выборе другой обложки;
 * в состоянии хранится только адрес, который не загрузился.
 */
export default function Cover({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const current = !src || failed === src ? DEFAULT_COVER : src;
  return (
    <img
      key={current}
      src={current}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => current !== DEFAULT_COVER && setFailed(src)}
    />
  );
}
