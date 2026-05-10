// JSON-LD emitters that mirror the Schema.org vocabulary Google uses for rich
// results in the Events surface. Keep these as plain objects — Next renders
// them via <script type="application/ld+json"> at the page level.

import type { Destination, Event, Venue } from "@/types/content";

const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wherenext.fm";

export function siteUrl() {
  return DEFAULT_SITE_URL;
}

export function placeFromDestination(destination: Destination) {
  return {
    "@type": "City",
    name: destination.city,
    address: {
      "@type": "PostalAddress",
      addressCountry: destination.country,
      addressRegion: destination.region
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: destination.coordinates.lat,
      longitude: destination.coordinates.lng
    },
    sameAs: `${DEFAULT_SITE_URL}/destinations/${destination.slug}`
  };
}

export function eventToJsonLd(event: Event, destination: Destination, venue?: Venue) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.summary,
    startDate: event.startDate,
    endDate: event.endDate ?? event.startDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: venue
      ? {
          "@type": "Place",
          name: venue.name,
          address: {
            "@type": "PostalAddress",
            addressLocality: destination.city,
            addressCountry: destination.country
          },
          ...(venue.coordinates
            ? {
                geo: {
                  "@type": "GeoCoordinates",
                  latitude: venue.coordinates.lat,
                  longitude: venue.coordinates.lng
                }
              }
            : {})
        }
      : placeFromDestination(destination),
    url: event.ticketUrl ?? event.sourceUrl,
    offers: event.ticketUrl
      ? {
          "@type": "Offer",
          url: event.ticketUrl,
          availability: "https://schema.org/InStock"
        }
      : undefined
  };
}

export function destinationToJsonLd(destination: Destination) {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAction",
    name: `Music travel to ${destination.city}`,
    description: destination.tagline,
    object: placeFromDestination(destination),
    url: `${DEFAULT_SITE_URL}/destinations/${destination.slug}`
  };
}

export function itemListJsonLd(args: {
  name: string;
  description?: string;
  items: Array<{ url: string; name: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: args.name,
    description: args.description,
    itemListElement: args.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: item.url,
      name: item.name
    }))
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; href: string }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.href.startsWith("http") ? item.href : `${DEFAULT_SITE_URL}${item.href}`
    }))
  };
}

export function jsonLdScript(data: object) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
