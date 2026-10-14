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
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
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
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_10px_30px_-20px_rgba(28,22,18,0.3)] sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-[var(--foreground)]">From</span>
            <input
              type="date"
              value={from}
              min={minDate}
              max={maxDate}
              onChange={(e) => update({ from: e.target.value })}
              className="h-11 rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 text-[15px] text-[var(--foreground)] outline-none transition focus:border-[var(--signal)]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-[var(--foreground)]">To</span>
            <input
              type="date"
              value={to}
              min={from || minDate}
              max={maxDate}
              onChange={(e) => update({ to: e.target.value })}
              className="h-11 rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 text-[15px] text-[var(--foreground)] outline-none transition focus:border-[var(--signal)]"
            />
          </label>
        </div>

        <div className="mt-5">
          <span className="text-[13px] font-semibold text-[var(--foreground)]">Sound <span className="font-normal text-[var(--muted)]">· optional</span></span>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {GENRE_VALUES.map((genre) => {
              const active = genres.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleGenre(genre)}
                  className={`h-9 rounded-full border px-4 text-[14px] font-medium transition ${
                    active
                      ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                      : "border-[var(--border-strong)] text-[var(--foreground)] hover:border-[var(--foreground)]"
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
            <span className="text-[13px] font-semibold text-[var(--foreground)]">Budget up to</span>
            <select
              value={budget}
              onChange={(e) => update({ budget: e.target.value as Budget | "all" })}
              className="h-11 rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 text-[15px] text-[var(--foreground)] outline-none transition focus:border-[var(--signal)]"
            >
              <option value="all">Any</option>
              {BUDGET_VALUES.map((b) => (
                <option key={b} value={b}>
                  {BUDGET_LABELS[b]} {b}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-[var(--foreground)]">Region</span>
            <select
              value={region}
              onChange={(e) => update({ region: e.target.value as Region | "all" })}
              className="h-11 rounded-xl border border-[var(--border-strong)] bg-[var(--background)] px-3 text-[15px] text-[var(--foreground)] outline-none transition focus:border-[var(--signal)]"
            >
              <option value="all">Anywhere</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          {result.ok ? (
            <p className="ml-auto pb-3 text-[14px] text-[var(--muted)]">
              <span className="font-semibold text-[var(--foreground)]">{result.matches.length}</span> cities ranked
            </p>
          ) : null}
        </div>
      </div>

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
        <ol className="flex flex-col divide-y divide-[var(--border)]">
          {result.matches.slice(0, 12).map((match, index) => {
            const tier = tierFromScore(match.score);
            const dotColor = TIER_COLORS[tier];
            const guideHref = `/destinations/${match.destination.slug}?month=${windowStart.month}${yearQueryFor(
              windowStart.month,
              windowStart.year
            )}`;
            const openPreview = () =>
              preview?.open({
                kind: "destination",
                destinationSlug: match.destination.slug,
                month: windowStart.month,
                year: windowStart.year
              });
            return (
              <li key={match.destination.slug} className="group flex gap-4 py-5 first:pt-0 sm:gap-6">
                <button
                  type="button"
                  onClick={openPreview}
                  aria-label={`Quick look at ${match.destination.city}`}
                  className="relative aspect-square w-24 shrink-0 self-start overflow-hidden rounded-2xl bg-[var(--surface-2)] sm:aspect-[4/3] sm:w-52"
                >
                  <Image
                    src={pickHeroForMonth(match.destination, windowStart.month)}
                    alt={match.destination.city}
                    fill
                    sizes="(max-width: 640px) 96px, 208px"
                    loading={index < 4 ? "eager" : "lazy"}
                    className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                  />
                </button>

                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[17px] font-semibold leading-snug text-[var(--foreground)]">
                      {match.destination.city}
                      <span className="font-normal text-[var(--muted)]">, {match.destination.country}</span>
                    </h3>
                    <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 text-[14px] font-medium text-[var(--foreground)]">
                      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: dotColor }} />
                      {match.score}
                    </span>
                  </div>

                  <p className="mt-1 line-clamp-2 text-[14px] leading-6 text-[var(--muted)]">{match.reasons.join(" · ")}</p>

                  {match.events.length > 0 ? (
                    <ul className="mt-2 hidden flex-col gap-1 sm:flex">
                      {match.events.slice(0, 3).map((event) => (
                        <li key={`${event.id}@${event.startDate}`} className="truncate text-[14px] text-[var(--foreground)]">
                          <span className="font-medium text-[var(--signal)]">
                            {event.startDate < from ? "Ongoing" : shortDate(event.startDate)}
                          </span>{" "}
                          · {event.title}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-3 flex items-center gap-5">
                    <button
                      type="button"
                      onClick={openPreview}
                      className="text-[14px] font-semibold text-[var(--foreground)] underline underline-offset-4 transition hover:text-[var(--signal)]"
                    >
                      Quick look
                    </button>
                    <Link
                      href={guideHref}
                      className="text-[14px] font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
                    >
                      City guide →
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {result.ok && result.stretch.length > 0 ? (
        <section>
          <h2 className="text-[18px] font-semibold text-[var(--foreground)]">Worth shifting your dates for</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {result.stretch.map((pick) => (
              <li
                key={`${pick.destination.slug}:${pick.event.id}`}
                className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <p className="text-[13px] font-medium text-[var(--signal)]">
                  {pick.direction === "after"
                    ? `${pick.deltaDays} ${pick.deltaDays === 1 ? "day" : "days"} after your window`
                    : `Ends ${pick.deltaDays} ${pick.deltaDays === 1 ? "day" : "days"} before your window`}
                </p>
                <p className="mt-1.5 text-[14px] font-medium leading-5 text-[var(--foreground)]">
                  {pick.event.title}
                </p>
                <p className="mt-1 text-[13px] text-[var(--muted)]">
                  {pick.destination.city} ·{" "}
                  {new Date(`${pick.event.startDate}T00:00:00Z`).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC"
                  })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
