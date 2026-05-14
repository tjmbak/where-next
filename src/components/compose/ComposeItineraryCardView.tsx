"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthModal } from "@/components/auth/AuthModal";
import { trackEvent } from "@/lib/analytics";
import type { ComposeItineraryCard } from "@/lib/compose/types";

type ComposeItineraryCardViewProps = {
  card: ComposeItineraryCard;
};

const ANCHOR_GRADIENTS: Record<string, [string, string]> = {
  event: ["rgba(255,107,53,0.10)", "rgba(255,107,53,0.02)"],
  venue: ["rgba(180,180,255,0.08)", "rgba(180,180,255,0.02)"],
  free: ["rgba(255,255,255,0.04)", "rgba(255,255,255,0)"]
};

export function ComposeItineraryCardView({ card }: ComposeItineraryCardViewProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const previewDays = card.itinerary.days.slice(0, 3);
  const moreDays = card.itinerary.days.length - previewDays.length;

  async function handleSave() {
    if (saving) return;
    setError(null);
    setSaving(true);
    trackEvent("compose_save_click", { city: card.city, durationDays: card.durationDays });

    try {
      const res = await fetch("/api/compose/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itinerary: card.itinerary, city: card.city })
      });
      const body = (await res.json().catch(() => null)) as
        | { ok: true; slug: string }
        | { needsAuth: true }
        | { error: string }
        | null;

      if (res.ok && body && "ok" in body) {
        trackEvent("compose_save_success", { slug: body.slug });
        router.push(`/itineraries/${body.slug}?from=composer`);
        return;
      }
      if (res.ok && body && "needsAuth" in body) {
        trackEvent("compose_save_auth_prompt", { city: card.city });
        setAuthOpen(true);
        return;
      }
      setError(body && "error" in body ? body.error : `save-failed-${res.status}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "save-failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <article className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--foreground)]/55 hover:shadow-[0_18px_40px_-22px_rgba(0,0,0,0.55)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(135deg, rgba(255,107,53,0.06) 0%, rgba(255,107,53,0) 60%)`
          }}
        />
        <div className="relative space-y-3">
          <div className="flex items-baseline justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.22em]">
            <span className="text-[var(--signal)]">{card.durationDays} days</span>
            <span className="text-[var(--muted-2)]">{card.vibeSummary}</span>
          </div>

          <h3 className="text-[20px] font-medium leading-[1.2] tracking-[-0.01em] text-[var(--foreground)]">
            {card.city}
            {card.country ? <span className="text-[var(--muted)]">, {card.country}</span> : null}
          </h3>

          <p className="text-[13px] leading-6 text-[var(--muted)]">{card.pitch}</p>

          {card.startDate && card.endDate ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
              {card.startDate} → {card.endDate}
            </p>
          ) : null}

          <ol className="space-y-1.5 border-y border-[var(--border)] py-3">
            {previewDays.map((day) => {
              const [from, to] = ANCHOR_GRADIENTS[day.anchorKind] ?? ANCHOR_GRADIENTS.free;
              return (
                <li
                  key={day.day}
                  className="flex items-start gap-2 rounded-md px-2 py-1"
                  style={{ background: `linear-gradient(90deg, ${from} 0%, ${to} 100%)` }}
                >
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--background)]/60 font-mono text-[9px] font-medium text-[var(--foreground)]">
                    {String(day.day).padStart(2, "0")}
                  </span>
                  <span className="flex-1 truncate text-[13px] leading-5 text-[var(--foreground)]/90">
                    {day.anchorTitle}
                  </span>
                </li>
              );
            })}
            {moreDays > 0 ? (
              <li className="px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
                + {moreDays} more {moreDays === 1 ? "day" : "days"}
              </li>
            ) : null}
          </ol>

          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
              ${card.totalLow.toLocaleString()}–${card.totalHigh.toLocaleString()}
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="group/save inline-flex items-center gap-1.5 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--background)] transition hover:bg-transparent hover:text-[var(--foreground)] disabled:cursor-wait disabled:opacity-70"
            >
              {saving ? "saving…" : "save"}
              <span aria-hidden className="transition group-hover/save:translate-x-0.5">→</span>
            </button>
          </div>

          {error ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--signal)]">
              {error === "openai-not-configured" ? "ai offline" : `couldn't save (${error})`}
            </p>
          ) : null}
        </div>
      </article>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        reason={`Sign in to save your ${card.city} trip.`}
      />
    </>
  );
}
