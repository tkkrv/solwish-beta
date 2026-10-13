'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QrCode({
  value,
  size = 220,
  label,
}: {
  value: string;
  size?: number;
  label?: string;
}) {
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    let alive = true;
    QRCode.toString(value, {
      type: 'svg',
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0B1220', light: '#FFFFFF' },
    })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''));
    return () => {
      alive = false;
    };
  }, [value]);

  return (
    <div
      role="img"
      aria-label={label || 'QR code'}
      style={{ width: size, height: size }}
      className="overflow-hidden rounded-2xl border border-line bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
