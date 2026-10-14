"use client";

import { useEffect, useRef, useState } from "react";
import type { Itinerary } from "@/lib/itineraries/generate";

type StatsPanelProps = {
  itinerary: Itinerary;
  /** Paired with BoardingPassHeader, which already shows days, cities, budget, and dates. */
  anchorMixOnly?: boolean;
};

export function StatsPanel({
  itinerary,
  anchorMixOnly = false,
}: StatsPanelProps) {
  const totalLow = itinerary.days.reduce(
    (sum, d) => sum + d.costBandUsd.low,
    0,
  );
  const totalHigh = itinerary.days.reduce(
    (sum, d) => sum + d.costBandUsd.high,
    0,
  );

  const eventDays = itinerary.days.filter(
    (d) => d.anchorKind === "event",
  ).length;
  const venueDays = itinerary.days.filter(
    (d) => d.anchorKind === "venue",
  ).length;
  const freeDays = itinerary.days.filter((d) => d.anchorKind === "free").length;
  const total = Math.max(1, itinerary.days.length);

  const cities = new Set(
    itinerary.days.map((d) => d.legSlug ?? itinerary.destinationSlug),
  ).size;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      {anchorMixOnly ? null : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Days" value={String(itinerary.days.length)} />
            <Stat label="Cities" value={String(cities)} />
            <Stat label="Vibes" value={itinerary.vibeTags.length ? String(itinerary.vibeTags.length) : "—"} />
          </div>

          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <p className="text-[13px] font-medium text-[var(--muted)]">All-in, per person</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-[var(--foreground)]">
              $<CountUp value={totalLow} />
              <span className="px-1 text-[var(--muted-2)]">–</span>
              $<CountUp value={totalHigh} />
            </p>
          </div>
        </>
      )}

      <div
        className={
          anchorMixOnly ? "" : "mt-5 border-t border-[var(--border)] pt-4"
        }
      >
        <p className="text-[13px] font-medium text-[var(--muted)]">What each day is built around</p>
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[var(--border-strong)]">
          {eventDays > 0 ? (
            <div
              className="bg-[var(--signal)] transition-all duration-500"
              style={{ width: `${(eventDays / total) * 100}%` }}
            />
          ) : null}
          {venueDays > 0 ? (
            <div
              className="bg-[var(--foreground)]/65 transition-all duration-500"
              style={{ width: `${(venueDays / total) * 100}%` }}
            />
          ) : null}
          {freeDays > 0 ? (
            <div
              className="bg-[var(--muted-2)] transition-all duration-500"
              style={{ width: `${(freeDays / total) * 100}%` }}
            />
          ) : null}
        </div>
        <ul className="mt-3 grid grid-cols-3 gap-2 text-[13px] text-[var(--muted)]">
          <li className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--signal)]" />
            <span>Events {eventDays}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--foreground)]/65" />
            <span>Venues {venueDays}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted-2)]" />
            <span>Open {freeDays}</span>
          </li>
        </ul>
      </div>

      {itinerary.startDate && !anchorMixOnly ? (
        <p className="mt-5 border-t border-[var(--border)] pt-4 text-[13px] text-[var(--muted)]">
          {formatDay(itinerary.startDate)} – {formatDay(itinerary.endDate)}
        </p>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[13px] font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

// Animate from prev value to next over ~400ms when value changes.
function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    let frame = 0;
    const target = value;
    const from = display;
    const duration = 400;

    function step(ts: number) {
      if (startRef.current == null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + (target - from) * eased);
      setDisplay(next);
      if (t < 1) frame = window.requestAnimationFrame(step);
    }

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

function formatDay(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}
