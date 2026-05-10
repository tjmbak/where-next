import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TripEditor } from "@/components/trips/TripEditor";
import { DESTINATIONS } from "@/data/music-travel";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import type { TripRow } from "@/lib/trips";

type RouteContext = { params: Promise<{ slug: string }> };

export const metadata: Metadata = {
  title: "Edit trip",
  robots: { index: false }
};

export default async function TripEditPage({ params }: RouteContext) {
  const { slug } = await params;
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) redirect(`/auth/login?next=/trips/${slug}/edit`);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/auth/login?next=/trips/${slug}/edit`);

  const { data: trip } = await supabase
    .from("trips")
    .select("id, slug, owner_id, title, destination_slugs, visibility, notes, created_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!trip) notFound();

  // RLS will return the row; if owner_id mismatches and viewer has no
  // collaborator entry, restrict edit screen to owners only.
  if (trip.owner_id !== userData.user.id) {
    notFound();
  }

  const destinationOptions = DESTINATIONS.map((d) => ({
    slug: d.slug,
    label: `${d.city}, ${d.country}`,
    region: d.region
  }));

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
          href={`/trips/${slug}`}
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          ← back to trip
        </Link>
      </header>

      <section className="mx-auto w-full max-w-[760px] px-6 pb-24 pt-10 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">edit trip</p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,2.5rem)] font-medium leading-[1.05] tracking-[-0.02em] text-[var(--foreground)]">
          {trip.title}
        </h1>

        <div className="mt-10">
          <TripEditor trip={trip as TripRow} destinationOptions={destinationOptions} />
        </div>
      </section>
    </main>
  );
}
