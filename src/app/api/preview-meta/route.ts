import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 10;

const FETCH_TIMEOUT_MS = 5000;
const MICROLINK_TIMEOUT_MS = 4500;
// Read enough of the page to also catch JSON-LD blocks, which often live just
// below </head>. Capped to keep the fetch fast.
const MAX_BYTES = 360 * 1024;
// A real browser UA dramatically raises the hit-rate: many sites drop requests
// from obvious bot user-agents (which is what our old "WhereNextBot" UA was).
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

type PreviewMeta = {
  url: string;
  resolvedUrl: string;
  hostname: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
  image: string | null;
  /** Brand mark (favicon/apple-touch-icon/logo) — never stretched into the hero. */
  logo: string | null;
  /** Where the image came from, for debugging/telemetry. */
  source: "og" | "jsonld" | "image_src" | "microlink" | "none";
  fetchedAt: string;
};

// Lightweight in-process cache so repeated opens of the same link (and the
// React strict-mode double-fetch) don't re-hit the network. Survives for the
// life of the serverless instance; the HTTP Cache-Control header handles the
// CDN layer.
const CACHE = new Map<string, { meta: PreviewMeta; expires: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6h

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

/** Pull the first usable image URL out of any schema.org JSON-LD blocks. */
function extractJsonLdImage(html: string): string | null {
  const blocks = html.matchAll(
    /<script[^>]+type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const block of blocks) {
    const raw = block[1]?.trim();
    if (!raw) continue;
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      continue;
    }
    const found = findJsonLdImage(json);
    if (found) return found;
  }
  return null;
}

function findJsonLdImage(node: unknown, depth = 0): string | null {
  if (!node || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJsonLdImage(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const image = obj.image ?? obj.thumbnailUrl ?? obj.logo;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) {
    const first = image[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && typeof (first as Record<string, unknown>).url === "string") {
      return (first as Record<string, string>).url;
    }
  }
  if (image && typeof image === "object" && typeof (image as Record<string, unknown>).url === "string") {
    return (image as Record<string, string>).url;
  }
  // Recurse into common containers.
  for (const key of ["@graph", "mainEntity", "mainEntityOfPage", "subjectOf"]) {
    if (obj[key]) {
      const found = findJsonLdImage(obj[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

/** Brand mark (apple-touch-icon → icon → shortcut icon). */
function extractIcon(html: string): string | null {
  const linkTags = html.match(/<link[^>]+>/gi) ?? [];
  const byRel = (rel: RegExp): string | null => {
    for (const tag of linkTags) {
      if (!rel.test(tag)) continue;
      const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
      if (href) return decodeEntities(href);
    }
    return null;
  };
  return (
    byRel(/rel\s*=\s*["'][^"']*apple-touch-icon[^"']*["']/i) ??
    byRel(/rel\s*=\s*["'][^"']*\bicon\b[^"']*["']/i)
  );
}

type MicrolinkResult = {
  image: string | null;
  logo: string | null;
  title: string | null;
  description: string | null;
  siteName: string | null;
};

/**
 * Fallback to Microlink's hosted resolver (JS rendering + rotating UAs) when
 * our own scrape can't find an image. Free tier is rate-limited and best-
 * effort; failures are swallowed so the route still returns gracefully.
 */
async function fetchMicrolink(url: string): Promise<MicrolinkResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MICROLINK_TIMEOUT_MS);
  try {
    const api = `https://api.microlink.io/?url=${encodeURIComponent(url)}`;
    const response = await fetch(api, {
      signal: controller.signal,
      headers: { Accept: "application/json" }
    });
    if (!response.ok) return null;
    const body = (await response.json()) as {
      status?: string;
      data?: {
        image?: { url?: string } | null;
        logo?: { url?: string } | null;
        title?: string | null;
        description?: string | null;
        publisher?: string | null;
      };
    };
    if (body.status !== "success" || !body.data) return null;
    const d = body.data;
    return {
      image: d.image?.url ?? null,
      logo: d.logo?.url ?? null,
      title: d.title ?? null,
      description: d.description ?? null,
      siteName: d.publisher ?? null
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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
    // Read up to MAX_BYTES. We intentionally don't stop at </head> so JSON-LD
    // blocks (often just below it) are captured for image extraction.
    while (total < MAX_BYTES) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      html += decoder.decode(value, { stream: true });
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

  const cacheKey = parsedTarget.toString();
  const cached = CACHE.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.meta, {
      headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" }
    });
  }

  const fetched = await fetchSnippet(cacheKey);

  let title: string | null = null;
  let description: string | null = null;
  let siteName: string | null = null;
  let image: string | null = null;
  let logo: string | null = null;
  let source: PreviewMeta["source"] = "none";
  let finalUrl = cacheKey;

  if (fetched) {
    const { html } = fetched;
    finalUrl = fetched.finalUrl || cacheKey;
    title = extractMeta(html, ["og:title", "twitter:title"]) ?? extractTitleTag(html);
    description = extractMeta(html, ["og:description", "twitter:description", "description"]);
    siteName = extractMeta(html, ["og:site_name", "application-name"]);
    logo = resolveUrl(extractIcon(html), finalUrl);

    // Image priority: og/twitter → JSON-LD → <link rel=image_src>.
    const ogImage = resolveUrl(
      extractMeta(html, ["og:image", "og:image:secure_url", "twitter:image", "twitter:image:src", "image"]),
      finalUrl
    );
    if (ogImage) {
      image = ogImage;
      source = "og";
    } else {
      const jsonLd = resolveUrl(extractJsonLdImage(html), finalUrl);
      if (jsonLd) {
        image = jsonLd;
        source = "jsonld";
      } else {
        const imageSrc = resolveUrl(
          html.match(/<link[^>]+rel\s*=\s*["']image_src["'][^>]*>/i)?.[0]?.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] ?? null,
          finalUrl
        );
        if (imageSrc) {
          image = imageSrc;
          source = "image_src";
        }
      }
    }
  }

  // Fallback: hosted resolver (JS rendering) when our own scrape found no
  // image — covers bot-blocked and client-rendered partner pages.
  if (!image) {
    const ml = await fetchMicrolink(cacheKey);
    if (ml) {
      if (ml.image) {
        image = ml.image;
        source = "microlink";
      }
      title = title ?? ml.title;
      description = description ?? ml.description;
      siteName = siteName ?? ml.siteName;
      logo = logo ?? ml.logo;
    }
  }

  const finalUrlParsed = (() => {
    try {
      return new URL(finalUrl);
    } catch {
      return parsedTarget;
    }
  })();

  const meta: PreviewMeta = {
    url: cacheKey,
    resolvedUrl: finalUrl,
    hostname: finalUrlParsed.host,
    title,
    description,
    siteName,
    image,
    logo,
    source,
    fetchedAt: new Date().toISOString()
  };

  CACHE.set(cacheKey, { meta, expires: Date.now() + CACHE_TTL_MS });

  // Shorter CDN TTL when we came up empty, so a later retry can succeed.
  const cacheControl = image
    ? "public, s-maxage=86400, stale-while-revalidate=604800"
    : "public, s-maxage=900, stale-while-revalidate=3600";

  return NextResponse.json(meta, { headers: { "Cache-Control": cacheControl } });
}
