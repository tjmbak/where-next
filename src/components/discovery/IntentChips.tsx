"use client";

import { BUDGET_LABELS, GENRE_LABELS, VIBE_LABELS, getMonthLabel } from "@/data/taxonomy";
import type { SearchIntent } from "@/lib/search-intent";

type IntentChipsProps = {
  intent: SearchIntent;
  onClear: () => void;
};

function citationHost(url: string): string {
  if (url.startsWith("/")) return "where next";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function isInternal(url: string): boolean {
  return url.startsWith("/");
}

export function IntentChips({ intent, onClear }: IntentChipsProps) {
  const chips: Array<{ key: string; label: string }> = [];
  if (intent.month) {
    chips.push({ key: "month", label: getMonthLabel(intent.month) });
  }
  if (intent.stayLength && intent.stayLength > 1) {
    chips.push({ key: "stay", label: `${intent.stayLength} months` });
  }
  if (intent.budget) {
    chips.push({ key: "budget", label: `${BUDGET_LABELS[intent.budget]} budget` });
  }
  if (intent.genre) {
    chips.push({ key: "genre", label: GENRE_LABELS[intent.genre] });
  }
  if (intent.vibe) {
    chips.push({ key: "vibe", label: VIBE_LABELS[intent.vibe] });
  }
  if (intent.region) {
    chips.push({ key: "region", label: intent.region });
  }
  if (intent.cityFocus) {
    chips.push({ key: "city", label: `Near ${intent.cityFocus}` });
  }
  if (intent.artist) {
    chips.push({ key: "artist", label: `Following ${intent.artist}` });
  }

  const hasDiscovery = !!intent.discovery && intent.discovery.summary.length > 0;
  const noChips = chips.length === 0 && !hasDiscovery;

  return (
    <section className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="min-w-0 text-[14px] text-[var(--foreground)]">
          <span className="text-[var(--muted)]">Results for</span>{" "}
          <span className="font-semibold">&ldquo;{intent.query}&rdquo;</span>
        </p>
        {noChips ? (
          <span className="text-[13px] text-[var(--muted)]">
            We couldn&rsquo;t pick out a month or sound. Try &ldquo;july beach with afro house&rdquo;.
          </span>
        ) : (
          <ul className="flex flex-wrap items-center gap-1.5">
            {chips.map((chip) => (
              <li
                key={chip.key}
                className="inline-flex h-7 items-center rounded-full bg-[var(--signal)]/10 px-3 text-[13px] font-medium text-[var(--signal)]"
              >
                {chip.label}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={onClear}
          className="ml-auto text-[13px] font-medium text-[var(--muted)] underline underline-offset-4 transition hover:text-[var(--foreground)]"
        >
          Clear search
        </button>
      </div>

      {hasDiscovery && intent.discovery ? (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <p className="text-[14px] leading-6 text-[var(--foreground)]/90">
            {intent.discovery.summary}
          </p>
          {intent.discovery.citations.length > 0 ? (
            <ul className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <li className="text-[12px] text-[var(--muted)]">Sources</li>
              {intent.discovery.citations.map((cite) => {
                const internal = isInternal(cite.url);
                return (
                  <li key={cite.url}>
                    <a
                      href={cite.url}
                      target={internal ? "_self" : "_blank"}
                      rel={internal ? undefined : "noreferrer"}
                      title={cite.title ?? cite.url}
                      className="inline-flex h-7 items-center gap-1 rounded-full border border-[var(--border-strong)] px-2.5 text-[12px] text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                    >
                      <span aria-hidden>{internal ? "→" : "↗"}</span>
                      {citationHost(cite.url)}
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
