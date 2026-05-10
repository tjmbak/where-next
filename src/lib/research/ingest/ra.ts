import type { IngestAdapter, IngestedEvent } from "@/lib/research/ingest/types";

// Stub adapter for Resident Advisor. Real implementation calls RA's GraphQL
// endpoint and maps Event nodes to IngestedEvent. RA terms-of-service require
// careful rate-limiting and proper attribution back to ra.co.
export const raAdapter: IngestAdapter = {
  source: "resident-advisor",
  async fetchEvents(_destinationSlug): Promise<IngestedEvent[]> {
    if (!process.env.RA_GRAPHQL_TOKEN) return [];
    // TODO: implement RA GraphQL fetch; respect their query throttling.
    return [];
  }
};
