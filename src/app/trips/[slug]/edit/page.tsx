import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/nav/SiteHeader";
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
      <SiteHeader />

      <section className="mx-auto w-full max-w-[760px] px-6 pb-24 pt-8 sm:px-10">
        <Link
          href={`/trips/${slug}`}
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          ← back to trip
        </Link>
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
