import type {
  Budget,
  CurationSource,
  Destination,
  DiscoveryFilters,
  Event,
  EventType,
  Genre,
  MonthNumber,
  MonthlyDestinationScore,
  Venue
} from "@/types/content";
import APPROVED_EVENTS_RAW from "./generated/approved-events.slim.json";
import { EVENT_BLUEPRINTS } from "./event-blueprints";

// The slim file is the public/runtime overlay (admin metadata stripped).
// Admin tooling (`src/lib/research/draft-store.ts`) reads the full
// `approved-events.json` from disk for review and audit.
type ApprovedEventEntry = {
  slug: string;
  month: MonthNumber;
  events: Array<{
    id: string;
    title: string;
    type: EventType;
    startDate: string;
    endDate: string | null;
    importance: number;
    venueId: string | null;
    sourceUrl: string;
    ticketUrl: string | null;
    summary: string;
    genres: Genre[];
  }>;
};

const APPROVED_EVENTS = APPROVED_EVENTS_RAW as unknown as ApprovedEventEntry[];

export const DESTINATIONS: Destination[] = [
  {
    slug: "ibiza",
    city: "Ibiza",
    country: "Spain",
    region: "Europe",
    coordinates: { lat: 38.9067, lng: 1.4206 },
    tagline: "Peak club season, beach clubs, and global house residencies.",
    summary:
      "Ibiza remains the reference point for music-led summer travel, with superclubs, beach clubs, promoter brands, and sunrise-to-late-night itineraries packed into a compact island.",
    heroImage: "/images/heroes/ibiza.png",
    activeMonths: [5, 6, 7, 8, 9, 10],
    peakMonths: [7, 8, 9],
    genres: ["house", "techno", "afro-house", "electronic"],
    vibes: ["beach", "luxury", "late-night", "group-trip"],
    budget: "luxury",
    averageDailySpendUsd: { low: 260, high: 700 },
    whoFor: ["House and techno fans", "Group trips", "Beach club travelers", "Late-night planners"],
    whenToBook: "Book stays and headline nights 8-12 weeks ahead for July and August.",
    travelNotes: "The island is expensive in peak months, so shoulder-season May, June, September, and October can be better value."
  },
  {
    slug: "mykonos",
    city: "Mykonos",
    country: "Greece",
    region: "Europe",
    coordinates: { lat: 37.4467, lng: 25.3289 },
    tagline: "Cycladic luxury, beach clubs, and sunset-led dance programming.",
    summary:
      "Mykonos pairs high-end island travel with beach clubs, sunset sessions, and destination dance lineups across the summer season.",
    heroImage: "/images/heroes/mykonos.png",
    activeMonths: [6, 7, 8, 9],
    peakMonths: [7, 8],
    genres: ["house", "afro-house", "electronic"],
    vibes: ["beach", "luxury", "group-trip"],
    budget: "luxury",
    averageDailySpendUsd: { low: 280, high: 850 },
    whoFor: ["Luxury beach groups", "Afro-house fans", "Sunset session travelers"],
    whenToBook: "Book villas, beach clubs, and ferries early for July and August.",
    travelNotes: "Mykonos works best when travelers plan venues and transport before arrival."
  },
  {
    slug: "lisbon-portimao",
    city: "Lisbon / Portimao",
    country: "Portugal",
    region: "Europe",
    coordinates: { lat: 38.7223, lng: -9.1393 },
    tagline: "City culture, Atlantic coast festivals, and Afro-diaspora music moments.",
    summary:
      "Lisbon and the Algarve combine city nightlife with major festival travel, especially for afrobeats, amapiano, electronic music, and summer beach trips.",
    heroImage: "/images/heroes/lisbon-portimao.png",
    activeMonths: [5, 6, 7, 8, 9],
    peakMonths: [6, 7],
    genres: ["afro-house", "amapiano", "electronic", "festival", "house"],
    vibes: ["festival", "beach", "city", "group-trip"],
    budget: "medium",
    averageDailySpendUsd: { low: 130, high: 360 },
    whoFor: ["Festival travelers", "Afrobeats and amapiano fans", "Mixed city and beach trips"],
    whenToBook: "Book Algarve stays early around major festival weekends.",
    travelNotes: "Lisbon is a strong base, but Algarve festival weekends require separate transport planning."
  },
  {
    slug: "barcelona",
    city: "Barcelona",
    country: "Spain",
    region: "Europe",
    coordinates: { lat: 41.3874, lng: 2.1686 },
    tagline: "Beach city energy, Primavera season, and electronic weekender gravity.",
    summary:
      "Barcelona is one of Europe’s best music-travel hybrids, combining major festivals, beach access, club programming, and neighborhoods that support full-week itineraries.",
    heroImage: "/images/heroes/barcelona.png",
    activeMonths: [5, 6, 7, 8, 9],
    peakMonths: [6],
    genres: ["festival", "electronic", "house", "techno", "pop"],
    vibes: ["city", "beach", "festival", "late-night"],
    budget: "high",
    averageDailySpendUsd: { low: 170, high: 420 },
    whoFor: ["Festival travelers", "Beach city groups", "Electronic fans"],
    whenToBook: "Book around Primavera and Sonar-style weeks as soon as lineups are confirmed.",
    travelNotes: "Central stays make the city easy, but beach and festival venues can pull you across town."
  },
  {
    slug: "berlin",
    city: "Berlin",
    country: "Germany",
    region: "Europe",
    coordinates: { lat: 52.52, lng: 13.405 },
    tagline: "Underground club culture and year-round techno gravity.",
    summary:
      "Berlin is less seasonal than island destinations, but its club culture, labels, record shops, and experimental programming make it a reliable music-first city trip.",
    heroImage: "/images/heroes/berlin.png",
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    peakMonths: [5, 6, 9, 10],
    genres: ["techno", "electronic", "house"],
    vibes: ["underground", "city", "late-night", "cultural"],
    budget: "medium",
    averageDailySpendUsd: { low: 130, high: 320 },
    whoFor: ["Techno travelers", "Underground club fans", "Record shop and label heads"],
    whenToBook: "Book flexible weekends and leave space for late lineups and door policies.",
    travelNotes: "The best Berlin trips are not over-scheduled; plan neighborhoods and backup nights."
  },
  {
    slug: "amsterdam",
    city: "Amsterdam",
    country: "Netherlands",
    region: "Europe",
    coordinates: { lat: 52.3676, lng: 4.9041 },
    tagline: "ADE, dance music infrastructure, and compact city clubbing.",
    summary:
      "Amsterdam peaks around dance music conference season, but remains strong for electronic programming, canal-side city breaks, and club weekends.",
    heroImage: "/images/heroes/amsterdam.png",
    activeMonths: [4, 5, 6, 7, 8, 9, 10],
    peakMonths: [10],
    genres: ["electronic", "house", "techno", "festival"],
    vibes: ["city", "festival", "late-night"],
    budget: "high",
    averageDailySpendUsd: { low: 180, high: 430 },
    whoFor: ["Electronic music fans", "Conference week travelers", "Compact weekend planners"],
    whenToBook: "Book very early for ADE week and major summer festival weekends.",
    travelNotes: "The city is compact, but hotel pricing spikes sharply during flagship event weeks."
  },
  {
    slug: "london",
    city: "London",
    country: "United Kingdom",
    region: "Europe",
    coordinates: { lat: 51.5072, lng: -0.1276 },
    tagline: "Always-on club culture, festivals, and global touring density.",
    summary:
      "London is a year-round music capital with festival weekends, club systems, jazz, grime, amapiano, afro-house, and arena-scale touring in constant rotation.",
    heroImage: "/images/heroes/london.png",
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    peakMonths: [6, 7, 8],
    genres: ["electronic", "house", "techno", "hip-hop", "jazz", "amapiano"],
    vibes: ["city", "cultural", "late-night", "festival"],
    budget: "high",
    averageDailySpendUsd: { low: 190, high: 500 },
    whoFor: ["Genre explorers", "Big city travelers", "Festival and club hybrids"],
    whenToBook: "Book headline shows and summer hotels early; keep smaller club nights flexible.",
    travelNotes: "London rewards neighborhood planning because venues can be far apart late at night."
  },
  {
    slug: "miami",
    city: "Miami",
    country: "United States",
    region: "North America",
    coordinates: { lat: 25.7617, lng: -80.1918 },
    tagline: "Winter sun, Miami Music Week, Art Basel parties, and Latin-Caribbean energy.",
    summary:
      "Miami is a music-travel anchor for electronic, Latin, hip-hop, and luxury nightlife, with strong peaks around March and December.",
    heroImage: "/images/heroes/miami.png",
    activeMonths: [1, 2, 3, 4, 5, 10, 11, 12],
    peakMonths: [3, 12],
    genres: ["electronic", "house", "latin", "hip-hop"],
    vibes: ["beach", "luxury", "city", "late-night"],
    budget: "luxury",
    averageDailySpendUsd: { low: 260, high: 760 },
    whoFor: ["Electronic travelers", "Luxury nightlife groups", "Winter sun seekers"],
    whenToBook: "Book far ahead for Miami Music Week and Art Basel week.",
    travelNotes: "Distances and surge pricing can be intense, so cluster plans by South Beach, Wynwood, or downtown."
  },
  {
    slug: "tulum",
    city: "Tulum",
    country: "Mexico",
    region: "North America",
    coordinates: { lat: 20.2114, lng: -87.4654 },
    tagline: "Jungle venues, beach season, and January electronic pilgrimages.",
    summary:
      "Tulum has become a winter destination for dance music travelers, mixing jungle venues, beach clubs, boutique hotels, and long-form electronic programming.",
    heroImage: "/images/heroes/tulum.png",
    activeMonths: [1, 2, 3, 11, 12],
    peakMonths: [1],
    genres: ["afro-house", "house", "electronic", "techno"],
    vibes: ["beach", "luxury", "late-night", "group-trip"],
    budget: "high",
    averageDailySpendUsd: { low: 210, high: 650 },
    whoFor: ["Winter dance travelers", "Beach and jungle venue fans", "Group trips"],
    whenToBook: "Book January stays and headline parties months ahead.",
    travelNotes: "Tulum is logistically spread out; transport and hotel location matter."
  },
  {
    slug: "los-angeles",
    city: "Los Angeles",
    country: "United States",
    region: "North America",
    coordinates: { lat: 34.0522, lng: -118.2437 },
    tagline: "Touring density, warehouse parties, Coachella orbit, and label culture.",
    summary:
      "Los Angeles is a year-round music base with strong April pull from Coachella-adjacent travel, plus clubs, warehouses, live venues, and industry showcases.",
    heroImage: "/images/heroes/los-angeles.png",
    activeMonths: [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12],
    peakMonths: [4, 10],
    genres: ["electronic", "hip-hop", "r-and-b", "pop", "festival"],
    vibes: ["city", "festival", "late-night", "cultural"],
    budget: "high",
    averageDailySpendUsd: { low: 220, high: 600 },
    whoFor: ["Live music travelers", "Electronic and warehouse fans", "Coachella week planners"],
    whenToBook: "Book April and major arena weekends early, especially if adding Palm Springs.",
    travelNotes: "LA needs area planning because cross-city travel can dominate the night."
  },
  {
    slug: "new-york",
    city: "New York",
    country: "United States",
    region: "North America",
    coordinates: { lat: 40.7128, lng: -74.006 },
    tagline: "Always-on scenes across clubs, jazz rooms, arenas, and summer festivals.",
    summary:
      "New York is a dense music city with year-round depth across Brooklyn clubs, jazz institutions, hip-hop, pop touring, and outdoor summer programming.",
    heroImage: "/images/heroes/new-york.png",
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    peakMonths: [6, 7, 9],
    genres: ["house", "techno", "hip-hop", "jazz", "r-and-b", "pop"],
    vibes: ["city", "cultural", "underground", "late-night"],
    budget: "luxury",
    averageDailySpendUsd: { low: 250, high: 750 },
    whoFor: ["City music travelers", "Jazz and club fans", "Big-show planners"],
    whenToBook: "Book hotels early for summer weekends and major arena runs.",
    travelNotes: "Brooklyn and Manhattan can feel like different trips, so plan by neighborhood."
  },
  {
    slug: "cape-town",
    city: "Cape Town",
    country: "South Africa",
    region: "Africa",
    coordinates: { lat: -33.9249, lng: 18.4241 },
    tagline: "Southern hemisphere summer, beach energy, and Afro-electronic scenes.",
    summary:
      "Cape Town turns on during southern hemisphere summer, with outdoor parties, beach culture, electronic programming, and gateway access to wider South African music travel.",
    heroImage: "/images/heroes/cape-town.png",
    activeMonths: [1, 2, 3, 11, 12],
    peakMonths: [12, 1],
    genres: ["afro-house", "amapiano", "house", "electronic"],
    vibes: ["beach", "cultural", "group-trip", "city"],
    budget: "medium",
    averageDailySpendUsd: { low: 110, high: 330 },
    whoFor: ["December sun seekers", "Afro-house fans", "Outdoor party travelers"],
    whenToBook: "Book December and early January stays well ahead.",
    travelNotes: "Plan transport carefully for late nights and spread-out coastal venues."
  },
  {
    slug: "lagos",
    city: "Lagos",
    country: "Nigeria",
    region: "Africa",
    coordinates: { lat: 6.5244, lng: 3.3792 },
    tagline: "Detty December, afrobeats gravity, and high-energy nightlife.",
    summary:
      "Lagos peaks in December when diaspora travel, afrobeats concerts, club nights, beach events, and private parties turn the city into a music capital.",
    heroImage: "/images/heroes/lagos.png",
    activeMonths: [11, 12, 1],
    peakMonths: [12],
    genres: ["afro-house", "amapiano", "hip-hop", "r-and-b", "festival"],
    vibes: ["cultural", "late-night", "group-trip", "city"],
    budget: "high",
    averageDailySpendUsd: { low: 150, high: 480 },
    whoFor: ["Afrobeats travelers", "Diaspora December trips", "High-energy nightlife groups"],
    whenToBook: "Book December flights, stays, and tables early.",
    travelNotes: "Local knowledge matters; curated recommendations and trusted transport are key."
  },
  {
    slug: "accra",
    city: "Accra",
    country: "Ghana",
    region: "Africa",
    coordinates: { lat: 5.6037, lng: -0.187 },
    tagline: "December festivals, diaspora travel, beach days, and afrobeats nightlife.",
    summary:
      "Accra is a major December music-travel destination, balancing festivals, beach clubs, nightlife, art, food, and diaspora-led cultural programming.",
    heroImage: "/images/heroes/accra.png",
    activeMonths: [11, 12, 1],
    peakMonths: [12],
    genres: ["afro-house", "amapiano", "hip-hop", "r-and-b", "festival"],
    vibes: ["cultural", "beach", "group-trip", "late-night"],
    budget: "high",
    averageDailySpendUsd: { low: 140, high: 430 },
    whoFor: ["December culture travelers", "Afrobeats fans", "Diaspora groups"],
    whenToBook: "Book peak December dates months ahead.",
    travelNotes: "Accra works best when events, neighborhoods, and beach days are planned together."
  },
  {
    slug: "paris",
    city: "Paris",
    country: "France",
    region: "Europe",
    coordinates: { lat: 48.8566, lng: 2.3522 },
    tagline: "Fashion weeks, arena tours, jazz rooms, and electronic nights.",
    summary:
      "Paris blends cultural travel with music programming, especially around fashion, art, and summer outdoor events.",
    heroImage: "/images/heroes/paris.png",
    activeMonths: [2, 3, 5, 6, 7, 9, 10],
    peakMonths: [6, 9],
    genres: ["electronic", "house", "jazz", "pop", "hip-hop"],
    vibes: ["city", "cultural", "luxury"],
    budget: "high",
    averageDailySpendUsd: { low: 190, high: 520 },
    whoFor: ["Culture-led travelers", "Fashion week visitors", "Jazz and electronic fans"],
    whenToBook: "Book fashion week and summer weekends early.",
    travelNotes: "The strongest trips pair music with food, fashion, galleries, and neighborhoods."
  },
  {
    slug: "dubai",
    city: "Dubai",
    country: "United Arab Emirates",
    region: "Middle East",
    coordinates: { lat: 25.2048, lng: 55.2708 },
    tagline: "Winter season, luxury nightlife, beach clubs, and global touring stops.",
    summary:
      "Dubai’s music-travel appeal is strongest in cooler months, when beach clubs, luxury venues, festivals, and touring artists stack up.",
    heroImage: "/images/heroes/dubai.png",
    activeMonths: [1, 2, 3, 10, 11, 12],
    peakMonths: [12, 1, 2],
    genres: ["house", "afro-house", "hip-hop", "pop", "electronic"],
    vibes: ["luxury", "beach", "city", "group-trip"],
    budget: "luxury",
    averageDailySpendUsd: { low: 240, high: 800 },
    whoFor: ["Luxury nightlife travelers", "Winter sun groups", "Big-room music fans"],
    whenToBook: "Book winter weekends and New Year periods early.",
    travelNotes: "Dress codes, reservations, and table policies matter more than in many club cities."
  },
  {
    slug: "bali",
    city: "Bali",
    country: "Indonesia",
    region: "Asia",
    coordinates: { lat: -8.3405, lng: 115.092 },
    tagline: "Beach clubs, destination wellness, and sunset electronic programming.",
    summary:
      "Bali is a long-stay music-travel destination with beach clubs, sunset sets, electronic programming, and a strong social travel scene.",
    heroImage: "/images/heroes/bali.png",
    activeMonths: [5, 6, 7, 8, 9, 10],
    peakMonths: [7, 8],
    genres: ["house", "afro-house", "electronic"],
    vibes: ["beach", "group-trip", "luxury", "cultural"],
    budget: "medium",
    averageDailySpendUsd: { low: 90, high: 300 },
    whoFor: ["Long-stay travelers", "Beach club fans", "Remote-worker groups"],
    whenToBook: "Book peak dry-season stays early in Canggu, Seminyak, and Uluwatu.",
    travelNotes: "Traffic shapes the trip, so choose a base near the venues you care about."
  },
  {
    slug: "marbella",
    city: "Marbella",
    country: "Spain",
    region: "Europe",
    coordinates: { lat: 36.5101, lng: -4.8824 },
    tagline: "Mediterranean luxury, beach clubs, and summer party weekends.",
    summary:
      "Marbella is a summer luxury nightlife destination with beach clubs, day parties, and access to wider Andalusian coastal travel.",
    heroImage: "/images/heroes/marbella.png",
    activeMonths: [6, 7, 8, 9],
    peakMonths: [7, 8],
    genres: ["house", "afro-house", "hip-hop", "r-and-b"],
    vibes: ["beach", "luxury", "group-trip"],
    budget: "luxury",
    averageDailySpendUsd: { low: 240, high: 700 },
    whoFor: ["Luxury group trips", "Beach club travelers", "Summer party weekends"],
    whenToBook: "Book villas, tables, and beach clubs early for July and August.",
    travelNotes: "Marbella is less about one mega-event and more about concentrated summer lifestyle programming."
  },
  {
    slug: "split",
    city: "Split",
    country: "Croatia",
    region: "Europe",
    coordinates: { lat: 43.5081, lng: 16.4402 },
    tagline: "Adriatic festival travel, island routes, and summer electronic weekends.",
    summary:
      "Split and the Croatian coast are strong for summer festival travel, boat days, island add-ons, and electronic lineups.",
    heroImage: "/images/heroes/split.png",
    activeMonths: [6, 7, 8],
    peakMonths: [7],
    genres: ["electronic", "house", "techno", "festival"],
    vibes: ["beach", "festival", "group-trip"],
    budget: "medium",
    averageDailySpendUsd: { low: 130, high: 350 },
    whoFor: ["Festival groups", "Island-hopping travelers", "Electronic music fans"],
    whenToBook: "Book festival weeks, ferries, and coastal stays early.",
    travelNotes: "Split works well as a base for wider Croatia routes."
  },
  {
    slug: "malta",
    city: "Malta",
    country: "Malta",
    region: "Europe",
    coordinates: { lat: 35.9375, lng: 14.3754 },
    tagline: "Island festivals, boat parties, and compact Mediterranean club trips.",
    summary:
      "Malta has become a festival-led island option with a compact footprint, strong group-trip appeal, and warm-weather music programming.",
    heroImage: "/images/heroes/malta.png",
    activeMonths: [5, 6, 7, 8, 9],
    peakMonths: [6, 7],
    genres: ["festival", "house", "techno", "electronic", "hip-hop"],
    vibes: ["beach", "festival", "group-trip"],
    budget: "medium",
    averageDailySpendUsd: { low: 120, high: 330 },
    whoFor: ["Festival travelers", "Budget-conscious island groups", "Boat party fans"],
    whenToBook: "Book around festival announcements and group accommodation availability.",
    travelNotes: "The island is compact, making it easier for first-time music-trip planning."
  },
  {
    slug: "montreal",
    city: "Montreal",
    country: "Canada",
    region: "North America",
    coordinates: { lat: 45.5019, lng: -73.5674 },
    tagline: "Summer festivals, electronic institutions, jazz, and late-night city culture.",
    summary:
      "Montreal peaks in summer with outdoor festivals, electronic programming, jazz, and a compact city feel that supports long weekends.",
    heroImage: "/images/heroes/montreal.png",
    activeMonths: [5, 6, 7, 8, 9],
    peakMonths: [6, 7],
    genres: ["electronic", "house", "techno", "jazz", "festival"],
    vibes: ["city", "festival", "cultural", "late-night"],
    budget: "medium",
    averageDailySpendUsd: { low: 140, high: 340 },
    whoFor: ["Summer city travelers", "Jazz and electronic fans", "Long-weekend planners"],
    whenToBook: "Book around summer festival calendar drops.",
    travelNotes: "Montreal is ideal for travelers who want music density without huge-city friction."
  },
  {
    slug: "toronto",
    city: "Toronto",
    country: "Canada",
    region: "North America",
    coordinates: { lat: 43.6532, lng: -79.3832 },
    tagline: "Caribana, hip-hop summers, and a multicultural festival city.",
    summary:
      "Toronto's music-travel summer is anchored by Caribana — one of North America's biggest Caribbean carnivals — plus OVO Fest, Veld, and a year-round multicultural club scene that runs through Caribbean, Afrobeats, and hip-hop.",
    heroImage: "/images/heroes/toronto.png",
    activeMonths: [5, 6, 7, 8, 9],
    peakMonths: [7, 8],
    genres: ["hip-hop", "afro-house", "amapiano", "festival", "house"],
    vibes: ["festival", "city", "cultural", "group-trip"],
    budget: "medium",
    averageDailySpendUsd: { low: 150, high: 400 },
    whoFor: ["Caribana travelers", "Hip-hop and Afro-Caribbean fans", "Summer city groups"],
    whenToBook: "Book Caribana week (late July / early August) 2-3 months ahead — flights and hotels spike.",
    travelNotes: "Plan around Simcoe Day weekend — Caribana, Veld, and OVO programming all stack together."
  },
  {
    slug: "rio-de-janeiro",
    city: "Rio de Janeiro",
    country: "Brazil",
    region: "South America",
    coordinates: { lat: -22.9068, lng: -43.1729 },
    tagline: "Carnival, beach culture, funk, samba, and high-energy city travel.",
    summary:
      "Rio’s February Carnival gravity is unmatched, and the city remains compelling for beach-led music travel, samba, funk, and live culture.",
    heroImage: "/images/heroes/rio-de-janeiro.png",
    activeMonths: [1, 2, 3, 12],
    peakMonths: [2],
    genres: ["latin", "festival", "house", "hip-hop"],
    vibes: ["beach", "cultural", "festival", "group-trip"],
    budget: "medium",
    averageDailySpendUsd: { low: 100, high: 330 },
    whoFor: ["Carnival travelers", "Beach culture groups", "Latin music fans"],
    whenToBook: "Book Carnival flights and stays many months ahead.",
    travelNotes: "Safety, neighborhoods, and trusted local recommendations are essential."
  },
  {
    slug: "detroit",
    city: "Detroit",
    country: "United States",
    region: "North America",
    coordinates: { lat: 42.3314, lng: -83.0458 },
    tagline: "Techno history, Memorial Day weekend, and underground music pilgrimage.",
    summary:
      "Detroit is a music-pilgrimage city for techno fans, with a powerful May peak and deep cultural context around the origins of the sound.",
    heroImage: "/images/heroes/detroit.png",
    activeMonths: [5, 6, 9],
    peakMonths: [5],
    genres: ["techno", "house", "electronic", "festival"],
    vibes: ["underground", "cultural", "festival", "city"],
    budget: "medium",
    averageDailySpendUsd: { low: 120, high: 330 },
    whoFor: ["Techno fans", "Music history travelers", "Festival weekend planners"],
    whenToBook: "Book Memorial Day weekend stays early.",
    travelNotes: "Detroit’s value is as much history and community as lineups."
  },
  {
    slug: "las-vegas",
    city: "Las Vegas",
    country: "United States",
    region: "North America",
    coordinates: { lat: 36.1716, lng: -115.1391 },
    tagline: "EDC, residencies, pool parties, and high-production nightlife.",
    summary:
      "Las Vegas is built for music-led weekends, with electronic festivals, artist residencies, pool parties, and high-production clubs.",
    heroImage: "/images/heroes/las-vegas.png",
    activeMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    peakMonths: [5],
    genres: ["electronic", "house", "hip-hop", "pop", "festival"],
    vibes: ["luxury", "festival", "group-trip", "late-night"],
    budget: "high",
    averageDailySpendUsd: { low: 190, high: 620 },
    whoFor: ["EDM fans", "Bachelor and group trips", "Residency travelers"],
    whenToBook: "Book festival weekends and pool season hotels early.",
    travelNotes: "Vegas is easy to book but expensive when major events overlap."
  },
  {
    slug: "marrakech",
    city: "Marrakech",
    country: "Morocco",
    region: "Africa",
    coordinates: { lat: 31.6295, lng: -7.9811 },
    tagline: "Desert energy, boutique festivals, and Afro-electronic destination travel.",
    summary:
      "Marrakech is an emerging music-travel option for boutique festivals, desert-adjacent experiences, and luxury cultural weekends.",
    heroImage: "/images/heroes/marrakech.png",
    activeMonths: [3, 4, 5, 9, 10, 11],
    peakMonths: [5, 10],
    genres: ["afro-house", "house", "electronic"],
    vibes: ["luxury", "cultural", "festival", "group-trip"],
    budget: "high",
    averageDailySpendUsd: { low: 150, high: 500 },
    whoFor: ["Boutique festival travelers", "Luxury cultural groups", "Afro-house fans"],
    whenToBook: "Book riads and festival weekends early around spring and autumn dates.",
    travelNotes: "Marrakech is best framed as culture plus music, not a pure nightlife city."
  },
  {
    slug: "courchevel",
    city: "Courchevel",
    country: "France",
    region: "Europe",
    coordinates: { lat: 45.4154, lng: 6.6358 },
    tagline: "Alpine luxury, Les Caves du Roy, and holiday-week celebrity sets.",
    summary:
      "Courchevel 1850 is the apex of European après-ski — Les Caves du Roy stays open until dawn, La Folie Douce lights up the slopes with daytime DJ sets, and the Christmas-to-NYE window concentrates private chalet sets, surprise headliners, and luxury group programming.",
    heroImage: "/images/heroes/courchevel.png",
    activeMonths: [12, 1, 2, 3],
    peakMonths: [12, 2],
    genres: ["house", "electronic", "pop"],
    vibes: ["luxury", "late-night", "group-trip"],
    budget: "luxury",
    averageDailySpendUsd: { low: 600, high: 2200 },
    whoFor: ["Luxury ski groups", "Après-ski club fans", "Holiday-week jet-setters"],
    whenToBook: "Book the December 26 - January 5 holiday window 6-9 months ahead — chalets and tables disappear early.",
    travelNotes: "The 1850 plateau concentrates the best clubs and après-ski terraces; Courchevel Moriond / 1650 stays calmer and more family-friendly."
  },
  {
    slug: "verbier",
    city: "Verbier",
    country: "Switzerland",
    region: "Europe",
    coordinates: { lat: 46.0961, lng: 7.2274 },
    tagline: "Polaris Festival, Farinet après, and the Alps' most rave-leaning ski town.",
    summary:
      "Verbier blends Swiss alpine heritage with one of the strongest electronic festivals in the Alps — Polaris Festival in early December, plus Farinet After, Pub Mont Fort, and Farm Club residencies that run through the season.",
    heroImage: "/images/heroes/verbier.png",
    activeMonths: [12, 1, 2, 3, 4],
    peakMonths: [12, 2],
    genres: ["electronic", "house", "techno", "pop"],
    vibes: ["luxury", "late-night", "group-trip", "festival"],
    budget: "luxury",
    averageDailySpendUsd: { low: 450, high: 1500 },
    whoFor: ["Polaris Festival travelers", "Ski-and-techno crews", "Luxury alpine groups"],
    whenToBook: "Book the Polaris Festival weekend (early December) and Christmas / NYE window 4-6 months ahead.",
    travelNotes: "Geneva is the closest airport — trains and shuttles to Verbier take roughly 2.5 hours."
  },
  {
    slug: "ischgl",
    city: "Ischgl",
    country: "Austria",
    region: "Europe",
    coordinates: { lat: 47.0117, lng: 10.2941 },
    tagline: "Top of the Mountain concerts and the Alps' wildest mainstream après-ski.",
    summary:
      "Ischgl is built around its Top of the Mountain concert series — outdoor pop, rock, and electronic shows headlined by global names that bookend the season — plus a notoriously high-energy après circuit including Pacha Ischgl, Trofana Alm, and Niki's Stadl.",
    heroImage: "/images/heroes/ischgl.png",
    activeMonths: [11, 12, 1, 2, 3, 4, 5],
    peakMonths: [11, 4],
    genres: ["pop", "electronic", "house", "festival"],
    vibes: ["festival", "late-night", "group-trip"],
    budget: "high",
    averageDailySpendUsd: { low: 280, high: 700 },
    whoFor: ["Pop and festival ski travelers", "Group après-ski crews", "Top of the Mountain fans"],
    whenToBook: "Book the season opening (late November) and closing (late April / early May) Top of the Mountain weekends 3-5 months ahead.",
    travelNotes: "Innsbruck is the closest airport — about 1.5 hours by car or shuttle to Ischgl."
  },
  {
    slug: "aspen",
    city: "Aspen",
    country: "United States",
    region: "North America",
    coordinates: { lat: 39.1911, lng: -106.8175 },
    tagline: "Belly Up Aspen, X Games concerts, and celebrity-stacked holiday weeks.",
    summary:
      "Aspen pairs world-class skiing with an unusually strong music calendar — Belly Up Aspen books touring artists in a 450-cap room, Snowmass hosts X Games concerts in late January, and the Christmas / NYE window draws celebrity DJ sets and private chalet parties.",
    heroImage: "/images/heroes/aspen.png",
    activeMonths: [12, 1, 2, 3],
    peakMonths: [12, 1],
    genres: ["pop", "electronic", "house", "hip-hop"],
    vibes: ["luxury", "late-night", "group-trip", "festival"],
    budget: "luxury",
    averageDailySpendUsd: { low: 500, high: 1800 },
    whoFor: ["Luxury ski travelers", "X Games fans", "Belly Up showgoers"],
    whenToBook: "Book the December 26 - January 5 holiday week and X Games weekend (late January) 6+ months ahead.",
    travelNotes: "Fly into Aspen / Snowmass (ASE) for the shortest transfer; Denver is a 4-hour drive."
  },
  {
    slug: "tokyo",
    city: "Tokyo",
    country: "Japan",
    region: "Asia",
    coordinates: { lat: 35.6762, lng: 139.6503 },
    tagline: "Year-round club density, Summer Sonic, and Asia's deepest live music city.",
    summary:
      "Tokyo runs one of the world's most consistent music calendars — WOMB and ageHa for electronic, Blue Note for jazz, Liquidroom for indie, and Summer Sonic in mid-August. Fuji Rock (technically Niigata) is treated as a Tokyo trip by most travelers.",
    heroImage: "/images/heroes/tokyo.png",
    activeMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
    peakMonths: [7, 8],
    genres: ["electronic", "house", "techno", "festival", "jazz", "hip-hop"],
    vibes: ["city", "late-night", "cultural", "festival"],
    budget: "high",
    averageDailySpendUsd: { low: 220, high: 550 },
    whoFor: ["Festival travelers", "Club crawl crews", "Cultural music nerds"],
    whenToBook: "Book Summer Sonic and Fuji Rock weekends 3-5 months ahead — hotel pricing spikes hard.",
    travelNotes: "Shibuya, Shinjuku, and Ebisu cluster the best venues; trains stop around midnight, so plan night routes around taxis or after-5am trains."
  },
  {
    slug: "mexico-city",
    city: "Mexico City",
    country: "Mexico",
    region: "North America",
    coordinates: { lat: 19.4326, lng: -99.1332 },
    tagline: "Corona Capital, EDC México, and one of Latin America's most layered music cities.",
    summary:
      "Mexico City is now a global touring hub — EDC México in late February at Autódromo Hermanos Rodríguez, Corona Capital in November, and a year-round club scene across Roma, Condesa, and Juárez led by venues like Bahía and Yu Yu.",
    heroImage: "/images/heroes/mexico-city.png",
    activeMonths: [2, 3, 4, 5, 9, 10, 11],
    peakMonths: [2, 11],
    genres: ["electronic", "festival", "latin", "house", "hip-hop", "techno"],
    vibes: ["city", "festival", "cultural", "late-night"],
    budget: "medium",
    averageDailySpendUsd: { low: 90, high: 280 },
    whoFor: ["Latin festival travelers", "Corona Capital and EDC fans", "Cultural-music crews"],
    whenToBook: "Book EDC México (late Feb) and Corona Capital (Nov) flights and stays 2-3 months ahead.",
    travelNotes: "Stay in Roma Norte or Condesa for venue access; Polanco for upscale, Juárez for nightlife density."
  },
  {
    slug: "buenos-aires",
    city: "Buenos Aires",
    country: "Argentina",
    region: "South America",
    coordinates: { lat: -34.6037, lng: -58.3816 },
    tagline: "Lollapalooza Argentina, late-night porteño clubs, and Southern-summer touring.",
    summary:
      "Buenos Aires hosts Lollapalooza Argentina in mid-March at Hipódromo de San Isidro, plus a strong club calendar across Crobar, Niceto Club, and Bajo Belgrano warehouses through the Southern hemisphere summer (Dec-Mar).",
    heroImage: "/images/heroes/buenos-aires.png",
    activeMonths: [11, 12, 1, 2, 3, 4],
    peakMonths: [3],
    genres: ["festival", "house", "techno", "latin", "electronic"],
    vibes: ["city", "late-night", "festival", "cultural"],
    budget: "medium",
    averageDailySpendUsd: { low: 70, high: 220 },
    whoFor: ["Lollapalooza travelers", "Southern summer touring fans", "Late-night club crews"],
    whenToBook: "Book Lollapalooza Argentina weekend (mid-March) 2-4 months ahead.",
    travelNotes: "Palermo Soho / Palermo Hollywood concentrate the bars and clubs; porteño nights start late — most venues fill after 1am."
  },
  {
    slug: "sao-paulo",
    city: "São Paulo",
    country: "Brazil",
    region: "South America",
    coordinates: { lat: -23.5505, lng: -46.6333 },
    tagline: "Lollapalooza Brasil, Time Warp, and the largest touring city in Latin America.",
    summary:
      "São Paulo is South America's biggest touring market — Lollapalooza Brasil in March at Autódromo de Interlagos, Time Warp Brasil for techno, and major touring stops at Audio, Allianz Parque, and the Memorial da América Latina.",
    heroImage: "/images/heroes/sao-paulo.png",
    activeMonths: [2, 3, 4, 5, 9, 10, 11],
    peakMonths: [3],
    genres: ["festival", "techno", "house", "latin", "hip-hop"],
    vibes: ["city", "festival", "late-night", "cultural"],
    budget: "medium",
    averageDailySpendUsd: { low: 80, high: 250 },
    whoFor: ["Lollapalooza Brasil fans", "Touring concert travelers", "Late-night club crews"],
    whenToBook: "Book Lollapalooza Brasil and Time Warp Brasil weekends 2-4 months ahead.",
    travelNotes: "Stay around Vila Madalena, Pinheiros, or Jardins for the strongest venue access."
  },
  {
    slug: "port-of-spain",
    city: "Port of Spain",
    country: "Trinidad and Tobago",
    region: "North America",
    coordinates: { lat: 10.6918, lng: -61.2225 },
    tagline: "Trinidad Carnival — the spiritual home of soca, mas, and J'Ouvert.",
    summary:
      "Trinidad Carnival is the world's source carnival for soca music — the two days before Ash Wednesday host Monday and Tuesday Mas, J'Ouvert at dawn, and a chain of all-inclusive fetes through January and February that lead into the climax.",
    heroImage: "/images/heroes/port-of-spain.png",
    activeMonths: [1, 2],
    peakMonths: [2],
    genres: ["festival", "afro-house", "latin"],
    vibes: ["festival", "cultural", "group-trip"],
    budget: "high",
    averageDailySpendUsd: { low: 200, high: 600 },
    whoFor: ["Carnival travelers", "Soca and mas culture fans", "Caribbean diaspora groups"],
    whenToBook: "Book Carnival flights, hotels, and band registration 6+ months ahead — supply is sharply limited.",
    travelNotes: "Carnival dates shift annually — Monday and Tuesday before Ash Wednesday. Build in the two weeks of fetes that lead up to the climax."
  },
  {
    slug: "sydney",
    city: "Sydney",
    country: "Australia",
    region: "Oceania",
    coordinates: { lat: -33.8688, lng: 151.2093 },
    tagline: "Field Day NYE, harbor festivals, and Australia's Southern-summer flagship.",
    summary:
      "Sydney's music year peaks across the Southern hemisphere summer — Field Day on New Year's Day, Laneway in early February, and a long warm-weather festival circuit, plus Enmore-Newtown live venues and a recovering late-night club scene.",
    heroImage: "/images/heroes/sydney.png",
    activeMonths: [11, 12, 1, 2, 3],
    peakMonths: [1, 2],
    genres: ["festival", "house", "electronic", "hip-hop", "pop"],
    vibes: ["city", "festival", "beach", "group-trip"],
    budget: "high",
    averageDailySpendUsd: { low: 200, high: 500 },
    whoFor: ["Southern-summer festival travelers", "NYE / Field Day crews", "Laneway fans"],
    whenToBook: "Book NYE and Field Day stays 4-6 months ahead — Sydney NYE harbor demand is global.",
    travelNotes: "Surry Hills, Newtown, and Bondi spread the music-bar density; the Inner West rooms host the strongest live touring."
  },
  {
    slug: "tbilisi",
    city: "Tbilisi",
    country: "Georgia",
    region: "Europe",
    coordinates: { lat: 41.7151, lng: 44.8271 },
    tagline: "Bassiani, KHIDI, and one of Europe's deepest underground techno cities.",
    summary:
      "Tbilisi has emerged as one of Europe's most respected techno destinations — Bassiani's basement under Dinamo Stadium runs legendary parties, KHIDI books heavy programming under Vakhushti Bridge, and the city pairs underground depth with a strong food and natural-wine culture.",
    heroImage: "/images/heroes/tbilisi.png",
    activeMonths: [4, 5, 6, 7, 8, 9, 10],
    peakMonths: [6, 9],
    genres: ["techno", "electronic", "house"],
    vibes: ["underground", "late-night", "city", "cultural"],
    budget: "low",
    averageDailySpendUsd: { low: 60, high: 180 },
    whoFor: ["Underground techno travelers", "Bassiani / KHIDI residents fans", "Slow-travel music nerds"],
    whenToBook: "Book Bassiani guestlist and registration early in the week — popular nights book out quickly.",
    travelNotes: "Bassiani has a strict door policy and registration system — review entry rules before arriving."
  },
  {
    slug: "tel-aviv",
    city: "Tel Aviv",
    country: "Israel",
    region: "Middle East",
    coordinates: { lat: 32.0853, lng: 34.7818 },
    tagline: "The Block, Mediterranean techno, and one of the world's heaviest sunset-to-sunrise circuits.",
    summary:
      "Tel Aviv pairs beach-led summer travel with one of the world's deepest techno cultures — The Block on Salame Street is among the most respected club rooms globally, Pride Week (early June) drives a citywide music takeover, and beach clubs run from late spring into autumn.",
    heroImage: "/images/heroes/tel-aviv.png",
    activeMonths: [4, 5, 6, 7, 8, 9],
    peakMonths: [6, 7],
    genres: ["techno", "house", "electronic"],
    vibes: ["beach", "late-night", "underground", "city"],
    budget: "high",
    averageDailySpendUsd: { low: 200, high: 500 },
    whoFor: ["Techno travelers", "Pride Week travelers", "Mediterranean beach + club crews"],
    whenToBook: "Book Pride Week (early June) and summer weekends 2-3 months ahead.",
    travelNotes: "Stay in Florentin or Neve Tzedek for nightlife density; the Israeli weekend runs Thu-Sat, so weekend programming starts Thursday."
  },
  {
    slug: "hvar",
    city: "Hvar",
    country: "Croatia",
    region: "Europe",
    coordinates: { lat: 43.1729, lng: 16.4413 },
    tagline: "Adriatic island clubs, Carpe Diem Beach, and the boutique Mediterranean party island.",
    summary:
      "Hvar Town is the Adriatic's most concentrated music-tourism island — Carpe Diem Beach pulls global DJs onto a boat-accessible islet, the Pakleni archipelago hosts boat-day raves, and the small old town packs more cocktail bars per square meter than anywhere on the Croatian coast.",
    heroImage: "/images/heroes/hvar.png",
    activeMonths: [6, 7, 8, 9],
    peakMonths: [7, 8],
    genres: ["house", "electronic", "techno"],
    vibes: ["beach", "luxury", "late-night", "group-trip"],
    budget: "high",
    averageDailySpendUsd: { low: 200, high: 600 },
    whoFor: ["Adriatic island travelers", "Boat-day group trips", "Beach club + town crawl crews"],
    whenToBook: "Book accommodations 4-6 months ahead — Hvar Town has limited inventory and fills early in July and August.",
    travelNotes: "Ferries from Split (Jadrolinija, Krilo) take 1-2 hours. Stay in Hvar Town for venue density; the rest of the island is calmer."
  },
  {
    slug: "reykjavik",
    city: "Reykjavik",
    country: "Iceland",
    region: "Europe",
    coordinates: { lat: 64.1466, lng: -21.9426 },
    tagline: "Iceland Airwaves, midnight-sun warehouses, and the world's quirkiest music city.",
    summary:
      "Reykjavik runs two distinct music seasons — Iceland Airwaves in early November fills cafés, churches, and clubs with a 200+ artist multi-venue program, while June's midnight sun powers warehouse parties around Bryggjan Brugghús and a strong rooftop program at Harpa concert hall.",
    heroImage: "/images/heroes/reykjavik.png",
    activeMonths: [6, 7, 8, 9, 11],
    peakMonths: [6, 11],
    genres: ["electronic", "festival", "pop", "jazz"],
    vibes: ["city", "festival", "underground", "cultural"],
    budget: "high",
    averageDailySpendUsd: { low: 220, high: 500 },
    whoFor: ["Iceland Airwaves travelers", "Midnight-sun festival fans", "Discovery-driven music nerds"],
    whenToBook: "Book Iceland Airwaves passes 4-6 months ahead — November sells out from August onward.",
    travelNotes: "Most venues cluster in the 101 postal code (downtown). Keflavík airport is 45 minutes from town by Flybus or shuttle."
  },
  {
    slug: "antwerp",
    city: "Antwerp",
    country: "Belgium",
    region: "Europe",
    coordinates: { lat: 51.2194, lng: 4.4025 },
    tagline: "Tomorrowland in Boom, Antwerp's underground rooms, and Belgian techno tradition.",
    summary:
      "Antwerp anchors a music-travel weekend built around Tomorrowland in Boom (just south, 25 minutes by train) — the world's biggest electronic festival across two late-July weekends — plus Antwerp's own underground rooms like Het Bos and Trix and a strong day-into-night cocktail-bar circuit.",
    heroImage: "/images/heroes/antwerp.png",
    activeMonths: [5, 6, 7, 8, 9],
    peakMonths: [7],
    genres: ["festival", "electronic", "house", "techno"],
    vibes: ["festival", "city", "group-trip"],
    budget: "high",
    averageDailySpendUsd: { low: 180, high: 480 },
    whoFor: ["Tomorrowland weekenders", "European festival fans", "Belgian techno crews"],
    whenToBook: "Book Tomorrowland tickets in the worldwide pre-sale window (typically late January) — accommodation around Boom and Antwerp sells out within weeks.",
    travelNotes: "Stay near Antwerp Centraal for train access to Boom (25 min). Brussels Airport BRU is roughly 45 minutes by car or train."
  },
  {
    slug: "st-barths",
    city: "Saint-Barthélemy",
    country: "France",
    region: "North America",
    coordinates: { lat: 17.9, lng: -62.8333 },
    tagline: "Christmas-NYE Caribbean luxury, Eden Rock, Nikki Beach, and yacht-driven afterparties.",
    summary:
      "Saint-Barthélemy concentrates one of the world's wildest two-week party seasons around Christmas and New Year's Eve — Nikki Beach St. Barth, Le Ti, Bagatelle, and yacht-driven clubs in Gustavia harbor host celebrity DJ residencies, billionaire NYE parties, and intimate beachfront sessions during the December 22 - January 5 window.",
    heroImage: "/images/heroes/st-barths.png",
    activeMonths: [12, 1, 2],
    peakMonths: [12, 1],
    genres: ["house", "electronic", "pop", "afro-house"],
    vibes: ["luxury", "beach", "late-night", "group-trip"],
    budget: "luxury",
    averageDailySpendUsd: { low: 700, high: 3000 },
    whoFor: ["Christmas/NYE jet-setters", "Caribbean luxury group trips", "Yacht week travelers"],
    whenToBook: "Book December 22 - January 5 villas and yacht charters 9-12 months ahead — Caribbean luxury inventory is fully booked by spring.",
    travelNotes: "Fly into San Juan, St. Maarten, or Antigua — small commuter flights connect to St. Barth (SBH). Most NYE programming is villa- or yacht-based; reservations are essential."
  },
  {
    slug: "new-orleans",
    city: "New Orleans",
    country: "United States",
    region: "North America",
    coordinates: { lat: 29.9511, lng: -90.0715 },
    tagline: "Jazz Fest, Mardi Gras, Frenchmen Street — the most distinct music DNA in America.",
    summary:
      "New Orleans runs on three calendars — Mardi Gras in February, the New Orleans Jazz & Heritage Festival across two weekends in late April / early May, and year-round Frenchmen Street live music. Tipitina's, Preservation Hall, and the Maple Leaf Bar host the city's signature programming through every other month.",
    heroImage: "/images/heroes/new-orleans.png",
    activeMonths: [1, 2, 3, 4, 5, 9, 10, 11],
    peakMonths: [2, 5],
    genres: ["jazz", "hip-hop", "festival", "r-and-b", "afro-house"],
    vibes: ["festival", "cultural", "city", "late-night", "group-trip"],
    budget: "medium",
    averageDailySpendUsd: { low: 130, high: 380 },
    whoFor: ["Jazz Fest travelers", "Mardi Gras crews", "Live-music nerds"],
    whenToBook: "Book Mardi Gras (Feb) and Jazz Fest (late April / early May) hotels 4-6 months ahead — French Quarter inventory disappears first.",
    travelNotes: "Stay in the Marigny, Bywater, or French Quarter for venue density. Streetcars connect Uptown clubs (Tipitina's, Maple Leaf) to downtown."
  }
  // @scaffold:destinations — new Destination objects go here (see docs/ADD_CITY.md)
];

const destinationBySlug = new Map(DESTINATIONS.map((destination) => [destination.slug, destination]));

export const VENUES: Venue[] = [
  { id: "hi-ibiza", destinationSlug: "ibiza", name: "Hi Ibiza", type: "venue", sceneTags: ["luxury", "late-night"], officialUrl: "https://www.hiibiza.com/" },
  { id: "dc10", destinationSlug: "ibiza", name: "DC10", type: "venue", sceneTags: ["underground", "late-night"], officialUrl: "https://www.dc10ibiza.com/" },
  { id: "scorpios", destinationSlug: "mykonos", name: "Scorpios Mykonos", type: "beach-club", sceneTags: ["beach", "luxury"], officialUrl: "https://www.scorpiosmykonos.com/" },
  { id: "afro-nation", destinationSlug: "lisbon-portimao", name: "Afro Nation Portugal", type: "festival", sceneTags: ["festival", "beach"], officialUrl: "https://www.afronation.com/" },
  { id: "primavera", destinationSlug: "barcelona", name: "Primavera Sound", type: "festival", sceneTags: ["festival", "city"], officialUrl: "https://www.primaverasound.com/" },
  { id: "berghain", destinationSlug: "berlin", name: "Berghain / Panorama Bar", type: "venue", sceneTags: ["underground", "late-night"], officialUrl: "https://www.berghain.berlin/" },
  { id: "ade", destinationSlug: "amsterdam", name: "Amsterdam Dance Event", type: "conference", sceneTags: ["festival", "city"], officialUrl: "https://www.amsterdam-dance-event.nl/" },
  { id: "fabric", destinationSlug: "london", name: "fabric London", type: "venue", sceneTags: ["underground", "late-night"], officialUrl: "https://www.fabriclondon.com/" },
  { id: "ultra-miami", destinationSlug: "miami", name: "Ultra Music Festival", type: "festival", sceneTags: ["festival", "city"], officialUrl: "https://ultramusicfestival.com/" },
  { id: "zamna", destinationSlug: "tulum", name: "Zamna Tulum", type: "festival", sceneTags: ["beach", "late-night"], officialUrl: "https://zamnafestival.com/" },
  { id: "coachella", destinationSlug: "los-angeles", name: "Coachella Valley Music and Arts Festival", type: "festival", sceneTags: ["festival", "group-trip"], officialUrl: "https://www.coachella.com/" },
  { id: "brooklyn-mirage", destinationSlug: "new-york", name: "Brooklyn Mirage", type: "venue", sceneTags: ["city", "late-night"], officialUrl: "https://www.avant-gardner.com/" },
  { id: "rocking-the-daisies", destinationSlug: "cape-town", name: "Rocking the Daisies", type: "festival", sceneTags: ["festival", "cultural"], officialUrl: "https://rockingthedaisies.com/" },
  { id: "detty-december-lagos", destinationSlug: "lagos", name: "Detty December Lagos", type: "festival", sceneTags: ["cultural", "late-night"], officialUrl: "https://en.wikipedia.org/wiki/Detty_December" },
  { id: "afrofuture", destinationSlug: "accra", name: "AfroFuture", type: "festival", sceneTags: ["festival", "cultural"], officialUrl: "https://www.afrofuture.com/" },
  { id: "rex-club", destinationSlug: "paris", name: "Rex Club", type: "venue", sceneTags: ["city", "late-night"], officialUrl: "https://rexclub.com/" },
  { id: "soho-garden", destinationSlug: "dubai", name: "Soho Garden", type: "venue", sceneTags: ["luxury", "late-night"], officialUrl: "https://sohogardendxb.com/" },
  { id: "potato-head", destinationSlug: "bali", name: "Potato Head Bali", type: "beach-club", sceneTags: ["beach", "cultural"], officialUrl: "https://seminyak.potatohead.co/" },
  { id: "olivia-valere", destinationSlug: "marbella", name: "Olivia Valere", type: "venue", sceneTags: ["luxury", "late-night"], officialUrl: "https://oliviavalere.com/" },
  { id: "ultra-europe", destinationSlug: "split", name: "Ultra Europe", type: "festival", sceneTags: ["festival", "beach"], officialUrl: "https://ultraeurope.com/" },
  { id: "lost-and-found", destinationSlug: "malta", name: "Malta festival season", type: "festival", sceneTags: ["festival", "group-trip"], officialUrl: "https://www.visitmalta.com/" },
  { id: "piknic", destinationSlug: "montreal", name: "Piknic Electronik", type: "festival", sceneTags: ["city", "festival"], officialUrl: "https://piknicelectronik.com/" },
  { id: "toronto-caribana", destinationSlug: "toronto", name: "Toronto Caribbean Carnival (Caribana)", type: "carnival", sceneTags: ["festival", "cultural", "group-trip"], officialUrl: "https://www.torontocarnival.ca/" },
  { id: "toronto-budweiser-stage", destinationSlug: "toronto", name: "Budweiser Stage", type: "concert", sceneTags: ["festival", "city"], officialUrl: "https://www.livenation.com/venue/KovZpZAFFe7A/budweiser-stage-events" },
  { id: "toronto-rebel", destinationSlug: "toronto", name: "Rebel Toronto", type: "venue", sceneTags: ["late-night", "city"], officialUrl: "https://rebeltoronto.com/" },
  { id: "rio-carnival", destinationSlug: "rio-de-janeiro", name: "Rio Carnival", type: "carnival", sceneTags: ["festival", "cultural"], officialUrl: "https://riotur.rio/" },
  { id: "movement", destinationSlug: "detroit", name: "Movement Detroit", type: "festival", sceneTags: ["festival", "underground"], officialUrl: "https://movementfestival.com/" },
  { id: "edc-vegas", destinationSlug: "las-vegas", name: "EDC Las Vegas", type: "festival", sceneTags: ["festival", "late-night"], officialUrl: "https://lasvegas.electricdaisycarnival.com/" },
  { id: "oasis-into-the-wild", destinationSlug: "marrakech", name: "Oasis Into the Wild", type: "festival", sceneTags: ["luxury", "cultural"], officialUrl: "https://theoasisfest.com/" },
  { id: "les-caves-courchevel", destinationSlug: "courchevel", name: "Les Caves du Roy Courchevel", type: "venue", sceneTags: ["luxury", "late-night"], officialUrl: "https://www.instagram.com/lescaves_courchevel/" },
  { id: "la-folie-douce-courchevel", destinationSlug: "courchevel", name: "La Folie Douce Courchevel", type: "beach-club", sceneTags: ["luxury", "festival"], officialUrl: "https://www.lafoliedouce.com/" },
  { id: "le-tigre-courchevel", destinationSlug: "courchevel", name: "L'Equipe / Le Tigre Courchevel", type: "venue", sceneTags: ["luxury", "late-night"], officialUrl: "https://www.instagram.com/lequipe_courchevel/" },
  { id: "polaris-verbier", destinationSlug: "verbier", name: "Polaris Festival Verbier", type: "festival", sceneTags: ["festival", "late-night"], officialUrl: "https://polarisfestival.ch/" },
  { id: "farinet-verbier", destinationSlug: "verbier", name: "Farinet Lounge & After Verbier", type: "venue", sceneTags: ["late-night", "luxury"], officialUrl: "https://hotelfarinet.com/" },
  { id: "pub-mont-fort-verbier", destinationSlug: "verbier", name: "Pub Mont Fort", type: "venue", sceneTags: ["late-night", "group-trip"], officialUrl: "https://www.pubmontfort.com/" },
  { id: "top-of-the-mountain-ischgl", destinationSlug: "ischgl", name: "Top of the Mountain Concerts", type: "festival", sceneTags: ["festival", "group-trip"], officialUrl: "https://www.ischgl.com/" },
  { id: "pacha-ischgl", destinationSlug: "ischgl", name: "Pacha Ischgl", type: "venue", sceneTags: ["late-night", "luxury"], officialUrl: "https://pachaischgl.com/" },
  { id: "trofana-alm-ischgl", destinationSlug: "ischgl", name: "Trofana Alm", type: "venue", sceneTags: ["late-night", "group-trip"], officialUrl: "https://www.trofana-alm.at/" },
  { id: "belly-up-aspen", destinationSlug: "aspen", name: "Belly Up Aspen", type: "venue", sceneTags: ["late-night", "city"], officialUrl: "https://www.bellyupaspen.com/" },
  { id: "x-games-aspen", destinationSlug: "aspen", name: "X Games Aspen Snowmass", type: "festival", sceneTags: ["festival", "group-trip"], officialUrl: "https://www.xgames.com/events/aspen" },
  { id: "caribou-club-aspen", destinationSlug: "aspen", name: "Caribou Club", type: "venue", sceneTags: ["luxury", "late-night"], officialUrl: "https://www.thecaribouclub.com/" },
  { id: "summer-sonic-tokyo", destinationSlug: "tokyo", name: "Summer Sonic Tokyo", type: "festival", sceneTags: ["festival", "city"], officialUrl: "https://www.summersonic.com/" },
  { id: "fuji-rock-tokyo", destinationSlug: "tokyo", name: "Fuji Rock Festival", type: "festival", sceneTags: ["festival", "group-trip"], officialUrl: "https://www.fujirockfestival.com/" },
  { id: "womb-tokyo", destinationSlug: "tokyo", name: "WOMB Tokyo", type: "venue", sceneTags: ["underground", "late-night"], officialUrl: "https://www.womb.co.jp/" },
  { id: "ageha-tokyo", destinationSlug: "tokyo", name: "ageHa / Studio Coast Tokyo", type: "venue", sceneTags: ["late-night", "city"], officialUrl: "https://en.wikipedia.org/wiki/AgeHa" },
  { id: "edc-mexico", destinationSlug: "mexico-city", name: "EDC México", type: "festival", sceneTags: ["festival", "late-night"], officialUrl: "https://mexico.electricdaisycarnival.com/" },
  { id: "corona-capital-cdmx", destinationSlug: "mexico-city", name: "Corona Capital", type: "festival", sceneTags: ["festival", "city"], officialUrl: "https://www.coronacapital.com.mx/" },
  { id: "bahia-cdmx", destinationSlug: "mexico-city", name: "Bahía Mexico City", type: "venue", sceneTags: ["underground", "late-night"], officialUrl: "https://www.instagram.com/bahia.mx/" },
  { id: "lolla-argentina", destinationSlug: "buenos-aires", name: "Lollapalooza Argentina", type: "festival", sceneTags: ["festival", "group-trip"], officialUrl: "https://www.lollapaloozaar.com/" },
  { id: "crobar-ba", destinationSlug: "buenos-aires", name: "Crobar Buenos Aires", type: "venue", sceneTags: ["late-night", "city"], officialUrl: "https://www.crobar.com.ar/" },
  { id: "niceto-ba", destinationSlug: "buenos-aires", name: "Niceto Club", type: "venue", sceneTags: ["city", "late-night"], officialUrl: "https://www.nicetoclub.com/" },
  { id: "lolla-brasil", destinationSlug: "sao-paulo", name: "Lollapalooza Brasil", type: "festival", sceneTags: ["festival", "group-trip"], officialUrl: "https://www.lollapaloozabr.com/" },
  { id: "time-warp-brasil", destinationSlug: "sao-paulo", name: "Time Warp Brasil", type: "festival", sceneTags: ["festival", "underground"], officialUrl: "https://www.time-warp.de/" },
  { id: "audio-club-sp", destinationSlug: "sao-paulo", name: "Audio Club São Paulo", type: "venue", sceneTags: ["city", "late-night"], officialUrl: "https://www.audiosp.com.br/" },
  { id: "trinidad-carnival", destinationSlug: "port-of-spain", name: "Trinidad Carnival", type: "carnival", sceneTags: ["festival", "cultural", "group-trip"], officialUrl: "https://www.ncctt.org/" },
  { id: "jouvert-port-of-spain", destinationSlug: "port-of-spain", name: "J'Ouvert Monday", type: "carnival", sceneTags: ["festival", "cultural"], officialUrl: "https://www.gotrinidadandtobago.com/trinidad/things-to-do/carnival/" },
  { id: "soca-monarch-trinidad", destinationSlug: "port-of-spain", name: "International Soca Monarch", type: "festival", sceneTags: ["festival", "cultural"], officialUrl: "https://socamonarch.com/" },
  { id: "field-day-sydney", destinationSlug: "sydney", name: "Field Day Sydney", type: "festival", sceneTags: ["festival", "city"], officialUrl: "https://www.fuzzy.com.au/" },
  { id: "laneway-sydney", destinationSlug: "sydney", name: "Laneway Festival Sydney", type: "festival", sceneTags: ["festival", "city"], officialUrl: "https://lanewayfestival.com/" },
  { id: "enmore-theatre", destinationSlug: "sydney", name: "Enmore Theatre", type: "venue", sceneTags: ["city", "cultural"], officialUrl: "https://enmoretheatre.com.au/" },
  { id: "bassiani-tbilisi", destinationSlug: "tbilisi", name: "Bassiani", type: "venue", sceneTags: ["underground", "late-night"], officialUrl: "https://bassiani.com/" },
  { id: "khidi-tbilisi", destinationSlug: "tbilisi", name: "KHIDI", type: "venue", sceneTags: ["underground", "late-night"], officialUrl: "https://www.instagram.com/khidi.tbilisi/" },
  { id: "mtkvarze-tbilisi", destinationSlug: "tbilisi", name: "Mtkvarze", type: "venue", sceneTags: ["underground", "late-night"], officialUrl: "https://www.facebook.com/mtkvarze.club/" },
  { id: "the-block-tlv", destinationSlug: "tel-aviv", name: "The Block Tel Aviv", type: "venue", sceneTags: ["underground", "late-night"], officialUrl: "https://block-club.com/" },
  { id: "tel-aviv-pride", destinationSlug: "tel-aviv", name: "Tel Aviv Pride Week", type: "festival", sceneTags: ["festival", "city"], officialUrl: "https://www.gaytelavivguide.com/pride/" },
  { id: "kuli-alma-tlv", destinationSlug: "tel-aviv", name: "Kuli Alma", type: "venue", sceneTags: ["city", "late-night"], officialUrl: "https://kulialma.com/" },
  { id: "carpe-diem-beach-hvar", destinationSlug: "hvar", name: "Carpe Diem Beach", type: "beach-club", sceneTags: ["beach", "luxury", "late-night"], officialUrl: "https://www.carpe-diem-beach.com/" },
  { id: "carpe-diem-bar-hvar", destinationSlug: "hvar", name: "Carpe Diem Hvar", type: "venue", sceneTags: ["luxury", "late-night"], officialUrl: "https://www.carpediem-hvar.com/" },
  { id: "hula-hula-hvar", destinationSlug: "hvar", name: "Hula Hula Hvar", type: "beach-club", sceneTags: ["beach", "group-trip"], officialUrl: "https://www.hulahulahvar.com/" },
  { id: "iceland-airwaves", destinationSlug: "reykjavik", name: "Iceland Airwaves", type: "festival", sceneTags: ["festival", "city", "cultural"], officialUrl: "https://icelandairwaves.is/" },
  { id: "harpa-reykjavik", destinationSlug: "reykjavik", name: "Harpa Concert Hall", type: "venue", sceneTags: ["city", "cultural"], officialUrl: "https://www.harpa.is/" },
  { id: "gaukurinn", destinationSlug: "reykjavik", name: "Gaukurinn", type: "venue", sceneTags: ["underground", "late-night"], officialUrl: "https://www.gaukurinn.is/" },
  { id: "tomorrowland-festival", destinationSlug: "antwerp", name: "Tomorrowland (Boom)", type: "festival", sceneTags: ["festival", "group-trip"], officialUrl: "https://www.tomorrowland.com/" },
  { id: "het-bos-antwerp", destinationSlug: "antwerp", name: "Het Bos", type: "venue", sceneTags: ["underground", "city"], officialUrl: "https://www.hetbos.be/" },
  { id: "trix-antwerp", destinationSlug: "antwerp", name: "Trix", type: "venue", sceneTags: ["city", "cultural"], officialUrl: "https://www.trixonline.be/" },
  { id: "nikki-beach-st-barths", destinationSlug: "st-barths", name: "Nikki Beach St. Barth", type: "beach-club", sceneTags: ["beach", "luxury"], officialUrl: "https://stbarth.nikkibeach.com/" },
  { id: "le-ti-st-barths", destinationSlug: "st-barths", name: "Le Ti St Barth", type: "venue", sceneTags: ["luxury", "late-night"], officialUrl: "https://www.letistbarth.com/" },
  { id: "bagatelle-st-barths", destinationSlug: "st-barths", name: "Bagatelle Saint-Barth", type: "venue", sceneTags: ["luxury", "late-night"], officialUrl: "https://bistrotbagatelle.com/saint-barth/" },
  { id: "jazz-fest-nola", destinationSlug: "new-orleans", name: "New Orleans Jazz & Heritage Festival", type: "festival", sceneTags: ["festival", "cultural"], officialUrl: "https://www.nojazzfest.com/" },
  { id: "preservation-hall-nola", destinationSlug: "new-orleans", name: "Preservation Hall", type: "venue", sceneTags: ["cultural", "city"], officialUrl: "https://www.preservationhall.com/" },
  { id: "tipitinas-nola", destinationSlug: "new-orleans", name: "Tipitina's", type: "venue", sceneTags: ["city", "late-night", "cultural"], officialUrl: "https://www.tipitinas.com/" }
  // @scaffold:venues — new Venue rows go here (see docs/ADD_CITY.md)
];


function eventDate(month: MonthNumber, day: number) {
  return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const STATIC_EVENTS: Event[] = Object.entries(EVENT_BLUEPRINTS).flatMap(([slug, blueprints]) => {
  const destination = destinationBySlug.get(slug);
  if (!destination) return [];
  return blueprints.map((blueprint) => {
    return {
      id: blueprint.id,
      destinationSlug: slug,
      venueId: blueprint.venueId,
      title: blueprint.title,
      startDate: eventDate(blueprint.startMonth, blueprint.startDay),
      endDate: blueprint.endMonth
        ? eventDate(blueprint.endMonth, blueprint.endDay ?? blueprint.startDay)
        : undefined,
      type: blueprint.type,
      genres: blueprint.genres ?? destination.genres.slice(0, 3),
      importanceScore: blueprint.importance,
      sourceUrl: blueprint.sourceUrl,
      ticketUrl: blueprint.sourceUrl,
      summary: blueprint.summary
    };
  });
});

function eventSpannedMonths(event: Event): number[] {
  const start = /^(\d{4})-(\d{2})/.exec(event.startDate);
  if (!start) return [];
  const sm = Number(start[2]);
  const endStr = event.endDate ?? event.startDate;
  const end = /^(\d{4})-(\d{2})/.exec(endStr);
  if (!end) return [sm];
  const em = Number(end[2]);
  const out: number[] = [];
  if (sm <= em) {
    for (let m = sm; m <= em; m++) out.push(m);
  } else {
    for (let m = sm; m <= 12; m++) out.push(m);
    for (let m = 1; m <= em; m++) out.push(m);
  }
  return out;
}

/**
 * Apply admin-approved AI overrides on top of static EVENT_BLUEPRINTS.
 * Granularity: per (slug, month). Approving Ibiza-July replaces static Ibiza
 * events bounded to July only. Multi-month residencies survive as long as at
 * least one month they span has no AI override (e.g. a year-round Bassiani
 * residency keeps showing in months where the AI batch returned 0 events).
 */
function applyApprovedOverlay(base: Event[]): Event[] {
  if (APPROVED_EVENTS.length === 0) return base;

  // Only override static seeds for a (slug, month) pair when AI actually
  // returned at least one event. If AI returned 0 events for a month, we
  // keep the curated static seeds as a graceful fallback.
  const overrideKeys = new Set(
    APPROVED_EVENTS.filter((entry) => (entry.events?.length ?? 0) > 0).map(
      (entry) => `${entry.slug}:${entry.month}`
    )
  );

  const survivors = base.filter((event) => {
    const months = eventSpannedMonths(event);
    if (months.length === 0) return true;
    // Drop only if EVERY month this event spans is overridden.
    return months.some((m) => !overrideKeys.has(`${event.destinationSlug}:${m}`));
  });

  // The AI sometimes reports the same canonical event in multiple month
  // batches: residencies (same dates, repeated) and tours (same id, but
  // different show dates per month). Dedupe on (id + startDate) so true
  // duplicates collapse but separate shows with the same artist id stay.
  // If we still see two shows on the same date with the same id, prefer the
  // longer span and higher importance; rewrite ids to keep React keys unique.
  const additionsByKey = new Map<string, Event>();
  const idCounts = new Map<string, number>();
  for (const entry of APPROVED_EVENTS) {
    const destination = destinationBySlug.get(entry.slug);
    if (!destination) continue;
    for (const ev of entry.events) {
      const next: Event = {
        id: ev.id,
        destinationSlug: entry.slug,
        venueId: ev.venueId ?? undefined,
        title: ev.title,
        startDate: ev.startDate,
        endDate: ev.endDate ?? undefined,
        type: ev.type,
        genres: ev.genres.length > 0 ? ev.genres : destination.genres.slice(0, 3),
        importanceScore: ev.importance,
        sourceUrl: ev.sourceUrl,
        ticketUrl: ev.ticketUrl ?? ev.sourceUrl,
        summary: ev.summary
      };
      const dedupKey = `${ev.id}@${ev.startDate}`;
      const existing = additionsByKey.get(dedupKey);
      if (!existing) {
        additionsByKey.set(dedupKey, next);
        continue;
      }
      const existingSpan = Date.parse(existing.endDate ?? existing.startDate) - Date.parse(existing.startDate);
      const nextSpan = Date.parse(next.endDate ?? next.startDate) - Date.parse(next.startDate);
      const nextWins =
        nextSpan > existingSpan ||
        (nextSpan === existingSpan && next.importanceScore > existing.importanceScore);
      if (nextWins) additionsByKey.set(dedupKey, next);
    }
  }

  // After (id, startDate) dedup we may still have multiple shows that share
  // the same id (e.g. Olivia Dean Apr 29 vs Jun 11). Disambiguate the public
  // id so React keys stay unique without losing either show.
  const additions: Event[] = [];
  for (const ev of additionsByKey.values()) {
    idCounts.set(ev.id, (idCounts.get(ev.id) ?? 0) + 1);
  }
  const seenSuffix = new Map<string, number>();
  for (const ev of additionsByKey.values()) {
    if ((idCounts.get(ev.id) ?? 1) > 1) {
      const next = (seenSuffix.get(ev.id) ?? 0) + 1;
      seenSuffix.set(ev.id, next);
      additions.push({ ...ev, id: `${ev.id}-${ev.startDate}` });
    } else {
      additions.push(ev);
    }
  }

  return [...survivors, ...additions];
}

export const EVENTS: Event[] = applyApprovedOverlay(STATIC_EVENTS);

export const CURATION_SOURCES: CurationSource[] = VENUES.map((venue) => ({
  id: `${venue.id}-source`,
  destinationSlug: venue.destinationSlug,
  sourceUrl: venue.officialUrl,
  publisher: venue.name,
  lastChecked: "2026-05-05",
  notes: "Launch seed source for destination context, venue reference, and event calendar verification."
}));

export const PEAK_HOOKS: Record<string, string> = {
  ibiza: "Peak club calendar density, flagship residencies, and beach-to-superclub momentum.",
  mykonos: "High-season beach club programming, luxury travel demand, and sunset-led headline sets.",
  "lisbon-portimao": "Festival travel and Atlantic coast trips converge with Lisbon's city nightlife.",
  barcelona: "Flagship festival season gives the city one of Europe's strongest music-travel weeks.",
  berlin: "Reliable club depth with spring and autumn weekends that feel purpose-built for music travel.",
  amsterdam: "Dance music conference gravity turns the city into a global electronic hub.",
  london: "Outdoor festivals and constant touring density make the city unusually stacked.",
  miami: "Miami Music Week and December art-party energy create two clear annual peaks.",
  tulum: "Winter dance travel, jungle venues, and beach clubs make January the anchor month.",
  "los-angeles": "Coachella orbit, touring density, and warehouse programming lift the calendar.",
  "new-york": "Summer festivals, Brooklyn clubs, jazz rooms, and arena shows run in parallel.",
  "cape-town": "Southern hemisphere summer brings outdoor parties, beach culture, and Afro-electronic programming.",
  lagos: "Detty December turns the city into a global afrobeats and nightlife destination.",
  accra: "December diaspora travel, festivals, and beach-nightlife culture create a clear travel moment.",
  paris: "Summer and fashion-season culture pair with strong club, jazz, and arena programming.",
  dubai: "Cooler weather unlocks beach clubs, luxury nightlife, and global touring stops.",
  bali: "Dry-season travel, beach clubs, and sunset electronic programming are at their strongest.",
  marbella: "Luxury summer beach clubs and group-trip weekends drive the destination calendar.",
  split: "Adriatic festival weekends and island routes create a strong July travel reason.",
  malta: "Compact island festival weeks make Malta easy to plan for music groups.",
  montreal: "Summer festival density, jazz, and electronic programming drive long-weekend appeal.",
  toronto: "Caribana week, OVO Fest, and Veld stack a single late-July long weekend into a peak music-travel moment.",
  "rio-de-janeiro": "Carnival makes Rio one of the world's most obvious music-led travel choices.",
  detroit: "Memorial Day weekend gives techno travelers a historically important pilgrimage moment.",
  "las-vegas": "EDC, pool season, and residencies create a high-production music-trip peak.",
  marrakech: "Spring and autumn boutique festival timing pairs music with cultural travel.",
  courchevel: "Christmas-to-NYE holiday week and February half-term concentrate the strongest after-ski programming on the 1850 plateau.",
  verbier: "Polaris Festival and the Christmas / NYE window stack a serious electronic festival on top of Verbier's après-ski.",
  ischgl: "Top of the Mountain opening and closing concerts bookend the season with global pop and rock headline shows.",
  aspen: "Christmas / NYE holiday week and X Games Aspen pair celebrity programming with major touring concerts.",
  tokyo: "Fuji Rock and Summer Sonic plus year-round Shibuya club density make summer the clearest Tokyo trip window.",
  "mexico-city": "EDC México in February and Corona Capital in November create the city's two biggest annual festival weeks.",
  "buenos-aires": "Lollapalooza Argentina anchors the Southern-summer touring calendar with one of the strongest weeks in Latin America.",
  "sao-paulo": "Lollapalooza Brasil and Time Warp Brasil concentrate Latin America's biggest annual festival programming in São Paulo.",
  "port-of-spain": "Trinidad Carnival is the global source carnival for soca music — the two days before Ash Wednesday are the year's defining travel moment.",
  sydney: "Sydney NYE, Field Day on January 1, and Laneway in early February stack a perfect Southern-summer fortnight.",
  tbilisi: "Bassiani and KHIDI's warm-season programming makes Tbilisi one of Europe's most respected underground techno trips.",
  "tel-aviv": "Pride Week in early June and The Block's summer residencies anchor a Mediterranean techno + beach travel window.",
  hvar: "July and August stack Carpe Diem Beach takeovers, Pakleni boat days, and the strongest Adriatic DJ touring weeks of the year.",
  reykjavik: "Iceland Airwaves in early November and June's midnight-sun warehouse parties carve two distinct travel windows; the rest of the year is for hot springs, not headliners.",
  antwerp: "Two Tomorrowland weekends in late July define the entire music-travel year; outside those, the city quietens to its own underground rooms.",
  "st-barths": "Christmas-to-NYE concentrates an unmatched lineup of celebrity DJs, residencies, and yacht parties — the rest of the year is calm villa season.",
  "new-orleans": "Mardi Gras in February and Jazz Fest's two-weekend run in late April / early May concentrate the city's biggest music-travel windows."
  // @scaffold:peakHook — new peak-month one-liners go here (see docs/ADD_CITY.md)
};

function eventInMonth(event: Event, month: MonthNumber) {
  const start = new Date(event.startDate);
  if (Number.isNaN(start.getTime())) return false;
  const end = event.endDate ? new Date(event.endDate) : start;
  const startMonth = (start.getUTCMonth() + 1) as MonthNumber;
  const endMonth = (end.getUTCMonth() + 1) as MonthNumber;
  if (startMonth <= endMonth) return month >= startMonth && month <= endMonth;
  return month >= startMonth || month <= endMonth;
}

function distanceFromPeak(month: MonthNumber, peakMonths: MonthNumber[]): number {
  if (peakMonths.length === 0) return 6;
  let best = 12;
  for (const peak of peakMonths) {
    const raw = Math.abs(peak - month);
    const wrapped = Math.min(raw, 12 - raw);
    if (wrapped < best) best = wrapped;
  }
  return best;
}

const venuesByDestination = new Map<string, Venue[]>();
for (const venue of VENUES) {
  const list = venuesByDestination.get(venue.destinationSlug) ?? [];
  list.push(venue);
  venuesByDestination.set(venue.destinationSlug, list);
}
const sourcesByDestination = new Map<string, CurationSource[]>();
for (const source of CURATION_SOURCES) {
  const list = sourcesByDestination.get(source.destinationSlug) ?? [];
  list.push(source);
  sourcesByDestination.set(source.destinationSlug, list);
}

function dimensionScores(destination: Destination, month: MonthNumber) {
  const isPeak = destination.peakMonths.includes(month);
  const eventsThisMonth = EVENTS.filter(
    (event) => event.destinationSlug === destination.slug && eventInMonth(event, month)
  ).sort((a, b) => b.importanceScore - a.importanceScore);
  const venues = venuesByDestination.get(destination.slug) ?? [];
  const sources = sourcesByDestination.get(destination.slug) ?? [];

  // 1) Signature events — top event importance, banded, with a small stack bonus.
  let signature: number;
  if (eventsThisMonth.length > 0) {
    const top = eventsThisMonth[0].importanceScore;
    let band: number;
    if (top >= 94) band = 100;
    else if (top >= 90) band = 92;
    else if (top >= 85) band = 84;
    else if (top >= 80) band = 76;
    else band = 70;
    const stackBonus = Math.min((eventsThisMonth.length - 1) * 3, 8);
    signature = Math.min(100, band + stackBonus);
  } else {
    signature = isPeak ? 65 : 50;
  }

  // 2) Seasonality — peak vs. shoulder vs. off.
  const peakDistance = distanceFromPeak(month, destination.peakMonths);
  let seasonality: number;
  if (isPeak) {
    seasonality = destination.peakMonths.length === 1 ? 96 : 92;
  } else if (peakDistance === 1) {
    seasonality = 76;
  } else if (peakDistance === 2) {
    seasonality = 64;
  } else {
    seasonality = 54;
  }

  // 3) Venue density — curated venues plus an "in-month activity" proxy and peak boost.
  const venueCount = venues.length;
  let venueBase: number;
  if (venueCount >= 4) venueBase = 92;
  else if (venueCount === 3) venueBase = 84;
  else if (venueCount === 2) venueBase = 76;
  else if (venueCount === 1) venueBase = 68;
  else venueBase = 55;
  const monthEventBonus =
    eventsThisMonth.length >= 4
      ? 10
      : eventsThisMonth.length === 3
        ? 8
        : eventsThisMonth.length === 2
          ? 5
          : eventsThisMonth.length === 1
            ? 2
            : 0;
  const venueDensity = Math.min(100, venueBase + monthEventBonus + (isPeak ? 2 : 0));

  // 4) Travel intent — does the month justify booking a trip?
  const hasFestival = eventsThisMonth.some(
    (event) => event.type === "festival" || event.type === "carnival"
  );
  const residencyCount = eventsThisMonth.filter((event) => event.type === "residency").length;
  const luxuryFlag = destination.vibes.includes("luxury") || destination.vibes.includes("beach");
  const groupFlag = destination.vibes.includes("group-trip");
  let travelIntent: number;
  if (hasFestival && isPeak) travelIntent = 96;
  else if (hasFestival) travelIntent = 86;
  else if (residencyCount >= 2 && isPeak) travelIntent = 90;
  else if (residencyCount >= 1 && isPeak) travelIntent = 82;
  else if (residencyCount >= 1) travelIntent = 72;
  else if (isPeak && luxuryFlag) travelIntent = 76;
  else if (luxuryFlag || groupFlag) travelIntent = 64;
  else travelIntent = 56;

  // 5) Source confidence — strength of curated references for the destination.
  const sourceCount = sources.length;
  let sourceConfidence: number;
  if (sourceCount >= 4) sourceConfidence = 96;
  else if (sourceCount === 3) sourceConfidence = 90;
  else if (sourceCount === 2) sourceConfidence = 84;
  else if (sourceCount === 1) sourceConfidence = 78;
  else sourceConfidence = 60;

  return {
    signature,
    seasonality,
    venueDensity,
    travelIntent,
    sourceConfidence,
    eventsThisMonth,
    venues,
    sources,
    isPeak
  };
}

export const MONTHLY_DESTINATION_SCORES: MonthlyDestinationScore[] = DESTINATIONS.flatMap(
  (destination) => {
    return destination.activeMonths.map((month) => {
      const dim = dimensionScores(destination, month);
      const overallScore = Math.round(
        dim.signature * 0.35 +
          dim.seasonality * 0.25 +
          dim.venueDensity * 0.2 +
          dim.travelIntent * 0.15 +
          dim.sourceConfidence * 0.05
      );

      const topGenres = destination.genres.slice(0, 4);
      const genreScores = Object.fromEntries(
        topGenres.map((genre, index) => [genre, Math.max(58, overallScore - index * 6)])
      ) as Partial<Record<Genre, number>>;

      const headlineEvent = dim.eventsThisMonth[0];
      const stackedCount = dim.eventsThisMonth.length;

      const editorialSummary = dim.isPeak
        ? PEAK_HOOKS[destination.slug] ??
          `${destination.city} is in one of its clearest music-travel months — programming, venues, and travel intent all peak together.`
        : headlineEvent
          ? `${destination.city} runs ${stackedCount} ${
              stackedCount === 1 ? "anchor moment" : "anchor moments"
            } this month, led by ${headlineEvent.title}.`
          : `${destination.city} stays active with ${destination.genres
              .slice(0, 2)
              .join(" and ")} programming — best paired with flexible dates.`;

      const whyNow: string[] = [];
      if (dim.isPeak) {
        whyNow.push(
          PEAK_HOOKS[destination.slug] ??
            `${destination.city} hits its peak music-travel window this month.`
        );
      } else if (headlineEvent) {
        whyNow.push(`${headlineEvent.title} anchors ${destination.city} this month.`);
      } else {
        whyNow.push(`${destination.city} stays credibly active for music travel.`);
      }
      if (stackedCount >= 2) {
        whyNow.push(
          `${stackedCount} curated moments stacked across ${destination.city}'s calendar.`
        );
      } else if (dim.venues.length >= 2) {
        whyNow.push(
          `${dim.venues.length} curated venues keep ${destination.city} programmed week to week.`
        );
      }
      whyNow.push(`Best fit: ${destination.whoFor[0].toLowerCase()}.`);

      const confidence: MonthlyDestinationScore["confidence"] =
        overallScore >= 88 ? "high" : overallScore >= 74 ? "medium" : "low";

      return {
        destinationSlug: destination.slug,
        month,
        year: null,
        overallScore,
        confidence,
        editorialSummary,
        genreScores,
        whyNow
      };
    });
  }
);

export type EditorsPick = {
  month: MonthNumber;
  destinationSlug: string;
  headline: string;
  body: string;
};

export const MONTHLY_EDITORS_PICKS: Record<MonthNumber, EditorsPick> = {
  1: {
    month: 1,
    destinationSlug: "tulum",
    headline: "Tulum opens the year with sets in the jungle.",
    body: "Zamna runs through January with techno headliners; the beach scene stays in full swing."
  },
  2: {
    month: 2,
    destinationSlug: "rio-de-janeiro",
    headline: "Carnival makes Rio the loudest music-travel week on earth.",
    body: "Two weeks of blocos, samba schools, and after-parties. Book flights and stays months out."
  },
  3: {
    month: 3,
    destinationSlug: "miami",
    headline: "Miami Music Week is where the global house circuit collides.",
    body: "Ultra weekend, hotel pool parties, and label takeovers cascade across South Beach."
  },
  4: {
    month: 4,
    destinationSlug: "cape-town",
    headline: "Cape Town's autumn keeps the Atlantic warm and the deep-house calendar full.",
    body: "Sea Point sundowners, Long Street late nights, and a programming season that resists the hemisphere."
  },
  5: {
    month: 5,
    destinationSlug: "barcelona",
    headline: "Primavera Sound rings the bell on Europe's festival summer.",
    body: "Sónar follows a week later — a one-two punch that books the city out in advance."
  },
  6: {
    month: 6,
    destinationSlug: "berlin",
    headline: "Berlin's open-air season returns and the club calendar runs hot.",
    body: "Daytime parties at Sisyphos, dawn sets at Berghain, and a packed lineup of international guests."
  },
  7: {
    month: 7,
    destinationSlug: "ibiza",
    headline: "Ibiza is at peak frequency — pick your week, pick your scene.",
    body: "Hï, DC10, Pacha, and Ushuaïa run nightly; pace yourself across multiple residencies."
  },
  8: {
    month: 8,
    destinationSlug: "mykonos",
    headline: "Mykonos turns sunset into the main event.",
    body: "Scorpios anchors the season, SantAnna closes Sundays, and the island runs late."
  },
  9: {
    month: 9,
    destinationSlug: "lisbon-portimao",
    headline: "Lisbon's shoulder season keeps Atlantic festivals running.",
    body: "Late-season weekends in the Algarve before Europe winds down for autumn."
  },
  10: {
    month: 10,
    destinationSlug: "marrakech",
    headline: "Marrakech in October is shoulder-warm and small-room intimate.",
    body: "Riads program private DJ sets and dinners as the temperature drops to perfect."
  },
  11: {
    month: 11,
    destinationSlug: "bali",
    headline: "Bali's beach-club season warms up as the rest of the world cools down.",
    body: "Canggu day parties and Uluwatu cliffside sets run the November-March stretch."
  },
  12: {
    month: 12,
    destinationSlug: "dubai",
    headline: "Dubai inherits winter's global DJ circuit.",
    body: "Soundstorm season, beach clubs running on prime time, and headliners chasing the warmth."
  }
};

export function getEditorsPickForMonth(month: MonthNumber): EditorsPick {
  return MONTHLY_EDITORS_PICKS[month];
}

export function getDestinationBySlug(slug: string) {
  return destinationBySlug.get(slug);
}

// O(1) lookup indexes precomputed once at module load. Without these,
// each card / marker render triggered an Array.find / Array.filter
// across ~456 score rows and ~700+ events.
const scoresBySlug = new Map<string, MonthlyDestinationScore[]>();
const scoreByKey = new Map<string, MonthlyDestinationScore>();
for (const score of MONTHLY_DESTINATION_SCORES) {
  const list = scoresBySlug.get(score.destinationSlug);
  if (list) list.push(score);
  else scoresBySlug.set(score.destinationSlug, [score]);
  scoreByKey.set(`${score.destinationSlug}:${score.month}`, score);
}
for (const list of scoresBySlug.values()) list.sort((a, b) => a.month - b.month);

const eventsBySlug = new Map<string, Event[]>();
for (const event of EVENTS) {
  const list = eventsBySlug.get(event.destinationSlug);
  if (list) list.push(event);
  else eventsBySlug.set(event.destinationSlug, [event]);
}
for (const list of eventsBySlug.values()) {
  list.sort((a, b) => {
    const startDelta = a.startDate.localeCompare(b.startDate);
    if (startDelta !== 0) return startDelta;
    return b.importanceScore - a.importanceScore;
  });
}

const eventsBySlugMonth = new Map<string, Event[]>();
function eventCoversMonth(event: Event, month: MonthNumber) {
  const start = new Date(event.startDate);
  if (Number.isNaN(start.getTime())) return false;
  const end = event.endDate ? new Date(event.endDate) : start;
  const startMonth = (start.getUTCMonth() + 1) as MonthNumber;
  const endMonth = (end.getUTCMonth() + 1) as MonthNumber;
  if (startMonth <= endMonth) {
    return month >= startMonth && month <= endMonth;
  }
  return month >= startMonth || month <= endMonth;
}
for (const [slug, list] of eventsBySlug) {
  for (let m = 1; m <= 12; m++) {
    const month = m as MonthNumber;
    const monthEvents = list
      .filter((event) => eventCoversMonth(event, month))
      .slice()
      .sort((a, b) => b.importanceScore - a.importanceScore);
    if (monthEvents.length > 0) {
      eventsBySlugMonth.set(`${slug}:${month}`, monthEvents);
    }
  }
}

export function getScoresForDestination(slug: string) {
  return scoresBySlug.get(slug) ?? [];
}

export function getScoreForDestinationMonth(slug: string, month: MonthNumber) {
  return scoreByKey.get(`${slug}:${month}`);
}

export function getEventsForDestination(slug: string) {
  return eventsBySlug.get(slug) ?? [];
}

export function getEventsForDestinationInMonth(slug: string, month: MonthNumber) {
  return eventsBySlugMonth.get(`${slug}:${month}`) ?? [];
}

export type DestinationMonthSummary = {
  count: number;
  spanLabel: string | null;
};

const SHORT_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const;

export function getDestinationMonthSummary(slug: string, month: MonthNumber): DestinationMonthSummary {
  const events = getEventsForDestinationInMonth(slug, month);
  if (events.length === 0) {
    return { count: 0, spanLabel: null };
  }

  let earliest = new Date(events[0].startDate);
  let latest = new Date(events[0].endDate ?? events[0].startDate);
  for (const event of events) {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate ?? event.startDate);
    if (start < earliest) earliest = start;
    if (end > latest) latest = end;
  }

  const startMonth = earliest.getUTCMonth();
  const endMonth = latest.getUTCMonth();
  const startDay = earliest.getUTCDate();
  const endDay = latest.getUTCDate();
  const dayDiff = Math.round((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24));

  let spanLabel: string;
  if (dayDiff >= 300) {
    spanLabel = "year-round";
  } else if (startMonth === endMonth) {
    const monthShort = SHORT_MONTHS[startMonth];
    spanLabel = startDay === endDay ? `${monthShort} ${startDay}` : `${monthShort} ${startDay}–${endDay}`;
  } else if (dayDiff >= 75) {
    spanLabel = `${SHORT_MONTHS[startMonth]} – ${SHORT_MONTHS[endMonth]}`;
  } else {
    spanLabel = `${SHORT_MONTHS[startMonth]} ${startDay} – ${SHORT_MONTHS[endMonth]} ${endDay}`;
  }

  return { count: events.length, spanLabel };
}

export function getVenuesForDestination(slug: string) {
  return VENUES.filter((venue) => venue.destinationSlug === slug);
}

export function getSourcesForDestination(slug: string) {
  return CURATION_SOURCES.filter((source) => source.destinationSlug === slug);
}

export function getLastEditedForDestination(slug: string): string | null {
  const sources = getSourcesForDestination(slug);
  if (sources.length === 0) return null;
  return sources.reduce((latest, source) => {
    if (!latest) return source.lastChecked;
    return source.lastChecked > latest ? source.lastChecked : latest;
  }, sources[0].lastChecked);
}

const HIDDEN_GEM_DOMINANT_REGIONS = new Set<string>(["Europe", "North America"]);

export function getTrendingSlugsForMonth(month: MonthNumber, limit = 3): Set<string> {
  const previousMonth = (month === 1 ? 12 : month - 1) as MonthNumber;
  const candidates: Array<{ slug: string; delta: number }> = [];
  for (const destination of DESTINATIONS) {
    const current = getScoreForDestinationMonth(destination.slug, month);
    const previous = getScoreForDestinationMonth(destination.slug, previousMonth);
    if (!current || !previous) continue;
    if (current.overallScore < 75) continue;
    const delta = current.overallScore - previous.overallScore;
    if (delta < 5) continue;
    candidates.push({ slug: destination.slug, delta });
  }
  candidates.sort((a, b) => b.delta - a.delta);
  return new Set(candidates.slice(0, limit).map((c) => c.slug));
}

export function getHiddenGemSlugsForMonth(month: MonthNumber): Set<string> {
  const gems = new Set<string>();
  for (const destination of DESTINATIONS) {
    if (destination.budget !== "low" && destination.budget !== "medium") continue;
    if (HIDDEN_GEM_DOMINANT_REGIONS.has(destination.region)) continue;
    const score = getScoreForDestinationMonth(destination.slug, month);
    if (!score || score.overallScore < 75) continue;
    gems.add(destination.slug);
  }
  return gems;
}

export function getMonthsInRange(anchor: MonthNumber, stayLength: number): MonthNumber[] {
  const length = Math.max(1, Math.min(3, Math.floor(stayLength || 1)));
  const months: MonthNumber[] = [];
  for (let i = 0; i < length; i += 1) {
    const m = (((anchor - 1 + i) % 12) + 12) % 12;
    months.push((m + 1) as MonthNumber);
  }
  return months;
}

export function getEventsForDestinationInRange(slug: string, months: MonthNumber[]) {
  const seen = new Set<string>();
  const collected: typeof EVENTS = [];
  for (const month of months) {
    for (const event of getEventsForDestinationInMonth(slug, month)) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      collected.push(event);
    }
  }
  return collected.sort((a, b) => b.importanceScore - a.importanceScore);
}

export function getDestinationRangeSummary(
  slug: string,
  months: MonthNumber[]
): DestinationMonthSummary {
  const events = getEventsForDestinationInRange(slug, months);
  if (events.length === 0) {
    return { count: 0, spanLabel: null };
  }

  let earliest = new Date(events[0].startDate);
  let latest = new Date(events[0].endDate ?? events[0].startDate);
  for (const event of events) {
    const start = new Date(event.startDate);
    const end = new Date(event.endDate ?? event.startDate);
    if (start < earliest) earliest = start;
    if (end > latest) latest = end;
  }

  const startMonth = earliest.getUTCMonth();
  const endMonth = latest.getUTCMonth();
  const startDay = earliest.getUTCDate();
  const endDay = latest.getUTCDate();
  const dayDiff = Math.round((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24));

  let spanLabel: string;
  if (dayDiff >= 300) {
    spanLabel = "year-round";
  } else if (startMonth === endMonth) {
    const monthShort = SHORT_MONTHS[startMonth];
    spanLabel = startDay === endDay ? `${monthShort} ${startDay}` : `${monthShort} ${startDay}–${endDay}`;
  } else if (dayDiff >= 75) {
    spanLabel = `${SHORT_MONTHS[startMonth]} – ${SHORT_MONTHS[endMonth]}`;
  } else {
    spanLabel = `${SHORT_MONTHS[startMonth]} ${startDay} – ${SHORT_MONTHS[endMonth]} ${endDay}`;
  }

  return { count: events.length, spanLabel };
}

function bestScoreInRange(slug: string, months: MonthNumber[]) {
  let best: ReturnType<typeof getScoreForDestinationMonth> = undefined;
  for (const month of months) {
    const candidate = getScoreForDestinationMonth(slug, month);
    if (!candidate) continue;
    if (!best || candidate.overallScore > best.overallScore) {
      best = candidate;
    }
  }
  return best;
}

export function getFilteredDestinations(filters: DiscoveryFilters) {
  const months = getMonthsInRange(filters.month, filters.stayLength ?? 1);
  return DESTINATIONS.map((destination) => ({
    destination,
    score: bestScoreInRange(destination.slug, months)
  }))
    .filter(({ destination, score }) => {
      if (!score) return false;
      if (filters.genre && filters.genre !== "all" && !destination.genres.includes(filters.genre)) return false;
      if (filters.vibe && filters.vibe !== "all" && !destination.vibes.includes(filters.vibe)) return false;
      if (filters.budget && filters.budget !== "all" && !budgetMatches(destination.budget, filters.budget)) return false;
      if (filters.region && filters.region !== "all" && destination.region !== filters.region) return false;
      return true;
    })
    .sort((a, b) => (b.score?.overallScore ?? 0) - (a.score?.overallScore ?? 0));
}

export function getTopDestinations(month: MonthNumber, limit = 6) {
  return getFilteredDestinations({ month }).slice(0, limit);
}

function budgetMatches(destinationBudget: Budget, requestedBudget: Budget) {
  const order: Budget[] = ["low", "medium", "high", "luxury"];
  return order.indexOf(destinationBudget) <= order.indexOf(requestedBudget);
}
