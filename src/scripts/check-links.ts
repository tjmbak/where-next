/**
 * Checks every source/ticket link on current and future events.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.json src/scripts/check-links.ts          # report only
 *   npx tsx --tsconfig tsconfig.json src/scripts/check-links.ts --fix    # strip dead links
 *
 * Dead = 404/410, DNS failure, or a redirect onto a search page. Bot-blocking
 * statuses (401/403/429/5xx) count as alive: ticketing sites return them to
 * scripts even when the page is live. With --fix a dead ticket link is
 * removed; a dead source link falls back to the ticket link, and the event
 * is dropped only when neither link works.
 */
import dns from "node:dns/promises";
import fs from "node:fs";
import path from "node:path";
import { listApproved, replaceApproved } from "../lib/research/draft-store";
import { isSearchResultsUrl } from "../lib/research/event-identity";

const FIX = process.argv.includes("--fix");
const CONCURRENCY = Number(process.env.WN_CONCURRENCY ?? 24);
const now = new Date();
const FROM = now.getUTCFullYear() * 12 + now.getUTCMonth();

type Verdict = { url: string; status: number | null; finalUrl: string | null; dead: boolean; reason: string };

const UAS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1"
];

async function probe(url: string, ua: string): Promise<Verdict> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": ua, Accept: "text/html,application/xhtml+xml,*/*;q=0.8", "Accept-Language": "en-US,en;q=0.9" },
      signal: AbortSignal.timeout(20_000)
    });
    res.body?.cancel().catch(() => {});
    if (isSearchResultsUrl(res.url)) return { url, status: res.status, finalUrl: res.url, dead: true, reason: "redirects to search page" };
    if (res.status === 404 || res.status === 410) return { url, status: res.status, finalUrl: res.url, dead: true, reason: `HTTP ${res.status}` };
    return { url, status: res.status, finalUrl: res.url, dead: false, reason: `HTTP ${res.status}` };
  } catch (err) {
    const cause = (err as { cause?: { code?: string } })?.cause?.code ?? (err instanceof Error ? err.name : "error");
    const dead = cause === "ENOTFOUND" || cause === "ERR_INVALID_URL" || cause === "ERR_TLS_CERT_ALTNAME_INVALID";
    return { url, status: null, finalUrl: null, dead, reason: cause };
  }
}

async function check(url: string): Promise<Verdict> {
  if (isSearchResultsUrl(url)) return { url, status: null, finalUrl: null, dead: true, reason: "search page" };
  const first = await probe(url, UAS[0]);
  if (!first.dead || first.reason === "ENOTFOUND") return first;
  const second = await probe(url, UAS[1]);
  return second.dead ? first : second;
}

async function resolves(host: string): Promise<boolean> {
  const resolver = new dns.Resolver();
  resolver.setServers(["8.8.8.8", "1.1.1.1"]);
  const found = await Promise.all([resolver.resolve4(host).catch(() => []), resolver.resolve6(host).catch(() => [])]);
  return found.some((list) => list.length > 0);
}

async function main() {
  const entries = listApproved();
  const live = entries.filter((e) => e.year * 12 + e.month - 1 >= FROM);
  const urls = new Set<string>();
  for (const e of live) for (const ev of e.data.events) {
    urls.add(ev.sourceUrl);
    if (ev.ticketUrl) urls.add(ev.ticketUrl);
  }
  const queue = [...urls];
  const verdicts = new Map<string, Verdict>();
  let done = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const url = queue.shift()!;
        verdicts.set(url, await check(url));
        if (++done % 250 === 0) console.log(`[links] ${done}/${urls.size}`);
      }
    })
  );

  // Parallel DNS lookups fail spuriously; confirm every dead verdict one at a time.
  for (const v of [...verdicts.values()].filter((x) => x.dead && x.reason !== "search page")) {
    await new Promise((r) => setTimeout(r, 500));
    const again = await check(v.url);
    if (!again.dead) verdicts.set(v.url, again);
    else if (again.reason === "ENOTFOUND" && (await resolves(new URL(v.url).hostname))) {
      verdicts.set(v.url, { ...again, dead: false, reason: "DNS flaky, host resolves" });
    }
  }

  const dead = [...verdicts.values()].filter((v) => v.dead);
  const unreachable = [...verdicts.values()].filter((v) => !v.dead && v.status === null);
  console.log(`[links] checked ${urls.size} URLs: ${dead.length} dead, ${unreachable.length} timed out / unreachable (kept)`);
  const byReason = dead.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v.reason]: (acc[v.reason] ?? 0) + 1 }), {});
  console.log("[links] dead by reason:", byReason);

  const isDead = (url: string | null) => !!url && !!verdicts.get(url)?.dead;
  let ticketsRemoved = 0;
  let sourcesSwapped = 0;
  const dropped: string[] = [];
  for (const e of live) {
    e.data.events = e.data.events.flatMap((ev) => {
      let next = ev;
      if (isDead(next.ticketUrl)) {
        next = { ...next, ticketUrl: null };
        ticketsRemoved++;
      }
      if (isDead(next.sourceUrl)) {
        if (!next.ticketUrl) {
          dropped.push(`${e.slug} ${ev.startDate} ${ev.title} — ${verdicts.get(ev.sourceUrl)?.reason} ${ev.sourceUrl}`);
          return [];
        }
        next = { ...next, sourceUrl: next.ticketUrl };
        sourcesSwapped++;
      }
      return [next];
    });
  }
  console.log(`[links] ${ticketsRemoved} dead ticket links, ${sourcesSwapped} sources swapped to ticket link, ${dropped.length} events with no working link`);
  for (const line of dropped) console.log(`   - ${line}`);

  const reportDir = path.join(process.cwd(), ".research-raw");
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(path.join(reportDir, "link-report.json"), JSON.stringify({ checkedAt: now.toISOString(), dead, unreachable }, null, 2));

  if (FIX) {
    replaceApproved(entries);
    console.log("[links] fixes written");
  } else {
    console.log("[links] report only; re-run with --fix to apply");
  }
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
