import { NextResponse } from "next/server";

// 30-second audio previews for headline artists, via Deezer's public API
// (no auth required; previews are Deezer-hosted MP3s). Preview URLs are signed
// and expire ~15 minutes after issue, so only misses are cached for long.

export const runtime = "nodejs";
export const maxDuration = 10;

const FETCH_TIMEOUT_MS = 4500;

type PreviewPayload = {
  artist: string;
  track: string;
  previewUrl: string;
  artworkUrl: string | null;
  source: "deezer";
};

const CACHE = new Map<string, { payload: PreviewPayload | null; expires: number }>();
const HIT_TTL_MS = 1000 * 60 * 10;
const MISS_TTL_MS = 1000 * 60 * 60 * 24;
const HIT_CACHE_HEADER = "public, s-maxage=600, stale-while-revalidate=60";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type DeezerArtistSearch = {
  data?: Array<{ id: number; name: string; picture_medium?: string; nb_fan?: number }>;
};

// Lookalike accounts ("BLACKcoffee", 36 fans) often rank above the real
// artist (Black Coffee, 250k fans); below this, playing nothing is safer.
const MIN_FANS = 1000;

type DeezerTopTracks = {
  data?: Array<{ title: string; preview?: string; artist?: { name?: string } }>;
};

async function lookup(artistQuery: string): Promise<PreviewPayload | null> {
  const search = await fetchJson<DeezerArtistSearch>(
    `https://api.deezer.com/search/artist?q=${encodeURIComponent(artistQuery)}&limit=10`
  );
  const wanted = normalize(artistQuery);
  const candidates = (search?.data ?? [])
    .filter((a) => {
      const got = normalize(a.name);
      // Exact, or the catalog name extends our query ("Anyma" → "Anyma (ofc)").
      // Deliberately NOT the reverse: a query with extra words ("Resistance
      // Ibiza") must not match a shorter unrelated artist ("Resistance").
      return (got === wanted || (got.includes(wanted) && got.length - wanted.length <= 6)) && (a.nb_fan ?? 0) >= MIN_FANS;
    })
    .sort((a, b) => (b.nb_fan ?? 0) - (a.nb_fan ?? 0));

  // Duplicate/squatter entries with zero tracks are common on Deezer — walk
  // the matches until one actually has a playable preview.
  for (const artist of candidates.slice(0, 3)) {
    const top = await fetchJson<DeezerTopTracks>(
      `https://api.deezer.com/artist/${artist.id}/top?limit=5`
    );
    const track = (top?.data ?? []).find((t) => Boolean(t.preview));
    if (!track?.preview) continue;
    return {
      artist: artist.name,
      track: track.title,
      previewUrl: track.preview,
      artworkUrl: artist.picture_medium ?? null,
      source: "deezer"
    };
  }
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const artist = url.searchParams.get("artist")?.trim();
  if (!artist || artist.length < 2 || artist.length > 60) {
    return NextResponse.json({ error: "invalid-artist" }, { status: 400 });
  }

  const key = normalize(artist);
  const cached = CACHE.get(key);
  if (cached && cached.expires > Date.now()) {
    if (!cached.payload) return NextResponse.json({ error: "not-found" }, { status: 404 });
    return NextResponse.json(cached.payload, {
      headers: { "Cache-Control": HIT_CACHE_HEADER }
    });
  }

  const payload = await lookup(artist);
  CACHE.set(key, { payload, expires: Date.now() + (payload ? HIT_TTL_MS : MISS_TTL_MS) });

  if (!payload) {
    return NextResponse.json(
      { error: "not-found" },
      { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } }
    );
  }

  return NextResponse.json(payload, {
    headers: { "Cache-Control": HIT_CACHE_HEADER }
  });
}
