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

import { refreshEvents } from "../lib/research/refresh-events";
import {
  approveDraft,
  saveDraft,
  listApproved,
  type DraftEnvelope
} from "../lib/research/draft-store";
import { DESTINATIONS } from "../data/music-travel";
import type { MonthNumber } from "../types/content";

type Task = { slug: string; month: MonthNumber };

const YEAR = Number(process.env.WN_YEAR ?? 2026);
const CONCURRENCY = Number(process.env.WN_CONCURRENCY ?? 5);
const MAX_RETRIES = Number(process.env.WN_MAX_RETRIES ?? 2);
const LIMIT = process.env.WN_LIMIT ? Number(process.env.WN_LIMIT) : Infinity;

// Mutex chain so all approved-events.json writes are serialized.
let approveChain: Promise<unknown> = Promise.resolve();
function approveSerialized(envelope: DraftEnvelope): Promise<void> {
  approveChain = approveChain.then(() => approveDraft(envelope));
  return approveChain.then(() => undefined);
}

function planTasks(): Task[] {
  const approved = new Set(listApproved().map((a) => `${a.slug}:${a.month}:${a.year}`));
  const tasks: Task[] = [];
  for (const d of DESTINATIONS) {
    for (const m of d.activeMonths) {
      const key = `${d.slug}:${m}:${YEAR}`;
      if (!approved.has(key)) tasks.push({ slug: d.slug, month: m });
    }
  }
  return tasks.slice(0, Math.min(LIMIT, tasks.length));
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

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type Outcome =
  | { kind: "ok"; task: Task; eventCount: number; searchCalls: number }
  | { kind: "fail"; task: Task; error: string };

async function runOne(task: Task): Promise<Outcome> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await refreshEvents({
        slug: task.slug,
        month: task.month,
        year: YEAR
      });
      const envelope: DraftEnvelope = {
        slug: task.slug,
        month: task.month,
        year: YEAR,
        generatedAt: result.generatedAt,
        responseId: result.responseId,
        searchCalls: result.searchCalls,
        citations: result.citations,
        data: result.data
      };
      saveDraft(envelope);
      await approveSerialized(envelope);
      return {
        kind: "ok",
        task,
        eventCount: envelope.data.events.length,
        searchCalls: envelope.searchCalls
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (attempt < MAX_RETRIES && isTransientError(err)) {
        const wait = backoffMs(attempt);
        process.stderr.write(
          `   retry ${attempt + 1}/${MAX_RETRIES} for ${task.slug} m=${task.month} after ${wait}ms (${msg.slice(0, 80)})\n`
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
  console.log(`[plan] year=${YEAR} concurrency=${CONCURRENCY} retries=${MAX_RETRIES}`);
  console.log(`[plan] tasks remaining: ${tasks.length}`);
  if (tasks.length === 0) {
    console.log("[plan] nothing to do — every active month is already approved.");
    return;
  }

  const startedAt = Date.now();
  let completed = 0;
  const successes: Outcome[] = [];
  const failures: Outcome[] = [];
  let cursor = 0;

  async function worker(workerId: number) {
    while (true) {
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
          `[${completed.toString().padStart(3)}/${tasks.length}] w${workerId} OK  ${task.slug}-m${task.month} events=${outcome.eventCount} search=${outcome.searchCalls} ${elapsed}s`
        );
      } else {
        failures.push(outcome);
        console.log(
          `[${completed.toString().padStart(3)}/${tasks.length}] w${workerId} FAIL ${task.slug}-m${task.month} ${elapsed}s -- ${outcome.error.slice(0, 140)}`
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
  console.log("=== batch-research summary ===");
  console.log(`elapsed:        ${totalSec}s`);
  console.log(`succeeded:      ${successes.length}`);
  console.log(`failed:         ${failures.length}`);
  console.log(`events written: ${totalEvents}`);
  console.log(`search calls:   ${totalSearchCalls}`);
  if (failures.length > 0) {
    console.log("\nfailures:");
    for (const f of failures) {
      if (f.kind === "fail") {
        console.log(`  ${f.task.slug}-m${f.task.month}: ${f.error.slice(0, 200)}`);
      }
    }
  }
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
