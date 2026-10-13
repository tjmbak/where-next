import type { Metadata } from "next";
import { WindowFinder } from "@/components/find/WindowFinder";
import { ogImageUrl } from "@/lib/og";
import { SiteHeader } from "@/components/nav/SiteHeader";

export const metadata: Metadata = {
  title: "Find your window",
  description:
    "Have dates and a budget? Get every city ranked for your exact window — events, seasons, and scenes included.",
  alternates: { canonical: "/find" },
  openGraph: {
    title: "Find your window · Where Next",
    description: "Your dates, your budget, your scene — every city ranked for your exact window.",
    images: [
      {
        url: ogImageUrl({
          eyebrow: "reverse search",
          title: "Find your window",
          subtitle: "Your dates, your budget, your scene — every city ranked.",
          stat: "48 cities scored"
        }),
        width: 1200,
        height: 630
      }
    ]
  }
};

type FindPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickString(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

export default async function FindPage({ searchParams }: FindPageProps) {
  const params = await searchParams;
  const initial = {
    from: pickString(params.from),
    to: pickString(params.to),
    genres: pickString(params.genres),
    budget: pickString(params.budget),
    region: pickString(params.region)
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-[880px] px-6 pb-24 pt-6 sm:px-10">
      <SiteHeader bare className="border-b border-[var(--border)] pb-5" />

      <section className="pt-10 sm:pt-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          reverse search
        </p>
        <h1 className="mt-3 text-[clamp(2rem,5vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.03em] text-[var(--foreground)]">
          Have dates? <span className="text-[var(--accent)]">Find your window</span>
          <span className="text-[var(--signal)]">.</span>
        </h1>
        <p className="mt-4 max-w-xl text-[14px] leading-7 text-[var(--muted)]">
          Tell us when you can travel — and optionally your scene, budget, and region — and
          every city gets ranked for your exact dates, with the events that make each one worth it.
        </p>
      </section>

      <section className="pt-8">
        <WindowFinder initial={initial} />
      </section>
    </main>
  );
}
