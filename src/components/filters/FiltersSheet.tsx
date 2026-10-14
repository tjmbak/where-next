"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { BUDGET_LABELS, GENRE_LABELS, REGIONS, VIBE_LABELS } from "@/data/taxonomy";
import type { Budget, DiscoveryFilters, Genre, Region, Vibe } from "@/types/content";

type FiltersSheetProps = {
  open: boolean;
  onClose: () => void;
  value: DiscoveryFilters;
  onChange: (next: DiscoveryFilters) => void;
  onClearAll: () => void;
  resultCount: number;
};

const GENRES = Object.keys(GENRE_LABELS) as Genre[];
const VIBES = Object.keys(VIBE_LABELS) as Vibe[];

export const BUDGET_NAMES: Record<Budget, string> = {
  low: "Budget",
  medium: "Mid-range",
  high: "Upscale",
  luxury: "Luxury"
};

const BUDGET_HINTS: Record<Budget, string> = {
  low: "Hostels, street food",
  medium: "Good hotels, nice dinners",
  high: "Boutique stays, tables",
  luxury: "Five-star, VIP"
};

const STAY_OPTIONS: Array<{ value: 1 | 2 | 3; label: string }> = [
  { value: 1, label: "Just this month" },
  { value: 2, label: "2 months" },
  { value: 3, label: "3 months" }
];

export function countActiveFilters(value: DiscoveryFilters) {
  return (
    [value.genre, value.vibe, value.budget, value.region].filter((v) => v && v !== "all").length +
    ((value.stayLength ?? 1) > 1 ? 1 : 0)
  );
}

export function FiltersSheet({ open, onClose, value, onChange, onClearAll, resultCount }: FiltersSheetProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const activeCount = countActiveFilters(value);
  const stayLength = (value.stayLength ?? 1) as 1 | 2 | 3;

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const toggle = <K extends "genre" | "vibe" | "budget" | "region">(field: K, next: string) => {
    onChange({ ...value, [field]: value[field] === next ? "all" : next });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[900] flex items-end justify-center bg-black/45 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        tabIndex={-1}
        className="wn-sheet-in flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-[var(--background)] shadow-[0_30px_80px_-20px_rgba(28,22,18,0.5)] focus:outline-none sm:max-h-[86vh] sm:max-w-[620px] sm:rounded-[28px]"
      >
        <header className="relative flex h-14 shrink-0 items-center justify-center border-b border-[var(--border)]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="absolute left-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <h2 className="text-[16px] font-semibold text-[var(--foreground)]">Filters</h2>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6">
          <Section title="Sound" hint="What do you want to hear?">
            <ChipGrid>
              {GENRES.map((genre) => (
                <Chip key={genre} active={value.genre === genre} onClick={() => toggle("genre", genre)}>
                  {GENRE_LABELS[genre]}
                </Chip>
              ))}
            </ChipGrid>
          </Section>

          <Section title="Vibe" hint="The kind of nights and days you're after.">
            <ChipGrid>
              {VIBES.map((vibe) => (
                <Chip key={vibe} active={value.vibe === vibe} onClick={() => toggle("vibe", vibe)}>
                  {VIBE_LABELS[vibe]}
                </Chip>
              ))}
            </ChipGrid>
          </Section>

          <Section title="Budget" hint="Typical daily spend in the city.">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {(Object.keys(BUDGET_LABELS) as Budget[]).map((budget) => {
                const active = value.budget === budget;
                return (
                  <button
                    key={budget}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle("budget", budget)}
                    className={`flex flex-col items-start rounded-2xl border px-4 py-3 text-left transition active:scale-[0.98] ${
                      active
                        ? "border-[var(--foreground)] bg-[var(--surface-2)] shadow-[inset_0_0_0_1px_var(--foreground)]"
                        : "border-[var(--border-strong)] hover:border-[var(--foreground)]"
                    }`}
                  >
                    <span className="text-[17px] font-semibold tracking-[0.02em] text-[var(--foreground)]">
                      {BUDGET_LABELS[budget]}
                    </span>
                    <span className="mt-0.5 text-[14px] font-medium text-[var(--foreground)]">{BUDGET_NAMES[budget]}</span>
                    <span className="text-[12px] leading-4 text-[var(--muted)]">{BUDGET_HINTS[budget]}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Region">
            <ChipGrid>
              {(REGIONS as Region[]).map((region) => (
                <Chip key={region} active={value.region === region} onClick={() => toggle("region", region)}>
                  {region}
                </Chip>
              ))}
            </ChipGrid>
          </Section>

          <Section title="Trip window" hint="Travelling across more than one month? We'll rank cities over the whole stretch." last>
            <div className="inline-flex w-full rounded-full border border-[var(--border-strong)] p-1 sm:w-auto">
              {STAY_OPTIONS.map((option) => {
                const active = stayLength === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onChange({ ...value, stayLength: option.value })}
                    className={`h-9 flex-1 whitespace-nowrap rounded-full px-4 text-[14px] font-medium transition sm:flex-none ${
                      active
                        ? "bg-[var(--foreground)] text-[var(--background)]"
                        : "text-[var(--foreground)]/75 hover:text-[var(--foreground)]"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </Section>
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-[var(--border)] px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4">
          <button
            type="button"
            onClick={onClearAll}
            disabled={activeCount === 0}
            className="text-[15px] font-semibold text-[var(--foreground)] underline underline-offset-4 transition disabled:cursor-not-allowed disabled:text-[var(--muted-2)] disabled:no-underline"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-12 items-center rounded-xl bg-[var(--foreground)] px-6 text-[15px] font-semibold text-[var(--background)] transition hover:opacity-90 active:scale-[0.98]"
          >
            {resultCount === 0 ? "No cities match" : `Show ${resultCount} ${resultCount === 1 ? "city" : "cities"}`}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

function Section({
  title,
  hint,
  last = false,
  children
}: {
  title: string;
  hint?: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`py-6 ${last ? "" : "border-b border-[var(--border)]"}`}>
      <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-[var(--foreground)]">{title}</h3>
      {hint ? <p className="mt-0.5 text-[14px] text-[var(--muted)]">{hint}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ChipGrid({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-10 rounded-full border px-4 text-[14px] transition active:scale-95 ${
        active
          ? "border-[var(--foreground)] bg-[var(--foreground)] font-medium text-[var(--background)]"
          : "border-[var(--border-strong)] text-[var(--foreground)] hover:border-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}
