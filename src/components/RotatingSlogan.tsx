'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/** Подписка на media query без setState в эффектах. serverValue — значение до гидрации. */
function useMedia(query: string, serverValue: boolean): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => serverValue
  );
}

/** Сколько строк заголовка можно отдать под меняющуюся фразу. */
const MAX_LINES = 2;

/**
 * Первая половина слогана, которая меняется раз в несколько секунд («Цветы завянут.» → «Торт съедят.» → …).
 *
 * Невидимый измеритель с теми же шрифтом и шириной проверяет, какие фразы помещаются в 2 строки
 * на текущем экране (и пересчитывает при повороте, ресайзе и загрузке шрифта). В ротацию идут только они,
 * поэтому заголовок не прыгает и над короткими фразами нет пустого места.
 * Первой всегда идёт items[0]; при «уменьшить движение» показывается только она.
 */
export default function RotatingSlogan({ items, interval = 2600 }: { items: string[]; interval?: number }) {
  const reduced = useMedia('(prefers-reduced-motion: reduce)', true);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [fits, setFits] = useState<number[]>([0]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const box = measureRef.current;
    if (!box) return;
    const measure = () => {
      const lh = parseFloat(getComputedStyle(box).lineHeight) || 1;
      const ok = [...box.children]
        .map((el, i) => ((el as HTMLElement).offsetHeight <= lh * MAX_LINES + 2 ? i : -1))
        .filter((i) => i >= 0);
      const next = ok.includes(0) ? ok : [0, ...ok];
      setFits((prev) => (prev.join() === next.join() ? prev : next));
    };
    const ro = new ResizeObserver(measure);
    for (const el of box.children) ro.observe(el);
    return () => ro.disconnect();
  }, [items]);

  const list = fits.map((i) => items[i]).filter(Boolean);

  useEffect(() => {
    if (reduced || list.length < 2) return;
    const id = setInterval(() => setTick((n) => n + 1), interval);
    return () => clearInterval(id);
  }, [reduced, list.length, interval]);

  const active = reduced ? 0 : tick % list.length;

  return (
    <span className="relative block" aria-hidden="true">
      {/* Измеритель: все фразы столбиком, невидимо и без влияния на вёрстку. */}
      <span ref={measureRef} className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden">
        {items.map((text, i) => (
          <span key={i} className="block">
            {text}
          </span>
        ))}
      </span>
      <span className="grid">
        {list.map((text, i) => (
          <span
            key={text}
            className={`[grid-area:1/1] self-end transition-all duration-500 ease-out ${
              i === active ? 'translate-y-0 opacity-100' : 'pointer-events-none invisible translate-y-3 select-none opacity-0'
            }`}
          >
            {text}
          </span>
        ))}
      </span>
    </span>
  );
}
