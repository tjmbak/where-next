/**
 * Dry-run the research pipeline for a single (city, month) WITHOUT writing
 * anything to the approved store. Prints the merged, date-sorted event list
 * so you can eyeball coverage before committing a real re-run.
 *
 * Usage: npx tsx src/scripts/dry-run-city.ts <slug> <month> [year]
 * Example: npx tsx src/scripts/dry-run-city.ts paris 6
 *
 * Env: OPENAI_API_KEY required. WN_SCENE_PASS=0 disables the scene pass.
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
import type { MonthNumber } from "../types/content";

async function main() {
  const [slug, monthArg, yearArg] = process.argv.slice(2);
  if (!slug || !monthArg) {
    console.error("Usage: npx tsx src/scripts/dry-run-city.ts <slug> <month> [year]");
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set");
    process.exit(1);
  }
  const month = Number(monthArg) as MonthNumber;
  const year = yearArg ? Number(yearArg) : 2026;
  const scenePass = process.env.WN_SCENE_PASS !== "0";

  console.log(`[dry-run] ${slug} month=${month} year=${year} scenePass=${scenePass}\n`);
  const startedAt = Date.now();
  const result = await refreshEvents({ slug, month, year, scenePass });
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  const events = result.data.events
    .slice()
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  console.log(`=== ${result.destination.city} — ${events.length} events (${result.searchCalls} searches, ${elapsed}s) ===`);
  for (const e of events) {
    const span = e.endDate && e.endDate !== e.startDate ? `${e.startDate}→${e.endDate}` : e.startDate;
    console.log(
      `  ${span}  [${String(e.importance).padStart(3)}] ${e.type.padEnd(10)} ${e.title}`
    );
    console.log(`        ${e.genres.join("/")} · ${e.sourceUrl}`);
  }
  if (result.data.notes) console.log(`\nnotes: ${result.data.notes}`);
  console.log("\n[dry-run] nothing was written. Review above, then run a real re-run if it looks good.");
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
