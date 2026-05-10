"use client";

import type { Destination } from "@/types/content";

type ItineraryLoadingStateProps = {
  destination: Destination;
  durationDays: number;
};

export function ItineraryLoadingState({ destination, durationDays }: ItineraryLoadingStateProps) {
  const days = Array.from({ length: durationDays }, (_, i) => i + 1);

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      {/* Scan beam — a horizontal line that sweeps top-to-bottom while the
          LLM stitches the trip. Reuses the .wn-scan keyframes from globals.css
          tinted to signal-orange. */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        <div
          className="absolute inset-x-0 h-20"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(255,139,61,0.04) 30%, rgba(255,139,61,0.18) 50%, rgba(255,139,61,0.04) 70%, transparent 100%)",
            animation: "wn-scan-anim 2.6s cubic-bezier(0.4, 0, 0.4, 1) infinite",
            mixBlendMode: "screen"
          }}
        />
      </div>

      <header className="relative z-20 border-b border-[var(--border)] pb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
          stitching · {destination.city.toLowerCase()}
        </p>
        <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.22em] text-[var(--muted)]">
          reading {destination.city} events · ranking by your vibe · placing anchors
        </p>
      </header>

      <ol className="relative z-20 mt-8 space-y-7">
        {days.map((day, index) => (
          <li
            key={day}
            className="grid grid-cols-[80px_1fr] gap-6 opacity-50"
            style={{ animation: `wn-pulse-fade 2.4s ease-in-out ${index * 0.18}s infinite` }}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
              day {String(day).padStart(2, "0")}
              <br />
              <span className="text-[var(--muted-2)]/60">—</span>
            </div>
            <div className="space-y-3">
              <Skeleton width="35%" height={9} />
              <Skeleton width="78%" height={20} />
              <Skeleton width="92%" height={9} />
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Skeleton width="60%" height={9} />
                <Skeleton width="48%" height={9} />
              </div>
            </div>
          </li>
        ))}
      </ol>

      <style jsx global>{`
        @keyframes wn-pulse-fade {
          0%,
          100% {
            opacity: 0.35;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
}

function Skeleton({ width, height }: { width: string; height: number }) {
  return (
    <div
      className="rounded-sm bg-[var(--border-strong)]"
      style={{ width, height }}
    />
  );
}
