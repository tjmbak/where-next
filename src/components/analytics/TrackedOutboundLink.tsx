"use client";

import type { AnchorHTMLAttributes } from "react";
import { trackEvent } from "@/lib/analytics";
import type { AffiliateProvider } from "@/lib/affiliate/providers";

type TrackedOutboundLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  eventLabel: string;
  destinationSlug: string;
  // When set, the href is wrapped through `/api/out` for affiliate-tag
  // injection and click-event recording. Default `"raw"` preserves the
  // historical pass-through behavior with click tracking only.
  provider?: AffiliateProvider;
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
  href,
  onClick,
  children,
  ...props
}: TrackedOutboundLinkProps) {
  const wrappedHref = buildOutboundHref(provider, href, destinationSlug, eventLabel);

  return (
    <a
      {...props}
      href={wrappedHref}
      target={props.target ?? "_blank"}
      rel={props.rel ?? "noreferrer"}
      onClick={(event) => {
        trackEvent("outbound_link_click", {
          destinationSlug,
          label: eventLabel,
          href,
          provider: provider ?? "raw"
        });
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
