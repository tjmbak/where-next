"use client";

import { useEffect } from "react";
import { recordVisit } from "@/lib/last-visit";
import type { MonthNumber } from "@/types/content";

type GuideVisitRecorderProps = {
  slug: string;
  month: MonthNumber;
  year: number;
  eventCount: number;
};

/** Invisible: writes the "pick up where you left off" breadcrumb. */
export function GuideVisitRecorder({ slug, month, year, eventCount }: GuideVisitRecorderProps) {
  useEffect(() => {
    recordVisit({ slug, month, year, eventCount });
  }, [slug, month, year, eventCount]);
  return null;
}
