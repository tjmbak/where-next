import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MiniMap } from "@/components/visual/MiniMap";
import { getDestinationBySlug } from "@/data/music-travel";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

export const metadata: Metadata = {
  title: "Your itineraries",
  robots: { index: false }
};

export const dynamic = "force-dynamic";

type ItineraryRow = {
  id: string;
  slug: string;
  destination_slug: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  vibe_tags: string[];
  visibility: "public" | "unlisted" | "private";
  created_at: string;
};

export default async function MyItinerariesPage() {
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) redirect("/auth/login?next=/me/itineraries");

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login?next=/me/itineraries");

  const { data, error } = await supabase
    .from("itineraries")
    .select(
      "id, slug, destination_slug, title, start_date, end_date, duration_days, vibe_tags, visibility, created_at"
    )
    .eq("owner_id", userData.user.id)
    .order("created_at", { ascending: false });

  const rows = ((data ?? []) as ItineraryRow[]);

  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--foreground)] font-mono text-[11px] font-bold text-[var(--background)]">
            W
          </span>
          <span>where next</span>
        </Link>
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          ← back to map
        </Link>
      </header>

      <section className="mx-auto w-full max-w-[1100px] px-6 pb-24 pt-12 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          your itineraries · {rows.length}
        </p>
        <h1 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.02em] text-[var(--foreground)]">
          Trips you&apos;ve planned.
        </h1>
        {error ? (
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--signal)]">{error.message}</p>
        ) : null}

        {rows.length === 0 ? (
          <div className="mt-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <p className="text-[15px] leading-7 text-[var(--foreground)]">
              No itineraries yet. Pick a city and plan your first trip.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-5 py-2 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            >
              browse the map
              <span aria-hidden>→</span>
            </Link>
          </div>
        ) : (
          <ol className="mt-12 divide-y divide-[var(--border)]">
            {rows.map((row) => {
              const destination = getDestinationBySlug(row.destination_slug);
              return (
                <li key={row.id} className="py-7">
                  <div className="flex items-start gap-5">
                    {destination ? (
                      <MiniMap
                        dots={[
                          {
                            lat: destination.coordinates.lat,
                            lng: destination.coordinates.lng,
                            size: "peak"
                          }
                        ]}
                        size={64}
                        className="shrink-0"
                      />
                    ) : null}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                        {destination?.country ?? row.destination_slug} · {row.duration_days} days · {row.visibility}
                        {row.start_date && row.end_date ? ` · ${row.start_date} → ${row.end_date}` : ""}
                      </p>
                      <h2 className="mt-2 text-2xl font-medium tracking-[-0.01em]">
                        <Link href={`/itineraries/${row.slug}`} className="transition hover:text-[var(--signal)]">
                          {row.title}
                        </Link>
                      </h2>
                      {row.vibe_tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {row.vibe_tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-[var(--border)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]"
                            >
                              {tag.replace("-", " ")}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                        <Link href={`/itineraries/${row.slug}`} className="transition hover:text-[var(--foreground)]">
                          view ↗
                        </Link>
                        {destination ? (
                          <Link
                            href={`/destinations/${destination.slug}/plan`}
                            className="transition hover:text-[var(--foreground)]"
                          >
                            plan another for {destination.city.toLowerCase()} →
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}
