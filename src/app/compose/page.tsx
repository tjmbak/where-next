import type { Metadata } from "next";
import { ComposeChat } from "@/components/compose/ComposeChat";
import { SiteHeader } from "@/components/nav/SiteHeader";

export const metadata: Metadata = {
  title: "Plan with AI",
  description:
    "Tell Where Next what kind of trip you want — vibe, dates, budget — and we draft a real trip you can save in one tap.",
  robots: { index: true }
};

const SUGGESTIONS = [
  "i have 5 days in late august, love deep house, mid budget",
  "long weekend somewhere warm with proper techno",
  "10 days in europe in june, festival energy",
  "cheapest hard-techno scene in europe right now",
  "first solo trip — 4 days, hip-hop scene, beach"
];

type ComposePageProps = {
  searchParams: Promise<{ seed?: string }>;
};

export default async function ComposePage({ searchParams }: ComposePageProps) {
  const { seed } = await searchParams;
  const initialDraft = typeof seed === "string" ? seed.slice(0, 280) : undefined;
  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <SiteHeader />

      <section className="mx-auto w-full max-w-[820px] px-6 pb-20 pt-12 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--signal)]">
          beta
        </p>
        <h1 className="mt-3 text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[0.95] tracking-[-0.03em] text-[var(--foreground)]">
          Tell me what kind of trip.<br />
          <span className="text-[var(--muted)]">I&apos;ll draft the rest.</span>
        </h1>
        <p className="mt-6 max-w-xl text-[15px] leading-7 text-[var(--muted)]">
          Vibe, dates, budget — even just one of those is enough. It pulls real events
          and venues from Where Next&apos;s catalog into a day-by-day plan you can save in one tap.
        </p>

        <div className="mt-10">
          <ComposeChat suggestions={SUGGESTIONS} initialDraft={initialDraft} />
        </div>
      </section>
    </main>
  );
}
