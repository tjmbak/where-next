"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export const PRIMARY_NAV = [
  { href: "/", label: "Explore", match: (p: string) => p === "/" || p.startsWith("/destinations") || p.startsWith("/where-to-go") },
  { href: "/events", label: "Events", match: (p: string) => p.startsWith("/events") },
  { href: "/find", label: "By dates", match: (p: string) => p.startsWith("/find") },
  { href: "/compose", label: "Plan a trip", match: (p: string) => p.startsWith("/compose") }
] as const;

export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      queueMicrotask(() => setSignedIn(false));
      return;
    }
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (alive) setSignedIn(Boolean(data.session));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (alive) setSignedIn(Boolean(session));
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return signedIn;
}

type Slot = { left: number; width: number };

// The header remounts with every page (sometimes twice while a streamed page
// swaps in), so the lens remembers the previous route's slot and any header
// mounted just after a route change glides from there instead of popping in.
let lensMemory: { path: string; slot: Slot | null; from: Slot | null; at: number } | null = null;
const LENS_HANDOFF_MS = 1200;

function PrimaryPills({ pathname, overlay }: { pathname: string; overlay: boolean }) {
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const activeIndex = PRIMARY_NAV.findIndex((item) => item.match(pathname));
  const [lens, setLens] = useState<{ slot: Slot; still: boolean } | null>(null);
  const [hover, setHover] = useState<{ slot: Slot; still: boolean } | null>(null);

  const slotOf = useCallback((index: number): Slot | null => {
    const node = itemRefs.current[index];
    return node ? { left: node.offsetLeft, width: node.offsetWidth } : null;
  }, []);

  useLayoutEffect(() => {
    const target = activeIndex >= 0 ? slotOf(activeIndex) : null;
    let frame = 0;
    let alive = true;
    queueMicrotask(() => {
      if (!alive) return;
      const now = Date.now();
      const memory = lensMemory;
      let from: Slot | null = null;
      if (memory && memory.path !== pathname) {
        from = memory.slot;
        lensMemory = { path: pathname, slot: target, from, at: now };
      } else if (memory && now - memory.at < LENS_HANDOFF_MS) {
        from = memory.from;
        lensMemory = { ...memory, slot: target };
      } else {
        lensMemory = { path: pathname, slot: target, from: null, at: now };
      }
      const moves = Boolean(target && from && (from.left !== target.left || from.width !== target.width));
      setLens(target ? { slot: moves && from ? from : target, still: true } : null);
      if (moves && target) {
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => setLens({ slot: target, still: false }));
        });
      }
    });
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
    };
  }, [activeIndex, pathname, slotOf]);

  useEffect(() => {
    if (activeIndex < 0 || typeof ResizeObserver === "undefined") return;
    const node = itemRefs.current[activeIndex]?.parentElement;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      const slot = slotOf(activeIndex);
      const known = lensMemory?.slot;
      if (slot && known && lensMemory && (slot.left !== known.left || slot.width !== known.width)) {
        lensMemory = { ...lensMemory, slot };
        setLens({ slot, still: true });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [activeIndex, slotOf]);

  const showHover = (index: number) => {
    const slot = slotOf(index);
    if (!slot) return;
    setHover((current) => ({ slot, still: !current }));
  };

  return (
    <nav
      aria-label="Primary"
      onMouseLeave={() => setHover(null)}
      className={`relative hidden items-center gap-0.5 rounded-full p-1 md:flex ${overlay ? "wn-glass-dark" : "wn-glass"}`}
    >
      <span
        aria-hidden
        data-still={hover?.still ? "" : undefined}
        className={`wn-lens-hover pointer-events-none absolute inset-y-1 rounded-full ${
          overlay ? "bg-white/14" : "bg-[var(--foreground)]/[0.06]"
        } ${hover ? "opacity-100" : "opacity-0"}`}
        style={hover ? { left: hover.slot.left, width: hover.slot.width } : undefined}
      />
      <span
        aria-hidden
        data-still={lens?.still ? "" : undefined}
        className={`wn-lens pointer-events-none absolute inset-y-1 rounded-full ${lens ? "opacity-100" : "opacity-0"}`}
        style={lens ? { left: lens.slot.left, width: lens.slot.width } : undefined}
      />
      {PRIMARY_NAV.map((item, index) => {
        const active = index === activeIndex;
        return (
          <Link
            key={item.href}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onMouseEnter={() => showHover(index)}
            onFocus={() => showHover(index)}
            className={`relative z-10 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors duration-300 ${
              active
                ? `${lens ? "" : "wn-lens"} text-[var(--foreground)]`
                : overlay
                  ? "text-white/80 hover:text-white"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

type SiteHeaderProps = {
  tone?: "light" | "overlay";
  /** Replaces the default account action on the right. */
  action?: ReactNode;
  /** Skip the page-width container when the parent already provides it. */
  bare?: boolean;
  className?: string;
};

export function SiteHeader({ tone = "light", action, bare = false, className = "" }: SiteHeaderProps) {
  const pathname = usePathname() ?? "/";
  const signedIn = useSignedIn();
  const overlay = tone === "overlay";

  return (
    <header
      className={`flex w-full items-center justify-between gap-4 ${bare ? "" : "mx-auto max-w-[1180px] px-6 py-5 sm:px-10"} ${
        overlay ? "absolute inset-x-0 top-0 z-30 text-white" : ""
      } ${className}`}
    >
      <Link href="/" className="flex shrink-0 items-center gap-2 text-[15px] font-semibold tracking-tight">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-bold ${
            overlay ? "bg-white text-black" : "bg-[var(--foreground)] text-[var(--background)]"
          }`}
        >
          W
        </span>
        <span>where next</span>
      </Link>

      <PrimaryPills pathname={pathname} overlay={overlay} />

      <div className="flex shrink-0 items-center gap-2">
        {action ??
          (signedIn ? (
            <>
            <Link
              href="/settings"
              aria-label="Settings"
              className={`hidden h-9 w-9 items-center justify-center rounded-full transition sm:inline-flex ${
                overlay ? "text-white/80 hover:bg-white/15 hover:text-white" : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              }`}
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                <circle cx="12" cy="8" r="3.5" />
                <path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5" />
              </svg>
            </Link>
            <Link
              href="/me/itineraries"
              className={`inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium transition ${
                overlay
                  ? "wn-glass-dark text-white hover:bg-white hover:text-black"
                  : "wn-glass text-[var(--foreground)] hover:-translate-y-px"
              }`}
            >
              Your trips
            </Link>
            </>
          ) : (
            <Link
              href="/auth/login"
              className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition ${
                overlay
                  ? "bg-white text-black hover:bg-white/90"
                  : "bg-[var(--foreground)] text-[var(--background)] hover:opacity-90"
              }`}
            >
              Sign in
            </Link>
          ))}
      </div>
    </header>
  );
}
