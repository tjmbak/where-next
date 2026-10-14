"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { upcomingYearForMonth, yearQueryFor } from "@/data/taxonomy";
import type { AffiliateProvider } from "@/lib/affiliate/providers";
import type { MonthNumber } from "@/types/content";

export type PreviewPayload =
  | {
      kind: "destination";
      destinationSlug: string;
      month: MonthNumber;
      year?: number;
      /** Ordered city slugs the sheet can step through with ‹ › and the arrow keys. */
      siblings?: string[];
      stepFocus?: "Previous city" | "Next city";
    }
  | {
      kind: "event";
      eventId: string;
      destinationSlug: string;
      href: string;
      eventLabel: string;
      provider?: AffiliateProvider;
    }
  | {
      kind: "venue";
      venueId: string;
      destinationSlug: string;
      href: string;
      eventLabel: string;
      provider?: AffiliateProvider;
    }
  | {
      kind: "external";
      title: string;
      destinationSlug: string;
      href: string;
      eventLabel: string;
      provider?: AffiliateProvider;
    };

type PreviewContextValue = {
  open: (payload: PreviewPayload) => void;
  /** Closes the sheet; a city sheet steps back out of its history entry. */
  close: () => void;
  /** Hides the sheet without touching history, for links that navigate away. */
  dismiss: () => void;
  current: PreviewPayload | null;
};

type DestinationPayload = Extract<PreviewPayload, { kind: "destination" }>;

const MOBILE_QUERY = "(max-width: 639px)";

export function cityHref(payload: DestinationPayload): string {
  const year = payload.year ?? upcomingYearForMonth(payload.month);
  return `/destinations/${payload.destinationSlug}?month=${payload.month}${yearQueryFor(payload.month, year)}`;
}

function sheetEntry(): DestinationPayload | null {
  const state = window.history.state as { wnPreview?: DestinationPayload } | null;
  return state?.wnPreview ?? null;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [current, setCurrent] = useState<PreviewPayload | null>(null);
  const ownsEntryRef = useRef(false);

  // City sheets own a history entry at the city's real URL, so Back closes the
  // sheet, and copying or refreshing the URL lands on the full city page.
  const open = useCallback(
    (payload: PreviewPayload) => {
      if (payload.kind === "destination") {
        const href = cityHref(payload);
        if (window.matchMedia(MOBILE_QUERY).matches) {
          router.push(href);
          return;
        }
        const state = { ...(window.history.state ?? {}), wnPreview: { ...payload, stepFocus: undefined } };
        if (ownsEntryRef.current) window.history.replaceState(state, "", href);
        else window.history.pushState(state, "", href);
        ownsEntryRef.current = true;
      }
      setCurrent(payload);
    },
    [router]
  );
  const close = useCallback(() => {
    if (ownsEntryRef.current) window.history.back();
    else setCurrent(null);
  }, []);
  const dismiss = useCallback(() => {
    ownsEntryRef.current = false;
    setCurrent(null);
  }, []);

  useEffect(() => {
    // A reload of a sheet entry renders the full city page; drop the stale marker.
    if (sheetEntry()) {
      const { wnPreview: _stale, ...rest } = window.history.state as Record<string, unknown>;
      void _stale;
      window.history.replaceState(rest, "");
    }
    const onPop = () => {
      const entry = sheetEntry();
      ownsEntryRef.current = Boolean(entry);
      setCurrent(entry);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Lock body scroll while open + ESC closes
  useEffect(() => {
    if (!current) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [current, close]);

  const value = useMemo<PreviewContextValue>(() => ({ open, close, dismiss, current }), [open, close, dismiss, current]);

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}

export function usePreview() {
  return useContext(PreviewContext);
}
