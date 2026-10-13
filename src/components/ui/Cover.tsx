'use client';

import { useState } from 'react';
import { DEFAULT_COVER } from '@/lib/covers';

/** Обложка вишлиста с запасным вариантом, если внешняя картинка не загрузилась. */
export default function Cover({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [current, setCurrent] = useState(src || DEFAULT_COVER);
  return (
    <img
      src={current}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => current !== DEFAULT_COVER && setCurrent(DEFAULT_COVER)}
    />
  );
}
