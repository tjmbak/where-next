"use client";

// Minimal single-slot toast: confirms meaningful actions (save, watch,
// compare) with a next step or undo. One toast at a time — a new one
// replaces the current. Auto-dismisses; hover pauses.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from "react";

export type ToastInput = {
  message: string;
  /** Optional action rendered as a small button (e.g. undo, sign in). */
  action?: { label: string; onClick: () => void };
  /** Optional href action (takes precedence over onClick action). */
  link?: { label: string; href: string };
  durationMs?: number;
};

type ToastContextValue = {
  toast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue | null {
  return useContext(ToastContext);
}

type ActiveToast = ToastInput & { id: number };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveToast | null>(null);
  const timerRef = useRef<number | null>(null);
  const idRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const dismiss = useCallback(() => {
    clearTimer();
    setActive(null);
  }, [clearTimer]);

  const startTimer = useCallback(
    (duration: number) => {
      clearTimer();
      timerRef.current = window.setTimeout(() => setActive(null), duration);
    },
    [clearTimer]
  );

  const toast = useCallback(
    (input: ToastInput) => {
      idRef.current += 1;
      setActive({ ...input, id: idRef.current });
      startTimer(input.durationMs ?? 4200);
    },
    [startTimer]
  );

  useEffect(() => clearTimer, [clearTimer]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-[80] md:bottom-5 flex justify-center px-4"
      >
        {active ? (
          <div
            key={active.id}
            onMouseEnter={clearTimer}
            onMouseLeave={() => startTimer(1800)}
            className="wn-toast-in pointer-events-auto flex max-w-[92vw] items-center gap-3 rounded-full border border-[var(--border-strong)] bg-[var(--foreground)] py-2.5 pl-5 pr-2.5 shadow-[0_16px_48px_rgba(28,22,18,0.35)]"
          >
            <p className="text-[13px] leading-5 text-[var(--background)]">{active.message}</p>
            {active.link ? (
              <a
                href={active.link.href}
                onClick={dismiss}
                className="shrink-0 rounded-full bg-[var(--background)]/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--background)] transition hover:bg-[var(--background)]/25"
              >
                {active.link.label}
              </a>
            ) : active.action ? (
              <button
                type="button"
                onClick={() => {
                  active.action?.onClick();
                  dismiss();
                }}
                className="shrink-0 rounded-full bg-[var(--background)]/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--background)] transition hover:bg-[var(--background)]/25"
              >
                {active.action.label}
              </button>
            ) : null}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={dismiss}
              className="shrink-0 rounded-full px-1.5 font-mono text-[12px] text-[var(--background)]/60 transition hover:text-[var(--background)]"
            >
              ✕
            </button>
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
