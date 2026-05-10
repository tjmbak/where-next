import type { EventType, Genre, MonthNumber } from "@/types/content";

/**
 * Curated static event seeds. Each blueprint is a hand-picked anchor
 * for a destination/month. The runtime overlay (`approved-events.json`)
 * supersedes blueprints whenever the AI returned at least one event for
 * the same (slug, month) pair, but blueprints stay as a graceful
 * fallback for months the AI declined to cover.
 */

export type EventBlueprint = {
  id: string;
  title: string;
  type: EventType;
  startMonth: MonthNumber;
  startDay: number;
  endMonth?: MonthNumber;
  endDay?: number;
  importance: number;
  summary: string;
  sourceUrl: string;
  venueId?: string;
  genres?: Genre[];
};

export const EVENT_BLUEPRINTS: Record<string, EventBlueprint[]> = {
  ibiza: [
    {
      id: "ibiza-hi-residency",
      title: "Hi Ibiza Resident Sessions",
      type: "residency",
      startMonth: 5,
      startDay: 23,
      endMonth: 10,
      endDay: 4,
      importance: 92,
      summary:
        "Hi Ibiza's flagship Saturday and Friday nights anchor the calendar with rotating world-class residencies and global headliners.",
      venueId: "hi-ibiza",
      sourceUrl: "https://www.hiibiza.com/"
    },
    {
      id: "ibiza-dc10-circoloco",
      title: "DC10 Circoloco Mondays",
      type: "residency",
      startMonth: 5,
      startDay: 25,
      endMonth: 9,
      endDay: 28,
      importance: 90,
      summary:
        "Circoloco's Monday night residency at DC10 is the island's longest-running underground party institution.",
      venueId: "dc10",
      sourceUrl: "https://www.dc10ibiza.com/"
    },
    {
      id: "ibiza-solomun-sundays",
      title: "Solomun +1 / +2 Sundays",
      type: "residency",
      startMonth: 7,
      startDay: 5,
      endMonth: 9,
      endDay: 27,
      importance: 89,
      summary:
        "Solomun's Sunday night Pacha residencies pull dance music's most respected guests into long-form B2B sessions.",
      sourceUrl: "https://pacha.com/"
    },
    {
      id: "ibiza-pacha-closing",
      title: "Pacha Closing Fiesta",
      type: "festival",
      startMonth: 10,
      startDay: 3,
      endMonth: 10,
      endDay: 10,
      importance: 87,
      summary:
        "Pacha's iconic closing weekend marks the end of the Ibiza summer with extended sets across rooms and a global guest list.",
      sourceUrl: "https://pacha.com/"
    }
  ],
  mykonos: [
    {
      id: "mykonos-scorpios-sunsets",
      title: "Scorpios Sunset Sessions",
      type: "residency",
      startMonth: 6,
      startDay: 12,
      endMonth: 9,
      endDay: 28,
      importance: 88,
      summary:
        "Sunset programming and long-form dance sets that anchor Mykonos's beach club identity, hosting world-class Afro-house and house DJs.",
      venueId: "scorpios",
      sourceUrl: "https://www.scorpiosmykonos.com/"
    },
    {
      id: "mykonos-cavo-tagoo",
      title: "Cavo Tagoo Saturday Nights",
      type: "club-night",
      startMonth: 7,
      startDay: 4,
      endMonth: 8,
      endDay: 29,
      importance: 84,
      summary:
        "Saturday parties spilling from poolside into open-air dancefloors with rotating international guest DJs.",
      sourceUrl: "https://www.cavotagoomykonos.com/"
    },
    {
      id: "mykonos-santanna-days",
      title: "SantAnna Beach Days",
      type: "beach-club",
      startMonth: 6,
      startDay: 20,
      endMonth: 9,
      endDay: 13,
      importance: 82,
      summary:
        "Sunday beach club programming that's become a Mykonos season ritual, blending lunch, day-party, and sunset sets.",
      sourceUrl: "https://santannamykonos.com/"
    }
  ],
  "lisbon-portimao": [
    {
      id: "lisbon-afro-nation",
      title: "Afro Nation Portugal",
      type: "festival",
      startMonth: 7,
      startDay: 1,
      endMonth: 7,
      endDay: 3,
      importance: 95,
      summary:
        "The world's biggest Afrobeats festival, drawing global travelers to the Algarve coast for three days of headline performances.",
      venueId: "afro-nation",
      sourceUrl: "https://www.afronation.com/"
    },
    {
      id: "lisbon-nos-alive",
      title: "NOS Alive",
      type: "festival",
      startMonth: 7,
      startDay: 9,
      endMonth: 7,
      endDay: 11,
      importance: 92,
      summary:
        "Lisbon's flagship indie and electronic festival on the Atlantic, with a deep crossover lineup.",
      sourceUrl: "https://www.nosalive.com/"
    },
    {
      id: "lisbon-superbock",
      title: "Super Bock Super Rock",
      type: "festival",
      startMonth: 7,
      startDay: 16,
      endMonth: 7,
      endDay: 18,
      importance: 87,
      summary: "Genre-spanning festival weekend at Meco Beach, mixing rock, hip-hop, and electronic acts.",
      sourceUrl: "https://en.wikipedia.org/wiki/Super_Bock_Super_Rock"
    },
    {
      id: "lisbon-meo-sudoeste",
      title: "MEO Sudoeste",
      type: "festival",
      startMonth: 8,
      startDay: 4,
      endMonth: 8,
      endDay: 8,
      importance: 86,
      summary: "Five days of camping, hip-hop, and electronic stages on Portugal's southwest coast.",
      sourceUrl: "https://en.wikipedia.org/wiki/MEO_Sudoeste"
    }
  ],
  barcelona: [
    {
      id: "barcelona-primavera",
      title: "Primavera Sound",
      type: "festival",
      startMonth: 6,
      startDay: 4,
      endMonth: 6,
      endDay: 6,
      importance: 96,
      summary:
        "Europe's premier indie and electronic festival — a music-tourism magnet that defines Barcelona's early-summer week.",
      venueId: "primavera",
      sourceUrl: "https://www.primaverasound.com/"
    },
    {
      id: "barcelona-sonar",
      title: "Sónar by Day & Night",
      type: "festival",
      startMonth: 6,
      startDay: 11,
      endMonth: 6,
      endDay: 13,
      importance: 94,
      summary:
        "The defining electronic music conference and festival, programming creative-tech, club, and visual arts across the city.",
      sourceUrl: "https://sonar.es/"
    },
    {
      id: "barcelona-brunch-electronik",
      title: "Brunch Electronik Sundays",
      type: "residency",
      startMonth: 5,
      startDay: 17,
      endMonth: 9,
      endDay: 27,
      importance: 84,
      summary:
        "Sunday outdoor parties at Poble Espanyol — Barcelona's signature daytime electronic format, with heavyweight rotating headliners.",
      sourceUrl: "https://brunchelectronik.com/"
    }
  ],
  berlin: [
    {
      id: "berlin-berghain-klubnacht",
      title: "Berghain Klubnacht",
      type: "club-night",
      startMonth: 5,
      startDay: 30,
      endMonth: 6,
      endDay: 1,
      importance: 92,
      summary:
        "Berlin's iconic Saturday-into-Monday weekly takeover at Berghain and Panorama Bar, with a deep techno and house program.",
      venueId: "berghain",
      sourceUrl: "https://www.berghain.berlin/"
    },
    {
      id: "berlin-ctm",
      title: "CTM Festival",
      type: "festival",
      startMonth: 1,
      startDay: 23,
      endMonth: 2,
      endDay: 1,
      importance: 88,
      summary:
        "Festival of adventurous music and visual arts that turns Berlin's depth of weirdness into a 10-day itinerary.",
      sourceUrl: "https://www.ctm-festival.de/"
    },
    {
      id: "berlin-atonal",
      title: "Atonal Festival",
      type: "festival",
      startMonth: 8,
      startDay: 26,
      endMonth: 8,
      endDay: 30,
      importance: 89,
      summary: "Industrial-scale techno, ambient, and experimental sound staged at Kraftwerk Berlin.",
      sourceUrl: "https://berlin-atonal.com/"
    },
    {
      id: "berlin-lollapalooza",
      title: "Lollapalooza Berlin",
      type: "festival",
      startMonth: 9,
      startDay: 12,
      endMonth: 9,
      endDay: 13,
      importance: 85,
      summary: "Stadium-scale festival blending hip-hop, pop, and electronic acts at Olympiastadion.",
      sourceUrl: "https://www.lollapaloozade.com/"
    }
  ],
  amsterdam: [
    {
      id: "amsterdam-ade",
      title: "Amsterdam Dance Event",
      type: "conference",
      startMonth: 10,
      startDay: 14,
      endMonth: 10,
      endDay: 18,
      importance: 98,
      summary:
        "The world's largest electronic music conference and festival, with 1,000+ events across the city over five days.",
      venueId: "ade",
      sourceUrl: "https://www.amsterdam-dance-event.nl/"
    },
    {
      id: "amsterdam-awakenings",
      title: "Awakenings Festival",
      type: "festival",
      startMonth: 7,
      startDay: 4,
      endMonth: 7,
      endDay: 5,
      importance: 94,
      summary:
        "The summer techno megafestival at Spaarnwoude — a must-attend for European dance music travel.",
      sourceUrl: "https://www.awakenings.com/"
    },
    {
      id: "amsterdam-dekmantel",
      title: "Dekmantel Festival",
      type: "festival",
      startMonth: 8,
      startDay: 5,
      endMonth: 8,
      endDay: 9,
      importance: 93,
      summary:
        "Five days of forward-thinking electronic programming at Amsterdamse Bos and city venues.",
      sourceUrl: "https://www.dekmantelfestival.com/"
    }
  ],
  london: [
    {
      id: "london-notting-hill",
      title: "Notting Hill Carnival",
      type: "carnival",
      startMonth: 8,
      startDay: 30,
      endMonth: 8,
      endDay: 31,
      importance: 96,
      summary:
        "Europe's largest street carnival — sound systems, parades, and Caribbean-led culture take over West London.",
      sourceUrl: "https://nhcarnival.org/"
    },
    {
      id: "london-all-points-east",
      title: "All Points East",
      type: "festival",
      startMonth: 8,
      startDay: 21,
      endMonth: 8,
      endDay: 30,
      importance: 88,
      summary: "Victoria Park's two-weekend festival run with strong electronic and indie billings.",
      sourceUrl: "https://www.allpointseastfestival.com/"
    },
    {
      id: "london-wireless",
      title: "Wireless Festival",
      type: "festival",
      startMonth: 7,
      startDay: 10,
      endMonth: 7,
      endDay: 12,
      importance: 87,
      summary: "Hip-hop, R&B, and Afrobeats festival at Finsbury Park, with a globally minded headline list.",
      sourceUrl: "https://en.wikipedia.org/wiki/Wireless_Festival"
    },
    {
      id: "london-fabric-residencies",
      title: "fabric Weekend Residencies",
      type: "club-night",
      startMonth: 1,
      startDay: 1,
      endMonth: 12,
      endDay: 31,
      importance: 84,
      summary:
        "fabric's Friday and Saturday programming runs year-round — a year-long anchor for visiting club travelers.",
      venueId: "fabric",
      sourceUrl: "https://www.fabriclondon.com/"
    }
  ],
  miami: [
    {
      id: "miami-ultra",
      title: "Ultra Music Festival",
      type: "festival",
      startMonth: 3,
      startDay: 27,
      endMonth: 3,
      endDay: 29,
      importance: 96,
      summary:
        "Bayfront Park's flagship electronic festival, the cornerstone of Miami Music Week and a global EDM travel anchor.",
      venueId: "ultra-miami",
      sourceUrl: "https://ultramusicfestival.com/"
    },
    {
      id: "miami-music-week",
      title: "Miami Music Week",
      type: "festival",
      startMonth: 3,
      startDay: 24,
      endMonth: 3,
      endDay: 30,
      importance: 92,
      summary: "A week of pool parties, beach events, and club showcases surrounding Ultra.",
      sourceUrl: "https://miamimusicweek.com/"
    },
    {
      id: "miami-rolling-loud",
      title: "Rolling Loud Miami",
      type: "festival",
      startMonth: 12,
      startDay: 11,
      endMonth: 12,
      endDay: 13,
      importance: 91,
      summary: "Hip-hop's biggest festival — three days of headliners and underground rappers.",
      sourceUrl: "https://www.rollingloud.com/"
    },
    {
      id: "miami-iii-points",
      title: "III Points Festival",
      type: "festival",
      startMonth: 10,
      startDay: 17,
      endMonth: 10,
      endDay: 18,
      importance: 84,
      summary: "Wynwood-based festival blending electronic, indie, and hip-hop programming.",
      sourceUrl: "https://iiipoints.com/"
    }
  ],
  tulum: [
    {
      id: "tulum-day-zero",
      title: "Day Zero Tulum",
      type: "festival",
      startMonth: 1,
      startDay: 15,
      endMonth: 1,
      endDay: 16,
      importance: 95,
      summary:
        "Damian Lazarus's flagship cenote festival — the most prestigious party on Tulum's calendar.",
      sourceUrl: "https://dayzerofestival.com/"
    },
    {
      id: "tulum-zamna",
      title: "Zamna Tulum",
      type: "festival",
      startMonth: 1,
      startDay: 4,
      endMonth: 2,
      endDay: 22,
      importance: 92,
      summary:
        "Multi-week jungle festival series featuring international techno headliners across hidden cenote venues.",
      venueId: "zamna",
      sourceUrl: "https://zamnafestival.com/"
    },
    {
      id: "tulum-circoloco-nye",
      title: "Circoloco Tulum NYE",
      type: "club-night",
      startMonth: 12,
      startDay: 31,
      endMonth: 12,
      endDay: 31,
      importance: 90,
      summary:
        "Circoloco brings DC10 energy to a Tulum jungle venue for a New Year's Eve takeover.",
      sourceUrl: "https://circolocoibiza.com/"
    },
    {
      id: "tulum-get-lost",
      title: "Damian Lazarus Get Lost",
      type: "festival",
      startMonth: 2,
      startDay: 13,
      endMonth: 2,
      endDay: 14,
      importance: 87,
      summary: "Crosstown Rebels' label showcase weekend across jungle and beach venues.",
      sourceUrl: "https://crosstownrebels.com/"
    }
  ],
  "los-angeles": [
    {
      id: "la-coachella-w1",
      title: "Coachella Weekend One",
      type: "festival",
      startMonth: 4,
      startDay: 10,
      endMonth: 4,
      endDay: 12,
      importance: 99,
      summary:
        "Indio's two-weekend desert festival is the calendar anchor for North American music travel.",
      venueId: "coachella",
      sourceUrl: "https://www.coachella.com/"
    },
    {
      id: "la-coachella-w2",
      title: "Coachella Weekend Two",
      type: "festival",
      startMonth: 4,
      startDay: 17,
      endMonth: 4,
      endDay: 19,
      importance: 98,
      summary: "The second weekend repeats the headliners — typically the harder ticket to score.",
      venueId: "coachella",
      sourceUrl: "https://www.coachella.com/"
    },
    {
      id: "la-hard-summer",
      title: "Hard Summer",
      type: "festival",
      startMonth: 8,
      startDay: 1,
      endMonth: 8,
      endDay: 2,
      importance: 88,
      summary: "Electronic festival at LA State Historic Park with house, bass, and techno stages.",
      sourceUrl: "https://hardsummer.com/"
    },
    {
      id: "la-camp-flog-gnaw",
      title: "Camp Flog Gnaw Carnival",
      type: "festival",
      startMonth: 11,
      startDay: 14,
      endMonth: 11,
      endDay: 15,
      importance: 87,
      summary:
        "Tyler, the Creator's curated festival blending hip-hop, R&B, and electronic culture.",
      sourceUrl: "https://campfloggnaw.com/"
    }
  ],
  "new-york": [
    {
      id: "ny-electric-zoo",
      title: "Electric Zoo",
      type: "festival",
      startMonth: 8,
      startDay: 28,
      endMonth: 8,
      endDay: 30,
      importance: 92,
      summary: "Randall's Island's electronic festival — NYC's headline EDM weekend.",
      sourceUrl: "https://en.wikipedia.org/wiki/Electric_Zoo"
    },
    {
      id: "ny-governors-ball",
      title: "Governors Ball",
      type: "festival",
      startMonth: 6,
      startDay: 5,
      endMonth: 6,
      endDay: 7,
      importance: 90,
      summary: "NYC's flagship indie and pop festival on Randall's Island.",
      sourceUrl: "https://www.governorsballmusicfestival.com/"
    },
    {
      id: "ny-mirage-residencies",
      title: "Brooklyn Mirage Residencies",
      type: "residency",
      startMonth: 5,
      startDay: 1,
      endMonth: 10,
      endDay: 31,
      importance: 89,
      summary:
        "Brooklyn Mirage's open-air programming runs the full warm-weather calendar with a who's-who of electronic acts.",
      venueId: "brooklyn-mirage",
      sourceUrl: "https://www.avant-gardner.com/"
    },
    {
      id: "ny-summerstage",
      title: "SummerStage in Central Park",
      type: "concert",
      startMonth: 6,
      startDay: 1,
      endMonth: 9,
      endDay: 15,
      importance: 84,
      summary:
        "City Parks Foundation's flagship free summer concert series in Central Park and across NYC parks, headlined by major touring artists.",
      sourceUrl: "https://cityparksfoundation.org/summerstage/"
    }
  ],
  "cape-town": [
    {
      id: "ct-daisies",
      title: "Daisies Cape Town",
      type: "festival",
      startMonth: 12,
      startDay: 5,
      endMonth: 12,
      endDay: 7,
      importance: 90,
      summary:
        "South Africa's flagship outdoor music festival held just outside Cape Town, blending Afro-house, hip-hop, and indie.",
      venueId: "rocking-the-daisies",
      sourceUrl: "https://rockingthedaisies.com/"
    },
    {
      id: "ct-electronic",
      title: "Cape Town Electronic Music Festival",
      type: "festival",
      startMonth: 2,
      startDay: 6,
      endMonth: 2,
      endDay: 8,
      importance: 88,
      summary:
        "City-wide multi-venue electronic showcase across underground and mainstream venues.",
      sourceUrl: "https://ctemf.com/"
    },
    {
      id: "ct-jazz",
      title: "Cape Town International Jazz Festival",
      type: "festival",
      startMonth: 3,
      startDay: 28,
      endMonth: 3,
      endDay: 29,
      importance: 87,
      summary:
        "Africa's biggest jazz festival, drawing international acts to the V&A Waterfront.",
      sourceUrl: "https://www.capetownjazzfest.com/"
    },
    {
      id: "ct-newyear-beach",
      title: "New Year Beach Sessions",
      type: "residency",
      startMonth: 12,
      startDay: 30,
      endMonth: 1,
      endDay: 2,
      importance: 86,
      summary:
        "Camps Bay and Clifton beach club programming runs through the New Year holiday peak.",
      sourceUrl: "https://www.capetown.travel/"
    }
  ],
  lagos: [
    {
      id: "lagos-detty-beach",
      title: "Detty December Beach Days",
      type: "residency",
      startMonth: 12,
      startDay: 18,
      endMonth: 12,
      endDay: 31,
      importance: 92,
      summary:
        "Lagos's diaspora-fueled outdoor party season, anchored by beach events and pool day-parties.",
      venueId: "detty-december-lagos",
      sourceUrl: "https://en.wikipedia.org/wiki/Detty_December"
    },
    {
      id: "lagos-flytime",
      title: "Flytime Music Festival",
      type: "festival",
      startMonth: 12,
      startDay: 22,
      endMonth: 12,
      endDay: 26,
      importance: 91,
      summary:
        "Five days of stadium-scale Afrobeats programming with the genre's biggest headliners.",
      sourceUrl: "https://flytimemusicfestival.com/"
    },
    {
      id: "lagos-wizkid-live",
      title: "Wizkid Live Lagos",
      type: "concert",
      startMonth: 12,
      startDay: 28,
      endMonth: 12,
      endDay: 28,
      importance: 95,
      summary:
        "Wizkid's annual Lagos homecoming concert — the marquee Detty December moment.",
      sourceUrl: "https://wizkidayo.com/"
    },
    {
      id: "lagos-popup-shows",
      title: "Afrobeats Pop-Up Concerts",
      type: "concert",
      startMonth: 12,
      startDay: 14,
      endMonth: 12,
      endDay: 30,
      importance: 88,
      summary:
        "Asake, Burna Boy, Davido, and others rotate through one-off Lagos concerts and club appearances throughout December.",
      sourceUrl: "https://en.wikipedia.org/wiki/Detty_December"
    }
  ],
  accra: [
    {
      id: "accra-afrofuture",
      title: "AfroFuture",
      type: "festival",
      startMonth: 12,
      startDay: 28,
      endMonth: 12,
      endDay: 29,
      importance: 95,
      summary:
        "The Pan-African festival headlines Accra's December cultural calendar with Afrobeats, hip-hop, and amapiano.",
      venueId: "afrofuture",
      sourceUrl: "https://www.afrofuture.com/"
    },
    {
      id: "accra-detty-rave",
      title: "Detty Rave",
      type: "festival",
      startMonth: 12,
      startDay: 26,
      endMonth: 12,
      endDay: 27,
      importance: 90,
      summary: "Youth-culture festival blending Afrobeats, drill, and R&B sets across two days.",
      sourceUrl: "https://dettyrave.com/"
    },
    {
      id: "accra-asaase",
      title: "Asaase Sound Clash",
      type: "concert",
      startMonth: 12,
      startDay: 23,
      endMonth: 12,
      endDay: 23,
      importance: 87,
      summary:
        "Annual radio sound clash between Ghana's biggest selectors and crews — a December tradition.",
      sourceUrl: "https://asaaseradio.com/"
    },
    {
      id: "accra-tidal-rave",
      title: "Tidal Rave",
      type: "festival",
      startMonth: 12,
      startDay: 30,
      endMonth: 12,
      endDay: 30,
      importance: 84,
      summary:
        "Beach festival at Ada Foah pulling diaspora and local crowds for an end-of-year set.",
      sourceUrl: "https://www.tidalrave.com/"
    }
  ],
  paris: [
    {
      id: "paris-we-love-green",
      title: "We Love Green",
      type: "festival",
      startMonth: 6,
      startDay: 6,
      endMonth: 6,
      endDay: 7,
      importance: 89,
      summary:
        "Vincennes forest festival blending sustainable design, electronic, and indie programming.",
      sourceUrl: "https://www.welovegreen.fr/"
    },
    {
      id: "paris-lollapalooza",
      title: "Lollapalooza Paris",
      type: "festival",
      startMonth: 7,
      startDay: 18,
      endMonth: 7,
      endDay: 20,
      importance: 86,
      summary:
        "Hippodrome de Longchamp festival featuring stadium pop and hip-hop acts.",
      sourceUrl: "https://www.lollaparis.com/"
    },
    {
      id: "paris-rock-en-seine",
      title: "Rock en Seine",
      type: "festival",
      startMonth: 9,
      startDay: 4,
      endMonth: 9,
      endDay: 7,
      importance: 88,
      summary: "Paris's flagship rock and pop festival in Saint-Cloud.",
      sourceUrl: "https://www.rockenseine.com/"
    },
    {
      id: "paris-fashion-week-afterparties",
      title: "Fashion Week Afterparties",
      type: "club-night",
      startMonth: 9,
      startDay: 29,
      endMonth: 10,
      endDay: 7,
      importance: 82,
      summary:
        "Paris Fashion Week unlocks the city's club programming with major guest DJ runs at Rex, Silencio, and warehouse pop-ups.",
      venueId: "rex-club",
      sourceUrl: "https://rexclub.com/"
    }
  ],
  dubai: [
    {
      id: "dubai-untold",
      title: "Untold Dubai",
      type: "festival",
      startMonth: 2,
      startDay: 13,
      endMonth: 2,
      endDay: 15,
      importance: 92,
      summary:
        "Dubai Marina's flagship electronic festival, drawing big-room headliners across multiple stages.",
      sourceUrl: "https://untold.com/dubai"
    },
    {
      id: "dubai-redfest",
      title: "RedFestDXB",
      type: "festival",
      startMonth: 2,
      startDay: 6,
      endMonth: 2,
      endDay: 7,
      importance: 84,
      summary: "Two-day pop and hip-hop festival at the Dubai Media City Amphitheatre.",
      sourceUrl: "https://redfestdxb.com/"
    },
    {
      id: "dubai-sole-dxb",
      title: "Sole DXB",
      type: "festival",
      startMonth: 12,
      startDay: 5,
      endMonth: 12,
      endDay: 7,
      importance: 87,
      summary:
        "Sneaker, streetwear, and music festival at Dubai Design District — strong R&B, soul, and hip-hop programming.",
      sourceUrl: "https://soledxb.com/"
    },
    {
      id: "dubai-beachclub-season",
      title: "Beach Club Residency Season",
      type: "residency",
      startMonth: 11,
      startDay: 1,
      endMonth: 2,
      endDay: 28,
      importance: 85,
      summary:
        "Soho Garden, Drift, and the city's beach clubs run their busiest programming through cooler months.",
      venueId: "soho-garden",
      sourceUrl: "https://sohogardendxb.com/"
    }
  ],
  bali: [
    {
      id: "bali-finns-residencies",
      title: "Finns Beach Club Residencies",
      type: "residency",
      startMonth: 7,
      startDay: 1,
      endMonth: 8,
      endDay: 31,
      importance: 86,
      summary:
        "Canggu's biggest beach club hits its highest gear during European summer season.",
      sourceUrl: "https://finnsbeachclub.com/"
    },
    {
      id: "bali-spirit",
      title: "Bali Spirit Festival",
      type: "festival",
      startMonth: 5,
      startDay: 7,
      endMonth: 5,
      endDay: 10,
      importance: 84,
      summary:
        "Wellness, world music, and yoga festival at Ubud — Bali's cultural anchor weekend.",
      sourceUrl: "https://www.balispiritfestival.com/"
    },
    {
      id: "bali-sundays",
      title: "Sundays Beach Club Sessions",
      type: "residency",
      startMonth: 5,
      startDay: 1,
      endMonth: 9,
      endDay: 30,
      importance: 82,
      summary:
        "Long-form beach club programming with sunset DJs in Uluwatu's cliff-cove venue.",
      sourceUrl: "https://sundaysbeachclub.com/"
    },
    {
      id: "bali-la-brisa",
      title: "La Brisa Sundowners",
      type: "beach-club",
      startMonth: 6,
      startDay: 1,
      endMonth: 9,
      endDay: 30,
      importance: 80,
      summary:
        "Canggu's hidden beach venue with sunset programming and tropical-house DJs.",
      sourceUrl: "https://www.labrisabali.com/"
    }
  ],
  marbella: [
    {
      id: "marbella-starlite",
      title: "Starlite Occident",
      type: "festival",
      startMonth: 7,
      startDay: 10,
      endMonth: 8,
      endDay: 24,
      importance: 88,
      summary:
        "Marbella's open-air concert festival pulls big-name headliners to the Andalusian coast for six weeks.",
      sourceUrl: "https://starlitemarbella.com/"
    },
    {
      id: "marbella-olivia-valere",
      title: "Olivia Valere Saturday Sessions",
      type: "residency",
      startMonth: 6,
      startDay: 7,
      endMonth: 9,
      endDay: 27,
      importance: 84,
      summary: "The legendary Marbella nightclub's flagship Saturday programming.",
      venueId: "olivia-valere",
      sourceUrl: "https://oliviavalere.com/"
    },
    {
      id: "marbella-nikki-beach",
      title: "Nikki Beach Marbella Days",
      type: "beach-club",
      startMonth: 6,
      startDay: 15,
      endMonth: 9,
      endDay: 15,
      importance: 82,
      summary:
        "Beach club Sundays and Champagne brunches with rotating international DJs.",
      sourceUrl: "https://www.nikkibeach.com/"
    }
  ],
  split: [
    {
      id: "split-ultra-europe",
      title: "Ultra Europe",
      type: "festival",
      startMonth: 7,
      startDay: 11,
      endMonth: 7,
      endDay: 13,
      importance: 94,
      summary:
        "Park Mladezi's flagship dance festival, pulling festival travelers across the Adriatic.",
      venueId: "ultra-europe",
      sourceUrl: "https://ultraeurope.com/"
    },
    {
      id: "split-hideout",
      title: "Hideout Festival",
      type: "festival",
      startMonth: 6,
      startDay: 29,
      endMonth: 7,
      endDay: 3,
      importance: 90,
      summary:
        "Croatian island festival on Pag — beachfront stages and intimate boat parties.",
      sourceUrl: "https://hideoutfestival.com/"
    },
    {
      id: "split-defected",
      title: "Defected Croatia",
      type: "festival",
      startMonth: 8,
      startDay: 6,
      endMonth: 8,
      endDay: 10,
      importance: 88,
      summary:
        "House music festival on the Adriatic coast — the spiritual heir to Outlook's location.",
      sourceUrl: "https://defected.com/croatia/"
    }
  ],
  malta: [
    {
      id: "malta-glitch",
      title: "Glitch Festival",
      type: "festival",
      startMonth: 8,
      startDay: 14,
      endMonth: 8,
      endDay: 16,
      importance: 88,
      summary:
        "Malta's flagship electronic festival with curated underground house and techno lineups.",
      sourceUrl: "https://www.glitchfestival.com/"
    },
    {
      id: "malta-lost-found",
      title: "Annie Mac Lost & Found",
      type: "festival",
      startMonth: 5,
      startDay: 1,
      endMonth: 5,
      endDay: 4,
      importance: 85,
      summary:
        "Boutique festival anchored around boat parties and pool venues across Malta.",
      venueId: "lost-and-found",
      sourceUrl: "https://lostandfoundfestival.com/"
    },
    {
      id: "malta-bpm",
      title: "BPM Festival Malta",
      type: "festival",
      startMonth: 9,
      startDay: 14,
      endMonth: 9,
      endDay: 21,
      importance: 84,
      summary:
        "Eight-day electronic festival across boutique resorts and city venues.",
      sourceUrl: "https://thebpmfestival.com/"
    }
  ],
  toronto: [
    {
      id: "toronto-caribana",
      title: "Toronto Caribbean Carnival (Caribana)",
      type: "carnival",
      startMonth: 7,
      startDay: 30,
      endMonth: 8,
      endDay: 3,
      importance: 95,
      summary:
        "Two weeks of fetes, sound systems, mas band launches, and Caribbean culture climax with the Grand Parade on the Saturday before Simcoe Day — one of North America's biggest Caribbean carnivals.",
      venueId: "toronto-caribana",
      sourceUrl: "https://www.torontocarnival.ca/",
      genres: ["festival", "afro-house", "amapiano", "hip-hop"]
    },
    {
      id: "toronto-veld",
      title: "Veld Music Festival",
      type: "festival",
      startMonth: 7,
      startDay: 31,
      endMonth: 8,
      endDay: 2,
      importance: 88,
      summary:
        "Toronto's largest electronic festival at Downsview Park, programmed across the Caribana long weekend with global EDM and house headliners.",
      sourceUrl: "https://www.veldmusicfestival.com/",
      genres: ["electronic", "house", "festival"]
    },
    {
      id: "toronto-ovo-fest",
      title: "OVO Fest",
      type: "concert",
      startMonth: 8,
      startDay: 4,
      endMonth: 8,
      endDay: 6,
      importance: 90,
      summary:
        "Drake's annual hometown showcase pulls global hip-hop and R&B headliners around the Caribana weekend at Budweiser Stage and Scotiabank Arena.",
      venueId: "toronto-budweiser-stage",
      sourceUrl: "https://octobersveryown.com/pages/ovo-fest",
      genres: ["hip-hop", "r-and-b", "pop"]
    }
  ],
  montreal: [
    {
      id: "montreal-osheaga",
      title: "Osheaga",
      type: "festival",
      startMonth: 7,
      startDay: 31,
      endMonth: 8,
      endDay: 2,
      importance: 92,
      summary:
        "Parc Jean-Drapeau's flagship summer festival with stacked indie, pop, and electronic acts.",
      sourceUrl: "https://www.osheaga.com/"
    },
    {
      id: "montreal-piknic",
      title: "Piknic Electronik",
      type: "residency",
      startMonth: 5,
      startDay: 17,
      endMonth: 9,
      endDay: 27,
      importance: 88,
      summary:
        "Sunday outdoor electronic music programming at Parc Jean-Drapeau, running all summer.",
      venueId: "piknic",
      sourceUrl: "https://piknicelectronik.com/"
    },
    {
      id: "montreal-mutek",
      title: "MUTEK Montreal",
      type: "festival",
      startMonth: 8,
      startDay: 18,
      endMonth: 8,
      endDay: 23,
      importance: 90,
      summary:
        "Internationally renowned electronic and digital arts festival, focused on experimental forms.",
      sourceUrl: "https://www.mutek.org/"
    },
    {
      id: "montreal-jazz",
      title: "Festival International de Jazz de Montréal",
      type: "festival",
      startMonth: 6,
      startDay: 25,
      endMonth: 7,
      endDay: 5,
      importance: 85,
      summary:
        "Free outdoor jazz programming makes downtown Montreal feel like a continuous block party.",
      sourceUrl: "https://www.montrealjazzfest.com/"
    }
  ],
  "rio-de-janeiro": [
    {
      id: "rio-carnival",
      title: "Rio Carnival",
      type: "carnival",
      startMonth: 2,
      startDay: 13,
      endMonth: 2,
      endDay: 21,
      importance: 99,
      summary:
        "The world's largest carnival — sambadromes, blocos, and beach parties dominate the city.",
      venueId: "rio-carnival",
      sourceUrl: "https://riotur.rio/"
    },
    {
      id: "rio-blocos",
      title: "Carnaval Bloco Pre-Parties",
      type: "club-night",
      startMonth: 1,
      startDay: 31,
      endMonth: 2,
      endDay: 12,
      importance: 88,
      summary:
        "Pre-Carnival street parties (blocos) escalate through late January and early February.",
      sourceUrl: "https://riotur.rio/"
    },
    {
      id: "rio-reveillon",
      title: "Reveillon Copacabana",
      type: "concert",
      startMonth: 12,
      startDay: 31,
      endMonth: 12,
      endDay: 31,
      importance: 90,
      summary:
        "Copacabana's New Year's Eve fireworks and beach concerts pull millions to Rio.",
      sourceUrl: "https://riotur.rio/"
    }
  ],
  detroit: [
    {
      id: "detroit-movement",
      title: "Movement Detroit",
      type: "festival",
      startMonth: 5,
      startDay: 23,
      endMonth: 5,
      endDay: 25,
      importance: 96,
      summary:
        "Memorial Day weekend's flagship techno festival at Hart Plaza — the genre's homecoming.",
      venueId: "movement",
      sourceUrl: "https://movementfestival.com/"
    },
    {
      id: "detroit-movement-afterparties",
      title: "Movement Afterparties",
      type: "club-night",
      startMonth: 5,
      startDay: 22,
      endMonth: 5,
      endDay: 26,
      importance: 90,
      summary:
        "City-wide afterparties at warehouses and clubs run alongside the main festival.",
      sourceUrl: "https://movementfestival.com/"
    },
    {
      id: "detroit-jazz",
      title: "Detroit Jazz Festival",
      type: "festival",
      startMonth: 9,
      startDay: 4,
      endMonth: 9,
      endDay: 7,
      importance: 88,
      summary:
        "Free Labor Day weekend jazz festival with international and local lineups.",
      sourceUrl: "https://www.detroitjazzfest.org/"
    }
  ],
  "las-vegas": [
    {
      id: "vegas-edc",
      title: "EDC Las Vegas",
      type: "festival",
      startMonth: 5,
      startDay: 15,
      endMonth: 5,
      endDay: 17,
      importance: 96,
      summary:
        "The world's largest electronic festival at Las Vegas Motor Speedway — three nights, eight stages.",
      venueId: "edc-vegas",
      sourceUrl: "https://lasvegas.electricdaisycarnival.com/"
    },
    {
      id: "vegas-iheart",
      title: "iHeartRadio Music Festival",
      type: "festival",
      startMonth: 9,
      startDay: 19,
      endMonth: 9,
      endDay: 20,
      importance: 87,
      summary:
        "T-Mobile Arena's annual stadium-scale pop and hip-hop showcase across two nights.",
      sourceUrl: "https://www.iheartradio.com/festival/"
    },
    {
      id: "vegas-encore-residencies",
      title: "Encore Beach Club Residencies",
      type: "residency",
      startMonth: 4,
      startDay: 1,
      endMonth: 10,
      endDay: 31,
      importance: 85,
      summary:
        "Vegas's flagship dayclub runs all summer with rotating big-room headliners.",
      sourceUrl: "https://www.encorebeachclub.com/"
    },
    {
      id: "vegas-xs-residencies",
      title: "XS Nightclub Residencies",
      type: "residency",
      startMonth: 3,
      startDay: 1,
      endMonth: 10,
      endDay: 31,
      importance: 84,
      summary:
        "Encore's flagship nightclub holds the city's biggest residency lineup.",
      sourceUrl: "https://www.xslasvegas.com/"
    }
  ],
  marrakech: [
    {
      id: "marrakech-oasis",
      title: "Oasis Festival",
      type: "festival",
      startMonth: 9,
      startDay: 11,
      endMonth: 9,
      endDay: 13,
      importance: 95,
      summary:
        "The flagship Marrakech boutique festival — three days at Source Berbère with curated electronic lineups.",
      venueId: "oasis-into-the-wild",
      sourceUrl: "https://theoasisfest.com/"
    },
    {
      id: "marrakech-atlas",
      title: "Atlas Electronic",
      type: "festival",
      startMonth: 9,
      startDay: 25,
      endMonth: 9,
      endDay: 27,
      importance: 90,
      summary:
        "Boutique festival in the Marrakech Palmeraie blending Moroccan and international electronic music.",
      sourceUrl: "https://atlaselectronic.com/"
    },
    {
      id: "marrakech-moga",
      title: "MOGA Festival Essaouira",
      type: "festival",
      startMonth: 10,
      startDay: 9,
      endMonth: 10,
      endDay: 11,
      importance: 84,
      summary:
        "Coastal extension festival in Essaouira, commonly programmed alongside Marrakech offerings.",
      sourceUrl: "https://mogafestival.com/"
    },
    {
      id: "marrakech-riad-sessions",
      title: "Riad & Boutique Hotel Sessions",
      type: "residency",
      startMonth: 10,
      startDay: 1,
      endMonth: 10,
      endDay: 31,
      importance: 82,
      summary:
        "Riads and luxury hotels program small DJ sets and dinners through October's shoulder season.",
      sourceUrl: "https://www.visitmarrakech.com/"
    }
  ],
  courchevel: [
    {
      id: "courchevel-nye-week",
      title: "Courchevel Christmas / NYE Programming",
      type: "club-night",
      startMonth: 12,
      startDay: 26,
      endMonth: 1,
      endDay: 5,
      importance: 92,
      summary:
        "The 1850 plateau's holiday window concentrates private chalet sets, Les Caves takeovers, and surprise headliner appearances around New Year's Eve.",
      venueId: "les-caves-courchevel",
      sourceUrl: "https://www.instagram.com/lescaves_courchevel/",
      genres: ["house", "electronic", "pop"]
    },
    {
      id: "courchevel-folie-douce",
      title: "La Folie Douce Courchevel Season",
      type: "beach-club",
      startMonth: 12,
      startDay: 14,
      endMonth: 4,
      endDay: 14,
      importance: 86,
      summary:
        "On-piste daytime DJ programming, cabaret, and ski-in après-ski energy that runs across the full season.",
      venueId: "la-folie-douce-courchevel",
      sourceUrl: "https://www.lafoliedouce.com/",
      genres: ["house", "electronic", "pop"]
    },
    {
      id: "courchevel-french-half-term",
      title: "French Half-Term Peak Week",
      type: "club-night",
      startMonth: 2,
      startDay: 17,
      endMonth: 3,
      endDay: 3,
      importance: 84,
      summary:
        "French and Belgian school-holiday weeks repeat the season's peak demand — Les Caves and Le Tigre run nightly takeovers.",
      venueId: "le-tigre-courchevel",
      sourceUrl: "https://www.courchevel.com/en/",
      genres: ["house", "pop"]
    }
  ],
  verbier: [
    {
      id: "verbier-polaris",
      title: "Polaris Festival Verbier",
      type: "festival",
      startMonth: 12,
      startDay: 4,
      endMonth: 12,
      endDay: 8,
      importance: 90,
      summary:
        "Five-day mountain electronic festival with mainstage shows, club nights, and altitude stages around Verbier.",
      venueId: "polaris-verbier",
      sourceUrl: "https://polarisfestival.ch/",
      genres: ["electronic", "house", "techno", "festival"]
    },
    {
      id: "verbier-farinet-residency",
      title: "Farinet After Lounge Residency",
      type: "residency",
      startMonth: 12,
      startDay: 15,
      endMonth: 4,
      endDay: 20,
      importance: 84,
      summary:
        "Verbier's late-night anchor — Farinet After hosts touring DJ residencies that run through the full season.",
      venueId: "farinet-verbier",
      sourceUrl: "https://hotelfarinet.com/",
      genres: ["house", "electronic"]
    },
    {
      id: "verbier-pub-mont-fort",
      title: "Pub Mont Fort Après Sessions",
      type: "residency",
      startMonth: 12,
      startDay: 1,
      endMonth: 4,
      endDay: 25,
      importance: 80,
      summary:
        "Verbier's iconic ski-bum après-ski pub — afternoon crowd from 4pm with rolling DJ programming.",
      venueId: "pub-mont-fort-verbier",
      sourceUrl: "https://www.pubmontfort.com/",
      genres: ["pop", "electronic"]
    }
  ],
  ischgl: [
    {
      id: "ischgl-top-mountain-opening",
      title: "Top of the Mountain Opening Concert",
      type: "concert",
      startMonth: 11,
      startDay: 30,
      endMonth: 11,
      endDay: 30,
      importance: 92,
      summary:
        "Outdoor season-opening concert at 2,300m — Ischgl books a global pop, rock, or electronic headliner to launch the year.",
      venueId: "top-of-the-mountain-ischgl",
      sourceUrl: "https://www.ischgl.com/",
      genres: ["pop", "electronic", "festival"]
    },
    {
      id: "ischgl-top-mountain-closing",
      title: "Top of the Mountain Closing Concert",
      type: "concert",
      startMonth: 4,
      startDay: 30,
      endMonth: 5,
      endDay: 1,
      importance: 96,
      summary:
        "The season-bookending mountain-top headline show — historically Robbie Williams, Elton John, and other legacy global acts.",
      venueId: "top-of-the-mountain-ischgl",
      sourceUrl: "https://www.ischgl.com/",
      genres: ["pop", "festival"]
    },
    {
      id: "ischgl-pacha-residency",
      title: "Pacha Ischgl Winter Residency",
      type: "residency",
      startMonth: 12,
      startDay: 1,
      endMonth: 4,
      endDay: 25,
      importance: 82,
      summary:
        "Pacha's alpine outpost runs nightly programming through the full Ischgl winter season.",
      venueId: "pacha-ischgl",
      sourceUrl: "https://pachaischgl.com/",
      genres: ["house", "electronic"]
    }
  ],
  aspen: [
    {
      id: "aspen-nye-week",
      title: "Aspen Christmas / NYE Holiday Week",
      type: "club-night",
      startMonth: 12,
      startDay: 26,
      endMonth: 1,
      endDay: 5,
      importance: 92,
      summary:
        "Aspen's celebrity-stacked holiday window — Caribou Club takeovers, Belly Up shows, and private chalet DJ sets through New Year's.",
      venueId: "caribou-club-aspen",
      sourceUrl: "https://www.bellyupaspen.com/",
      genres: ["pop", "electronic", "house", "hip-hop"]
    },
    {
      id: "aspen-x-games",
      title: "X Games Aspen Snowmass",
      type: "festival",
      startMonth: 1,
      startDay: 22,
      endMonth: 1,
      endDay: 25,
      importance: 90,
      summary:
        "Four days of competition at Buttermilk Mountain paired with concerts headlined by major touring artists.",
      venueId: "x-games-aspen",
      sourceUrl: "https://www.xgames.com/events/aspen",
      genres: ["festival", "hip-hop", "pop", "electronic"]
    },
    {
      id: "aspen-belly-up-residency",
      title: "Belly Up Aspen Winter Programming",
      type: "residency",
      startMonth: 12,
      startDay: 1,
      endMonth: 4,
      endDay: 15,
      importance: 84,
      summary:
        "The 450-cap Belly Up Aspen books surprise pop, hip-hop, and indie touring artists across the ski season.",
      venueId: "belly-up-aspen",
      sourceUrl: "https://www.bellyupaspen.com/",
      genres: ["pop", "hip-hop", "electronic"]
    }
  ],
  tokyo: [
    {
      id: "tokyo-fuji-rock",
      title: "Fuji Rock Festival",
      type: "festival",
      startMonth: 7,
      startDay: 25,
      endMonth: 7,
      endDay: 27,
      importance: 95,
      summary:
        "Three-day mountain festival at Naeba Ski Resort, treated by most international travelers as a Tokyo trip — a global headliner-stacked, naturalist setting.",
      venueId: "fuji-rock-tokyo",
      sourceUrl: "https://www.fujirockfestival.com/",
      genres: ["festival", "electronic", "house", "hip-hop"]
    },
    {
      id: "tokyo-summer-sonic",
      title: "Summer Sonic Tokyo",
      type: "festival",
      startMonth: 8,
      startDay: 16,
      endMonth: 8,
      endDay: 17,
      importance: 92,
      summary:
        "Tokyo's flagship city festival at Zozomarine Stadium and Makuhari Messe with global pop, rock, and electronic headliners.",
      venueId: "summer-sonic-tokyo",
      sourceUrl: "https://www.summersonic.com/",
      genres: ["festival", "pop", "electronic", "hip-hop"]
    },
    {
      id: "tokyo-womb-residency",
      title: "WOMB Tokyo Programming",
      type: "residency",
      startMonth: 3,
      startDay: 1,
      endMonth: 11,
      endDay: 30,
      importance: 80,
      summary:
        "Shibuya's flagship electronic club books touring techno and house artists most weekends across the warm-weather season.",
      venueId: "womb-tokyo",
      sourceUrl: "https://www.womb.co.jp/",
      genres: ["techno", "house", "electronic"]
    }
  ],
  "mexico-city": [
    {
      id: "edc-mexico",
      title: "EDC México",
      type: "festival",
      startMonth: 2,
      startDay: 21,
      endMonth: 2,
      endDay: 23,
      importance: 92,
      summary:
        "Three-day Insomniac flagship at Autódromo Hermanos Rodríguez — Mexico City's biggest electronic moment.",
      venueId: "edc-mexico",
      sourceUrl: "https://mexico.electricdaisycarnival.com/",
      genres: ["electronic", "festival", "house", "techno"]
    },
    {
      id: "corona-capital",
      title: "Corona Capital",
      type: "festival",
      startMonth: 11,
      startDay: 14,
      endMonth: 11,
      endDay: 16,
      importance: 92,
      summary:
        "Three-day indie / pop / rock flagship at Autódromo Hermanos Rodríguez with stacked global lineups.",
      venueId: "corona-capital-cdmx",
      sourceUrl: "https://www.coronacapital.com.mx/",
      genres: ["festival", "pop", "electronic", "hip-hop"]
    },
    {
      id: "cdmx-bahia-residency",
      title: "Bahía & Roma Norte Club Programming",
      type: "residency",
      startMonth: 9,
      startDay: 1,
      endMonth: 11,
      endDay: 30,
      importance: 80,
      summary:
        "Bahía and the Roma Norte / Juárez club circuit run their strongest touring DJ programming through the autumn festival season.",
      venueId: "bahia-cdmx",
      sourceUrl: "https://www.instagram.com/bahia.mx/",
      genres: ["techno", "house", "electronic"]
    }
  ],
  "buenos-aires": [
    {
      id: "lolla-argentina",
      title: "Lollapalooza Argentina",
      type: "festival",
      startMonth: 3,
      startDay: 14,
      endMonth: 3,
      endDay: 16,
      importance: 95,
      summary:
        "Three-day flagship festival at Hipódromo de San Isidro with stacked global lineups, drawing travelers across South America.",
      venueId: "lolla-argentina",
      sourceUrl: "https://www.lollapaloozaar.com/",
      genres: ["festival", "pop", "electronic", "hip-hop"]
    },
    {
      id: "ba-creamfields",
      title: "Creamfields Buenos Aires",
      type: "festival",
      startMonth: 11,
      startDay: 15,
      endMonth: 11,
      endDay: 16,
      importance: 86,
      summary:
        "Argentina's flagship electronic festival, returning annually with strong global techno and house lineups.",
      sourceUrl: "https://creamfieldsba.com/",
      genres: ["electronic", "house", "techno", "festival"]
    },
    {
      id: "ba-club-circuit",
      title: "Crobar & Niceto Late-Night Circuit",
      type: "residency",
      startMonth: 11,
      startDay: 1,
      endMonth: 4,
      endDay: 30,
      importance: 80,
      summary:
        "Buenos Aires' Southern-summer late-night circuit — Crobar, Niceto, and Palermo warehouses host the strongest weekly programming.",
      venueId: "crobar-ba",
      sourceUrl: "https://www.crobar.com.ar/",
      genres: ["house", "techno", "electronic"]
    }
  ],
  "sao-paulo": [
    {
      id: "lolla-brasil",
      title: "Lollapalooza Brasil",
      type: "festival",
      startMonth: 3,
      startDay: 28,
      endMonth: 3,
      endDay: 30,
      importance: 96,
      summary:
        "Three-day flagship at Autódromo de Interlagos — Latin America's biggest annual mainstage festival.",
      venueId: "lolla-brasil",
      sourceUrl: "https://www.lollapaloozabr.com/",
      genres: ["festival", "pop", "electronic", "hip-hop"]
    },
    {
      id: "time-warp-brasil",
      title: "Time Warp Brasil",
      type: "festival",
      startMonth: 4,
      startDay: 25,
      endMonth: 4,
      endDay: 26,
      importance: 88,
      summary:
        "The Mannheim techno institution's São Paulo edition — heavy 2-room programming with global underground headliners.",
      venueId: "time-warp-brasil",
      sourceUrl: "https://www.time-warp.de/",
      genres: ["techno", "electronic", "festival"]
    },
    {
      id: "sp-audio-residency",
      title: "Audio Club São Paulo Programming",
      type: "residency",
      startMonth: 9,
      startDay: 1,
      endMonth: 11,
      endDay: 30,
      importance: 80,
      summary:
        "Audio Club's heavy autumn touring schedule — São Paulo's most consistent international electronic and pop bookings.",
      venueId: "audio-club-sp",
      sourceUrl: "https://www.audiosp.com.br/",
      genres: ["techno", "house", "festival"]
    }
  ],
  "port-of-spain": [
    {
      id: "trinidad-carnival",
      title: "Trinidad Carnival (Monday & Tuesday Mas)",
      type: "carnival",
      startMonth: 2,
      startDay: 16,
      endMonth: 2,
      endDay: 17,
      importance: 98,
      summary:
        "The world's source carnival for soca music — two days of Mas band parades through Port of Spain ending at the Queen's Park Savannah.",
      venueId: "trinidad-carnival",
      sourceUrl: "https://www.ncctt.org/",
      genres: ["festival", "afro-house", "latin"]
    },
    {
      id: "trinidad-jouvert",
      title: "J'Ouvert Monday",
      type: "carnival",
      startMonth: 2,
      startDay: 16,
      endMonth: 2,
      endDay: 16,
      importance: 92,
      summary:
        "The pre-dawn Carnival Monday opening — mud, paint, oil, and steel pan / soca trucks through the streets of Port of Spain.",
      venueId: "jouvert-port-of-spain",
      sourceUrl: "https://www.gotrinidadandtobago.com/trinidad/things-to-do/carnival/",
      genres: ["festival", "afro-house"]
    },
    {
      id: "trinidad-soca-monarch",
      title: "International Soca Monarch",
      type: "festival",
      startMonth: 2,
      startDay: 13,
      endMonth: 2,
      endDay: 13,
      importance: 90,
      summary:
        "Carnival Friday's soca championship at Queen's Park Savannah — the season's biggest soca live competition.",
      venueId: "soca-monarch-trinidad",
      sourceUrl: "https://socamonarch.com/",
      genres: ["festival", "afro-house", "latin"]
    }
  ],
  sydney: [
    {
      id: "sydney-nye",
      title: "Sydney New Year's Eve",
      type: "festival",
      startMonth: 12,
      startDay: 31,
      endMonth: 1,
      endDay: 1,
      importance: 92,
      summary:
        "The world's flagship NYE — fireworks over Sydney Harbour, club afterparties, and a citywide programming week.",
      sourceUrl: "https://www.sydneynewyearseve.com/",
      genres: ["festival", "pop", "electronic"]
    },
    {
      id: "field-day-sydney",
      title: "Field Day Sydney",
      type: "festival",
      startMonth: 1,
      startDay: 1,
      endMonth: 1,
      endDay: 1,
      importance: 90,
      summary:
        "New Year's Day mainstage at The Domain — Sydney's defining hangover festival with major global headliners.",
      venueId: "field-day-sydney",
      sourceUrl: "https://www.fuzzy.com.au/",
      genres: ["festival", "house", "electronic", "hip-hop"]
    },
    {
      id: "laneway-sydney",
      title: "Laneway Festival Sydney",
      type: "festival",
      startMonth: 2,
      startDay: 7,
      endMonth: 2,
      endDay: 7,
      importance: 88,
      summary:
        "The Australian indie / electronic touring festival's Sydney date at the Sydney Showground.",
      venueId: "laneway-sydney",
      sourceUrl: "https://lanewayfestival.com/",
      genres: ["festival", "pop", "electronic"]
    }
  ],
  tbilisi: [
    {
      id: "tbilisi-bassiani-residency",
      title: "Bassiani Resident Programming",
      type: "residency",
      startMonth: 4,
      startDay: 1,
      endMonth: 10,
      endDay: 31,
      importance: 92,
      summary:
        "Bassiani's basement under Dinamo Stadium runs its most consistent global techno bookings through the warm-weather season.",
      venueId: "bassiani-tbilisi",
      sourceUrl: "https://bassiani.com/",
      genres: ["techno", "electronic"]
    },
    {
      id: "tbilisi-khidi-residency",
      title: "KHIDI Programming",
      type: "residency",
      startMonth: 4,
      startDay: 1,
      endMonth: 10,
      endDay: 31,
      importance: 88,
      summary:
        "KHIDI runs the heaviest underground bookings in Tbilisi from its venue under Vakhushti Bridge.",
      venueId: "khidi-tbilisi",
      sourceUrl: "https://www.instagram.com/khidi.tbilisi/",
      genres: ["techno", "electronic"]
    },
    {
      id: "tbilisi-horoom-nights",
      title: "Horoom Nights at Bassiani",
      type: "club-night",
      startMonth: 5,
      startDay: 1,
      endMonth: 10,
      endDay: 31,
      importance: 84,
      summary:
        "Bassiani's queer-led Horoom Nights — one of the most respected queer techno residencies in Eastern Europe.",
      venueId: "bassiani-tbilisi",
      sourceUrl: "https://bassiani.com/",
      genres: ["techno", "electronic", "house"]
    }
  ],
  "tel-aviv": [
    {
      id: "tlv-pride-week",
      title: "Tel Aviv Pride Week",
      type: "festival",
      startMonth: 6,
      startDay: 8,
      endMonth: 6,
      endDay: 14,
      importance: 92,
      summary:
        "A week of citywide club takeovers, beach programming, and the headline parade — the largest LGBTQ+ pride moment in the Middle East.",
      venueId: "tel-aviv-pride",
      sourceUrl: "https://www.gaytelavivguide.com/pride/",
      genres: ["festival", "house", "electronic"]
    },
    {
      id: "tlv-the-block-residency",
      title: "The Block Tel Aviv Resident Programming",
      type: "residency",
      startMonth: 4,
      startDay: 1,
      endMonth: 9,
      endDay: 30,
      importance: 88,
      summary:
        "The Block on Salame Street — among the world's most respected techno rooms — runs its heaviest international bookings through the warm-weather season.",
      venueId: "the-block-tlv",
      sourceUrl: "https://block-club.com/",
      genres: ["techno", "electronic", "house"]
    },
    {
      id: "tlv-summer-club-circuit",
      title: "Florentin Summer Club Circuit",
      type: "residency",
      startMonth: 5,
      startDay: 1,
      endMonth: 9,
      endDay: 15,
      importance: 80,
      summary:
        "Kuli Alma, Breakfast Club, and the Florentin / Salame neighborhood late-night clubs run their core warm-season programming.",
      venueId: "kuli-alma-tlv",
      sourceUrl: "https://kulialma.com/",
      genres: ["house", "electronic"]
    }
  ],
  hvar: [
    {
      id: "hvar-carpe-diem-summer",
      title: "Carpe Diem Beach Summer Sessions",
      type: "residency",
      startMonth: 6,
      startDay: 1,
      endMonth: 9,
      endDay: 15,
      importance: 88,
      summary:
        "Carpe Diem's beach club on the islet of Marinkovac runs day-into-night programming with global DJs through the Adriatic season; boats shuttle from Hvar Town past sunset.",
      venueId: "carpe-diem-beach-hvar",
      sourceUrl: "https://www.carpe-diem-beach.com/",
      genres: ["house", "electronic"]
    },
    {
      id: "hvar-hula-hula-sunset",
      title: "Hula Hula Hvar Sunset Sessions",
      type: "residency",
      startMonth: 5,
      startDay: 25,
      endMonth: 9,
      endDay: 15,
      importance: 84,
      summary:
        "Hula Hula's seafront sunset bar anchors Hvar's pre-dinner ritual — beach drinks, DJs at golden hour, and the transition into the town's late nights.",
      sourceUrl: "https://www.hulahulahvar.com/",
      genres: ["house", "electronic"]
    },
    {
      id: "hvar-yacht-week-circuit",
      title: "Yacht Week Croatia (Hvar leg)",
      type: "festival",
      startMonth: 6,
      startDay: 1,
      endMonth: 9,
      endDay: 15,
      importance: 82,
      summary:
        "Yacht Week's Croatia route brings flotillas through Hvar each week, anchoring at Carpe Diem Beach and turning the harbor into a floating party.",
      sourceUrl: "https://www.theyachtweek.com/croatia/",
      genres: ["house", "electronic"]
    }
  ],
  reykjavik: [
    {
      id: "reykjavik-iceland-airwaves",
      title: "Iceland Airwaves",
      type: "festival",
      startMonth: 11,
      startDay: 5,
      endMonth: 11,
      endDay: 8,
      importance: 90,
      summary:
        "Iceland Airwaves runs a multi-venue program across Reykjavik's downtown clubs, churches, and concert hall; one of Europe's most respected festivals for new-music discovery.",
      venueId: "iceland-airwaves",
      sourceUrl: "https://icelandairwaves.is/",
      genres: ["festival", "electronic", "pop"]
    },
    {
      id: "reykjavik-midnight-sun",
      title: "Midnight Sun Warehouse Parties",
      type: "club-night",
      startMonth: 6,
      startDay: 15,
      endMonth: 7,
      endDay: 20,
      importance: 78,
      summary:
        "Around the summer solstice, Reykjavik's harbor warehouses run sunrise-to-sunrise sets leveraging 24-hour daylight; rooftop sessions at Harpa join the rotation.",
      sourceUrl: "https://www.visitreykjavik.is/",
      genres: ["electronic", "house"]
    },
    {
      id: "reykjavik-harpa-summer",
      title: "Harpa Summer Series",
      type: "residency",
      startMonth: 6,
      startDay: 1,
      endMonth: 8,
      endDay: 31,
      importance: 75,
      summary:
        "Harpa's summer program runs nightly classical, jazz, and Icelandic-music shows in its glass-paneled hall on the harbor.",
      venueId: "harpa-reykjavik",
      sourceUrl: "https://www.harpa.is/",
      genres: ["jazz", "pop", "electronic"]
    }
  ],
  antwerp: [
    {
      id: "antwerp-tomorrowland-w1",
      title: "Tomorrowland Weekend 1",
      type: "festival",
      startMonth: 7,
      startDay: 17,
      endMonth: 7,
      endDay: 19,
      importance: 98,
      summary:
        "Tomorrowland's first weekend in Boom, just south of Antwerp — the world's largest electronic festival across multiple stages and the iconic Mainstage build.",
      venueId: "tomorrowland-festival",
      sourceUrl: "https://www.tomorrowland.com/",
      genres: ["festival", "electronic", "house"]
    },
    {
      id: "antwerp-tomorrowland-w2",
      title: "Tomorrowland Weekend 2",
      type: "festival",
      startMonth: 7,
      startDay: 24,
      endMonth: 7,
      endDay: 26,
      importance: 96,
      summary:
        "Tomorrowland's second weekend repeats the lineup with a new audience; many travelers book the Friday-Monday cycle for slightly cheaper passes than Weekend 1.",
      venueId: "tomorrowland-festival",
      sourceUrl: "https://www.tomorrowland.com/",
      genres: ["festival", "electronic", "house"]
    },
    {
      id: "antwerp-trix-summer",
      title: "Trix Antwerp Summer Program",
      type: "residency",
      startMonth: 5,
      startDay: 1,
      endMonth: 9,
      endDay: 30,
      importance: 70,
      summary:
        "Trix's mid-cap room and outdoor terrace run a steady indie, electronic, and touring-act program through summer.",
      venueId: "trix-antwerp",
      sourceUrl: "https://www.trixonline.be/",
      genres: ["electronic", "pop"]
    }
  ],
  "st-barths": [
    {
      id: "st-barths-nye",
      title: "St. Barth New Year's Eve Circuit",
      type: "club-night",
      startMonth: 12,
      startDay: 28,
      endMonth: 1,
      endDay: 3,
      importance: 92,
      summary:
        "Nikki Beach, Le Ti, Bagatelle, and the harbor-side yachts host overlapping NYE parties through the December 28 - January 3 window with rotating celebrity DJ guests.",
      venueId: "nikki-beach-st-barths",
      sourceUrl: "https://stbarth.nikkibeach.com/",
      genres: ["house", "pop", "electronic"]
    },
    {
      id: "st-barths-eden-rock-residency",
      title: "Eden Rock Holiday Residency",
      type: "residency",
      startMonth: 12,
      startDay: 22,
      endMonth: 1,
      endDay: 5,
      importance: 88,
      summary:
        "Eden Rock's Sand Bar and Rémy lounge host nightly DJ residencies through the Christmas-NYE window with international guests booked into the resort by promoters.",
      sourceUrl: "https://www.oetkercollection.com/hotels/eden-rock-st-barths/",
      genres: ["house", "pop", "electronic"]
    },
    {
      id: "st-barths-bagatelle-residency",
      title: "Bagatelle St Barth Lunch & Late",
      type: "residency",
      startMonth: 12,
      startDay: 22,
      endMonth: 1,
      endDay: 5,
      importance: 84,
      summary:
        "Bagatelle's signature day-into-night format — long champagne lunches that segue into DJ-led late nights — runs daily through the holiday window.",
      venueId: "bagatelle-st-barths",
      sourceUrl: "https://bistrotbagatelle.com/saint-barth/",
      genres: ["house", "pop"]
    }
  ],
  "new-orleans": [
    {
      id: "nola-mardi-gras",
      title: "Mardi Gras",
      type: "carnival",
      startMonth: 2,
      startDay: 14,
      endMonth: 2,
      endDay: 17,
      importance: 95,
      summary:
        "Mardi Gras stretches from Twelfth Night through Fat Tuesday, with parades by the Krewe of Endymion, Bacchus, and Zulu drawing global crowds; brass-band programming spills into bars across the French Quarter and Marigny.",
      sourceUrl: "https://www.mardigrasneworleans.com/",
      genres: ["festival", "jazz", "r-and-b"]
    },
    {
      id: "nola-jazz-fest",
      title: "New Orleans Jazz & Heritage Festival",
      type: "festival",
      startMonth: 4,
      startDay: 23,
      endMonth: 5,
      endDay: 3,
      importance: 96,
      summary:
        "Jazz Fest spans two weekends across the Fair Grounds Race Course with twelve stages of jazz, blues, R&B, gospel, and global-touring headliners.",
      venueId: "jazz-fest-nola",
      sourceUrl: "https://www.nojazzfest.com/",
      genres: ["jazz", "festival", "r-and-b"]
    },
    {
      id: "nola-tipitinas-residency",
      title: "Tipitina's Year-Round Programming",
      type: "residency",
      startMonth: 1,
      startDay: 1,
      endMonth: 12,
      endDay: 31,
      importance: 78,
      summary:
        "Tipitina's Uptown stage hosts brass-band, funk, jazz, and touring-rock programming through the year; its Sunday Night Funk dances are a New Orleans institution.",
      venueId: "tipitinas-nola",
      sourceUrl: "https://www.tipitinas.com/",
      genres: ["jazz", "r-and-b", "hip-hop"]
    }
  ],
  seoul: [
    {
      id: "seoul-world-dj-festival",
      title: "World DJ Festival",
      type: "festival",
      startMonth: 5,
      startDay: 25,
      endMonth: 5,
      endDay: 26,
      importance: 86,
      summary:
        "Korea's longest-running EDM festival weekend, alternating Seoul and Yangpyeong with global headline house and techno sets across multiple stages.",
      venueId: "world-dj-festival-seoul",
      sourceUrl: "https://www.worlddjfestival.com/",
      genres: ["house", "electronic", "techno"]
    },
    {
      id: "seoul-ultra-korea",
      title: "Ultra Korea",
      type: "festival",
      startMonth: 6,
      startDay: 6,
      endMonth: 6,
      endDay: 8,
      importance: 88,
      summary:
        "Ultra's Asia stop at the Seoul Olympic Stadium — three days of mainstage EDM plus the Resistance techno tent that anchors Korea's June dance circuit.",
      sourceUrl: "https://umfkorea.com/",
      genres: ["electronic", "festival", "techno"]
    },
    {
      id: "seoul-faust-residency",
      title: "Faust Saturday residencies",
      type: "residency",
      startMonth: 1,
      startDay: 1,
      endMonth: 12,
      endDay: 31,
      importance: 80,
      summary:
        "Faust's weekly Saturday programming is Seoul's reference room for Berlin-style techno, with frequent international guests rotating through Itaewon's hill of clubs.",
      venueId: "faust-seoul",
      sourceUrl: "https://www.instagram.com/faust_seoul/",
      genres: ["techno", "electronic"]
    }
  ],
  bangkok: [
    {
      id: "bangkok-wonderfruit",
      title: "Wonderfruit",
      type: "festival",
      startMonth: 12,
      startDay: 11,
      endMonth: 12,
      endDay: 14,
      importance: 92,
      summary:
        "Asia's most reference-grade boutique festival — four days of architecture-led stages, organic food villages, and an electronic lineup that pulls from Berlin, Tokyo, and London. Held at The Fields, Pattaya.",
      venueId: "wonderfruit-pattaya",
      sourceUrl: "https://www.wonderfruit.co/",
      genres: ["electronic", "house", "techno", "festival"]
    },
    {
      id: "bangkok-songkran",
      title: "Songkran Bangkok",
      type: "festival",
      startMonth: 4,
      startDay: 13,
      endMonth: 4,
      endDay: 15,
      importance: 88,
      summary:
        "Thailand's water-festival new year takes over Khao San Road, RCA, and Silom with three days of citywide street parties, club rave-ups, and headline DJ sets at Route 66 and S2O.",
      sourceUrl: "https://www.tatnews.org/",
      genres: ["electronic", "festival", "house"]
    },
    {
      id: "bangkok-beam-residency",
      title: "Beam Saturday residencies",
      type: "residency",
      startMonth: 11,
      startDay: 1,
      endMonth: 4,
      endDay: 30,
      importance: 78,
      summary:
        "Beam's Sukhumvit basement runs a weekly Saturday techno program with regular international guests through Bangkok's cool-season clubbing window.",
      venueId: "beam-bangkok",
      sourceUrl: "https://www.beamclub.com/",
      genres: ["techno", "house", "electronic"]
    }
  ],
  goa: [
    {
      id: "goa-sunburn",
      title: "Sunburn Festival",
      type: "festival",
      startMonth: 12,
      startDay: 28,
      endMonth: 12,
      endDay: 30,
      importance: 90,
      summary:
        "Asia's largest dance music festival, held annually at Vagator with mainstage EDM and Resistance-style techno arenas across three end-of-year days. The booking window for Goa NYE.",
      venueId: "sunburn-festival-goa",
      sourceUrl: "https://www.sunburn.in/",
      genres: ["electronic", "festival", "techno"]
    },
    {
      id: "goa-hilltop-saturdays",
      title: "Hilltop Vagator full-moon Saturdays",
      type: "residency",
      startMonth: 11,
      startDay: 1,
      endMonth: 3,
      endDay: 31,
      importance: 85,
      summary:
        "Hilltop's open-air venue runs Saturday programming through Goa's cool season, anchoring the state's psy-trance and progressive scene with full-moon weekends drawing international heads.",
      venueId: "hilltop-goa",
      sourceUrl: "https://www.facebook.com/HilltopVagator/",
      genres: ["electronic", "techno"]
    },
    {
      id: "goa-shiva-valley-mondays",
      title: "Shiva Valley Monday sessions",
      type: "residency",
      startMonth: 11,
      startDay: 1,
      endMonth: 3,
      endDay: 31,
      importance: 78,
      summary:
        "The original Anjuna beach venue's Monday sessions run sunset into late night with a steady rotation of psytrance and progressive DJs through the cool season.",
      venueId: "shiva-valley-goa",
      sourceUrl: "https://www.facebook.com/shivavalleygoa/",
      genres: ["electronic"]
    }
  ],
  melbourne: [
    {
      id: "melbourne-beyond-the-valley",
      title: "Beyond the Valley",
      type: "festival",
      startMonth: 12,
      startDay: 28,
      endMonth: 1,
      endDay: 1,
      importance: 90,
      summary:
        "Australia's flagship NYE camping festival in Lardner Park (90 minutes east of Melbourne), pulling international headliners across electronic, techno, and hip-hop stages over five days.",
      venueId: "beyond-the-valley",
      sourceUrl: "https://www.beyondthevalley.com.au/",
      genres: ["electronic", "techno", "festival"]
    },
    {
      id: "melbourne-sugar-mountain",
      title: "Sugar Mountain Festival",
      type: "festival",
      startMonth: 1,
      startDay: 18,
      endMonth: 1,
      endDay: 18,
      importance: 85,
      summary:
        "A single-day art-and-music festival inside the Victorian College of the Arts campus — Melbourne's reference summer day-festival with a tight curated electronic and hip-hop bill.",
      venueId: "sugar-mountain-melbourne",
      sourceUrl: "https://www.sugarmountainfestival.com/",
      genres: ["electronic", "hip-hop", "festival"]
    },
    {
      id: "melbourne-revolver-residency",
      title: "Revolver Saturday → Monday afters",
      type: "residency",
      startMonth: 11,
      startDay: 1,
      endMonth: 3,
      endDay: 31,
      importance: 82,
      summary:
        "Revolver Upstairs runs from Saturday 9pm through Monday afternoon — Melbourne's defining 36+ hour weekend club institution and one of the world's longest continuous club programs.",
      venueId: "revolver-upstairs",
      sourceUrl: "https://www.revolverupstairs.com.au/",
      genres: ["techno", "house", "electronic"]
    }
  ],
  cartagena: [
    {
      id: "cartagena-hay-festival",
      title: "Hay Festival Cartagena",
      type: "festival",
      startMonth: 1,
      startDay: 25,
      endMonth: 1,
      endDay: 28,
      importance: 85,
      summary:
        "Latin America's flagship literature festival pairs four days of talks with concert programming across the walled city, drawing international Latin and afro-Caribbean acts to plaza stages.",
      venueId: "hay-festival-cartagena",
      sourceUrl: "https://www.hayfestival.com/cartagena/",
      genres: ["latin", "festival", "jazz"]
    },
    {
      id: "cartagena-cafe-havana-residency",
      title: "Café Havana live salsa nights",
      type: "residency",
      startMonth: 12,
      startDay: 1,
      endMonth: 4,
      endDay: 30,
      importance: 82,
      summary:
        "Café Havana's nightly Cuban salsa orchestra is Cartagena's defining live-music ritual — a packed dance floor in Getsemaní that runs Tuesday through Sunday across the dry season.",
      venueId: "cafe-havana-cartagena",
      sourceUrl: "https://www.cafehavanacartagena.com/",
      genres: ["latin", "jazz"]
    },
    {
      id: "cartagena-bazurto-residency",
      title: "Bazurto Social Club Friday programming",
      type: "residency",
      startMonth: 12,
      startDay: 1,
      endMonth: 4,
      endDay: 30,
      importance: 78,
      summary:
        "Bazurto Social Club's Friday nights blend afro-Colombian champeta and electronic crossover with live percussion — the city's reference room for Caribbean dance music.",
      venueId: "bazurto-social-club",
      sourceUrl: "https://www.bazurtosocialclub.com/",
      genres: ["latin", "electronic", "house"]
    }
  ]
  // @scaffold:blueprints — new EventBlueprint arrays keyed by slug go here (see docs/ADD_CITY.md)
};
