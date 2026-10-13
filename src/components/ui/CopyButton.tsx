'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';

export default function CopyButton({
  value,
  className = 'btn-secondary',
  label,
}: {
  value: string;
  className?: string;
  label?: string;
}) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Старые браузеры / встроенные webview
      const area = document.createElement('textarea');
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button type="button" onClick={copy} className={className}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? t.common.copied : label || t.common.copy}
    </button>
  );
}
