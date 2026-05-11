"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AnchorPayload } from "@/components/itineraries/canvas/AnchorCard";
import { AnchorLibrary } from "@/components/itineraries/canvas/AnchorLibrary";
import { AnchorTypeIcon, anchorIconKindFor } from "@/components/itineraries/canvas/AnchorTypeIcon";
import { StatsPanel } from "@/components/itineraries/canvas/StatsPanel";
import {
  getDestinationBySlug,
  getEventsForDestination,
  getVenuesForDestination
} from "@/data/music-travel";
import type { Itinerary, ItineraryDay } from "@/lib/itineraries/generate";
import type { Destination } from "@/types/content";
import type { Map as LeafletMap, Marker as LeafletMarker, Polyline } from "leaflet";

// Each day exposes an optional position override. When the user drags a day
// marker on the map, we set this override and the marker stays at the
// dragged location. Without it, the marker snaps to the venue or destination.
type ItineraryDayWithPosition = ItineraryDay & {
  positionOverride?: { lat: number; lng: number } | null;
};

type MapCanvasProps = {
  itinerary: Itinerary;
  destination: Destination;
  onChange: (next: Itinerary) => void;
};

export function MapCanvas({ itinerary, destination, onChange }: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<number, LeafletMarker>>(new Map());
  const arcRef = useRef<Polyline | null>(null);
  const fittedOnceRef = useRef(false);
  const [activeDay, setActiveDay] = useState<number | null>(itinerary.days[0]?.day ?? null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  // Track when the async leaflet init completes so the markers-sync effect
  // (which depends on `mapRef.current`) re-runs once the map is actually live.
  // Without this, markers + initial fitBounds were silently no-oping because
  // the sync effect ran once on mount before the dynamic import resolved.
  const [mapReady, setMapReady] = useState(false);
  const onChangeRef = useRef(onChange);
  const itineraryRef = useRef(itinerary);
  useEffect(() => {
    onChangeRef.current = onChange;
    itineraryRef.current = itinerary;
  }, [onChange, itinerary]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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
    for (const day of itinerary.days) if (day.anchorId) set.add(day.anchorId);
    return set;
  }, [itinerary.days]);

  // Compute the lat/lng for each day from override → venue → destination
  const dayPositions = useMemo(() => {
    return itinerary.days.map((day) => positionForDay(day, destinationBySlug));
  }, [itinerary.days, destinationBySlug]);

  // ---- Map init ----
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    let cancelled = false;
    void (async () => {
      const leafletModule = await import("leaflet");
      if (cancelled || !mapContainerRef.current || mapRef.current) return;
      const L = leafletModule.default ?? leafletModule;

      const map = L.map(mapContainerRef.current, {
        center: [22, 8],
        zoom: 3,
        minZoom: 2,
        maxZoom: 12,
        zoomControl: false,
        attributionControl: false,
        worldCopyJump: true
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
        noWrap: true,
        attribution: "© OpenStreetMap · CARTO"
      }).addTo(map);

      map.createPane("wn-lines");
      const linesPane = map.getPane("wn-lines");
      if (linesPane) {
        linesPane.style.zIndex = "420";
        linesPane.style.pointerEvents = "none";
      }

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        minZoom: 3,
        maxZoom: 19,
        opacity: 0.45
      }).addTo(map);

      mapRef.current = map;
      setMapReady(true);
    })();

    const markers = markersRef.current;
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markers.clear();
      arcRef.current = null;
    };
  }, []);

  // ---- Markers + arcs sync (re-runs whenever positions or anchors change) ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    void (async () => {
      const leafletModule = await import("leaflet");
      const L = leafletModule.default ?? leafletModule;

      const seenDays = new Set<number>();
      itinerary.days.forEach((day, index) => {
        seenDays.add(day.day);
        const pos = dayPositions[index];
        const dayDest = destinationBySlug.get(day.legSlug ?? legSlugs[0]) ?? destination;
        const event = day.anchorKind === "event" && day.anchorId
          ? getEventsForDestination(dayDest.slug).find((e) => e.id === day.anchorId) ?? null
          : null;
        const venue = day.anchorKind === "venue" && day.anchorId
          ? getVenuesForDestination(dayDest.slug).find((v) => v.id === day.anchorId) ?? null
          : null;
        const iconKind = anchorIconKindFor({
          kind: day.anchorKind,
          type: event?.type ?? venue?.type
        });
        const isActive = activeDay === day.day;

        const html = renderMarkerHtml({
          dayNumber: day.day,
          city: dayDest.city,
          title: day.anchorTitle,
          iconKind,
          isActive
        });

        // The marker DIV is 200x80 (wrap with pin + slide-out card). The pin
        // is a 32x32 circle at the LEFT, vertically centered. Its visual
        // center sits at wrap-coords (16, 40) — that's where the latlng
        // should point.
        //
        // Single-city trips would otherwise stack every day-pin at the same
        // coords (one dot you can't interact with). For shared coords we
        // arrange the markers in a polar fan around the location: each pin
        // is offset by (dx, dy) on screen, distributed evenly on a circle.
        const sharedCoordPins = countAtSamePosition(dayPositions, pos);
        const fanOffset = sharedCoordPins > 1
          ? polarOffsetForIndex(indexAmongSharedCoords(dayPositions, pos, index), sharedCoordPins, 30)
          : { dx: 0, dy: 0 };
        // iconAnchor.x: pin shifts RIGHT by dx → anchor.x decreases by dx
        // iconAnchor.y: pin shifts DOWN  by dy → anchor.y decreases by dy
        const iconAnchor: [number, number] = [16 - fanOffset.dx, 40 - fanOffset.dy];

        let marker = markersRef.current.get(day.day);
        if (marker) {
          marker.setLatLng([pos.lat, pos.lng]);
          marker.setIcon(
            L.divIcon({
              className: "wn-day-marker",
              html,
              iconSize: [200, 80],
              iconAnchor
            })
          );
        } else {
          marker = L.marker([pos.lat, pos.lng], {
            draggable: true,
            riseOnHover: true,
            icon: L.divIcon({
              className: "wn-day-marker",
              html,
              iconSize: [200, 80],
              iconAnchor
            })
          })
            .addTo(map)
            .on("click", () => setActiveDay(day.day))
            .on("dragend", (event) => {
              const target = event.target as LeafletMarker;
              const ll = target.getLatLng();
              const next = itineraryRef.current.days.map((d) =>
                d.day === day.day
                  ? ({ ...d, positionOverride: { lat: ll.lat, lng: ll.lng } } as ItineraryDayWithPosition)
                  : d
              );
              onChangeRef.current({ ...itineraryRef.current, days: next });
            });
          markersRef.current.set(day.day, marker);
        }
      });

      // Remove orphaned markers
      for (const [dayNumber, marker] of markersRef.current.entries()) {
        if (!seenDays.has(dayNumber)) {
          marker.remove();
          markersRef.current.delete(dayNumber);
        }
      }

      // Route arc — polyline connecting consecutive day positions in order
      if (arcRef.current) {
        arcRef.current.remove();
        arcRef.current = null;
      }
      if (dayPositions.length >= 2) {
        const arc = L.polyline(
          dayPositions.map((p) => [p.lat, p.lng] as [number, number]),
          {
            pane: "wn-lines",
            color: "#ff8b3d",
            weight: 1.5,
            opacity: 0.55,
            dashArray: "4 6",
            lineCap: "round",
            className: "wn-line"
          }
        ).addTo(map);
        arcRef.current = arc;
      }

      // Fit bounds — only on first render or when the leg set changes. We don't
      // re-fit on every marker drag/anchor swap (that would yank the user's view
      // around). Single-point trips use setView instead since fitBounds with a
      // degenerate bounds can be flaky.
      if (!fittedOnceRef.current && dayPositions.length > 0) {
        const uniquePositions = dedupePositions(dayPositions);
        if (uniquePositions.length === 1) {
          map.setView([uniquePositions[0].lat, uniquePositions[0].lng], 12, {
            animate: false
          });
        } else {
          const bounds = L.latLngBounds(
            uniquePositions.map((p) => [p.lat, p.lng] as [number, number])
          );
          map.flyToBounds(bounds, { padding: [80, 80], maxZoom: 8, duration: 0.6 });
        }
        fittedOnceRef.current = true;
      }
    })();
  }, [itinerary.days, dayPositions, activeDay, destinationBySlug, legSlugs, destination, mapReady]);

  // Pan to active day's position when it changes
  useEffect(() => {
    if (activeDay == null) return;
    const map = mapRef.current;
    if (!map) return;
    const day = itinerary.days.find((d) => d.day === activeDay);
    if (!day) return;
    const pos = positionForDay(day, destinationBySlug);
    map.flyTo([pos.lat, pos.lng], Math.max(map.getZoom(), 5), { duration: 0.6 });
  }, [activeDay, itinerary.days, destinationBySlug]);

  function resetPositions() {
    const next = itinerary.days.map((d) => ({ ...d, positionOverride: null }) as ItineraryDayWithPosition);
    onChange({ ...itinerary, days: next });
  }

  function handleAnchorDrop(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overId = over.id.toString();

    if (activeData?.kind === "anchor" && overId.startsWith("day-")) {
      const payload = activeData.payload as AnchorPayload;
      const dayNumber = parseInt(overId.replace("day-", ""), 10);
      const nextDays = itinerary.days.map((d) => {
        if (d.day !== dayNumber) return d;
        const dayDest = destinationBySlug.get(d.legSlug ?? legSlugs[0]) ?? destination;
        if (payload.kind === "event") {
          return {
            ...d,
            anchorKind: "event" as const,
            anchorId: payload.id,
            anchorTitle: payload.title,
            anchorWhy: payload.summary.split(".")[0] + ".",
            // Snap back to venue coordinates of the new anchor
            positionOverride: null
          } as ItineraryDayWithPosition;
        }
        return {
          ...d,
          anchorKind: "venue" as const,
          anchorId: payload.id,
          anchorTitle: payload.name,
          anchorWhy: `${payload.name} is one of ${dayDest.city}'s reference rooms tonight.`,
          positionOverride: null
        } as ItineraryDayWithPosition;
      });
      onChange({ ...itinerary, days: nextDays });
      return;
    }

    if (activeData?.kind === "day" && overId.startsWith("day-") && overId !== active.id) {
      const fromDay = activeData.dayNumber as number;
      const toDay = parseInt(overId.replace("day-", ""), 10);
      const fromIndex = itinerary.days.findIndex((d) => d.day === fromDay);
      const toIndex = itinerary.days.findIndex((d) => d.day === toDay);
      if (fromIndex < 0 || toIndex < 0) return;
      if (itinerary.days[fromIndex].legSlug !== itinerary.days[toIndex].legSlug) return;
      const reordered = arrayMove(itinerary.days, fromIndex, toIndex);
      const dates = itinerary.days.map((d) => d.dateISO).filter((d): d is string => Boolean(d));
      const renumbered = reordered.map((d, i) => ({ ...d, day: i + 1, dateISO: dates[i] ?? d.dateISO }));
      onChange({ ...itinerary, days: renumbered });
    }
  }

  const hasOverrides = itinerary.days.some(
    (d) => (d as ItineraryDayWithPosition).positionOverride
  );

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragEnd={handleAnchorDrop}>
      <div ref={containerRef} className="relative h-[78vh] min-h-[640px] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)]">
        {/* The map fills the canvas. `isolation: isolate` traps leaflet's internal
            pane z-indexes (up to 700) inside this stacking context so they don't
            paint over the absolute-positioned overlays below. */}
        <div
          ref={mapContainerRef}
          className="absolute inset-0 isolate"
          aria-label="Trip map canvas"
        />

        {/* Top-left: route summary chip */}
        <div className="pointer-events-none absolute left-4 top-4 z-10 max-w-[60%]">
          <div className="pointer-events-auto rounded-2xl border border-[var(--border-strong)] bg-[var(--background)]/85 px-4 py-3 backdrop-blur-md">
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--muted)]">
              route · {itinerary.durationDays} days
            </p>
            <p className="mt-1 truncate text-[15px] font-medium text-[var(--foreground)]">
              {legSlugs
                .map((slug) => destinationBySlug.get(slug)?.city ?? slug)
                .join(" → ")}
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
              drag a day marker to reposition · drop an anchor onto a day in the strip
            </p>
          </div>
        </div>

        {/* Top-right: control buttons */}
        <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-2">
          {hasOverrides ? (
            <button
              type="button"
              onClick={resetPositions}
              className="pointer-events-auto rounded-full border border-[var(--border-strong)] bg-[var(--background)]/85 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground)] backdrop-blur transition hover:border-[var(--foreground)]"
            >
              reset positions
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setLibraryOpen((v) => !v)}
            className={`pointer-events-auto rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] backdrop-blur transition ${
              libraryOpen
                ? "border-[var(--signal)] bg-[var(--signal)]/10 text-[var(--signal)]"
                : "border-[var(--border-strong)] bg-[var(--background)]/85 text-[var(--foreground)] hover:border-[var(--foreground)]"
            }`}
          >
            {libraryOpen ? "hide library ↗" : "anchor library ↗"}
          </button>
        </div>

        {/* Bottom-left: mini stats */}
        <div className="absolute bottom-[164px] left-4 z-10 w-[280px]">
          <StatsPanel itinerary={itinerary} />
        </div>

        {/* Bottom: filmstrip */}
        <div className="absolute bottom-3 left-4 right-4 z-10">
          <SortableContext items={itinerary.days.map((d) => `day-${d.day}`)} strategy={horizontalListSortingStrategy}>
            <ul className="flex gap-3 overflow-x-auto pb-1.5">
              {itinerary.days.map((day) => (
                <FilmstripCard
                  key={`day-${day.day}`}
                  day={day}
                  destination={destinationBySlug.get(day.legSlug ?? legSlugs[0]) ?? destination}
                  isActive={activeDay === day.day}
                  onClick={() => setActiveDay(day.day)}
                />
              ))}
            </ul>
          </SortableContext>
        </div>

        {/* Right edge: collapsible anchor library panel */}
        <aside
          className={`absolute right-0 top-0 z-20 flex h-full w-[300px] transform flex-col bg-[var(--background)]/96 backdrop-blur-md transition-transform duration-300 ease-out ${
            libraryOpen ? "translate-x-0 border-l border-[var(--border-strong)]" : "translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col p-3">
            <AnchorLibrary legSlugs={legSlugs} usedAnchorIds={usedAnchorIds} />
          </div>
        </aside>
      </div>
    </DndContext>
  );
}

function FilmstripCard({
  day,
  destination,
  isActive,
  onClick
}: {
  day: ItineraryDay;
  destination: Destination;
  isActive: boolean;
  onClick: () => void;
}) {
  const sortableId = `day-${day.day}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: { kind: "day", dayNumber: day.day }
  });
  const event = day.anchorKind === "event" && day.anchorId
    ? getEventsForDestination(destination.slug).find((e) => e.id === day.anchorId)
    : null;
  const venue = day.anchorKind === "venue" && day.anchorId
    ? getVenuesForDestination(destination.slug).find((v) => v.id === day.anchorId)
    : null;
  const iconKind = anchorIconKindFor({ kind: day.anchorKind, type: event?.type ?? venue?.type });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className={`group relative flex h-[140px] w-[200px] shrink-0 cursor-pointer flex-col rounded-xl border bg-[var(--surface)]/95 p-3 backdrop-blur-md transition-all ${
        isActive
          ? "border-[var(--signal)] ring-2 ring-[var(--signal)]/40 -translate-y-1 shadow-[0_18px_40px_-20px_rgba(255,139,61,0.55)]"
          : "border-[var(--border-strong)] hover:border-[var(--foreground)]/40 hover:-translate-y-0.5"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
          d{String(day.day).padStart(2, "0")}
        </span>
        <button
          type="button"
          {...listeners}
          {...attributes}
          aria-label="Drag to reorder"
          onClick={(event) => event.stopPropagation()}
          className="cursor-grab touch-none text-[var(--muted-2)] transition hover:text-[var(--foreground)] active:cursor-grabbing"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <circle cx="3" cy="3" r="1" fill="currentColor" />
            <circle cx="9" cy="3" r="1" fill="currentColor" />
            <circle cx="3" cy="6" r="1" fill="currentColor" />
            <circle cx="9" cy="6" r="1" fill="currentColor" />
            <circle cx="3" cy="9" r="1" fill="currentColor" />
            <circle cx="9" cy="9" r="1" fill="currentColor" />
          </svg>
        </button>
      </div>
      <div className="mt-2 flex items-start gap-2">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--border)] bg-[var(--background)]/60 text-[var(--foreground)]/85">
          <AnchorTypeIcon kind={iconKind} size={14} />
        </span>
        <p className="line-clamp-3 text-[12px] font-medium leading-snug text-[var(--foreground)]">
          {day.anchorTitle}
        </p>
      </div>
      <p className="mt-auto truncate font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
        {destination.city.toLowerCase()}
      </p>
    </li>
  );
}

function dedupePositions(positions: Array<{ lat: number; lng: number }>) {
  const seen = new Set<string>();
  const out: Array<{ lat: number; lng: number }> = [];
  for (const p of positions) {
    const key = `${p.lat.toFixed(4)}:${p.lng.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function positionKey(p: { lat: number; lng: number }) {
  return `${p.lat.toFixed(4)}:${p.lng.toFixed(4)}`;
}

function countAtSamePosition(
  positions: Array<{ lat: number; lng: number }>,
  target: { lat: number; lng: number }
) {
  const key = positionKey(target);
  return positions.filter((p) => positionKey(p) === key).length;
}

function indexAmongSharedCoords(
  positions: Array<{ lat: number; lng: number }>,
  target: { lat: number; lng: number },
  flatIndex: number
) {
  const key = positionKey(target);
  let n = 0;
  for (let i = 0; i < flatIndex; i++) {
    if (positionKey(positions[i]) === key) n++;
  }
  return n;
}

// Distribute markers around a circle. The first pin sits straight north
// (visually "above" the location) and we walk clockwise. For 4 pins this
// gives top / right / bottom / left — clean, predictable, no overlap.
function polarOffsetForIndex(idx: number, total: number, radiusPx: number) {
  if (total === 1) return { dx: 0, dy: 0 };
  const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
  return {
    dx: Math.round(Math.cos(angle) * radiusPx),
    dy: Math.round(Math.sin(angle) * radiusPx)
  };
}

function positionForDay(
  day: ItineraryDay,
  destinationBySlug: Map<string, Destination>
): { lat: number; lng: number } {
  const withPosition = day as ItineraryDayWithPosition;
  if (withPosition.positionOverride) return withPosition.positionOverride;

  const slug = day.legSlug ?? destinationBySlug.keys().next().value ?? "";
  const dest = destinationBySlug.get(slug);

  if (day.anchorKind === "venue" && day.anchorId && dest) {
    const venue = getVenuesForDestination(dest.slug).find((v) => v.id === day.anchorId);
    if (venue?.coordinates) return venue.coordinates;
  }
  if (day.anchorKind === "event" && day.anchorId && dest) {
    const event = getEventsForDestination(dest.slug).find((e) => e.id === day.anchorId);
    if (event?.venueId) {
      const venue = getVenuesForDestination(dest.slug).find((v) => v.id === event.venueId);
      if (venue?.coordinates) return venue.coordinates;
    }
  }
  if (dest) return dest.coordinates;
  return { lat: 0, lng: 0 };
}

function renderMarkerHtml(args: {
  dayNumber: number;
  city: string;
  title: string;
  iconKind: ReturnType<typeof anchorIconKindFor>;
  isActive: boolean;
}) {
  const { dayNumber, city, title, isActive } = args;
  const num = String(dayNumber).padStart(2, "0");
  const titleSafe = title.length > 28 ? title.slice(0, 28) + "…" : title;
  return `
    <div class="wn-day-marker-wrap ${isActive ? "is-active" : ""}">
      <div class="wn-day-marker-pin">
        <span class="wn-day-marker-num">${num}</span>
      </div>
      <div class="wn-day-marker-card">
        <p class="wn-day-marker-city">${city}</p>
        <p class="wn-day-marker-title">${titleSafe}</p>
      </div>
    </div>
  `;
}
