"use client";

import { useMemo } from "react";
import { usePreview, type PreviewPayload } from "@/components/preview/PreviewContext";
import { trackEvent } from "@/lib/analytics";
import {
  getDestinationBySlug,
  getEventsForDestination,
  getVenuesForDestination
} from "@/data/music-travel";
import { GENRE_LABELS } from "@/data/taxonomy";
import type { AffiliateProvider } from "@/lib/affiliate/providers";
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
        className={`fixed right-0 top-0 z-50 flex h-screen w-full max-w-[520px] flex-col border-l border-[var(--border-strong)] bg-[var(--background)] shadow-[0_0_60px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out ${
          current ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {current ? <SheetContent payload={current} onClose={close} /> : null}
      </aside>
    </>
  );
}

function SheetContent({ payload, onClose }: { payload: PreviewPayload; onClose: () => void }) {
  const destination = getDestinationBySlug(payload.destinationSlug);
  const outboundHref = buildOutboundHref(payload.provider, payload.href, payload.destinationSlug, payload.eventLabel);
  const partnerLabel = useMemo(() => {
    const provider = payload.provider;
    const map: Record<string, string> = {
      booking: "Booking.com",
      skyscanner: "Skyscanner",
      gyg: "GetYourGuide",
      viagogo: "Viagogo"
    };
    if (provider && map[provider]) return map[provider];
    return hostnameOf(payload.href);
  }, [payload.provider, payload.href]);

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

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {payload.kind === "event" ? <EventBody payload={payload} /> : null}
        {payload.kind === "venue" ? <VenueBody payload={payload} /> : null}
        {payload.kind === "external" ? <ExternalBody payload={payload} /> : null}

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

function EventBody({ payload }: { payload: Extract<PreviewPayload, { kind: "event" }> }) {
  const event = useMemo<Event | null>(() => {
    const all = getEventsForDestination(payload.destinationSlug);
    return all.find((e) => e.id === payload.eventId) ?? null;
  }, [payload.destinationSlug, payload.eventId]);

  const venue = useMemo<Venue | null>(() => {
    if (!event?.venueId) return null;
    return getVenuesForDestination(payload.destinationSlug).find((v) => v.id === event.venueId) ?? null;
  }, [event, payload.destinationSlug]);

  const sameVenueOthers = useMemo(() => {
    if (!event?.venueId) return [];
    return getEventsForDestination(payload.destinationSlug)
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
    return getEventsForDestination(payload.destinationSlug)
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

function FallbackBody({ payload, title }: { payload: PreviewPayload; title: string }) {
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
