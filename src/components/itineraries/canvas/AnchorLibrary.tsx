"use client";

import { useMemo, useState } from "react";
import { AnchorCard, type AnchorPayload } from "@/components/itineraries/canvas/AnchorCard";
import {
  getEventsForDestination,
  getVenuesForDestination,
  getDestinationBySlug
} from "@/data/music-travel";

type AnchorLibraryProps = {
  legSlugs: string[];
  usedAnchorIds: Set<string>;
};

export function AnchorLibrary({ legSlugs, usedAnchorIds }: AnchorLibraryProps) {
  const [activeLeg, setActiveLeg] = useState(legSlugs[0] ?? "");
  const [filter, setFilter] = useState<"all" | "events" | "venues">("all");

  const items = useMemo<AnchorPayload[]>(() => {
    if (!activeLeg) return [];
    const destination = getDestinationBySlug(activeLeg);
    if (!destination) return [];
    const events = getEventsForDestination(activeLeg).slice().sort((a, b) => b.importanceScore - a.importanceScore);
    const venues = getVenuesForDestination(activeLeg);
    const eventVenueByEvent = new Map<string, string | null>();
    for (const e of events) eventVenueByEvent.set(e.id, e.venueId ?? null);
    const venueNameById = new Map(venues.map((v) => [v.id, v.name]));

    const eventCards: AnchorPayload[] = events.slice(0, 30).map((e) => ({
      kind: "event",
      id: e.id,
      legSlug: activeLeg,
      title: e.title,
      type: e.type,
      summary: e.summary,
      startDate: e.startDate,
      venueName: e.venueId ? venueNameById.get(e.venueId) ?? null : null,
      importance: e.importanceScore
    }));
    const venueCards: AnchorPayload[] = venues.map((v) => ({
      kind: "venue",
      id: v.id,
      legSlug: activeLeg,
      name: v.name,
      type: v.type,
      sceneTags: v.sceneTags
    }));

    if (filter === "events") return eventCards;
    if (filter === "venues") return venueCards;
    return [...eventCards, ...venueCards];
  }, [activeLeg, filter]);

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
          anchor library · drag onto a day
        </p>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">{items.length}</span>
      </div>

      {legSlugs.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {legSlugs.map((slug) => {
            const dest = getDestinationBySlug(slug);
            return (
              <button
                key={slug}
                type="button"
                onClick={() => setActiveLeg(slug)}
                className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                  activeLeg === slug
                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                    : "border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {dest?.city ?? slug}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-3 flex gap-1">
        {(["all", "events", "venues"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] transition ${
              filter === f
                ? "border-[var(--foreground)] text-[var(--foreground)]"
                : "border-transparent text-[var(--muted-2)] hover:text-[var(--muted)]"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 240px)" }}>
        {items.length === 0 ? (
          <li className="rounded-md border border-dashed border-[var(--border)] px-3 py-4 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
            no items
          </li>
        ) : (
          items.map((item) => (
            <AnchorCard
              key={`${item.kind}-${item.id}`}
              payload={item}
              inUse={usedAnchorIds.has(item.id)}
            />
          ))
        )}
      </ul>
    </aside>
  );
}
