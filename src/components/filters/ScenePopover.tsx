"use client";

import { useEffect, useRef, useState } from "react";
import { GENRE_LABELS, VIBE_LABELS } from "@/data/taxonomy";
import type { Genre, Vibe } from "@/types/content";

type SceneValue = {
  genre: Genre | "all";
  vibe: Vibe | "all";
};

type ScenePopoverProps = {
  value: SceneValue;
  onChange: (next: SceneValue) => void;
};

const GENRE_OPTIONS = Object.keys(GENRE_LABELS) as Genre[];
const VIBE_OPTIONS = Object.keys(VIBE_LABELS) as Vibe[];

export function ScenePopover({ value, onChange }: ScenePopoverProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const isDirty = value.genre !== "all" || value.vibe !== "all";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const summary = (() => {
    const parts: string[] = [];
    if (value.genre !== "all") parts.push(GENRE_LABELS[value.genre].toLowerCase());
    if (value.vibe !== "all") parts.push(VIBE_LABELS[value.vibe].toLowerCase());
    return parts.length === 0 ? "all" : parts.join(" · ");
  })();

  function pickGenre(next: Genre | "all") {
    onChange({ ...value, genre: next });
  }

  function pickVibe(next: Vibe | "all") {
    onChange({ ...value, vibe: next });
  }

  function handleClear(event: React.MouseEvent | React.KeyboardEvent) {
    event.stopPropagation();
    onChange({ genre: "all", vibe: "all" });
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
          isDirty
            ? "border-[var(--signal)]/55 bg-[var(--signal)]/10 text-[var(--foreground)] hover:border-[var(--signal)]"
            : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
        }`}
      >
        <span className="text-[var(--muted)]">scene</span>
        <span className="text-[var(--foreground)]">{summary}</span>
        {isDirty ? (
          <span
            role="button"
            aria-label="clear scene filter"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleClear(event);
              }
            }}
            className="-mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-[var(--signal)]/20 hover:text-[var(--signal)]"
          >
            ×
          </span>
        ) : (
          <span aria-hidden className="text-[var(--muted-2)]">▾</span>
        )}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="scene options"
          className="absolute left-0 z-[700] mt-2 w-[min(360px,calc(100vw-2rem))] rounded-md border border-[var(--border-strong)] bg-[var(--surface)] py-3 shadow-[0_24px_64px_rgba(0,0,0,0.55)] backdrop-blur-md"
        >
          <Section title="sound">
            <ChipRow>
              <Chip
                label="all"
                active={value.genre === "all"}
                onClick={() => pickGenre("all")}
              />
              {GENRE_OPTIONS.map((g) => (
                <Chip
                  key={g}
                  label={GENRE_LABELS[g]}
                  active={value.genre === g}
                  onClick={() => pickGenre(g)}
                />
              ))}
            </ChipRow>
          </Section>
          <Section title="vibe">
            <ChipRow>
              <Chip
                label="all"
                active={value.vibe === "all"}
                onClick={() => pickVibe("all")}
              />
              {VIBE_OPTIONS.map((v) => (
                <Chip
                  key={v}
                  label={VIBE_LABELS[v]}
                  active={value.vibe === v}
                  onClick={() => pickVibe(v)}
                />
              ))}
            </ChipRow>
          </Section>
          <div className="mt-1 flex items-center justify-between gap-2 border-t border-[var(--border)] px-4 pt-3">
            <button
              type="button"
              onClick={handleClear}
              className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              clear scene
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--background)] transition hover:bg-transparent hover:text-[var(--foreground)]"
            >
              done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 px-4">
      <h4 className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
        {title}
      </h4>
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function Chip({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
        active
          ? "border-[var(--signal)]/60 bg-[var(--signal)]/15 text-[var(--foreground)]"
          : "border-[var(--border-strong)] bg-transparent text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
      }`}
    >
      {label.toLowerCase()}
    </button>
  );
}
