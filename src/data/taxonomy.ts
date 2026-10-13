import type { ActivityRubric, Budget, EventType, Genre, MonthNumber, Region, Vibe } from "@/types/content";

/**
 * The catalog year the curated events + scores are authored for. Centralized
 * so headlines, breadcrumbs, and edition stamps never drift out of sync.
 */
export const EDITION_YEAR = 2026;

/**
 * Years the year-selector offers. The first is the default/current edition
 * (heavily researched); later years start as forward estimates from the
 * recurring backbone and harden to confirmed as research lands. Bump this
 * list as the calendar rolls forward.
 */
export const SUPPORTED_YEARS: number[] = [EDITION_YEAR, EDITION_YEAR + 1];

export function isSupportedYear(year: number): boolean {
  return SUPPORTED_YEARS.includes(year);
}

function clampToSupportedYear(year: number): number {
  const first = SUPPORTED_YEARS[0];
  const last = SUPPORTED_YEARS[SUPPORTED_YEARS.length - 1];
  return Math.min(last, Math.max(first, year));
}

/** True once the whole calendar month is behind us. */
export function isPastMonth(month: number, year: number, now: Date = new Date()): boolean {
  const currentYear = now.getFullYear();
  return year < currentYear || (year === currentYear && month < now.getMonth() + 1);
}

/**
 * The year a bare month resolves to: its next occurrence (this month counts),
 * so "July" in October means next July — never a month that already happened.
 */
export function upcomingYearForMonth(month: number, now: Date = new Date()): number {
  const currentYear = now.getFullYear();
  return clampToSupportedYear(month >= now.getMonth() + 1 ? currentYear : currentYear + 1);
}

/** `&year=YYYY` only when it differs from the month's default year. */
export function yearQueryFor(month: number, year: number | undefined): string {
  if (!year || year === upcomingYearForMonth(month)) return "";
  return `&year=${year}`;
}

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
