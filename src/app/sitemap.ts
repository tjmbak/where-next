import type { MetadataRoute } from "next";
import { GENRE_LABELS, MONTHS, REGIONS, getMonthLabel } from "@/data/taxonomy";
import { DESTINATIONS } from "@/data/music-travel";
import { siteUrl } from "@/lib/structured-data";
import type { Genre, MonthNumber, Region } from "@/types/content";

const BASE = siteUrl();
const SUPPORTED_YEARS = [2025, 2026, 2027];

function monthSlug(month: MonthNumber) {
  return getMonthLabel(month).toLowerCase();
}

function regionSlug(region: Region) {
  return region.toLowerCase().replace(/ /g, "-");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/methodology`, lastModified: now, changeFrequency: "monthly", priority: 0.4 }
  ];

  for (const destination of DESTINATIONS) {
    entries.push({
      url: `${BASE}/destinations/${destination.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9
    });
  }

  for (const month of MONTHS) {
    entries.push({
      url: `${BASE}/where-to-go/${monthSlug(month.value)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8
    });
    for (const genre of Object.keys(GENRE_LABELS) as Genre[]) {
      entries.push({
        url: `${BASE}/where-to-go/${monthSlug(month.value)}/genre/${genre}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7
      });
    }
    for (const region of REGIONS) {
      entries.push({
        url: `${BASE}/where-to-go/${monthSlug(month.value)}/region/${regionSlug(region)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.7
      });
    }
  }

  for (const year of SUPPORTED_YEARS) {
    for (const month of MONTHS) {
      entries.push({
        url: `${BASE}/events/${year}/${monthSlug(month.value)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6
      });
    }
  }

  return entries;
}
