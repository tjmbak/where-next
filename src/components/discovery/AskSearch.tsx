"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { searchGrouped } from "@/lib/search";
import type { SearchAction, SearchResult } from "@/lib/search";
import type { SearchIntent } from "@/lib/search-intent";
import type { Genre } from "@/types/content";
import { GENRE_LABELS } from "@/data/taxonomy";

export type PopularCity = {
  slug: string;
  city: string;
  country: string;
  image: string;
  score: number;
};

type AskSearchProps = {
  onApply: (action: SearchAction, query: string) => void;
  onIntent: (intent: SearchIntent) => void;
  popular?: PopularCity[];
  monthLabel?: string;
};

const PLACEHOLDER_OPTIONS = [
  "Try “afro house in july”",
  "Try “like ibiza but cheaper”",
  "Try “latin new year's”",
  "Try “summer festivals”",
  "Try “techno weekend”"
];

const QUICK_SOUNDS: Genre[] = ["techno", "house", "afro-house", "amapiano", "hip-hop", "latin", "jazz"];

const EXAMPLE_ASKS = ["july beach with afro house", "like ibiza but cheaper", "new year's, mid budget, latin"];

export function AskSearch({ onApply, onIntent, popular = [], monthLabel }: AskSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const placeholder = PLACEHOLDER_OPTIONS[placeholderIdx];
  const typed = query.trim().length >= 2;

  const groups = useMemo(() => (typed ? searchGrouped(query) : null), [query, typed]);
  const results = useMemo<SearchResult[]>(
    () =>
      groups
        ? groups.filtersFirst
          ? [...groups.filters, ...groups.cities, ...groups.events]
          : [...groups.cities, ...groups.filters, ...groups.events]
        : [],
    [groups]
  );

  useEffect(() => {
    if (open) document.body.dataset.searchOpen = "";
    else delete document.body.dataset.searchOpen;
    return () => {
      delete document.body.dataset.searchOpen;
    };
  }, [open]);

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
        setError("Couldn't read that. Try simpler words, like “techno in march”.");
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

  function close() {
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function apply(action: SearchAction) {
    if (action.kind === "navigate") {
      router.push(action.href);
    } else {
      onApply(action, query);
    }
    close();
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
        apply(result.apply);
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

  const renderGroup = (title: string, items: SearchResult[], offset: number) =>
    items.length > 0 ? (
      <div className="py-1">
        <p className={SECTION_TITLE}>{title}</p>
        <ul role="listbox" aria-label={title}>
          {items.map((result, i) => {
            const index = offset + i;
            const isFocused = index === activeIndex;
            return (
              <li key={result.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isFocused}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => apply(result.apply)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left transition ${isFocused ? "bg-[var(--surface-2)]" : ""}`}
                >
                  <ResultThumb result={result} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] leading-5 text-[var(--foreground)]">
                      <Highlight text={result.label} query={query} />
                    </span>
                    {result.sublabel ? (
                      <span className="block truncate text-[13px] leading-5 text-[var(--muted)]">
                        {result.type === "genre" || result.type === "vibe"
                          ? `${result.sublabel} · show matching cities`
                          : result.sublabel}
                      </span>
                    ) : null}
                  </span>
                  {isFocused ? (
                    <span aria-hidden className="hidden shrink-0 text-[12px] text-[var(--muted)] sm:inline">↵</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  return (
    <div ref={containerRef} className="relative w-full min-w-[200px] flex-1 sm:max-w-[400px]">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          void submitIntent(query);
        }}
        className={`flex h-10 items-center gap-2 rounded-full border bg-[var(--surface)] px-4 transition ${
          open
            ? "border-[var(--foreground)] shadow-[0_6px_20px_-10px_rgba(28,22,18,0.35)]"
            : "border-[var(--border-strong)] hover:border-[var(--foreground)]"
        }`}
      >
        <SearchIcon />
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
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none"
        />
        {submitting ? (
          <Spinner />
        ) : query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={clearQuery}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-2)] text-[13px] text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            ×
          </button>
        ) : (
          <kbd className="hidden rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-px text-[11px] text-[var(--muted)] sm:inline">
            ⌘K
          </kbd>
        )}
      </form>

      {open ? (
        <div className="absolute left-0 z-[700] mt-2 max-h-[min(70vh,560px)] w-[min(440px,calc(100vw-3rem))] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[0_24px_60px_-12px_rgba(28,22,18,0.35)]">
          {submitting ? <ResearchingPanel query={query.trim()} /> : null}

          {!submitting && !typed ? (
            <>
              {popular.length > 0 ? (
                <div className="py-1">
                  <p className={SECTION_TITLE}>{monthLabel ? `Popular in ${monthLabel}` : "Popular right now"}</p>
                  <ul>
                    {popular.map((city) => (
                      <li key={city.slug}>
                        <button
                          type="button"
                          onClick={() => apply({ kind: "selectDestination", slug: city.slug })}
                          className="flex w-full items-center gap-3 px-4 py-2 text-left transition hover:bg-[var(--surface-2)]"
                        >
                          <Thumb src={city.image} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-medium leading-5 text-[var(--foreground)]">{city.city}</span>
                            <span className="block truncate text-[13px] leading-5 text-[var(--muted)]">{city.country}</span>
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold tabular-nums text-[var(--foreground)]">
                            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--signal)]" />
                            {city.score}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="border-t border-[var(--border)] py-3">
                <p className={`${SECTION_TITLE} !pt-0`}>Browse by sound</p>
                <div className="flex flex-wrap gap-2 px-4">
                  {QUICK_SOUNDS.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => apply({ kind: "applyFilter", field: "genre", value: genre })}
                      className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-[13px] text-[var(--foreground)] transition hover:border-[var(--foreground)]"
                    >
                      {GENRE_LABELS[genre]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-[var(--border)] py-3">
                <p className={`${SECTION_TITLE} !pt-0`}>Or describe your trip</p>
                <ul>
                  {EXAMPLE_ASKS.map((text) => (
                    <li key={text}>
                      <button
                        type="button"
                        onClick={() => quickAsk(text, setQuery, submitIntent)}
                        className="flex w-full items-center gap-3 px-4 py-1.5 text-left text-[14px] text-[var(--foreground)]/85 transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
                      >
                        <SparkIcon />
                        &ldquo;{text}&rdquo;
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}

          {!submitting && groups ? (
            <>
              {groups.filtersFirst ? (
                <>
                  {renderGroup("Sounds & vibes", groups.filters, 0)}
                  {renderGroup("Cities", groups.cities, groups.filters.length)}
                </>
              ) : (
                <>
                  {renderGroup("Cities", groups.cities, 0)}
                  {renderGroup("Sounds & vibes", groups.filters, groups.cities.length)}
                </>
              )}
              {renderGroup("Upcoming events", groups.events, groups.cities.length + groups.filters.length)}
              {results.length === 0 ? (
                <p className="px-4 pb-1 pt-3 text-[13px] text-[var(--muted)]">
                  No cities or events named &ldquo;{query.trim()}&rdquo;.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void submitIntent(query)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--surface-2)] ${
                  results.length > 0 ? "mt-1 border-t border-[var(--border)]" : ""
                }`}
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--signal)]/10 text-[var(--signal)]">
                  <SparkIcon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium leading-5 text-[var(--foreground)]">
                    Plan around &ldquo;{query.trim()}&rdquo;
                  </span>
                  <span className="block truncate text-[13px] leading-5 text-[var(--muted)]">
                    We&rsquo;ll pick the month, sound and budget for you
                  </span>
                </span>
                <span aria-hidden className="hidden shrink-0 text-[12px] text-[var(--muted)] sm:inline">
                  {results.length > 0 ? "⌘↵" : "↵"}
                </span>
              </button>
            </>
          ) : null}

          {error ? (
            <p className="border-t border-[var(--border)] px-4 py-2.5 text-[13px] text-[var(--signal)]">{error}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const SECTION_TITLE = "px-4 pb-1.5 pt-2 text-[12px] font-semibold text-[var(--muted)]";

function ResultThumb({ result }: { result: SearchResult }) {
  if (result.image) return <Thumb src={result.image} />;
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[15px] text-[var(--foreground)]/70">
      {result.type === "genre" ? "♪" : "◐"}
    </span>
  );
}

function Thumb({ src }: { src: string }) {
  return (
    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-2)]">
      <Image src={src} alt="" fill sizes="40px" className="object-cover" />
    </span>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const at = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <Fragment>
      {text.slice(0, at)}
      <span className="font-semibold">{text.slice(at, at + q.length)}</span>
      {text.slice(at + q.length)}
    </Fragment>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[var(--signal)]" fill="currentColor">
      <path d="M12 2.5c.4 4.6 2.9 7.1 7.5 7.5-4.6.4-7.1 2.9-7.5 7.5-.4-4.6-2.9-7.1-7.5-7.5 4.6-.4 7.1-2.9 7.5-7.5Z" />
    </svg>
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
  "Reading your request",
  "Checking festival and venue listings",
  "Cross-checking dates",
  "Ranking the best matches"
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
      <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--foreground)]">
        <Spinner />
        Finding your trip
      </p>
      {query ? (
        <p className="mt-1 text-[13px] leading-5 text-[var(--muted)]">
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
              className={`flex items-center gap-2 text-[13px] transition ${
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
      <p className="mt-3 text-[12px] text-[var(--muted-2)]">Usually takes 8–20 seconds.</p>
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
