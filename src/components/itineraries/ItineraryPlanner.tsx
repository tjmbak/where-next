"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ItineraryLoadingState } from "@/components/itineraries/ItineraryLoadingState";
import { ItineraryView } from "@/components/itineraries/ItineraryView";
import { StatsPanel } from "@/components/itineraries/StatsPanel";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DESTINATIONS } from "@/data/music-travel";
import type { Itinerary, ItineraryDay, ItineraryDuration } from "@/lib/itineraries/generate";
import type { Budget, Destination } from "@/types/content";
import { TrackedOutboundLink } from "@/components/analytics/TrackedOutboundLink";
import { bookingUrl, gygUrl, skyscannerUrl } from "@/components/destinations/StayAndTravel";

type ItineraryPlannerProps = {
  destination: Destination;
  initialStartDate?: string;
  initialDays?: number;
};

type Leg = { destinationSlug: string; days: number };

const DURATIONS: ItineraryDuration[] = [3, 4, 5, 7];
const BUDGET_LABELS: Record<Budget, string> = { low: "$", medium: "$$", high: "$$$", luxury: "$$$$" };
const VIBE_OPTIONS = ["beach", "luxury", "underground", "festival", "city", "cultural", "group-trip", "late-night"] as const;

export function ItineraryPlanner({ destination, initialStartDate, initialDays }: ItineraryPlannerProps) {
  const router = useRouter();
  const [duration, setDuration] = useState<ItineraryDuration>(closestDuration(initialDays));
  const [legs, setLegs] = useState<Leg[]>([]); // empty = single-city using `duration`
  const [startDate, setStartDate] = useState<string>(initialStartDate ?? "");
  const [budgetBand, setBudgetBand] = useState<Budget>(destination.budget);
  const [vibeTags, setVibeTags] = useState<string[]>(destination.vibes.slice(0, 2));
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);

  const isMultiCity = legs.length > 0;
  const totalDays = useMemo(() => {
    if (!isMultiCity) return duration;
    return legs.reduce((sum, l) => sum + l.days, 0);
  }, [isMultiCity, duration, legs]);

  const otherDestinations = useMemo(
    () => DESTINATIONS.filter((d) => d.slug !== destination.slug && !legs.some((l) => l.destinationSlug === d.slug)),
    [destination.slug, legs]
  );

  function addLeg(slug: string) {
    if (legs.length === 0) {
      // First "add" promotes to multi-city: leg 1 = current destination with current duration
      setLegs([
        { destinationSlug: destination.slug, days: duration },
        { destinationSlug: slug, days: 3 }
      ]);
    } else {
      setLegs((current) => [...current, { destinationSlug: slug, days: 3 }]);
    }
  }

  function updateLegDays(index: number, days: number) {
    setLegs((current) =>
      current.map((leg, i) => (i === index ? { ...leg, days: Math.max(1, Math.min(14, days)) } : leg))
    );
  }

  function removeLeg(index: number) {
    setLegs((current) => {
      const next = current.filter((_, i) => i !== index);
      return next.length <= 1 ? [] : next;
    });
  }

  function toggleVibe(tag: string) {
    setVibeTags((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : current.length >= 4
          ? current
          : [...current, tag]
    );
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    setItinerary(null);
    const payload = isMultiCity
      ? {
          legs,
          startDate: startDate || undefined,
          vibeTags,
          budgetBand
        }
      : {
          destinationSlug: destination.slug,
          durationDays: duration,
          startDate: startDate || undefined,
          vibeTags,
          budgetBand
        };
    const response = await fetch("/api/itineraries/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    setGenerating(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Could not generate. Please try again.");
      return;
    }
    const body = (await response.json()) as { itinerary: Itinerary };
    setItinerary(body.itinerary);
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        document.getElementById("itinerary-result")?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
        });
      });
    }
  }

  async function handleSave() {
    if (!itinerary) return;
    setSaving(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        const next = `/destinations/${destination.slug}/plan?save=1`;
        router.push(`/auth/login?next=${encodeURIComponent(next)}`);
        return;
      }
    }

    const response = await fetch("/api/itineraries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        itinerary,
        visibility: "public",
        city: destination.city
      })
    });
    setSaving(false);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Could not save. Please try again.");
      return;
    }
    const body = (await response.json()) as { itinerary: { slug: string } };
    router.push(`/itineraries/${body.itinerary.slug}`);
  }

  return (
    <div className="space-y-12">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        {isMultiCity ? (
          <fieldset>
            <legend className="flex w-full items-center justify-between text-[15px] font-semibold text-[var(--foreground)]">
              <span>Multi-city trip · {totalDays} days</span>
              <button
                type="button"
                onClick={() => setLegs([])}
                className="text-[13px] font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
              >
                Back to one city
              </button>
            </legend>
            <ol className="mt-3 space-y-2">
              {legs.map((leg, index) => {
                const legDestination = DESTINATIONS.find((d) => d.slug === leg.destinationSlug);
                return (
                  <li
                    key={`${leg.destinationSlug}-${index}`}
                    className="flex items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
                  >
                    <span className="text-[13px] font-medium text-[var(--muted)]">
                      Stop {index + 1}
                    </span>
                    <span className="flex-1 text-sm text-[var(--foreground)]">
                      {legDestination ? `${legDestination.city}, ${legDestination.country}` : leg.destinationSlug}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={leg.days}
                      onChange={(event) => updateLegDays(index, Number(event.target.value) || 1)}
                      className="w-14 border-b border-[var(--border)] bg-transparent pb-1 text-right text-[15px] tabular-nums text-[var(--foreground)] outline-none focus:border-[var(--foreground)]"
                    />
                    <span className="text-[13px] text-[var(--muted)]">days</span>
                    {legs.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeLeg(index)}
                        className="text-[13px] font-medium text-[var(--muted)] transition hover:text-[var(--signal)]"
                      >
                        Remove
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </fieldset>
        ) : (
          <fieldset>
            <legend className="text-[15px] font-semibold text-[var(--foreground)]">How many days</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`h-10 rounded-full border px-4 text-[14px] font-medium transition ${
                    duration === d
                      ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                      : "border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {otherDestinations.length > 0 ? (
          <details className="group mt-6 rounded-xl border border-[var(--border)] px-4 py-3 [&[open]>summary]:mb-3">
            <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between text-[14px] font-medium text-[var(--foreground)]">
              <span>{isMultiCity ? "Add another city" : "Add another city to this trip"}</span>
              <span aria-hidden className="text-[18px] text-[var(--muted)] transition group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="flex flex-wrap gap-2">
              {otherDestinations.slice(0, 24).map((d) => (
                <button
                  key={d.slug}
                  type="button"
                  onClick={() => addLeg(d.slug)}
                  className="h-9 rounded-full border border-[var(--border-strong)] px-3.5 text-[14px] text-[var(--foreground)] transition hover:border-[var(--foreground)]"
                >
                  + {d.city}
                </button>
              ))}
            </div>
          </details>
        ) : null}

        <label className="mt-8 flex flex-col gap-2">
          <span className="text-[15px] font-semibold text-[var(--foreground)]">Arrival date <span className="font-normal text-[var(--muted)]">(optional)</span></span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="w-full max-w-md border-b border-[var(--border)] bg-transparent pb-2 text-[15px] text-[var(--foreground)] outline-none transition focus:border-[var(--foreground)]"
          />
          <span className="text-[13px] text-[var(--muted)]">
            Leave it blank and we&apos;ll pick a peak weekend.
          </span>
        </label>

        <fieldset className="mt-8">
          <legend className="text-[15px] font-semibold text-[var(--foreground)]">Vibe <span className="font-normal text-[var(--muted)]">(up to 4)</span></legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {VIBE_OPTIONS.map((tag) => {
              const active = vibeTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleVibe(tag)}
                  className={`h-10 rounded-full border px-4 text-[14px] font-medium transition ${
                    active
                      ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                      : "border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {capitalize(tag.replace("-", " "))}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="text-[15px] font-semibold text-[var(--foreground)]">Budget</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["low", "medium", "high", "luxury"] as Budget[]).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBudgetBand(b)}
                className={`h-10 rounded-full border px-4 text-[14px] font-medium transition ${
                  budgetBand === b
                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                    : "border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {capitalize(b)} {BUDGET_LABELS[b]}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || vibeTags.length === 0}
          className="mt-10 inline-flex h-12 items-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-6 text-[15px] font-semibold text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? "Building…" : itinerary ? "Build again" : "Build my itinerary"}
          <span aria-hidden>→</span>
        </button>

        {error ? (
          <p className="mt-4 text-[14px] text-[var(--signal)]">{error}</p>
        ) : null}
      </section>

      {generating && !itinerary ? (
        <section id="itinerary-result" className="animate-fade-in motion-reduce:animate-none">
          <ItineraryLoadingState destination={destination} durationDays={duration} />
        </section>
      ) : null}

      {itinerary ? (
        <section id="itinerary-result" className="space-y-8 animate-fade-in motion-reduce:animate-none">
          <h2 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--foreground)]">Your draft trip</h2>

          <StatsPanel itinerary={itinerary} />

          {itinerary.startDate && itinerary.endDate ? (
            <BookTripStrip destination={destination} startDate={itinerary.startDate} endDate={itinerary.endDate} />
          ) : null}

          <ItineraryView
            itinerary={itinerary}
            destination={destination}
            hideSummary
            onSwapDay={(dayNumber, patch) => {
              setItinerary((current) =>
                current
                  ? {
                      ...current,
                      days: current.days.map((d) =>
                        d.day === dayNumber ? ({ ...d, ...patch } as ItineraryDay) : d
                      )
                    }
                  : current
              );
            }}
          />

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-6">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex h-12 items-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-6 text-[15px] font-semibold text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save and share"}
              <span aria-hidden>→</span>
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function closestDuration(days?: number): ItineraryDuration {
  if (!days || !Number.isFinite(days)) return 4;
  return DURATIONS.reduce((best, d) => (Math.abs(d - days) < Math.abs(best - days) ? d : best), DURATIONS[0]);
}

function BookTripStrip({ destination, startDate, endDate }: { destination: Destination; startDate: string; endDate: string }) {
  const checkout = new Date(Date.parse(`${endDate}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  const range = { startDate, endDate: checkout };
  const links = [
    { label: "Stays", provider: "booking" as const, href: bookingUrl(destination, range) },
    { label: "Flights", provider: "skyscanner" as const, href: skyscannerUrl(destination, range) },
    { label: "Things to do", provider: "gyg" as const, href: gygUrl(destination, range) }
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-[var(--border)] px-4 py-3">
      <span className="text-[14px] font-semibold text-[var(--foreground)]">Book this trip</span>
      <span className="flex flex-wrap gap-2">
        {links.map((link) => (
          <TrackedOutboundLink
            key={link.provider}
            href={link.href}
            provider={link.provider}
            destinationSlug={destination.slug}
            eventLabel={`itinerary-${link.provider}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-1 rounded-full px-4 text-[14px] font-medium text-[var(--foreground)] ring-1 ring-inset ring-[var(--border-strong)] transition hover:ring-[var(--foreground)]"
          >
            {link.label}
            <span aria-hidden className="opacity-60">
              ↗
            </span>
          </TrackedOutboundLink>
        ))}
      </span>
    </div>
  );
}
