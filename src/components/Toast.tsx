'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { CircleAlert, CircleCheck, X } from 'lucide-react';

type ToastKind = 'error' | 'success';
interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
}

const ToastContext = createContext<(text: string, kind?: ToastKind) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((text: string, kind: ToastKind = 'error') => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list.slice(-2), { id, kind, text }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 6000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex w-full max-w-md animate-fade-up items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-card ${
              t.kind === 'error'
                ? 'border-danger/20 bg-danger-soft text-danger'
                : 'border-mint/20 bg-mint-soft text-mint'
            }`}
          >
            {t.kind === 'error' ? (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span className="flex-1 font-medium">{t.text}</span>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setItems((list) => list.filter((x) => x.id !== t.id))}
              className="opacity-60 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
