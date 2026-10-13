"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePreview, type PreviewPayload } from "@/components/preview/PreviewContext";
import { trackEvent } from "@/lib/analytics";
import {
  getDestinationBySlug,
  getEventsForDestination,
  getEventsForDestinationInMonth,
  getScoreForDestinationMonth,
  getScoresForDestination,
  getVenuesForDestination
} from "@/data/music-travel";
import {
  BUDGET_LABELS,
  GENRE_LABELS,
  SUPPORTED_YEARS,
  VIBE_LABELS,
  getMonthLabel,
  upcomingYearForMonth,
  yearQueryFor
} from "@/data/taxonomy";
import { WatchButton } from "@/components/watch/WatchButton";
import { recordVisit } from "@/lib/last-visit";
import { pickHeroForMonth } from "@/lib/hero-images";
import { useSavedDestinations } from "@/lib/saved-destinations";
import { TIER_COLORS, tierFromScore } from "@/lib/tiers";
import { isAffiliateProvider, resolveProvider, type AffiliateProvider } from "@/lib/affiliate/providers";
import type { Event, Venue } from "@/types/content";

function buildOutboundHref(
  provider: AffiliateProvider | undefined,
  href: string,
  destinationSlug: string,
  label: string
) {
  if (!provider || provider === "raw") return href;
  const params = new URLSearchParams({
    p: provider,
    d: destinationSlug,
    ctx: label,
    u: href
  });
  return `/api/out?${params.toString()}`;
}

function hostnameOf(href: string): string {
  try {
    return new URL(href, "https://localhost").host;
  } catch {
    return "external";
  }
}

export function PreviewSheet() {
  const ctx = usePreview();
  if (!ctx) return null;
  const { current, close } = ctx;
  return (
    <>
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          current ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-hidden={!current}
        className={`fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-[520px] flex-col border-l border-[var(--border-strong)] bg-[var(--background)] transition-[transform,visibility,box-shadow] duration-300 ease-out ${
          current
            ? "visible translate-x-0 shadow-[0_0_60px_rgba(0,0,0,0.5)]"
            : "invisible translate-x-full shadow-none"
        }`}
      >
        {current ? (
          current.kind === "destination" ? (
            <DestinationSheetContent payload={current} onClose={close} />
          ) : (
            <SheetContent payload={current} onClose={close} />
          )
        ) : null}
      </aside>
    </>
  );
}

function formatSheetDate(start: string, end?: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return "tba";
  const startLabel = s.toLocaleDateString("en-US", opts).toLowerCase();
  if (!end) return startLabel;
  const e = new Date(end);
  if (Number.isNaN(e.getTime())) return startLabel;
  const endLabel = e.toLocaleDateString("en-US", opts).toLowerCase();
  return startLabel === endLabel ? startLabel : `${startLabel} → ${endLabel}`;
}

function DestinationSheetContent({
  payload,
  onClose
}: {
  payload: Extract<PreviewPayload, { kind: "destination" }>;
  onClose: () => void;
}) {
  const { destinationSlug, month, year = upcomingYearForMonth(payload.month) } = payload;
  const destination = getDestinationBySlug(destinationSlug);
  const { isSaved, toggle } = useSavedDestinations();

  // Product memory: quick looks count as "where you left off".
  useEffect(() => {
    recordVisit({
      slug: destinationSlug,
      month,
      year,
      eventCount: getEventsForDestinationInMonth(destinationSlug, month, year).length
    });
  }, [destinationSlug, month, year]);

  const score = useMemo(
    () => getScoreForDestinationMonth(destinationSlug, month) ?? getScoresForDestination(destinationSlug)[0],
    [destinationSlug, month]
  );
  const upcomingEvents = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = (list: ReturnType<typeof getEventsForDestination>) =>
      list
        .filter((e) => (e.endDate ?? e.startDate) >= today)
        .sort((a, b) => b.importanceScore - a.importanceScore);
    const inMonth = upcoming(getEventsForDestinationInMonth(destinationSlug, month, year));
    const list = inMonth.length > 0 ? inMonth : upcoming(getEventsForDestination(destinationSlug, year));
    // Pick the 3 most significant, then show them in chronological order.
    return {
      fromMonth: inMonth.length > 0,
      list: list.slice(0, 3).sort((a, b) => a.startDate.localeCompare(b.startDate))
    };
  }, [destinationSlug, month, year]);
  const events = upcomingEvents.list;
  const monthHasEvents = upcomingEvents.fromMonth;
  const isCurrentMonth = month === new Date().getMonth() + 1 && year === new Date().getFullYear();

  if (!destination) return <div className="p-6 text-[var(--muted)]">not found</div>;

  const overall = score?.overallScore ?? 0;
  const tier = tierFromScore(overall);
  const tierColor = TIER_COLORS[tier];
  const why = score?.whyNow?.[0] ?? destination.summary;
  const heroSrc = pickHeroForMonth(destination, month);
  const monthLabel = getMonthLabel(month).toLowerCase();
  const hasEstimates = events.some((e) => e.confirmed === false);
  const guideHref = `/destinations/${destination.slug}?month=${month}${yearQueryFor(month, year)}`;
  const planHref = `/destinations/${destination.slug}/plan`;
  const saved = isSaved(destination.slug);
  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--muted)]">
          where next · quick look
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="rounded-full border border-[var(--border-strong)] px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          esc
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-[var(--border)] bg-[var(--surface)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroSrc} alt={destination.city} className="h-full w-full object-cover" loading="eager" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/25" />
          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/90 backdrop-blur">
            <span aria-hidden className="h-1 w-1 rounded-full" style={{ background: tierColor, boxShadow: `0 0 6px ${tierColor}` }} />
            <span className="text-white">{overall}</span>
            <span className="text-white/60">{tier}</span>
          </span>
          <div className="absolute inset-x-4 bottom-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/65">
              {destination.country.toLowerCase()} · {monthLabel} {year}
            </p>
            <h2 className="text-[clamp(1.7rem,4vw,2.4rem)] font-medium leading-none tracking-[-0.02em] text-white">
              {destination.city}
            </h2>
          </div>
        </div>

        <div className="px-6 py-6">
          <p className="text-[15px] leading-7 text-[var(--foreground)]/90">{why}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {destination.genres.slice(0, 3).map((g) => (
              <span
                key={g}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]"
              >
                {GENRE_LABELS[g] ?? g}
              </span>
            ))}
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              {BUDGET_LABELS[destination.budget]}
            </span>
            {destination.vibes.slice(0, 1).map((v) => (
              <span
                key={v}
                className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]"
              >
                {VIBE_LABELS[v] ?? v}
              </span>
            ))}
          </div>

          <section className="mt-7">
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                {monthHasEvents
                  ? `${isCurrentMonth ? "still to come in" : "happening in"} ${monthLabel}`
                  : "coming up"}
              </p>
              {hasEstimates ? (
                <span
                  title="Forward estimate from the recurring calendar — exact dates confirm closer to the date"
                  className="rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]"
                >
                  expected · dates to confirm
                </span>
              ) : null}
            </div>
            {events.length > 0 ? (
              <ul className="mt-3 divide-y divide-[var(--border)]">
                {events.map((event) => (
                  <li key={event.id} className="py-3">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-2)]">
                      {formatSheetDate(event.startDate, event.endDate)} · {event.type.replaceAll("-", " ")}
                      {event.confirmed === false ? " · expected" : ""}
                    </p>
                    <p className="mt-1 text-[14px] font-medium leading-5 text-[var(--foreground)]">{event.title}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[13px] leading-6 text-[var(--muted)]">
                Lineups for {monthLabel} are still coming together.
              </p>
            )}
          </section>
        </div>
      </div>

      <footer className="flex items-center gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-6 py-5">
        <Link
          href={guideHref}
          onClick={() => {
            trackEvent("preview_open_guide", { slug: destination.slug, month });
            onClose();
          }}
          className="group inline-flex flex-1 items-center justify-between gap-3 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-5 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
        >
          <span>open full guide</span>
          <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
        </Link>
        <Link
          href={planHref}
          onClick={onClose}
          className="hidden items-center justify-center rounded-full border border-[var(--border-strong)] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)] sm:inline-flex"
        >
          plan
        </Link>
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? `Unsave ${destination.city}` : `Save ${destination.city}`}
          onClick={() => {
            void toggle(destination.slug);
            trackEvent("destination_saved_toggle", {
              slug: destination.slug,
              action: saved ? "unsave" : "save",
              source: "preview-sheet"
            });
          }}
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition ${
            saved
              ? "border-[var(--signal)]/55 bg-[var(--signal)]/10 text-[var(--signal)]"
              : "border-[var(--border-strong)] bg-transparent text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <span aria-hidden className="text-[16px] leading-none">{saved ? "♥" : "♡"}</span>
        </button>
        <WatchButton slug={destination.slug} month={month} year={year} variant="icon" />
      </footer>
    </>
  );
}

type RemoteMeta = {
  url: string;
  resolvedUrl: string;
  hostname: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
  image: string | null;
  fetchedAt: string;
};

function useRemoteMeta(href: string | undefined) {
  const [data, setData] = useState<RemoteMeta | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "ok">("idle");
  useEffect(() => {
    if (!href) return;
    let cancelled = false;
    // Defer the loading state to a microtask so we don't setState during the
    // effect body (Tailwind v4-era React strict-mode rule).
    queueMicrotask(() => {
      if (cancelled) return;
      setStatus("loading");
      setData(null);
    });
    fetch(`/api/preview-meta?url=${encodeURIComponent(href)}`, { cache: "force-cache" })
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setStatus("error");
          return;
        }
        const body = (await response.json()) as RemoteMeta;
        setData(body);
        setStatus("ok");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [href]);
  return { data, status };
}

type OutboundPayload = Exclude<PreviewPayload, { kind: "destination" }>;

function SheetContent({ payload, onClose }: { payload: OutboundPayload; onClose: () => void }) {
  const destination = getDestinationBySlug(payload.destinationSlug);
  const outboundHref = buildOutboundHref(payload.provider, payload.href, payload.destinationSlug, payload.eventLabel);
  const { data: meta, status: metaStatus } = useRemoteMeta(payload.href);
  // When the partner link exposes no usable share image (no og:image, bot-
  // blocked, or hotlink-protected), fall back to our own city hero so the
  // sheet never shows an empty placeholder.
  const fallbackImage = destination
    ? pickHeroForMonth(destination, destination.peakMonths[0] ?? 1)
    : null;
  const partnerLabel = useMemo(() => {
    const provider =
      payload.provider && isAffiliateProvider(payload.provider)
        ? resolveProvider(payload.provider, payload.href)
        : payload.provider;
    const map: Record<string, string> = {
      booking: "Booking.com",
      skyscanner: "Skyscanner",
      gyg: "GetYourGuide",
      viagogo: "Viagogo"
    };
    if (provider && map[provider]) return map[provider];
    return meta?.siteName ?? hostnameOf(payload.href);
  }, [payload.provider, payload.href, meta]);

  return (
    <>
      <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-6 py-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--muted)]">
          where next · preview
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="rounded-full border border-[var(--border-strong)] px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          esc
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <RemoteHero status={metaStatus} meta={meta} hostname={hostnameOf(payload.href)} fallbackImage={fallbackImage} />

        <div className="px-6 py-6">
        {payload.kind === "event" ? <EventBody payload={payload} /> : null}
        {payload.kind === "venue" ? <VenueBody payload={payload} /> : null}
        {payload.kind === "external" ? <ExternalBody payload={payload} /> : null}

        {meta && (meta.description || meta.title) && (meta.description !== null || meta.title !== null) ? (
          <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              what {meta.siteName ?? meta.hostname} says
            </p>
            {meta.title ? (
              <p className="mt-2 text-[14px] font-medium leading-6 text-[var(--foreground)]">{meta.title}</p>
            ) : null}
            {meta.description ? (
              <p className="mt-2 text-[13px] leading-6 text-[var(--muted)]">{meta.description}</p>
            ) : null}
          </section>
        ) : null}

        {destination ? (
          <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              about {destination.city.toLowerCase()}
            </p>
            <p className="mt-2 text-[14px] leading-7 text-[var(--foreground)]/90">
              {destination.tagline}
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
              {destination.region} · {destination.country}
            </p>
          </section>
        ) : null}
        </div>
      </div>

      <footer className="border-t border-[var(--border)] bg-[var(--surface)] px-6 py-5">
        <a
          href={outboundHref}
          target="_blank"
          rel="noreferrer"
          onClick={() =>
            trackEvent("outbound_link_click", {
              destinationSlug: payload.destinationSlug,
              label: payload.eventLabel,
              href: payload.href,
              provider: payload.provider ?? "raw",
              source: "preview-sheet"
            })
          }
          className="group inline-flex w-full items-center justify-between gap-3 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-5 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
        >
          <span>continue to {partnerLabel}</span>
          <span aria-hidden className="font-mono text-[11px] uppercase tracking-[0.22em] transition group-hover:translate-x-0.5">
            ↗
          </span>
        </a>
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
          opens in a new tab · {hostnameOf(payload.href)}
        </p>
      </footer>
    </>
  );
}

function upcomingAcrossYears(slug: string): Event[] {
  const today = new Date().toISOString().slice(0, 10);
  return SUPPORTED_YEARS.flatMap((year) => getEventsForDestination(slug, year))
    .filter((e) => (e.endDate ?? e.startDate) >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function EventBody({ payload }: { payload: Extract<PreviewPayload, { kind: "event" }> }) {
  const event = useMemo<Event | null>(() => {
    for (const year of SUPPORTED_YEARS) {
      const hit = getEventsForDestination(payload.destinationSlug, year).find((e) => e.id === payload.eventId);
      if (hit) return hit;
    }
    return null;
  }, [payload.destinationSlug, payload.eventId]);

  const venue = useMemo<Venue | null>(() => {
    if (!event?.venueId) return null;
    return getVenuesForDestination(payload.destinationSlug).find((v) => v.id === event.venueId) ?? null;
  }, [event, payload.destinationSlug]);

  const sameVenueOthers = useMemo(() => {
    if (!event?.venueId) return [];
    return upcomingAcrossYears(payload.destinationSlug)
      .filter((e) => e.id !== event.id && e.venueId === event.venueId)
      .slice(0, 3);
  }, [event, payload.destinationSlug]);

  if (!event) {
    return <FallbackBody payload={payload} title={payload.eventLabel} />;
  }

  return (
    <article>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
        {event.type.replace("-", " ")}
      </p>
      <h2 className="mt-2 text-[clamp(1.6rem,3.5vw,2.2rem)] font-medium leading-[1.1] tracking-[-0.02em] text-[var(--foreground)]">
        {event.title}
      </h2>
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
        {event.startDate}
        {event.endDate && event.endDate !== event.startDate ? ` → ${event.endDate}` : ""}
        {venue ? ` · ${venue.name}` : ""}
      </p>

      <p className="mt-5 text-[15px] leading-7 text-[var(--foreground)]/90">{event.summary}</p>

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3">
        <Cell label="importance" value={`${event.importanceScore}/100`} />
        <Cell label="genres" value={event.genres.map((g) => GENRE_LABELS[g] ?? g).join(", ")} />
      </dl>

      {sameVenueOthers.length > 0 && venue ? (
        <section className="mt-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
            also at {venue.name.toLowerCase()}
          </p>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {sameVenueOthers.map((other) => (
              <li key={other.id} className="py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
                  {other.startDate} · {other.type.replace("-", " ")}
                </p>
                <p className="mt-1 text-[14px] font-medium text-[var(--foreground)]">{other.title}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function VenueBody({ payload }: { payload: Extract<PreviewPayload, { kind: "venue" }> }) {
  const venue = useMemo<Venue | null>(() => {
    return getVenuesForDestination(payload.destinationSlug).find((v) => v.id === payload.venueId) ?? null;
  }, [payload.destinationSlug, payload.venueId]);

  const venueEvents = useMemo(() => {
    if (!venue) return [];
    return upcomingAcrossYears(payload.destinationSlug)
      .filter((e) => e.venueId === venue.id)
      .slice(0, 5);
  }, [venue, payload.destinationSlug]);

  if (!venue) return <FallbackBody payload={payload} title={payload.eventLabel} />;

  return (
    <article>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
        {venue.type.replace("-", " ")}
      </p>
      <h2 className="mt-2 text-[clamp(1.6rem,3.5vw,2.2rem)] font-medium leading-[1.1] tracking-[-0.02em] text-[var(--foreground)]">
        {venue.name}
      </h2>
      {venue.sceneTags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {venue.sceneTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--border)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]"
            >
              {tag.replace("-", " ")}
            </span>
          ))}
        </div>
      ) : null}

      {venueEvents.length > 0 ? (
        <section className="mt-7">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
            upcoming programming
          </p>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {venueEvents.map((event) => (
              <li key={event.id} className="py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
                  {event.startDate} · {event.type.replace("-", " ")}
                </p>
                <p className="mt-1 text-[14px] font-medium text-[var(--foreground)]">{event.title}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function ExternalBody({ payload }: { payload: Extract<PreviewPayload, { kind: "external" }> }) {
  return (
    <article>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">outbound link</p>
      <h2 className="mt-2 text-[clamp(1.4rem,3vw,2rem)] font-medium leading-[1.1] tracking-[-0.02em] text-[var(--foreground)]">
        {payload.title}
      </h2>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
        {hostnameOf(payload.href)}
      </p>
      <p className="mt-6 text-[14px] leading-7 text-[var(--muted)]">
        We&apos;ll hand you over to {hostnameOf(payload.href)} for the booking. Your selections in Where Next stay saved.
      </p>
    </article>
  );
}

function FallbackBody({ payload, title }: { payload: OutboundPayload; title: string }) {
  return (
    <article>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">preview</p>
      <h2 className="mt-2 text-2xl font-medium leading-tight text-[var(--foreground)]">{title}</h2>
      <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
        {hostnameOf(payload.href)}
      </p>
    </article>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-[14px] leading-6 text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function RemoteHero({
  status,
  meta,
  hostname,
  fallbackImage
}: {
  status: "idle" | "loading" | "error" | "ok";
  meta: RemoteMeta | null;
  hostname: string;
  fallbackImage?: string | null;
}) {
  // Track partner-image load failures (hotlink/403) so we can fall back even
  // when the og:image URL existed but won't render. Stored as the broken URL
  // itself so a new meta.image naturally "resets" without an effect.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const remoteBroke = Boolean(meta?.image) && brokenUrl === meta?.image;

  const remoteImage =
    status === "ok" && meta?.image && !remoteBroke ? (meta.image as string) : null;
  // Prefer the live partner image; otherwise show our city hero immediately —
  // even while the lookup is still in flight — so there's never a long
  // skeleton wait on links that ultimately have no image. The live image
  // simply upgrades over the hero when/if it arrives.
  const heroImage = remoteImage ?? fallbackImage ?? null;
  const showImage = Boolean(heroImage);
  const showSkeleton = !showImage && status === "loading";

  return (
    <div className="relative w-full overflow-hidden border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {showImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage as string}
              alt=""
              className="h-full w-full object-cover"
              loading="eager"
              referrerPolicy="no-referrer"
              onError={() => {
                if (remoteImage) setBrokenUrl(remoteImage);
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[var(--background)] via-transparent to-transparent" />
          </>
        ) : showSkeleton ? (
          <div className="absolute inset-0 animate-pulse bg-[var(--surface-2)]" />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[var(--surface-2)]">
            <div className="flex flex-col items-center gap-2 text-[var(--muted-2)]">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 16l5-5 4 4 3-3 6 6" />
                <circle cx="9" cy="10" r="1.4" fill="currentColor" />
              </svg>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em]">no preview available</span>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
        <span className="rounded-full border border-[var(--border-strong)] bg-[var(--background)]/85 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--foreground)] backdrop-blur">
          {meta?.siteName ?? hostname}
        </span>
        {remoteImage ? (
          <span className="rounded-full bg-[var(--background)]/65 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--muted)] backdrop-blur">
            live preview
          </span>
        ) : null}
      </div>
    </div>
  );
}
