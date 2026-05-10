import { DESTINATIONS } from "@/data/music-travel";
import { festivalSitesAdapter } from "@/lib/research/ingest/festival-sites";
import { raAdapter } from "@/lib/research/ingest/ra";
import { songkickAdapter } from "@/lib/research/ingest/songkick";
import type { IngestAdapter, IngestedEvent } from "@/lib/research/ingest/types";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const ADAPTERS: IngestAdapter[] = [songkickAdapter, raAdapter, festivalSitesAdapter];

export type IngestSummary = {
  source: string;
  fetched: number;
  inserted: number;
  skipped: number;
  errors: number;
};

export async function runIngestionForAllDestinations(): Promise<IngestSummary[]> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return ADAPTERS.map((adapter) => ({
      source: adapter.source,
      fetched: 0,
      inserted: 0,
      skipped: 0,
      errors: 1
    }));
  }

  const summaries: IngestSummary[] = [];

  for (const adapter of ADAPTERS) {
    let fetched = 0;
    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const destination of DESTINATIONS) {
      let events: IngestedEvent[] = [];
      try {
        events = await adapter.fetchEvents(destination.slug);
      } catch {
        errors++;
        continue;
      }
      fetched += events.length;

      for (const event of events) {
        const { error } = await supabase.from("pending_events").insert({
          destination_slug: event.destinationSlug,
          source: event.source,
          source_url: event.sourceUrl,
          external_id: event.externalId,
          payload: event,
          status: "pending"
        });
        if (error) {
          // 23505 = unique violation = already ingested; that's fine
          if (error.code === "23505") skipped++;
          else errors++;
        } else {
          inserted++;
        }
      }
    }

    summaries.push({ source: adapter.source, fetched, inserted, skipped, errors });
  }

  return summaries;
}
