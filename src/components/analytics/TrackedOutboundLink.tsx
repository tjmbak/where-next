"use client";

import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import { usePreview, type PreviewPayload } from "@/components/preview/PreviewContext";
import type { AffiliateProvider } from "@/lib/affiliate/providers";

type PreviewSpec =
  | { kind: "event"; eventId: string }
  | { kind: "venue"; venueId: string }
  | { kind: "external"; title: string };

type TrackedOutboundLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  eventLabel: string;
  destinationSlug: string;
  // When set, the href is wrapped through `/api/out` for affiliate-tag
  // injection and click-event recording. Default `"raw"` preserves the
  // historical pass-through behavior with click tracking only.
  provider?: AffiliateProvider;
  // When set, clicks open an in-app preview sheet first instead of going
  // straight out. The sheet's "Continue" button still uses the same
  // outbound + tracking pipeline.
  preview?: PreviewSpec;
};

function buildOutboundHref(
  provider: AffiliateProvider | undefined,
  href: string | undefined,
  destinationSlug: string,
  label: string
) {
  if (!href) return undefined;
  if (!provider || provider === "raw") return href;
  const params = new URLSearchParams({
    p: provider,
    d: destinationSlug,
    ctx: label,
    u: href
  });
  return `/api/out?${params.toString()}`;
}

export function TrackedOutboundLink({
  eventLabel,
  destinationSlug,
  provider,
  preview,
  href,
  onClick,
  children,
  ...props
}: TrackedOutboundLinkProps) {
  const previewCtx = usePreview();
  const wrappedHref = buildOutboundHref(provider, href, destinationSlug, eventLabel);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;

    // If preview is configured, intercept and open the in-app sheet instead.
    // Modifier keys (cmd/ctrl/middle-click) bypass — user explicitly wants
    // a new tab.
    const wantsNewTab = event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0;
    if (preview && previewCtx && href && !wantsNewTab) {
      event.preventDefault();
      const base = {
        destinationSlug,
        href,
        eventLabel,
        provider
      };
      let payload: PreviewPayload;
      if (preview.kind === "event") {
        payload = { ...base, kind: "event", eventId: preview.eventId };
      } else if (preview.kind === "venue") {
        payload = { ...base, kind: "venue", venueId: preview.venueId };
      } else {
        payload = { ...base, kind: "external", title: preview.title };
      }
      previewCtx.open(payload);
      trackEvent("outbound_link_click", {
        destinationSlug,
        label: eventLabel,
        href,
        provider: provider ?? "raw",
        source: "preview-open"
      });
      return;
    }

    trackEvent("outbound_link_click", {
      destinationSlug,
      label: eventLabel,
      href,
      provider: provider ?? "raw"
    });
  }

  return (
    <a
      {...props}
      href={wrappedHref}
      target={props.target ?? "_blank"}
      rel={props.rel ?? "noreferrer"}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
