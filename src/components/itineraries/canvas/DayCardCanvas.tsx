"use client";

import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ItineraryDay } from "@/lib/itineraries/generate";
import type { Destination } from "@/types/content";

type DayCardCanvasProps = {
  day: ItineraryDay;
  destination: Destination;
  isLegStart: boolean;
  isFirstDay: boolean;
  isHighlighted: boolean;
  onHover?: (dayNumber: number | null) => void;
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DayCardCanvas({
  day,
  destination,
  isLegStart,
  isFirstDay,
  isHighlighted,
  onHover
}: DayCardCanvasProps) {
  const sortableId = `day-${day.day}`;
  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: { kind: "day", dayNumber: day.day }
  });
  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: `dropzone-${day.day}`,
    data: { kind: "day-dropzone", dayNumber: day.day }
  });

  function setRefs(node: HTMLLIElement | null) {
    setSortableRef(node);
    setDroppableRef(node);
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  };

  const dateLabel = day.dateISO
    ? `${DOW[new Date(day.dateISO + "T12:00:00Z").getUTCDay()]} ${day.dateISO}`
    : `Day ${day.day}`;

  return (
    <li
      ref={setRefs}
      style={style}
      onMouseEnter={() => onHover?.(day.day)}
      onMouseLeave={() => onHover?.(null)}
      className={`relative ${isLegStart && !isFirstDay ? "mt-8" : ""}`}
    >
      {isLegStart ? (
        <div className="mb-4 flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--muted)]">
            {isFirstDay ? "starts in" : "next stop"}
          </span>
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
            {destination.city}
          </span>
        </div>
      ) : null}

      <div
        className={`group relative grid grid-cols-[44px_1fr] gap-3 rounded-xl border bg-[var(--surface)] p-4 transition ${
          isOver
            ? "border-[var(--signal)] ring-2 ring-[var(--signal)]/40"
            : isHighlighted
              ? "border-[var(--foreground)]/30"
              : "border-[var(--border)] hover:border-[var(--border-strong)]"
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            {...listeners}
            {...attributes}
            aria-label="Drag to reorder"
            className="grid h-8 w-8 cursor-grab touch-none place-items-center rounded-md text-[var(--muted-2)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] active:cursor-grabbing"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <circle cx="3" cy="3" r="1.2" fill="currentColor" />
              <circle cx="11" cy="3" r="1.2" fill="currentColor" />
              <circle cx="3" cy="7" r="1.2" fill="currentColor" />
              <circle cx="11" cy="7" r="1.2" fill="currentColor" />
              <circle cx="3" cy="11" r="1.2" fill="currentColor" />
              <circle cx="11" cy="11" r="1.2" fill="currentColor" />
            </svg>
          </button>
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--muted)] text-center">
            d{String(day.day).padStart(2, "0")}
          </p>
        </div>

        <div className="min-w-0">
          <p className="flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
            <span className="text-[var(--signal)]">
              {day.anchorKind === "event" ? "event" : day.anchorKind === "venue" ? "venue" : "open day"}
            </span>
            <span>{dateLabel}</span>
            <span className="ml-auto text-[var(--muted-2)]">{day.neighborhood}</span>
          </p>
          <h3 className="mt-2 truncate text-[18px] font-medium leading-tight text-[var(--foreground)]">
            {day.anchorTitle}
          </h3>
          {day.anchorWhy ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[var(--muted)]">{day.anchorWhy}</p>
          ) : null}
          <div className="mt-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
            <span>{day.meal_morning}</span>
            <span>·</span>
            <span>{day.meal_evening}</span>
            <span className="ml-auto text-[var(--muted)]">
              ${day.costBandUsd.low}–${day.costBandUsd.high}
            </span>
          </div>
        </div>

        {isOver ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-[var(--signal)]/8">
            <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--signal)]">
              drop to swap anchor
            </span>
          </div>
        ) : null}
      </div>
    </li>
  );
}
