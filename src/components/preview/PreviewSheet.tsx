"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePreview, type PreviewPayload } from "@/components/preview/PreviewContext";
import { trackEvent } from "@/lib/analytics";
import { getDestinationBySlug, getEventsForDestination, getVenuesForDestination } from "@/data/music-travel";
import { GENRE_LABELS, SUPPORTED_YEARS } from "@/data/taxonomy";
import { CityQuickLook, QUICK_LOOK_DESC_ID, QUICK_LOOK_TITLE_ID } from "@/components/preview/CityQuickLook";
import { pickHeroForMonth } from "@/lib/hero-images";
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
  return <SheetFrame current={ctx.current} close={ctx.close} />;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

function SheetFrame({ current, close }: { current: PreviewPayload | null; close: () => void }) {
  const sheetRef = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    dy: number;
    lastY: number;
    lastT: number;
    velocity: number;
    axis: "y" | "x" | null;
  } | null>(null);
  const isOpen = Boolean(current);

  useEffect(() => {
    if (!isOpen) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const sheet = sheetRef.current;
    const frame = requestAnimationFrame(() => {
      const target = sheet?.querySelector<HTMLElement>("[data-autofocus]") ?? sheet;
      target?.focus({ preventScroll: true });
    });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !sheet) return;
      const items = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((node) => node.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!sheet.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      returnFocusRef.current?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  const onTouchStart = (event: React.TouchEvent) => {
    if (window.innerWidth >= 640) return;
    if (!(event.target as HTMLElement).closest("[data-sheet-grab]")) return;
    const touch = event.touches[0];
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      dy: 0,
      lastY: touch.clientY,
      lastT: event.timeStamp,
      velocity: 0,
      axis: null
    };
  };
  const onTouchMove = (event: React.TouchEvent) => {
    const drag = dragRef.current;
    const sheet = sheetRef.current;
    if (!drag || !sheet) return;
    const touch = event.touches[0];
    if (!drag.axis) {
      const dx = Math.abs(touch.clientX - drag.startX);
      const dy = Math.abs(touch.clientY - drag.startY);
      if (dx < 8 && dy < 8) return;
      drag.axis = dx > dy ? "x" : "y";
    }
    if (drag.axis === "x") return;
    const elapsed = Math.max(1, event.timeStamp - drag.lastT);
    drag.velocity = (touch.clientY - drag.lastY) / elapsed;
    drag.lastY = touch.clientY;
    drag.lastT = event.timeStamp;
    drag.dy = Math.max(0, touch.clientY - drag.startY);
    sheet.style.transition = "none";
    sheet.style.transform = `translateY(${drag.dy}px)`;
  };
  const onTouchEnd = () => {
    const drag = dragRef.current;
    const sheet = sheetRef.current;
    dragRef.current = null;
    if (!drag || !sheet) return;
    sheet.style.transition = "";
    sheet.style.transform = "";
    const flung = drag.velocity > 0.6 && drag.dy > 40;
    const pulled = drag.dy > 110 && drag.velocity >= -0.05;
    if (drag.axis === "y" && (flung || pulled)) close();
  };

  return (
    <>
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 motion-reduce:transition-none ${
          current ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-hidden={!current}
        aria-labelledby={current?.kind === "destination" ? QUICK_LOOK_TITLE_ID : undefined}
        aria-describedby={current?.kind === "destination" ? QUICK_LOOK_DESC_ID : undefined}
        aria-label={current && current.kind !== "destination" ? "Preview" : undefined}
        tabIndex={-1}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`fixed inset-x-0 bottom-0 z-50 flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-[var(--background)] outline-none transition-[translate,visibility,box-shadow] duration-300 ease-out motion-reduce:transition-none sm:inset-x-auto sm:right-0 sm:top-0 sm:h-[100dvh] sm:max-w-[480px] sm:rounded-none sm:border-l sm:border-[var(--border-strong)] ${
          current
            ? "visible translate-x-0 translate-y-0 shadow-[0_0_60px_rgba(0,0,0,0.35)]"
            : "invisible translate-y-full shadow-none sm:translate-x-full sm:translate-y-0"
        }`}
      >
        {current ? (
          current.kind === "destination" ? (
            <CityQuickLook
              key={current.destinationSlug}
              payload={current}
              onClose={close}
            />
          ) : (
            <SheetContent payload={current} onClose={close} />
          )
        ) : null}
      </aside>
    </>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatSheetDate(start: string, end?: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return "TBA";
  const startLabel = s.toLocaleDateString("en-US", opts);
  if (!end) return startLabel;
  const e = new Date(end);
  if (Number.isNaN(e.getTime())) return startLabel;
  const endLabel = e.toLocaleDateString("en-US", opts);
  return startLabel === endLabel ? startLabel : `${startLabel} → ${endLabel}`;
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
        <p className="text-[13px] font-medium text-[var(--muted)]">
          Preview
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="grid h-8 w-8 place-items-center rounded-full text-[14px] text-[var(--foreground)] transition hover:bg-[var(--surface-2)]"
        >
          <span aria-hidden>✕</span>
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
            <p className="text-[13px] font-medium text-[var(--muted)]">
              What {meta.siteName ?? meta.hostname} says
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
            <p className="text-[13px] font-medium text-[var(--muted)]">
              About {destination.city}
            </p>
            <p className="mt-2 text-[14px] leading-7 text-[var(--foreground)]/90">
              {destination.tagline}
            </p>
            <p className="mt-3 text-[13px] font-medium text-[var(--muted-2)]">
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
          <span>Continue to {partnerLabel}</span>
          <span aria-hidden className="text-[13px] font-medium transition group-hover:translate-x-0.5">
            ↗
          </span>
        </a>
        <p className="mt-3 text-center text-[13px] font-medium text-[var(--muted-2)]">
          Opens in a new tab · {hostnameOf(payload.href)}
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
      <p className="text-[13px] font-medium capitalize text-[var(--signal)]">
        {event.type.replace("-", " ")}
      </p>
      <h2 className="mt-2 text-[clamp(1.6rem,3.5vw,2.2rem)] font-medium leading-[1.1] tracking-[-0.02em] text-[var(--foreground)]">
        {event.title}
      </h2>
      <p className="mt-3 text-[13px] font-medium text-[var(--muted)]">
        {formatSheetDate(event.startDate, event.endDate)}
        {venue ? ` · ${venue.name}` : ""}
      </p>

      <p className="mt-5 text-[15px] leading-7 text-[var(--foreground)]/90">{event.summary}</p>

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3">
        <Cell label="Importance" value={`${event.importanceScore}/100`} />
        <Cell label="Sounds" value={event.genres.map((g) => GENRE_LABELS[g] ?? g).join(", ")} />
      </dl>

      {sameVenueOthers.length > 0 && venue ? (
        <section className="mt-8">
          <p className="text-[13px] font-medium text-[var(--muted)]">
            Also at {venue.name}
          </p>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {sameVenueOthers.map((other) => (
              <li key={other.id} className="py-3">
                <p className="text-[13px] font-medium text-[var(--muted-2)]">
                  {formatSheetDate(other.startDate, other.endDate)} · {capitalize(other.type.replace("-", " "))}
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
      <p className="text-[13px] font-medium capitalize text-[var(--signal)]">
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
              className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[13px] font-medium capitalize text-[var(--muted)]"
            >
              {tag.replace("-", " ")}
            </span>
          ))}
        </div>
      ) : null}

      {venueEvents.length > 0 ? (
        <section className="mt-7">
          <p className="text-[13px] font-medium text-[var(--muted)]">
            Coming up here
          </p>
          <ul className="mt-3 divide-y divide-[var(--border)]">
            {venueEvents.map((event) => (
              <li key={event.id} className="py-3">
                <p className="text-[13px] font-medium text-[var(--muted-2)]">
                  {formatSheetDate(event.startDate, event.endDate)} · {capitalize(event.type.replace("-", " "))}
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
      <p className="text-[13px] font-medium text-[var(--signal)]">External link</p>
      <h2 className="mt-2 text-[clamp(1.4rem,3vw,2rem)] font-medium leading-[1.1] tracking-[-0.02em] text-[var(--foreground)]">
        {payload.title}
      </h2>
      <p className="mt-4 text-[13px] font-medium text-[var(--muted)]">
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
      <p className="text-[13px] font-medium text-[var(--signal)]">Preview</p>
      <h2 className="mt-2 text-2xl font-medium leading-tight text-[var(--foreground)]">{title}</h2>
      <p className="mt-4 text-[13px] font-medium text-[var(--muted)]">
        {hostnameOf(payload.href)}
      </p>
    </article>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] font-medium text-[var(--muted)]">{label}</dt>
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
              <span className="text-[13px] font-medium">No preview available</span>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
        <span className="rounded-full border border-[var(--border-strong)] bg-[var(--background)]/85 px-2.5 py-1 text-[13px] font-medium text-[var(--foreground)] backdrop-blur">
          {meta?.siteName ?? hostname}
        </span>
        {remoteImage ? (
          <span className="rounded-full bg-[var(--background)]/65 px-2 py-1 text-[13px] font-medium text-[var(--muted)] backdrop-blur">
            Live preview
          </span>
        ) : null}
      </div>
    </div>
  );
}
