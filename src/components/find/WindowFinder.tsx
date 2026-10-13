"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePreview } from "@/components/preview/PreviewContext";
import { BUDGET_LABELS, EDITION_YEAR, GENRE_LABELS, REGIONS, SUPPORTED_YEARS, yearQueryFor } from "@/data/taxonomy";
import { trackEvent } from "@/lib/analytics";
import { pickHeroForMonth } from "@/lib/hero-images";
import { TIER_COLORS, tierFromScore } from "@/lib/tiers";
import { findWindows, suggestDefaultWindow, type WindowQuery } from "@/lib/window-finder";
import type { Budget, Genre, MonthNumber, Region } from "@/types/content";

const GENRE_VALUES = Object.keys(GENRE_LABELS) as Genre[];
const BUDGET_VALUES = Object.keys(BUDGET_LABELS) as Budget[];

type WindowFinderProps = {
  initial: {
    from: string | null;
    to: string | null;
    genres: string | null;
    budget: string | null;
    region: string | null;
  };
};

function shortDate(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toLowerCase();
}

function parseGenres(raw: string | null): Genre[] {
  if (!raw) return [];
  return raw
    .split(",")
    .filter((g): g is Genre => (GENRE_VALUES as string[]).includes(g));
}

function parseBudget(raw: string | null): Budget | "all" {
  return (BUDGET_VALUES as string[]).includes(raw ?? "") ? (raw as Budget) : "all";
}

function parseRegion(raw: string | null): Region | "all" {
  return (REGIONS as readonly string[]).includes(raw ?? "") ? (raw as Region) : "all";
}

export function WindowFinder({ initial }: WindowFinderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const preview = usePreview();
  const fallback = useMemo(() => suggestDefaultWindow(), []);

  const [from, setFrom] = useState(initial.from ?? fallback.from);
  const [to, setTo] = useState(initial.to ?? fallback.to);
  const [genres, setGenres] = useState<Genre[]>(parseGenres(initial.genres));
  const [budget, setBudget] = useState<Budget | "all">(parseBudget(initial.budget));
  const [region, setRegion] = useState<Region | "all">(parseRegion(initial.region));

  const query: WindowQuery = useMemo(
    () => ({ from, to, genres, budget, region }),
    [from, to, genres, budget, region]
  );
  const result = useMemo(() => findWindows(query), [query]);

  const syncUrl = useCallback(
    (next: WindowQuery) => {
      const params = new URLSearchParams();
      params.set("from", next.from);
      params.set("to", next.to);
      if (next.genres.length > 0) params.set("genres", next.genres.join(","));
      if (next.budget !== "all") params.set("budget", next.budget);
      if (next.region !== "all") params.set("region", next.region);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      trackEvent("window_find", {
        from: next.from,
        to: next.to,
        genres: next.genres.join(","),
        budget: next.budget,
        region: next.region,
        results: result.ok ? result.matches.length : 0
      });
    },
    [pathname, router, result]
  );

  const update = useCallback(
    (patch: Partial<WindowQuery>) => {
      const next = { ...query, ...patch };
      if (patch.from !== undefined) setFrom(patch.from);
      if (patch.to !== undefined) setTo(patch.to);
      if (patch.genres !== undefined) setGenres(patch.genres);
      if (patch.budget !== undefined) setBudget(patch.budget);
      if (patch.region !== undefined) setRegion(patch.region);
      syncUrl(next);
    },
    [query, syncUrl]
  );

  const toggleGenre = useCallback(
    (genre: Genre) => {
      update({
        genres: genres.includes(genre)
          ? genres.filter((g) => g !== genre)
          : [...genres, genre]
      });
    },
    [genres, update]
  );

  const windowStart = useMemo(() => {
    const d = new Date(`${from}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return { month: 1 as MonthNumber, year: EDITION_YEAR };
    return { month: (d.getUTCMonth() + 1) as MonthNumber, year: d.getUTCFullYear() };
  }, [from]);

  const minDate = new Date().toISOString().slice(0, 10);
  const maxDate = `${Math.max(...SUPPORTED_YEARS)}-12-31`;

  return (
    <div className="flex flex-col gap-8">
      {/* QUERY FORM */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">from</span>
            <input
              type="date"
              value={from}
              min={minDate}
              max={maxDate}
              onChange={(e) => update({ from: e.target.value })}
              className="rounded-md border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5 text-[14px] text-[var(--foreground)] outline-none transition focus:border-[var(--signal)]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">to</span>
            <input
              type="date"
              value={to}
              min={from || minDate}
              max={maxDate}
              onChange={(e) => update({ to: e.target.value })}
              className="rounded-md border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2.5 text-[14px] text-[var(--foreground)] outline-none transition focus:border-[var(--signal)]"
            />
          </label>
        </div>

        <div className="mt-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">scene · optional</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {GENRE_VALUES.map((genre) => {
              const active = genres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleGenre(genre)}
                  className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
                    active
                      ? "border-[var(--signal)]/60 bg-[var(--signal)]/10 text-[var(--signal)]"
                      : "border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {GENRE_LABELS[genre]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">budget up to</span>
            <select
              value={budget}
              onChange={(e) => update({ budget: e.target.value as Budget | "all" })}
              className="rounded-md border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--foreground)] outline-none transition focus:border-[var(--signal)]"
            >
              <option value="all">any</option>
              {BUDGET_VALUES.map((b) => (
                <option key={b} value={b}>
                  {BUDGET_LABELS[b]} {b}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">region</span>
            <select
              value={region}
              onChange={(e) => update({ region: e.target.value as Region | "all" })}
              className="rounded-md border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--foreground)] outline-none transition focus:border-[var(--signal)]"
            >
              <option value="all">anywhere</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r.toLowerCase()}
                </option>
              ))}
            </select>
          </label>
          {result.ok ? (
            <p className="ml-auto pb-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              <span className="text-[var(--foreground)]">{result.matches.length}</span> options ranked
            </p>
          ) : null}
        </div>
      </div>

      {/* RESULTS */}
      {!result.ok ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)]/40 px-6 py-10 text-center">
          <p className="text-[15px] text-[var(--foreground)]">{result.error}</p>
        </div>
      ) : result.matches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)]/40 px-6 py-10 text-center">
          <p className="text-[15px] text-[var(--foreground)]">Nothing matches that combination.</p>
          <p className="mt-2 text-[13px] text-[var(--muted)]">Try widening the dates, dropping a scene, or raising the budget cap.</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-4">
          {result.matches.slice(0, 12).map((match, index) => {
            const tier = tierFromScore(match.score);
            const dotColor = TIER_COLORS[tier];
            const guideHref = `/destinations/${match.destination.slug}?month=${windowStart.month}${yearQueryFor(
              windowStart.month,
              windowStart.year
            )}`;
            return (
              <li
                key={match.destination.slug}
                className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(28,22,18,0.04)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(28,22,18,0.28)]"
              >
                <div className="flex flex-col sm:flex-row">
                  <button
                    type="button"
                    onClick={() =>
                      preview?.open({
                        kind: "destination",
                        destinationSlug: match.destination.slug,
                        month: windowStart.month,
                        year: windowStart.year
                      })
                    }
                    aria-label={`Quick look at ${match.destination.city}`}
                    className="relative aspect-[16/9] w-full shrink-0 overflow-hidden sm:aspect-auto sm:w-[220px]"
                  >
                    <Image
                      src={pickHeroForMonth(match.destination, windowStart.month)}
                      alt={match.destination.city}
                      fill
                      sizes="(max-width: 640px) 100vw, 220px"
                      loading={index < 4 ? "eager" : "lazy"}
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <span className="absolute bottom-2.5 left-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/85">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </button>

                  <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                          {match.destination.country.toLowerCase()}
                        </p>
                        <h3 className="text-lg font-medium leading-tight text-[var(--foreground)]">
                          {match.destination.city}
                        </h3>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em]">
                        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} />
                        <span className="text-[var(--foreground)]">{match.score}</span>
                        <span className="text-[var(--muted)]">fit</span>
                      </span>
                    </div>

                    <p className="text-[13px] leading-6 text-[var(--muted)]">
                      {match.reasons.join(" · ")}
                    </p>

                    {match.events.length > 0 ? (
                      <ul className="flex flex-wrap gap-x-4 gap-y-1">
                        {match.events.slice(0, 3).map((event) => (
                          <li key={`${event.id}@${event.startDate}`} className="min-w-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-2)]">
                            <span className="text-[var(--signal)]">
                              {event.startDate < from ? "ongoing" : shortDate(event.startDate)}
                            </span>{" "}
                            <span className="text-[var(--foreground)]/80">{event.title.length > 44 ? `${event.title.slice(0, 42)}…` : event.title}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="mt-auto flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          preview?.open({
                            kind: "destination",
                            destinationSlug: match.destination.slug,
                            month: windowStart.month,
                            year: windowStart.year
                          })
                        }
                        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:text-[var(--signal)]"
                      >
                        quick look
                      </button>
                      <Link
                        href={guideHref}
                        className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
                      >
                        full guide
                        <span aria-hidden>→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* STRETCH PICKS */}
      {result.ok && result.stretch.length > 0 ? (
        <section>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
            worth shifting your dates for
          </p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {result.stretch.map((pick) => (
              <li
                key={`${pick.destination.slug}:${pick.event.id}`}
                className="rounded-xl border border-[var(--signal)]/30 bg-[var(--signal)]/5 p-4"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--signal)]">
                  {pick.direction === "after"
                    ? `${pick.deltaDays} ${pick.deltaDays === 1 ? "day" : "days"} after your window`
                    : `ends ${pick.deltaDays} ${pick.deltaDays === 1 ? "day" : "days"} before your window`}
                </p>
                <p className="mt-1.5 text-[14px] font-medium leading-5 text-[var(--foreground)]">
                  {pick.event.title}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  {pick.destination.city} ·{" "}
                  {new Date(`${pick.event.startDate}T00:00:00Z`)
                    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
                    .toLowerCase()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
