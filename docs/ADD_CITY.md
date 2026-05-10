# Adding a new city

This is the canonical playbook for adding a destination to where next. Most of
the work is captured in a single JSON profile under `city-profiles/`; the rest
is automated.

## TL;DR

1. **Author the profile**

   ```bash
   cp city-profiles/_template.json city-profiles/your-slug.json
   # fill in every TODO field
   ```

2. **Patch the data files**

   ```bash
   npx tsx src/scripts/scaffold-city.ts city-profiles/your-slug.json --apply
   ```

3. **Render hero images** (peak + shoulder + detail)

   ```bash
   WN_HERO_VARIANT=all WN_HERO_LIMIT=3 \
     npx tsx src/scripts/generate-heroes.ts
   ```

4. **Refresh the gallery manifest**

   ```bash
   npx tsx src/scripts/build-hero-manifest.ts
   ```

5. **Populate AI-researched events**

   ```bash
   npx tsx src/scripts/batch-research.ts
   ```

   The runner skips any (city, month) pair that's already approved, so this
   is safe to re-run after the full launch corpus.

6. **Verify**

   ```bash
   npx tsc --noEmit
   npm run lint
   npm run dev   # eyeball /destinations/your-slug
   ```

That's it. Total wall-clock for a single city is roughly **15 minutes** of
human work plus **20 minutes** waiting on hero generation and AI research.

---

## Why a JSON profile?

Every city needs the same six things: a `Destination`, a few `Venues`, a few
`EventBlueprint` seeds, a one-liner peak hook, three editorial scene prompts
for the hero gallery, and AI-researched events for each active month.

The JSON profile is the single source of truth for everything *except* the AI
events (which are generated separately and reviewed before going live).

The scaffold script reads the profile and patches the four canonical data
files in place using `// @scaffold:*` anchor markers:

| File                                | What's appended                          |
| ----------------------------------- | ---------------------------------------- |
| `src/data/music-travel.ts`          | `DESTINATIONS`, `VENUES`, `peakHook`     |
| `src/data/event-blueprints.ts`      | `EVENT_BLUEPRINTS[slug]`                 |
| `src/scripts/generate-heroes.ts`    | `PEAK_SCENES`, `SHOULDER_SCENES`, `DETAIL_SCENES` |

Each marker survives the patch, so the script stays idempotent across many
city additions.

---

## Profile schema

See `city-profiles/_template.json` for an annotated template. The minimum
required fields:

| Field                  | Type            | Notes                                                                 |
| ---------------------- | --------------- | --------------------------------------------------------------------- |
| `slug`                 | kebab-case      | Stable identifier — also the route segment, image filename, etc.       |
| `city`                 | string          | Display name.                                                          |
| `country`              | string          | Country name.                                                          |
| `region`               | enum            | `Africa | Asia | Europe | Middle East | North America | Oceania | South America` |
| `coordinates`          | `{lat,lng}`     | Used for the world map marker.                                         |
| `tagline`              | string          | One-sentence card eyebrow (≤ 100 chars).                               |
| `summary`              | string          | 1–3 sentences on the destination guide hero.                           |
| `activeMonths`         | `number[1..12]` | When music travel is materially worth it.                              |
| `peakMonths`           | subset          | When programming is at its absolute strongest.                         |
| `genres`               | enum[]          | `afro-house | amapiano | house | techno | electronic | hip-hop | r-and-b | latin | jazz | pop | festival` |
| `vibes`                | enum[]          | `beach | luxury | underground | festival | city | cultural | group-trip | late-night` |
| `budget`               | enum            | `low | medium | high | luxury`                                        |
| `averageDailySpendUsd` | `{low,high}`    | Per-person daily spend range.                                          |
| `whoFor`               | string[]        | 2–4 audience phrases.                                                  |
| `whenToBook`           | string          | One-sentence lead-time guidance.                                       |
| `travelNotes`          | string          | Airports, neighborhoods, transport quirks.                             |
| `peakHook`             | string          | One sentence on why the peak month(s) matter — shows on the row card.  |
| `heroScenes`           | `{peak,shoulder,detail}` | Editorial scene descriptions used as image prompts (see below). |
| `venues`               | `Venue[]`       | 2–4 anchor rooms / festivals (see schema in template).                 |
| `blueprints`           | `EventBlueprint[]` | 2–4 seed events that show up before AI research runs (see template). |

The scaffold script **validates every field** against the canonical types
before touching disk. Validation errors are listed up front so you don't get
a half-applied patch.

### Hero scene prompts

`heroScenes` powers the on-disk hero images at
`public/images/heroes/{slug}.png`, `{slug}-shoulder.png`, `{slug}-detail.png`.

Each scene is a one-sentence editorial description that's spliced into the
GPT-image-2 prompt template in `src/scripts/generate-heroes.ts`. Conventions:

- No people, no faces, no readable signage.
- Photographic, single frame, atmospheric.
- The `peak` scene should evoke the city at its most music-tourism-relevant moment.
- The `shoulder` scene should look *deliberately* different — same place, off-peak — so the gallery cycles between distinct moods.
- The `detail` scene is interior or close-up — a venue, a doorway, a market stall — for editorial depth in the destination guide gallery.

### Event blueprints vs. AI events

Event blueprints are **hand-curated seeds**. They guarantee that even on day
one (before the AI batch runs) the destination guide has at least 2–3
real-feeling events. Once the AI research pipeline runs, AI-approved events
take priority for any (slug, month) where AI returned at least one event;
blueprints survive as a graceful fallback for AI-empty months.

This means it's fine to keep blueprints minimal — pick the obvious anchors
(the festival, the residency, the carnival) and let the AI fill in the rest.

---

## Step-by-step (verbose version)

### 1. Author the profile

```bash
cp city-profiles/_template.json city-profiles/marrakech.json
$EDITOR city-profiles/marrakech.json
```

Replace every `TODO-*` value. See `city-profiles/hvar.json` for a full
worked example.

### 2. Validate without writing

```bash
npx tsx src/scripts/scaffold-city.ts city-profiles/marrakech.json
```

Without `--apply`, the script prints the snippets it would insert into
each file and exits. Use this to sanity-check the formatting and field
choices before any disk writes.

### 3. Patch the files

```bash
npx tsx src/scripts/scaffold-city.ts city-profiles/marrakech.json --apply
```

The script will refuse if the slug is already present in
`src/data/music-travel.ts`, so re-running is safe.

### 4. Generate hero imagery

```bash
WN_HERO_VARIANT=all npx tsx src/scripts/generate-heroes.ts
```

The runner only generates images that don't already exist on disk, so it's
also safe to re-run. To regenerate a specific slug, delete the file first or
set `WN_HERO_FORCE=1`.

Approximate cost per city: 3 variants × ~$0.13 = **~$0.40 in API spend**,
~3 minutes wall-clock at concurrency=8.

### 5. Refresh the manifest

```bash
npx tsx src/scripts/build-hero-manifest.ts
```

This scans `public/images/heroes/` and writes
`src/data/generated/hero-manifest.json`, which the gallery component reads
to know which variants exist for each slug.

### 6. Populate AI events

```bash
npx tsx src/scripts/batch-research.ts
```

The runner walks every (destination, activeMonth) pair, calls
`refreshEvents`, saves a draft, and atomically approves it. It skips any
pair that's already approved, so adding one new city only researches *that*
city's months.

Approximate cost per city: ~6 active months × ~12 search calls × $0.04 ≈
**~$3 in API spend**, ~5 minutes at concurrency=6.

Set `OPENAI_API_KEY` in `.env.local` before running.

### 7. Verify

```bash
npx tsc --noEmit && npm run lint
npm run dev
```

Open `http://localhost:3000/destinations/marrakech` and confirm:
- Hero image is the new generated PNG (peak variant).
- Score appears for the active months.
- Events list shows blueprint seeds + AI-approved entries.
- Gallery shoulder/detail variants cycle correctly.
- Map marker is in the right place.

Commit `city-profiles/your-slug.json`, the patched data files, the new
hero PNGs, the updated `hero-manifest.json`, and any new draft files under
`src/data/generated/drafts/events/`.

---

## Troubleshooting

**"could not find anchor marker"**
The scaffold script relies on `// @scaffold:*` markers in the data files.
If they were accidentally deleted, restore them from git history. Each
marker is a single line immediately before a `]` or `}` closing.

**"slug ... is already present"**
You're trying to add a city that's already in the dataset. If you want to
edit fields, hand-edit the destination object in `src/data/music-travel.ts`
or revert the existing entry first.

**"profile failed validation"**
The error message lists every issue. Common ones: missing region from the
allowed list, peakMonths that aren't a subset of activeMonths, blueprint
referencing a venueId that isn't defined, missing heroScene fields.

**Hero generation fails with HTTP 400**
The scene prompt mentions a brand name or readable text. Edit `heroScenes`
in the profile, re-run scaffold, then `WN_HERO_FORCE=1 npx tsx
src/scripts/generate-heroes.ts` to regenerate.

**AI batch returns 0 events for an active month**
That's fine — the curated event blueprints stay as a fallback. If you want
to retry, delete the draft file at
`src/data/generated/drafts/events/{slug}-{year}-{month}.json` and re-run
`batch-research.ts`.

---

## File map

```
city-profiles/
├── _template.json          ← annotated profile template
├── hvar.json               ← worked example
├── reykjavik.json          ← worked example
├── antwerp.json            ← worked example
├── st-barths.json          ← worked example
└── new-orleans.json        ← worked example

src/scripts/
├── scaffold-city.ts        ← validates + patches data files from a profile
├── generate-heroes.ts      ← renders hero/shoulder/detail PNGs
├── build-hero-manifest.ts  ← scans heroes dir → hero-manifest.json
├── batch-research.ts       ← AI events for every active (city, month)
└── rerun-empty.ts          ← retry AI batch for slugs that returned 0 events

src/data/
├── music-travel.ts         ← DESTINATIONS, VENUES, peakHook (scaffold patches)
├── event-blueprints.ts     ← EVENT_BLUEPRINTS (scaffold patches)
└── generated/
    ├── approved-events.json     ← full AI overlay (admin/audit)
    ├── approved-events.slim.json← runtime overlay (loaded at boot)
    ├── hero-manifest.json       ← which {slug}-{variant}.png exist
    └── drafts/                  ← per-(slug,month) raw envelopes
```
