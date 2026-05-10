/**
 * Re-runs research for a hand-picked list of (slug, month) pairs that
 * came back from the original batch with 0 events. We pass an extra
 * permissiveness hint to the prompt so the model accepts evening
 * programming, club shows, and shoulder-month residencies — not only
 * peak festivals.
 *
 * Usage: npx tsx src/scripts/rerun-empty.ts
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

import { refreshEvents } from "../lib/research/refresh-events";
import { approveDraft, saveDraft, type DraftEnvelope } from "../lib/research/draft-store";
import type { MonthNumber } from "../types/content";

type Task = { slug: string; month: MonthNumber; hint: string };

const TASKS: Task[] = [
  {
    slug: "aspen",
    month: 12,
    hint: "December in Aspen is anchored by Christmas–NYE holiday week. Include arena/club concerts at Belly Up Aspen, Snowmass après-ski programming, and any announced NYE shows or DJ sets at the major hotels."
  },
  {
    slug: "courchevel",
    month: 12,
    hint: "December in Courchevel 1850 is anchored by Christmas–NYE après-ski programming at La Folie Douce, Le Cap Horn, and L'Equipe. Include scheduled DJ sets, Sound Suit / Folie Douce shows, and any NYE concerts."
  },
  {
    slug: "ischgl",
    month: 12,
    hint: "December in Ischgl is the start of the ski season. Include the Top of the Mountain Opening Concert (always end of November / start of December) and any announced après-ski programming at Trofana Alm, Niki's Stadl, Pacha Ischgl."
  },
  {
    slug: "verbier",
    month: 12,
    hint: "December in Verbier is anchored by Polaris Festival (mid-month) and Christmas–NYE après-ski. Include Farinet Lounge & Casbah programming, Le Rouge, and any announced NYE shows."
  },
  {
    slug: "tbilisi",
    month: 8,
    hint: "Mid-summer Tbilisi club programming runs at Bassiani, KHIDI, Mtkvarze, Left Bank, and TES. Include any announced August parties, open-air programming, and the city's electronic festival circuit (eg Hots Festival)."
  }
];

async function runOne(task: Task) {
  const result = await refreshEvents({
    slug: task.slug,
    month: task.month,
    year: 2026,
    extraGuidance: task.hint
  });
  const envelope: DraftEnvelope = {
    slug: task.slug,
    month: task.month,
    year: 2026,
    generatedAt: result.generatedAt,
    responseId: result.responseId,
    searchCalls: result.searchCalls,
    citations: result.citations,
    data: result.data
  };
  saveDraft(envelope);
  approveDraft(envelope);
  return result.data.events.length;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY missing");
    process.exit(1);
  }

  for (const task of TASKS) {
    const startedAt = Date.now();
    try {
      const n = await runOne(task);
      const ms = Date.now() - startedAt;
      console.log(`[OK ] ${task.slug}-m${task.month}  events=${n}  ${(ms / 1000).toFixed(1)}s`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[ERR] ${task.slug}-m${task.month}  ${msg.slice(0, 200)}`);
    }
  }
}

void main();
