"use client";

import Image from "next/image";
import Link from "next/link";
import { getDestinationBySlug, getEditorsPickForMonth } from "@/data/music-travel";
import { getMonthLabel, yearQueryFor } from "@/data/taxonomy";
import { pickHeroForMonth } from "@/lib/hero-images";
import type { MonthNumber } from "@/types/content";

type EditorsPickStripProps = {
  month: MonthNumber;
  year?: number;
  onSelect: (slug: string) => void;
};

export function EditorsPickStrip({ month, year, onSelect }: EditorsPickStripProps) {
  const pick = getEditorsPickForMonth(month);
  if (!pick) return null;
  const destination = getDestinationBySlug(pick.destinationSlug);
  if (!destination) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_60px_-28px_rgba(28,22,18,0.55)]">
      <div className="relative flex min-h-[340px] sm:aspect-[16/5] sm:min-h-0 lg:aspect-[16/4.5]">
        <Image
          src={pickHeroForMonth(destination, month)}
          alt={destination.city}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 1100px"
          className="wn-slow-zoom object-cover"
        />
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/10"
        />
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent"
        />

        <div className="relative z-10 flex w-full flex-col justify-between gap-6 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/55 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/85 backdrop-blur">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-[var(--signal)] shadow-[0_0_6px_var(--signal)]"
              />
              editor&apos;s pick · {getMonthLabel(month).toLowerCase()}
            </span>
          </div>

          <div className="max-w-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/65">
              {destination.country.toLowerCase()} · {destination.city.toLowerCase()}
            </p>
            <h2 className="mt-1 text-[clamp(1.25rem,2.4vw,1.875rem)] font-medium leading-[1.15] text-white">
              {pick.headline}
            </h2>
            <p className="mt-2 max-w-xl text-[13px] leading-6 text-white/80">{pick.body}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                href={`/destinations/${pick.destinationSlug}?month=${month}${yearQueryFor(month, year)}`}
                onClick={() => onSelect(pick.destinationSlug)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white backdrop-blur transition hover:border-white hover:bg-white hover:text-black"
              >
                open {destination.city.toLowerCase()} guide
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
