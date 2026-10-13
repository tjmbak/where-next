/**
 * Batch research runner.
 *
 * Iterates every (destination, activeMonth) pair, calls refreshEvents,
 * saves the draft, and atomically approves it. Skips pairs already approved
 * (so this script is safe to re-run after a partial run).
 *
 * Usage: npx tsx src/scripts/batch-research.ts
 *
 * Env:
 *   OPENAI_API_KEY   required
 *   WN_CONCURRENCY   optional, default 5
 *   WN_MAX_RETRIES   optional, default 2
 *   WN_YEAR          optional, default 2026
 *   WN_LIMIT         optional, max number of tasks to run (for smoke testing)
 *   WN_FROM / WN_TO  optional "YYYY-MM" window; plans every active month in it across years
 *   WN_ALSO_APPROVED_FROM optional "YYYY-MM"; also re-run already-approved months from here on
 *   WN_FRESH_SINCE   optional ISO timestamp; with WN_FORCE, skip months approved after it (resume)
 *   WN_FORCE_ALL=1   with WN_FORCE, skip the staleness tiers (3/14/45 days by distance) and include past months
 *   WN_MAX_SEARCHES / WN_REASONING_EFFORT / WN_SEARCH_CONTEXT  cost knobs (searches default to 12 general / 8 scene / 10 brands per pass; effort and context default to low)
 *   WN_PRICE_INPUT / WN_PRICE_CACHED / WN_PRICE_OUTPUT (per 1M tokens), WN_PRICE_SEARCH (per 1K)  for a $ estimate
 *   WN_FORCE=1       re-research months that are already approved; new results are merged
 *                    with the existing entry so previously confirmed, still-upcoming events stay
 */
import fs from "node:fs";
import path from "node:path";

// Load .env.local (Next.js does this automatically, but tsx scripts don't).
function loadDotEnv() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    const [, key, rawVal] = m;
    if (process.env[key]) continue;
    process.env[key] = rawVal.replace(/^['"]|['"]$/g, "");
  }
}
loadDotEnv();

import { monthsAhead, refreshEvents } from "../lib/research/refresh-events";
import { assertResearchCredits, formatUsage, getUsageTotals, type ResearchUsage } from "../lib/research/openai-research";
import { dedupeListings } from "../lib/research/event-identity";
import {
  approveDraft,
  saveDraft,
  listApproved,
  findApproved,
  mergeResearchedEvents,
  type DraftEnvelope
} from "../lib/research/draft-store";
import { DESTINATIONS } from "../data/music-travel";
import type { MonthNumber } from "../types/content";

type Task = { slug: string; month: MonthNumber; year: number };

const YEAR = Number(process.env.WN_YEAR ?? 2026);
const CONCURRENCY = Number(process.env.WN_CONCURRENCY ?? 5);
const MAX_RETRIES = Number(process.env.WN_MAX_RETRIES ?? 2);
const LIMIT = process.env.WN_LIMIT ? Number(process.env.WN_LIMIT) : Infinity;
const FORCE = process.env.WN_FORCE === "1";
const FRESH_SINCE = process.env.WN_FRESH_SINCE ?? null;
const WINDOW_FROM = parseYearMonth(process.env.WN_FROM);
const WINDOW_TO = parseYearMonth(process.env.WN_TO);
const ALSO_APPROVED_FROM = parseYearMonth(process.env.WN_ALSO_APPROVED_FROM);
// With WN_FORCE, already-approved months are only re-researched once they're
// stale for their distance: near months change weekly, far months rarely.
// WN_FORCE_ALL=1 ignores this and past months.
const FORCE_ALL = process.env.WN_FORCE_ALL === "1";
function staleAfterDays(ahead: number): number {
  if (ahead <= 2) return 3;
  if (ahead <= 5) return 14;
  return 45;
}

function parseYearMonth(raw: string | undefined): number | null {
  const m = raw ? /^(\d{4})-(\d{2})$/.exec(raw.trim()) : null;
  return m ? Number(m[1]) * 12 + Number(m[2]) - 1 : null;
}
// Marquee-first: only research each city's signature (peak) months. Great for
// seeding a fresh year — confirms every city's headline season before the long
// tail. Falls back to the first active month if a city has no peak months.
const PEAK_ONLY = process.env.WN_PEAK_ONLY === "1";
// Optional comma-separated allowlist of slugs (e.g. WN_ONLY_SLUGS=ibiza,tulum).
const ONLY_SLUGS = (process.env.WN_ONLY_SLUGS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Mutex chain so all approved-events.json writes are serialized.
let approveChain: Promise<unknown> = Promise.resolve();
function approveSerialized(envelope: DraftEnvelope): Promise<void> {
  approveChain = approveChain.then(() => approveDraft(envelope));
  return approveChain.then(() => undefined);
}

function planTasks(): Task[] {
  const approvedList = listApproved();
  const approved = new Set(approvedList.map((a) => `${a.slug}:${a.month}:${a.year}`));
  const freshlyApproved = new Set(
    FRESH_SINCE
      ? approvedList.filter((a) => a.approvedAt >= FRESH_SINCE).map((a) => `${a.slug}:${a.month}:${a.year}`)
      : []
  );
  if (FORCE && !FORCE_ALL) {
    for (const a of approvedList) {
      const ahead = monthsAhead(a.year, a.month);
      const ageDays = (Date.now() - Date.parse(a.approvedAt)) / 86_400_000;
      if (ahead < 0 || ageDays < staleAfterDays(ahead)) freshlyApproved.add(`${a.slug}:${a.month}:${a.year}`);
    }
  }
  const allow = ONLY_SLUGS.length > 0 ? new Set(ONLY_SLUGS) : null;
  const tasks: Task[] = [];
  const seen = new Set<string>();
  const push = (slug: string, month: MonthNumber, year: number) => {
    const key = `${slug}:${month}:${year}`;
    if (seen.has(key)) return;
    if (!FORCE && approved.has(key)) return;
    if (freshlyApproved.has(key)) return;
    seen.add(key);
    tasks.push({ slug, month, year });
  };

  if (WINDOW_FROM !== null && WINDOW_TO !== null) {
    for (let idx = WINDOW_FROM; idx <= WINDOW_TO; idx++) {
      const year = Math.floor(idx / 12);
      const month = ((idx % 12) + 1) as MonthNumber;
      for (const d of DESTINATIONS) {
        if (allow && !allow.has(d.slug)) continue;
        if (d.activeMonths.includes(month)) push(d.slug, month, year);
      }
    }
    if (ALSO_APPROVED_FROM !== null) {
      for (const a of approvedList) {
        if (allow && !allow.has(a.slug)) continue;
        if (a.year * 12 + a.month - 1 >= ALSO_APPROVED_FROM) push(a.slug, a.month, a.year);
      }
    }
  } else {
    for (const d of DESTINATIONS) {
      if (allow && !allow.has(d.slug)) continue;
      const months = PEAK_ONLY
        ? (d.peakMonths.length > 0 ? d.peakMonths : d.activeMonths.slice(0, 1))
        : d.activeMonths;
      for (const m of months) push(d.slug, m, YEAR);
    }
  }
  return tasks.slice(0, Math.min(LIMIT, tasks.length));
}

function mergeWithApproved(envelope: DraftEnvelope): { envelope: DraftEnvelope; kept: number } {
  const previous = findApproved(envelope.slug, envelope.year, envelope.month);
  if (!previous) return { envelope, kept: 0 };
  const city = DESTINATIONS.find((d) => d.slug === envelope.slug)?.city ?? envelope.slug;
  const merged = mergeResearchedEvents(envelope.data.events, previous.data.events, city);
  const { events } = dedupeListings(merged.events, city);
  return { envelope: { ...envelope, data: { ...envelope.data, events } }, kept: merged.kept };
}

const RAW_DIR = path.join(process.cwd(), ".research-raw");

function saveRawPasses(task: Task, passes: unknown) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const file = path.join(RAW_DIR, `${task.slug}-${task.year}-${String(task.month).padStart(2, "0")}.json`);
  fs.writeFileSync(file, JSON.stringify({ savedAt: new Date().toISOString(), passes }, null, 2));
}

function logUsage(task: Task, usage: ResearchUsage) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.appendFileSync(path.join(RAW_DIR, "usage.jsonl"), JSON.stringify({ at: new Date().toISOString(), ...task, ...usage }) + "\n");
}

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message || "";
  return (
    m.includes("429") ||
    m.includes("rate") ||
    m.includes("timeout") ||
    m.includes("aborted") ||
    m.includes("ECONNRESET") ||
    m.includes("ETIMEDOUT") ||
    m.includes("invalid JSON")
  );
}

function backoffMs(attempt: number): number {
  const base = 4000 * 2 ** attempt;
  const jitter = Math.floor(Math.random() * 2000);
  return base + jitter;
}

let outOfCredits = false;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type Outcome =
  | { kind: "ok"; task: Task; eventCount: number; searchCalls: number; kept: number; usage: ResearchUsage }
  | { kind: "fail"; task: Task; error: string };

async function runOne(task: Task): Promise<Outcome> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await refreshEvents({
        slug: task.slug,
        month: task.month,
        year: task.year
      });
      const draft: DraftEnvelope = {
        slug: task.slug,
        month: task.month,
        year: task.year,
        generatedAt: result.generatedAt,
        responseId: result.responseId,
        searchCalls: result.searchCalls,
        citations: result.citations,
        data: result.data
      };
      saveRawPasses(task, result.passes);
      logUsage(task, result.usage);
      const { envelope, kept } = mergeWithApproved(draft);
      saveDraft(envelope);
      await approveSerialized(envelope);
      return {
        kind: "ok",
        task,
        eventCount: envelope.data.events.length,
        searchCalls: envelope.searchCalls,
        kept,
        usage: result.usage
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/no credits|insufficient_quota|billing/i.test(msg)) {
        outOfCredits = true;
        return { kind: "fail", task, error: msg };
      }
      if (attempt < MAX_RETRIES && isTransientError(err)) {
        const wait = backoffMs(attempt);
        process.stderr.write(
          `   retry ${attempt + 1}/${MAX_RETRIES} for ${task.slug} ${task.year}-${task.month} after ${wait}ms (${msg.slice(0, 80)})\n`
        );
        await sleep(wait);
        continue;
      }
      return { kind: "fail", task, error: msg };
    }
  }
  return { kind: "fail", task, error: "exhausted retries" };
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set");
    process.exit(1);
  }

  const tasks = planTasks();
  console.log(
    `[plan] ${WINDOW_FROM !== null ? `window=${process.env.WN_FROM}..${process.env.WN_TO}` : `year=${YEAR}`} concurrency=${CONCURRENCY} retries=${MAX_RETRIES}${FORCE ? " force+merge" : ""}` +
      `${PEAK_ONLY ? " peak-only" : ""}${ONLY_SLUGS.length ? ` slugs=${ONLY_SLUGS.join(",")}` : ""}`
  );
  console.log(`[plan] tasks remaining: ${tasks.length}`);
  if (process.env.WN_DRY === "1") {
    const byYear = tasks.reduce<Record<number, number>>((acc, t) => ({ ...acc, [t.year]: (acc[t.year] ?? 0) + 1 }), {});
    console.log("[plan] dry run, by year:", byYear);
    return;
  }
  if (tasks.length === 0) {
    console.log("[plan] nothing to do — every active month is already approved.");
    return;
  }
  await assertResearchCredits();

  const startedAt = Date.now();
  let completed = 0;
  const successes: Outcome[] = [];
  const failures: Outcome[] = [];
  let cursor = 0;

  async function worker(workerId: number) {
    while (true) {
      if (outOfCredits) return;
      const idx = cursor++;
      if (idx >= tasks.length) return;
      const task = tasks[idx];
      const startMs = Date.now();
      const outcome = await runOne(task);
      completed++;
      const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
      if (outcome.kind === "ok") {
        successes.push(outcome);
        console.log(
          `[${completed.toString().padStart(3)}/${tasks.length}] w${workerId} OK  ${task.slug}-${task.year}-${task.month} events=${outcome.eventCount}${outcome.kind === "ok" && outcome.kept ? ` (kept ${outcome.kept})` : ""} search=${outcome.searchCalls} in=${Math.round(outcome.usage.inputTokens / 1000)}k out=${Math.round(outcome.usage.outputTokens / 1000)}k ${elapsed}s`
        );
      } else {
        failures.push(outcome);
        console.log(
          `[${completed.toString().padStart(3)}/${tasks.length}] w${workerId} FAIL ${task.slug}-${task.year}-${task.month} ${elapsed}s -- ${outcome.error.slice(0, 140)}`
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, (_, i) => worker(i + 1))
  );

  const totalSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  const totalSearchCalls = successes.reduce(
    (acc, o) => acc + (o.kind === "ok" ? o.searchCalls : 0),
    0
  );
  const totalEvents = successes.reduce(
    (acc, o) => acc + (o.kind === "ok" ? o.eventCount : 0),
    0
  );

  console.log("");
  if (outOfCredits) console.log("!!! stopped early: OpenAI account is out of credits — top up and re-run the same command");
  console.log("=== batch-research summary ===");
  console.log(`elapsed:        ${totalSec}s`);
  console.log(`succeeded:      ${successes.length}`);
  console.log(`failed:         ${failures.length}`);
  console.log(`events written: ${totalEvents}`);
  console.log(`search calls:   ${totalSearchCalls}`);
  console.log(`spend:          ${formatUsage(getUsageTotals())}`);
  if (failures.length > 0) {
    console.log("\nfailures:");
    for (const f of failures) {
      if (f.kind === "fail") {
        console.log(`  ${f.task.slug}-${f.task.year}-${f.task.month}: ${f.error.slice(0, 200)}`);
      }
    }
  }
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
