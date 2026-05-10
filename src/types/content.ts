export type MonthNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type Genre =
  | "afro-house"
  | "amapiano"
  | "house"
  | "techno"
  | "electronic"
  | "hip-hop"
  | "r-and-b"
  | "latin"
  | "jazz"
  | "pop"
  | "festival";

export type EventType =
  | "festival"
  | "club-night"
  | "residency"
  | "beach-club"
  | "carnival"
  | "concert"
  | "conference";

export type Vibe =
  | "beach"
  | "luxury"
  | "underground"
  | "festival"
  | "city"
  | "cultural"
  | "group-trip"
  | "late-night";

export type Budget = "low" | "medium" | "high" | "luxury";

export type Region =
  | "Africa"
  | "Asia"
  | "Europe"
  | "Middle East"
  | "North America"
  | "Oceania"
  | "South America";

export type Confidence = "low" | "medium" | "high";

export type ActivityRubric = {
  id: string;
  label: string;
  description: string;
  weight: number;
};

export type Destination = {
  slug: string;
  city: string;
  country: string;
  region: Region;
  coordinates: {
    lat: number;
    lng: number;
  };
  tagline: string;
  summary: string;
  heroImage: string;
  activeMonths: MonthNumber[];
  peakMonths: MonthNumber[];
  genres: Genre[];
  vibes: Vibe[];
  budget: Budget;
  averageDailySpendUsd: {
    low: number;
    high: number;
  };
  whoFor: string[];
  whenToBook: string;
  travelNotes: string;
};

export type MonthlyDestinationScore = {
  destinationSlug: string;
  month: MonthNumber;
  year: number | null;
  overallScore: number;
  confidence: Confidence;
  editorialSummary: string;
  genreScores: Partial<Record<Genre, number>>;
  whyNow: string[];
};

export type Venue = {
  id: string;
  destinationSlug: string;
  name: string;
  type: EventType | "venue";
  coordinates?: {
    lat: number;
    lng: number;
  };
  sceneTags: Vibe[];
  officialUrl: string;
};

export type Event = {
  id: string;
  destinationSlug: string;
  venueId?: string;
  title: string;
  startDate: string;
  endDate?: string;
  type: EventType;
  genres: Genre[];
  importanceScore: number;
  sourceUrl: string;
  ticketUrl?: string;
  summary: string;
};

export type CurationSource = {
  id: string;
  destinationSlug: string;
  sourceUrl: string;
  publisher: string;
  lastChecked: string;
  notes: string;
};

export type DiscoveryFilters = {
  month: MonthNumber;
  stayLength?: 1 | 2 | 3;
  genre?: Genre | "all";
  vibe?: Vibe | "all";
  budget?: Budget | "all";
  region?: Region | "all";
};
