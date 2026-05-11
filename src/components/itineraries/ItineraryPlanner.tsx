"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapCanvas } from "@/components/itineraries/canvas/MapCanvas";
import { ItineraryLoadingState } from "@/components/itineraries/ItineraryLoadingState";
import { ItineraryView } from "@/components/itineraries/ItineraryView";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DESTINATIONS } from "@/data/music-travel";
import type { Itinerary, ItineraryDay, ItineraryDuration } from "@/lib/itineraries/generate";
import type { Budget, Destination } from "@/types/content";

type ItineraryPlannerProps = {
  destination: Destination;
};

type Leg = { destinationSlug: string; days: number };

const DURATIONS: ItineraryDuration[] = [3, 4, 5, 7];
const BUDGET_LABELS: Record<Budget, string> = { low: "$", medium: "$$", high: "$$$", luxury: "$$$$" };
const VIBE_OPTIONS = ["beach", "luxury", "underground", "festival", "city", "cultural", "group-trip", "late-night"] as const;

export function ItineraryPlanner({ destination }: ItineraryPlannerProps) {
  const router = useRouter();
  const [duration, setDuration] = useState<ItineraryDuration>(4);
  const [legs, setLegs] = useState<Leg[]>([]); // empty = single-city using `duration`
  const [startDate, setStartDate] = useState<string>("");
  const [budgetBand, setBudgetBand] = useState<Budget>(destination.budget);
  const [vibeTags, setVibeTags] = useState<string[]>(destination.vibes.slice(0, 2));
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

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
        document.getElementById("itinerary-result")?.scrollIntoView({ behavior: "smooth" });
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
            <legend className="flex w-full items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              <span>circuit · {totalDays} days total</span>
              <button
                type="button"
                onClick={() => setLegs([])}
                className="text-[var(--muted-2)] transition hover:text-[var(--signal)]"
              >
                ← back to single city
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
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                      leg {String(index + 1).padStart(2, "0")}
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
                      className="w-14 border-b border-[var(--border)] bg-transparent pb-1 text-right font-mono text-[14px] text-[var(--foreground)] outline-none focus:border-[var(--foreground)]"
                    />
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">days</span>
                    {legs.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeLeg(index)}
                        className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-2)] transition hover:text-[var(--signal)]"
                      >
                        remove
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </fieldset>
        ) : (
          <fieldset>
            <legend className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">how many days</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition ${
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
          <details className="mt-6 rounded-md border border-dashed border-[var(--border-strong)] px-4 py-3 [&[open]>summary]:mb-2">
            <summary className="flex cursor-pointer list-none items-center justify-between font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
              <span>{isMultiCity ? "+ add another city to the circuit" : "+ chain another city → multi-city circuit"}</span>
              <span className="font-mono text-[10px] text-[var(--muted-2)]">click to expand</span>
            </summary>
            <div className="flex flex-wrap gap-2">
              {otherDestinations.slice(0, 24).map((d) => (
                <button
                  key={d.slug}
                  type="button"
                  onClick={() => addLeg(d.slug)}
                  className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                >
                  + {d.city}
                </button>
              ))}
            </div>
          </details>
        ) : null}

        <label className="mt-8 flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">arrival date (optional)</span>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="w-full max-w-md border-b border-[var(--border)] bg-transparent pb-2 text-[15px] text-[var(--foreground)] outline-none transition focus:border-[var(--foreground)]"
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
            blank → we pick a peak weekend
          </span>
        </label>

        <fieldset className="mt-8">
          <legend className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">vibe (up to 4)</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {VIBE_OPTIONS.map((tag) => {
              const active = vibeTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleVibe(tag)}
                  className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] transition ${
                    active
                      ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                      : "border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {tag.replace("-", " ")}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-8">
          <legend className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">budget ceiling</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["low", "medium", "high", "luxury"] as Budget[]).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBudgetBand(b)}
                className={`rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition ${
                  budgetBand === b
                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                    : "border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {b} {BUDGET_LABELS[b]}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || vibeTags.length === 0}
          className="mt-10 inline-flex items-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating ? "generating…" : itinerary ? "generate again" : "generate itinerary"}
          <span aria-hidden>→</span>
        </button>

        {error ? (
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--signal)]">{error}</p>
        ) : null}
      </section>

      {generating && !itinerary ? (
        <section id="itinerary-result" className="animate-fade-in">
          <ItineraryLoadingState destination={destination} durationDays={duration} />
        </section>
      ) : null}

      {itinerary ? (
        <section id="itinerary-result" className="space-y-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              your draft trip
            </p>
            <div className="flex gap-1 rounded-full border border-[var(--border-strong)] p-0.5">
              {(["map", "list"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMode(m)}
                  className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] transition ${
                    viewMode === m
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {viewMode === "map" ? (
            <div className="hidden lg:block">
              <MapCanvas
                itinerary={itinerary}
                destination={destination}
                onChange={setItinerary}
              />
            </div>
          ) : null}

          <div className={viewMode === "map" ? "lg:hidden" : ""}>
            <ItineraryView
              itinerary={itinerary}
              destination={destination}
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
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-6">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "saving…" : "save & share this itinerary"}
              <span aria-hidden>→</span>
            </button>
            <Link
              href={`/destinations/${destination.slug}`}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              ← back to the {destination.city.toLowerCase()} guide
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
