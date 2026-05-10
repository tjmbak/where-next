/**
 * Scaffold a new destination from a single JSON profile.
 *
 * The profile lives at city-profiles/{slug}.json (see _template.json).
 *
 * Modes:
 *   --apply   Patch all four data files in place, using `// @scaffold:*`
 *             anchor markers (the markers survive each run so the script
 *             stays idempotent across many additions).
 *   default   Print the snippets to stdout only — useful for review or
 *             when you want to paste fragments by hand.
 *
 * Usage:
 *   npx tsx src/scripts/scaffold-city.ts city-profiles/hvar.json
 *   npx tsx src/scripts/scaffold-city.ts city-profiles/hvar.json --apply
 *
 * The 4 files patched in --apply mode:
 *   1. src/data/music-travel.ts        DESTINATIONS, VENUES, peakHook
 *   2. src/data/event-blueprints.ts    EVENT_BLUEPRINTS
 *   3. src/scripts/generate-heroes.ts  PEAK_SCENES, SHOULDER_SCENES, DETAIL_SCENES
 *
 * After --apply you still need to:
 *   a) `npx tsc --noEmit` to confirm types are clean
 *   b) `WN_HERO_VARIANT=all WN_HERO_LIMIT={N×3} npx tsx src/scripts/generate-heroes.ts`
 *      to render hero/shoulder/detail images for the new city
 *   c) `npx tsx src/scripts/build-hero-manifest.ts` to refresh the gallery manifest
 *   d) `npx tsx src/scripts/batch-research.ts` to populate AI events for the
 *      new (city, month) pairs (the runner skips already-approved pairs, so
 *      this is safe even after a full population)
 */
import fs from "node:fs";
import path from "node:path";

// ───── schema (intentionally lightweight; types live in src/types/content.ts) ─────

type Coords = { lat: number; lng: number };
type Spend = { low: number; high: number };

type ProfileVenue = {
  id: string;
  name: string;
  type: string;
  sceneTags: string[];
  officialUrl: string;
};

type ProfileBlueprint = {
  id: string;
  title: string;
  type: string;
  startMonth: number;
  startDay: number;
  endMonth?: number;
  endDay?: number;
  importance: number;
  summary: string;
  venueId?: string;
  sourceUrl: string;
  genres?: string[];
};

type CityProfile = {
  slug: string;
  city: string;
  country: string;
  region: string;
  coordinates: Coords;
  tagline: string;
  summary: string;
  activeMonths: number[];
  peakMonths: number[];
  genres: string[];
  vibes: string[];
  budget: string;
  averageDailySpendUsd: Spend;
  whoFor: string[];
  whenToBook: string;
  travelNotes: string;
  peakHook: string;
  heroScenes: { peak: string; shoulder: string; detail: string };
  venues: ProfileVenue[];
  blueprints: ProfileBlueprint[];
};

// ───── validation ─────

const REGIONS = ["Africa", "Asia", "Europe", "Middle East", "North America", "Oceania", "South America"];
const GENRES = ["afro-house", "amapiano", "house", "techno", "electronic", "hip-hop", "r-and-b", "latin", "jazz", "pop", "festival"];
const VIBES = ["beach", "luxury", "underground", "festival", "city", "cultural", "group-trip", "late-night"];
const BUDGETS = ["low", "medium", "high", "luxury"];
const EVENT_TYPES = ["festival", "club-night", "residency", "beach-club", "carnival", "concert", "conference"];
const VENUE_TYPES = [...EVENT_TYPES, "venue"];

function fail(message: string): never {
  console.error(`[scaffold-city] ${message}`);
  process.exit(1);
}

function validate(p: CityProfile) {
  const errors: string[] = [];
  const must = (cond: unknown, msg: string) => {
    if (!cond) errors.push(msg);
  };

  must(/^[a-z0-9-]+$/.test(p.slug), `slug must be kebab-case lowercase: got "${p.slug}"`);
  must(p.city && p.city.length > 0, "city is required");
  must(p.country && p.country.length > 0, "country is required");
  must(REGIONS.includes(p.region), `region must be one of ${REGIONS.join(", ")}`);
  must(typeof p.coordinates?.lat === "number" && typeof p.coordinates?.lng === "number", "coordinates must have numeric lat/lng");
  must(typeof p.tagline === "string" && p.tagline.length > 0, "tagline is required");
  must(typeof p.summary === "string" && p.summary.length > 0, "summary is required");
  must(Array.isArray(p.activeMonths) && p.activeMonths.every((m) => m >= 1 && m <= 12), "activeMonths must be 1–12");
  must(Array.isArray(p.peakMonths) && p.peakMonths.every((m) => p.activeMonths.includes(m)), "every peakMonth must also be in activeMonths");
  must(p.genres.every((g) => GENRES.includes(g)), `genres must be from ${GENRES.join(", ")}`);
  must(p.vibes.every((v) => VIBES.includes(v)), `vibes must be from ${VIBES.join(", ")}`);
  must(BUDGETS.includes(p.budget), `budget must be one of ${BUDGETS.join(", ")}`);
  must(typeof p.averageDailySpendUsd?.low === "number" && typeof p.averageDailySpendUsd?.high === "number", "averageDailySpendUsd must have numeric low/high");
  must(Array.isArray(p.whoFor) && p.whoFor.length > 0, "whoFor must be a non-empty array");
  must(typeof p.whenToBook === "string" && p.whenToBook.length > 0, "whenToBook is required");
  must(typeof p.travelNotes === "string" && p.travelNotes.length > 0, "travelNotes is required");
  must(typeof p.peakHook === "string" && p.peakHook.length > 0, "peakHook is required");
  must(p.heroScenes?.peak && p.heroScenes?.shoulder && p.heroScenes?.detail, "heroScenes.peak / .shoulder / .detail are all required");

  for (const v of p.venues ?? []) {
    must(/^[a-z0-9-]+$/.test(v.id), `venue.id must be kebab-case: ${v.id}`);
    must(VENUE_TYPES.includes(v.type), `venue.type "${v.type}" must be one of ${VENUE_TYPES.join(", ")}`);
    must(v.sceneTags.every((t) => VIBES.includes(t)), `venue.sceneTags must come from ${VIBES.join(", ")}`);
    must(/^https?:\/\//.test(v.officialUrl), `venue.officialUrl must be http(s)`);
  }

  const venueIds = new Set((p.venues ?? []).map((v) => v.id));
  for (const b of p.blueprints ?? []) {
    must(/^[a-z0-9-]+$/.test(b.id), `blueprint.id must be kebab-case: ${b.id}`);
    must(EVENT_TYPES.includes(b.type), `blueprint.type "${b.type}" must be one of ${EVENT_TYPES.join(", ")}`);
    must(b.startMonth >= 1 && b.startMonth <= 12, `blueprint.startMonth must be 1-12: ${b.id}`);
    must(b.startDay >= 1 && b.startDay <= 31, `blueprint.startDay must be 1-31: ${b.id}`);
    must(b.importance >= 0 && b.importance <= 100, `blueprint.importance must be 0-100: ${b.id}`);
    must(typeof b.sourceUrl === "string" && /^https?:\/\//.test(b.sourceUrl), `blueprint.sourceUrl must be http(s): ${b.id}`);
    if (b.venueId) must(venueIds.has(b.venueId), `blueprint.venueId "${b.venueId}" must match one of this profile's venues`);
    if (b.genres) must(b.genres.every((g) => GENRES.includes(g)), `blueprint.genres on ${b.id}`);
  }

  if (errors.length) fail(`profile failed validation:\n  - ${errors.join("\n  - ")}`);
}

// ───── snippet builders ─────

const j = JSON.stringify;
const q = (s: string) => j(s);
const arr = (items: string[]) => `[${items.map(q).join(", ")}]`;
const slugKey = (slug: string) => (slug.includes("-") ? `"${slug}"` : slug);

function buildDestinationSnippet(p: CityProfile): string {
  return [
    `  {`,
    `    slug: ${q(p.slug)},`,
    `    city: ${q(p.city)},`,
    `    country: ${q(p.country)},`,
    `    region: ${q(p.region)},`,
    `    coordinates: { lat: ${p.coordinates.lat}, lng: ${p.coordinates.lng} },`,
    `    tagline: ${q(p.tagline)},`,
    `    summary:`,
    `      ${q(p.summary)},`,
    `    heroImage: "/images/heroes/${p.slug}.png",`,
    `    activeMonths: [${p.activeMonths.join(", ")}],`,
    `    peakMonths: [${p.peakMonths.join(", ")}],`,
    `    genres: ${arr(p.genres)},`,
    `    vibes: ${arr(p.vibes)},`,
    `    budget: ${q(p.budget)},`,
    `    averageDailySpendUsd: { low: ${p.averageDailySpendUsd.low}, high: ${p.averageDailySpendUsd.high} },`,
    `    whoFor: ${arr(p.whoFor)},`,
    `    whenToBook: ${q(p.whenToBook)},`,
    `    travelNotes: ${q(p.travelNotes)}`,
    `  }`
  ].join("\n");
}

function buildVenueSnippets(p: CityProfile): string {
  return p.venues
    .map(
      (v) =>
        `  { id: ${q(v.id)}, destinationSlug: ${q(p.slug)}, name: ${q(v.name)}, type: ${q(v.type)}, sceneTags: ${arr(v.sceneTags)}, officialUrl: ${q(v.officialUrl)} }`
    )
    .join(",\n");
}

function buildBlueprintSnippet(p: CityProfile): string {
  const items = p.blueprints
    .map((b) => {
      const lines = [
        `    {`,
        `      id: ${q(b.id)},`,
        `      title: ${q(b.title)},`,
        `      type: ${q(b.type)},`,
        `      startMonth: ${b.startMonth},`,
        `      startDay: ${b.startDay},`
      ];
      if (b.endMonth != null) lines.push(`      endMonth: ${b.endMonth},`);
      if (b.endDay != null) lines.push(`      endDay: ${b.endDay},`);
      lines.push(`      importance: ${b.importance},`);
      lines.push(`      summary:`);
      lines.push(`        ${q(b.summary)},`);
      if (b.venueId) lines.push(`      venueId: ${q(b.venueId)},`);
      lines.push(`      sourceUrl: ${q(b.sourceUrl)}${b.genres ? "," : ""}`);
      if (b.genres) lines.push(`      genres: ${arr(b.genres)}`);
      lines.push(`    }`);
      return lines.join("\n");
    })
    .join(",\n");

  return [`  ${slugKey(p.slug)}: [`, items, `  ]`].join("\n");
}

function buildPeakHookSnippet(p: CityProfile): string {
  return `  ${slugKey(p.slug)}: ${q(p.peakHook)}`;
}

function buildSceneSnippet(p: CityProfile, kind: "peak" | "shoulder" | "detail"): string {
  return [`  ${slugKey(p.slug)}:`, `    ${q(p.heroScenes[kind])}`].join("\n");
}

// ───── file patching (anchor-marker driven) ─────

type Patch = {
  filePath: string;
  marker: string;
  // The content to insert *immediately above* the marker line. Each call
  // assumes the line above the marker has no trailing comma; the patch adds
  // one and inserts the new entry. The marker is kept in place for next time.
  payload: string;
  label: string;
};

function applyPatches(patches: Patch[]) {
  for (const p of patches) {
    const abs = path.resolve(p.filePath);
    if (!fs.existsSync(abs)) fail(`expected file not found: ${abs}`);
    let src = fs.readFileSync(abs, "utf8");
    const markerLine = p.marker;
    if (!src.includes(markerLine)) {
      fail(`could not find anchor marker in ${p.filePath}: ${markerLine}\n  Run without --apply to print snippets, then paste manually.`);
    }
    // Replace `\n  // @scaffold:NAME` (newline + 2-space indent + marker)
    // with `,\n  <payload>\n  // @scaffold:NAME`. The leading "," becomes the
    // trailing comma for the previous last entry (which was previously the
    // last item before the marker so had no comma).
    const search = `\n  ${markerLine}`;
    const insertion = `,\n${p.payload}\n  ${markerLine}`;
    if (!src.includes(search)) fail(`marker line not formatted as expected in ${p.filePath}`);
    src = src.replace(search, insertion);
    fs.writeFileSync(abs, src);
    console.log(`[scaffold-city]   patched ${p.filePath} → ${p.label}`);
  }
}

// ───── main ─────

function loadProfile(file: string): CityProfile {
  if (!fs.existsSync(file)) fail(`profile not found: ${file}`);
  const raw = fs.readFileSync(file, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    fail(`profile is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }
  // Strip `_*` and `$schema` comment-style keys from runtime data; they are
  // documentation-only and not part of the schema.
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (k.startsWith("_") || k === "$schema") continue;
    cleaned[k] = v;
  }
  return cleaned as unknown as CityProfile;
}

function header(label: string): string {
  return `\n// ─── ${label} ${"─".repeat(Math.max(0, 70 - label.length))}\n`;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) {
    console.error("usage: npx tsx src/scripts/scaffold-city.ts <profile.json> [--apply]");
    process.exit(1);
  }
  const profilePath = argv[0];
  const apply = argv.includes("--apply");

  const profile = loadProfile(profilePath);
  validate(profile);

  const destSnippet = buildDestinationSnippet(profile);
  const venueSnippet = buildVenueSnippets(profile);
  const blueprintSnippet = buildBlueprintSnippet(profile);
  const peakHookSnippet = buildPeakHookSnippet(profile);
  const peakScene = buildSceneSnippet(profile, "peak");
  const shoulderScene = buildSceneSnippet(profile, "shoulder");
  const detailScene = buildSceneSnippet(profile, "detail");

  console.log(`[scaffold-city] profile validated: ${profile.slug} (${profile.city}, ${profile.country})`);
  console.log(`[scaffold-city]   active=${profile.activeMonths.join(",")} peak=${profile.peakMonths.join(",")} venues=${profile.venues.length} blueprints=${profile.blueprints.length}`);

  if (!apply) {
    process.stdout.write(header("src/data/music-travel.ts → DESTINATIONS"));
    console.log(destSnippet);
    process.stdout.write(header("src/data/music-travel.ts → VENUES"));
    console.log(venueSnippet);
    process.stdout.write(header("src/data/music-travel.ts → peakHook"));
    console.log(peakHookSnippet);
    process.stdout.write(header("src/data/event-blueprints.ts → EVENT_BLUEPRINTS"));
    console.log(blueprintSnippet);
    process.stdout.write(header("src/scripts/generate-heroes.ts → PEAK_SCENES"));
    console.log(peakScene);
    process.stdout.write(header("src/scripts/generate-heroes.ts → SHOULDER_SCENES"));
    console.log(shoulderScene);
    process.stdout.write(header("src/scripts/generate-heroes.ts → DETAIL_SCENES"));
    console.log(detailScene);
    console.log("\n[scaffold-city] (dry-run) — re-run with --apply to patch files in place.");
    return;
  }

  // Guard: refuse to patch if this slug is already in DESTINATIONS.
  const existing = fs.readFileSync(path.resolve("src/data/music-travel.ts"), "utf8");
  const existingSlugRegex = new RegExp(`slug:\\s*"${profile.slug}"`);
  if (existingSlugRegex.test(existing)) {
    fail(`slug "${profile.slug}" is already present in src/data/music-travel.ts. Refusing to insert a duplicate.`);
  }

  const patches: Patch[] = [
    {
      filePath: "src/data/music-travel.ts",
      marker: "// @scaffold:destinations — new Destination objects go here (see docs/ADD_CITY.md)",
      payload: destSnippet,
      label: "DESTINATIONS"
    },
    {
      filePath: "src/data/music-travel.ts",
      marker: "// @scaffold:venues — new Venue rows go here (see docs/ADD_CITY.md)",
      payload: venueSnippet,
      label: "VENUES"
    },
    {
      filePath: "src/data/music-travel.ts",
      marker: "// @scaffold:peakHook — new peak-month one-liners go here (see docs/ADD_CITY.md)",
      payload: peakHookSnippet,
      label: "peakHook"
    },
    {
      filePath: "src/data/event-blueprints.ts",
      marker: "// @scaffold:blueprints — new EventBlueprint arrays keyed by slug go here (see docs/ADD_CITY.md)",
      payload: blueprintSnippet,
      label: "EVENT_BLUEPRINTS"
    },
    {
      filePath: "src/scripts/generate-heroes.ts",
      marker: "// @scaffold:peakScenes — new peak-season scene prompts go here (see docs/ADD_CITY.md)",
      payload: peakScene,
      label: "PEAK_SCENES"
    },
    {
      filePath: "src/scripts/generate-heroes.ts",
      marker: "// @scaffold:shoulderScenes — new shoulder-season scene prompts go here (see docs/ADD_CITY.md)",
      payload: shoulderScene,
      label: "SHOULDER_SCENES"
    },
    {
      filePath: "src/scripts/generate-heroes.ts",
      marker: "// @scaffold:detailScenes — new detail/interior scene prompts go here (see docs/ADD_CITY.md)",
      payload: detailScene,
      label: "DETAIL_SCENES"
    }
  ];
  applyPatches(patches);

  console.log("\n[scaffold-city] done. Next steps:");
  console.log("  1. npx tsc --noEmit                           # confirm types are clean");
  console.log(`  2. WN_HERO_VARIANT=all WN_HERO_LIMIT=3 npx tsx src/scripts/generate-heroes.ts   # render hero/shoulder/detail for ${profile.slug}`);
  console.log("  3. npx tsx src/scripts/build-hero-manifest.ts # refresh the gallery manifest");
  console.log("  4. npx tsx src/scripts/batch-research.ts      # populate AI events for the new active months");
}

main();
