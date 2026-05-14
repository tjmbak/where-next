"use client";

import { useEffect } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  reason?: string;
};

export function AuthModal({ open, onClose, reason }: AuthModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 px-4 pb-4 pt-12 sm:items-center sm:px-6 sm:pb-0 sm:pt-0"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[calc(100dvh-4rem)] w-full max-w-[440px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">save and personalize</p>
            <h2 id="auth-modal-title" className="mt-2 text-2xl font-medium tracking-[-0.02em] text-[var(--foreground)]">
              {reason ?? "One link, no password."}
            </h2>
            <p className="mt-3 text-[14px] leading-6 text-[var(--muted)]">
              Sign in to save trips across devices and get the monthly drop tuned to your scenes.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            esc
          </button>
        </div>

        <div className="mt-6">
          <LoginForm compact />
        </div>
      </div>
    </div>
  );
}
