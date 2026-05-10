"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PromoterClaimForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    const response = await fetch("/api/partners/promoter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, city, country, contactEmail })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setStatus("error");
      setError(body?.error ?? "Could not submit. Please try again.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <Field label="promoter name">
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Studio Festival Productions"
          className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[14px] outline-none focus:border-[var(--foreground)]"
        />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="primary city">
          <input
            required
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Berlin"
            className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[14px] outline-none focus:border-[var(--foreground)]"
          />
        </Field>
        <Field label="country">
          <input
            value={country}
            onChange={(event) => setCountry(event.target.value)}
            placeholder="Germany"
            className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[14px] outline-none focus:border-[var(--foreground)]"
          />
        </Field>
      </div>
      <Field label="contact email">
        <input
          required
          type="email"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          placeholder="bookings@example.com"
          className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[14px] outline-none focus:border-[var(--foreground)]"
        />
      </Field>

      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "submitting…" : "request access"}
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
