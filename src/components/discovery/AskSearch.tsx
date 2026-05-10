"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchUniverse } from "@/lib/search";
import type { SearchAction, SearchResult, SearchResultType } from "@/lib/search";
import type { SearchIntent } from "@/lib/search-intent";

type AskSearchProps = {
  onApply: (action: SearchAction, query: string) => void;
  onIntent: (intent: SearchIntent) => void;
};

const TYPE_LABELS: Record<SearchResultType, string> = {
  destination: "city",
  event: "event",
  genre: "scene",
  vibe: "vibe"
};

const PLACEHOLDER_OPTIONS = [
  "ask · july beach with afro house",
  "ask · new year's, mid budget, latin",
  "ask · like ibiza but cheaper",
  "ask · summer in europe, festivals",
  "ask · underground techno, weekend"
];

export function AskSearch({ onApply, onIntent }: AskSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const placeholder = PLACEHOLDER_OPTIONS[placeholderIdx];

  const results = useMemo<SearchResult[]>(
    () => (query.trim().length >= 2 ? searchUniverse(query, 6) : []),
    [query]
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;
      if (isMod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      } else if (event.key === "/" && !isInputElement(event.target)) {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const submitIntent = useCallback(
    async (rawQuery: string) => {
      const trimmed = rawQuery.trim();
      if (!trimmed || submitting) return;
      setSubmitting(true);
      setError(null);
      try {
        const response = await fetch("/api/search/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed })
        });
        if (!response.ok) {
          throw new Error(`request_failed_${response.status}`);
        }
        const json = (await response.json()) as { intent?: SearchIntent };
        if (!json.intent) throw new Error("no_intent");
        onIntent(json.intent);
        setOpen(false);
        inputRef.current?.blur();
      } catch (err) {
        console.warn("[ask-search] failed", err);
        setError("couldn't read that — try simpler words");
      } finally {
        setSubmitting(false);
      }
    },
    [onIntent, submitting]
  );

  function clearQuery() {
    setQuery("");
    setActiveIndex(0);
    setError(null);
    inputRef.current?.focus();
  }

  function pickResult(result: SearchResult) {
    onApply(result.apply, query);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      if (results.length === 0) return;
      event.preventDefault();
      setActiveIndex((i) => Math.min(results.length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      if (results.length === 0) return;
      event.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (event.metaKey || event.ctrlKey || event.shiftKey) {
        void submitIntent(query);
        return;
      }
      const result = results[activeIndex];
      if (result) {
        pickResult(result);
      } else {
        void submitIntent(query);
      }
    } else if (event.key === "Escape") {
      if (open) {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
  }

  const showSuggestions = open && results.length > 0;
  const showHint = open && query.trim().length < 2;
  const showAskCta = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full min-w-[200px] flex-1 sm:max-w-[360px]">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          void submitIntent(query);
        }}
        className={`flex items-center gap-2 rounded-full border bg-[var(--surface)] px-3 py-1.5 transition ${
          open
            ? "border-[var(--signal)]/55"
            : "border-[var(--border-strong)] hover:border-[var(--foreground)]"
        }`}
      >
        <span aria-hidden className={open || query ? "text-[var(--signal)]" : "text-[var(--muted-2)]"}>⌕</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
            setError(null);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setPlaceholderIdx((i) => (i + 1) % PLACEHOLDER_OPTIONS.length);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="ask anything"
          className="min-w-0 flex-1 bg-transparent font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--foreground)] placeholder:text-[var(--muted-2)] placeholder:normal-case focus:outline-none"
        />
        {submitting ? (
          <Spinner />
        ) : query ? (
          <button
            type="button"
            aria-label="clear"
            onClick={clearQuery}
            className="text-[var(--muted-2)] transition hover:text-[var(--foreground)]"
          >
            ×
          </button>
        ) : (
          <kbd className="hidden rounded border border-[var(--border)] bg-[var(--surface-2)] px-1 py-px font-mono text-[9px] tracking-normal text-[var(--muted-2)] sm:inline">
            ⌘K
          </kbd>
        )}
      </form>

      {open ? (
        <div className="absolute left-0 right-0 z-[700] mt-2 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-md border border-[var(--border-strong)] bg-[var(--surface)] shadow-[0_24px_64px_rgba(0,0,0,0.55)] backdrop-blur-md">
          {submitting ? <ResearchingPanel query={query.trim()} /> : null}
          {!submitting && showHint ? (
            <div className="space-y-2 px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                ask in plain language
              </p>
              <ul className="space-y-1 text-[12px] leading-5 text-[var(--foreground)]">
                <li>&ldquo;<button type="button" onClick={() => quickAsk("july beach with afro house", setQuery, submitIntent)} className="underline decoration-[var(--muted-2)] underline-offset-2 transition hover:decoration-[var(--signal)]">july beach with afro house</button>&rdquo;</li>
                <li>&ldquo;<button type="button" onClick={() => quickAsk("new year's, mid budget, latin", setQuery, submitIntent)} className="underline decoration-[var(--muted-2)] underline-offset-2 transition hover:decoration-[var(--signal)]">new year&apos;s, mid budget, latin</button>&rdquo;</li>
                <li>&ldquo;<button type="button" onClick={() => quickAsk("like ibiza but cheaper", setQuery, submitIntent)} className="underline decoration-[var(--muted-2)] underline-offset-2 transition hover:decoration-[var(--signal)]">like ibiza but cheaper</button>&rdquo;</li>
                <li>&ldquo;<button type="button" onClick={() => quickAsk("summer in europe, festivals", setQuery, submitIntent)} className="underline decoration-[var(--muted-2)] underline-offset-2 transition hover:decoration-[var(--signal)]">summer in europe, festivals</button>&rdquo;</li>
              </ul>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
                or just type — ⌘↵ to ask, ↵ to pick a suggestion
              </p>
            </div>
          ) : null}

          {!submitting && showSuggestions ? (
            <div>
              <p className="border-b border-[var(--border)] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--muted)]">
                quick picks
              </p>
              <ul role="listbox" aria-label="suggestions">
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
                        className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition ${
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
            </div>
          ) : null}

          {!submitting && showAskCta ? (
            <button
              type="button"
              onClick={() => void submitIntent(query)}
              disabled={submitting}
              className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition ${
                results.length > 0 ? "border-t border-[var(--border)]" : ""
              } ${submitting ? "cursor-not-allowed opacity-60" : "hover:bg-[var(--surface-2)]"}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden className="text-[var(--signal)]">↪</span>
                <span className="truncate font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
                  ask: &ldquo;{query.trim()}&rdquo;
                </span>
              </span>
              <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]">
                {submitting ? "reading…" : results.length > 0 ? "⌘↵" : "↵"}
              </span>
            </button>
          ) : null}

          {error ? (
            <p className="border-t border-[var(--border)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-[var(--signal)]/40 border-t-[var(--signal)]"
    />
  );
}

const RESEARCH_STEPS = [
  "reading your ask…",
  "searching live festival + venue listings…",
  "cross-checking dates + ticket sources…",
  "ranking matches by current calendar density…"
];

function ResearchingPanel({ query }: { query: string }) {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, RESEARCH_STEPS.length - 1));
    }, 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="px-4 py-3.5">
      <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
        <Spinner />
        researching live sources
      </p>
      {query ? (
        <p className="mt-2 text-[12px] leading-5 text-[var(--foreground)]">
          &ldquo;{query}&rdquo;
        </p>
      ) : null}
      <ul className="mt-3 space-y-1.5">
        {RESEARCH_STEPS.map((label, i) => {
          const done = i < stepIdx;
          const active = i === stepIdx;
          return (
            <li
              key={label}
              className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                done
                  ? "text-[var(--muted)]"
                  : active
                    ? "text-[var(--foreground)]"
                    : "text-[var(--muted-2)]"
              }`}
            >
              <span aria-hidden className="text-[var(--signal)]">
                {done ? "✓" : active ? "•" : "○"}
              </span>
              <span>{label}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
        web search runs live — usually 8–20 seconds
      </p>
    </div>
  );
}

function quickAsk(
  text: string,
  setQuery: (next: string) => void,
  submit: (q: string) => void | Promise<void>
) {
  setQuery(text);
  void submit(text);
}

function isInputElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
