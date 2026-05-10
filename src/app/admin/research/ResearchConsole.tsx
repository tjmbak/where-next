"use client";

import { useCallback, useMemo, useState } from "react";
import { MONTHS, getMonthLabel } from "@/data/taxonomy";
import type { MonthNumber } from "@/types/content";
import type { DraftEnvelope } from "@/lib/research/draft-store";

type DestinationLite = {
  slug: string;
  city: string;
  country: string;
  activeMonths: MonthNumber[];
  peakMonths: MonthNumber[];
};

type DraftSummary = {
  slug: string;
  month: MonthNumber;
  year: number;
  generatedAt: string;
  eventsCount: number;
  searchCalls: number;
};

type ApprovedSummary = {
  slug: string;
  month: MonthNumber;
  year: number;
  approvedAt: string;
  eventsCount: number;
};

type ResearchConsoleProps = {
  destinations: DestinationLite[];
  initialDrafts: DraftSummary[];
  initialApproved: ApprovedSummary[];
};

const DEFAULT_YEAR = 2026;

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const seconds = Math.round((Date.now() - t) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
  return `${Math.round(seconds / 86400)}d ago`;
}

export function ResearchConsole({
  destinations,
  initialDrafts,
  initialApproved
}: ResearchConsoleProps) {
  const [drafts, setDrafts] = useState<DraftSummary[]>(initialDrafts);
  const [approved, setApproved] = useState<ApprovedSummary[]>(initialApproved);

  const [selectedSlug, setSelectedSlug] = useState<string>(destinations[0]?.slug ?? "");
  const [requestedMonth, setRequestedMonth] = useState<MonthNumber>(
    (destinations[0]?.peakMonths[0] ?? destinations[0]?.activeMonths[0] ?? 7) as MonthNumber
  );
  const [year] = useState<number>(DEFAULT_YEAR);

  const [running, setRunning] = useState(false);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<string | null>(null);

  const [openDraft, setOpenDraft] = useState<DraftEnvelope | null>(null);
  const [openLoading, setOpenLoading] = useState(false);

  const selectedDestination = useMemo(
    () => destinations.find((d) => d.slug === selectedSlug) ?? destinations[0],
    [destinations, selectedSlug]
  );

  // Derived: if user switches to a destination that doesn't support the
  // currently-requested month, fall back to that destination's first peak
  // month. Computed instead of useEffect+setState to avoid cascading renders.
  const selectedMonth = useMemo<MonthNumber>(() => {
    if (!selectedDestination) return requestedMonth;
    if (selectedDestination.activeMonths.includes(requestedMonth)) {
      return requestedMonth;
    }
    return (selectedDestination.peakMonths[0] ??
      selectedDestination.activeMonths[0] ??
      1) as MonthNumber;
  }, [selectedDestination, requestedMonth]);

  const setSelectedMonth = setRequestedMonth;

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/research/state", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setDrafts(json.drafts ?? []);
        setApproved(json.approved ?? []);
      }
    } catch (err) {
      console.warn("[research-console] refresh state:", err);
    }
  }, []);

  const handleResearch = useCallback(async () => {
    if (!selectedSlug || !selectedMonth) return;
    setRunning(true);
    setErrorLine(null);
    setStatusLine(`gpt-5.5 researching ${selectedDestination?.city} · ${getMonthLabel(selectedMonth)} ${year}…`);

    const startedAt = Date.now();
    try {
      const res = await fetch("/api/admin/research/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: selectedSlug, month: selectedMonth, year })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? json.message ?? `HTTP ${res.status}`);
      }
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      const env = json.envelope as DraftEnvelope;
      setStatusLine(
        `done in ${elapsed}s · ${env.data.events.length} events · ${env.searchCalls} web searches`
      );
      await refreshState();
      setOpenDraft(env);
    } catch (err) {
      setStatusLine(null);
      setErrorLine(err instanceof Error ? err.message : "research failed");
    } finally {
      setRunning(false);
    }
  }, [selectedSlug, selectedMonth, year, selectedDestination?.city, refreshState]);

  const openDraftFor = useCallback(
    async (slug: string, month: MonthNumber, draftYear: number) => {
      setOpenLoading(true);
      try {
        const res = await fetch(
          `/api/admin/research/state?slug=${encodeURIComponent(
            slug
          )}&month=${month}&year=${draftYear}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (json.ok && json.draft) {
          setOpenDraft(json.draft as DraftEnvelope);
        } else {
          setErrorLine("draft not found");
        }
      } finally {
        setOpenLoading(false);
      }
    },
    []
  );

  const closeDraft = useCallback(() => setOpenDraft(null), []);

  const handleApprove = useCallback(async () => {
    if (!openDraft) return;
    setRunning(true);
    setStatusLine(null);
    setErrorLine(null);
    try {
      const res = await fetch("/api/admin/research/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          slug: openDraft.slug,
          month: openDraft.month,
          year: openDraft.year
        })
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setStatusLine(
        `approved · ${openDraft.data.events.length} events live for ${openDraft.slug}/${getMonthLabel(openDraft.month)}`
      );
      await refreshState();
      closeDraft();
    } catch (err) {
      setErrorLine(err instanceof Error ? err.message : "approve failed");
    } finally {
      setRunning(false);
    }
  }, [openDraft, refreshState, closeDraft]);

  const handleDiscardDraft = useCallback(async () => {
    if (!openDraft) return;
    setRunning(true);
    setStatusLine(null);
    setErrorLine(null);
    try {
      const res = await fetch("/api/admin/research/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "discard-draft",
          slug: openDraft.slug,
          month: openDraft.month,
          year: openDraft.year
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setStatusLine("draft discarded");
      await refreshState();
      closeDraft();
    } catch (err) {
      setErrorLine(err instanceof Error ? err.message : "discard failed");
    } finally {
      setRunning(false);
    }
  }, [openDraft, refreshState, closeDraft]);

  const handleRevertApproved = useCallback(
    async (slug: string, month: MonthNumber, approvedYear: number) => {
      setRunning(true);
      setStatusLine(null);
      setErrorLine(null);
      try {
        const res = await fetch("/api/admin/research/approve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reject",
            slug,
            month,
            year: approvedYear
          })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        setStatusLine(`reverted ${slug}/${getMonthLabel(month)} to static data`);
        await refreshState();
      } catch (err) {
        setErrorLine(err instanceof Error ? err.message : "revert failed");
      } finally {
        setRunning(false);
      }
    },
    [refreshState]
  );

  return (
    <>
      <section className="mt-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          01 · run research
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_140px_auto]">
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
              destination
            </span>
            <select
              value={selectedSlug}
              onChange={(e) => setSelectedSlug(e.target.value)}
              disabled={running}
              className="rounded-md border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              {destinations.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.city}, {d.country}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
              month
            </span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value) as MonthNumber)}
              disabled={running}
              className="rounded-md border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
            >
              {(selectedDestination?.activeMonths ?? MONTHS.map((m) => m.value)).map((m) => (
                <option key={m} value={m}>
                  {getMonthLabel(m)}
                  {selectedDestination?.peakMonths.includes(m) ? " · peak" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
              year
            </span>
            <input
              value={year}
              readOnly
              className="rounded-md border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--muted)]"
            />
          </label>
          <button
            type="button"
            onClick={handleResearch}
            disabled={running || !selectedSlug}
            className="self-end rounded-md border border-[var(--signal)]/55 bg-[var(--signal)]/15 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--signal)] transition hover:bg-[var(--signal)]/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? "researching…" : "run gpt-5.5"}
          </button>
        </div>
        {statusLine ? (
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--signal)]">
            {statusLine}
          </p>
        ) : null}
        {errorLine ? (
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--alert,#ff6363)]">
            error · {errorLine}
          </p>
        ) : null}
        <p className="mt-4 text-xs leading-5 text-[var(--muted-2)]">
          Filter-only queries skip web_search and finish in ~5s. Event research with web_search runs
          agentic search across multiple venues and typically takes 60–180s.
        </p>
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-2">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
            02 · drafts pending review · {drafts.length}
          </h2>
        </div>
        {drafts.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            No drafts yet. Run research above to generate one.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {drafts.map((draft) => {
              const dest = destinations.find((d) => d.slug === draft.slug);
              return (
                <li
                  key={`${draft.slug}-${draft.year}-${draft.month}`}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--signal)]/55"
                >
                  <button
                    type="button"
                    onClick={() => openDraftFor(draft.slug, draft.month, draft.year)}
                    disabled={openLoading}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {dest?.city ?? draft.slug} ·{" "}
                        <span className="text-[var(--muted)]">
                          {getMonthLabel(draft.month)} {draft.year}
                        </span>
                      </p>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted-2)]">
                        {draft.eventsCount} events · {draft.searchCalls} searches · {relativeTime(draft.generatedAt)}
                      </p>
                    </div>
                    <span className="rounded-full border border-[var(--signal)]/55 bg-[var(--signal)]/15 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
                      review →
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-baseline justify-between border-b border-[var(--border)] pb-2">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
            03 · approved (live on the map) · {approved.length}
          </h2>
        </div>
        {approved.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Nothing approved yet. The map is showing static blueprint data.
          </p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {approved.map((entry) => {
              const dest = destinations.find((d) => d.slug === entry.slug);
              return (
                <li
                  key={`${entry.slug}-${entry.year}-${entry.month}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2"
                >
                  <span className="text-sm text-[var(--foreground)]">
                    {dest?.city ?? entry.slug} · {getMonthLabel(entry.month)} {entry.year} ·{" "}
                    <span className="text-[var(--muted)]">{entry.eventsCount} events</span>
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
                    {relativeTime(entry.approvedAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRevertApproved(entry.slug, entry.month, entry.year)}
                    disabled={running}
                    className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--alert,#ff6363)]"
                  >
                    revert
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {openDraft ? (
        <DraftReviewModal
          draft={openDraft}
          destinationCity={destinations.find((d) => d.slug === openDraft.slug)?.city ?? openDraft.slug}
          onApprove={handleApprove}
          onDiscard={handleDiscardDraft}
          onClose={closeDraft}
          working={running}
        />
      ) : null}
    </>
  );
}

function DraftReviewModal({
  draft,
  destinationCity,
  onApprove,
  onDiscard,
  onClose,
  working
}: {
  draft: DraftEnvelope;
  destinationCity: string;
  onApprove: () => void;
  onDiscard: () => void;
  onClose: () => void;
  working: boolean;
}) {
  const sortedEvents = useMemo(
    () => [...draft.data.events].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [draft.data.events]
  );

  return (
    <div
      role="dialog"
      aria-modal
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-xl border-t border-[var(--border-strong)] bg-[var(--background)] sm:rounded-xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              gpt-5.5 draft · {draft.searchCalls} searches · {draft.responseId.slice(-8)}
            </p>
            <h3 className="mt-1 text-xl font-medium text-[var(--foreground)]">
              {destinationCity} · {getMonthLabel(draft.month)} {draft.year}
            </h3>
            {draft.data.notes ? (
              <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">{draft.data.notes}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            ×
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {sortedEvents.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No events confirmed in research.</p>
          ) : (
            <ol className="space-y-3">
              {sortedEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{ev.title}</p>
                      <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                        {ev.startDate}
                        {ev.endDate && ev.endDate !== ev.startDate ? ` → ${ev.endDate}` : ""} · {ev.type}
                        {ev.venueName ? ` · ${ev.venueName}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full border border-[var(--border-strong)] bg-[var(--background)] px-2 py-0.5 font-mono text-[10px] text-[var(--muted)]">
                      {ev.importance}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{ev.summary}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {ev.genres.map((g) => (
                      <span
                        key={g}
                        className="rounded-full border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]"
                      >
                        {g}
                      </span>
                    ))}
                    <a
                      href={ev.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-[var(--background)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] transition hover:border-[var(--signal)]/55 hover:text-[var(--foreground)]"
                    >
                      <span aria-hidden>↗</span>
                      {host(ev.sourceUrl)}
                    </a>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface)] px-6 py-3">
          <button
            type="button"
            onClick={onDiscard}
            disabled={working}
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--alert,#ff6363)] disabled:opacity-50"
          >
            discard draft
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={working}
              className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)] disabled:opacity-50"
            >
              close
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={working || sortedEvents.length === 0}
              className="rounded-md border border-[var(--signal)]/55 bg-[var(--signal)]/15 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--signal)] transition hover:bg-[var(--signal)]/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {working ? "approving…" : `approve · ${sortedEvents.length}`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
