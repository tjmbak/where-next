"use client";

import { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AnchorCard, type AnchorPayload } from "@/components/itineraries/canvas/AnchorCard";
import { AnchorLibrary } from "@/components/itineraries/canvas/AnchorLibrary";
import { DayCardCanvas } from "@/components/itineraries/canvas/DayCardCanvas";
import { MiniMap } from "@/components/visual/MiniMap";
import { getDestinationBySlug } from "@/data/music-travel";
import type { Itinerary } from "@/lib/itineraries/generate";
import type { Destination } from "@/types/content";

type CanvasItineraryViewProps = {
  itinerary: Itinerary;
  destination: Destination;
  onChange: (next: Itinerary) => void;
};

export function CanvasItineraryView({ itinerary, destination, onChange }: CanvasItineraryViewProps) {
  const [activeDrag, setActiveDrag] = useState<{ kind: "day"; dayNumber: number } | { kind: "anchor"; payload: AnchorPayload } | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const legSlugs = useMemo(
    () => itinerary.legs?.map((l) => l.destinationSlug) ?? [destination.slug],
    [itinerary.legs, destination.slug]
  );
  const destinationBySlug = useMemo(() => {
    const map = new Map<string, Destination>();
    for (const slug of legSlugs) {
      const d = getDestinationBySlug(slug);
      if (d) map.set(slug, d);
    }
    if (!map.has(destination.slug)) map.set(destination.slug, destination);
    return map;
  }, [legSlugs, destination]);

  const usedAnchorIds = useMemo(() => {
    const set = new Set<string>();
    for (const day of itinerary.days) {
      if (day.anchorId) set.add(day.anchorId);
    }
    return set;
  }, [itinerary.days]);

  const dots = useMemo(
    () =>
      legSlugs
        .map((slug) => destinationBySlug.get(slug))
        .filter((d): d is Destination => Boolean(d))
        .map((d, i) => ({
          lat: d.coordinates.lat,
          lng: d.coordinates.lng,
          label: d.city,
          size: i === 0 ? ("peak" as const) : ("regular" as const)
        })),
    [legSlugs, destinationBySlug]
  );

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current;
    if (data?.kind === "day") {
      setActiveDrag({ kind: "day", dayNumber: data.dayNumber as number });
    } else if (data?.kind === "anchor") {
      setActiveDrag({ kind: "anchor", payload: data.payload as AnchorPayload });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDrag(null);
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // Anchor card dropped on a day → swap that day's anchor
    if (activeData?.kind === "anchor" && overData?.kind === "day-dropzone") {
      const payload = activeData.payload as AnchorPayload;
      const dayNumber = overData.dayNumber as number;
      const nextDays = itinerary.days.map((d) => {
        if (d.day !== dayNumber) return d;
        const dayDest = destinationBySlug.get(d.legSlug ?? legSlugs[0]) ?? destination;
        if (payload.kind === "event") {
          return {
            ...d,
            anchorKind: "event" as const,
            anchorId: payload.id,
            anchorTitle: payload.title,
            anchorWhy: payload.summary.split(".")[0] + "."
          };
        }
        return {
          ...d,
          anchorKind: "venue" as const,
          anchorId: payload.id,
          anchorTitle: payload.name,
          anchorWhy: `${payload.name} is one of ${dayDest.city}'s reference rooms tonight.`
        };
      });
      onChange({ ...itinerary, days: nextDays });
      return;
    }

    // Day card reordered (within its leg only)
    if (activeData?.kind === "day" && over.id !== active.id && over.id.toString().startsWith("day-")) {
      const fromDay = activeData.dayNumber as number;
      const toDay = parseInt(over.id.toString().replace("day-", ""), 10);
      const fromIndex = itinerary.days.findIndex((d) => d.day === fromDay);
      const toIndex = itinerary.days.findIndex((d) => d.day === toDay);
      if (fromIndex < 0 || toIndex < 0) return;
      // Restrict moves to the same leg
      if (itinerary.days[fromIndex].legSlug !== itinerary.days[toIndex].legSlug) return;

      const reordered = arrayMove(itinerary.days, fromIndex, toIndex);
      // Renumber day.day so they remain 1..N in display order, preserve dateISO sequence
      const dates = itinerary.days.map((d) => d.dateISO).filter((d): d is string => Boolean(d));
      const renumbered = reordered.map((d, i) => ({
        ...d,
        day: i + 1,
        dateISO: dates[i] ?? d.dateISO
      }));
      onChange({ ...itinerary, days: renumbered });
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          {/* Sticky route map */}
          <div className="sticky top-4 z-10 mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/95 p-4 backdrop-blur">
            <div className="flex items-center gap-4">
              <MiniMap dots={dots} size={84} connect={dots.length > 1} />
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                  route · {itinerary.durationDays} days
                </p>
                <p className="mt-1 truncate text-[15px] font-medium text-[var(--foreground)]">
                  {legSlugs
                    .map((slug) => destinationBySlug.get(slug)?.city ?? slug)
                    .join(" → ")}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
                  drag days to reorder · drop events from the library to swap anchors
                </p>
              </div>
            </div>
          </div>

          {/* Sortable day cards */}
          <SortableContext
            items={itinerary.days.map((d) => `day-${d.day}`)}
            strategy={verticalListSortingStrategy}
          >
            <ol className="space-y-4">
              {itinerary.days.map((day, index) => {
                const dayDest = destinationBySlug.get(day.legSlug ?? legSlugs[0]) ?? destination;
                const prevDay = index > 0 ? itinerary.days[index - 1] : null;
                const isLegStart = !prevDay || prevDay.legSlug !== day.legSlug;
                return (
                  <DayCardCanvas
                    key={`day-${day.day}`}
                    day={day}
                    destination={dayDest}
                    isLegStart={isLegStart}
                    isFirstDay={index === 0}
                    isHighlighted={hoveredDay === day.day}
                    onHover={setHoveredDay}
                  />
                );
              })}
            </ol>
          </SortableContext>
        </div>

        {/* Anchor library sidebar */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <AnchorLibrary legSlugs={legSlugs} usedAnchorIds={usedAnchorIds} />
        </div>
      </div>

      <DragOverlay modifiers={[restrictToVerticalAxis]} dropAnimation={null}>
        {activeDrag?.kind === "anchor" ? (
          <div className="pointer-events-none rotate-1 opacity-90">
            <AnchorCard payload={activeDrag.payload} />
          </div>
        ) : activeDrag?.kind === "day" ? (
          <div className="pointer-events-none rounded-xl border border-[var(--foreground)]/40 bg-[var(--surface)] px-4 py-3 shadow-2xl">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              moving day {String(activeDrag.dayNumber).padStart(2, "0")}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
