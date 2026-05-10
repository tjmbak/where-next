import fs from "node:fs";
import path from "node:path";
import {
  researchedEventsResponseSchema,
  type ResearchedEventsResponse
} from "./schemas";
import type { CitationRef } from "./openai-research";
import type { MonthNumber } from "@/types/content";

const PROJECT_ROOT = process.cwd();
const GENERATED_DIR = path.join(PROJECT_ROOT, "src", "data", "generated");
const DRAFTS_DIR = path.join(GENERATED_DIR, "drafts", "events");
const APPROVED_FILE = path.join(GENERATED_DIR, "approved-events.json");
const APPROVED_SLIM_FILE = path.join(GENERATED_DIR, "approved-events.slim.json");

export type DraftEnvelope = {
  slug: string;
  month: MonthNumber;
  year: number;
  generatedAt: string;
  responseId: string;
  searchCalls: number;
  citations: CitationRef[];
  data: ResearchedEventsResponse;
};

export type ApprovedEntry = {
  slug: string;
  month: MonthNumber;
  year: number;
  approvedAt: string;
  sourceResponseId: string;
  data: ResearchedEventsResponse;
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function draftPath(slug: string, year: number, month: MonthNumber): string {
  const mm = String(month).padStart(2, "0");
  return path.join(DRAFTS_DIR, `${slug}-${year}-${mm}.json`);
}

export function saveDraft(envelope: DraftEnvelope): string {
  ensureDir(DRAFTS_DIR);
  const file = draftPath(envelope.slug, envelope.year, envelope.month);
  fs.writeFileSync(file, JSON.stringify(envelope, null, 2) + "\n", "utf8");
  return file;
}

export function loadDraft(
  slug: string,
  year: number,
  month: MonthNumber
): DraftEnvelope | null {
  const file = draftPath(slug, year, month);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as DraftEnvelope;
    researchedEventsResponseSchema.parse(raw.data);
    return raw;
  } catch (err) {
    console.warn(`[draft-store] failed to load draft ${file}:`, err);
    return null;
  }
}

export function deleteDraft(slug: string, year: number, month: MonthNumber): boolean {
  const file = draftPath(slug, year, month);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  return true;
}

export type DraftSummary = {
  slug: string;
  month: MonthNumber;
  year: number;
  generatedAt: string;
  eventsCount: number;
  searchCalls: number;
};

export function listDraftSummaries(): DraftSummary[] {
  if (!fs.existsSync(DRAFTS_DIR)) return [];
  const files = fs
    .readdirSync(DRAFTS_DIR)
    .filter((f) => f.endsWith(".json"));
  const out: DraftSummary[] = [];
  for (const file of files) {
    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(DRAFTS_DIR, file), "utf8")
      ) as DraftEnvelope;
      out.push({
        slug: raw.slug,
        month: raw.month,
        year: raw.year,
        generatedAt: raw.generatedAt,
        eventsCount: raw.data?.events?.length ?? 0,
        searchCalls: raw.searchCalls
      });
    } catch (err) {
      console.warn(`[draft-store] skipping bad draft ${file}:`, err);
    }
  }
  return out.sort((a, b) =>
    a.slug === b.slug
      ? a.year === b.year
        ? a.month - b.month
        : a.year - b.year
      : a.slug.localeCompare(b.slug)
  );
}

function readApproved(): ApprovedEntry[] {
  if (!fs.existsSync(APPROVED_FILE)) return [];
  try {
    const raw = fs.readFileSync(APPROVED_FILE, "utf8").trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ApprovedEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("[draft-store] failed to read approved-events.json:", err);
    return [];
  }
}

function writeApproved(entries: ApprovedEntry[]) {
  ensureDir(GENERATED_DIR);
  fs.writeFileSync(
    APPROVED_FILE,
    JSON.stringify(entries, null, 2) + "\n",
    "utf8"
  );
  // Mirror a slim version that the public bundle imports. Drop admin-only
  // metadata (notes, approvedAt, sourceResponseId, year, redundant nesting)
  // so the client bundle stays ~600 KB lighter.
  const slim = entries.map((e) => ({
    slug: e.slug,
    month: e.month,
    events: (e.data.events ?? []).map((ev) => ({
      id: ev.id,
      title: ev.title,
      type: ev.type,
      startDate: ev.startDate,
      endDate: ev.endDate,
      importance: ev.importance,
      venueId: ev.venueId,
      sourceUrl: ev.sourceUrl,
      ticketUrl: ev.ticketUrl,
      summary: ev.summary,
      genres: ev.genres
    }))
  }));
  fs.writeFileSync(APPROVED_SLIM_FILE, JSON.stringify(slim) + "\n", "utf8");
}

export function listApproved(): ApprovedEntry[] {
  return readApproved();
}

export function findApproved(
  slug: string,
  year: number,
  month: MonthNumber
): ApprovedEntry | null {
  const all = readApproved();
  return (
    all.find((e) => e.slug === slug && e.year === year && e.month === month) ??
    null
  );
}

export function approveDraft(envelope: DraftEnvelope): ApprovedEntry {
  const all = readApproved();
  const filtered = all.filter(
    (e) =>
      !(e.slug === envelope.slug && e.year === envelope.year && e.month === envelope.month)
  );
  const entry: ApprovedEntry = {
    slug: envelope.slug,
    month: envelope.month,
    year: envelope.year,
    approvedAt: new Date().toISOString(),
    sourceResponseId: envelope.responseId,
    data: envelope.data
  };
  filtered.push(entry);
  filtered.sort((a, b) =>
    a.slug === b.slug
      ? a.year === b.year
        ? a.month - b.month
        : a.year - b.year
      : a.slug.localeCompare(b.slug)
  );
  writeApproved(filtered);
  return entry;
}

export function rejectApproved(
  slug: string,
  year: number,
  month: MonthNumber
): boolean {
  const all = readApproved();
  const filtered = all.filter(
    (e) => !(e.slug === slug && e.year === year && e.month === month)
  );
  if (filtered.length === all.length) return false;
  writeApproved(filtered);
  return true;
}
