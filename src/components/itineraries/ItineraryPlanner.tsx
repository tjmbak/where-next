"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ItineraryView } from "@/components/itineraries/ItineraryView";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Itinerary, ItineraryDay, ItineraryDuration } from "@/lib/itineraries/generate";
import type { Budget, Destination } from "@/types/content";

type ItineraryPlannerProps = {
  destination: Destination;
};

const DURATIONS: ItineraryDuration[] = [3, 4, 5, 7];
const BUDGET_LABELS: Record<Budget, string> = { low: "$", medium: "$$", high: "$$$", luxury: "$$$$" };
const VIBE_OPTIONS = ["beach", "luxury", "underground", "festival", "city", "cultural", "group-trip", "late-night"] as const;

export function ItineraryPlanner({ destination }: ItineraryPlannerProps) {
  const router = useRouter();
  const [duration, setDuration] = useState<ItineraryDuration>(4);
  const [startDate, setStartDate] = useState<string>("");
  const [budgetBand, setBudgetBand] = useState<Budget>(destination.budget);
  const [vibeTags, setVibeTags] = useState<string[]>(destination.vibes.slice(0, 2));
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);

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
    const response = await fetch("/api/itineraries/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        destinationSlug: destination.slug,
        durationDays: duration,
        startDate: startDate || undefined,
        vibeTags,
        budgetBand
      })
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

      {itinerary ? (
        <section id="itinerary-result" className="space-y-8">
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
