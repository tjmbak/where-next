"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchAction, SearchResult, SearchResultType } from "@/lib/search";
import { searchUniverse } from "@/lib/search";

type UniversalSearchProps = {
  onApply: (action: SearchAction, query: string) => void;
};

const TYPE_LABELS: Record<SearchResultType, string> = {
  destination: "city",
  event: "event",
  genre: "scene",
  vibe: "vibe"
};

export function UniversalSearch({ onApply }: UniversalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const results = useMemo<SearchResult[]>(() => searchUniverse(query, 8), [query]);

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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (isMod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openMenu();
      } else if (event.key === "/" && !isInputElement(event.target)) {
        event.preventDefault();
        openMenu();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function openMenu() {
    setOpen(true);
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function updateQuery(next: string) {
    setQuery(next);
    setActiveIndex(0);
  }

  function pickResult(result: SearchResult) {
    onApply(result.apply, query);
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    triggerRef.current?.focus();
  }

  function handleInputKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const result = results[activeIndex];
      if (result) pickResult(result);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="group inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
      >
        <span aria-hidden className="text-[var(--muted-2)]">⌕</span>
        <span>search</span>
        <span className="hidden items-center gap-1 sm:inline-flex">
          <kbd className="rounded border border-[var(--border)] bg-[var(--surface-2)] px-1 py-px font-mono text-[9px] tracking-normal text-[var(--muted-2)]">
            ⌘K
          </kbd>
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="search where next"
          className="absolute left-0 z-[700] mt-2 w-[min(92vw,480px)] overflow-hidden rounded-md border border-[var(--border-strong)] bg-[var(--surface)] shadow-[0_24px_64px_rgba(0,0,0,0.55)] backdrop-blur-md"
        >
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
            <span aria-hidden className="text-[var(--muted-2)]">⌕</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              onKeyDown={handleInputKey}
              placeholder="city, event, artist, scene…"
              className="flex-1 bg-transparent text-sm leading-6 text-[var(--foreground)] placeholder:text-[var(--muted-2)] focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                aria-label="clear query"
                onClick={() => {
                  updateQuery("");
                  inputRef.current?.focus();
                }}
                className="text-[var(--muted-2)] transition hover:text-[var(--foreground)]"
              >
                ×
              </button>
            ) : null}
          </div>

          <div className="max-h-[320px] overflow-auto py-1">
            {query.trim().length < 2 ? (
              <Hint>start typing — try ibiza, afro nation, black coffee, techno, beach</Hint>
            ) : results.length === 0 ? (
              <Hint>no matches for &quot;{query}&quot; — try a city, event, or scene</Hint>
            ) : (
              <ul role="listbox" aria-label="search results">
                {results.map((result, index) => {
                  const isFocused = index === activeIndex;
                  return (
                    <li key={result.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isFocused}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => pickResult(result)}
                        className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition ${
                          isFocused ? "bg-[var(--surface-2)]" : ""
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm leading-5 text-[var(--foreground)]">
                            {result.label}
                          </span>
                          {result.sublabel ? (
                            <span className="block truncate font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                              {result.sublabel}
                            </span>
                          ) : null}
                        </span>
                        <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
                          {TYPE_LABELS[result.type]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
            <span>↑↓ navigate · ↵ open · esc close</span>
            <span>{results.length} matches</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 py-3 font-mono text-[11px] leading-5 text-[var(--muted)]">{children}</p>
  );
}

function isInputElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
