"use client";

// "The product remembers you" strip. Shows on return visits: where you left
// off, and — because the corpus keeps growing via research — how many events
// landed for that city-month since you last looked.

import { useEffect, useMemo, useState } from "react";
import { usePreview } from "@/components/preview/PreviewContext";
import {
  getDestinationBySlug,
  getEventsForDestinationInMonth
} from "@/data/music-travel";
import { getMonthLabel } from "@/data/taxonomy";
import { trackEvent } from "@/lib/analytics";
import { clearLastVisit, readLastVisit, type LastVisit } from "@/lib/last-visit";

// Only greet on a *return* session, not while hopping around in the same one.
const MIN_AGE_MS = 45 * 60 * 1000;

export function WelcomeBack() {
  const preview = usePreview();
  const [visit, setVisit] = useState<LastVisit | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Deferred so we don't setState synchronously inside the effect body
    // (matches the pattern used across the codebase for hydration-safe reads).
    queueMicrotask(() => {
      if (cancelled) return;
      const last = readLastVisit();
      if (!last) return;
      if (Date.now() - last.ts < MIN_AGE_MS) return;
      if (!getDestinationBySlug(last.slug)) return;
      setVisit(last);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const details = useMemo(() => {
    if (!visit) return null;
    const destination = getDestinationBySlug(visit.slug);
    if (!destination) return null;
    const currentCount = getEventsForDestinationInMonth(visit.slug, visit.month, visit.year).length;
    const delta = Math.max(0, currentCount - visit.eventCount);
    return { destination, delta };
  }, [visit]);

  if (!visit || !details || dismissed) return null;

  const monthLabel = getMonthLabel(visit.month).toLowerCase();

  return (
    <div className="animate-fade-in flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <p className="flex min-w-0 items-center gap-2.5 text-[13px] text-[var(--foreground)]/90">
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--signal)] shadow-[0_0_6px_var(--signal)]"
        />
        <span className="min-w-0">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
            welcome back ·{" "}
          </span>
          you were on{" "}
          <span className="font-medium">
            {details.destination.city} · {monthLabel} {visit.year}
          </span>
          {details.delta > 0 ? (
            <span className="text-[var(--signal)]">
              {" "}
              — {details.delta} new {details.delta === 1 ? "event" : "events"} since your last look
            </span>
          ) : null}
        </span>
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => {
            trackEvent("preview_open", { slug: visit.slug, month: visit.month, source: "welcome-back" });
            preview?.open({
              kind: "destination",
              destinationSlug: visit.slug,
              month: visit.month,
              year: visit.year
            });
          }}
          className="rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--background)] transition hover:bg-transparent hover:text-[var(--foreground)]"
        >
          pick up where you left off
        </button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            setDismissed(true);
            clearLastVisit();
          }}
          className="rounded-full border border-[var(--border-strong)] px-2.5 py-1.5 font-mono text-[10px] text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
