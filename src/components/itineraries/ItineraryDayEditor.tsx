"use client";

import { useState } from "react";
import type { ItineraryDay } from "@/lib/itineraries/generate";
import type { Destination } from "@/types/content";

type AlternativeEvent = {
  kind: "event";
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string | null;
  importanceScore: number;
  summary: string;
  venueName: string | null;
};

type AlternativeVenue = {
  kind: "venue";
  id: string;
  name: string;
  type: string;
  sceneTags: string[];
};

type Alternatives = {
  events: AlternativeEvent[];
  venues: AlternativeVenue[];
};

type ItineraryDayEditorProps = {
  destination: Destination;
  day: ItineraryDay;
  excludeAnchorIds: string[];
  onSwap: (next: Partial<ItineraryDay>) => void;
};

export function ItineraryDayEditor({ destination, day, excludeAnchorIds, onSwap }: ItineraryDayEditorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alternatives, setAlternatives] = useState<Alternatives | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (alternatives) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      destination: destination.slug,
      date: day.dateISO ?? "",
      exclude: excludeAnchorIds.join(",")
    });
    const response = await fetch(`/api/itineraries/alternatives?${params.toString()}`);
    setLoading(false);
    if (!response.ok) {
      setError("Could not load alternatives.");
      return;
    }
    const body = (await response.json()) as Alternatives;
    setAlternatives(body);
  }

  function pickEvent(event: AlternativeEvent) {
    onSwap({
      anchorKind: "event",
      anchorId: event.id,
      anchorTitle: event.title,
      anchorWhy: event.summary.split(".")[0] + "."
    });
    setOpen(false);
  }

  function pickVenue(venue: AlternativeVenue) {
    onSwap({
      anchorKind: "venue",
      anchorId: venue.id,
      anchorTitle: venue.name,
      anchorWhy: `${venue.name} is one of ${destination.city}'s reference rooms — anchoring tonight.`
    });
    setOpen(false);
  }

  function pickFree() {
    onSwap({
      anchorKind: "free",
      anchorId: null,
      anchorTitle: `Free day in ${destination.city}`,
      anchorWhy: `An open day to wander ${destination.city}.`
    });
    setOpen(false);
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleOpen}
        className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        {open ? "close alternatives" : "show alternatives ↗"}
      </button>

      {open ? (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          {loading ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">loading…</p>
          ) : error ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--signal)]">{error}</p>
          ) : alternatives ? (
            <div className="space-y-6">
              {alternatives.events.length > 0 ? (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                    other events that day
                  </p>
                  <ul className="mt-3 space-y-2">
                    {alternatives.events.map((event) => (
                      <li key={event.id}>
                        <button
                          type="button"
                          onClick={() => pickEvent(event)}
                          className="group flex w-full items-start gap-3 rounded-md border border-[var(--border)] px-3 py-2.5 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--background)]"
                        >
                          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                            {event.startDate}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-[var(--foreground)] truncate">
                              {event.title}
                            </span>
                            <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)] mt-0.5">
                              {event.type.replace("-", " ")}
                              {event.venueName ? ` · ${event.venueName}` : ""} · score {event.importanceScore}
                            </span>
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)] transition group-hover:text-[var(--signal)]">
                            pick →
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {alternatives.venues.length > 0 ? (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                    or anchor on a venue night
                  </p>
                  <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {alternatives.venues.map((venue) => (
                      <li key={venue.id}>
                        <button
                          type="button"
                          onClick={() => pickVenue(venue)}
                          className="group flex w-full items-center justify-between rounded-md border border-[var(--border)] px-3 py-2 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--background)]"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-[var(--foreground)] truncate">
                              {venue.name}
                            </span>
                            <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)] mt-0.5">
                              {venue.type.replace("-", " ")}
                            </span>
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)] transition group-hover:text-[var(--signal)]">
                            pick →
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="border-t border-[var(--border)] pt-4">
                <button
                  type="button"
                  onClick={pickFree}
                  className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
                >
                  ← leave this day open
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
