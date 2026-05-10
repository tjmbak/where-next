import type { Budget, Genre, MonthNumber, Region, Vibe } from "@/types/content";

export type SearchCitation = {
  url: string;
  title?: string;
};

export type SearchDiscovery = {
  summary: string;
  citySlugs: string[];
  citations: SearchCitation[];
};

export type SearchIntent = {
  query: string;
  source: "llm" | "parser";
  confidence: "high" | "medium" | "low";
  month?: MonthNumber;
  stayLength?: number;
  budget?: Budget;
  genre?: Genre;
  vibe?: Vibe;
  region?: Region;
  cityFocus?: string;
  artist?: string;
  discovery?: SearchDiscovery;
  unparsed: string[];
};

export const ALLOWED_GENRES: Genre[] = [
  "afro-house",
  "amapiano",
  "house",
  "techno",
  "electronic",
  "hip-hop",
  "r-and-b",
  "latin",
  "jazz",
  "pop",
  "festival"
];

export const ALLOWED_VIBES: Vibe[] = [
  "beach",
  "luxury",
  "underground",
  "festival",
  "city",
  "cultural",
  "group-trip",
  "late-night"
];

export const ALLOWED_BUDGETS: Budget[] = ["low", "medium", "high", "luxury"];

export const ALLOWED_REGIONS: Region[] = [
  "Africa",
  "Asia",
  "Europe",
  "Middle East",
  "North America",
  "Oceania",
  "South America"
];
