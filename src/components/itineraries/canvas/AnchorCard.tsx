"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

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

  if (payload.kind === "event") {
    return (
      <li
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`group cursor-grab touch-none select-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 transition active:cursor-grabbing ${
          isDragging ? "opacity-30" : "hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
        } ${inUse ? "opacity-50" : ""}`}
      >
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--signal)]">
            {payload.type.replace("-", " ")}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
            {payload.startDate}
          </span>
          <span className="ml-auto font-mono text-[10px] text-[var(--muted-2)]">{payload.importance}</span>
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
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`group cursor-grab touch-none select-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 transition active:cursor-grabbing ${
        isDragging ? "opacity-30" : "hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
      } ${inUse ? "opacity-50" : ""}`}
    >
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
    </li>
  );
}
