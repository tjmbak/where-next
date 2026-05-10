"use client";

import { useState } from "react";

export function MembershipCheckoutButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setStatus("loading");
    setError(null);
    const response = await fetch("/api/billing/subscribe", { method: "POST" });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Could not start checkout. Please try again.");
      setStatus("error");
      return;
    }
    const body = (await response.json()) as { url?: string };
    if (body.url) {
      window.location.href = body.url;
      return;
    }
    setStatus("idle");
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "preparing checkout…" : "start pro · $12 / month"}
        <span aria-hidden>→</span>
      </button>
      {error ? (
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--signal)]">{error}</p>
      ) : null}
    </div>
  );
}
