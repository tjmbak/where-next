/**
 * Additive scene-augment runner.
 *
 * For each target (city, month) that ALREADY has an approved entry, this runs
 * ONLY the scene-specific research pass, validates every newly-discovered
 * source link, and merges the new rows into the existing entry WITHOUT
 * dropping anything that's already there. Existing events/links are preserved;
 * we only top up the underground / diaspora / genre layer that the original
 * single-pass research crowded out.
 *
 * Usage:
 *   npx tsx src/scripts/augment-scenes.ts --pilot          # ~10 high-density entries
 *   npx tsx src/scripts/augment-scenes.ts --slug=paris     # all approved months for paris
 *   npx tsx src/scripts/augment-scenes.ts --month=6        # every approved city in month 6
 *   npx tsx src/scripts/augment-scenes.ts                  # everything (all approved entries)
 *
 * Env:
 *   OPENAI_API_KEY  required
 *   WN_CONCURRENCY  optional, default 5
 *   WN_MAX_RETRIES  optional, default 2
 *   WN_LIMIT        optional, cap number of targets
 *   WN_DRY          optional, "1" = don't write, just print the proposed adds
 *   WN_FOCUS        optional, "brands" = search touring party brands / headline DJs by name
 *   WN_CAP          optional, max events per city-month after merging, default 20
 */
import fs from "node:fs";
import path from "node:path";

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

import { researchScenePass, augmentEvents } from "../lib/research/refresh-events";
import { assertResearchCredits, formatUsage, getUsageTotals } from "../lib/research/openai-research";
import { isSearchResultsUrl } from "../lib/research/event-identity";
import { DESTINATIONS } from "../data/music-travel";
import {
  approveDraft,
  findApproved,
  listApproved,
  saveDraft,
  type DraftEnvelope
} from "../lib/research/draft-store";
import type { ResearchedEvent } from "../lib/research/schemas";
import type { MonthNumber } from "../types/content";

const CONCURRENCY = Number(process.env.WN_CONCURRENCY ?? 5);
const MAX_RETRIES = Number(process.env.WN_MAX_RETRIES ?? 2);
const LIMIT = process.env.WN_LIMIT ? Number(process.env.WN_LIMIT) : Infinity;
const DRY = process.env.WN_DRY === "1";
const FOCUS = process.env.WN_FOCUS === "brands" ? "brands" : "scene";
const CAP = Number(process.env.WN_CAP ?? 20);

// Never research the past. Default to the current calendar month/year unless
// overridden. --year picks the corpus year; WN_MIN_MONTH overrides the floor.
const NOW = new Date();
const CUR_YEAR = NOW.getFullYear();
const CUR_MONTH = (NOW.getMonth() + 1) as MonthNumber;

const PILOT_SLUGS = [
  "paris", "london", "berlin", "barcelona", "new-york",
  "amsterdam", "lagos", "accra", "ibiza", "tokyo"
];

type Target = { slug: string; month: MonthNumber };

const cityOf = (slug: string) => DESTINATIONS.find((d) => d.slug === slug)?.city ?? slug;

function parseArgs(): { slug?: string; month?: MonthNumber; pilot: boolean; year: number } {
  let slug: string | undefined;
  let month: MonthNumber | undefined;
  let pilot = false;
  let year = CUR_YEAR;
  for (const arg of process.argv.slice(2)) {
    if (arg === "--pilot") pilot = true;
    else if (arg.startsWith("--slug=")) slug = arg.slice(7);
    else if (arg.startsWith("--month=")) month = Number(arg.slice(8)) as MonthNumber;
    else if (arg.startsWith("--year=")) year = Number(arg.slice(7));
  }
  return { slug, month, pilot, year };
}

const { year: YEAR } = parseArgs();

/** The earliest month we're willing to research for YEAR (no past months). */
function minMonthForYear(): MonthNumber {
  if (process.env.WN_MIN_MONTH) return Number(process.env.WN_MIN_MONTH) as MonthNumber;
  if (YEAR > CUR_YEAR) return 1;
  if (YEAR < CUR_YEAR) return 13 as MonthNumber; // entirely past → nothing
  return CUR_MONTH; // current year → current month onward
}

function planTargets(): Target[] {
  const floor = minMonthForYear();
  const approved = listApproved().filter(
    (e) => e.year === YEAR && e.month >= floor
  );
  const { slug, month, pilot } = parseArgs();

  let targets: Target[];
  if (pilot) {
    // One entry per priority slug: its fullest FUTURE approved month.
    targets = [];
    for (const s of PILOT_SLUGS) {
      const entries = approved.filter((e) => e.slug === s);
      if (entries.length === 0) continue;
      const fullest = entries
        .slice()
        .sort((a, b) => b.data.events.length - a.data.events.length)[0];
      targets.push({ slug: s, month: fullest.month });
    }
  } else {
    targets = approved
      .filter((e) => (slug ? e.slug === slug : true) && (month ? e.month === month : true))
      .map((e) => ({ slug: e.slug, month: e.month }));
  }

  return targets.slice(0, Math.min(LIMIT, targets.length));
}

/**
 * Is this URL real and reachable? We deliberately tolerate bot-blocking
 * statuses (401/403/429) because platforms like RA / Ticketmaster return them
 * to scripted requests even though the page is live. We only reject genuine
 * dead links (DNS/connection failure, 404/410) or redirects to a search page.
 */
async function isLinkOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WhereNextBot/1.0)" },
      signal: AbortSignal.timeout(15_000)
    });
    if (isSearchResultsUrl(url) || isSearchResultsUrl(res.url)) return false;
    if (res.status === 404 || res.status === 410) return false;
    return true;
  } catch {
    return false;
  }
}

async function validateAdds(added: ResearchedEvent[]): Promise<{ kept: ResearchedEvent[]; dropped: ResearchedEvent[] }> {
  const kept: ResearchedEvent[] = [];
  const dropped: ResearchedEvent[] = [];
  await Promise.all(
    added.map(async (ev) => {
      const ok = await isLinkOk(ev.sourceUrl);
      (ok ? kept : dropped).push(ev);
    })
  );
  return { kept, dropped };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
function backoffMs(attempt: number) {
  return 4000 * 2 ** attempt + Math.floor(Math.random() * 2000);
}
function isTransient(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const m = err.message || "";
  return /429|rate|timeout|aborted|ECONNRESET|ETIMEDOUT|invalid JSON/.test(m);
}

// Serialize all approve writes (they read+write the shared json files).
let approveChain: Promise<unknown> = Promise.resolve();
function approveSerialized(envelope: DraftEnvelope): Promise<void> {
  approveChain = approveChain.then(() => approveDraft(envelope));
  return approveChain.then(() => undefined);
}

type Outcome =
  | { kind: "ok"; target: Target; before: number; after: number; added: ResearchedEvent[]; droppedLinks: number; searchCalls: number }
  | { kind: "skip"; target: Target; reason: string }
  | { kind: "fail"; target: Target; error: string };

let outOfCredits = false;

async function runOne(target: Target): Promise<Outcome> {
  const existing = findApproved(target.slug, YEAR, target.month);
  if (!existing) return { kind: "skip", target, reason: "no approved entry" };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const scene = await researchScenePass({ slug: target.slug, month: target.month, year: YEAR, focus: FOCUS });
      // First-pass merge to see which rows are genuinely new.
      const { added } = augmentEvents(existing.data.events, scene.events, CAP, cityOf(target.slug));
      if (added.length === 0) {
        return { kind: "skip", target, reason: "no new scene events" };
      }
      // Validate links on the proposed additions; drop dead ones.
      const { kept, dropped } = await validateAdds(added);
      if (kept.length === 0) {
        return { kind: "skip", target, reason: `all ${added.length} adds had bad links` };
      }
      const merged = augmentEvents(existing.data.events, kept, CAP, cityOf(target.slug));

      if (!DRY) {
        const envelope: DraftEnvelope = {
          slug: target.slug,
          month: target.month,
          year: YEAR,
          generatedAt: scene.generatedAt,
          responseId: `augment:${scene.responseId}`,
          searchCalls: scene.searchCalls,
          citations: scene.citations,
          data: {
            destinationSlug: target.slug,
            month: target.month,
            year: YEAR,
            notes: existing.data.notes ?? scene.notes,
            events: merged.events
          }
        };
        saveDraft(envelope);
        await approveSerialized(envelope);
      }

      return {
        kind: "ok",
        target,
        before: existing.data.events.length,
        after: existing.data.events.length + merged.added.length,
        added: merged.added,
        droppedLinks: dropped.length,
        searchCalls: scene.searchCalls
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/no credits|insufficient_quota|billing/i.test(msg)) {
        outOfCredits = true;
        return { kind: "fail", target, error: msg };
      }
      if (attempt < MAX_RETRIES && isTransient(err)) {
        await sleep(backoffMs(attempt));
        continue;
      }
      return { kind: "fail", target, error: err instanceof Error ? err.message : String(err) };
    }
  }
  return { kind: "fail", target, error: "exhausted retries" };
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set");
    process.exit(1);
  }
  const targets = planTargets();
  console.log(
    `[augment] ${DRY ? "DRY-RUN " : ""}focus=${FOCUS} cap=${CAP} year=${YEAR} from-month=${minMonthForYear()} targets=${targets.length} concurrency=${CONCURRENCY}`
  );
  if (targets.length === 0) {
    console.log("[augment] nothing to do.");
    return;
  }
  await assertResearchCredits();

  const startedAt = Date.now();
  let completed = 0;
  let cursor = 0;
  let totalAdded = 0;
  let totalDroppedLinks = 0;
  const oks: Outcome[] = [];
  const skips: Outcome[] = [];
  const fails: Outcome[] = [];

  async function worker(id: number) {
    while (true) {
      if (outOfCredits) return;
      const idx = cursor++;
      if (idx >= targets.length) return;
      const target = targets[idx];
      const t0 = Date.now();
      const outcome = await runOne(target);
      completed++;
      const secs = ((Date.now() - t0) / 1000).toFixed(0);
      const tag = `[${String(completed).padStart(3)}/${targets.length}] w${id}`;
      if (outcome.kind === "ok") {
        oks.push(outcome);
        totalAdded += outcome.added.length;
        totalDroppedLinks += outcome.droppedLinks;
        console.log(
          `${tag} OK   ${target.slug}-m${target.month}  ${outcome.before}→${outcome.after} (+${outcome.added.length}${outcome.droppedLinks ? `, ${outcome.droppedLinks} bad links dropped` : ""}) ${secs}s`
        );
        for (const ev of outcome.added) {
          console.log(`        + [${ev.importance}] ${ev.startDate} ${ev.title} (${ev.genres.join("/")})`);
        }
      } else if (outcome.kind === "skip") {
        skips.push(outcome);
        console.log(`${tag} SKIP ${target.slug}-m${target.month}  (${outcome.reason}) ${secs}s`);
      } else {
        fails.push(outcome);
        console.log(`${tag} FAIL ${target.slug}-m${target.month}  ${outcome.error.slice(0, 120)} ${secs}s`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, targets.length) }, (_, i) => worker(i + 1))
  );

  const totalSec = ((Date.now() - startedAt) / 1000).toFixed(0);
  console.log("\n=== augment-scenes summary ===");
  console.log(`elapsed:           ${totalSec}s`);
  console.log(`augmented:         ${oks.length}`);
  console.log(`skipped:           ${skips.length}`);
  console.log(`failed:            ${fails.length}`);
  console.log(`events added:      ${totalAdded}`);
  console.log(`bad links dropped: ${totalDroppedLinks}`);
  console.log(`spend:             ${formatUsage(getUsageTotals())}`);
  if (DRY) console.log("\n(DRY-RUN — nothing was written.)");
  if (outOfCredits) console.log("\nStopped early: OpenAI account is out of credits. Top up and re-run; finished months are already saved.");
  if (fails.length > 0) {
    console.log("\nfailures:");
    for (const f of fails) if (f.kind === "fail") console.log(`  ${f.target.slug}-m${f.target.month}: ${f.error.slice(0, 160)}`);
  }
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
