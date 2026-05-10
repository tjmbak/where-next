"use client";

import { useState } from "react";

export function ConciergeForm() {
  const [whoFor, setWhoFor] = useState("");
  const [genres, setGenres] = useState("");
  const [windows, setWindows] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    const response = await fetch("/api/concierge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        brief: { whoFor, genres, windows, budget, notes }
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Could not start your brief. Please try again.");
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
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <Field label="who is this trip for">
        <input
          required
          value={whoFor}
          onChange={(event) => setWhoFor(event.target.value)}
          placeholder="Group of 4 friends, mid-30s"
          className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[14px] outline-none focus:border-[var(--foreground)]"
        />
      </Field>
      <Field label="scenes you care about">
        <input
          required
          value={genres}
          onChange={(event) => setGenres(event.target.value)}
          placeholder="Techno, Afro-house, club nights"
          className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[14px] outline-none focus:border-[var(--foreground)]"
        />
      </Field>
      <Field label="when can you travel">
        <input
          required
          value={windows}
          onChange={(event) => setWindows(event.target.value)}
          placeholder="Late July, anytime in September"
          className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[14px] outline-none focus:border-[var(--foreground)]"
        />
      </Field>
      <Field label="all-in budget per person">
        <input
          required
          value={budget}
          onChange={(event) => setBudget(event.target.value)}
          placeholder="$2,500"
          className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[14px] outline-none focus:border-[var(--foreground)]"
        />
      </Field>
      <Field label="anything else">
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-[14px] outline-none focus:border-[var(--foreground)]"
          placeholder="Group is mostly vegetarian. We've done Ibiza twice, want something fresh."
        />
      </Field>

      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "preparing checkout…" : "continue to checkout · $199"}
        <span aria-hidden>→</span>
      </button>
      {error ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--signal)]">{error}</p>
      ) : null}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}
