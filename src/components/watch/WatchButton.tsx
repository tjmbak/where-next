"use client";

import Link from "next/link";
import { useToast } from "@/components/toast/Toaster";
import { trackEvent } from "@/lib/analytics";
import { useWatches, type Watch } from "@/lib/watches";
import { getMonthLabel } from "@/data/taxonomy";

type WatchButtonProps = {
  slug: string;
  month: Watch["month"];
  year: number;
  /**
   * icon — square button, matches the save-heart in the quick-look footer.
   * pill — labeled button for page surfaces.
   */
  variant?: "icon" | "pill";
  /** dark = on photo/hero backgrounds; light = on cream surfaces. */
  tone?: "light" | "dark";
};

function BellIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function WatchButton({ slug, month, year, variant = "icon", tone = "light" }: WatchButtonProps) {
  const { isWatching, toggle, isAuthenticated, isAuthReady } = useWatches();
  const toaster = useToast();
  const watch: Watch = { slug, month, year };
  const watching = isWatching(watch);
  const monthLabel = getMonthLabel(month);

  const handleToggle = () => {
    void toggle(watch).then((nowWatching) => {
      trackEvent("watch_toggle", {
        slug,
        month,
        year,
        action: nowWatching ? "watch" : "unwatch"
      });
      if (!toaster) return;
      if (nowWatching) {
        if (isAuthReady && !isAuthenticated) {
          toaster.toast({
            message: `Watching ${monthLabel} ${year} on this device — sign in to get email alerts.`,
            link: { label: "sign in", href: "/auth/login?next=/settings" }
          });
        } else {
          toaster.toast({
            message: `Watching ${monthLabel} ${year} — we'll email you when new events are confirmed.`,
            action: { label: "undo", onClick: () => void toggle(watch) }
          });
        }
      } else {
        toaster.toast({
          message: `Stopped watching ${monthLabel} ${year}.`,
          action: { label: "undo", onClick: () => void toggle(watch) }
        });
      }
    });
  };

  const title = watching
    ? `Stop watching ${slug} · ${monthLabel} ${year}`
    : `Watch ${slug} · ${monthLabel} ${year} — get alerted when new events are confirmed`;

  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-pressed={watching}
        aria-label={title}
        title={title}
        onClick={handleToggle}
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition ${
          watching
            ? "border-[var(--signal)]/55 bg-[var(--signal)]/10 text-[var(--signal)]"
            : "border-[var(--border-strong)] bg-transparent text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
        }`}
      >
        <BellIcon filled={watching} />
      </button>
    );
  }

  const dark = tone === "dark";
  return (
    <span className="inline-flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        aria-pressed={watching}
        title={title}
        onClick={handleToggle}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-medium transition ${
          watching
            ? dark
              ? "border-white bg-white text-black"
              : "border-[var(--signal)]/55 bg-[var(--signal)]/10 text-[var(--signal)]"
            : dark
              ? "border-white/40 text-white/85 hover:border-white hover:text-white"
              : "border-[var(--border-strong)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
        }`}
      >
        <BellIcon filled={watching} />
        {watching ? `Watching ${monthLabel}` : `Get alerts for ${monthLabel}`}
      </button>
      {watching && isAuthReady && !isAuthenticated ? (
        <Link
          href="/auth/login?next=/settings"
          className={`text-[13px] underline-offset-4 transition hover:underline ${
            dark ? "text-white/60 hover:text-white" : "text-[var(--muted-2)] hover:text-[var(--foreground)]"
          }`}
        >
          Sign in to get email alerts
        </Link>
      ) : null}
    </span>
  );
}
