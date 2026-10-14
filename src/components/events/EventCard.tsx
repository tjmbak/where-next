import Image from "next/image";
import Link from "next/link";
import { yearQueryFor } from "@/data/taxonomy";
import type { Destination, Event, MonthNumber } from "@/types/content";

export function EventCard({ event, destination }: { event: Event; destination: Destination }) {
  const month = Number(event.startDate.slice(5, 7)) as MonthNumber;
  const year = Number(event.startDate.slice(0, 4));
  return (
    <Link
      href={`/destinations/${destination.slug}?month=${month}${yearQueryFor(month, year)}#event-${event.id}`}
      className="group flex h-full gap-4 sm:flex-col sm:gap-0"
    >
      <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-2)] transition-shadow duration-300 group-hover:shadow-[0_18px_40px_-20px_rgba(28,22,18,0.45)] sm:aspect-[3/2] sm:w-full sm:rounded-2xl">
        <Image
          src={destination.heroImage}
          alt=""
          fill
          sizes="(max-width: 640px) 96px, (max-width: 1024px) 50vw, 340px"
          className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center sm:px-0.5 sm:pt-3">
        <p className="text-[13px] font-medium text-[var(--signal)]">
          {formatDay(event.startDate)}
          <span className="text-[var(--muted)]"> · {capitalize(event.type.replaceAll("-", " "))}</span>
        </p>
        <p className="mt-1 line-clamp-2 text-[15px] font-medium leading-snug text-[var(--foreground)]">{event.title}</p>
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          {destination.city}, {destination.country}
        </p>
      </div>
    </Link>
  );
}

function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
