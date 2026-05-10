"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AnchorTypeIcon, anchorIconKindFor } from "@/components/itineraries/canvas/AnchorTypeIcon";

export type AnchorPayload =
  | {
      kind: "event";
      id: string;
      legSlug: string;
      title: string;
      type: string;
      summary: string;
      startDate: string;
      venueName: string | null;
      importance: number;
    }
  | {
      kind: "venue";
      id: string;
      legSlug: string;
      name: string;
      type: string;
      sceneTags: string[];
    };

type AnchorCardProps = {
  payload: AnchorPayload;
  inUse?: boolean;
};

export function AnchorCard({ payload, inUse }: AnchorCardProps) {
  const dragId = `anchor-${payload.kind}-${payload.id}`;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { kind: "anchor", payload }
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 50 : undefined
      }
    : undefined;

  const iconKind =
    payload.kind === "event"
      ? anchorIconKindFor({ kind: "event", type: payload.type })
      : anchorIconKindFor({ kind: "venue", type: payload.type });

  if (payload.kind === "event") {
    return (
      <li
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`group relative cursor-grab touch-none select-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 transition-all duration-150 active:cursor-grabbing ${
          isDragging
            ? "opacity-30"
            : "hover:-translate-y-0.5 hover:border-[var(--foreground)]/30 hover:bg-[var(--surface-2)] hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]"
        } ${inUse ? "opacity-45" : ""}`}
      >
        <div className="flex items-start gap-2.5">
          <ImportanceRing value={payload.importance} icon={iconKind} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--signal)]">
                {payload.type.replace("-", " ")}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
                {payload.startDate}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-tight text-[var(--foreground)]">
              {payload.title}
            </p>
            {payload.venueName ? (
              <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                {payload.venueName}
              </p>
            ) : null}
            {inUse ? (
              <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--muted-2)]">in trip</p>
            ) : null}
          </div>
        </div>
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group relative cursor-grab touch-none select-none rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 transition-all duration-150 active:cursor-grabbing ${
        isDragging
          ? "opacity-30"
          : "hover:-translate-y-0.5 hover:border-[var(--foreground)]/30 hover:bg-[var(--surface-2)] hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]"
      } ${inUse ? "opacity-45" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        <ImportanceRing value={null} icon={iconKind} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--signal)]">
              {payload.type.replace("-", " ")}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">venue</span>
          </div>
          <p className="mt-1 truncate text-[13px] font-medium leading-tight text-[var(--foreground)]">{payload.name}</p>
          {payload.sceneTags.length > 0 ? (
            <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
              {payload.sceneTags.slice(0, 3).join(" · ")}
            </p>
          ) : null}
          {inUse ? (
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--muted-2)]">in trip</p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function ImportanceRing({
  value,
  icon
}: {
  value: number | null;
  icon: ReturnType<typeof anchorIconKindFor>;
}) {
  // Render a 28px circular svg with an arc proportional to importance (0-100),
  // and the anchor-type icon centered.
  const size = 30;
  const radius = (size - 3) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value == null ? 1 : Math.max(0, Math.min(1, value / 100));
  const dash = circumference * pct;
  return (
    <span className="relative grid h-[30px] w-[30px] shrink-0 place-items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--border-strong)" strokeWidth="1.5" />
        {value != null ? (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="var(--signal)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ) : null}
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[var(--foreground)]/85">
        <AnchorTypeIcon kind={icon} size={14} />
      </span>
    </span>
  );
}
