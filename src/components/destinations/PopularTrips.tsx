import Link from "next/link";
import type { PopularItineraryRow } from "@/lib/itineraries/popular";

type PopularTripsProps = {
  itineraries: PopularItineraryRow[];
  destinationSlug: string;
  destinationCity: string;
};

const BUDGET_DOTS: Record<PopularItineraryRow["budget_band"], number> = {
  low: 1,
  medium: 2,
  high: 3,
  luxury: 4
};

export function PopularTrips({ itineraries, destinationSlug, destinationCity }: PopularTripsProps) {
  if (itineraries.length === 0) return null;
  const totalForks = itineraries.reduce((sum, it) => sum + it.fork_count, 0);

  return (
    <section className="scroll-mt-20">
      <h2 className="mb-3 text-[24px] font-medium tracking-[-0.01em] text-[var(--foreground)] sm:text-[28px]">
        Planned by travelers
      </h2>

      <div className="mb-6 flex items-baseline justify-between">
        <p className="text-[15px] leading-7 text-[var(--foreground)]/85">
          Real trips other travelers are taking right now. Copy any of them in one tap to make it yours.
        </p>
        {totalForks > 0 ? (
          <p className="hidden text-[13px] text-[var(--muted-2)] sm:block">
            {totalForks} {totalForks === 1 ? "copy" : "copies"}
          </p>
        ) : null}
      </div>

      <ol className="grid gap-4 sm:grid-cols-3">
        {itineraries.map((itinerary) => (
          <li key={itinerary.id}>
            <Link
              href={`/itineraries/${itinerary.slug}`}
              className="group flex h-full flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--foreground)]/55 hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.55)]"
            >
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium text-[var(--signal)]">
                  {itinerary.duration_days} {itinerary.duration_days === 1 ? "day" : "days"}
                </span>
                <BudgetDots band={itinerary.budget_band} />
              </div>

              <h3 className="text-[18px] font-medium leading-[1.25] tracking-[-0.01em] text-[var(--foreground)] transition group-hover:text-[var(--signal)]">
                {itinerary.title}
              </h3>

              {itinerary.vibe_tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {itinerary.vibe_tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[12px] capitalize text-[var(--muted)]"
                    >
                      {tag.replace(/-/g, " ")}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-auto border-t border-[var(--border)] pt-3">
                <p className="text-[13px] text-[var(--muted)]">
                  ${itinerary.days_cost_low.toLocaleString()}–${itinerary.days_cost_high.toLocaleString()} all-in
                </p>
                <div className="mt-1.5 flex items-center justify-between text-[13px] text-[var(--muted-2)]">
                  <span>
                    {itinerary.fork_count > 0
                      ? `${itinerary.fork_count} ${itinerary.fork_count === 1 ? "copy" : "copies"}`
                      : "Be the first to copy"}
                  </span>
                  <span className="font-medium text-[var(--foreground)] transition group-hover:text-[var(--signal)]">View →</span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-5">
        <p className="text-[14px] text-[var(--muted)]">Want a clean draft?</p>
        <Link
          href={`/destinations/${destinationSlug}/plan`}
          className="text-[14px] font-semibold text-[var(--foreground)] underline underline-offset-4 transition hover:text-[var(--signal)]"
        >
          Plan a fresh {destinationCity} trip →
        </Link>
      </div>
    </section>
  );
}

function BudgetDots({ band }: { band: PopularItineraryRow["budget_band"] }) {
  const lit = BUDGET_DOTS[band];
  return (
    <span className="flex items-center gap-0.5" aria-label={`${band} budget`}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-1 w-1 rounded-full transition ${
            i < lit ? "bg-[var(--foreground)]" : "bg-[var(--border-strong)]"
          }`}
        />
      ))}
    </span>
  );
}
