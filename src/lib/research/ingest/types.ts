import type { EventType, Genre } from "@/types/content";

export type IngestedEvent = {
  destinationSlug: string;
  source: string;
  sourceUrl: string;
  externalId: string;
  title: string;
  startDate: string;
  endDate?: string;
  type: EventType;
  genres: Genre[];
  importanceScore: number;
  summary: string;
  ticketUrl?: string;
};

export type IngestAdapter = {
  source: string;
  fetchEvents: (
    destinationSlug: string,
    options?: { from?: Date; to?: Date }
  ) => Promise<IngestedEvent[]>;
};
