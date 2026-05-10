"use client";

import { useState } from "react";
import { GENRE_LABELS } from "@/data/taxonomy";
import { trackEvent } from "@/lib/analytics";
import type { Genre } from "@/types/content";

const genreOptions = Object.keys(GENRE_LABELS).slice(0, 8) as Genre[];

export function WaitlistSection() {
  const [email, setEmail] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const response = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, homeCity, favoriteGenres: selectedGenres })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setStatus("error");
      setMessage(body?.error ?? "Something went wrong. Please try again.");
      return;
    }

    trackEvent("waitlist_signup", { homeCity, genreCount: selectedGenres.length });
    setStatus("success");
    setMessage("you are on the list. drops will arrive monthly.");
    setEmail("");
    setHomeCity("");
    setSelectedGenres([]);
  }

  function toggleGenre(genre: Genre) {
    setSelectedGenres((current) =>
      current.includes(genre) ? current.filter((item) => item !== genre) : [...current, genre]
    );
  }

  return (
    <section id="waitlist" className="mx-auto w-full max-w-[1180px] px-6 pb-20 sm:px-10">
      <div className="grid gap-12 border-t border-[var(--border)] pt-16 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">launch alerts</p>
          <h2 className="mt-4 text-[clamp(2.25rem,4.5vw,3.5rem)] font-medium leading-[1.02] tracking-[-0.03em] text-[var(--foreground)]">
            Get monthly music-travel drops.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-7 text-[var(--muted)]">
            Join the beta list for new destination heat reports, scene drops, and curated event windows before peak
            travel dates get expensive.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="email">
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[15px] text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-2)] focus:border-[var(--foreground)]"
              />
            </Field>
            <Field label="home city">
              <input
                value={homeCity}
                onChange={(event) => setHomeCity(event.target.value)}
                placeholder="London"
                className="w-full border-b border-[var(--border)] bg-transparent pb-2 text-[15px] text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-2)] focus:border-[var(--foreground)]"
              />
            </Field>
          </div>

          <Field label="favorite scenes">
            <div className="mt-1 flex flex-wrap gap-2">
              {genreOptions.map((genre) => {
                const active = selectedGenres.includes(genre);
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition ${
                      active
                        ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                        : "border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {GENRE_LABELS[genre]}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={status === "loading"}
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "joining…" : "join waitlist"}
              <span aria-hidden className="font-mono text-xs transition group-hover:translate-x-0.5">
                →
              </span>
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
          </div>
        </form>
      </div>
    </section>
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
