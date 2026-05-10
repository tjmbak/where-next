import type { IngestAdapter, IngestedEvent } from "@/lib/research/ingest/types";

// Festival-site scraper. Each destination can register a scraper recipe with
// a known list of canonical festival sites. Returns IngestedEvent rows after
// extracting dates and titles. Disabled by default; enable per-host via
// FESTIVAL_SCRAPER_HOSTS env var.
export const festivalSitesAdapter: IngestAdapter = {
  source: "festival-sites",
  async fetchEvents(_destinationSlug): Promise<IngestedEvent[]> {
    if (!process.env.FESTIVAL_SCRAPER_ENABLED) return [];
    // TODO: implement opt-in scraper recipes per festival site, with strict
    // robots.txt checks and rate-limiting.
    return [];
  }
};
