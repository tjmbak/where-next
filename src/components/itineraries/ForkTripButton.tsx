"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { trackEvent } from "@/lib/analytics";

type ForkTripButtonProps = {
  itineraryId: string;
  destinationCity: string;
  variant?: "primary" | "ghost";
  className?: string;
};

export function ForkTripButton({ itineraryId, destinationCity, variant = "primary", className }: ForkTripButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  async function handleFork() {
    if (loading) return;
    setError(null);
    setLoading(true);
    trackEvent("itinerary_fork_click", { itineraryId });

    try {
      const res = await fetch(`/api/itineraries/${itineraryId}/fork`, {
        method: "POST",
        headers: { "content-type": "application/json" }
      });
      const json = (await res.json().catch(() => null)) as
        | { ok: true; slug: string }
        | { needsAuth: true }
        | { error: string }
        | null;

      if (res.ok && json && "ok" in json) {
        trackEvent("itinerary_fork_success", { itineraryId, newSlug: json.slug });
        router.push(`/itineraries/${json.slug}?forked=1`);
        return;
      }
      if (res.ok && json && "needsAuth" in json) {
        trackEvent("itinerary_fork_auth_prompt", { itineraryId });
        setAuthOpen(true);
        return;
      }
      const message = json && "error" in json ? json.error : `fork-failed-${res.status}`;
      setError(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "fork-failed");
    } finally {
      setLoading(false);
    }
  }

  const baseClasses =
    variant === "primary"
      ? "group relative inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] disabled:cursor-wait disabled:opacity-70 sm:w-auto"
      : "group inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-transparent px-5 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--foreground)] transition hover:border-[var(--foreground)] disabled:cursor-wait disabled:opacity-70";

  return (
    <>
      <div className={className}>
        <button type="button" onClick={handleFork} disabled={loading} className={baseClasses}>
          {loading ? "forking…" : variant === "primary" ? `make this my trip` : "fork →"}
          {variant === "primary" ? (
            <span aria-hidden className="font-mono text-xs transition group-hover:translate-x-0.5">
              →
            </span>
          ) : null}
        </button>
        {variant === "primary" ? (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
            copies every day · you can edit any anchor
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--signal)]">
            {error === "forbidden"
              ? "this trip is private"
              : error === "not-found"
                ? "trip not found"
                : "couldn't fork — try again"}
          </p>
        ) : null}
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        reason={`Sign in to make this ${destinationCity} trip your own.`}
      />
    </>
  );
}
