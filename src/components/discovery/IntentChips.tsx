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
    chips.push({ key: "month", label: getMonthLabel(intent.month).toLowerCase() });
  }
  if (intent.stayLength && intent.stayLength > 1) {
    chips.push({ key: "stay", label: `${intent.stayLength} months` });
  }
  if (intent.budget) {
    chips.push({ key: "budget", label: `${BUDGET_LABELS[intent.budget]} ${intent.budget}` });
  }
  if (intent.genre) {
    chips.push({ key: "genre", label: GENRE_LABELS[intent.genre].toLowerCase() });
  }
  if (intent.vibe) {
    chips.push({ key: "vibe", label: VIBE_LABELS[intent.vibe].toLowerCase() });
  }
  if (intent.region) {
    chips.push({ key: "region", label: intent.region.toLowerCase() });
  }
  if (intent.cityFocus) {
    chips.push({ key: "city", label: `near ${intent.cityFocus}` });
  }
  if (intent.artist) {
    chips.push({ key: "artist", label: `tracking ${intent.artist.toLowerCase()}` });
  }

  const sourceLabel = intent.source === "llm" ? "ai read" : "smart read";
  const hasDiscovery = !!intent.discovery && intent.discovery.summary.length > 0;
  const noChips = chips.length === 0 && !hasDiscovery;

  return (
    <section className="mt-6 rounded-md border border-[var(--signal)]/35 bg-[var(--signal)]/10 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
          {sourceLabel}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
          &ldquo;{intent.query}&rdquo;
        </span>
        {noChips ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
            · no clear intent · try natural language like &ldquo;july beach with afro house&rdquo;
          </span>
        ) : (
          <span aria-hidden className="text-[var(--muted-2)]">·</span>
        )}
        <ul className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <li
              key={chip.key}
              className="rounded-full border border-[var(--signal)]/55 bg-[var(--signal)]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--signal)]"
            >
              {chip.label}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClear}
          className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          <span aria-hidden>×</span> dismiss
        </button>
      </div>

      {hasDiscovery && intent.discovery ? (
        <div className="mt-2 border-t border-[var(--signal)]/20 pt-2">
          <p className="text-[13px] leading-snug text-[var(--foreground)]/90">
            {intent.discovery.summary}
          </p>
          {intent.discovery.citations.length > 0 ? (
            <ul className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <li className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
                sources ·
              </li>
              {intent.discovery.citations.map((cite) => {
                const internal = isInternal(cite.url);
                return (
                  <li key={cite.url}>
                    <a
                      href={cite.url}
                      target={internal ? "_self" : "_blank"}
                      rel={internal ? undefined : "noreferrer"}
                      title={cite.title ?? cite.url}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] transition hover:border-[var(--signal)]/55 hover:text-[var(--foreground)]"
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
