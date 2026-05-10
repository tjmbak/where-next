import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Concierge brief received",
  robots: { index: false }
};

type PageProps = { searchParams: Promise<{ id?: string }> };

export default async function ConciergeThanksPage({ searchParams }: PageProps) {
  const { id } = await searchParams;

  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--foreground)] font-mono text-[11px] font-bold text-[var(--background)]">
            W
          </span>
          <span>where next</span>
        </Link>
      </header>
      <section className="mx-auto w-full max-w-[680px] px-6 py-16 text-center sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">concierge</p>
        <h1 className="mt-5 text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.05] tracking-[-0.02em] text-[var(--foreground)]">
          Brief received. We are on it.
        </h1>
        <p className="mt-5 text-[15px] leading-7 text-[var(--muted)]">
          You will get the full plan within 72 hours by email. Two revisions included over the next 14 days.
        </p>
        {id ? (
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
            request · {id}
          </p>
        ) : null}
        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
        >
          back to the map
          <span aria-hidden>→</span>
        </Link>
      </section>
    </main>
  );
}
