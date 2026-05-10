/**
 * Generate hero images for every destination via gpt-image-2.
 *
 * Three variants per city:
 *  - "peak"     → the canonical season/scene (default, written as {slug}.png)
 *  - "shoulder" → off-peak / contrasting season ({slug}-shoulder.png)
 *  - "detail"   → an intimate venue/interior shot ({slug}-detail.png)
 *
 * Usage:
 *   npx tsx src/scripts/generate-heroes.ts                                 # peak only, missing
 *   WN_HERO_VARIANT=shoulder npx tsx src/scripts/generate-heroes.ts        # shoulder only
 *   WN_HERO_VARIANT=detail npx tsx src/scripts/generate-heroes.ts          # detail only
 *   WN_HERO_VARIANT=all npx tsx src/scripts/generate-heroes.ts             # all three variants
 *   WN_HERO_LIMIT=5 ... npx tsx src/scripts/generate-heroes.ts             # smoke test 5
 *   WN_HERO_FORCE=1 ... npx tsx src/scripts/generate-heroes.ts             # regenerate
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

import { DESTINATIONS } from "../data/music-travel";
import type { Destination, MonthNumber } from "../types/content";

type Variant = "peak" | "shoulder" | "detail";
const VARIANTS: Variant[] = ["peak", "shoulder", "detail"];

const OUT_DIR = path.join(process.cwd(), "public", "images", "heroes");
const CONCURRENCY = Number(process.env.WN_HERO_CONCURRENCY ?? 8);
const LIMIT = process.env.WN_HERO_LIMIT ? Number(process.env.WN_HERO_LIMIT) : Infinity;
const FORCE = process.env.WN_HERO_FORCE === "1";
const SIZE = "1536x1024";

const REQUESTED_VARIANT = (process.env.WN_HERO_VARIANT ?? "peak") as Variant | "all";
const ACTIVE_VARIANTS: Variant[] =
  REQUESTED_VARIANT === "all" ? VARIANTS : [REQUESTED_VARIANT as Variant];

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) {
  console.error("OPENAI_API_KEY missing");
  process.exit(1);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function fileFor(slug: string, variant: Variant): string {
  return variant === "peak"
    ? path.join(OUT_DIR, `${slug}.png`)
    : path.join(OUT_DIR, `${slug}-${variant}.png`);
}

function seasonHint(peakMonths: MonthNumber[]): string {
  const m = peakMonths[0] ?? 6;
  if ([12, 1, 2].includes(m)) return "winter";
  if ([3, 4, 5].includes(m)) return "spring";
  if ([6, 7, 8].includes(m)) return "summer";
  return "autumn";
}

// ──────────────────────────────────────────────────────────────────────────
// Prompt scenes per variant. Hand-tuned so each city tells a real seasonal
// story (peak vs shoulder) and adds editorial texture (detail).
// ──────────────────────────────────────────────────────────────────────────

const PEAK_SCENES: Record<string, string> = {
  ibiza:
    "a whitewashed open-air beach club with palm trees and a wooden pergola, the Mediterranean sea visible behind, sunset golden hour",
  mykonos:
    "a Cycladic whitewashed terrace at sunset, blue-and-white architecture, the Aegean sea at the horizon, cushioned daybeds, no people",
  "lisbon-portimao":
    "a yellow-tiled Lisbon hillside at golden hour, terracotta rooftops cascading toward the Tagus river, soft warm Atlantic light",
  barcelona:
    "a Modernista rooftop in Barcelona at dusk, terracotta tiles and Gaudí-inspired curves, the Mediterranean visible in the distance, soft summer light",
  berlin:
    "the exterior of a converted industrial power station in Berlin at dawn, weathered concrete and steel, fog rising off the cold ground, a single distant streetlight",
  amsterdam:
    "a narrow Amsterdam canal at blue hour, autumn leaves, leaning brick houses reflected in still water, soft mist, no people",
  london:
    "a London skyline at dusk in autumn, the Thames foreground, modern glass towers and Victorian rooftops layered together, gentle rain",
  miami:
    "a South Beach Miami art-deco hotel facade at golden hour, pastel pinks and turquoises, palm trees, ocean horizon, late-summer light",
  tulum:
    "a candlelit Tulum jungle clearing at twilight, vines and sculpted concrete, the Caribbean Sea glimpsed through palm fronds, warm winter light",
  "los-angeles":
    "the Hollywood Hills at golden hour with palm trees in silhouette and city lights starting to appear in the basin below, dry warm spring light",
  "new-york":
    "a New York rooftop at summer dusk, the Manhattan skyline beyond, brick parapets, golden Brooklyn light",
  "cape-town":
    "Camps Bay Cape Town at golden hour, Lion's Head silhouetted, palm trees lining the boulevard, Atlantic waves, warm late-summer light",
  lagos:
    "the Lagos lagoon at sunset, palm trees, the Lekki skyline glowing in the distance, warm humid December golden hour, no people",
  accra:
    "an Accra beachfront at sunset, palm trees, painted fishing boats on the sand, warm Atlantic light, December dry-season golden hour",
  paris:
    "a Haussmannian Paris rooftop at golden hour with zinc roofs and chimney pots, the Eiffel Tower visible in the distance, soft summer light",
  dubai:
    "the Dubai Marina skyline at blue hour in winter, glass towers reflecting in still water, palm trees in the foreground, dry desert clarity",
  bali:
    "a Canggu Bali clifftop at golden hour, palm trees, surfers in the distance, terraced rice fields below, warm dry-season light",
  marbella:
    "a Marbella beachfront at golden hour, white-washed walls and palm trees, super-yachts in the marina beyond, soft Costa del Sol summer light",
  split:
    "a Dalmatian coast island terrace at sunset with stone walls and pine trees, the Adriatic sea calm beyond, warm summer Croatian light",
  malta:
    "a limestone Maltese harbor at golden hour, sandstone fortifications and a calm cove, painted boats on the water, late summer Mediterranean light",
  montreal:
    "an old Montreal cobblestoned square at summer twilight, stone buildings, soft warm streetlights starting to glow, no people",
  toronto:
    "a Toronto waterfront at blue hour in summer, the CN Tower silhouetted, Lake Ontario calm in the foreground, warm city light reflecting on water",
  "rio-de-janeiro":
    "a Rio de Janeiro rooftop at golden hour during Carnival season, Sugarloaf Mountain in the distance, palm trees, warm late-summer Atlantic light",
  detroit:
    "an empty Detroit warehouse district at blue hour in late spring, brick facades, weathered steel, soft Midwestern dusk light, no people",
  "las-vegas":
    "the Las Vegas Strip at blue hour from a rooftop pool, palm trees in the foreground, neon signs glowing in the distance, warm desert dusk",
  marrakech:
    "a Marrakech medina rooftop at sunset, ochre terracotta walls, palm trees, the High Atlas mountains silhouetted in the distance, warm autumn light",
  courchevel:
    "a Courchevel 1850 alpine chalet exterior at twilight in winter, snow-laden pine trees, soft warm window light, distant Trois Vallées peaks under purple sky",
  verbier:
    "a Verbier alpine terrace at twilight in winter, snow on stone and timber, the Mont Fort peaks silhouetted in the distance, warm cabin light",
  ischgl:
    "a snowy Ischgl alpine village street at twilight, timber chalets with warm window light, distant Tyrolean peaks, soft winter blue hour",
  aspen:
    "an Aspen Colorado mountain street at twilight in winter, snow-laden cottonwoods, warm shop window light, distant Rocky Mountain peaks",
  tokyo:
    "a narrow Shibuya side street at night, hanging neon signs in Japanese, wet pavement reflecting magenta and cyan, soft rain, no people",
  "mexico-city":
    "a Mexico City colonial rooftop at golden hour in winter, jacaranda trees in bloom on the streets below, distant volcanoes silhouetted, warm dry-season light",
  "buenos-aires":
    "a Palermo Buenos Aires tree-lined avenue at golden hour in late summer, jacaranda trees, French-style apartment buildings, warm southern-hemisphere light",
  "sao-paulo":
    "a São Paulo rooftop at golden hour in autumn, the Avenida Paulista skyline in the distance, urban concrete and palm trees, warm late-summer light",
  "port-of-spain":
    "a Trinidad coastal hillside at sunset during Carnival season, palm trees, painted houses, the Gulf of Paria calm beyond, warm Caribbean dry-season light",
  sydney:
    "Sydney Harbour at golden hour in late summer, the iconic harbour bridge silhouetted, sandstone cliffs in the foreground, warm southern-hemisphere light",
  tbilisi:
    "an old Tbilisi Caucasus rooftop at golden hour in late summer, terracotta tiles, brick balconies, the Mtkvari river below, warm Georgian summer light",
  "tel-aviv":
    "a Tel Aviv Bauhaus rooftop at golden hour in early summer, white modernist architecture, the Mediterranean sea beyond, soft warm coastal light",
  hvar:
    "Hvar Town stone harbor at golden hour in summer, white-stone fortifications and pine trees, Adriatic boats moored, the Pakleni islands visible in the distance, warm summer light",
  reykjavik:
    "Reykjavik harbor at midnight sun in June, Mount Esja silhouetted, the iconic Sun Voyager sculpture in the foreground, soft orange-pink Arctic light, no people",
  antwerp:
    "a Belgian green field in midsummer at golden hour, distant pavilion silhouettes, lanterns strung between trees, dust catching warm late-afternoon light, no people",
  "st-barths":
    "Gustavia harbor in St. Barth at golden hour in winter, super-yachts moored against red-roofed buildings, a hillside of red-tiled villas behind, calm Caribbean Sea, warm dry-season light, no people",
  "new-orleans":
    "a French Quarter New Orleans street at golden hour, ornate iron-lace balconies, gas lamps starting to glow, cobbled pavement, warm humid spring light, no people",
  seoul:
    "Seoul Hongdae alley at 1am in late spring, neon signage glowing on rain-wet asphalt, a row of basement club entrances with painted door numbers, atmospheric blue-magenta light, no people, photographic",
  bangkok:
    "Bangkok Sukhumvit at night during the cool season, neon-lit street food carts under the elevated BTS line, motorbike taxis stopped at a red light, electric blue and pink signage reflecting on damp pavement, no people, photographic",
  goa:
    "Goa Vagator beach at sunset in December, a wooden bamboo beach shack on stilts, palm trees silhouetted against an orange-pink Arabian Sea sky, distant sound of a bassline, no people, photographic",
  melbourne:
    "Melbourne Hosier Lane at dusk in summer, painted graffiti walls glowing in the last light, narrow bluestone laneway with dim café signage, warm electric lights flickering on, no people, photographic",
  cartagena:
    "Cartagena walled city plaza at dusk in January, colonial Spanish architecture in pastel yellows and pinks, balconies with bougainvillea, soft warm light against a lavender Caribbean sky, no people, photographic"
  // @scaffold:peakScenes — new peak-season scene prompts go here (see docs/ADD_CITY.md)
};

// Off-peak / contrasting-season scene for each city. Tells the story
// "this place looks different in another month".
const SHOULDER_SCENES: Record<string, string> = {
  ibiza:
    "an empty Ibiza beach in winter, soft grey Mediterranean sky, weathered closed shutters of a beach bar, palm trees still, calm cool light, no people",
  mykonos:
    "a quiet Cycladic alley in winter, whitewashed walls and bare bougainvillea, blue-painted doors closed, soft grey Aegean light, no people",
  "lisbon-portimao":
    "a Lisbon Alfama hillside in cool foggy autumn, terracotta tiles slick with rain, soft grey Atlantic light, a yellow tram waiting at a stop, no people",
  barcelona:
    "a Gothic Quarter Barcelona alley in autumn, weathered limestone walls, fallen golden leaves on cobbles, a single warm streetlamp, soft grey light, no people",
  berlin:
    "a Kreuzberg Berlin street at dawn in deep winter, fresh snow on bare linden branches, a brutalist concrete facade, a single yellow streetlamp, fog, no people",
  amsterdam:
    "an Amsterdam canal in spring, cherry blossoms over the still water, gabled brick houses reflected, a single moored barge, soft grey-pink afternoon light, no people",
  london:
    "a foggy London terraced street in late autumn, slick pavement reflecting yellow lamps, a single black cab passing in the distance, bare plane trees, no people",
  miami:
    "a quiet South Beach pool deck at dawn in summer, empty teak loungers, pastel art-deco walls, calm tropical sea beyond, soft humid pink light, no people",
  tulum:
    "a Tulum jungle path in the wet season, lush dripping foliage, rain-soaked stone steps, soft cloudy afternoon light, no people",
  "los-angeles":
    "a quiet Mulholland Drive viewpoint at dawn in winter, the LA basin under a low marine layer, eucalyptus trees in silhouette, cool grey-pink light, no people",
  "new-york":
    "a Brooklyn brownstone street in deep winter, fresh snow on stoops, bare plane trees, a single yellow cab passing, soft grey afternoon, no people",
  "cape-town":
    "Camps Bay Cape Town in winter, dramatic stormy clouds over Lion's Head, an empty windswept beach, cool grey-blue Atlantic light, no people",
  lagos:
    "a Lagos rooftop in rainy season, palm trees in tropical downpour, the Lekki skyline obscured by mist, dramatic grey-pink humid light, no people",
  accra:
    "an Accra Jamestown street in summer, weathered colonial buildings, fishing nets drying, a single mango tree, soft humid late afternoon light, no people",
  paris:
    "a Paris cobblestone street in late autumn, plane trees with golden leaves, Haussmann facades, a single empty cafe terrace, soft grey afternoon, no people",
  dubai:
    "a Dubai desert dune at golden hour in summer, soft heat haze, a single tuft of camel grass, sand ripples in the foreground, no people",
  bali:
    "a Bali Ubud rice terrace in wet monsoon season, lush green steps, a single farmer's hut, dramatic clouds, cool humid afternoon light, no people",
  marbella:
    "a Marbella old town alley in winter, whitewashed walls and orange trees in pots, soft warm Andalusian afternoon light, no people",
  split:
    "a Split Adriatic harborfront in late winter, Diocletian's Palace stone walls, a single fishing boat moored, soft grey-pink dawn light, no people",
  malta:
    "a Valletta Malta limestone alley in winter, ornate covered balconies, soft afternoon Mediterranean light, narrow shadows, no people",
  montreal:
    "an Old Montreal cobblestone square in deep winter, fresh snow, gas lamps, stone facades, horse-drawn carriage tracks in the snow, soft blue dusk, no people",
  toronto:
    "a Toronto Distillery District cobblestone alley in winter, bare brick warehouses, fresh snow, a single string of pendant lights, soft blue dusk, no people",
  "rio-de-janeiro":
    "a Rio Ipanema beach in winter, dramatic Atlantic waves, Sugarloaf Mountain in the distance, an empty wide promenade with the iconic wave-tile pattern, soft grey-pink morning light, no people",
  detroit:
    "a Detroit downtown street in deep winter, snow on art-deco facades, a single yellow taxi passing, soft grey-blue late afternoon, bare trees, no people",
  "las-vegas":
    "a Mojave desert highway outside Las Vegas at golden hour in winter, joshua trees, cracked tarmac, a distant red rock canyon, no people",
  marrakech:
    "a Marrakech Medina alley in summer, ochre walls baking in afternoon heat, a single cat resting in shade, soft amber light, no people",
  courchevel:
    "a Courchevel alpine meadow in late summer, wildflowers in the foreground, distant snow-capped peaks, a stone hiking trail, soft warm afternoon light, no people",
  verbier:
    "a Verbier alpine pasture in late summer, cows grazing, towering peaks in the distance, soft warm afternoon light, no people",
  ischgl:
    "an Ischgl Tyrolean village street in late summer, geraniums in window boxes, timber chalets, a single hiking trail signpost, soft alpine afternoon light, no people",
  aspen:
    "an Aspen mountain wildflower meadow in late summer, distant Rocky Mountain peaks, a stone trail, soft warm afternoon light, no people",
  tokyo:
    "a Meguro river canal at golden hour during cherry blossom season, sakura petals on the water, soft pink-grey afternoon light, no people",
  "mexico-city":
    "a Roma Norte Mexico City colonial street in summer wet season, jacaranda trees, dramatic afternoon storm clouds, soft humid light, no people",
  "buenos-aires":
    "a Recoleta Buenos Aires plaza in winter, bare plane trees, soft pink-grey afternoon light, ornate French-style facades, no people",
  "sao-paulo":
    "a São Paulo Vila Madalena street in winter, graffiti murals on a long wall, soft pink afternoon light, palm trees in pots, no people",
  "port-of-spain":
    "a Trinidad Maracas Bay beach in summer rainy season, dramatic stormy clouds, palm trees, calm Caribbean sea, no people",
  sydney:
    "a Sydney Bondi to Bronte coastal walk at golden hour in winter, dramatic Pacific waves, sandstone cliffs, soft cool light, no people",
  tbilisi:
    "a Tbilisi Caucasus old town street in deep winter, fresh snow on terracotta roofs, ornate timber balconies, soft blue-grey light, no people",
  "tel-aviv":
    "a Jaffa Tel Aviv old port at golden hour in winter, ancient stone walls, dramatic Mediterranean clouds, soft cool light, no people",
  hvar:
    "a Hvar lavender field on the spine of the island in late spring, drystone walls, distant Adriatic blue, soft warm afternoon light, no people",
  reykjavik:
    "a Reykjavik street in deep winter, the Hallgrímskirkja church spire visible, fresh snow on rooftops and parked cars, soft cool blue light, no people",
  antwerp:
    "a quiet Antwerp Grote Markt in autumn, gabled stepped facades, cobblestones, a single passing tram, soft grey-pink afternoon light, no people",
  "st-barths":
    "a quiet St Barth beach in summer rainy season, palm trees in soft tropical wind, dramatic clouds, calm turquoise water, no people",
  "new-orleans":
    "a Garden District New Orleans avenue in late summer, oak trees with Spanish moss arched over the street, a single streetcar in the distance, soft humid afternoon light, no people",
  seoul:
    "Seoul Itaewon hillside in autumn afternoon light, stacked low-rise apartment blocks and convenience-store awnings, ginkgo trees turning yellow, soft overcast sky, no people",
  bangkok:
    "Bangkok temple courtyard at golden hour in late February, ornate gilded chedi against a hazy sky, frangipani trees in bloom, soft warm light, no people",
  goa:
    "Goa Anjuna paddy field in late afternoon February light, a Portuguese-era whitewashed chapel in the distance, dirt road framed by coconut palms, soft warm light, no people",
  melbourne:
    "Melbourne Royal Botanic Gardens in late February, eucalyptus trees and a calm reflective lake, distant CBD skyline, soft golden afternoon light, no people",
  cartagena:
    "Cartagena Bocagrande beachfront in late afternoon March light, palm trees casting long shadows on white sand, calm Caribbean blue water, distant Old City spires, no people"
  // @scaffold:shoulderScenes — new shoulder-season scene prompts go here (see docs/ADD_CITY.md)
};

// Intimate "texture" frame: a venue interior, a market corner, a doorway —
// the kind of detail shot that gives the gallery editorial depth.
const DETAIL_SCENES: Record<string, string> = {
  ibiza:
    "interior of a candlelit Ibiza farmhouse-style venue at night, exposed timber beams, brass and rope lamps, weathered wood tables, no people",
  mykonos:
    "interior of a Cycladic taverna at golden hour, stone walls, woven baskets, ceramic pots, a single copper pendant light, no people",
  "lisbon-portimao":
    "interior of a Lisbon fado tavern at night, weathered stone walls, a single hanging brass lamp, a Portuguese guitar leaning on a chair, soft warm shadows, no people",
  barcelona:
    "interior of a Modernista Barcelona bar with mosaic tile walls, a curved dark wood counter, a brass coffee machine, a warm ceiling pendant, no people",
  berlin:
    "interior of a Berlin underground club at first light, raw concrete floor, exposed pipes, a single plume of fog catching a beam of red light, no people",
  amsterdam:
    "interior of an Amsterdam jazz cafe, dark timber walls, a vintage upright piano, brass wall sconces, a glass of jenever on a table, warm low light, no people",
  london:
    "interior of a Soho London corner pub, dark green tile, a brass tap row, etched glass partitions, soft amber light, no people",
  miami:
    "interior of a South Beach Miami art-deco hotel lobby, terrazzo floor, palm fronds, a brass sunburst on the back wall, soft afternoon lamp light, no people",
  tulum:
    "interior of a Tulum boutique hotel suite at golden hour, stone walls, a woven hammock, a hanging brass pendant, palm shadows on the floor, no people",
  "los-angeles":
    "interior of a Hollywood Hills mid-century living room, a long teak credenza, an LP turntable, a single Eames lounger, warm afternoon light, no people",
  "new-york":
    "interior of a Brooklyn corner bar, subway-tiled walls, a long mahogany bar, brass taps, a vintage radio, warm low light, no people",
  "cape-town":
    "interior of a Cape Town wine farm tasting room at dusk, exposed beams, oak barrels stacked, a single chandelier, low warm light, no people",
  lagos:
    "interior of a Lagos Lekki rooftop bar at night, neon strip lighting, palm fronds, low-slung leather banquettes, no people",
  accra:
    "interior of an Accra rooftop lounge at night, palm fronds, low slung wicker chairs, brass pendant lights, a single conga drum on a stand, no people",
  paris:
    "interior of a Paris Marais wine bar at night, exposed limestone walls, a long zinc counter, a single chalkboard menu, warm sconce light, no people",
  dubai:
    "interior of a Dubai DIFC rooftop lounge at night, brass and dark marble, geometric latticework screens, a single oud-wood candle, no people",
  bali:
    "interior of a Bali Canggu bamboo cafe at golden hour, hanging rattan lamps, a low timber bar, palm fronds, no people",
  marbella:
    "interior of a Marbella Puerto Banus seafood restaurant at golden hour, white tile and brass fixtures, a long bar, a single bowl of olives, no people",
  split:
    "interior of a Hvar konoba stone tavern at night, candles in glass jars, exposed limestone walls, a long timber table, no people",
  malta:
    "interior of a Malta limestone-walled wine bar, vaulted stone ceiling, low candlelight, a single glass of red wine on a table, no people",
  montreal:
    "interior of a Plateau Montreal jazz club at night, exposed brick, a long zinc bar, a vintage upright piano, warm low pendant lights, no people",
  toronto:
    "interior of a Toronto Queen West cocktail bar at night, dark walnut walls, a long copper bar top, brass pendants, no people",
  "rio-de-janeiro":
    "interior of a Lapa Rio samba bar at night, painted tile walls, a wood floor, a single double bass leaning against a wall, warm low light, no people",
  detroit:
    "interior of a Detroit warehouse loft at dawn, exposed brick walls, a single pair of vintage Rotel speakers, a turntable, soft cool blue light, no people",
  "las-vegas":
    "interior of a Las Vegas Strip lounge at night, deep red velvet booths, brass fixtures, a single low pendant lamp, no people",
  marrakech:
    "interior of a Marrakech riad courtyard at golden hour, geometric tile floor, a single citrus tree in a clay pot, ornate stucco walls, soft afternoon shadows, no people",
  courchevel:
    "interior of a Courchevel chalet living room at night, a stone fireplace, sheepskin rugs, exposed timber beams, warm firelight, no people",
  verbier:
    "interior of a Verbier mountain bar at night, exposed timber walls, antlers on the wall, a single shot glass on a table, warm pendant light, no people",
  ischgl:
    "interior of a Tyrolean apres-ski hut at night, weathered timber walls, a single stein of beer, brass pendant lamps, warm low light, no people",
  aspen:
    "interior of an Aspen lodge fireplace room, exposed timber beams, leather armchairs, a single Native American rug, warm firelight, no people",
  tokyo:
    "interior of a Shinjuku Golden Gai bar at night, dark wood walls, a single bottle of whisky, brass taps, warm low light, no people",
  "mexico-city":
    "interior of a Mexico City mezcal cantina at night, painted tile walls, a single bottle on a wooden bar, warm low pendant light, no people",
  "buenos-aires":
    "interior of a Palermo Buenos Aires milonga at night, dark wood floor, a single empty pair of tango shoes on a chair, warm pendant light, no people",
  "sao-paulo":
    "interior of a São Paulo Pinheiros samba bar at night, dark wood walls, a single tambourine on a table, warm low pendant light, no people",
  "port-of-spain":
    "interior of a Port of Spain Carnival mas camp during the day, hand-feathered headdresses on stands, sequins on tables, no people",
  sydney:
    "interior of a Sydney Surry Hills cocktail bar at night, dark walnut walls, a single brass tap, ferns in pots, warm low light, no people",
  tbilisi:
    "interior of a Tbilisi natural wine cellar at night, stone walls, qvevri amphorae buried in the floor, a single candle, no people",
  "tel-aviv":
    "interior of a Tel Aviv Florentin natural wine bar at night, exposed stone walls, a single low pendant lamp, brass tap, no people",
  hvar:
    "interior of a Hvar Town stone konoba at night, vaulted limestone ceiling, candlelight, a single bottle of Vis red wine on a wooden table, no people",
  reykjavik:
    "interior of a Reykjavik downtown café, bare wood walls, woolen blankets folded on bench seats, a single ceramic coffee cup steaming, soft warm low light, no people",
  antwerp:
    "interior of an Antwerp diamond-district cocktail bar at night, dark walnut walls, brass fixtures, a single low pendant lamp casting warm amber pools, no people",
  "st-barths":
    "interior of a St Barth beachfront lounge at golden hour, white-rope ceiling, brass fixtures, a single lit candle on a low table, soft warm Caribbean light, no people",
  "new-orleans":
    "interior of a Frenchmen Street New Orleans jazz club at night, exposed brick walls, a brass tuba on a stand, soft amber pendant lights, no people",
  seoul:
    "interior of a Seoul basement club at night, mirrored disco ball spinning above an empty wooden dancefloor, neon-lit Korean signage on the wall, low golden lighting, no people",
  bangkok:
    "interior of a Bangkok rooftop bar at night, brass bar fittings, a single cocktail under a pendant lamp, city skyline blurred in the background through floor-to-ceiling glass, no people",
  goa:
    "interior of a Goa beach club at golden hour, low rattan furniture, a single coconut and a vinyl record on a wooden table, sun-bleached cushions, no people",
  melbourne:
    "interior of a Melbourne dive bar at night, exposed brick wall with vintage band posters, a single bottle of beer on a worn wooden bar, low pendant lighting, no people",
  cartagena:
    "interior of a Cartagena Getsemaní bar at night, brass ceiling fan, a single mojito on a rough-hewn wooden bar, faded Cuban poster on a peeling-paint wall, low golden light, no people"
  // @scaffold:detailScenes — new detail/interior scene prompts go here (see docs/ADD_CITY.md)
};

const SCENES_FOR_VARIANT: Record<Variant, Record<string, string>> = {
  peak: PEAK_SCENES,
  shoulder: SHOULDER_SCENES,
  detail: DETAIL_SCENES
};

const STYLE_SUFFIX = [
  "Style: shot on Mamiya 645 with Kodak Portra 400 film, slight grain, warm midtones, deep shadows, subtle lens flare, editorial documentary photography.",
  "Strict constraints: no people, no faces, no signage with English brand names, no logos, no readable text, no illustrated style, no AI artifacts.",
  "Mood: solitary, atmospheric, slightly cinematic, like a single frame from a high-end travel publication."
].join(" ");

function buildPrompt(destination: Destination, variant: Variant): string {
  const scene =
    SCENES_FOR_VARIANT[variant][destination.slug] ??
    `a representative scene of ${destination.city}, ${destination.country}`;
  const season = variant === "peak" ? seasonHint(destination.peakMonths) : "soft natural";
  const lead =
    variant === "peak"
      ? `Editorial travel photograph of ${destination.city}, ${destination.country}.`
      : variant === "shoulder"
        ? `Editorial travel photograph of ${destination.city}, ${destination.country}, shot during the off-peak / shoulder season.`
        : `Editorial close-up photograph from ${destination.city}, ${destination.country}, an intimate venue or street scene.`;

  return [
    lead,
    `Subject: ${scene}.`,
    `Light: ${season}, soft natural cinematic lighting, atmospheric depth.`,
    STYLE_SUFFIX
  ].join(" ");
}

type Task = { destination: Destination; variant: Variant };

async function generate(task: Task): Promise<{ ok: true; bytes: number; ms: number } | { ok: false; error: string }> {
  const startedAt = Date.now();
  const prompt = buildPrompt(task.destination, task.variant);
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt,
        size: SIZE,
        quality: "high",
        n: 1
      })
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${txt.slice(0, 200)}` };
    }
    const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) return { ok: false, error: "no image data" };
    const buf = Buffer.from(b64, "base64");
    fs.writeFileSync(fileFor(task.destination.slug, task.variant), buf);
    return { ok: true, bytes: buf.length, ms: Date.now() - startedAt };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  const tasks: Task[] = [];
  for (const d of DESTINATIONS) {
    for (const v of ACTIVE_VARIANTS) {
      if (!FORCE && fs.existsSync(fileFor(d.slug, v))) continue;
      tasks.push({ destination: d, variant: v });
    }
  }
  const planned = LIMIT === Infinity ? tasks : tasks.slice(0, LIMIT);
  const total = DESTINATIONS.length * ACTIVE_VARIANTS.length;

  console.log(
    `[plan] tasks: ${planned.length}/${total}  variants: ${ACTIVE_VARIANTS.join(",")}  concurrency: ${CONCURRENCY}  size: ${SIZE}`
  );
  if (planned.length === 0) {
    console.log("[plan] nothing to do — every variant already exists. Use WN_HERO_FORCE=1 to regenerate.");
    return;
  }

  const startedAt = Date.now();
  let cursor = 0;
  let completed = 0;
  let succeeded = 0;
  let failed = 0;

  async function worker(workerId: number) {
    while (true) {
      const idx = cursor++;
      if (idx >= planned.length) return;
      const task = planned[idx];
      const result = await generate(task);
      completed++;
      const label = `${task.destination.slug}/${task.variant}`;
      if (result.ok) {
        succeeded++;
        console.log(
          `[${completed.toString().padStart(3)}/${planned.length}] w${workerId} OK   ${label.padEnd(28)}  ${(result.ms / 1000).toFixed(0)}s  ${(result.bytes / 1024).toFixed(0)} KB`
        );
      } else {
        failed++;
        console.log(
          `[${completed.toString().padStart(3)}/${planned.length}] w${workerId} FAIL ${label.padEnd(28)}  ${result.error.slice(0, 140)}`
        );
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, planned.length) }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
  console.log(`\n[done] ${succeeded}/${planned.length} ok, ${failed} failed, ${elapsed}s wall-clock`);
}

void main();
