import type { ActivityRubric, Budget, EventType, Genre, MonthNumber, Region, Vibe } from "@/types/content";

export const MONTHS: Array<{ value: MonthNumber; label: string; shortLabel: string }> = [
  { value: 1, label: "January", shortLabel: "Jan" },
  { value: 2, label: "February", shortLabel: "Feb" },
  { value: 3, label: "March", shortLabel: "Mar" },
  { value: 4, label: "April", shortLabel: "Apr" },
  { value: 5, label: "May", shortLabel: "May" },
  { value: 6, label: "June", shortLabel: "Jun" },
  { value: 7, label: "July", shortLabel: "Jul" },
  { value: 8, label: "August", shortLabel: "Aug" },
  { value: 9, label: "September", shortLabel: "Sep" },
  { value: 10, label: "October", shortLabel: "Oct" },
  { value: 11, label: "November", shortLabel: "Nov" },
  { value: 12, label: "December", shortLabel: "Dec" }
];

export const GENRE_LABELS: Record<Genre, string> = {
  "afro-house": "Afro house",
  amapiano: "Amapiano",
  house: "House",
  techno: "Techno",
  electronic: "Electronic",
  "hip-hop": "Hip-hop",
  "r-and-b": "R&B",
  latin: "Latin",
  jazz: "Jazz",
  pop: "Pop",
  festival: "Festival"
};

export const VIBE_LABELS: Record<Vibe, string> = {
  beach: "Beach",
  luxury: "Luxury",
  underground: "Underground",
  festival: "Festival",
  city: "City",
  cultural: "Cultural",
  "group-trip": "Group trip",
  "late-night": "Late night"
};

export const BUDGET_LABELS: Record<Budget, string> = {
  low: "$",
  medium: "$$",
  high: "$$$",
  luxury: "$$$$"
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  festival: "Festival",
  "club-night": "Club night",
  residency: "Residency",
  "beach-club": "Beach club",
  carnival: "Carnival",
  concert: "Concert",
  conference: "Conference"
};

export const REGIONS: Region[] = [
  "Africa",
  "Asia",
  "Europe",
  "Middle East",
  "North America",
  "Oceania",
  "South America"
];

export const ACTIVITY_RUBRIC: ActivityRubric[] = [
  {
    id: "signature-events",
    label: "Signature events",
    description: "Major festivals, residencies, artist lineups, or annual cultural music moments.",
    weight: 35
  },
  {
    id: "seasonality",
    label: "Seasonality",
    description: "How strongly the destination is known to come alive during this month.",
    weight: 25
  },
  {
    id: "venue-density",
    label: "Venue density",
    description: "Quality and concentration of clubs, beach clubs, live rooms, promoters, and music neighborhoods.",
    weight: 20
  },
  {
    id: "travel-intent",
    label: "Travel intent",
    description: "How likely the destination is to justify booking a trip around its music calendar.",
    weight: 15
  },
  {
    id: "source-confidence",
    label: "Source confidence",
    description: "Freshness and reliability of curated official sources and event references.",
    weight: 5
  }
];

export function getMonthLabel(month: MonthNumber) {
  return MONTHS.find((item) => item.value === month)?.label ?? "Unknown";
}

export function getCurrentMonth(): MonthNumber {
  return (new Date().getMonth() + 1) as MonthNumber;
}
