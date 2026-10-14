"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { EventType } from "@/types/content";

export type BrowserEvent = {
  id: string;
  title: string;
  type: EventType;
  startDate: string;
  endDate?: string;
  city: string;
  href: string;
  confirmed: boolean;
};

const TYPE_LABELS: Record<EventType, string> = {
  festival: "Festivals",
  "club-night": "Club nights",
  concert: "Concerts",
  residency: "Residencies",
  "beach-club": "Beach clubs",
  carnival: "Carnivals",
  conference: "Conferences"
};

const TYPE_SINGULAR: Record<EventType, string> = {
  festival: "Festival",
  "club-night": "Club night",
  concert: "Concert",
  residency: "Residency",
  "beach-club": "Beach club",
  carnival: "Carnival",
  conference: "Conference"
};

const PAGE_SIZE = 40;
const DAY_MS = 86_400_000;

type MonthEventBrowserProps = {
  events: BrowserEvent[];
  ended: BrowserEvent[];
  today: string;
  /** Ongoing runs are grouped under this date (today, or the 1st for future months). */
  floor: string;
};

export function MonthEventBrowser({ events, ended, today, floor }: MonthEventBrowserProps) {
  const [type, setType] = useState<EventType | "all">("all");
  const [city, setCity] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const types = useMemo(() => {
    const counts = new Map<EventType, number>();
    for (const event of [...events, ...ended]) counts.set(event.type, (counts.get(event.type) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [events, ended]);

  const cities = useMemo(
    () => [...new Set([...events, ...ended].map((event) => event.city))].sort((a, b) => a.localeCompare(b)),
    [events, ended]
  );

  const filtered = useMemo(
    () =>
      events.filter(
        (event) => (type === "all" || event.type === type) && (city === "all" || event.city === city)
      ),
    [events, type, city]
  );

  const shown = filtered.slice(0, limit);
  const endedFiltered = ended.filter(
    (event) => (type === "all" || event.type === type) && (city === "all" || event.city === city)
  );
  const groups: Array<{ key: string; label: string; events: BrowserEvent[] }> = [];
  for (const event of shown) {
    const anchor = event.startDate < floor ? floor : event.startDate;
    const key = mondayOf(anchor);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.events.push(event);
    else groups.push({ key, label: weekLabel(key, today), events: [event] });
  }
  for (const group of groups) {
    group.events.sort((a, b) => Number(a.startDate < floor) - Number(b.startDate < floor));
  }

  const reset = (next: () => void) => {
    next();
    setLimit(PAGE_SIZE);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="wn-swipe -mx-6 flex gap-2 overflow-x-auto px-6 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={type === "all"} onClick={() => reset(() => setType("all"))}>
            All
          </Chip>
          {types.map(([value]) => (
            <Chip key={value} active={type === value} onClick={() => reset(() => setType(value))}>
              {TYPE_LABELS[value]}
            </Chip>
          ))}
        </div>
        <label className="relative shrink-0">
          <span className="sr-only">City</span>
          <select
            value={city}
            onChange={(e) => reset(() => setCity(e.target.value))}
            className="h-9 w-full appearance-none rounded-full border border-[var(--border-strong)] bg-[var(--surface)] pl-4 pr-9 text-[14px] font-medium text-[var(--foreground)] outline-none transition hover:border-[var(--foreground)] sm:w-auto"
          >
            <option value="all">All cities</option>
            {cities.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <span aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-[var(--muted)]">
            ▾
          </span>
        </label>
      </div>

      {groups.length > 0 || endedFiltered.length > 0 ? (
        <div className="mt-6 space-y-8">
          {groups.map((group) => (
            <section key={group.key}>
              <h3 className="border-b border-[var(--border-strong)] pb-2 text-[14px] font-semibold text-[var(--foreground)]">
                {group.label}
              </h3>
              <ol>
                {group.events.map((event) => (
                  <Row key={event.id} event={event} floor={floor} />
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : null}
      {groups.length === 0 && endedFiltered.length === 0 ? (
        <p className="mt-10 text-[15px] text-[var(--muted)]">Nothing matches those filters this month.</p>
      ) : null}

      {filtered.length > limit ? (
        <div className="mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setLimit((n) => n + PAGE_SIZE * 2)}
            className="h-11 rounded-full border border-[var(--foreground)] px-6 text-[14px] font-semibold text-[var(--foreground)] transition hover:bg-[var(--foreground)] hover:text-[var(--background)]"
          >
            Show more
          </button>
          <p className="text-[13px] text-[var(--muted)]">
            Showing {shown.length} of {filtered.length}
          </p>
        </div>
      ) : null}

      {endedFiltered.length > 0 && filtered.length <= limit ? (
        <details className="group mt-10 rounded-2xl border border-[var(--border)]" open={events.length === 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[14px] font-medium text-[var(--muted)] transition hover:text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
            {endedFiltered.length} already happened
            <span aria-hidden className="transition group-open:rotate-180">
              ▾
            </span>
          </summary>
          <ol className="border-t border-[var(--border)] px-5 opacity-60">
            {endedFiltered.map((event) => (
              <Row key={event.id} event={event} floor={floor} />
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-9 shrink-0 rounded-full border px-4 text-[14px] font-medium transition ${
        active
          ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
          : "border-[var(--border-strong)] text-[var(--foreground)] hover:border-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}

function Row({ event, floor }: { event: BrowserEvent; floor: string }) {
  const start = new Date(`${event.startDate}T00:00:00Z`);
  const valid = !Number.isNaN(start.getTime());
  const weekday = valid ? start.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }) : "";
  const day = valid ? start.getUTCDate() : "—";
  const ongoing = event.startDate < floor;
  const until = event.endDate && event.endDate !== event.startDate ? formatShort(event.endDate) : null;

  return (
    <li className="border-b border-[var(--border)] last:border-b-0">
      <Link href={event.href} className="group flex items-center gap-4 py-3.5 sm:gap-5">
        <div className="w-11 shrink-0 text-center">
          {ongoing ? (
            <>
              <p className="text-[11px] font-medium text-[var(--muted)]">Since</p>
              <p className="text-[13px] font-semibold leading-6 text-[var(--foreground)]">{formatShort(event.startDate)}</p>
            </>
          ) : (
            <>
              <p className="text-[11px] font-medium text-[var(--muted)]">{weekday}</p>
              <p className="text-[19px] font-semibold leading-6 text-[var(--foreground)]">{day}</p>
            </>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[15px] font-medium text-[var(--foreground)] transition group-hover:text-[var(--signal)] sm:text-[16px]">
            {event.title}
          </p>
          <p className="mt-0.5 truncate text-[13px] text-[var(--muted)]">
            {event.city} · {TYPE_SINGULAR[event.type]}
            {until ? ` · until ${until}` : ""}
            {event.confirmed ? "" : " · dates tbc"}
          </p>
        </div>
        <span aria-hidden className="shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--foreground)]">
          →
        </span>
      </Link>
    </li>
  );
}

function mondayOf(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  return new Date(date.getTime() - offset * DAY_MS).toISOString().slice(0, 10);
}

function weekLabel(mondayIso: string, today: string): string {
  const weeksAway = Math.round((Date.parse(mondayIso) - Date.parse(mondayOf(today))) / (7 * DAY_MS));
  const sunday = new Date(Date.parse(mondayIso) + 6 * DAY_MS).toISOString().slice(0, 10);
  const range = `${formatShort(mondayIso)} – ${formatShort(sunday)}`;
  if (weeksAway === 0) return `This week · ${range}`;
  if (weeksAway === 1) return `Next week · ${range}`;
  return range;
}

function formatShort(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
