/**
 * Offline audit of the approved events corpus. No API calls.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json src/scripts/audit-events.ts          # report only
 *   npx tsx --tsconfig tsconfig.json src/scripts/audit-events.ts --fix    # apply safe fixes
 *
 * Safe fixes: search-page links stripped (event dropped if it has no other
 * link), duplicate listings collapsed, end-before-start dates cleared, events
 * filed under the wrong month moved, implausible multi-year spans dropped.
 * Report-only: single-day "festival" labels and brand coverage gaps.
 */
import { listApproved, replaceApproved, type ApprovedEntry } from "../lib/research/draft-store";
import { dedupeListings, isSearchResultsUrl } from "../lib/research/event-identity";
import { TOURING_BRANDS } from "../lib/research/refresh-events";
import { DESTINATIONS } from "../data/music-travel";

const FIX = process.argv.includes("--fix");
const TODAY = new Date().toISOString().slice(0, 10);
const MAX_SPAN_DAYS = 270;
const PARTY_BRANDS = /\b(circoloco|afterlife|keinemusik|elrow|ants|music on|defected|glitterbox|solid grooves|cercle|boiler room|drumcode|hyte|cityfox|teksupport|everyday people|pacha|fabric|abode|paradise|amnesia|ushua[iï]a|h[iï] ibiza)\b/i;

type Ev = ApprovedEntry["data"]["events"][number];
const log: Record<string, string[]> = {};
const note = (kind: string, line: string) => (log[kind] ??= []).push(line);

const cityOf = (slug: string) => DESTINATIONS.find((d) => d.slug === slug)?.city ?? slug;
const monthBounds = (year: number, month: number) => {
  const mm = String(month).padStart(2, "0");
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return [`${year}-${mm}-01`, `${year}-${mm}-${last}`] as const;
};
const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;

const entries = listApproved();
const byKey = new Map(entries.map((e) => [`${e.slug}:${e.year}:${e.month}`, e]));
const moves: Array<{ ev: Ev; to: ApprovedEntry }> = [];
let total = 0;

for (const entry of entries) {
  const tag = (ev: Ev) => `${entry.slug} ${entry.year}-${String(entry.month).padStart(2, "0")} ${ev.startDate} ${ev.title.slice(0, 70)}`;
  const [first, last] = monthBounds(entry.year, entry.month);
  const kept: Ev[] = [];

  for (const original of entry.data.events) {
    total++;
    let ev = original;
    if (ev.endDate && ev.endDate < ev.startDate) {
      note("end-before-start (cleared)", `${tag(ev)} end=${ev.endDate}`);
      ev = { ...ev, endDate: null };
    }
    if (ev.endDate && days(ev.startDate, ev.endDate) > MAX_SPAN_DAYS) {
      note("implausible span (dropped)", `${tag(ev)} end=${ev.endDate}`);
      continue;
    }
    if (isSearchResultsUrl(ev.ticketUrl)) {
      note("search-page ticket link (removed)", `${tag(ev)} ${ev.ticketUrl}`);
      ev = { ...ev, ticketUrl: null };
    }
    if (isSearchResultsUrl(ev.sourceUrl)) {
      if (!ev.ticketUrl) {
        note("search-page source, no other link (dropped)", `${tag(ev)} ${ev.sourceUrl}`);
        continue;
      }
      note("search-page source (swapped for ticket link)", `${tag(ev)} ${ev.sourceUrl}`);
      ev = { ...ev, sourceUrl: ev.ticketUrl };
    }
    const end = ev.endDate ?? ev.startDate;
    if (end < first || ev.startDate > last) {
      const [y, m] = ev.startDate.split("-").map(Number);
      const home = byKey.get(`${entry.slug}:${y}:${m}`);
      const there = home?.data.events.some((o) => o.id === ev.id || (o.startDate === ev.startDate && o.title === ev.title));
      note("outside its month", `${tag(ev)} → ${home ? (there ? "already listed there (dropped)" : "moved") : "no entry for that month (dropped)"}`);
      if (home && !there) moves.push({ ev, to: home });
      continue;
    }
    kept.push(ev);
  }

  const { events, removed } = dedupeListings(kept, cityOf(entry.slug));
  for (const [winner, loser] of removed) note("duplicate listing (collapsed)", `${tag(loser)}  ≈  ${winner.title.slice(0, 60)}`);

  entry.data.events = events.map((ev) => {
    if (ev.type !== "festival" || (ev.endDate ?? ev.startDate) !== ev.startDate || /fest|carn|weekender|week\b|pride|parade|open air|land\b/i.test(ev.title)) return ev;
    if (PARTY_BRANDS.test(ev.title)) {
      note("single-day brand night typed 'festival' (→ club-night)", tag(ev));
      return { ...ev, type: "club-night" as const };
    }
    note("single-day 'festival' (review)", tag(ev));
    return ev;
  });
}

for (const { ev, to } of moves) to.data.events.push(ev);

const brandPattern = new RegExp(TOURING_BRANDS.map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i");
const dense = ["new-york", "london", "berlin", "los-angeles", "paris", "amsterdam", "miami", "ibiza", "mexico-city", "sao-paulo", "dubai", "tulum"];
for (const entry of entries) {
  if (!dense.includes(entry.slug)) continue;
  const [, last] = monthBounds(entry.year, entry.month);
  if (last < TODAY) continue;
  if (!entry.data.events.some((ev) => brandPattern.test(`${ev.title} ${ev.summary}`))) {
    note("no touring brand night found (re-run brand pass)", `${entry.slug} ${entry.year}-${String(entry.month).padStart(2, "0")} (${entry.data.events.length} events)`);
  }
}

const after = entries.reduce((sum, e) => sum + e.data.events.length, 0);
console.log(`[audit] ${entries.length} city-months, ${total} events${FIX ? ` → ${after} after fixes` : ""}`);
for (const [kind, lines] of Object.entries(log).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n## ${kind}: ${lines.length}`);
  for (const line of lines.slice(0, process.argv.includes("--all") ? Infinity : 15)) console.log(`   ${line}`);
  if (lines.length > 15 && !process.argv.includes("--all")) console.log(`   … ${lines.length - 15} more (--all to list)`);
}

if (FIX) {
  replaceApproved(entries);
  console.log("\n[audit] fixes written to approved-events.json and approved-events.slim.json");
} else {
  console.log("\n[audit] report only; re-run with --fix to apply the safe fixes");
}
