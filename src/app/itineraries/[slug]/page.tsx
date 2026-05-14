import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardingPassHeader } from "@/components/itineraries/BoardingPassHeader";
import { CollaboratorPanel } from "@/components/itineraries/CollaboratorPanel";
import { ForkTripButton } from "@/components/itineraries/ForkTripButton";
import { ItineraryView } from "@/components/itineraries/ItineraryView";
import { StatsPanel } from "@/components/itineraries/StatsPanel";
import { ShareButtons } from "@/components/sharing/ShareButtons";
import { getDestinationBySlug } from "@/data/music-travel";
import type { Itinerary } from "@/lib/itineraries/generate";
import { ogImageUrl } from "@/lib/og";
import { breadcrumbJsonLd, jsonLdScript, siteUrl } from "@/lib/structured-data";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ItineraryRow = {
  id: string;
  slug: string;
  owner_id: string | null;
  destination_slug: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  legs: Itinerary["legs"];
  vibe_tags: string[];
  budget_band: "low" | "medium" | "high" | "luxury";
  days: Itinerary["days"];
  visibility: "public" | "unlisted" | "private";
  created_at: string;
  generation_meta: { model?: string; generatedAt?: string } | null;
  fork_count: number;
};

async function loadCollaborators(itineraryId: string) {
  const service = createSupabaseServiceClient();
  if (!service) return [];
  const { data: rows } = await service
    .from("itinerary_collaborators")
    .select("user_id, role")
    .eq("itinerary_id", itineraryId);
  if (!rows || rows.length === 0) return [];
  const userIds = rows.map((r) => r.user_id as string);
  const { data: usersData } = await service.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map<string, string>();
  for (const u of (usersData?.users ?? []) as Array<{ id: string; email?: string | null }>) {
    if (u.email) emailById.set(u.id, u.email);
  }
  return rows.filter((r) => userIds.includes(r.user_id as string)).map((r) => ({
    user_id: r.user_id as string,
    role: r.role as string,
    email: emailById.get(r.user_id as string) ?? null
  }));
}

async function loadItinerary(slug: string): Promise<ItineraryRow | null> {
  const service = createSupabaseServiceClient();
  if (!service) return null;
  const { data } = await service
    .from("itineraries")
    .select(
      "id, slug, owner_id, destination_slug, title, start_date, end_date, duration_days, legs, vibe_tags, budget_band, days, visibility, created_at, generation_meta, fork_count"
    )
    .eq("slug", slug)
    .maybeSingle();
  return data ? (data as ItineraryRow) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const itinerary = await loadItinerary(slug);
  if (!itinerary || itinerary.visibility === "private") return { robots: { index: false } };
  const destination = getDestinationBySlug(itinerary.destination_slug);
  const subtitle = `${itinerary.duration_days} days in ${destination?.city ?? itinerary.destination_slug}, anchored on real events.`;

  return {
    title: itinerary.title,
    description: subtitle,
    alternates: { canonical: `/itineraries/${itinerary.slug}` },
    robots: itinerary.visibility === "unlisted" ? { index: false } : undefined,
    openGraph: {
      title: itinerary.title,
      description: subtitle,
      type: "article",
      url: `${siteUrl()}/itineraries/${itinerary.slug}`,
      images: [
        {
          url: ogImageUrl({
            eyebrow: "where next · itinerary",
            title: itinerary.title,
            subtitle,
            stat: `${itinerary.duration_days} days`
          }),
          width: 1200,
          height: 630
        }
      ]
    }
  };
}

export default async function ItineraryPage({ params, searchParams }: RouteContext) {
  const { slug } = await params;
  const sp = await searchParams;
  const justForked = sp?.forked === "1";
  const itinerary = await loadItinerary(slug);
  if (!itinerary) notFound();

  if (itinerary.visibility === "private") {
    const auth = await createSupabaseServerAuthClient();
    const { data } = (await auth?.auth.getUser()) ?? { data: { user: null } };
    if (!data.user || data.user.id !== itinerary.owner_id) {
      notFound();
    }
  }

  const destination = getDestinationBySlug(itinerary.destination_slug);
  if (!destination) notFound();

  const auth = await createSupabaseServerAuthClient();
  const { data: viewer } = (await auth?.auth.getUser()) ?? { data: { user: null } };
  const isOwner = Boolean(viewer.user && viewer.user.id === itinerary.owner_id);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Where Next", href: "/" },
    { name: destination.city, href: `/destinations/${destination.slug}` },
    { name: itinerary.title, href: `/itineraries/${itinerary.slug}` }
  ]);

  const itineraryShape: Itinerary = {
    destinationSlug: itinerary.destination_slug,
    title: itinerary.title,
    startDate: itinerary.start_date,
    endDate: itinerary.end_date,
    durationDays: itinerary.duration_days as Itinerary["durationDays"],
    legs: itinerary.legs ?? [{ destinationSlug: itinerary.destination_slug, days: itinerary.duration_days }],
    vibeTags: itinerary.vibe_tags,
    budgetBand: itinerary.budget_band,
    days: itinerary.days,
    generatedAt: itinerary.generation_meta?.generatedAt ?? itinerary.created_at,
    model: itinerary.generation_meta?.model ?? "saved"
  };

  const collaborators = await loadCollaborators(itinerary.id);
  const shareUrl = `${siteUrl()}/itineraries/${itinerary.slug}`;

  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumb) }}
      />
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-3 px-5 py-5 sm:px-10 sm:py-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--foreground)] font-mono text-[11px] font-bold text-[var(--background)]">
            W
          </span>
          <span>where next</span>
        </Link>
        <nav className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] sm:gap-4 sm:text-[11px] sm:tracking-[0.22em]">
          <Link
            href={`/destinations/${destination.slug}`}
            className="hidden transition hover:text-[var(--foreground)] sm:inline"
          >
            {destination.city.toLowerCase()} guide
          </Link>
          <Link
            href={`/destinations/${destination.slug}/plan`}
            className="transition hover:text-[var(--foreground)]"
          >
            plan another
          </Link>
        </nav>
      </header>

      <section className="mx-auto w-full max-w-[820px] px-5 pb-20 pt-8 sm:px-10 sm:pb-24 sm:pt-12">
        {justForked ? (
          <div className="mb-8 rounded-xl border border-[var(--signal)]/45 bg-[var(--signal)]/10 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
              forked · this trip is yours now
            </p>
            <p className="mt-1 text-[14px] leading-6 text-[var(--foreground)]">
              Every day copied. Tap any anchor to swap it for one that fits you better.
            </p>
          </div>
        ) : null}

        <BoardingPassHeader
          destination={destination}
          itinerary={itineraryShape}
          ticketNo={itinerary.slug.split("-").pop() ?? itinerary.slug}
          totalLow={itineraryShape.days.reduce((sum, d) => sum + d.costBandUsd.low, 0)}
          totalHigh={itineraryShape.days.reduce((sum, d) => sum + d.costBandUsd.high, 0)}
        />

        <div className="mt-10">
          <StatsPanel itinerary={itineraryShape} />
        </div>

        {!isOwner ? (
          <div className="relative mt-10 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at 0% 0%, rgba(255,107,53,0.14), transparent 55%), radial-gradient(circle at 100% 100%, rgba(255,107,53,0.08), transparent 60%)"
              }}
            />
            <div className="relative grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8 sm:p-7">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
                  make it yours
                </p>
                <h2 className="mt-2 text-[clamp(1.4rem,3vw,1.8rem)] font-medium leading-tight tracking-[-0.01em] text-[var(--foreground)]">
                  Fork this trip in one click.
                </h2>
                <p className="mt-2 max-w-md text-[14px] leading-6 text-[var(--muted)]">
                  We&apos;ll copy every day, date, and anchor into a new trip you own. Swap whatever
                  doesn&apos;t fit.
                </p>
                {itinerary.fork_count > 0 ? (
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
                    {itinerary.fork_count} {itinerary.fork_count === 1 ? "traveler has" : "travelers have"} planned their version
                  </p>
                ) : null}
              </div>
              <ForkTripButton
                itineraryId={itinerary.id}
                destinationCity={destination.city}
              />
            </div>
          </div>
        ) : itinerary.fork_count > 0 ? (
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
            {itinerary.fork_count} {itinerary.fork_count === 1 ? "traveler has" : "travelers have"} forked your trip
          </p>
        ) : null}

        <div className="mt-12">
          <ItineraryView itinerary={itineraryShape} destination={destination} hideSummary />
        </div>

        <div className="mt-12">
          <CollaboratorPanel
            itineraryId={itinerary.id}
            isOwner={isOwner}
            collaborators={collaborators}
          />
        </div>

        <div className="mt-8 border-t border-[var(--border)] pt-6">
          <ShareButtons url={shareUrl} title={itinerary.title} />
        </div>

        {!isOwner ? (
          <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              prefer a clean slate?
            </p>
            <Link
              href={`/destinations/${destination.slug}/plan`}
              className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--foreground)] transition hover:text-[var(--signal)]"
            >
              plan a new {destination.city.toLowerCase()} trip from scratch →
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
