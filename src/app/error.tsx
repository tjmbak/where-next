"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[80vh] w-full items-center justify-center bg-[var(--background)] px-6">
      <div className="max-w-md text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--signal)]">something went sideways</p>
        <h1 className="mt-4 text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.05] tracking-[-0.03em] text-[var(--foreground)]">
          We dropped the beat.
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-[var(--muted)]">
          That one&apos;s on us. Try again, or head back to the map.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-12 items-center rounded-full bg-[var(--foreground)] px-7 text-[15px] font-medium text-[var(--background)] transition hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-12 items-center rounded-full border border-[var(--border-strong)] px-7 text-[15px] font-medium text-[var(--foreground)] transition hover:border-[var(--foreground)]"
          >
            Back to the map
          </Link>
        </div>
      </div>
    </main>
  );
}
