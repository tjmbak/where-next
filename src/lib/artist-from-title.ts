// Conservative artist-name extraction from event titles, used to offer
// audio previews ("hear what Saturday sounds like"). Precision over recall:
// returning null just means no preview button — returning a wrong artist
// plays the wrong music, which is worse.

const NOT_AN_ARTIST =
  /\b(festival|fest|week|weekend|weekender|carnival|nye|new year|opening|closing|party|parties|programming|sessions?|takeover|boat|cruise|market|expo|conference|awards?|edition|halloween|rave|klubnacht|nights?|anniversary|years|showcase|residency|label|pres)\b/i;

/** Club brands and residencies are usually named after the party, not a DJ. */
const BRANDED_TYPES = new Set(["club-night", "residency", "beach-club", "carnival", "festival", "conference"]);

function clean(raw: string): string | null {
  let candidate = raw.trim();
  // "Solomun+1" → "Solomun"
  candidate = candidate.replace(/\+\d+$/, "").trim();
  // Trailing punctuation/quotes
  candidate = candidate.replace(/^["'“”‘’]+|["'“”‘’.!,]+$/g, "").trim();
  // b2b / vs — take the first artist
  candidate = candidate.split(/\s+(?:b2b|vs\.?|x)\s+/i)[0].trim();
  // "MEDUZA & James Hype" → keep the first name for a clean preview
  candidate = candidate.split(/\s*[&,]\s*/)[0].trim();

  if (candidate.length < 2 || candidate.length > 40) return null;
  if (!/[a-z]/i.test(candidate)) return null;
  if (/^\d/.test(candidate)) return null;
  // Years mark event editions ("Afro Nation Portugal 2026"), not artists.
  if (/\b(19|20)\d{2}\b/.test(candidate)) return null;
  if (NOT_AN_ARTIST.test(candidate)) return null;
  return candidate;
}

/**
 * Extract a probable headline artist from an event title, or null when the
 * title doesn't confidently name one.
 */
export function artistFromTitle(title: string, eventType?: string): string | null {
  let working = title.trim();

  // "Open2Close: Juliana Huxtable all night long" → the DJ playing all night
  const allNight = /(?:^|:\s*)([^:]+?)\s+all[\s-]night[\s-]long\b/i.exec(working);
  if (allNight) return clean(allNight[1]);

  // "F*** Me I'm Famous! by David Guetta" → right side of "by"
  const byMatch = /\bby\s+(.+)$/i.exec(working);
  if (byMatch) {
    const fromBy = clean(byMatch[1].split(/\s+at\s+/i)[0]);
    if (fromBy) return fromBy;
  }

  // "X at Venue" → left side
  if (/\s+at\s+/i.test(working)) {
    working = working.split(/\s+at\s+/i)[0].trim();
  }

  // "X presents Y" / "X present Y" → left side
  if (/\s+presents?\s+/i.test(working)) {
    working = working.split(/\s+presents?\s+/i)[0].trim();
  }

  // "Artist — Tour Name" / "Artist: Tour Name" → left side
  working = working.split(/\s+[—–-]\s+/)[0].trim();
  working = working.split(/:\s+/)[0].trim();

  // If nothing was split off the original title, only accept short,
  // name-like strings (e.g. "Black Coffee") — long unsplit titles are
  // usually event names, not artists.
  const unchanged = working === title.trim();
  if (unchanged && working.length > 26) return null;
  if (unchanged && eventType && BRANDED_TYPES.has(eventType)) return null;

  return clean(working);
}
