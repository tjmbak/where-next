import type { Itinerary } from "@/lib/itineraries/generate";

export type ComposeRole = "user" | "assistant";

export type ComposeMessage = {
  id: string;
  role: ComposeRole;
  content: string;
  toolResults?: ComposeToolResult[];
  createdAt: string;
};

export type ComposeToolResult =
  | { kind: "destinations"; items: ComposeDestinationCard[] }
  | { kind: "itineraries"; items: ComposeItineraryCard[] };

export type ComposeDestinationCard = {
  slug: string;
  city: string;
  country: string;
  region: string;
  tagline: string;
  budget: string;
  matchReason: string;
};

export type ComposeItineraryCard = {
  // A draft itinerary the user can save with one click. Includes the full
  // payload the existing /api/itineraries POST expects.
  pitch: string;
  city: string;
  country: string;
  durationDays: number;
  vibeSummary: string;
  startDate: string | null;
  endDate: string | null;
  totalLow: number;
  totalHigh: number;
  itinerary: Itinerary;
};
