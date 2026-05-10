"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AffiliateProvider } from "@/lib/affiliate/providers";

export type PreviewPayload =
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
  close: () => void;
  current: PreviewPayload | null;
};

const PreviewContext = createContext<PreviewContextValue | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<PreviewPayload | null>(null);

  const open = useCallback((payload: PreviewPayload) => setCurrent(payload), []);
  const close = useCallback(() => setCurrent(null), []);

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

  const value = useMemo<PreviewContextValue>(() => ({ open, close, current }), [open, close, current]);

  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}

export function usePreview() {
  return useContext(PreviewContext);
}
