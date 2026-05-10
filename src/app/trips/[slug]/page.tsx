import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareButtons } from "@/components/sharing/ShareButtons";
import { TripPolls } from "@/components/trips/TripPolls";
import { DESTINATIONS, getDestinationBySlug } from "@/data/music-travel";
import { ogImageUrl } from "@/lib/og";
import {
  breadcrumbJsonLd,
  itemListJsonLd,
  jsonLdScript,
  siteUrl
} from "@/lib/structured-data";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { TripPoll, TripRow } from "@/lib/trips";

type RouteContext = { params: Promise<{ slug: string }> };

async function loadTrip(slug: string) {
  // Use service-role to read the trip metadata even for public views, so
  // anonymous visitors can render unlisted/public trips without auth.
  const service = createSupabaseServiceClient();
  if (!service) return null;
  const { data, error } = await service
    .from("trips")
    .select("id, slug, owner_id, title, destination_slugs, visibility, notes, created_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as TripRow;
}

async function loadPolls(tripId: string): Promise<TripPoll[]> {
  const service = createSupabaseServiceClient();
  if (!service) return [];
  const { data } = await service
    .from("trip_polls")
    .select("id, trip_id, question, options, created_at")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: true });
  return ((data ?? []) as TripPoll[]);
}

async function loadVoteCounts(pollIds: string[]) {
  if (pollIds.length === 0) return new Map<string, Map<string, number>>();
  const service = createSupabaseServiceClient();
  if (!service) return new Map();
  const { data } = await service
    .from("trip_poll_votes")
    .select("poll_id, option_id")
    .in("poll_id", pollIds);
  const map = new Map<string, Map<string, number>>();
  for (const row of (data ?? []) as Array<{ poll_id: string; option_id: string }>) {
    const inner = map.get(row.poll_id) ?? new Map<string, number>();
    inner.set(row.option_id, (inner.get(row.option_id) ?? 0) + 1);
    map.set(row.poll_id, inner);
  }
  return map;
}

export async function generateMetadata({ params }: RouteContext): Promise<Metadata> {
  const { slug } = await params;
  const trip = await loadTrip(slug);
  if (!trip || trip.visibility === "private") return { robots: { index: false } };

  const cityCount = trip.destination_slugs.length;
  const subtitle = trip.notes
    ? trip.notes.slice(0, 140)
    : `${cityCount} ${cityCount === 1 ? "city" : "cities"} in this music-travel plan.`;

  return {
    title: `${trip.title} · trip`,
    description: subtitle,
    alternates: { canonical: `/trips/${trip.slug}` },
    robots: trip.visibility === "unlisted" ? { index: false } : undefined,
    openGraph: {
      title: trip.title,
      description: subtitle,
      type: "article",
      url: `${siteUrl()}/trips/${trip.slug}`,
      images: [
        {
          url: ogImageUrl({
            eyebrow: "where next · trip",
            title: trip.title,
            subtitle,
            stat: `${cityCount} ${cityCount === 1 ? "city" : "cities"}`
          }),
          width: 1200,
          height: 630
        }
      ]
    }
  };
}

export default async function TripPage({ params }: RouteContext) {
  const { slug } = await params;
  const trip = await loadTrip(slug);
  if (!trip) notFound();

  // Private trips: only owner / collaborators can view
  if (trip.visibility === "private") {
    const auth = await createSupabaseServerAuthClient();
    const { data } = (await auth?.auth.getUser()) ?? { data: { user: null } };
    if (!data.user || data.user.id !== trip.owner_id) {
      const service = createSupabaseServiceClient();
      const isCollab = data.user
        ? Boolean(
            (
              await service
                ?.from("trip_collaborators")
                .select("user_id")
                .eq("trip_id", trip.id)
                .eq("user_id", data.user.id)
                .maybeSingle()
            )?.data
          )
        : false;
      if (!isCollab) notFound();
    }
  }

  const auth = await createSupabaseServerAuthClient();
  const { data: viewer } = (await auth?.auth.getUser()) ?? { data: { user: null } };
  const isOwner = Boolean(viewer.user && viewer.user.id === trip.owner_id);

  const cities = trip.destination_slugs
    .map((s) => getDestinationBySlug(s))
    .filter((d): d is NonNullable<typeof d> => Boolean(d));
  const polls = await loadPolls(trip.id);
  const voteCounts = await loadVoteCounts(polls.map((p) => p.id));

  const itemList = itemListJsonLd({
    name: trip.title,
    items: cities.map((destination) => ({
      name: destination.city,
      url: `${siteUrl()}/destinations/${destination.slug}`
    }))
  });
  const breadcrumb = breadcrumbJsonLd([
    { name: "Where Next", href: "/" },
    { name: "Trips", href: "/trips" },
    { name: trip.title, href: `/trips/${trip.slug}` }
  ]);

  const shareUrl = `${siteUrl()}/trips/${trip.slug}`;

  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(itemList) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumb) }}
      />

      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--foreground)] font-mono text-[11px] font-bold text-[var(--background)]">
            W
          </span>
          <span>where next</span>
        </Link>
        <nav className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          {isOwner ? (
            <Link href={`/trips/${trip.slug}/edit`} className="transition hover:text-[var(--foreground)]">
              edit
            </Link>
          ) : null}
          <Link href="/" className="transition hover:text-[var(--foreground)]">
            ← back to map
          </Link>
        </nav>
      </header>

      <section className="mx-auto w-full max-w-[1100px] px-6 pb-24 pt-12 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          trip · {trip.visibility} · {cities.length} {cities.length === 1 ? "city" : "cities"}
        </p>
        <h1 className="mt-5 text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.0] tracking-[-0.03em] text-[var(--foreground)]">
          {trip.title}
        </h1>
        {trip.notes ? (
          <p className="mt-5 max-w-2xl whitespace-pre-line text-[15px] leading-7 text-[var(--muted)]">
            {trip.notes}
          </p>
        ) : null}

        <div className="mt-7">
          <ShareButtons url={shareUrl} title={trip.title} />
        </div>

        <ol className="mt-12 divide-y divide-[var(--border)]">
          {cities.map((destination, index) => (
            <li key={destination.slug} className="py-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                {String(index + 1).padStart(2, "0")} · {destination.region} · {destination.country}
              </p>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.01em]">
                <Link href={`/destinations/${destination.slug}`} className="transition hover:text-[var(--signal)]">
                  {destination.city}
                </Link>
              </h2>
              <p className="mt-2 max-w-2xl text-[14px] leading-7 text-[var(--muted)]">{destination.tagline}</p>
            </li>
          ))}
          {cities.length === 0 ? (
            <li className="py-7 text-[14px] leading-7 text-[var(--muted)]">
              No cities yet.{" "}
              {isOwner ? (
                <Link href={`/trips/${trip.slug}/edit`} className="text-[var(--foreground)] underline">
                  Add the first one
                </Link>
              ) : null}
            </li>
          ) : null}
        </ol>

        <TripPolls
          tripId={trip.id}
          polls={polls.map((poll) => ({
            id: poll.id,
            question: poll.question,
            options: poll.options,
            counts: Object.fromEntries(voteCounts.get(poll.id) ?? [])
          }))}
          isOwner={isOwner}
          isAuthenticated={Boolean(viewer.user)}
        />

        <div className="mt-16 border-t border-[var(--border)] pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
            curated · {DESTINATIONS.length} cities mapped on Where Next ·{" "}
            <Link href="/auth/login" className="underline transition hover:text-[var(--foreground)]">
              build your own trip →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
