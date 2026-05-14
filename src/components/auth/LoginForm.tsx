"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type LoginFormProps = {
  next?: string;
  initialError?: string;
  compact?: boolean;
  onSent?: () => void;
};

export function LoginForm({ next, initialError, compact, onSent }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    initialError ? "error" : "idle"
  );
  const [message, setMessage] = useState<string>(initialError ?? "");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus("error");
      setMessage("Auth is not configured. Add Supabase environment variables to enable sign-in.");
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo
      }
    });

    if (error) {
      setStatus("error");
      setMessage(error.message ?? "Could not send the link. Please try again.");
      return;
    }

    setStatus("sent");
    setMessage("Check your email for the link.");
    onSent?.();
  }

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-4" : "space-y-6"}>
      <label className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">email</span>
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={status === "loading" || status === "sent"}
          className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[16px] text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-2)] focus:border-[var(--foreground)] disabled:opacity-60"
        />
      </label>

      <button
        type="submit"
        disabled={status === "loading" || status === "sent"}
        className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "sending…" : status === "sent" ? "link sent" : "send magic link"}
        <span aria-hidden className="font-mono text-xs transition group-hover:translate-x-0.5">→</span>
      </button>

      {message ? (
        <p
          className={`font-mono text-[11px] uppercase tracking-[0.18em] ${
            status === "error" ? "text-[var(--signal)]" : "text-[var(--muted)]"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
