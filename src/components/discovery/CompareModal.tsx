"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  getDestinationBySlug,
  getEventsForDestination,
  getScoreForDestinationMonth
} from "@/data/music-travel";
import {
  BUDGET_LABELS,
  GENRE_LABELS,
  MONTHS,
  VIBE_LABELS,
  getMonthLabel
} from "@/data/taxonomy";
import { trackEvent } from "@/lib/analytics";
import { pickHeroForMonth } from "@/lib/hero-images";
import type {
  Budget,
  Destination,
  MonthNumber,
  MonthlyDestinationScore
} from "@/types/content";

type CompareModalProps = {
  open: boolean;
  slugs: [string, string] | null;
  anchorMonth: MonthNumber;
  monthsInRange: MonthNumber[];
  onClose: () => void;
};

const MONTH_VALUES = MONTHS.map((m) => m.value);

export function CompareModal(props: CompareModalProps) {
  if (!props.open || !props.slugs) return null;
  return <CompareModalBody {...props} />;
}

function CompareModalBody({
  slugs,
  anchorMonth,
  monthsInRange,
  onClose
}: CompareModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!slugs) return;
    trackEvent("compare_open", { left: slugs[0], right: slugs[1] });
  }, [slugs]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const rangeSet = useMemo(
    () => new Set(monthsInRange.length > 1 ? monthsInRange : [anchorMonth]),
    [monthsInRange, anchorMonth]
  );

  const [leftSlug, rightSlug] = slugs!;
  const left = getDestinationBySlug(leftSlug);
  const right = getDestinationBySlug(rightSlug);

  if (!left || !right) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 px-4 py-8 backdrop-blur-sm"
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label="compare cities"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-[0_40px_120px_rgba(0,0,0,0.7)] focus:outline-none"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
              compare · two cities
            </p>
            <h2 className="mt-2 text-2xl font-medium leading-tight text-[var(--foreground)]">
              {left.city} vs {right.city}
            </h2>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              anchor · {getMonthLabel(anchorMonth).toLowerCase()}
            </p>
          </div>
          <button
            type="button"
            aria-label="close"
            onClick={onClose}
            className="text-[var(--muted-2)] transition hover:text-[var(--foreground)]"
          >
            ×
          </button>
        </div>

        <div className="max-h-[calc(90vh-12rem)] overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2">
            <CityHero destination={left} anchorMonth={anchorMonth} />
            <CityHero destination={right} anchorMonth={anchorMonth} />
          </div>

          <Section title="activity">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              <ActivityBlock destination={left} rangeSet={rangeSet} />
              <ActivityBlock destination={right} rangeSet={rangeSet} />
            </div>
          </Section>

          <Section title="top events">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              <EventsList destination={left} />
              <EventsList destination={right} />
            </div>
          </Section>

          <Section title="scenes & vibes">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              <ChipBlock destination={left} />
              <ChipBlock destination={right} />
            </div>
          </Section>

          <Section title="details">
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              <DetailsBlock destination={left} />
              <DetailsBlock destination={right} />
            </div>
          </Section>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--background)]/40 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            close
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/destinations/${left.slug}?month=${anchorMonth}`}
              onClick={() =>
                trackEvent("compare_open_guide", { slug: left.slug, side: "left" })
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground)] transition hover:border-[var(--foreground)]"
            >
              {left.city.toLowerCase()} guide
              <span aria-hidden>→</span>
            </Link>
            <Link
              href={`/destinations/${right.slug}?month=${anchorMonth}`}
              onClick={() =>
                trackEvent("compare_open_guide", { slug: right.slug, side: "right" })
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--signal)]/55 bg-[var(--signal)]/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)] transition hover:border-[var(--signal)] hover:bg-[var(--signal)]/25"
            >
              {right.city.toLowerCase()} guide
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-7 border-t border-[var(--border)] pt-5">
      <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function CityHero({
  destination,
  anchorMonth
}: {
  destination: Destination;
  anchorMonth: MonthNumber;
}) {
  const score = getScoreForDestinationMonth(destination.slug, anchorMonth);
  const tier = score ? tierFromScore(score.overallScore) : "warm";
  const dotColor = tierColor(tier);
  const bestMonth = findBestMonth(destination.slug);
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)]/40">
      <div className="relative aspect-[16/9] w-full">
        <Image
          src={pickHeroForMonth(destination, anchorMonth)}
          alt={destination.city}
          fill
          sizes="(max-width: 768px) 100vw, 360px"
          className="object-cover"
        />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />
        <div className="absolute inset-x-3 bottom-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/65">
            {destination.country.toLowerCase()}
          </p>
          <h4 className="text-lg font-medium leading-tight text-white">{destination.city}</h4>
        </div>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/90 backdrop-blur">
          <span
            aria-hidden
            className="h-1 w-1 rounded-full"
            style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
          />
          <span className="text-white">{score?.overallScore ?? "—"}</span>
          <span className="text-white/60">{tier}</span>
        </span>
      </div>
      <div className="px-3 py-3">
        <p className="line-clamp-2 text-[12px] leading-5 text-[var(--foreground)]/85">
          {destination.tagline}
        </p>
        {bestMonth ? (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
            best month ·{" "}
            <span className="text-[var(--foreground)]">
              {getMonthLabel(bestMonth.month).toLowerCase()}
            </span>{" "}
            ·{" "}
            <span className="text-[var(--signal)]">
              {bestMonth.score.overallScore}
            </span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ActivityBlock({
  destination,
  rangeSet
}: {
  destination: Destination;
  rangeSet: ReadonlySet<MonthNumber>;
}) {
  return (
    <div>
      <div className="grid grid-cols-12 gap-1">
        {MONTH_VALUES.map((m) => {
          const score = getScoreForDestinationMonth(destination.slug, m);
          const overall = score?.overallScore ?? 0;
          const intensity = Math.max(0, Math.min(1, overall / 100));
          const inRange = rangeSet.has(m);
          return (
            <div key={m} className="flex flex-col items-center gap-1">
              <span
                aria-hidden
                className={`h-7 w-full rounded-sm transition ${
                  inRange ? "ring-1 ring-[var(--signal)]/60" : ""
                }`}
                style={{
                  background:
                    overall >= 90
                      ? `rgba(255, 139, 61, ${0.45 + intensity * 0.45})`
                      : overall >= 75
                        ? `rgba(245, 217, 113, ${0.25 + intensity * 0.4})`
                        : overall >= 50
                          ? `rgba(154, 160, 166, ${0.2 + intensity * 0.3})`
                          : `rgba(91, 94, 98, ${0.15 + intensity * 0.2})`
                }}
                title={`${getMonthLabel(m)} · ${overall || "—"}`}
              />
              <span className="font-mono text-[8px] uppercase tracking-[0.16em] text-[var(--muted-2)]">
                {MONTHS[m - 1].shortLabel.charAt(0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventsList({ destination }: { destination: Destination }) {
  const events = useMemo(
    () => getEventsForDestination(destination.slug).slice(0, 4),
    [destination.slug]
  );
  if (events.length === 0) {
    return (
      <p className="text-[12px] leading-5 text-[var(--muted)]">
        no curated events tracked yet.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {events.map((event) => (
        <li key={event.id} className="text-[12px] leading-5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
            {event.type}
          </span>
          <span className="ml-2 text-[var(--foreground)]">{event.title}</span>
        </li>
      ))}
    </ul>
  );
}

function ChipBlock({ destination }: { destination: Destination }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {destination.genres.slice(0, 5).map((g) => (
          <span
            key={g}
            className="rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--foreground)]"
          >
            {GENRE_LABELS[g].toLowerCase()}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {destination.vibes.slice(0, 5).map((v) => (
          <span
            key={v}
            className="rounded-full border border-[var(--border)] bg-transparent px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted)]"
          >
            {VIBE_LABELS[v].toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

function DetailsBlock({ destination }: { destination: Destination }) {
  return (
    <dl className="space-y-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
      <div className="flex items-center justify-between gap-3">
        <dt>budget</dt>
        <dd className="text-[var(--foreground)]">
          {BUDGET_LABELS[destination.budget as Budget]} · {destination.budget}
        </dd>
      </div>
      <div className="flex items-center justify-between gap-3">
        <dt>region</dt>
        <dd className="text-[var(--foreground)]">{destination.region.toLowerCase()}</dd>
      </div>
      <div className="flex items-center justify-between gap-3">
        <dt>country</dt>
        <dd className="text-[var(--foreground)]">{destination.country.toLowerCase()}</dd>
      </div>
    </dl>
  );
}

function findBestMonth(slug: string): { month: MonthNumber; score: MonthlyDestinationScore } | null {
  let best: { month: MonthNumber; score: MonthlyDestinationScore } | null = null;
  for (const m of MONTH_VALUES) {
    const score = getScoreForDestinationMonth(slug, m);
    if (!score) continue;
    if (!best || score.overallScore > best.score.overallScore) {
      best = { month: m, score };
    }
  }
  return best;
}

type Tier = "peak" | "in season" | "shoulder" | "warm";

function tierFromScore(score: number): Tier {
  if (score >= 90) return "peak";
  if (score >= 80) return "in season";
  if (score >= 70) return "shoulder";
  return "warm";
}

function tierColor(tier: Tier) {
  switch (tier) {
    case "peak":
      return "var(--signal)";
    case "in season":
      return "#f5d971";
    case "shoulder":
      return "#9aa0a6";
    case "warm":
    default:
      return "#5b5e62";
  }
}
