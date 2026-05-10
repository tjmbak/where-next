import type { IngestAdapter, IngestedEvent } from "@/lib/research/ingest/types";

// Stub adapter for Songkick. Real implementation calls
// https://api.songkick.com/api/3.0/metro_areas/{id}/calendar.json
// and maps to IngestedEvent. Returns [] when no API key configured.
export const songkickAdapter: IngestAdapter = {
  source: "songkick",
  async fetchEvents(_destinationSlug): Promise<IngestedEvent[]> {
    if (!process.env.SONGKICK_API_KEY) return [];
    // TODO: implement against Songkick API; map Concert objects to IngestedEvent.
    return [];
  }
};
