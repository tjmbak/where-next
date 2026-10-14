"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { getDestinationBySlug, getEventsForDestinationInMonth } from "@/data/music-travel";
import { getMonthLabel, yearQueryFor } from "@/data/taxonomy";
import { formatEventDay, pickHighlights } from "@/lib/event-highlights";
import type { Genre, MonthNumber } from "@/types/content";

type ComingUpRowProps = {
  month: MonthNumber;
  year: number;
  /** Cities currently shown by the filters; events come from these only. */
  slugs: string[];
  genre?: Genre;
};

export function ComingUpRow({ month, year, slugs, genre }: ComingUpRowProps) {
  const highlights = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const events = slugs.flatMap((slug) =>
      getEventsForDestinationInMonth(slug, month, year).filter(
        (event) => event.startDate >= today && (!genre || event.genres.includes(genre))
      )
    );
    return pickHighlights(events, { limit: 10, perCity: 1 });
  }, [slugs, month, year, genre]);

  if (highlights.length < 3) return null;
  const monthLabel = getMonthLabel(month);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[20px] font-medium tracking-[-0.01em] text-[var(--foreground)] sm:text-[22px]">
          Coming up in {monthLabel}
        </h2>
        <Link
          href={`/events/${year}/${monthLabel.toLowerCase()}`}
          className="whitespace-nowrap text-[13px] font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          All events →
        </Link>
      </div>
      <ul className="wn-swipe -mx-6 mt-4 flex snap-x gap-3 overflow-x-auto scroll-px-6 px-6 pb-2 sm:-mx-10 sm:scroll-px-10 sm:px-10 lg:mx-0 lg:px-0">
        {highlights.map((event) => {
          const destination = getDestinationBySlug(event.destinationSlug);
          if (!destination) return null;
          return (
            <li key={event.id} className="w-[220px] shrink-0 snap-start sm:w-[250px]">
              <Link
                href={`/destinations/${destination.slug}?month=${month}${yearQueryFor(month, year)}#event-${event.id}`}
                className="group block"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                  <Image
                    src={destination.heroImage}
                    alt=""
                    fill
                    sizes="250px"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold capitalize text-[#1c1612] shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
                    {event.type.replaceAll("-", " ")}
                  </span>
                </div>
                <p className="mt-2.5 text-[13px] font-medium text-[var(--signal)]">
                  {capitalizeDay(formatEventDay(event.startDate))}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[14px] font-medium leading-snug text-[var(--foreground)]">
                  {event.title}
                </p>
                <p className="mt-0.5 text-[13px] text-[var(--muted)]">{destination.city}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function capitalizeDay(label: string) {
  return label.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}
