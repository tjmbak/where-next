/**
 * Scan public/images/heroes/ and write src/data/generated/hero-manifest.json
 * listing which (slug, variant) hero files actually exist on disk.
 *
 * The runtime helpers in src/lib/hero-images.ts read this manifest to
 * gracefully fall back to the canonical peak hero when a shoulder/detail
 * image hasn't been generated yet.
 *
 * Usage:
 *   npx tsx src/scripts/build-hero-manifest.ts
 */
import fs from "node:fs";
import path from "node:path";

const HERO_DIR = path.join(process.cwd(), "public", "images", "heroes");
const OUT_DIR = path.join(process.cwd(), "src", "data", "generated");
const OUT_FILE = path.join(OUT_DIR, "hero-manifest.json");

if (!fs.existsSync(HERO_DIR)) {
  console.error(`[hero-manifest] missing ${HERO_DIR}`);
  process.exit(1);
}
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs.readdirSync(HERO_DIR).filter((f) => f.endsWith(".png"));

const shoulder = new Set<string>();
const detail = new Set<string>();

for (const f of files) {
  const m = /^([a-z0-9-]+?)(?:-(shoulder|detail))?\.png$/i.exec(f);
  if (!m) continue;
  const [, slug, variant] = m;
  if (variant === "shoulder") shoulder.add(slug);
  else if (variant === "detail") detail.add(slug);
}

const manifest = {
  shoulder: Array.from(shoulder).sort(),
  detail: Array.from(detail).sort(),
  generatedAt: new Date().toISOString()
};

fs.writeFileSync(OUT_FILE, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(
  `[hero-manifest] wrote ${manifest.shoulder.length} shoulder + ${manifest.detail.length} detail entries → ${path.relative(process.cwd(), OUT_FILE)}`
);
