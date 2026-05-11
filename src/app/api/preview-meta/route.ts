import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 10;

const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 220 * 1024; // 220KB — meta tags always live in <head>, no need to read the whole page
const USER_AGENT =
  "Mozilla/5.0 (compatible; WhereNextBot/1.0; +https://wherenext-hazel.vercel.app/preview-meta)";

type PreviewMeta = {
  url: string;
  resolvedUrl: string;
  hostname: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
  image: string | null;
  fetchedAt: string;
};

function isPrivateHost(hostname: string): boolean {
  // Block obvious SSRF targets — localhost, link-local, private RFC1918,
  // and IPv6 loopback / link-local.
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) return true;
  if (/^10\./.test(lower)) return true;
  if (/^127\./.test(lower)) return true;
  if (/^192\.168\./.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(lower)) return true;
  if (/^169\.254\./.test(lower)) return true;
  if (lower === "::1" || lower.startsWith("[::1]")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("fe80:")) return true;
  return false;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .trim();
}

function extractMeta(html: string, names: string[]): string | null {
  // Match <meta ... property="X" ... content="Y"> or with name=
  // and either order of attributes. We try each name in priority order.
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name|itemprop)\\s*=\\s*["']${escaped}["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content\\s*=\\s*["'][^"']*["'][^>]*?(?:property|name|itemprop)\\s*=\\s*["']${escaped}["'][^>]*>`, "i")
    ];
    for (const re of patterns) {
      const tag = html.match(re)?.[0];
      if (!tag) continue;
      const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
      if (content) return decodeEntities(content);
    }
  }
  return null;
}

function extractTitleTag(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? decodeEntities(match[1]) : null;
}

function resolveUrl(maybeRelative: string | null, base: string): string | null {
  if (!maybeRelative) return null;
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

async function fetchSnippet(url: string): Promise<{ html: string; finalUrl: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    if (!response.ok) return null;
    const reader = response.body?.getReader();
    if (!reader) {
      const text = await response.text();
      return { html: text.slice(0, MAX_BYTES), finalUrl: response.url };
    }
    const decoder = new TextDecoder();
    let html = "";
    let total = 0;
    while (total < MAX_BYTES) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    try {
      await reader.cancel();
    } catch {
      // ignore
    }
    return { html, finalUrl: response.url };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const target = requestUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "missing-url" }, { status: 400 });
  }

  let parsedTarget: URL;
  try {
    parsedTarget = new URL(target);
  } catch {
    return NextResponse.json({ error: "invalid-url" }, { status: 400 });
  }

  if (parsedTarget.protocol !== "https:" && parsedTarget.protocol !== "http:") {
    return NextResponse.json({ error: "unsupported-protocol" }, { status: 400 });
  }
  if (isPrivateHost(parsedTarget.hostname)) {
    return NextResponse.json({ error: "blocked-host" }, { status: 400 });
  }

  const fetched = await fetchSnippet(parsedTarget.toString());
  if (!fetched) {
    const empty: PreviewMeta = {
      url: parsedTarget.toString(),
      resolvedUrl: parsedTarget.toString(),
      hostname: parsedTarget.host,
      title: null,
      description: null,
      siteName: null,
      image: null,
      fetchedAt: new Date().toISOString()
    };
    return NextResponse.json(empty, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600" }
    });
  }

  const { html, finalUrl } = fetched;
  const finalUrlParsed = (() => {
    try {
      return new URL(finalUrl);
    } catch {
      return parsedTarget;
    }
  })();

  const title =
    extractMeta(html, ["og:title", "twitter:title"]) ?? extractTitleTag(html);
  const description = extractMeta(html, [
    "og:description",
    "twitter:description",
    "description"
  ]);
  const siteName = extractMeta(html, ["og:site_name", "application-name"]);
  const rawImage = extractMeta(html, [
    "og:image",
    "og:image:secure_url",
    "twitter:image",
    "twitter:image:src",
    "image"
  ]);
  const image = resolveUrl(rawImage, finalUrl);

  const meta: PreviewMeta = {
    url: parsedTarget.toString(),
    resolvedUrl: finalUrl,
    hostname: finalUrlParsed.host,
    title,
    description,
    siteName,
    image,
    fetchedAt: new Date().toISOString()
  };

  return NextResponse.json(meta, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" }
  });
}
