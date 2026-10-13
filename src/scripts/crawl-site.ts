/**
 * Crawls a running instance of the site: every sitemap URL, then every
 * internal link found on those pages. Reports non-200 pages, broken internal
 * links, and outbound links (direct or via /api/out) that land on a search page.
 *
 * Usage: WN_BASE=http://localhost:3100 npx tsx --tsconfig tsconfig.json src/scripts/crawl-site.ts
 */
import { isSearchResultsUrl } from "../lib/research/event-identity";

const BASE = (process.env.WN_BASE ?? "http://localhost:3000").replace(/\/$/, "");
const CONCURRENCY = Number(process.env.WN_CONCURRENCY ?? 8);
const MAX_PAGES = Number(process.env.WN_MAX_PAGES ?? 6000);

type Result = { url: string; status: number; ms: number; from?: string };

let siteOrigin = new URL(BASE).origin;
const results = new Map<string, Result>();
const referrer = new Map<string, string>();
const badOutbound = new Map<string, string>();
const outboundSeen = new Set<string>();

function toLocal(raw: string): string | null {
  try {
    const u = new URL(raw, BASE);
    if (u.origin !== new URL(BASE).origin && u.origin !== siteOrigin) return null;
    if (/^\/(_next|api\/(og|out|audio-preview|preview-meta))/.test(u.pathname)) return null;
    if (/\.(png|jpe?g|webp|svg|ico|xml|txt|json|webmanifest)$/i.test(u.pathname)) return null;
    u.hash = "";
    return `${BASE}${u.pathname}${u.search}`;
  } catch {
    return null;
  }
}

function inspectOutbound(href: string, page: string) {
  if (outboundSeen.has(href)) return;
  outboundSeen.add(href);
  try {
    const u = new URL(href, BASE);
    const internal = u.origin === new URL(BASE).origin || u.origin === siteOrigin;
    const target = u.pathname === "/api/out" ? u.searchParams.get("u") : internal ? null : u.href;
    if (target && isSearchResultsUrl(target)) badOutbound.set(target, page);
  } catch {
    /* malformed hrefs surface as broken internal links */
  }
}

async function fetchPage(url: string): Promise<{ status: number; html: string; ms: number }> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(60_000) });
    const type = res.headers.get("content-type") ?? "";
    const html = type.includes("text/html") ? await res.text() : "";
    if (!html) res.body?.cancel().catch(() => {});
    return { status: res.status, html, ms: Date.now() - t0 };
  } catch {
    return { status: 0, html: "", ms: Date.now() - t0 };
  }
}

async function main() {
  const sitemap = await fetch(`${BASE}/sitemap.xml`).then((r) => r.text());
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
  if (locs[0]) siteOrigin = new URL(locs[0]).origin;
  const seeds = locs.map(toLocal).filter((u): u is string => !!u);
  console.log(`[crawl] ${seeds.length} sitemap URLs on ${BASE}`);
  const queue = [...new Set(seeds)];
  const queued = new Set(queue);
  let done = 0;

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length) {
        const url = queue.shift()!;
        const page = await fetchPage(url);
        const { html, ms } = page;
        // Streamed pages keep HTTP 200 even when they render the 404 page or hit an error boundary.
        const status =
          page.status === 200 && /NEXT_HTTP_ERROR_FALLBACK;404/.test(html) ? 404
          : page.status === 200 && /data-dgst="(?!NEXT_|BAILOUT_TO_CLIENT_SIDE_RENDERING)/.test(html) ? 500
          : page.status;
        results.set(url, { url, status, ms, from: referrer.get(url) });
        if (++done % 200 === 0) console.log(`[crawl] ${done} fetched, ${queue.length} queued`);
        for (const m of html.matchAll(/href="([^"]+)"/g)) {
          const href = m[1].replace(/&amp;/g, "&");
          if (/^(mailto|tel|javascript):/.test(href)) continue;
          inspectOutbound(href, url);
          const local = toLocal(href);
          if (!local || queued.has(local) || queued.size >= MAX_PAGES) continue;
          queued.add(local);
          referrer.set(local, url);
          queue.push(local);
        }
      }
    })
  );

  const all = [...results.values()];
  const broken = all.filter((r) => r.status !== 200);
  const slow = all.filter((r) => r.ms > 5000).sort((a, b) => b.ms - a.ms);
  console.log(`\n[crawl] fetched ${all.length} pages (${seeds.length} from sitemap, ${all.length - seeds.length} discovered)`);
  console.log(`[crawl] non-200: ${broken.length}`);
  for (const r of broken.slice(0, 60)) console.log(`   ${r.status} ${r.url.replace(BASE, "")}${r.from ? `  ← ${r.from.replace(BASE, "")}` : ""}`);
  console.log(`[crawl] outbound links to search pages: ${badOutbound.size}`);
  for (const [target, page] of [...badOutbound].slice(0, 30)) console.log(`   ${target}  ← ${page.replace(BASE, "")}`);
  console.log(`[crawl] pages slower than 5s: ${slow.length}`);
  for (const r of slow.slice(0, 10)) console.log(`   ${(r.ms / 1000).toFixed(1)}s ${r.url.replace(BASE, "")}`);
  process.exit(broken.length || badOutbound.size ? 1 : 0);
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
