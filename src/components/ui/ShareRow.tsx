'use client';

import { Share2 } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M21.94 4.3 18.7 19.6c-.24 1.08-.88 1.35-1.79.84l-4.94-3.64-2.38 2.3c-.26.26-.49.49-1 .49l.36-5.03 9.15-8.27c.4-.35-.09-.55-.62-.2L6.17 13.2l-4.87-1.52c-1.06-.33-1.08-1.06.22-1.57L20.6 2.77c.88-.33 1.65.2 1.34 1.53Z" />
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.98.58 3.86 1.69 5.48L2 22l4.78-1.78a9.9 9.9 0 0 0 5.26 1.57c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm5.79 14.12c-.24.68-1.4 1.25-1.92 1.33-.51.08-1.17.11-1.89-.12-.44-.14-1.01-.33-1.74-.65-3.07-1.34-5.07-4.46-5.23-4.67-.15-.21-1.25-1.66-1.25-3.17s.79-2.25 1.07-2.56c.28-.31.62-.39.83-.39l.59.01c.19.01.44-.07.69.52.25.6.86 2.09.93 2.24.08.15.13.33.03.53-.1.21-.15.34-.3.51-.15.18-.32.4-.46.54-.15.15-.31.32-.13.63.18.31.8 1.32 1.72 2.14 1.18 1.05 2.18 1.38 2.49 1.53.31.15.49.13.67-.08.19-.21.79-.92 1-1.23.21-.31.42-.26.7-.15.28.1 1.77.84 2.08.99.31.15.51.23.59.36.07.13.07.74-.17 1.42Z" />
    </svg>
  );
}

/** Кнопки «поделиться» в X, Telegram, WhatsApp и системное меню. */
export default function ShareRow({ url, text }: { url: string; text: string }) {
  const { t } = useLanguage();
  const open = (href: string) => window.open(href, '_blank', 'noopener,noreferrer');
  const native = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SolWish', text, url });
      } catch {
        // пользователь закрыл меню
      }
    } else {
      open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
    }
  };
  const item = 'btn-secondary flex-1 px-3 py-2 text-sm';

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={item}
        onClick={() =>
          open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`)
        }
      >
        <XIcon /> X
      </button>
      <button
        type="button"
        className={item}
        onClick={() =>
          open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`)
        }
      >
        <TelegramIcon /> Telegram
      </button>
      <button
        type="button"
        className={item}
        onClick={() => open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`${text}\n${url}`)}`)}
      >
        <WhatsAppIcon /> WhatsApp
      </button>
      <button type="button" className={item} onClick={native} aria-label={t.common.share}>
        <Share2 className="h-4 w-4" />
      </button>
    </div>
  );
}
